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
import { StackedBarChart } from './StackedBarChart';
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
    <Box className="premium-card p-6 animate-in fade-in duration-300">
      {/* 1. Header Toolbar */}
      <Group justify="space-between" align="center" mb="md" wrap="nowrap" gap="sm">
        <Box style={{ minWidth: 0, flex: '1 1 auto' }}>
          <Group gap="xs" align="center" wrap="nowrap">
            <Box
              className="stat-icon-wrapper"
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
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
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {t('dashboard.dailyStatsTitle', 'Daily Revenue & Order Volume')}
              </Title>
              <Text size="xs" c="dimmed" mt={1} truncate>
                {t('dashboard.dailyStatsSubtitle', 'Pre-stored daily performance breakdown across workshop orders & POS direct sales')}
              </Text>
            </Box>
          </Group>
        </Box>

        {/* View mode & timeframe controls - strictly on one line */}
        <Group gap="xs" wrap="nowrap" align="center" style={{ flexShrink: 0 }}>
          <SegmentedControl
            size="xs"
            radius="md"
            value={metricMode}
            onChange={setMetricMode}
            style={{ flexShrink: 0 }}
            data={[
              {
                value: 'revenue',
                label: (
                  <Group gap={4} align="center" wrap="nowrap" style={{ whiteSpace: 'nowrap' }}>
                    <DollarSign size={14} />
                    <span style={{ whiteSpace: 'nowrap' }}>{t('dashboard.metricRevenue', 'Revenue')}</span>
                  </Group>
                ),
              },
              {
                value: 'orders',
                label: (
                  <Group gap={4} align="center" wrap="nowrap" style={{ whiteSpace: 'nowrap' }}>
                    <Car size={14} />
                    <span style={{ whiteSpace: 'nowrap' }}>{t('dashboard.metricOrders', 'Orders & Jobs')}</span>
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
            style={{ flexShrink: 0 }}
            data={[
              { value: '7', label: '7D' },
              { value: '14', label: '14D' },
              { value: '30', label: '30D' },
              { value: '90', label: '90D' },
            ]}
          />
        </Group>
      </Group>

      {/* 2. Executive KPI Summary Badges Bar */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs" mb="lg">
        <Box p="xs" className="rounded-xl border border-border/60 bg-muted/20">
          <Text size="11px" fw={600} c="dimmed" tt="uppercase">
            {t('dashboard.periodTotalRevenue', 'Period Total Revenue')}
          </Text>
          <Text size="sm" fw={800} mt={2} style={{ color: 'var(--primary-accent)' }}>
            {formatCurrency(summary.totalRevenue, i18n.language as any)}
          </Text>
        </Box>

        <Box p="xs" className="rounded-xl border border-border/60 bg-muted/20">
          <Text size="11px" fw={600} c="dimmed" tt="uppercase">
            {t('dashboard.totalOrdersJobs', 'Total Orders & Jobs')}
          </Text>
          <Text size="sm" fw={800} mt={2}>
            {summary.totalOrders}{' '}
            <Text component="span" size="xs" fw={500} c="dimmed">
              {t('dashboard.recorded', 'recorded')}
            </Text>
          </Text>
        </Box>

        <Box p="xs" className="rounded-xl border border-border/60 bg-muted/20">
          <Text size="11px" fw={600} c="dimmed" tt="uppercase">
            {t('dashboard.dailyAverage', 'Daily Average')}
          </Text>
          <Text size="sm" fw={800} mt={2}>
            {formatCurrency(summary.avgDailyRevenue, i18n.language as any)}
            <Text component="span" size="10px" fw={500} c="dimmed">
              {t('dashboard.perDay', '/day')}
            </Text>
          </Text>
        </Box>

        <Box p="xs" className="rounded-xl border border-border/60 bg-muted/20">
          <Text size="11px" fw={600} c="dimmed" tt="uppercase">
            {t('dashboard.peakDay', 'Peak Day')}
          </Text>
          <Group gap={4} align="center" mt={2}>
            <Text size="sm" fw={800} truncate style={{ color: '#10b981' }}>
              {summary.peakDay
                ? `${formatShortDate(summary.peakDay.date, false, i18n.language)} (${formatCurrency(summary.peakDay.totalRevenue, i18n.language as any)})`
                : '—'}
            </Text>
            {summary.peakDay && <ArrowUpRight size={14} color="#10b981" />}
          </Group>
        </Box>
      </SimpleGrid>

      {/* 3. The BarChart */}
      {isLoading ? (
        <Skeleton height={280} radius="md" />
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
      <Group justify="space-between" align="center" mt="md" pt="xs" style={{ borderTop: '1px solid var(--surface-border-subtle, rgba(255,255,255,0.06))' }}>
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
