import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePerformance } from '@/hooks/usePerformance';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, TrendingUp, TrendingDown, Clock, Target } from 'lucide-react';
import { PerformanceChart } from '@/components/performance/PerformanceChart';
import { AttendanceTrendChart } from '@/components/performance/AttendanceTrendChart';
import { WorkloadChart } from '@/components/performance/WorkloadChart';
import { EfficiencyTrendChart } from '@/components/performance/EfficiencyTrendChart';
import { TaskEfficiencyChart } from '@/components/performance/TaskEfficiencyChart';
import { TimeUtilizationChart } from '@/components/performance/TimeUtilizationChart';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Performance() {
  const { user, userRole, loading: authLoading } = useAuth();
  const { 
    employees, 
    loading, 
    fetchEmployees, 
    selectedEmployee, 
    setSelectedEmployee,
    performanceDetail,
    fetchEmployeeDetail
  } = usePerformance();
  
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [dateRange] = useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date())
  });

  useEffect(() => {
    if (selectedEmployee) {
      const employee = employees.find(e => e.profile_id === selectedEmployee);
      if (employee) {
        fetchEmployeeDetail(employee.profile_id, dateRange);
      }
    }
  }, [selectedEmployee]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check permissions - only HR, managers, and super_admin can view full dashboard
  const canViewAll = userRole === 'hr' || userRole === 'manager' || userRole === 'super_admin';
  
  // Filter employees based on search and department
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = searchTerm === '' || 
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
    
    return matchesSearch && matchesDepartment;
  });

  const departments = Array.from(new Set(employees.map(e => e.department).filter(Boolean)));

  // Calculate team averages
  const teamStats = {
    avgPerformance: Math.round(employees.reduce((sum, e) => sum + e.performanceScore, 0) / employees.length || 0),
    totalHours: Math.round(employees.reduce((sum, e) => sum + e.hoursLogged, 0) * 10) / 10,
    avgUtilization: Math.round(employees.reduce((sum, e) => sum + e.utilizationRate, 0) / employees.length || 0),
    avgAttendance: Math.round(employees.reduce((sum, e) => sum + e.attendanceRate, 0) / employees.length || 0)
  };

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500">Excellent</Badge>;
    if (score >= 75) return <Badge className="bg-blue-500">Good</Badge>;
    if (score >= 60) return <Badge className="bg-yellow-500">Average</Badge>;
    return <Badge variant="destructive">Needs Improvement</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold">Performance & Productivity</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Team Summary Cards */}
        {canViewAll && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Team Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats.avgPerformance}%</div>
                <p className="text-xs text-muted-foreground">Average score</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats.totalHours}h</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Utilization Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats.avgUtilization}%</div>
                <p className="text-xs text-muted-foreground">Team average</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Attendance Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{teamStats.avgAttendance}%</div>
                <p className="text-xs text-muted-foreground">Team average</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Layout: Employee List + Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Employee List */}
          <div className="lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Employees</CardTitle>
                <div className="space-y-3 mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {canViewAll && (
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[600px] overflow-y-auto">
                  {filteredEmployees.map((employee) => (
                    <div
                      key={employee.profile_id}
                      className={`p-4 border-b cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedEmployee === employee.profile_id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedEmployee(employee.profile_id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">
                            {employee.first_name} {employee.last_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">{employee.job_title}</p>
                          <p className="text-xs text-muted-foreground">{employee.department}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {employee.performanceScore}
                          </div>
                          <p className="text-xs text-muted-foreground">Score</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {employee.hoursLogged}h
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {employee.attendanceRate}% attendance
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel: Performance Details */}
          <div className="lg:col-span-8">
            {selectedEmployee && performanceDetail ? (
              <div className="space-y-6">
                {/* Selected Employee Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-2xl">
                          {employees.find(e => e.profile_id === selectedEmployee)?.first_name}{' '}
                          {employees.find(e => e.profile_id === selectedEmployee)?.last_name}
                        </CardTitle>
                        <p className="text-muted-foreground">
                          {employees.find(e => e.profile_id === selectedEmployee)?.job_title} • {' '}
                          {employees.find(e => e.profile_id === selectedEmployee)?.department}
                        </p>
                      </div>
                      {getPerformanceBadge(
                        employees.find(e => e.profile_id === selectedEmployee)?.performanceScore || 0
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Hours Logged</p>
                        <p className="text-2xl font-bold">
                          {employees.find(e => e.profile_id === selectedEmployee)?.hoursLogged}h
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Utilization</p>
                        <p className="text-2xl font-bold">
                          {employees.find(e => e.profile_id === selectedEmployee)?.utilizationRate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Attendance</p>
                        <p className="text-2xl font-bold">
                          {employees.find(e => e.profile_id === selectedEmployee)?.attendanceRate}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Overtime</p>
                        <p className="text-2xl font-bold">
                          {employees.find(e => e.profile_id === selectedEmployee)?.overtimeHours}h
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabs for Performance and Efficiency */}
                <Tabs defaultValue="performance" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
                    <TabsTrigger value="efficiency">Efficiency Analysis</TabsTrigger>
                  </TabsList>

                  <TabsContent value="performance" className="space-y-6">
                    <PerformanceChart data={performanceDetail.weeklyHours} />
                    <AttendanceTrendChart data={performanceDetail.attendanceTrend} />
                    <WorkloadChart 
                      data={performanceDetail.overtimeData}
                      projectBreakdown={performanceDetail.workloadBreakdown}
                    />
                  </TabsContent>

                  <TabsContent value="efficiency" className="space-y-6">
                    {/* Efficiency Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Overall Efficiency Score
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold text-primary">
                            {performanceDetail.efficiency.overallEfficiencyScore}
                          </div>
                          <p className="text-xs text-muted-foreground">Out of 100</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Task Completion
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">
                            {performanceDetail.efficiency.taskCompletionRate}%
                          </div>
                          <p className="text-xs text-muted-foreground">Tasks completed</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Time Utilization
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">
                            {performanceDetail.efficiency.timeUtilizationRate}%
                          </div>
                          <p className="text-xs text-muted-foreground">Productive hours</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Efficiency Charts */}
                    <EfficiencyTrendChart data={performanceDetail.efficiency.efficiencyTrend} />
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <TaskEfficiencyChart 
                        completionRate={performanceDetail.efficiency.taskCompletionRate} 
                      />
                      <TimeUtilizationChart 
                        utilizationRate={performanceDetail.efficiency.timeUtilizationRate} 
                      />
                    </div>
                    
                    {/* Additional Efficiency Metrics */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Additional Efficiency Insights</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Attendance Impact</p>
                            <p className="text-2xl font-bold text-primary">
                              {performanceDetail.efficiency.attendanceImpactScore}%
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Regularity influences efficiency
                            </p>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground mb-1">Overtime Output Ratio</p>
                            <p className="text-2xl font-bold text-primary">
                              {performanceDetail.efficiency.overtimeOutputRatio}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Tasks per overtime hour
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center py-12">
                  <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select an Employee</h3>
                  <p className="text-muted-foreground">
                    Click on an employee from the list to view their detailed performance analytics
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
