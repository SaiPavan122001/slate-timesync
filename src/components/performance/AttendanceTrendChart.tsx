import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface AttendanceTrendChartProps {
  data: { date: string; status: string }[];
}

export const AttendanceTrendChart = ({ data }: AttendanceTrendChartProps) => {
  // Convert status to numeric values for visualization
  const chartData = data.map(item => ({
    date: item.date,
    value: item.status === 'present' ? 100 : item.status === 'late' ? 75 : item.status === 'half_day' ? 50 : 0,
    status: item.status
  }));

  const chartConfig = {
    value: {
      label: 'Attendance Status',
      color: 'hsl(var(--primary))'
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance Regularity</CardTitle>
        <CardDescription>Daily attendance status over the past 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                domain={[0, 100]}
                ticks={[0, 50, 75, 100]}
                tickFormatter={(value) => {
                  if (value === 100) return 'Present';
                  if (value === 75) return 'Late';
                  if (value === 50) return 'Half Day';
                  return 'Absent';
                }}
              />
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-card p-2 border rounded shadow-lg">
                        <p className="text-sm font-medium">{payload[0].payload.date}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {payload[0].payload.status}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                name="Attendance"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
