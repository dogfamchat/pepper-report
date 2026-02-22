import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
} from 'recharts';
import type { Grade } from '../../../scripts/types';

interface Props {
  distributionData: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  totalReports: number;
}

export default function GradeDistributionChart({ distributionData, totalReports }: Props) {
  const data = [
    { name: 'A', value: distributionData.A, color: '#667eea' },
    { name: 'B', value: distributionData.B, color: '#f093fb' },
    { name: 'C', value: distributionData.C, color: '#43b8a0' },
    { name: 'D', value: distributionData.D, color: '#e87461' },
  ].filter((d) => d.value > 0);

  const CustomTooltip = ({ active, payload }: TooltipContentProps<Grade, string>) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0];
      const percent = ((value / totalReports) * 100).toFixed(0);
      return (
        <div
          style={{
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px 12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px' }}>
            {name}: {value} days ({percent}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" aspect={1}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="35%"
          outerRadius="90%"
          dataKey="value"
          isAnimationActive={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={CustomTooltip} isAnimationActive={false} />
      </PieChart>
    </ResponsiveContainer>
  );
}
