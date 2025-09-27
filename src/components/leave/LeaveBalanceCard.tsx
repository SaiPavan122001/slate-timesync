import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CalendarDays } from 'lucide-react';
import { useLeave } from '@/hooks/useLeave';

export default function LeaveBalanceCard() {
  const { leaveBalances, leaveTypes, loading } = useLeave();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent className="animate-pulse">
              <div className="space-y-2">
                <div className="h-6 bg-muted rounded w-1/2"></div>
                <div className="h-2 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getLeaveTypeName = (leaveTypeId: string) => {
    const leaveType = leaveTypes.find(lt => lt.id === leaveTypeId);
    return leaveType?.name || 'Unknown';
  };

  const getUsageColor = (used: number, total: number) => {
    const percentage = (used / total) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (leaveBalances.length === 0) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Leave Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No leave balances found. Please contact HR to set up your leave entitlements.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {leaveBalances.map((balance) => {
        const usagePercentage = balance.total_days > 0 
          ? (balance.used_days / balance.total_days) * 100 
          : 0;

        return (
          <Card key={balance.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>{getLeaveTypeName(balance.leave_type_id)}</span>
                <Badge variant="outline" className="text-xs">
                  {balance.year}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">
                    {balance.remaining_days}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    days remaining
                  </span>
                </div>
                
                <Progress 
                  value={usagePercentage} 
                  className="h-2"
                />
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Used: {balance.used_days}</span>
                  <span>Total: {balance.total_days}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}