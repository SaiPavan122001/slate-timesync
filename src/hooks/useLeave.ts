import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface LeaveType {
  id: string;
  name: string;
  description?: string;
  max_days_per_year?: number;
  is_carry_forward: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  id: string;
  profile_id: string;
  leave_type_id: string;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveRequest {
  id: string;
  profile_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  leave_types?: { name: string };
  profiles?: { 
    first_name: string;
    last_name: string; 
    employee_id: string;
  };
  approved_by_profile?: {
    first_name: string;
    last_name: string;
  };
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  year?: number;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

export function useLeave() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { profile, userRole } = useAuth();

  useEffect(() => {
    if (profile) {
      fetchLeaveData();
    }
  }, [profile]);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchLeaveTypes(),
        fetchLeaveBalances(),
        fetchLeaveRequests(),
        fetchHolidays(),
      ]);
    } catch (error) {
      console.error('Error fetching leave data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch leave data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveTypes = async () => {
    const { data, error } = await supabase
      .from('leave_types')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching leave types:', error);
      return;
    }

    setLeaveTypes(data || []);
  };

  const fetchLeaveBalances = async () => {
    if (!profile?.id) return;

    const currentYear = new Date().getFullYear();
    const { data, error } = await supabase
      .from('leave_balances')
      .select(`
        *,
        leave_types:leave_type_id (
          id,
          name,
          description
        )
      `)
      .eq('profile_id', profile.id)
      .eq('year', currentYear);

    if (error) {
      console.error('Error fetching leave balances:', error);
      return;
    }

    setLeaveBalances(data || []);
  };

  const fetchLeaveRequests = async () => {
    if (!profile?.id) return;

    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        leave_types:leave_type_id (
          name
        )
      `);

    // If user is employee, only show their requests
    if (userRole === 'employee') {
      query = query.eq('profile_id', profile.id);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching leave requests:', error);
      return;
    }

    // Fetch profile data separately to avoid relationship conflicts
    if (data && data.length > 0) {
      const profileIds = [...new Set(data.map(req => req.profile_id))];
      const approverIds = [...new Set(data.filter(req => req.approved_by).map(req => req.approved_by))];
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, employee_id')
        .in('id', profileIds);

      const { data: approversData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', approverIds);

      // Merge the data
      const enrichedData = data.map(request => ({
        ...request,
        profiles: profilesData?.find(p => p.id === request.profile_id),
        approved_by_profile: approversData?.find(a => a.user_id === request.approved_by)
      }));

      setLeaveRequests(enrichedData as LeaveRequest[]);
    } else {
      setLeaveRequests([]);
    }
  };

  const fetchHolidays = async () => {
    const currentYear = new Date().getFullYear();
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .or(`year.eq.${currentYear},is_recurring.eq.true`)
      .order('date');

    if (error) {
      console.error('Error fetching holidays:', error);
      return;
    }

    setHolidays(data || []);
  };

  const createLeaveRequest = async (requestData: {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    days_requested: number;
    reason?: string;
  }) => {
    if (!profile?.id) {
      toast({
        title: "Error",
        description: "User profile not found",
        variant: "destructive",
      });
      return { error: new Error('User profile not found') };
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        ...requestData,
        profile_id: profile.id,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: "Leave request submitted successfully",
    });

    // Send email notification to HR
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'leave_submission',
          employeeId: profile.id,
          requestId: data.id,
        },
      });
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
    }

    fetchLeaveRequests();
    return { data };
  };

  const updateLeaveRequest = async (
    requestId: string,
    updates: {
      status: 'approved' | 'rejected';
      rejection_reason?: string;
      approved_by?: string;
    }
  ) => {
    const { data, error } = await supabase
      .from('leave_requests')
      .update({
        ...updates,
        approved_at: updates.status === 'approved' ? new Date().toISOString() : null,
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    // If approved, update leave balance
    if (updates.status === 'approved') {
      await updateLeaveBalance(data.profile_id, data.leave_type_id, data.days_requested);
    }

    toast({
      title: "Success",
      description: `Leave request ${updates.status} successfully`,
    });

    // Send email notification to employee
    try {
      await supabase.functions.invoke('send-notification-email', {
        body: {
          type: 'leave_approval',
          employeeId: data.profile_id,
          requestId: data.id,
          status: updates.status,
          rejectionReason: updates.rejection_reason,
        },
      });
    } catch (emailError) {
      console.error('Error sending email notification:', emailError);
    }

    fetchLeaveRequests();
    fetchLeaveBalances();
    return { data };
  };

  const updateLeaveBalance = async (profileId: string, leaveTypeId: string, daysUsed: number) => {
    const currentYear = new Date().getFullYear();
    
    const { data: existingBalance } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('profile_id', profileId)
      .eq('leave_type_id', leaveTypeId)
      .eq('year', currentYear)
      .single();

    if (existingBalance) {
      const newUsedDays = existingBalance.used_days + daysUsed;
      const newRemainingDays = existingBalance.total_days - newUsedDays;

      await supabase
        .from('leave_balances')
        .update({
          used_days: newUsedDays,
          remaining_days: Math.max(0, newRemainingDays),
        })
        .eq('id', existingBalance.id);
    }
  };

  // Admin functions for managing leave types
  const createLeaveType = async (leaveTypeData: {
    name: string;
    description?: string;
    max_days_per_year?: number;
    is_carry_forward: boolean;
  }) => {
    const { data, error } = await supabase
      .from('leave_types')
      .insert({
        ...leaveTypeData,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: "Leave type created successfully",
    });

    fetchLeaveTypes();
    return { data };
  };

  const updateLeaveType = async (id: string, updates: Partial<LeaveType>) => {
    const { data, error } = await supabase
      .from('leave_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: "Leave type updated successfully",
    });

    fetchLeaveTypes();
    return { data };
  };

  const deleteLeaveType = async (id: string) => {
    const { error } = await supabase
      .from('leave_types')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: "Leave type deleted successfully",
    });

    fetchLeaveTypes();
    return { error: null };
  };

  // Holiday management
  const createHoliday = async (holidayData: {
    name: string;
    date: string;
    year?: number;
    is_recurring: boolean;
  }) => {
    const { data, error } = await supabase
      .from('holidays')
      .insert(holidayData)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: "Holiday created successfully",
    });

    fetchHolidays();
    return { data };
  };

  const updateHoliday = async (id: string, updates: Partial<Holiday>) => {
    const { data, error } = await supabase
      .from('holidays')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: "Holiday updated successfully",
    });

    fetchHolidays();
    return { data };
  };

  const deleteHoliday = async (id: string) => {
    const { error } = await supabase
      .from('holidays')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Success",
      description: "Holiday deleted successfully",
    });

    fetchHolidays();
    return { error: null };
  };

  const calculateWorkingDays = (startDate: string, endDate: string, isHalfDay = false): number => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        // Check if it's not a holiday
        const dateStr = date.toISOString().split('T')[0];
        const isHoliday = holidays.some(holiday => 
          holiday.date === dateStr || 
          (holiday.is_recurring && holiday.date.slice(5) === dateStr.slice(5))
        );
        
        if (!isHoliday) {
          workingDays += isHalfDay ? 0.5 : 1;
        }
      }
    }

    return workingDays;
  };

  return {
    // Data
    leaveTypes,
    leaveBalances,
    leaveRequests,
    holidays,
    loading,
    
    // Employee functions
    createLeaveRequest,
    calculateWorkingDays,
    
    // Manager/HR functions
    updateLeaveRequest,
    
    // Admin functions
    createLeaveType,
    updateLeaveType,
    deleteLeaveType,
    createHoliday,
    updateHoliday,
    deleteHoliday,
    
    // Refresh functions
    fetchLeaveData,
    fetchLeaveRequests,
    fetchLeaveBalances,
  };
}