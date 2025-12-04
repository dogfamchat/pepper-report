import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDateNoYear } from '../../../scripts/utils/date-utils';

interface BehaviorData {
  date: string;
  positiveCount: number;
  negativeCount: number;
}

interface Props {
  data: BehaviorData[];
}

export default function BehaviorTimelineChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.05)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateNoYear}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis />
        <Tooltip isAnimationActive={false} />
        <Legend />
        <Line
          type="linear"
          dataKey="positiveCount"
          stroke="#22c55e"
          strokeWidth={2}
          name="Caught Being Good"
          dot={{ fill: '#22c55e', r: 3 }}
          isAnimationActive={false}
        />
        <Line
          type="linear"
          dataKey="negativeCount"
          stroke="#ef4444"
          strokeWidth={2}
          name="Ooops"
          dot={{ fill: '#ef4444', r: 3 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
