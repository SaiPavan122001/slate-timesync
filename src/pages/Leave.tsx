import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { useLeave } from '@/hooks/useLeave';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, Settings } from 'lucide-react';
import LeaveRequestForm from '@/components/leave/LeaveRequestForm';
import LeaveBalanceCard from '@/components/leave/LeaveBalanceCard';
import LeaveRequestsList from '@/components/leave/LeaveRequestsList';
import LeaveTypeManager from '@/components/leave/LeaveTypeManager';
import HolidayManager from '@/components/leave/HolidayManager';

export default function Leave() {
  const { user, profile, userRole, loading: authLoading } = useAuth();
  const { loading: leaveLoading } = useLeave();

  if (authLoading || leaveLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = userRole === 'super_admin' || userRole === 'hr';
  const isManagerOrAbove = userRole === 'manager' || userRole === 'hr' || userRole === 'super_admin';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">Leave Management</h1>
              <Badge variant="outline">
                {userRole?.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {profile?.first_name} {profile?.last_name}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="request" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Request Leave
            </TabsTrigger>
            {isManagerOrAbove && (
              <TabsTrigger value="approvals" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Approvals
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Administration
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <LeaveBalanceCard />
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Leave Requests</CardTitle>
                <CardDescription>
                  Your recent leave requests and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeaveRequestsList showUserColumn={false} limit={5} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="request" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Request Leave</CardTitle>
                <CardDescription>
                  Submit a new leave request for approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeaveRequestForm />
              </CardContent>
            </Card>
          </TabsContent>

          {isManagerOrAbove && (
            <TabsContent value="approvals" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Leave Approvals</CardTitle>
                  <CardDescription>
                    Review and approve team leave requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LeaveRequestsList showUserColumn={true} showActions={true} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="admin" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Leave Types</CardTitle>
                    <CardDescription>
                      Configure available leave types and policies
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LeaveTypeManager />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Holidays</CardTitle>
                    <CardDescription>
                      Manage public holidays and non-working days
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <HolidayManager />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}