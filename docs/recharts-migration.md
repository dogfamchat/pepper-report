# Chart.js to Recharts Migration Guide

This document outlines the complete migration plan for replacing Chart.js with Recharts across the Pepper Report application.

## Overview

**Current**: 8 charts using Chart.js (canvas-based)
**Target**: 8 charts using Recharts (SVG-based, React)
**Benefit**: Better visual appeal, SVG rendering, modern React components

## Standards for All Charts

- **No animations**: Set `isAnimationActive={false}` on all chart elements (Line, Area, Bar, Pie) and Tooltip components
- **Consistent tooltip styling**: Use white background, 1px #ccc border, 4px border-radius, 8px 12px padding
- **Responsive containers**: Use `ResponsiveContainer` with `aspect` prop for proper sizing

## Current Chart Inventory

### GradeCharts.astro (2 charts)
1. **Grade Timeline** - Line chart with custom Y-axis (A-F grades)
2. **Grade Distribution** - Doughnut chart (A vs B grades)

### trends.astro (6 charts)
3. **Behavior Timeline** - Multi-line chart (positive vs negative behaviors)
4. **Activity Frequency** - Horizontal bar (top 10 activities)
5. **Training Frequency** - Horizontal bar (top 10 training skills)
6. **Behavior Frequency** - Horizontal bar (all behaviors, colored by type)
7. **AI Activity Categories** - Horizontal bar (7 categories, custom tooltips)
8. **AI Training Categories** - Horizontal bar (6 categories, custom tooltips)

---

## Phase 1: Setup & Proof of Concept

**Goal**: Set up React integration and create your first Recharts component.

### Step 1.1: Install Dependencies

```bash
bun add recharts @astrojs/react
bun add -D @types/recharts
```

### Step 1.2: Configure Astro for React

**File**: `astro.config.mjs`

```javascript
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';  // ADD THIS

export default defineConfig({
  site: 'https://dogfamchat.github.io',
  base: '/pepper-report',
  output: 'static',
  integrations: [react()],  // ADD THIS
  vite: {
    resolve: {
      alias: {
        '@': '/src',
        '@data': '/data',
      },
    },
  },
});
```

### Step 1.3: Create Date Utility for React Components

**File**: `src/utils/date-utils.ts` (NEW)

```typescript
/**
 * Formats a date string (YYYY-MM-DD) to display without the year
 * Example: "2025-08-15" -> "8/15"
 */
export function formatDateNoYear(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
}
```

### Step 1.4: Create Grade Timeline Chart Component

**File**: `src/components/charts/GradeTimelineChart.tsx` (NEW)

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';
import { formatDateNoYear } from '../../utils/date-utils';

interface TimelineDataPoint {
  date: string;
  grade: string;
  gradeValue: number;
}

interface Props {
  data: TimelineDataPoint[];
}

const GRADE_LABELS = ['F', 'D', 'C', 'B', 'A'];

