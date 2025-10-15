import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, addDays, parseISO } from 'date-fns';

export interface TimesheetEntry {
  id?: string;
  date: string;
  hours: number;
  project_name?: string;
  task_description?: string;
  is_billable: boolean;
  timesheet_id?: string;
}

export interface Timesheet {
  id: string;
  profile_id: string;
  week_start_date: string;
  week_end_date: string;
  total_hours: number;
  status: string;
  submitted_at?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  entries?: TimesheetEntry[];
}

export const useTimesheets = () => {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [currentTimesheet, setCurrentTimesheet] = useState<Timesheet | null>(null);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchTimesheets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('timesheets')
        .select(`
          *,
          entries:timesheet_entries(*),
          approved_by_profile:profiles!timesheets_approved_by_fkey(first_name, last_name)
        `)
        .order('week_start_date', { ascending: false });

      if (error) throw error;
      setTimesheets(data || []);
    } catch (error) {
      console.error('Error fetching timesheets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch timesheets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOrGetTimesheet = async (weekStartDate: Date) => {
    const startDate = format(weekStartDate, 'yyyy-MM-dd');
    const endDate = format(endOfWeek(weekStartDate), 'yyyy-MM-dd');

    try {
      // Get current user's profile_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Check if timesheet already exists
      const { data: existing, error: fetchError } = await supabase
        .from('timesheets')
        .select('*, entries:timesheet_entries(*)')
        .eq('week_start_date', startDate)
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (existing && !fetchError) {
        setCurrentTimesheet(existing);
        setEntries(existing.entries || []);
        
        // Auto-generate entries from attendance if no entries exist
        if (!existing.entries || existing.entries.length === 0) {
          await autoGenerateEntriesFromAttendance(existing.id, profile.id, startDate, endDate);
        }
        
        return existing;
      }

      // Create new timesheet
      const { data, error } = await supabase
        .from('timesheets')
        .insert({
          week_start_date: startDate,
          week_end_date: endDate,
          total_hours: 0,
          status: 'draft',
          profile_id: profile.id,
        })
        .select()
        .single();

      if (error) throw error;
      
      const newTimesheet = { ...data, entries: [] };
      setCurrentTimesheet(newTimesheet);
      setEntries([]);
      
      // Auto-generate entries from attendance
      await autoGenerateEntriesFromAttendance(data.id, profile.id, startDate, endDate);
      
      return newTimesheet;
    } catch (error) {
      console.error('Error creating/fetching timesheet:', error);
      toast({
        title: "Error",
        description: "Failed to create/fetch timesheet",
        variant: "destructive",
      });
      return null;
    }
  };

  const autoGenerateEntriesFromAttendance = async (
    timesheetId: string, 
    profileId: string, 
    startDate: string, 
    endDate: string
  ) => {
    try {
      // Fetch attendance records for the week
      const { data: attendanceRecords } = await supabase
        .from('attendance')
        .select('*')
        .eq('profile_id', profileId)
        .gte('date', startDate)
        .lte('date', endDate);

      // Fetch approved leave requests for the week
      const { data: leaveRecords } = await supabase
        .from('leave_requests')
        .select('*, leave_type:leave_types(name)')
        .eq('profile_id', profileId)
        .eq('status', 'approved')
        .lte('start_date', endDate)
        .gte('end_date', startDate);

      // Fetch attendance policy for working hours
      const { data: policy } = await supabase
        .from('attendance_policies')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      const workingHoursStart = policy?.working_hours_start || '09:00:00';
      const workingHoursEnd = policy?.working_hours_end || '17:00:00';

      // Generate entries for each day of the week
      const entriesToInsert = [];
      const currentDate = parseISO(startDate);
      const lastDate = parseISO(endDate);

      while (currentDate <= lastDate) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        
        // Check if there's a leave for this date
        const onLeave = leaveRecords?.some(leave => {
          const leaveStart = parseISO(leave.start_date);
          const leaveEnd = parseISO(leave.end_date);
          return currentDate >= leaveStart && currentDate <= leaveEnd;
        });

        if (onLeave) {
          // On approved leave
          const leaveType = leaveRecords?.find(leave => {
            const leaveStart = parseISO(leave.start_date);
            const leaveEnd = parseISO(leave.end_date);
            return currentDate >= leaveStart && currentDate <= leaveEnd;
          });
          
          entriesToInsert.push({
            timesheet_id: timesheetId,
            date: dateStr,
            hours: 0,
            project_name: 'Leave',
            task_description: `On ${leaveType?.leave_type?.name || 'Leave'}`,
            is_billable: false,
          });
        } else {
          // Check attendance
          const attendance = attendanceRecords?.find(a => a.date === dateStr);
          
          if (attendance && attendance.check_in_time) {
            // Calculate hours from attendance
            let hours = 0;
            const checkIn = new Date(attendance.check_in_time);
            
            if (attendance.check_out_time) {
              // Has both check-in and check-out
              const checkOut = new Date(attendance.check_out_time);
              hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
              
              // Subtract break duration if applicable
              if (attendance.break_start_time && attendance.break_end_time) {
                const breakStart = new Date(attendance.break_start_time);
                const breakEnd = new Date(attendance.break_end_time);
                const breakHours = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60 * 60);
                hours -= breakHours;
              }
            } else {
              // No check-out - auto-calculate based on policy end time
              const endTime = new Date(attendance.check_in_time);
              const [endHour, endMinute] = workingHoursEnd.split(':');
              endTime.setHours(parseInt(endHour), parseInt(endMinute), 0);
              
              hours = (endTime.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
              
              // Subtract break duration from policy
              if (policy?.break_duration_minutes) {
                hours -= policy.break_duration_minutes / 60;
              }
            }
            
            hours = Math.max(0, Math.round(hours * 4) / 4); // Round to nearest 0.25
            
            entriesToInsert.push({
              timesheet_id: timesheetId,
              date: dateStr,
              hours: hours,
              project_name: attendance.notes || 'Work',
              task_description: `Attendance: ${format(checkIn, 'h:mm a')} - ${attendance.check_out_time ? format(new Date(attendance.check_out_time), 'h:mm a') : 'Auto logged out'}`,
              is_billable: hours > 0,
            });
          } else {
            // No attendance - 0 hours
            entriesToInsert.push({
              timesheet_id: timesheetId,
              date: dateStr,
              hours: 0,
              project_name: '-',
              task_description: 'No attendance recorded',
              is_billable: false,
            });
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Insert all entries
      if (entriesToInsert.length > 0) {
        const { data: insertedEntries, error } = await supabase
          .from('timesheet_entries')
          .insert(entriesToInsert)
          .select();

        if (!error && insertedEntries) {
          setEntries(insertedEntries);
          await updateTimesheetTotalHours(timesheetId);
        }
      }
    } catch (error) {
      console.error('Error auto-generating entries:', error);
    }
  };

  const saveEntry = async (entry: TimesheetEntry) => {
    if (!currentTimesheet) return false;

    try {
      const entryData = {
        ...entry,
        timesheet_id: currentTimesheet.id,
      };

      if (entry.id) {
        // Update existing entry
        const { data, error } = await supabase
          .from('timesheet_entries')
          .update(entryData)
          .eq('id', entry.id)
          .select()
          .single();

        if (error) throw error;
        
        setEntries(prev => prev.map(e => e.id === entry.id ? data : e));
      } else {
        // Create new entry
        const { data, error } = await supabase
          .from('timesheet_entries')
          .insert(entryData)
          .select()
          .single();

        if (error) throw error;
        
        setEntries(prev => [...prev, data]);
      }

      // Update total hours
      await updateTimesheetTotalHours(currentTimesheet.id);
      return true;
    } catch (error) {
      console.error('Error saving entry:', error);
      toast({
        title: "Error",
        description: "Failed to save timesheet entry",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteEntry = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('timesheet_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;
      
      setEntries(prev => prev.filter(e => e.id !== entryId));
      
      if (currentTimesheet) {
        await updateTimesheetTotalHours(currentTimesheet.id);
      }

      toast({
        title: "Success",
        description: "Entry deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  const updateTimesheetTotalHours = async (timesheetId: string) => {
    try {
      const { data: entries } = await supabase
        .from('timesheet_entries')
        .select('hours')
        .eq('timesheet_id', timesheetId);

      const totalHours = entries?.reduce((sum, entry) => sum + entry.hours, 0) || 0;

      const { error } = await supabase
        .from('timesheets')
        .update({ total_hours: totalHours })
        .eq('id', timesheetId);

      if (error) throw error;

      setCurrentTimesheet(prev => prev ? { ...prev, total_hours: totalHours } : null);
    } catch (error) {
      console.error('Error updating total hours:', error);
    }
  };

  const submitTimesheet = async (timesheetId: string) => {
    try {
      const { error } = await supabase
        .from('timesheets')
        .update({ 
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', timesheetId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Timesheet submitted for approval",
      });

      await fetchTimesheets();
      if (currentTimesheet?.id === timesheetId) {
        setCurrentTimesheet(prev => prev ? { ...prev, status: 'submitted' } : null);
      }
    } catch (error) {
      console.error('Error submitting timesheet:', error);
      toast({
        title: "Error",
        description: "Failed to submit timesheet",
        variant: "destructive",
      });
    }
  };

  const approveTimesheet = async (timesheetId: string) => {
    try {
      const { error } = await supabase
        .from('timesheets')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', timesheetId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Timesheet approved",
      });

      await fetchTimesheets();
    } catch (error) {
      console.error('Error approving timesheet:', error);
      toast({
        title: "Error",
        description: "Failed to approve timesheet",
        variant: "destructive",
      });
    }
  };

  const rejectTimesheet = async (timesheetId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('timesheets')
        .update({ 
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', timesheetId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Timesheet rejected",
      });

      await fetchTimesheets();
    } catch (error) {
      console.error('Error rejecting timesheet:', error);
      toast({
        title: "Error",
        description: "Failed to reject timesheet",
        variant: "destructive",
      });
    }
  };

  const bulkApproveTimesheets = async (timesheetIds: string[]) => {
    try {
      const { error } = await supabase
        .from('timesheets')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .in('id', timesheetIds);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${timesheetIds.length} timesheets approved`,
      });

      await fetchTimesheets();
    } catch (error) {
      console.error('Error bulk approving timesheets:', error);
      toast({
        title: "Error",
        description: "Failed to approve timesheets",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTimesheets();
  }, []);

  return {
    timesheets,
    currentTimesheet,
    entries,
    loading,
    fetchTimesheets,
    createOrGetTimesheet,
    saveEntry,
    deleteEntry,
    submitTimesheet,
    approveTimesheet,
    rejectTimesheet,
    bulkApproveTimesheets,
    setCurrentTimesheet,
    setEntries,
  };
};
