import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface AttendanceRecord {
  id: string;
  profile_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
  total_hours: number | null;
  status: string;
  notes: string | null;
  is_corrected: boolean;
  correction_reason: string | null;
  corrected_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendancePolicy {
  id: string;
  name: string;
  description: string;
  working_hours_start: string;
  working_hours_end: string;
  break_duration_minutes: number;
  grace_period_minutes: number;
  overtime_threshold_hours: number;
  is_active: boolean;
}

export function useAttendance() {
  const [todaysAttendance, setTodaysAttendance] = useState<AttendanceRecord | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [policies, setPolicies] = useState<AttendancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { profile } = useAuth();

  // Load today's attendance
  const loadTodaysAttendance = async () => {
    if (!profile?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      setTodaysAttendance(data);
    } catch (error) {
      console.error('Error loading today\'s attendance:', error);
    }
  };

  // Load attendance records for date range
  const loadAttendanceRecords = async (startDate: string, endDate: string) => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('profile_id', profile.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      setAttendanceRecords(data || []);
    } catch (error) {
      console.error('Error loading attendance records:', error);
      toast({
        title: "Error",
        description: "Failed to load attendance records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load policies
  const loadPolicies = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_policies')
        .select('*')
        .eq('is_active', true)
        .order('created_at');

      if (error) throw error;
      setPolicies(data || []);
    } catch (error) {
      console.error('Error loading policies:', error);
    }
  };

  // Check in
  const checkIn = async (notes?: string) => {
    if (!profile?.id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('attendance')
        .insert({
          profile_id: profile.id,
          date: today,
          check_in_time: now,
          status: 'present',
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      setTodaysAttendance(data);
      toast({
        title: "Checked In",
        description: `Successfully checked in at ${new Date(now).toLocaleTimeString()}`,
      });

      return data;
    } catch (error) {
      console.error('Error checking in:', error);
      toast({
        title: "Check-in Failed",
        description: "Failed to check in. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Check out
  const checkOut = async (notes?: string) => {
    if (!todaysAttendance || !profile?.id) return;

    try {
      const now = new Date().toISOString();
      const checkInTime = new Date(todaysAttendance.check_in_time!);
      const checkOutTime = new Date(now);
      
      // Calculate total hours (excluding break time)
      let totalHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
      
      // Subtract break time if applicable
      if (todaysAttendance.break_start_time && todaysAttendance.break_end_time) {
        const breakStart = new Date(todaysAttendance.break_start_time);
        const breakEnd = new Date(todaysAttendance.break_end_time);
        const breakHours = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60 * 60);
        totalHours -= breakHours;
      }

      const { data, error } = await supabase
        .from('attendance')
        .update({
          check_out_time: now,
          total_hours: totalHours,
          notes: notes || todaysAttendance.notes,
        })
        .eq('id', todaysAttendance.id)
        .select()
        .single();

      if (error) throw error;

      setTodaysAttendance(data);
      toast({
        title: "Checked Out",
        description: `Successfully checked out at ${new Date(now).toLocaleTimeString()}. Total hours: ${totalHours.toFixed(2)}`,
      });

      return data;
    } catch (error) {
      console.error('Error checking out:', error);
      toast({
        title: "Check-out Failed",
        description: "Failed to check out. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Start break
  const startBreak = async () => {
    if (!todaysAttendance) return;

    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('attendance')
        .update({ break_start_time: now })
        .eq('id', todaysAttendance.id)
        .select()
        .single();

      if (error) throw error;

      setTodaysAttendance(data);
      toast({
        title: "Break Started",
        description: `Break started at ${new Date(now).toLocaleTimeString()}`,
      });

      return data;
    } catch (error) {
      console.error('Error starting break:', error);
      toast({
        title: "Error",
        description: "Failed to start break. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // End break
  const endBreak = async () => {
    if (!todaysAttendance) return;

    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('attendance')
        .update({ break_end_time: now })
        .eq('id', todaysAttendance.id)
        .select()
        .single();

      if (error) throw error;

      setTodaysAttendance(data);
      toast({
        title: "Break Ended",
        description: `Break ended at ${new Date(now).toLocaleTimeString()}`,
      });

      return data;
    } catch (error) {
      console.error('Error ending break:', error);
      toast({
        title: "Error",
        description: "Failed to end break. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('attendance_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `profile_id=eq.${profile.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as AttendanceRecord;
            const today = new Date().toISOString().split('T')[0];
            
            if (record.date === today) {
              setTodaysAttendance(record);
            }
            
            // Update records list if it contains this record
            setAttendanceRecords(prev => {
              const existingIndex = prev.findIndex(r => r.id === record.id);
              if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = record;
                return updated;
              } else {
                return [record, ...prev];
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  // Load initial data
  useEffect(() => {
    if (profile?.id) {
      loadTodaysAttendance();
      loadPolicies();
      
      // Load current week's records
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
      
      loadAttendanceRecords(
        startOfWeek.toISOString().split('T')[0],
        endOfWeek.toISOString().split('T')[0]
      );
    }
  }, [profile?.id]);

  return {
    todaysAttendance,
    attendanceRecords,
    policies,
    loading,
    checkIn,
    checkOut,
    startBreak,
    endBreak,
    loadAttendanceRecords,
    loadTodaysAttendance,
  };
}