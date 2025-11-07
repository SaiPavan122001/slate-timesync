import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, differenceInHours, format } from 'date-fns';

export interface EmployeePerformance {
  id: string;
  profile_id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  department: string;
  job_title: string;
  hoursLogged: number;
  targetHours: number;
  attendanceRate: number;
  overtimeHours: number;
  utilizationRate: number;
  performanceScore: number;
}

export interface PerformanceDetail {
  weeklyHours: { week: string; hours: number; target: number }[];
  attendanceTrend: { date: string; status: string }[];
  workloadBreakdown: { category: string; hours: number }[];
  overtimeData: { regular: number; overtime: number; undertime: number };
}

export const usePerformance = () => {
  const [employees, setEmployees] = useState<EmployeePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [performanceDetail, setPerformanceDetail] = useState<PerformanceDetail | null>(null);

  const fetchEmployees = async (filters?: { department?: string; dateRange?: { start: Date; end: Date } }) => {
    try {
      setLoading(true);
      
      // Fetch all profiles with attendance and timesheet data
      let query = supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          employee_id,
          first_name,
          last_name,
          department,
          job_title,
          is_active
        `)
        .eq('is_active', true);

      if (filters?.department) {
        query = query.eq('department', filters.department);
      }

      const { data: profiles, error: profilesError } = await query;

      if (profilesError) throw profilesError;

      // Calculate performance metrics for each employee
      const performanceData = await Promise.all(
        (profiles || []).map(async (profile) => {
          const metrics = await calculateEmployeeMetrics(
            profile.id,
            filters?.dateRange || {
              start: startOfWeek(new Date()),
              end: endOfWeek(new Date())
            }
          );

          return {
            id: profile.user_id,
            profile_id: profile.id,
            employee_id: profile.employee_id || '',
            first_name: profile.first_name,
            last_name: profile.last_name,
            department: profile.department || 'N/A',
            job_title: profile.job_title || 'N/A',
            ...metrics
          };
        })
      );

      setEmployees(performanceData);
    } catch (error) {
      console.error('Error fetching employee performance:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEmployeeMetrics = async (
    profileId: string,
    dateRange: { start: Date; end: Date }
  ) => {
    // Fetch attendance records
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('profile_id', profileId)
      .gte('date', format(dateRange.start, 'yyyy-MM-dd'))
      .lte('date', format(dateRange.end, 'yyyy-MM-dd'));

    // Fetch timesheet entries
    const { data: timesheets } = await supabase
      .from('timesheet_entries')
      .select('hours, date, timesheet_id')
      .gte('date', format(dateRange.start, 'yyyy-MM-dd'))
      .lte('date', format(dateRange.end, 'yyyy-MM-dd'));

    // Calculate hours logged
    const hoursLogged = timesheets?.reduce((sum, entry) => sum + Number(entry.hours), 0) || 0;

    // Calculate target hours (8 hours per working day)
    const workingDays = attendance?.filter(a => a.status === 'present' || a.status === 'late').length || 0;
    const targetHours = workingDays * 8;

    // Calculate attendance rate
    const totalDays = attendance?.length || 0;
    const presentDays = attendance?.filter(a => a.status === 'present').length || 0;
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    // Calculate overtime
    const overtimeHours = Math.max(0, hoursLogged - targetHours);

    // Calculate utilization rate
    const utilizationRate = targetHours > 0 ? (hoursLogged / targetHours) * 100 : 0;

    // Calculate performance score (weighted average)
    const performanceScore = (
      attendanceRate * 0.3 +
      Math.min(utilizationRate, 100) * 0.5 +
      (overtimeHours > 0 ? 90 : 100) * 0.2
    );

    return {
      hoursLogged: Math.round(hoursLogged * 10) / 10,
      targetHours: Math.round(targetHours * 10) / 10,
      attendanceRate: Math.round(attendanceRate),
      overtimeHours: Math.round(overtimeHours * 10) / 10,
      utilizationRate: Math.round(utilizationRate),
      performanceScore: Math.round(performanceScore)
    };
  };

  const fetchEmployeeDetail = async (profileId: string, dateRange: { start: Date; end: Date }) => {
    try {
      setLoading(true);

      // Fetch weekly hours for the past 8 weeks
      const weeklyHoursData = [];
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(dateRange.start);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const { data: entries } = await supabase
          .from('timesheet_entries')
          .select('hours')
          .gte('date', format(weekStart, 'yyyy-MM-dd'))
          .lte('date', format(weekEnd, 'yyyy-MM-dd'));

        const hours = entries?.reduce((sum, e) => sum + Number(e.hours), 0) || 0;
        weeklyHoursData.push({
          week: format(weekStart, 'MMM dd'),
          hours: Math.round(hours * 10) / 10,
          target: 40
        });
      }

      // Fetch attendance trend for the past 30 days
      const thirtyDaysAgo = new Date(dateRange.end);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('date, status')
        .eq('profile_id', profileId)
        .gte('date', format(thirtyDaysAgo, 'yyyy-MM-dd'))
        .lte('date', format(dateRange.end, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      // Fetch workload breakdown
      const { data: workloadData } = await supabase
        .from('timesheet_entries')
        .select('project_name, hours, is_billable')
        .gte('date', format(dateRange.start, 'yyyy-MM-dd'))
        .lte('date', format(dateRange.end, 'yyyy-MM-dd'));

      const projectHours: Record<string, number> = {};
      workloadData?.forEach(entry => {
        const project = entry.project_name || 'No Project';
        projectHours[project] = (projectHours[project] || 0) + Number(entry.hours);
      });

      const workloadBreakdown = Object.entries(projectHours)
        .map(([category, hours]) => ({ category, hours: Math.round(hours * 10) / 10 }))
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5);

      // Calculate overtime data
      const totalHours = workloadData?.reduce((sum, e) => sum + Number(e.hours), 0) || 0;
      const expectedHours = 40; // per week
      const regular = Math.min(totalHours, expectedHours);
      const overtime = Math.max(0, totalHours - expectedHours);
      const undertime = Math.max(0, expectedHours - totalHours);

      setPerformanceDetail({
        weeklyHours: weeklyHoursData,
        attendanceTrend: attendanceData?.map(a => ({
          date: format(new Date(a.date), 'MMM dd'),
          status: a.status
        })) || [],
        workloadBreakdown,
        overtimeData: {
          regular: Math.round(regular * 10) / 10,
          overtime: Math.round(overtime * 10) / 10,
          undertime: Math.round(undertime * 10) / 10
        }
      });
    } catch (error) {
      console.error('Error fetching employee detail:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  return {
    employees,
    loading,
    fetchEmployees,
    selectedEmployee,
    setSelectedEmployee,
    performanceDetail,
    fetchEmployeeDetail
  };
};
