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
      // Check if timesheet already exists
      const { data: existing, error: fetchError } = await supabase
        .from('timesheets')
        .select('*, entries:timesheet_entries(*)')
        .eq('week_start_date', startDate)
        .single();

      if (existing && !fetchError) {
        setCurrentTimesheet(existing);
        setEntries(existing.entries || []);
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
          profile_id: '', // This will be handled by RLS
        })
        .select()
        .single();

      if (error) throw error;
      
      const newTimesheet = { ...data, entries: [] };
      setCurrentTimesheet(newTimesheet);
      setEntries([]);
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