export default function GradeTimelineChart({ data }: Props) {
  // Determine responsive aspect ratio
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const aspect = isMobile ? 1.5 : 2.5;

  // Custom Y-axis formatter to show letter grades
  const gradeTickFormatter = (value: number) => GRADE_LABELS[value] || '';

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const gradeValue = payload[0].value;
      const gradeIndex = Math.round(gradeValue);
      return (
        <div style={{
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '8px 12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
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
      <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <defs>
          <linearGradient id="gradeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#667eea" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#667eea" stopOpacity={0} />
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

        <Tooltip content={<CustomTooltip />} isAnimationActive={false} />

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
          stroke="#667eea"
          strokeWidth={2}
          dot={{ fill: '#667eea', r: 4 }}
          activeDot={{ r: 4 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### Step 1.5: Update GradeCharts.astro

**File**: `src/components/GradeCharts.astro`

**Changes**:
1. Import the React component at the top of the frontmatter
2. Replace the Grade Timeline canvas with the React component
3. Keep the Grade Distribution chart as-is for now

```astro
---
import GradeTimelineChart from './charts/GradeTimelineChart';  // ADD THIS

// ... existing interfaces ...

const { timeline, trends } = Astro.props;
---

<div class="charts-wrapper">
  <div class="chart-card">
    <h2>Grade Timeline</h2>
    <div class="chart-container">
      <!-- REPLACE canvas with: -->
      <GradeTimelineChart data={timeline} client:load />
    </div>
  </div>

  <!-- Keep Grade Distribution chart unchanged for now -->
  <div class="chart-card">
    <h2>Grade Distribution</h2>
    <div class="chart-container" style="max-width: 400px; margin: 0 auto;">
      <canvas id="gradeDistributionChart" data-trends={JSON.stringify(trends)}></canvas>
    </div>
    <div class="distribution-stats">
      <!-- ... existing stats ... -->
    </div>
  </div>
</div>

<script>
  import { Chart, registerables } from 'chart.js';

  Chart.register(...registerables);

  // REMOVE the Grade Timeline chart initialization (lines ~140-198)
  // KEEP the Grade Distribution chart initialization (lines ~200-237)

  // Grade Distribution Chart
  const distributionCanvas = document.getElementById('gradeDistributionChart') as HTMLCanvasElement;
  if (distributionCanvas) {
    const trends = JSON.parse(distributionCanvas.dataset.trends || '{}');
    const dist = trends.summary.overallGradeDistribution;

    new Chart(distributionCanvas, {
      type: 'doughnut',
      data: {
        labels: ['A', 'B'],
        datasets: [{
          data: [dist.A, dist.B],
          backgroundColor: ['#667eea', '#f093fb'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            animation: false,
            callbacks: {
              label: (context) => {
                const total = dist.A + dist.B;
                const percent = ((context.parsed / total) * 100).toFixed(0);
                return `${context.label}: ${context.parsed} days (${percent}%)`;
              }
            }
          }
        }
      }
    });
  }
</script>

<!-- Keep existing styles -->
```

### Step 1.6: Test Phase 1

```bash
bun run dev
```

Visit http://localhost:4321/pepper-report/ and verify:
- ✅ Grade Timeline renders as SVG (Recharts)
- ✅ Y-axis shows A, B, C, D, F labels
- ✅ Line is blue (#667eea) with gradient fill
- ✅ Tooltip shows "Grade: A (4/4)" format
- ✅ Responsive on mobile and desktop
- ✅ No console errors
- ✅ Grade Distribution still works (Chart.js)

**🎉 If Phase 1 works, you've successfully set up Recharts! Continue to Phase 2.**

---

## Phase 2: Complete GradeCharts Migration

**Goal**: Replace the Grade Distribution doughnut chart with Recharts.

### Step 2.1: Create Grade Distribution Chart Component

**File**: `src/components/charts/GradeDistributionChart.tsx` (NEW)

```typescript
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Props {
  distributionData: {
    A: number;
    B: number;
  };
  totalReports: number;
}

export default function GradeDistributionChart({ distributionData, totalReports }: Props) {
  const data = [
    { name: 'A', value: distributionData.A, color: '#667eea' },
    { name: 'B', value: distributionData.B, color: '#f093fb' },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0];
      const percent = ((value / totalReports) * 100).toFixed(0);
      return (
        <div style={{
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '8px 12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
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
          innerRadius="50%"
          outerRadius="80%"
          dataKey="value"
          isAnimationActive={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
      </PieChart>
    </ResponsiveContainer>
  );
}
```

### Step 2.2: Update GradeCharts.astro (Final)

**File**: `src/components/GradeCharts.astro`

```astro
---
import GradeTimelineChart from './charts/GradeTimelineChart';
import GradeDistributionChart from './charts/GradeDistributionChart';  // ADD THIS

// ... existing interfaces ...

const { timeline, trends } = Astro.props;
---

<div class="charts-wrapper">
  <div class="chart-card">
    <h2>Grade Timeline</h2>
    <div class="chart-container">
      <GradeTimelineChart data={timeline} client:load />
    </div>
  </div>

  <div class="chart-card">
    <h2>Grade Distribution</h2>
    <div class="chart-container" style="max-width: 400px; margin: 0 auto;">
      <!-- REPLACE canvas with: -->
      <GradeDistributionChart
        distributionData={trends.summary.overallGradeDistribution}
        totalReports={trends.summary.totalReports}
        client:load
      />
    </div>
    <div class="distribution-stats">
      <!-- ... existing stats stay the same ... -->
      <div class="dist-stat grade-a-stat">
        <span class="dist-label">A Grades</span>
        <span class="dist-value">{trends.summary.overallGradeDistribution.A}</span>
        <span class="dist-percent">{((trends.summary.overallGradeDistribution.A / trends.summary.totalReports) * 100).toFixed(0)}%</span>
      </div>
      <div class="dist-stat grade-b-stat">
        <span class="dist-label">B Grades</span>
        <span class="dist-value">{trends.summary.overallGradeDistribution.B}</span>
        <span class="dist-percent">{((trends.summary.overallGradeDistribution.B / trends.summary.totalReports) * 100).toFixed(0)}%</span>
      </div>
    </div>
  </div>
</div>

<!-- REMOVE the entire <script> block - no more Chart.js! -->

<!-- Keep existing styles -->
```

### Step 2.3: Test Phase 2

- ✅ Both charts now use Recharts (SVG)
- ✅ Grade Distribution shows donut with blue and pink
- ✅ Tooltip shows correct percentages
- ✅ No Chart.js code remains in GradeCharts.astro

**🎉 GradeCharts.astro is complete!**

---

## Phase 3: Create Components for Trends Page

### Step 3.1: Generic Horizontal Bar Chart

**File**: `src/components/charts/HorizontalBarChart.tsx` (NEW)

```typescript
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
  customTooltip?: (payload: any) => React.ReactNode;
}

export default function HorizontalBarChart({
  data,
  barColor = '#3b82f6',
  xAxisLabel,
  height = 400,
  customTooltip
}: Props) {
  const DefaultTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      if (customTooltip) {
        return <>{customTooltip(payload[0])}</>;
      }
      return (
        <div style={{
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '8px 12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
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
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 0, 0, 0.05)" />
        <XAxis
          type="number"
          label={xAxisLabel ? { value: xAxisLabel, position: 'bottom' } : undefined}
        />
        <YAxis type="category" dataKey="name" width={200} />
        <Tooltip content={<DefaultTooltip />} isAnimationActive={false} />
        <Bar dataKey="value" isAnimationActive={false}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || barColor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### Step 3.2: Behavior Timeline Chart

**File**: `src/components/charts/BehaviorTimelineChart.tsx` (NEW)

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatDateNoYear } from '../../utils/date-utils';

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
```

### Step 3.3: AI Activity Categories Chart

**File**: `src/components/charts/AIActivityCategoriesChart.tsx` (NEW)

```typescript
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
  const customTooltip = (payload: any) => {
    const { name, value } = payload.payload;
    const items = categoryItems[name] || [];
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const percent = ((value / total) * 100).toFixed(1);

    return (
      <div style={{
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '10px 12px',
        maxWidth: '300px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', fontSize: '14px' }}>{name}</p>
        <p style={{ margin: '0 0 6px 0', fontSize: '13px' }}>
          {value} instances ({percent}%)
        </p>
        {items.length > 0 && (
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {items.map((item, i) => (
              <div key={i} style={{ marginBottom: '2px' }}>• {item}</div>
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
```

### Step 3.4: AI Training Categories Chart

**File**: `src/components/charts/AITrainingCategoriesChart.tsx` (NEW)

```typescript
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

export default function AITrainingCategoriesChart({ data, categoryItems }: Props) {
  const customTooltip = (payload: any) => {
    const { name, value } = payload.payload;
    const items = categoryItems[name] || [];
    const total = data.reduce((sum, d) => sum + d.value, 0);
    const percent = ((value / total) * 100).toFixed(1);

    return (
      <div style={{
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: '4px',
        padding: '10px 12px',
        maxWidth: '300px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <p style={{ margin: '0 0 6px 0', fontWeight: 'bold', fontSize: '14px' }}>{name}</p>
        <p style={{ margin: '0 0 6px 0', fontSize: '13px' }}>
          {value} instances ({percent}%)
        </p>
        {items.length > 0 && (
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            {items.map((item, i) => (
              <div key={i} style={{ marginBottom: '2px' }}>• {item}</div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <HorizontalBarChart
      data={data}
      xAxisLabel="Number of Training Instances"
      height={350}
      customTooltip={customTooltip}
    />
  );
}
```

---

## Phase 4: Migrate trends.astro

This is the most complex phase. You'll be replacing 6 charts at once.

### Step 4.1: Transform Chart.js Data to Recharts Format

**File**: `src/pages/trends.astro`

In the frontmatter section, find where the viz JSON files are loaded and add transformation logic:

```typescript
---
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Layout from '../layouts/Layout.astro';
import GradeCharts from '../components/GradeCharts.astro';

// Import React chart components
import BehaviorTimelineChart from '../components/charts/BehaviorTimelineChart';
import HorizontalBarChart from '../components/charts/HorizontalBarChart';
import AIActivityCategoriesChart from '../components/charts/AIActivityCategoriesChart';
import AITrainingCategoriesChart from '../components/charts/AITrainingCategoriesChart';

// ... existing data loading code ...

const vizDir = join(process.cwd(), 'data', 'viz');

// Activity Frequency - Transform from Chart.js config
const activityFrequencyViz = JSON.parse(readFileSync(join(vizDir, 'activity-frequency.json'), 'utf-8'));
const activityData = activityFrequencyViz.data.labels.map((label: string, i: number) => ({
  name: label,
  value: activityFrequencyViz.data.datasets[0].data[i]
}));

// Training Frequency - Transform from Chart.js config
const trainingFrequencyViz = JSON.parse(readFileSync(join(vizDir, 'training-frequency.json'), 'utf-8'));
const trainingData = trainingFrequencyViz.data.labels.map((label: string, i: number) => ({
  name: label,
  value: trainingFrequencyViz.data.datasets[0].data[i]
}));

// Behavior Timeline - Check structure and transform if needed
const behaviorTimelineViz = JSON.parse(readFileSync(join(vizDir, 'behavior-timeline.json'), 'utf-8'));
// Assuming it has a 'timeline' property with the data array
const behaviorTimelineData = behaviorTimelineViz.timeline || behaviorTimelineViz;

// Behavior Frequency - Transform with colors
const behaviorFrequencyViz = JSON.parse(readFileSync(join(vizDir, 'behavior-frequency.json'), 'utf-8'));
const behaviorFrequencyData = behaviorFrequencyViz.data.labels.map((label: string, i: number) => ({
  name: label,
  value: behaviorFrequencyViz.data.datasets[0].data[i],
  color: behaviorFrequencyViz.data.datasets[0].backgroundColor[i]
}));

// AI Activity Categories - Transform with colors
const aiActivityViz = JSON.parse(readFileSync(join(vizDir, 'ai-activity-categories.json'), 'utf-8'));
const aiActivityData = aiActivityViz.data.labels.map((label: string, i: number) => ({
  name: label,
  value: aiActivityViz.data.datasets[0].data[i],
  color: aiActivityViz.data.datasets[0].backgroundColor[i]
}));

// AI Training Categories - Transform with colors
const aiTrainingViz = JSON.parse(readFileSync(join(vizDir, 'ai-training-categories.json'), 'utf-8'));
const aiTrainingData = aiTrainingViz.data.labels.map((label: string, i: number) => ({
  name: label,
  value: aiTrainingViz.data.datasets[0].data[i],
  color: aiTrainingViz.data.datasets[0].backgroundColor[i]
}));

// Load category mappings for tooltips
const activityMappings = JSON.parse(readFileSync(join(vizDir, 'learned-activity-mappings.json'), 'utf-8'));
const trainingMappings = JSON.parse(readFileSync(join(vizDir, 'learned-training-mappings.json'), 'utf-8'));
---
```

### Step 4.2: Replace Chart Canvas Elements with React Components

Find each chart section in the HTML and replace:

#### Behavior Timeline
**Replace**:
```html
<canvas id="behaviorTimelineChart" ...></canvas>
```

**With**:
```astro
<BehaviorTimelineChart data={behaviorTimelineData} client:load />
```

#### Activity Frequency
**Replace**:
```html
<canvas id="activityFrequencyChart" ...></canvas>
```

**With**:
```astro
<HorizontalBarChart
  data={activityData}
  barColor="rgba(59, 130, 246, 0.8)"
  xAxisLabel="Number of Days"
  height={400}
  client:load
/>
```

#### Training Frequency
**Replace**:
```html
<canvas id="trainingFrequencyChart" ...></canvas>
```

**With**:
```astro
<HorizontalBarChart
  data={trainingData}
  barColor="rgba(16, 185, 129, 0.8)"
  xAxisLabel="Number of Days"
  height={400}
  client:load
/>
```

#### Behavior Frequency
**Replace**:
```html
<canvas id="behaviorFrequencyChart" ...></canvas>
```

**With**:
```astro
<HorizontalBarChart
  data={behaviorFrequencyData}
  xAxisLabel="Frequency"
  height={450}
  client:load
/>
```

#### AI Activity Categories
**Replace**:
```html
<canvas id="aiActivityCategoriesChart" ...></canvas>
```

**With**:
```astro
<AIActivityCategoriesChart
  data={aiActivityData}
  categoryItems={activityMappings}
  client:load
/>
```

#### AI Training Categories
**Replace**:
```html
<canvas id="aiTrainingCategoriesChart" ...></canvas>
```

**With**:
```astro
<AITrainingCategoriesChart
  data={aiTrainingData}
  categoryItems={trainingMappings}
  client:load
/>
```

### Step 4.3: Remove Chart.js Initialization Scripts

Find and delete the large `<script>` block in trends.astro that contains all the Chart.js initialization code (it starts with `import { Chart, registerables } from 'chart.js'`).

### Step 4.4: Test Phase 4

```bash
bun run dev
```

Visit http://localhost:4321/pepper-report/trends and verify:
- ✅ All 6 charts render correctly
- ✅ Colors match the originals
- ✅ Tooltips work (especially the AI category tooltips with item lists)
- ✅ Responsive layout works
- ✅ No console errors

---

## Phase 5: Cleanup & Finalization

### Step 5.1: Remove Chart.js Dependency

```bash
bun remove chart.js
```

### Step 5.2: Verify No Chart.js Imports Remain

Search for any remaining Chart.js imports:

```bash
grep -r "from 'chart.js'" src/
```

Should return nothing.

### Step 5.3: Production Build Test

```bash
bun run build
bun run preview
```

- ✅ Build succeeds with no errors
- ✅ All charts render in production build
- ✅ Bundle size is reasonable

### Step 5.4: Deploy

Once everything works locally, deploy to GitHub Pages:

```bash
git add .
git commit -m "Migrate from Chart.js to Recharts for SVG rendering"
git push
```

---

## Color Reference

For maintaining consistency across all charts:

```typescript
// Color constants to use in your components

export const CHART_COLORS = {
  // Primary colors
  primaryBlue: '#667eea',
  primaryBlueRgba: 'rgba(102, 126, 234, 0.8)',
  lightBlue: '#3b82f6',
  lightBlueRgba: 'rgba(59, 130, 246, 0.8)',

  // Pink/Magenta
  pink: '#f093fb',
  darkPink: '#FF6B9D',

  // Green (positive behaviors)
  green: '#22c55e',
  emerald: '#00B894',
  teal: '#10b981',
  tealRgba: 'rgba(16, 185, 129, 0.8)',

  // Red (negative behaviors)
  red: '#ef4444',

  // Activity categories (7 colors)
  activityCategories: [
    '#FF6B9D', '#9B59B6', '#5DADE2', '#26A69A',
    '#FFD93D', '#FF9800', '#FF9FF3'
  ],

  // Training categories (6 colors)
  trainingCategories: [
    '#6C5CE7', '#0984E3', '#00B894', '#FDCB6E',
    '#E17055', '#FD79A8'
  ]
};
```

---

## Troubleshooting

### Issue: "window is not defined"
**Solution**: Make sure all chart components use `client:load` directive in Astro files.

### Issue: Responsive sizing not working
**Solution**: Check that ResponsiveContainer wraps the chart and parent has defined dimensions.

### Issue: Data transformation errors
**Solution**: Log the JSON structure first to understand the exact format:
```typescript
console.log(JSON.stringify(activityFrequencyViz, null, 2));
```

### Issue: Tooltips not showing
**Solution**: Ensure tooltip component is a function component that checks for `active` and `payload`.

### Issue: Build fails with TypeScript errors
**Solution**: Add proper TypeScript types to all components. Use `any` temporarily for tooltip props if needed.

---

## Summary

**Files Created** (6):
- `src/utils/date-utils.ts`
- `src/components/charts/GradeTimelineChart.tsx`
- `src/components/charts/GradeDistributionChart.tsx`
- `src/components/charts/HorizontalBarChart.tsx`
- `src/components/charts/BehaviorTimelineChart.tsx`
- `src/components/charts/AIActivityCategoriesChart.tsx`
- `src/components/charts/AITrainingCategoriesChart.tsx`

**Files Modified** (3):
- `astro.config.mjs` - Added React integration
- `src/components/GradeCharts.astro` - Replaced 2 charts
- `src/pages/trends.astro` - Replaced 6 charts

**Files Deleted** (0):
- Chart.js will be removed from package.json

**Total Charts Migrated**: 8

---

## Next Steps

Start with **Phase 1** and work through each phase sequentially. Test thoroughly after each phase before moving to the next. Take your time and feel free to customize the styling as you go!

Good luck! 🚀
