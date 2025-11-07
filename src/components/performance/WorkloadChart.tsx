import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';

interface WorkloadChartProps {
  data: { regular: number; overtime: number; undertime: number };
  projectBreakdown: { category: string; hours: number }[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--muted))'];
const PROJECT_COLORS = [
  'hsl(81 65% 45%)',
  'hsl(81 65% 55%)',
  'hsl(81 65% 35%)',
  'hsl(0 0% 45%)',
  'hsl(0 0% 55%)'
];

export const WorkloadChart = ({ data, projectBreakdown }: WorkloadChartProps) => {
  const overtimeData = [
    { name: 'Regular Hours', value: data.regular },
    { name: 'Overtime', value: data.overtime },
    { name: 'Undertime', value: data.undertime }
  ].filter(item => item.value > 0);

  const chartConfig = {
    hours: {
      label: 'Hours',
      color: 'hsl(var(--primary))'
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Work Hours Distribution</CardTitle>
          <CardDescription>Regular vs Overtime vs Undertime</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={overtimeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}h`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {overtimeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `${value} hours`}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project Time Breakdown</CardTitle>
          <CardDescription>Top 5 projects by hours</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, hours }) => `${category}: ${hours}h`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="hours"
                >
                  {projectBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PROJECT_COLORS[index % PROJECT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `${value} hours`}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};
