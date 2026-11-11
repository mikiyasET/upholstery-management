import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Group,
  Text,
  Title,
  SegmentedControl,
  Skeleton,
  SimpleGrid,
} from '@mantine/core';
import { StackedBarChart, StackedBarChartSkeleton } from './StackedBarChart';
import {
  BarChart3,
  DollarSign,
  Car,
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import api from '../../lib/api';
import { formatCurrency, formatShortDate, formatAppDate } from '../../lib/utils';

interface DailyRevenueChartProps {
  isRefreshing?: boolean;
}

export function DailyRevenueChart({ isRefreshing }: DailyRevenueChartProps) {
  const { t, i18n } = useTranslation();
  const [timeframe, setTimeframe] = useState<string>('14');
  const [metricMode, setMetricMode] = useState<string>('revenue');

  const daysCount = parseInt(timeframe, 10) || 14;

  const { data: rawStats = [], isLoading, refetch } = useQuery({
    queryKey: ['daily-stats', daysCount],
    queryFn: async () => {
      const res = await api.get('/reports/daily-stats', {
        params: { days: daysCount },
      });
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (isRefreshing) {
      refetch();
    }
  }, [isRefreshing, refetch]);

  // Transform data for Mantine BarChart
  const chartData = useMemo(() => {
    if (!Array.isArray(rawStats)) return [];
    return rawStats.map((item: any) => ({
      ...item,
      displayDate: formatShortDate(item.date, false, i18n.language),
      fullDate: formatAppDate(item.date, false, i18n.language),
    }));
  }, [rawStats, i18n.language]);

  // Aggregated Summary Metrics
  const summary = useMemo(() => {
    if (!Array.isArray(rawStats) || rawStats.length === 0) {
      return {
        totalRevenue: 0,
        totalOrders: 0,
        avgDailyRevenue: 0,
        peakDay: null,
      };
    }

    const totalRev = rawStats.reduce((sum: number, d: any) => sum + Number(d.totalRevenue || 0), 0);
    const totalOrd = rawStats.reduce((sum: number, d: any) => sum + Number(d.totalOrders || 0), 0);
    const avgRev = Math.round(totalRev / rawStats.length);

    let maxDay = rawStats[0];
    for (const d of rawStats) {
      if (Number(d.totalRevenue || 0) > Number(maxDay.totalRevenue || 0)) {
        maxDay = d;
      }
    }

    return {
      totalRevenue: totalRev,
      totalOrders: totalOrd,
      avgDailyRevenue: avgRev,
      peakDay: maxDay && Number(maxDay.totalRevenue) > 0 ? maxDay : null,
    };
  }, [rawStats]);

  const hasAnyActivity = summary.totalRevenue > 0 || summary.totalOrders > 0;

  return (
    <Box className="premium-card p-4 sm:p-6 animate-in fade-in duration-300">
      {/* 1. Header Toolbar */}
      <Box mb="md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Title & Icon */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Box
              className="stat-icon-wrapper shrink-0"
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(245, 158, 11, 0.12)',
                color: 'var(--primary-accent)',
              }}
            >
              <BarChart3 size={20} />
            </Box>
            <Box style={{ minWidth: 0 }}>
              <Title
                order={3}
                size="h4"
                style={{
                  letterSpacing: '-0.02em',
                  fontWeight: 700,
                }}
                className="truncate"
              >
                {t('dashboard.dailyStatsTitle', 'Daily Revenue & Order Volume')}
              </Title>
              <Text size="xs" c="dimmed" mt={1} className="truncate">
                {t('dashboard.dailyStatsSubtitle', 'Pre-stored daily performance breakdown across workshop orders & POS direct sales')}
              </Text>
            </Box>
          </div>

          {/* View mode & timeframe controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto shrink-0">
            <SegmentedControl
              size="xs"
              radius="md"
              value={metricMode}
              onChange={setMetricMode}
              className="w-full sm:w-auto"
              data={[
                {
                  value: 'revenue',
                  label: (
                    <Group gap={4} justify="center" align="center" wrap="nowrap" style={{ whiteSpace: 'nowrap' }}>
                      <DollarSign size={14} />
                      <span>{t('dashboard.metricRevenue', 'Revenue')}</span>
                    </Group>
                  ),
                },
                {
                  value: 'orders',
                  label: (
                    <Group gap={4} justify="center" align="center" wrap="nowrap" style={{ whiteSpace: 'nowrap' }}>
                      <Car size={14} />
                      <span>{t('dashboard.metricOrders', 'Orders & Jobs')}</span>
                    </Group>
                  ),
                },
              ]}
            />

            <SegmentedControl
              size="xs"
              radius="md"
              value={timeframe}
              onChange={setTimeframe}
              className="w-full sm:w-auto"
              data={[
                { value: '7', label: '7D' },
                { value: '14', label: '14D' },
                { value: '30', label: '30D' },
                { value: '90', label: '90D' },
              ]}
            />
          </div>
        </div>
      </Box>

      {/* 2. Executive KPI Summary Badges Bar */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs" mb="lg">
        <Box p="xs" className="rounded-xl border border-border/60 bg-muted/20">
          <Text size="11px" fw={600} c="dimmed" tt="uppercase">
            {t('dashboard.periodTotalRevenue', 'Period Total Revenue')}
          </Text>
          {isLoading ? (
            <Skeleton height={20} width={90} mt={3} radius="sm" />
          ) : (
            <Text size="sm" fw={800} mt={2} style={{ color: 'var(--primary-accent)' }}>
              {formatCurrency(summary.totalRevenue, i18n.language as any)}
            </Text>
          )}
        </Box>

        <Box p="xs" className="rounded-xl border border-border/60 bg-muted/20">
          <Text size="11px" fw={600} c="dimmed" tt="uppercase">
            {t('dashboard.totalOrdersJobs', 'Total Orders & Jobs')}
          </Text>
          {isLoading ? (
            <Skeleton height={20} width={80} mt={3} radius="sm" />
          ) : (
            <Text size="sm" fw={800} mt={2}>
              {summary.totalOrders}{' '}
              <Text component="span" size="xs" fw={500} c="dimmed">
                {t('dashboard.recorded', 'recorded')}
              </Text>
            </Text>
          )}
        </Box>

        <Box p="xs" className="rounded-xl border border-border/60 bg-muted/20">
          <Text size="11px" fw={600} c="dimmed" tt="uppercase">
            {t('dashboard.dailyAverage', 'Daily Average')}
          </Text>
          {isLoading ? (
            <Skeleton height={20} width={85} mt={3} radius="sm" />
          ) : (
            <Text size="sm" fw={800} mt={2}>
              {formatCurrency(summary.avgDailyRevenue, i18n.language as any)}
              <Text component="span" size="10px" fw={500} c="dimmed">
                {t('dashboard.perDay', '/day')}
              </Text>
            </Text>
          )}
        </Box>

        <Box p="xs" className="rounded-xl border border-border/60 bg-muted/20">
          <Text size="11px" fw={600} c="dimmed" tt="uppercase">
            {t('dashboard.peakDay', 'Peak Day')}
          </Text>
          {isLoading ? (
            <Skeleton height={20} width={100} mt={3} radius="sm" />
          ) : (
            <Group gap={4} align="center" mt={2}>
              <Text size="sm" fw={800} truncate style={{ color: '#10b981' }}>
                {summary.peakDay
                  ? `${formatShortDate(summary.peakDay.date, false, i18n.language)} (${formatCurrency(summary.peakDay.totalRevenue, i18n.language as any)})`
                  : '—'}
              </Text>
              {summary.peakDay && <ArrowUpRight size={14} color="#10b981" />}
            </Group>
          )}
        </Box>
      </SimpleGrid>

      {/* 3. The BarChart */}
      {isLoading ? (
        <StackedBarChartSkeleton
          h={280}
          barCount={daysCount <= 7 ? 7 : daysCount <= 14 ? 14 : 20}
        />
      ) : chartData.length === 0 || !hasAnyActivity ? (
        <Box
          py="xl"
          style={{
            minHeight: 240,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            border: '1px dashed var(--surface-border)',
            borderRadius: 12,
          }}
        >
          <Box
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10,
            }}
          >
            <Calendar size={24} style={{ opacity: 0.4 }} />
          </Box>
          <Text size="sm" fw={600}>
            {t('dashboard.noDailyData', 'No revenue activity in this timeframe')}
          </Text>
          <Text size="xs" c="dimmed" mt={4} style={{ maxWidth: 380 }}>
            {t('dashboard.noDailyDataSub', 'New orders and direct POS sales are automatically stored and tracked here day-by-day.')}
          </Text>
        </Box>
      ) : (
        <Box style={{ position: 'relative' }}>
          {metricMode === 'revenue' ? (
            <StackedBarChart
              h={280}
              data={chartData}
              dataKey="displayDate"
              valueFormatter={(value) => formatCurrency(value, i18n.language as any)}
              series={[
                { name: 'orderRevenue', label: t('dashboard.chart.bayOrdersRevenue', 'Bay Orders Revenue'), color: 'amber.6' },
                { name: 'directSaleRevenue', label: t('dashboard.chart.directPosRevenue', 'Direct POS Revenue'), color: 'blue.6' },
              ]}
            />
          ) : (
            <StackedBarChart
              h={280}
              data={chartData}
              dataKey="displayDate"
              valueFormatter={(value) => `${value} ${t('dashboard.chart.jobs', 'jobs')}`}
              series={[
                { name: 'orderCount', label: t('dashboard.chart.workshopOrders', 'Workshop Orders'), color: 'amber.6' },
                { name: 'directSaleCount', label: t('dashboard.chart.directPosSales', 'Direct POS Sales'), color: 'teal.6' },
              ]}
            />
          )}
        </Box>
      )}

      {/* 4. Chart Footer Insights */}
      <Group justify="space-between" align="center" mt="md" pt="xs" wrap="wrap" gap="xs" style={{ borderTop: '1px solid var(--surface-border-subtle)' }}>
        <Group gap={6} align="center">
          <span className="pulse-dot" style={{ backgroundColor: '#f59e0b', width: 6, height: 6 }} />
          <Text size="11px" fw={600} style={{ color: 'var(--primary-accent)' }}>
            {t('dashboard.chart.storedLedger', 'Stored Pre-Aggregated Database Ledger')}
          </Text>
        </Group>
        <Text size="11px" c="dimmed">
          {t('dashboard.chart.storedLedgerSub', 'Orders & POS automatically stored on each transaction')}
        </Text>
      </Group>
    </Box>
  );
}
