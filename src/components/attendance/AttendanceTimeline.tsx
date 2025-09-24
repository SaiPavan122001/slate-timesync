import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Coffee, AlertCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { AttendanceRecord } from '@/hooks/useAttendance';

interface AttendanceTimelineProps {
  records: AttendanceRecord[];
  loading: boolean;
}

export function AttendanceTimeline({ records, loading }: AttendanceTimelineProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const weekStart = startOfWeek(selectedDate);
  const weekEnd = endOfWeek(selectedDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getRecordForDate = (date: Date) => {
    return records.find(record => isSameDay(new Date(record.date), date));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'default';
      case 'absent': return 'destructive';
      case 'late': return 'secondary';
      default: return 'outline';
    }
  };

  const DayCard = ({ date, record }: { date: Date; record?: AttendanceRecord }) => (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{format(date, 'EEE')}</CardTitle>
          <Badge variant={record ? getStatusColor(record.status) : 'outline'} className="text-xs">
            {record?.status || 'Not recorded'}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          {format(date, 'MMM d')}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {record ? (
          <div className="space-y-2">
            {record.check_in_time && (
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3 w-3 text-green-600" />
                <span>In: {format(new Date(record.check_in_time), 'h:mm a')}</span>
              </div>
            )}
            {record.check_out_time && (
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3 w-3 text-red-600" />
                <span>Out: {format(new Date(record.check_out_time), 'h:mm a')}</span>
              </div>
            )}
            {record.break_start_time && record.break_end_time && (
              <div className="flex items-center gap-2 text-xs">
                <Coffee className="h-3 w-3 text-orange-600" />
                <span>
                  Break: {format(new Date(record.break_start_time), 'h:mm a')} - 
                  {format(new Date(record.break_end_time), 'h:mm a')}
                </span>
              </div>
            )}
            {record.total_hours && (
              <div className="text-xs font-medium">
                Total: {record.total_hours.toFixed(2)}h
              </div>
            )}
            {record.is_corrected && (
              <div className="flex items-center gap-1 text-xs text-orange-600">
                <AlertCircle className="h-3 w-3" />
                <span>Corrected</span>
              </div>
            )}
            {record.notes && (
              <div className="text-xs text-muted-foreground truncate">
                "{record.notes}"
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">
            No attendance recorded
          </div>
        )}
      </CardContent>
    </Card>
  );

  const DetailedDayView = ({ record }: { record?: AttendanceRecord }) => {
    if (!record) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              No attendance data for this date
            </div>
          </CardContent>
        </Card>
      );
    }

    const timeline = [];
    
    if (record.check_in_time) {
      timeline.push({
        time: record.check_in_time,
        event: 'Check In',
        icon: Clock,
        color: 'text-green-600',
      });
    }

    if (record.break_start_time) {
      timeline.push({
        time: record.break_start_time,
        event: 'Break Start',
        icon: Coffee,
        color: 'text-orange-600',
      });
    }

    if (record.break_end_time) {
      timeline.push({
        time: record.break_end_time,
        event: 'Break End',
        icon: Coffee,
        color: 'text-orange-600',
      });
    }

    if (record.check_out_time) {
      timeline.push({
        time: record.check_out_time,
        event: 'Check Out',
        icon: Clock,
        color: 'text-red-600',
      });
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{format(new Date(record.date), 'EEEE, MMMM do')}</span>
            <Badge variant={getStatusColor(record.status)}>
              {record.status}
            </Badge>
          </CardTitle>
          {record.total_hours && (
            <CardDescription>
              Total Hours: {record.total_hours.toFixed(2)}h
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timeline.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${item.color}`} />
                  <div>
                    <div className="font-medium">{item.event}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(item.time), 'h:mm:ss a')}
                    </div>
                  </div>
                </div>
              );
            })}

            {record.notes && (
              <div className="mt-4 p-3 bg-secondary/50 rounded-lg">
                <div className="font-medium text-sm mb-1">Notes:</div>
                <div className="text-sm text-muted-foreground">{record.notes}</div>
              </div>
            )}

            {record.is_corrected && (
              <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                <div className="flex items-center gap-2 text-orange-600 font-medium text-sm mb-1">
                  <AlertCircle className="h-4 w-4" />
                  Administrative Correction
                </div>
                {record.correction_reason && (
                  <div className="text-sm text-muted-foreground">
                    Reason: {record.correction_reason}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Attendance Timeline
        </CardTitle>
        <CardDescription>
          View your attendance records for the week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="week" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="week">Week View</TabsTrigger>
            <TabsTrigger value="day">Day View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="week" className="space-y-4">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 7 * 24 * 60 * 60 * 1000))}
              >
                Previous Week
              </Button>
              <span className="font-medium">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </span>
              <Button 
                variant="outline"
                onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000))}
              >
                Next Week
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {weekDays.map((date) => (
                <DayCard 
                  key={date.toISOString()} 
                  date={date} 
                  record={getRecordForDate(date)} 
                />
              ))}
            </div>
            
            {/* Week Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Week Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {records.filter(r => r.status === 'present').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Days Present</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-secondary-foreground">
                      {records.reduce((sum, r) => sum + (r.total_hours || 0), 0).toFixed(1)}h
                    </div>
                    <div className="text-sm text-muted-foreground">Total Hours</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {records.filter(r => r.status === 'late').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Late Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-destructive">
                      {records.filter(r => r.status === 'absent').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Absent Days</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="day" className="space-y-4">
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000))}
              >
                Previous Day
              </Button>
              <span className="font-medium">
                {format(selectedDate, 'EEEE, MMMM do, yyyy')}
              </span>
              <Button 
                variant="outline"
                onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}
              >
                Next Day
              </Button>
            </div>
            
            <DetailedDayView record={getRecordForDate(selectedDate)} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}