import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAttendance } from '@/hooks/useAttendance';
import { Navigate, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Coffee, LogIn, LogOut, Calendar, Users, Settings, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { AttendanceTimeline } from '@/components/attendance/AttendanceTimeline';
import { AttendancePolicyManager } from '@/components/attendance/AttendancePolicyManager';

export default function Attendance() {
  const navigate = useNavigate();
  const { user, profile, userRole, loading: authLoading } = useAuth();
  const { 
    todaysAttendance, 
    attendanceRecords, 
    policies, 
    loading, 
    checkIn, 
    checkOut, 
    startBreak, 
    endBreak 
  } = useAttendance();
  
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [action, setAction] = useState<'check_in' | 'check_out' | null>(null);

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

  const handleCheckIn = async () => {
    if (showNotes) {
      await checkIn(notes);
      setNotes('');
      setShowNotes(false);
      setAction(null);
    } else {
      await checkIn();
    }
  };

  const handleCheckOut = async () => {
    if (showNotes) {
      await checkOut(notes);
      setNotes('');
      setShowNotes(false);
      setAction(null);
    } else {
      await checkOut();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'default';
      case 'absent': return 'destructive';
      case 'late': return 'secondary';
      default: return 'outline';
    }
  };

  const isOnBreak = todaysAttendance?.break_start_time && !todaysAttendance?.break_end_time;
  const canCheckOut = todaysAttendance?.check_in_time && !todaysAttendance?.check_out_time;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="mr-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <h1 className="text-2xl font-bold">Attendance</h1>
              <Badge variant="outline">
                {format(new Date(), 'EEEE, MMMM do, yyyy')}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {profile?.first_name} {profile?.last_name}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Today's Status */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Today's Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Current Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Badge variant={getStatusColor(todaysAttendance?.status || 'absent')}>
                  {todaysAttendance?.status || 'Not Checked In'}
                </Badge>
                {todaysAttendance?.check_in_time && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Since {format(new Date(todaysAttendance.check_in_time), 'h:mm a')}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Check-in Time */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Check-in</CardTitle>
                <LogIn className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {todaysAttendance?.check_in_time 
                    ? format(new Date(todaysAttendance.check_in_time), 'h:mm a')
                    : '--:--'
                  }
                </div>
              </CardContent>
            </Card>

            {/* Check-out Time */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Check-out</CardTitle>
                <LogOut className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {todaysAttendance?.check_out_time 
                    ? format(new Date(todaysAttendance.check_out_time), 'h:mm a')
                    : '--:--'
                  }
                </div>
              </CardContent>
            </Card>

            {/* Total Hours */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hours Today</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {todaysAttendance?.total_hours?.toFixed(2) || '0.00'}h
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-4">
            {!todaysAttendance?.check_in_time ? (
              <Dialog open={showNotes && action === 'check_in'} onOpenChange={(open) => {
                if (!open) {
                  setShowNotes(false);
                  setAction(null);
                  setNotes('');
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    size="lg" 
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => {
                      setAction('check_in');
                      setShowNotes(true);
                    }}
                  >
                    <LogIn className="h-5 w-5 mr-2" />
                    Check In
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Check In</DialogTitle>
                    <DialogDescription>
                      Add any notes about your check-in (optional).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Add notes (optional)..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleCheckIn} className="flex-1">
                        <LogIn className="h-4 w-4 mr-2" />
                        Check In Now
                      </Button>
                      <Button variant="outline" onClick={() => handleCheckIn()}>
                        Quick Check In
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ) : canCheckOut && (
              <Dialog open={showNotes && action === 'check_out'} onOpenChange={(open) => {
                if (!open) {
                  setShowNotes(false);
                  setAction(null);
                  setNotes('');
                }
              }}>
                <DialogTrigger asChild>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => {
                      setAction('check_out');
                      setShowNotes(true);
                    }}
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    Check Out
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Check Out</DialogTitle>
                    <DialogDescription>
                      Add any notes about your check-out (optional).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Add notes (optional)..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleCheckOut} className="flex-1">
                        <LogOut className="h-4 w-4 mr-2" />
                        Check Out Now
                      </Button>
                      <Button variant="outline" onClick={() => handleCheckOut()}>
                        Quick Check Out
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {todaysAttendance?.check_in_time && !todaysAttendance?.check_out_time && (
              <>
                {!isOnBreak ? (
                  <Button 
                    size="lg" 
                    variant="secondary"
                    onClick={startBreak}
                  >
                    <Coffee className="h-5 w-5 mr-2" />
                    Start Break
                  </Button>
                ) : (
                  <Button 
                    size="lg" 
                    variant="secondary"
                    onClick={endBreak}
                  >
                    <Coffee className="h-5 w-5 mr-2" />
                    End Break
                  </Button>
                )}
              </>
            )}
          </div>

          {isOnBreak && (
            <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Coffee className="h-5 w-5 text-secondary-foreground" />
                <span className="font-medium">You're currently on break</span>
                <Badge variant="outline">
                  Started at {format(new Date(todaysAttendance.break_start_time!), 'h:mm a')}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Timeline and Management Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timeline */}
          <div className="lg:col-span-2">
            <AttendanceTimeline 
              records={attendanceRecords}
              loading={loading}
            />
          </div>

          {/* Management Panel for Admins */}
          <div className="space-y-6">
            {(userRole === 'super_admin' || userRole === 'hr' || userRole === 'manager') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Management
                  </CardTitle>
                  <CardDescription>
                    Manage team attendance and view reports
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => navigate('/team-management?tab=attendance')}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Team Attendance
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => navigate('/team-management?tab=corrections')}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Corrections & Approvals
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {userRole === 'super_admin' && (
              <AttendancePolicyManager policies={policies} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}