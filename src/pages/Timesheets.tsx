import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Clock, FileText, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TimesheetGrid } from '@/components/timesheets/TimesheetGrid';
import { TimesheetList } from '@/components/timesheets/TimesheetList';
import { ManagerApproval } from '@/components/timesheets/ManagerApproval';
import { CalendarImport } from '@/components/timesheets/CalendarImport';
import { useTimesheets } from '@/hooks/useTimesheets';
import { useRBAC } from '@/hooks/useRBAC';

export default function Timesheets() {
  const navigate = useNavigate();
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const { timesheets, currentTimesheet, loading } = useTimesheets();
  const { hasPermission } = useRBAC();

  const canManageTimesheets = hasPermission('timesheets', 'approve') || hasPermission('timesheets', 'manage');

  const previousWeek = () => setCurrentWeek(prev => subWeeks(prev, 1));
  const nextWeek = () => setCurrentWeek(prev => addWeeks(prev, 1));
  const goToCurrentWeek = () => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const currentWeekStats = timesheets.find(t => t.week_start_date === format(currentWeek, 'yyyy-MM-dd'));
  const pendingCount = timesheets.filter(t => t.status === 'submitted').length;
  const thisWeekHours = currentWeekStats?.total_hours || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Timesheets</h1>
            <p className="text-muted-foreground">
              Track your work hours and submit weekly timesheets
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
            <Calendar className="h-4 w-4 mr-2" />
            Current Week
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisWeekHours}h</div>
            <p className="text-xs text-muted-foreground">
              {currentWeekStats ? (
                <Badge className={getStatusColor(currentWeekStats.status)}>
                  {currentWeekStats.status}
                </Badge>
              ) : (
                'No timesheet'
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Timesheets</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timesheets.length}</div>
            <p className="text-xs text-muted-foreground">
              All time periods
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <Badge className="h-4 w-4 bg-green-100 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timesheets.filter(t => t.status === 'approved').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Completed timesheets
            </p>
          </CardContent>
        </Card>

        {canManageTimesheets && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting review
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={previousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  Week of {format(currentWeek, 'MMM d, yyyy')}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {format(currentWeek, 'MMM d')} - {format(addWeeks(currentWeek, 1), 'MMM d, yyyy')}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={nextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="current">Current Week</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          {canManageTimesheets && <TabsTrigger value="approval">Approval</TabsTrigger>}
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          <TimesheetGrid currentWeek={currentWeek} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <TimesheetList timesheets={timesheets} loading={loading} />
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <CalendarImport currentWeek={currentWeek} />
        </TabsContent>

        {canManageTimesheets && (
          <TabsContent value="approval" className="space-y-4">
            <ManagerApproval />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}