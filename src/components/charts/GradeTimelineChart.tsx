import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';
import type { Grade } from '../../../scripts/types';
import { formatDateNoYear } from '../../../scripts/utils/date-utils';

interface TimelineDataPoint {
  date: string;
  grade: string;
  gradeValue: number;
}

interface Props {
  data: TimelineDataPoint[];
}

const GRADE_LABELS = ['F', 'D', 'C', 'B', 'A'];
const GRADE_COLORS: Record<number, string> = {
  4: '#5BADBF', // A - muted teal
  3: '#D6B07A', // B - warm amber
  2: '#BF6E45', // C - muted orange
  1: '#9A6040', // D - muted rust
};

export default function GradeTimelineChart({ data }: Props) {
  // Determine responsive aspect ratio
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const aspect = isMobile ? 1.5 : 2.5;

  // Custom Y-axis formatter to show letter grades
  const gradeTickFormatter = (value: number) => GRADE_LABELS[value] || '';

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: TooltipContentProps<Grade, string>) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const gradeValue = payload[0].value;
      const gradeIndex = Math.round(gradeValue);
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
          <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>
            {formatDateNoYear(dataPoint.date)}
          </p>
          <p style={{ margin: 0, fontSize: '14px' }}>
            Grade: {GRADE_LABELS[gradeIndex]} ({gradeValue}/4)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" aspect={aspect}>
      <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id="gradeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5BADBF" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#5BADBF" stopOpacity={0} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.05)" vertical={false} />

        <XAxis
          dataKey="date"
          tickFormatter={formatDateNoYear}
          angle={-45}
          textAnchor="end"
          height={60}
          stroke="#666"
        />

        <YAxis
          domain={[0, 4]}
          ticks={[0, 1, 2, 3, 4]}
          tickFormatter={gradeTickFormatter}
          stroke="#666"
        />

        <Tooltip content={CustomTooltip} isAnimationActive={false} />

        <Area
          type="linear"
          dataKey="gradeValue"
          stroke="none"
          fill="url(#gradeGradient)"
          isAnimationActive={false}
        />

        <Line
          type="linear"
          dataKey="gradeValue"
          stroke="#8B8078"
          strokeWidth={2}
          dot={(props: { cx?: number; cy?: number; payload?: TimelineDataPoint }) => {
            const { cx = 0, cy = 0, payload } = props;
            const color = payload ? GRADE_COLORS[payload.gradeValue] || '#8B8078' : '#8B8078';
            return <circle key={`dot-${cx}`} cx={cx} cy={cy} r={4} fill={color} stroke="none" />;
          }}
          activeDot={{ r: 5 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
