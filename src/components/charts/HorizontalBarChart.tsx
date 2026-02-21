import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from 'recharts';

interface BarData {
  name: string;
  value: number;
  color?: string;
}

interface Props {
  data: BarData[];
  barColor?: string;
  xAxisLabel?: string;
  height?: number;
  customTooltip?: (payload: TooltipContentProps<number, string>['payload']) => React.ReactNode;
}

export default function HorizontalBarChart({
  data,
  barColor = '#5BADBF',
  xAxisLabel,
  height = 400,
  customTooltip,
}: Props) {
  const DefaultTooltip = ({ active, payload }: TooltipContentProps<number, string>) => {
    if (active && payload && payload.length) {
      if (customTooltip) {
        return <>{customTooltip(payload)}</>;
      }
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
            {payload[0].payload.name}: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.05)" />
        <XAxis
          type="number"
          label={
            xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -15 } : undefined
          }
        />
        <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 13 }} />
        <Tooltip content={DefaultTooltip} isAnimationActive={false} />
        <Bar dataKey="value" isAnimationActive={false}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || barColor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
