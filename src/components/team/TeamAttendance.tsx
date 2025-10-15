import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search, Download, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from "date-fns";
import * as XLSX from 'xlsx';

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  total_hours: number | null;
  present_days?: number;
  late_days?: number;
  absent_days?: number;
  total_days?: number;
  profile_id?: string;
  profiles: {
    first_name: string;
    last_name: string;
    employee_id: string;
    department: string | null;
  };
}

export function TeamAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [periodType, setPeriodType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { toast } = useToast();

  useEffect(() => {
    updateDateRange();
  }, [periodType, dateFilter]);

  useEffect(() => {
    fetchTeamAttendance();
  }, [startDate, endDate]);

  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, departmentFilter, statusFilter]);

  const updateDateRange = () => {
    const baseDate = parseISO(dateFilter);
    
    switch (periodType) {
      case 'daily':
        setStartDate(dateFilter);
        setEndDate(dateFilter);
        break;
      case 'weekly':
        setStartDate(format(startOfWeek(baseDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        setEndDate(format(endOfWeek(baseDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        break;
      case 'monthly':
        setStartDate(format(startOfMonth(baseDate), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(baseDate), 'yyyy-MM-dd'));
        break;
    }
  };

  const fetchTeamAttendance = async () => {
    try {
      setLoading(true);
      // Fetch all active employees
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, employee_id, department')
        .eq('is_active', true)
        .order('first_name');

      if (profilesError) throw profilesError;

      // Fetch attendance records for the date range
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (attendanceError) throw attendanceError;

      // For multi-day periods, aggregate data per employee
      const aggregatedRecords = profiles.map(profile => {
        const employeeAttendance = attendanceData?.filter(a => a.profile_id === profile.id) || [];
        
        // Calculate totals
        const totalHours = employeeAttendance.reduce((sum, a) => sum + (Number(a.total_hours) || 0), 0);
        const presentDays = employeeAttendance.filter(a => a.status === 'present').length;
        const lateDays = employeeAttendance.filter(a => a.status === 'late').length;
        const absentDays = employeeAttendance.filter(a => a.status === 'absent').length;
        
        // Determine overall status
        let status = 'absent';
        if (presentDays > 0 || lateDays > 0) {
          status = lateDays > presentDays ? 'late' : 'present';
        }
        
        // For daily view, use the single record
        const singleDayRecord = employeeAttendance[0];
        
        return {
          id: profile.id,
          date: startDate,
          status: periodType === 'daily' ? (singleDayRecord?.status || 'absent') : status,
          check_in_time: periodType === 'daily' ? (singleDayRecord?.check_in_time || null) : null,
          check_out_time: periodType === 'daily' ? (singleDayRecord?.check_out_time || null) : null,
          total_hours: periodType === 'daily' ? (singleDayRecord?.total_hours || 0) : totalHours,
          present_days: presentDays,
          late_days: lateDays,
          absent_days: absentDays,
          total_days: employeeAttendance.length,
          profile_id: profile.id,
          profiles: profile
        };
      });

      setRecords(aggregatedRecords);
    } catch (error) {
      console.error('Error fetching team attendance:', error);
      toast({
        title: "Error",
        description: "Failed to fetch team attendance",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = () => {
    const ws_data = [
      [`Team Attendance Report - ${periodType.charAt(0).toUpperCase() + periodType.slice(1)}`],
      [`Period: ${format(parseISO(startDate), 'MMM d, yyyy')} to ${format(parseISO(endDate), 'MMM d, yyyy')}`],
      [],
      periodType === 'daily'
        ? ['Employee', 'Employee ID', 'Department', 'Status', 'Check In', 'Check Out', 'Hours']
        : ['Employee', 'Employee ID', 'Department', 'Status', 'Total Hours', 'Present Days', 'Late Days', 'Absent Days']
    ];

    filteredRecords.forEach(record => {
      if (periodType === 'daily') {
        ws_data.push([
          `${record.profiles.first_name} ${record.profiles.last_name}`,
          record.profiles.employee_id,
          record.profiles.department || 'N/A',
          record.status,
          record.check_in_time ? format(parseISO(record.check_in_time), 'h:mm a') : '--',
          record.check_out_time ? format(parseISO(record.check_out_time), 'h:mm a') : '--',
          `${record.total_hours || 0}h`
        ]);
      } else {
        ws_data.push([
          `${record.profiles.first_name} ${record.profiles.last_name}`,
          record.profiles.employee_id,
          record.profiles.department || 'N/A',
          record.status,
          `${record.total_hours.toFixed(2)}h`,
          String(record.present_days || 0),
          String(record.late_days || 0),
          String(record.absent_days || 0)
        ]);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Team Attendance');
    XLSX.writeFile(wb, `Team_Attendance_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const filterRecords = () => {
    let filtered = [...records];

    if (searchTerm) {
      filtered = filtered.filter(record =>
        `${record.profiles.first_name} ${record.profiles.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.profiles.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter(record => record.profiles.department === departmentFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    setFilteredRecords(filtered);
  };

  const getDepartments = () => {
    const depts = new Set(records.map(r => r.profiles.department).filter(Boolean));
    return Array.from(depts);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'default';
      case 'absent': return 'destructive';
      case 'late': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div className="text-center">Loading team attendance...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <Select value={periodType} onValueChange={(value: any) => setPeriodType(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Period Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="custom">Custom Period</SelectItem>
          </SelectContent>
        </Select>

        {periodType === 'custom' ? (
          <>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto"
            />
          </>
        ) : (
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full sm:w-auto"
          />
        )}
        
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {getDepartments().map(dept => (
              <SelectItem key={dept} value={dept!}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="present">Present</SelectItem>
            <SelectItem value="late">Late</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{records.length}</div>
              <div className="text-sm text-muted-foreground">Total Records</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {records.filter(r => r.status === 'present').length}
              </div>
              <div className="text-sm text-muted-foreground">Present</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {records.filter(r => r.status === 'late').length}
              </div>
              <div className="text-sm text-muted-foreground">Late</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {records.filter(r => r.status === 'absent').length}
              </div>
              <div className="text-sm text-muted-foreground">Absent</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
               <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Employee</th>
                  <th className="text-left p-3">Department</th>
                  <th className="text-left p-3">Status</th>
                  {periodType === 'daily' ? (
                    <>
                      <th className="text-left p-3">Check In</th>
                      <th className="text-left p-3">Check Out</th>
                      <th className="text-left p-3">Hours</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left p-3">Total Hours</th>
                      <th className="text-left p-3">Present Days</th>
                      <th className="text-left p-3">Late Days</th>
                      <th className="text-left p-3">Absent Days</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div>
                        <div className="font-medium">
                          {record.profiles.first_name} {record.profiles.last_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {record.profiles.employee_id}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">{record.profiles.department || 'N/A'}</td>
                    <td className="p-3">
                      <Badge variant={getStatusColor(record.status)}>
                        {record.status}
                      </Badge>
                    </td>
                    {periodType === 'daily' ? (
                      <>
                        <td className="p-3">
                          {record.check_in_time
                            ? format(new Date(record.check_in_time), 'h:mm a')
                            : '--'}
                        </td>
                        <td className="p-3">
                          {record.check_out_time
                            ? format(new Date(record.check_out_time), 'h:mm a')
                            : '--'}
                        </td>
                        <td className="p-3">
                          {record.total_hours?.toFixed(2) || '0.00'}h
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3">{(record.total_hours || 0).toFixed(2)}h</td>
                        <td className="p-3">{record.present_days || 0}</td>
                        <td className="p-3">{record.late_days || 0}</td>
                        <td className="p-3">{record.absent_days || 0}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredRecords.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No attendance records found for the selected period.
            </div>
          )}
          
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadExcel}
              disabled={filteredRecords.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export to Excel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
