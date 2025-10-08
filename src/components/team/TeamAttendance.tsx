import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  total_hours: number | null;
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
  const { toast } = useToast();

  useEffect(() => {
    fetchTeamAttendance();
  }, [dateFilter]);

  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, departmentFilter, statusFilter]);

  const fetchTeamAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          date,
          status,
          check_in_time,
          check_out_time,
          total_hours,
          is_corrected,
          correction_reason,
          profile_id,
          profiles!profile_id(
            first_name,
            last_name,
            employee_id,
            department
          )
        `)
        .eq('date', dateFilter)
        .order('check_in_time', { ascending: true });

      if (error) throw error;
      setRecords(data || []);
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
      <div className="flex flex-col sm:flex-row gap-4">
        <div>
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full sm:w-auto"
          />
        </div>
        
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
                  <th className="text-left p-3">Check In</th>
                  <th className="text-left p-3">Check Out</th>
                  <th className="text-left p-3">Hours</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredRecords.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No attendance records found for the selected date.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
