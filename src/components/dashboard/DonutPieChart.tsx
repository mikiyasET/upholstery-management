import { useState, useId } from 'react';
import { Box, Text, Group } from '@mantine/core';

export interface DonutDataItem {
  name: string;
  value: number;
  color: string;
  label?: string;
}

export interface DonutPieChartProps {
  data: DonutDataItem[];
  centerValue?: string;
  centerLabel?: string;
  valueFormatter?: (val: number) => string;
  size?: number;
  innerRadiusRatio?: number;
  showLegend?: boolean;
}

export { DonutChartSkeleton } from './ChartSkeletons';
export type { DonutChartSkeletonProps } from './ChartSkeletons';

const COLOR_MAP: Record<string, string> = {
  'amber.6': '#F59E0B',
  'blue.6': '#3B82F6',
  'teal.6': '#14B8A6',
  'emerald.6': '#10B981',
  'indigo.6': '#6366F1',
  'rose.6': '#F43F5E',
  'purple.6': '#A855F7',
  'orange.6': '#FB923C',
  'cyan.6': '#06B6D4',
};

function resolveColor(c: string): string {
  return COLOR_MAP[c] || c;
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeSlice(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
): string {
  const angle = endAngle - startAngle;
  if (angle >= 359.99) {
    return [
      describeSlice(cx, cy, innerR, outerR, 0, 180),
      describeSlice(cx, cy, innerR, outerR, 180, 360),
    ].join(' ');
  }

  const so = polarToCartesian(cx, cy, outerR, startAngle);
  const eo = polarToCartesian(cx, cy, outerR, endAngle);
  const si = polarToCartesian(cx, cy, innerR, endAngle);
  const ei = polarToCartesian(cx, cy, innerR, startAngle);

  const large = angle <= 180 ? 0 : 1;

  return [
    `M ${so.x} ${so.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${eo.x} ${eo.y}`,
    `L ${si.x} ${si.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${ei.x} ${ei.y}`,
    'Z',
  ].join(' ');
}

export function DonutPieChart({
  data,
  centerValue,
  centerLabel = 'Total',
  valueFormatter = (v) => String(v),
  size = 180,
  innerRadiusRatio = 0.68,
  showLegend = true,
}: DonutPieChartProps) {
  const chartId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = (size / 2) * 0.94;
  const innerR = outerR * innerRadiusRatio;

  // Compute slice angles with subtle gap
  let currentAngle = 0;
  const validItems = data.filter((d) => (Number(d.value) || 0) > 0);
  const hasMultiple = validItems.length > 1;
  const padAngle = hasMultiple ? 2 : 0;

  const slices = data.map((item, idx) => {
    const val = Number(item.value) || 0;
    if (val <= 0 || total === 0) {
      return { item, idx, path: '', startAngle: 0, endAngle: 0, pct: 0 };
    }

    const sliceAngle = (val / total) * 360;
    const startA = currentAngle + padAngle / 2;
    const endA = currentAngle + sliceAngle - padAngle / 2;
    currentAngle += sliceAngle;

    const path = describeSlice(cx, cy, innerR, outerR, startA, endA);
    const pct = Math.round((val / total) * 100);

    return { item, idx, path, startAngle: startA, endAngle: endA, pct };
  });

  const activeSlice = hoveredIndex !== null ? slices[hoveredIndex] : null;

  return (
    <Box className="flex flex-col items-center gap-3 w-full">
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ overflow: 'visible' }}
        >
          <defs>
            <filter id={`glow-${chartId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.35" />
            </filter>
            {data.map((d, i) => {
              const baseColor = resolveColor(d.color);
              return (
                <linearGradient
                  key={i}
                  id={`donut-grad-${chartId}-${i}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stopColor={baseColor} stopOpacity={1} />
                  <stop offset="100%" stopColor={baseColor} stopOpacity={0.8} />
                </linearGradient>
              );
            })}
          </defs>

          {total === 0 ? (
            // Empty faint ring
            <circle
              cx={cx}
              cy={cy}
              r={(outerR + innerR) / 2}
              fill="none"
              stroke="var(--surface-border, rgba(255, 255, 255, 0.1))"
              strokeWidth={outerR - innerR}
              strokeDasharray="4 4"
            />
          ) : (
            // Slices
            slices.map(({ idx, path }) => {
              if (!path) return null;
              const isHovered = hoveredIndex === idx;

              return (
                <path
                  key={idx}
                  d={path}
                  fill={`url(#donut-grad-${chartId}-${idx})`}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    transformOrigin: `${cx}px ${cy}px`,
                    transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                    filter: isHovered ? `url(#glow-${chartId})` : undefined,
                    opacity: hoveredIndex === null || isHovered ? 1 : 0.6,
                  }}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })
          )}
        </svg>

        {/* Center Text */}
        <Box
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            pointerEvents: 'none',
            padding: '0 8px',
          }}
        >
          {activeSlice && activeSlice.item ? (
            <>
              <Text size="10px" fw={700} c="dimmed" tt="uppercase" truncate style={{ maxWidth: size * 0.6 }}>
                {activeSlice.item.label || activeSlice.item.name}
              </Text>
              <Text size="sm" fw={800} mt={1} style={{ color: resolveColor(activeSlice.item.color), letterSpacing: '-0.02em' }}>
                {valueFormatter(activeSlice.item.value)}
              </Text>
              <Text size="10px" fw={600} c="dimmed">
                {activeSlice.pct}% of total
              </Text>
            </>
          ) : (
            <>
              <Text size="10px" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                {centerLabel}
              </Text>
              <Text size="xs" fw={800} mt={1} style={{ color: 'var(--primary-accent)', letterSpacing: '-0.02em' }}>
                {centerValue || valueFormatter(total)}
              </Text>
              {total > 0 && (
                <Text size="10px" c="dimmed">
                  {validItems.length} streams
                </Text>
              )}
            </>
          )}
        </Box>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="w-full flex flex-col gap-1.5 pt-1">
          {data.map((d, i) => {
            const val = Number(d.value) || 0;
            const pct = total > 0 ? Math.round((val / total) * 100) : 0;
            const isHovered = hoveredIndex === i;

            return (
              <Group
                key={i}
                justify="space-between"
                align="center"
                wrap="nowrap"
                p="4px 8px"
                className={`rounded-lg transition-colors cursor-pointer ${
                  isHovered ? 'bg-muted/60' : 'hover:bg-muted/40'
                }`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <Group gap={8} wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      backgroundColor: resolveColor(d.color),
                      flexShrink: 0,
                    }}
                  />
                  <Text size="xs" fw={isHovered ? 700 : 500} truncate>
                    {d.label || d.name}
                  </Text>
                </Group>
                <Group gap={8} wrap="nowrap" style={{ flexShrink: 0 }}>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
                    {pct}%
                  </span>
                  <Text size="xs" fw={700} style={{ minWidth: 65, textAlign: 'right' }}>
                    {valueFormatter(val)}
                  </Text>
                </Group>
              </Group>
            );
          })}
        </div>
      )}
    </Box>
  );
}
