import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface TimeUtilizationChartProps {
  utilizationRate: number;
}

export function TimeUtilizationChart({ utilizationRate }: TimeUtilizationChartProps) {
  const data = [
    {
      category: 'Time Utilization',
      productive: utilizationRate,
      idle: Math.max(0, 100 - utilizationRate)
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Utilization Efficiency</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
            <YAxis type="category" dataKey="category" stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--popover-foreground))'
              }}
            />
            <Legend />
            <Bar dataKey="productive" stackId="a" fill="hsl(var(--primary))" name="Productive Hours %" />
            <Bar dataKey="idle" stackId="a" fill="hsl(var(--muted))" name="Idle Hours %" />
          </BarChart>
        </ResponsiveContainer>
        <div className="text-center mt-4">
          <p className="text-3xl font-bold text-primary">{utilizationRate}%</p>
          <p className="text-sm text-muted-foreground">Productive Time Utilization</p>
        </div>
      </CardContent>
    </Card>
  );
}
