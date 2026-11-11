import { useId } from 'react';
import { Box, Group } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';

export interface StackedBarChartSkeletonProps {
  h?: number | string;
  barCount?: number;
}

export function StackedBarChartSkeleton({
  h = 280,
  barCount = 14,
}: StackedBarChartSkeletonProps) {
  const chartId = useId();
  const { ref, width: measuredWidth } = useElementSize();

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
    barCount === 1 ? 48 : Math.min(Math.max(slotWidth * 0.68, 6), 44);

  // Simulated realistic bar heights (% of plotHeight)
  const barRatios = [
    { amber: 0.35, blue: 0.20 },
    { amber: 0.45, blue: 0.25 },
    { amber: 0.20, blue: 0.15 },
    { amber: 0.55, blue: 0.30 },
    { amber: 0.38, blue: 0.22 },
    { amber: 0.48, blue: 0.24 },
    { amber: 0.28, blue: 0.18 },
    { amber: 0.58, blue: 0.32 },
    { amber: 0.42, blue: 0.20 },
    { amber: 0.32, blue: 0.18 },
    { amber: 0.50, blue: 0.28 },
    { amber: 0.36, blue: 0.22 },
    { amber: 0.60, blue: 0.26 },
    { amber: 0.44, blue: 0.24 },
  ];

  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <Box
      style={{
        position: 'relative',
        width: '100%',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      <div
        ref={ref}
        style={{
          width: '100%',
          height: typeof h === 'number' ? `${h}px` : h,
          position: 'relative',
        }}
      >
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{
            width: '100%',
            height: svgHeight,
            overflow: 'visible',
            display: 'block',
          }}
        >
          <defs>
            <linearGradient
              id={`skeleton-amber-${chartId}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="var(--primary-accent, #F59E0B)"
                stopOpacity="0.28"
              />
              <stop
                offset="100%"
                stopColor="var(--primary-accent, #F59E0B)"
                stopOpacity="0.12"
              />
            </linearGradient>

            <linearGradient
              id={`skeleton-blue-${chartId}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.10" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-axis placeholder ticks */}
          {yTicks.map((ratio, i) => {
            const y = paddingTop + plotHeight - ratio * plotHeight;
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="var(--surface-border-subtle, rgba(255,255,255,0.06))"
                  strokeDasharray={i === 0 ? 'none' : '3 3'}
                  strokeWidth={1}
                />
                <rect
                  x={paddingLeft - 36}
                  y={y - 4}
                  width={24}
                  height={8}
                  rx={2}
                  fill="var(--surface-border, rgba(255,255,255,0.08))"
                  opacity={0.4}
                />
              </g>
            );
          })}

          {/* Simulated Animated Bars */}
          {Array.from({ length: barCount }).map((_, index) => {
            const ratio = barRatios[index % barRatios.length];
            const slotX = paddingLeft + index * slotWidth;
            const barX = slotX + (slotWidth - barWidth) / 2;

            const amberHeight = ratio.amber * plotHeight;
            const blueHeight = ratio.blue * plotHeight;

            const amberY = paddingTop + plotHeight - amberHeight;
            const blueY = amberY - blueHeight;

            // Stagger animation timing slightly per bar
            const delay = `${(index * 0.08).toFixed(2)}s`;

            return (
              <g
                key={index}
                style={{
                  animation: 'chart-bar-pulse 2s ease-in-out infinite',
                  animationDelay: delay,
                }}
              >
                {/* Lower Amber Segment */}
                <rect
                  x={barX}
                  y={amberY}
                  width={barWidth}
                  height={Math.max(amberHeight, 2)}
                  rx={0}
                  fill={`url(#skeleton-amber-${chartId})`}
                />

                {/* Upper Blue Segment with rounded top */}
                <rect
                  x={barX}
                  y={blueY}
                  width={barWidth}
                  height={Math.max(blueHeight, 2)}
                  rx={4}
                  fill={`url(#skeleton-blue-${chartId})`}
                />

                {/* X-axis date tick placeholder */}
                {index % 2 === 0 && (
                  <rect
                    x={slotX + slotWidth * 0.2}
                    y={paddingTop + plotHeight + 10}
                    width={slotWidth * 0.6}
                    height={8}
                    rx={2}
                    fill="var(--surface-border, rgba(255,255,255,0.08))"
                    opacity={0.35}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* Legend Skeleton */}
        <Group justify="center" gap="lg" mt={4} align="center">
          <Group gap={6} align="center" wrap="nowrap">
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: 'rgba(245, 158, 11, 0.4)',
                display: 'inline-block',
              }}
            />
            <div
              style={{
                width: 70,
                height: 10,
                borderRadius: 3,
                backgroundColor: 'var(--surface-border, rgba(255,255,255,0.08))',
                opacity: 0.5,
              }}
            />
          </Group>
          <Group gap={6} align="center" wrap="nowrap">
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: 'rgba(59, 130, 246, 0.4)',
                display: 'inline-block',
              }}
            />
            <div
              style={{
                width: 65,
                height: 10,
                borderRadius: 3,
                backgroundColor: 'var(--surface-border, rgba(255,255,255,0.08))',
                opacity: 0.5,
              }}
            />
          </Group>
        </Group>
      </div>
    </Box>
  );
}

export interface DonutChartSkeletonProps {
  size?: number;
  innerRadiusRatio?: number;
  showLegend?: boolean;
}

export function DonutChartSkeleton({
  size = 155,
  innerRadiusRatio = 0.65,
  showLegend = true,
}: DonutChartSkeletonProps) {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = (size / 2) * 0.94;
  const innerR = outerR * innerRadiusRatio;
  const ringWidth = outerR - innerR;
  const centerRadius = (outerR + innerR) / 2;
  const circumference = 2 * Math.PI * centerRadius;

  return (
    <Box
      className="flex flex-col items-center justify-center w-full"
      style={{ userSelect: 'none' }}
    >
      <div
        style={{
          width: size,
          height: size,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{
            transform: 'rotate(-90deg)',
            animation: 'donut-ring-pulse 2s ease-in-out infinite',
          }}
        >
          {/* Base Background Track */}
          <circle
            cx={cx}
            cy={cy}
            r={centerRadius}
            fill="transparent"
            stroke="var(--surface-border-subtle, rgba(255,255,255,0.05))"
            strokeWidth={ringWidth}
          />

          {/* Segment 1: Amber Accent */}
          <circle
            cx={cx}
            cy={cy}
            r={centerRadius}
            fill="transparent"
            stroke="rgba(245, 158, 11, 0.35)"
            strokeWidth={ringWidth}
            strokeDasharray={`${circumference * 0.52} ${circumference * 0.48}`}
            strokeDashoffset={0}
            strokeLinecap="round"
          />

          {/* Segment 2: Blue Accent */}
          <circle
            cx={cx}
            cy={cy}
            r={centerRadius}
            fill="transparent"
            stroke="rgba(59, 130, 246, 0.30)"
            strokeWidth={ringWidth}
            strokeDasharray={`${circumference * 0.32} ${circumference * 0.68}`}
            strokeDashoffset={-circumference * 0.55}
            strokeLinecap="round"
          />

          {/* Segment 3: Green Accent */}
          <circle
            cx={cx}
            cy={cy}
            r={centerRadius}
            fill="transparent"
            stroke="rgba(16, 185, 129, 0.25)"
            strokeWidth={ringWidth}
            strokeDasharray={`${circumference * 0.10} ${circumference * 0.90}`}
            strokeDashoffset={-circumference * 0.89}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Label Placeholder */}
        <Box
          style={{
            position: 'absolute',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              width: 32,
              height: 7,
              borderRadius: 2,
              backgroundColor: 'var(--surface-border, rgba(255,255,255,0.1))',
              marginBottom: 4,
              opacity: 0.6,
            }}
          />
          <div
            style={{
              width: 48,
              height: 12,
              borderRadius: 3,
              backgroundColor: 'var(--primary-accent, rgba(245, 158, 11, 0.3))',
              opacity: 0.4,
            }}
          />
        </Box>
      </div>

      {/* Legend Skeleton */}
      {showLegend && (
        <div className="w-full flex flex-col gap-2 pt-2">
          {[0.6, 0.3, 0.1].map((_, i) => (
            <Group
              key={i}
              justify="space-between"
              align="center"
              wrap="nowrap"
              p="4px 8px"
              className="rounded-lg bg-muted/20"
            >
              <Group gap={8} wrap="nowrap" style={{ flex: 1 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    backgroundColor:
                      i === 0
                        ? 'rgba(245, 158, 11, 0.4)'
                        : i === 1
                        ? 'rgba(59, 130, 246, 0.4)'
                        : 'rgba(16, 185, 129, 0.4)',
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    width: `${60 - i * 10}px`,
                    height: 10,
                    borderRadius: 3,
                    backgroundColor: 'var(--surface-border, rgba(255,255,255,0.08))',
                    opacity: 0.5,
                  }}
                />
              </Group>
              <div
                style={{
                  width: 40,
                  height: 10,
                  borderRadius: 3,
                  backgroundColor: 'var(--surface-border, rgba(255,255,255,0.08))',
                  opacity: 0.5,
                }}
              />
            </Group>
          ))}
        </div>
      )}
    </Box>
  );
}
