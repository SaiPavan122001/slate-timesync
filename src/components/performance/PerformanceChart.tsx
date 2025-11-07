import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface PerformanceChartProps {
  data: { week: string; hours: number; target: number }[];
}

export const PerformanceChart = ({ data }: PerformanceChartProps) => {
  const chartConfig = {
    hours: {
      label: 'Hours Logged',
      color: 'hsl(var(--primary))'
    },
    target: {
      label: 'Target Hours',
      color: 'hsl(var(--muted-foreground))'
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hours Logged vs Target</CardTitle>
        <CardDescription>Weekly hours comparison over the past 8 weeks</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="week" 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar 
                dataKey="hours" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                name="Hours Logged"
              />
              <Bar 
                dataKey="target" 
                fill="hsl(var(--muted))" 
                radius={[4, 4, 0, 0]}
                name="Target Hours"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
