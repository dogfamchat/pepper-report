import type { TooltipContentProps } from 'recharts';
import HorizontalBarChart from './HorizontalBarChart';

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: CategoryData[];
  categoryItems: Record<string, string[]>;
}

export default function AIActivityCategoriesChart({ data, categoryItems }: Props) {
  const customTooltip = (payload: TooltipContentProps<number, string>['payload']) => {
    if (!payload || !payload.length) return null;

    const { name, value } = payload[0].payload as { name: string; value: number };
    const items = categoryItems[name] || [];
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const percent = ((value / total) * 100).toFixed(1);

    return (
      <div
        style={{
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '10px 12px',
          maxWidth: '300px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', fontSize: '14px' }}>{name}</p>
        <p style={{ margin: '0 0 6px 0', fontSize: '13px' }}>
          {value} instances ({percent}%)
        </p>
        {items.length > 0 && (
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {items.map((item, i) => (
              <div key={i} style={{ marginBottom: '2px' }}>
                • {item}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <HorizontalBarChart
      data={data}
      xAxisLabel="Number of Activity Instances"
      height={350}
      customTooltip={customTooltip}
    />
  );
}
