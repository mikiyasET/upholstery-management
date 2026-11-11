import { useState, useId, useMemo } from 'react';
import { Box, Text, Group } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';

export interface ChartSeries {
  name: string;
  label: string;
  color: string;
}

export interface StackedBarChartProps {
  data: Array<Record<string, any>>;
  dataKey: string;
  series: ChartSeries[];
  valueFormatter?: (val: number) => string;
  tickFormatter?: (val: number) => string;
  h?: number | string;
}

export { StackedBarChartSkeleton } from './ChartSkeletons';
export type { StackedBarChartSkeletonProps } from './ChartSkeletons';

const COLOR_MAP: Record<string, string> = {
  'amber.6': '#F59E0B',
  'blue.6': '#3B82F6',
  'teal.6': '#14B8A6',
  'emerald.6': '#10B981',
  'indigo.6': '#6366F1',
  'rose.6': '#F43F5E',
  'purple.6': '#A855F7',
};

function resolveColor(c: string): string {
  return COLOR_MAP[c] || c;
}

export function StackedBarChart({
  data,
  dataKey,
  series,
  valueFormatter = (v) => String(v),
  tickFormatter,
  h = 280,
}: StackedBarChartProps) {
  const chartId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { ref, width: measuredWidth } = useElementSize();

  const barCount = data ? data.length : 0;
  const containerHeight = typeof h === 'number' ? h : 280;
  const svgHeight = Math.max(containerHeight - 36, 180);
  const svgWidth = Math.max(measuredWidth || 900, 300);

  const paddingLeft = 70;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;

  const plotWidth = Math.max(svgWidth - paddingLeft - paddingRight, 100);
  const plotHeight = Math.max(svgHeight - paddingTop - paddingBottom, 100);

  const slotWidth = barCount > 0 ? plotWidth / barCount : 0;
  const barWidth =
    barCount === 1
      ? 48
      : Math.min(Math.max(slotWidth * 0.68, 6), 44);

  // Determine smart label interval based on actual rendered slotWidth
  const labelIndices = useMemo(() => {
    const indices = new Set<number>();
    if (barCount <= 0) return indices;
    if (barCount === 1) {
      indices.add(0);
      return indices;
    }

    // A date label like "Oct 28" needs at least ~52px of horizontal clearance
    const minLabelDist = 52;
    const step = Math.max(1, Math.ceil(minLabelDist / Math.max(slotWidth, 1)));

    for (let i = 0; i < barCount; i += step) {
      // If the current step lands too close to the last bar, omit it so the last bar is clear
      if (barCount - 1 - i < Math.max(step * 0.65, 1.2)) continue;
      indices.add(i);
    }
    indices.add(barCount - 1);
    return indices;
  }, [barCount, slotWidth]);

  if (!data || data.length === 0) {
    return null;
  }

  // Calculate totals and max value for Y-axis scale
  const totals = data.map((d) =>
    series.reduce((sum, s) => sum + (Number(d[s.name]) || 0), 0)
  );
  const realMax = Math.max(...totals, 0);
  const maxTotal = realMax > 0 ? realMax : 1000;

  // Nice round max tick for Y-axis
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxTotal)));
  const normalized = maxTotal / magnitude;
  let niceMultiplier = 1;
  if (normalized <= 1.2) niceMultiplier = 1.2;
  else if (normalized <= 2) niceMultiplier = 2;
  else if (normalized <= 5) niceMultiplier = 5;
  else niceMultiplier = 10;
  const yMax =
    Math.ceil(maxTotal / (magnitude * (niceMultiplier / 4))) *
      (magnitude * (niceMultiplier / 4)) || maxTotal;

  const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];

  const defaultTickFormatter = (val: number) => {
    if (val === 0) return '0';
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${Math.round(val / 1000)}k`;
    return String(val);
  };

  const formatTick = tickFormatter || defaultTickFormatter;

  const hoveredItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <Box style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
      <div ref={ref} style={{ width: '100%', height: typeof h === 'number' ? `${h}px` : h, position: 'relative' }}>
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: svgHeight, overflow: 'visible', display: 'block' }}
        >
          <defs>
            {series.map((s) => {
              const baseColor = resolveColor(s.color);
              return (
                <linearGradient key={s.name} id={`grad-${chartId}-${s.name}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={baseColor} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={baseColor} stopOpacity={0.78} />
                </linearGradient>
              );
            })}
          </defs>

          {/* Grid lines & Y-axis labels */}
          {yTicks.map((tick, i) => {
            const y = paddingTop + plotHeight - (tick / yMax) * plotHeight;
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="var(--surface-border, rgba(255,255,255,0.08))"
                  strokeDasharray={i === 0 ? 'none' : '3 3'}
                  strokeWidth={1}
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10.5"
                  fill="var(--text-muted, #888)"
                  fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
                >
                  {formatTick(tick)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((item, index) => {
            const slotX = paddingLeft + index * slotWidth;
            const barX = slotX + (slotWidth - barWidth) / 2;
            const isHovered = hoveredIndex === index;
            const isLabeled = labelIndices.has(index);

            let currentY = paddingTop + plotHeight;

            return (
              <g
                key={index}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Background hover pillar */}
                <rect
                  x={slotX}
                  y={paddingTop}
                  width={slotWidth}
                  height={plotHeight}
                  fill={isHovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent'}
                  rx={6}
                  style={{ transition: 'fill 0.15s ease' }}
                />

                {/* Stacked Segments */}
                {series.map((s, sIndex) => {
                  const val = Number(item[s.name]) || 0;
                  if (val <= 0) return null;
                  const segHeight = (val / yMax) * plotHeight;
                  currentY -= segHeight;
                  const isTopSegment =
                    sIndex === series.length - 1 ||
                    series.slice(sIndex + 1).every((next) => (Number(item[next.name]) || 0) === 0);

                  return (
                    <rect
                      key={s.name}
                      x={barX}
                      y={currentY}
                      width={barWidth}
                      height={Math.max(segHeight, 2)}
                      rx={isTopSegment ? 4 : 0}
                      fill={`url(#grad-${chartId}-${s.name})`}
                      opacity={hoveredIndex === null || isHovered ? 1 : 0.65}
                      style={{
                        transition: 'opacity 0.15s ease, filter 0.15s ease',
                        filter: isHovered ? 'brightness(1.2)' : 'none',
                      }}
                    />
                  );
                })}

                {/* X-axis Label */}
                {isLabeled && (
                  <text
                    x={slotX + slotWidth / 2}
                    y={svgHeight - 10}
                    textAnchor="middle"
                    fontSize={barCount > 24 ? '9' : '10.5'}
                    fill={isHovered ? 'var(--text-main, #fff)' : 'var(--text-muted, #888)'}
                    fontWeight={isHovered ? 700 : 500}
                    fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
                  >
                    {item[dataKey]}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredItem && hoveredIndex !== null && (
          <Box
            style={{
              position: 'absolute',
              top: 6,
              left: `${Math.min(
                Math.max(((paddingLeft + hoveredIndex * slotWidth + slotWidth / 2) / svgWidth) * 100, 18),
                82
              )}%`,
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(24, 24, 27, 0.95)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 8,
              padding: '8px 12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              pointerEvents: 'none',
              zIndex: 30,
              minWidth: 170,
            }}
          >
            <Text size="xs" fw={700} c="dimmed" mb={4}>
              {hoveredItem.fullDate || hoveredItem[dataKey]}
            </Text>
            {series.map((s) => {
              const val = Number(hoveredItem[s.name]) || 0;
              return (
                <Group key={s.name} justify="space-between" gap="xs" wrap="nowrap" mt={2}>
                  <Group gap={6} align="center" wrap="nowrap">
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: resolveColor(s.color),
                        display: 'inline-block',
                      }}
                    />
                    <Text size="xs" c="dimmed">
                      {s.label}
                    </Text>
                  </Group>
                  <Text size="xs" fw={700}>
                    {valueFormatter(val)}
                  </Text>
                </Group>
              );
            })}
            <Box mt={4} pt={4} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <Group justify="space-between" gap="xs">
                <Text size="xs" fw={700}>
                  Total
                </Text>
                <Text size="xs" fw={800} style={{ color: 'var(--primary-accent, #f59e0b)' }}>
                  {valueFormatter(series.reduce((acc, s) => acc + (Number(hoveredItem[s.name]) || 0), 0))}
                </Text>
              </Group>
            </Box>
          </Box>
        )}

        {/* Legend */}
        <Group justify="center" gap="lg" mt={4} align="center">
          {series.map((s) => (
            <Group key={s.name} gap={6} align="center" wrap="nowrap">
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: resolveColor(s.color),
                  display: 'inline-block',
                }}
              />
              <Text size="xs" fw={500} c="dimmed">
                {s.label}
              </Text>
            </Group>
          ))}
        </Group>
      </div>
    </Box>
  );
}
