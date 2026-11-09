import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { formatCurrency, formatAppDate, formatShortDate } from '../lib/utils';
import { AppDatePicker } from '../components/common/AppDatePicker';
import { toEthiopian, ethMonths } from 'amharic-datepicker-utils';
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parseISO,
  eachDayOfInterval,
  eachMonthOfInterval,
} from 'date-fns';
import {
  Box,
  Group,
  Stack,
  Title,
  Text,
  Badge,
  Tabs,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
} from '@mantine/core';
import {
  CalendarDays,
  Calendar,
  CalendarRange,
  CalendarClock,
  Clock,
  History,
  BarChart3,
  Archive,
  DollarSign,
  Wrench,
  User,
  Store,
  TrendingUp,
  PieChart,
} from 'lucide-react';
import { PageHeader } from '../components/common';
import { StackedBarChart } from '../components/dashboard/StackedBarChart';
import { DonutPieChart } from '../components/dashboard/DonutPieChart';

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all' | 'custom';

const SERVICE_DONUT_COLORS = ['#a855f7', '#6366f1', '#ec4899', '#06b6d4', '#10b981'];

export default function Reports() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [activeSection, setActiveSection] = useState<string | null>('all');
  const [customStart, setCustomStart] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isSingleDayMode, setIsSingleDayMode] = useState<boolean>(false);

  const getLocName = useCallback((item: any) => {
    if (!item) return '';
    if (i18n.language === 'am' && item.nameAm) return item.nameAm;
    return item.nameEn || item.name || '';
  }, [i18n.language]);

  const getLocMaterialName = useCallback((item: any) => {
    if (!item) return '';
    if (i18n.language === 'am' && item.materialNameAm) return item.materialNameAm;
    return item.materialNameEn || item.materialName || '';
  }, [i18n.language]);

  const getLocalizedStoreName = (storeName: string) => {
    const norm = (storeName || '').toUpperCase();
    if (norm.includes('MAIN')) return t('reports.store.mainStore', 'MAIN STORE');
    if (norm.includes('MINI')) return t('reports.store.miniStore', 'MINI STORE');
    return `${storeName} ${t('common.store', 'STORE')}`;
  };

  const getDateParams = () => {
    const today = new Date();
    switch (datePreset) {
      case 'today':
        return {
          startDate: startOfDay(today).toISOString(),
          endDate: endOfDay(today).toISOString(),
          group: 'day',
        };
      case 'yesterday': {
        const yesterday = subDays(today, 1);
        return {
          startDate: startOfDay(yesterday).toISOString(),
          endDate: endOfDay(yesterday).toISOString(),
          group: 'day',
        };
      }
      case 'week':
        return {
          startDate: startOfDay(subDays(today, 6)).toISOString(),
          endDate: endOfDay(today).toISOString(),
          group: 'day',
        };
      case 'month':
        return {
          startDate: startOfDay(startOfMonth(today)).toISOString(),
          endDate: endOfDay(endOfMonth(today)).toISOString(),
          group: 'day',
        };
      case 'year':
        return {
          startDate: startOfDay(startOfYear(today)).toISOString(),
          endDate: endOfDay(endOfYear(today)).toISOString(),
          group: 'month',
        };
      case 'custom':
        if (customStart && customEnd) {
          const s = parseISO(customStart);
          const e = parseISO(customEnd);
          return {
            startDate: startOfDay(s).toISOString(),
            endDate: endOfDay(e).toISOString(),
            group: 'day',
          };
        }
        return {};
      case 'all':
      default:
        return {
          group: 'month',
        };
    }
  };

  const params = getDateParams();

  // Queries
  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: ['reports', 'revenue', params],
    queryFn: async () => (await api.get('/reports/revenue', { params })).data,
  });

  const { data: topServices, isLoading: servicesLoading } = useQuery({
    queryKey: ['reports', 'top-services', params],
    queryFn: async () => (await api.get('/reports/top-services', { params })).data,
  });

  const { data: topMaterials, isLoading: materialsLoading } = useQuery({
    queryKey: ['reports', 'top-materials', params],
    queryFn: async () => (await api.get('/reports/top-materials', { params })).data,
  });

  const { data: stockValuation, isLoading: valuationLoading } = useQuery({
    queryKey: ['reports', 'inventory-valuation'],
    queryFn: async () => (await api.get('/reports/inventory-valuation')).data,
  });

  const { data: staffWorkload, isLoading: staffLoading } = useQuery({
    queryKey: ['reports', 'staff-workload', params],
    queryFn: async () => (await api.get('/reports/staff-workload', { params })).data,
  });

  const isAnyLoading = revenueLoading || servicesLoading || materialsLoading || valuationLoading || staffLoading;

  // Calculate totals
  const totalOrderRevenue = useMemo(() => {
    return revenue?.reduce((sum: number, item: any) => sum + (Number(item.orderRevenue) || 0), 0) || 0;
  }, [revenue]);

  const totalDirectSaleRevenue = useMemo(() => {
    return revenue?.reduce((sum: number, item: any) => sum + (Number(item.directSaleRevenue) || 0), 0) || 0;
  }, [revenue]);

  const totalRevenue = totalOrderRevenue + totalDirectSaleRevenue;
  const totalValuation = stockValuation?.summary?.reduce((sum: number, item: any) => sum + item.totalValue, 0) || 0;
  const topServiceCount = topServices?.[0]?.count || 0;

  // Transform and fill timeline data for StackedBarChart
  const chartData = useMemo(() => {
    if (!Array.isArray(revenue)) return [];

    const rawMap = new Map<string, any>();
    for (const item of revenue) {
      if (item && item.date) {
        rawMap.set(item.date, item);
      }
    }

    const today = new Date();

    if (datePreset === 'week') {
      const interval = eachDayOfInterval({
        start: startOfDay(subDays(today, 6)),
        end: endOfDay(today),
      });
      return interval.map((d) => {
        const key = format(d, 'yyyy-MM-dd');
        const found = rawMap.get(key) || { orderRevenue: 0, directSaleRevenue: 0 };
        return {
          date: key,
          orderRevenue: Number(found.orderRevenue || 0),
          directSaleRevenue: Number(found.directSaleRevenue || 0),
          displayDate: formatShortDate(d, false, i18n.language),
          fullDate: formatAppDate(d, false, i18n.language),
        };
      });
    }

    if (datePreset === 'month') {
      const interval = eachDayOfInterval({
        start: startOfDay(startOfMonth(today)),
        end: endOfDay(today),
      });
      return interval.map((d) => {
        const key = format(d, 'yyyy-MM-dd');
        const found = rawMap.get(key) || { orderRevenue: 0, directSaleRevenue: 0 };
        return {
          date: key,
          orderRevenue: Number(found.orderRevenue || 0),
          directSaleRevenue: Number(found.directSaleRevenue || 0),
          displayDate: formatShortDate(d, false, i18n.language),
          fullDate: formatAppDate(d, false, i18n.language),
        };
      });
    }

    if (datePreset === 'year') {
      const interval = eachMonthOfInterval({
        start: startOfYear(today),
        end: today,
      });
      return interval.map((d) => {
        const key = format(d, 'yyyy-MM');
        const found = rawMap.get(key) || { orderRevenue: 0, directSaleRevenue: 0 };
        let monthLabel = format(d, 'MMM');
        if (i18n.language === 'am') {
          const eth = toEthiopian(d.getFullYear(), d.getMonth() + 1, d.getDate());
          monthLabel = ethMonths[eth.month - 1] || monthLabel;
        }
        return {
          date: key,
          orderRevenue: Number(found.orderRevenue || 0),
          directSaleRevenue: Number(found.directSaleRevenue || 0),
          displayDate: monthLabel,
          fullDate: formatAppDate(d, false, i18n.language),
        };
      });
    }

    if (datePreset === 'custom' && customStart && customEnd) {
      try {
        const s = parseISO(customStart);
        const e = parseISO(customEnd);
        const diffDays = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 45) {
          const interval = eachDayOfInterval({ start: s, end: e });
          return interval.map((d) => {
            const key = format(d, 'yyyy-MM-dd');
            const found = rawMap.get(key) || { orderRevenue: 0, directSaleRevenue: 0 };
            return {
              date: key,
              orderRevenue: Number(found.orderRevenue || 0),
              directSaleRevenue: Number(found.directSaleRevenue || 0),
              displayDate: formatShortDate(d, false, i18n.language),
              fullDate: formatAppDate(d, false, i18n.language),
            };
          });
        }
      } catch {
        // Fallback to raw map
      }
    }

    if (revenue.length === 0) {
      if (datePreset === 'today') {
        return [
          {
            date: format(today, 'yyyy-MM-dd'),
            orderRevenue: 0,
            directSaleRevenue: 0,
            displayDate: t('reports.timeframe.today', 'Today'),
            fullDate: formatAppDate(today, false, i18n.language),
          },
        ];
      }
      if (datePreset === 'yesterday') {
        const y = subDays(today, 1);
        return [
          {
            date: format(y, 'yyyy-MM-dd'),
            orderRevenue: 0,
            directSaleRevenue: 0,
            displayDate: t('reports.timeframe.yesterday', 'Yesterday'),
            fullDate: formatAppDate(y, false, i18n.language),
          },
        ];
      }
      return [];
    }

    return revenue.map((item: any) => {
      let displayDate = item.date;
      let fullDate = item.date;
      try {
        if (item.date.length === 7) {
          const parsed = parseISO(`${item.date}-01`);
          displayDate = formatShortDate(parsed, false, i18n.language);
          fullDate = formatAppDate(parsed, false, i18n.language);
        } else if (item.date.length === 10) {
          const parsed = parseISO(item.date);
          displayDate = formatShortDate(parsed, false, i18n.language);
          fullDate = formatAppDate(parsed, false, i18n.language);
        }
      } catch {}

      return {
        ...item,
        orderRevenue: Number(item.orderRevenue || 0),
        directSaleRevenue: Number(item.directSaleRevenue || 0),
        displayDate,
        fullDate,
      };
    });
  }, [revenue, datePreset, customStart, customEnd, i18n.language]);

  const hasRevenueActivity = chartData.some(
    (item: any) => item.orderRevenue > 0 || item.directSaleRevenue > 0
  );

  // Distribution of revenue streams for Donut Chart
  const revenueStreamData = useMemo(() => {
    return [
      {
        name: t('reports.chart.orders', 'Work Orders'),
        value: totalOrderRevenue,
        color: '#f59e0b',
      },
      {
        name: t('reports.chart.pos', 'Direct POS Sales'),
        value: totalDirectSaleRevenue,
        color: '#3b82f6',
      },
    ];
  }, [totalOrderRevenue, totalDirectSaleRevenue, t]);

  // Top services distribution for Donut Chart
  const serviceDonutData = useMemo(() => {
    if (!Array.isArray(topServices) || topServices.length === 0) return [];
    const top4 = topServices.slice(0, 4);
    const top4Sum = top4.reduce((acc: number, s: any) => acc + (Number(s.revenue) || 0), 0);
    const allSum = topServices.reduce((acc: number, s: any) => acc + (Number(s.revenue) || 0), 0);
    const otherSum = Math.max(0, allSum - top4Sum);

    const slices = top4.map((s: any, idx: number) => ({
      name: getLocName(s),
      value: Number(s.revenue) || 0,
      color: SERVICE_DONUT_COLORS[idx % SERVICE_DONUT_COLORS.length],
    }));

    if (otherSum > 0 && topServices.length > 4) {
      slices.push({
        name: t('common.other', 'Other Services'),
        value: otherSum,
        color: '#64748b',
      });
    }

    return slices;
  }, [topServices, getLocName, t]);

  const totalServiceRevenue = useMemo(() => {
    return topServices?.reduce((sum: number, s: any) => sum + (Number(s.revenue) || 0), 0) || 0;
  }, [topServices]);

  // Performance highlights (Daily average, peak day, dominant stream)
  const performanceStats = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return {
        peakDay: null as any,
        avgDailyRevenue: 0,
        activeDaysCount: 0,
        dominantStream: '—',
        topStreamPercent: 0,
      };
    }

    let maxDay: any = null;
    let maxVal = -1;
    let activeDays = 0;

    for (const item of chartData) {
      const dayTotal = (Number(item.orderRevenue) || 0) + (Number(item.directSaleRevenue) || 0);
      if (dayTotal > 0) activeDays++;
      if (dayTotal > maxVal) {
        maxVal = dayTotal;
        maxDay = item;
      }
    }

    const divisor = chartData.length > 0 ? chartData.length : 1;
    const avgDailyRevenue = totalRevenue / divisor;

    const dominantStream =
      totalOrderRevenue >= totalDirectSaleRevenue
        ? t('reports.chart.orders', 'Work Orders')
        : t('reports.chart.pos', 'Direct Sales');

    const topStreamPercent =
      totalRevenue > 0
        ? Math.round((Math.max(totalOrderRevenue, totalDirectSaleRevenue) / totalRevenue) * 100)
        : 0;

    return {
      peakDay: maxDay && maxVal > 0 ? { ...maxDay, total: maxVal } : null,
      avgDailyRevenue,
      activeDaysCount: activeDays,
      dominantStream,
      topStreamPercent,
    };
  }, [chartData, totalRevenue, totalOrderRevenue, totalDirectSaleRevenue, t]);

  // Human-readable formatted period display
  const getPeriodDisplay = () => {
    const today = new Date();
    if (datePreset === 'today') return formatAppDate(today, false, i18n.language);
    if (datePreset === 'yesterday') return formatAppDate(subDays(today, 1), false, i18n.language);
    if (datePreset === 'week') return `${formatShortDate(subDays(today, 6), false, i18n.language)} – ${formatAppDate(today, false, i18n.language)}`;
    if (datePreset === 'month') return formatAppDate(today, false, i18n.language);
    if (datePreset === 'year') {
      if (i18n.language === 'am') {
        const eth = toEthiopian(today.getFullYear(), today.getMonth() + 1, today.getDate());
        return `${eth.year} ዓ.ም`;
      }
      return format(today, 'yyyy');
    }
    if (datePreset === 'all') return t('reports.timeframe.all', 'All Historical Records');
    if (datePreset === 'custom') {
      if (isSingleDayMode && customStart) {
        try {
          return formatAppDate(parseISO(customStart), false, i18n.language);
        } catch {
          return customStart;
        }
      }
      if (customStart && customEnd) {
        try {
          return `${formatAppDate(parseISO(customStart), false, i18n.language)} – ${formatAppDate(parseISO(customEnd), false, i18n.language)}`;
        } catch {
          return `${customStart} – ${customEnd}`;
        }
      }
      return t('reports.timeframe.custom', 'Custom Range');
    }
    return '';
  };

  return (
    <Stack gap="md" pb="xl" className="animate-in fade-in duration-300">
      {/* 1. Page Header */}
      <PageHeader
        title={t('reports.title', 'Reports & Analytics')}
        subtitle={t('reports.subtitle', 'Real-time financial performance, workload distribution, and store valuations')}
        hideSubtitleOnMobile
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['reports'] });
        }}
        isRefreshing={isAnyLoading}
      />

      {/* 2. Executive Timeframe Switcher Tabs (Low-profile Luxury Pill Bar) */}
      <Box className="premium-card p-2 sm:p-2.5">
        <Tabs
          value={datePreset}
          onChange={(v) => v && setDatePreset(v as DatePreset)}
          variant="pills"
          radius="md"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <div className="overflow-x-auto no-scrollbar scrollbar-none -mx-0.5 px-0.5 min-w-0 flex-1">
              <Tabs.List style={{ gap: 4, flexWrap: 'nowrap' }} className="flex-nowrap">
                <Tabs.Tab
                  value="today"
                  leftSection={<Clock size={13} />}
                  className="whitespace-nowrap shrink-0"
                  style={{ height: 30, padding: '0 10px', fontSize: '12px' }}
                >
                  {t('reports.timeframe.today', 'Today')}
                </Tabs.Tab>
                <Tabs.Tab
                  value="yesterday"
                  leftSection={<History size={13} />}
                  className="whitespace-nowrap shrink-0"
                  style={{ height: 30, padding: '0 10px', fontSize: '12px' }}
                >
                  {t('reports.timeframe.yesterday', 'Yesterday')}
                </Tabs.Tab>
                <Tabs.Tab
                  value="week"
                  leftSection={<Calendar size={13} />}
                  className="whitespace-nowrap shrink-0"
                  style={{ height: 30, padding: '0 10px', fontSize: '12px' }}
                >
                  {t('reports.timeframe.week', 'Last 7 Days')}
                </Tabs.Tab>
                <Tabs.Tab
                  value="month"
                  leftSection={<CalendarRange size={13} />}
                  className="whitespace-nowrap shrink-0"
                  style={{ height: 30, padding: '0 10px', fontSize: '12px' }}
                >
                  {t('reports.timeframe.month', 'This Month')}
                </Tabs.Tab>
                <Tabs.Tab
                  value="year"
                  leftSection={<BarChart3 size={13} />}
                  className="whitespace-nowrap shrink-0"
                  style={{ height: 30, padding: '0 10px', fontSize: '12px' }}
                >
                  {t('reports.timeframe.year', 'This Year')}
                </Tabs.Tab>
                <Tabs.Tab
                  value="all"
                  leftSection={<Archive size={13} />}
                  className="whitespace-nowrap shrink-0"
                  style={{ height: 30, padding: '0 10px', fontSize: '12px' }}
                >
                  {t('reports.timeframe.all', 'All Time')}
                </Tabs.Tab>
                <Tabs.Tab
                  value="custom"
                  leftSection={<CalendarClock size={13} />}
                  className="whitespace-nowrap shrink-0"
                  style={{ height: 30, padding: '0 10px', fontSize: '12px' }}
                >
                  {t('reports.timeframe.custom', 'Custom Range')}
                </Tabs.Tab>
              </Tabs.List>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-[var(--surface-border-subtle)]">
              <span className="text-[11px] font-medium text-muted-foreground sm:hidden">
                {t('reports.kpi.forPeriod', 'Selected Period')}:
              </span>
              <Badge
                size="md"
                radius="md"
                variant="light"
                color="amber"
                leftSection={<CalendarDays size={13} />}
                style={{ fontWeight: 600, textTransform: 'none', fontSize: '0.78rem', height: 26 }}
              >
                {getPeriodDisplay()}
              </Badge>
            </div>
          </div>
        </Tabs>

        {/* Custom Range Expansion Panel */}
        {datePreset === 'custom' && (
          <Box
            mt="xs"
            pt="xs"
            className="animate-in fade-in duration-200"
            style={{
              borderTop: '1px solid var(--surface-border-subtle)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full sm:w-auto">
                <SegmentedControl
                  size="xs"
                  radius="md"
                  className="w-full sm:w-auto shrink-0"
                  value={isSingleDayMode ? 'single' : 'range'}
                  onChange={(val) => {
                    const isSingle = val === 'single';
                    setIsSingleDayMode(isSingle);
                    if (isSingle) setCustomEnd(customStart);
                  }}
                  data={[
                    { value: 'range', label: t('reports.timeframe.dateRange', 'Date Range') },
                    { value: 'single', label: t('reports.timeframe.singleDay', 'Single Day') },
                  ]}
                />

                {isSingleDayMode ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Text size="xs" fw={600} c="dimmed" className="shrink-0">
                      {t('reports.timeframe.selectSingleDay', 'Date')}:
                    </Text>
                    <div className="flex-1 sm:w-44">
                      <AppDatePicker
                        value={customStart ? parseISO(customStart) : null}
                        onChange={(_d, str) => {
                          if (str) {
                            setCustomStart(str);
                            setCustomEnd(str);
                          }
                        }}
                        clearable={false}
                        size="small"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <Text size="xs" fw={600} c="dimmed" className="shrink-0 w-10 sm:w-auto">
                        {t('reports.timeframe.from', 'From')}:
                      </Text>
                      <div className="flex-1 sm:w-40">
                        <AppDatePicker
                          value={customStart ? parseISO(customStart) : null}
                          onChange={(_d, str) => {
                            if (str) setCustomStart(str);
                          }}
                          clearable={false}
                          size="small"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Text size="xs" fw={600} c="dimmed" className="shrink-0 w-10 sm:w-auto">
                        {t('reports.timeframe.to', 'To')}:
                      </Text>
                      <div className="flex-1 sm:w-40">
                        <AppDatePicker
                          value={customEnd ? parseISO(customEnd) : null}
                          onChange={(_d, str) => {
                            if (str) setCustomEnd(str);
                          }}
                          clearable={false}
                          size="small"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Text size="11px" c="dimmed" className="hidden lg:block shrink-0">
                {t('reports.timeframe.rangeAutoApplied', 'Range applied automatically to all charts')}
              </Text>
            </div>
          </Box>
        )}
      </Box>

      {/* 3. Top Metric KPI Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Total Revenue */}
        <Box className="premium-card" p="md">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                {t('reports.kpi.totalRevenue', 'Total Revenue')}
              </Text>
              <Text fw={700} size="1.45rem" lh={1.1} mt={4} style={{ letterSpacing: '-0.02em', color: 'var(--primary-accent)' }}>
                {formatCurrency(totalRevenue, i18n.language as any)}
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: 'rgba(245, 158, 11, 0.12)',
                color: 'var(--primary-accent)',
              }}
            >
              <DollarSign size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" style={{ borderTop: '1px solid var(--surface-border-subtle)' }}>
            <Group gap={4}>
              <span className="pulse-dot" style={{ backgroundColor: '#f59e0b', width: 5, height: 5 }} />
              <Text size="11px" fw={600} style={{ color: 'var(--primary-accent)' }}>
                {t('reports.kpi.forPeriod', 'Selected Period')}
              </Text>
            </Group>
            <Text size="11px" c="dimmed">
              {t('reports.kpi.ordersAndPos', 'Orders & POS')}
            </Text>
          </Group>
        </Box>

        {/* Stock Valuation */}
        <Box className="premium-card" p="md">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                {t('reports.kpi.stockValuation', 'Stock Valuation')}
              </Text>
              <Text fw={700} size="1.45rem" lh={1.1} mt={4} style={{ letterSpacing: '-0.02em' }}>
                {formatCurrency(totalValuation, i18n.language as any)}
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#3b82f6',
              }}
            >
              <Archive size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" style={{ borderTop: '1px solid var(--surface-border-subtle)' }}>
            <Text size="11px" fw={600} style={{ color: '#3b82f6' }}>
              {t('reports.kpi.dualStorageHubs', 'Dual Storage Hubs')}
            </Text>
            <Text size="11px" c="dimmed">
              {t('reports.kpi.currentInventory', 'Current inventory')}
            </Text>
          </Group>
        </Box>

        {/* Top Service Sales */}
        <Box className="premium-card" p="md">
          <Group justify="space-between" align="flex-start">
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }} truncate>
                {t('reports.kpi.topServiceSales', 'Top Service Demand')}
              </Text>
              <Text fw={700} size="1.45rem" lh={1.1} mt={4} style={{ letterSpacing: '-0.02em' }}>
                {topServiceCount}{' '}
                <Text component="span" size="sm" fw={500} c="dimmed">
                  {t('reports.kpi.jobs', 'jobs')}
                </Text>
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: "rgba(168, 85, 247, 0.12)",
                color: "#a855f7",
              }}
            >
              <Wrench size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" style={{ borderTop: "1px solid var(--surface-border-subtle)" }}>
            <Text size="11px" fw={600} style={{ color: "#a855f7" }} truncate>
              {getLocName(topServices?.[0]) || t("reports.kpi.noRecords", "No records")}
            </Text>
            <Text size="11px" c="dimmed" style={{ flexShrink: 0 }}>
              {t("reports.kpi.leadingService", "Leading service")}
            </Text>
          </Group>
        </Box>

        {/* Active Staff */}
        <Box className="premium-card" p="md">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                {t('reports.kpi.activeStaff', 'Active Staff')}
              </Text>
              <Text fw={700} size="1.45rem" lh={1.1} mt={4} style={{ letterSpacing: '-0.02em' }}>
                {staffWorkload?.length || 0}{' '}
                <Text component="span" size="sm" fw={500} c="dimmed">
                  {t('reports.kpi.members', 'members')}
                </Text>
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
              }}
            >
              <User size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" style={{ borderTop: "1px solid var(--surface-border-subtle)" }}>
            <Text size="11px" fw={600} style={{ color: "#10b981" }}>
              {t("reports.kpi.workshopOperations", "Workshop operations")}
            </Text>
            <Text size="11px" c="dimmed">
              {t("reports.kpi.involvedInOrders", "Involved in orders")}
            </Text>
          </Group>
        </Box>
      </SimpleGrid>

      {/* 4. Section Switcher Tabs (Unified Analytics Hub) */}
      <Tabs value={activeSection} onChange={setActiveSection} variant="pills" radius="md">
        <div className="overflow-x-auto no-scrollbar scrollbar-none -mx-1 px-1 sm:mx-0 sm:px-0 mb-3 sm:mb-4">
          <Tabs.List style={{ gap: 6, flexWrap: "nowrap" }} className="flex-nowrap">
            <Tabs.Tab
              value="all"
              leftSection={<BarChart3 size={15} />}
              className="whitespace-nowrap shrink-0"
              style={{ height: 32, padding: "0 12px", fontSize: "12px" }}
            >
              {t("reports.sections.all", "All Reports & Charts")}
            </Tabs.Tab>
            <Tabs.Tab
              value="revenue"
              leftSection={<DollarSign size={15} />}
              className="whitespace-nowrap shrink-0"
              style={{ height: 32, padding: "0 12px", fontSize: "12px" }}
            >
              {t("reports.sections.revenue", "Revenue Trend")}
            </Tabs.Tab>
            <Tabs.Tab
              value="services"
              leftSection={<Wrench size={15} />}
              className="whitespace-nowrap shrink-0"
              style={{ height: 32, padding: "0 12px", fontSize: "12px" }}
            >
              {t("reports.sections.services", "Top Services & Items")}
            </Tabs.Tab>
            <Tabs.Tab
              value="staff"
              leftSection={<User size={15} />}
              className="whitespace-nowrap shrink-0"
              style={{ height: 32, padding: "0 12px", fontSize: "12px" }}
            >
              {t("reports.sections.staff", "Staff Workload")}
            </Tabs.Tab>
            <Tabs.Tab
              value="inventory"
              leftSection={<Store size={15} />}
              className="whitespace-nowrap shrink-0"
              style={{ height: 32, padding: "0 12px", fontSize: "12px" }}
            >
              {t("reports.sections.inventory", "Store Valuations")}
            </Tabs.Tab>
          </Tabs.List>
        </div>

        {/* SECTION 1: REVENUE TREND & FINANCIAL BREAKDOWN (Full-width) */}
        {(activeSection === 'all' || activeSection === 'revenue') && (
          <Box className="premium-card p-4 sm:p-6 mb-4 sm:mb-6">
            <Group justify="space-between" align="flex-start" mb="md" wrap="wrap" gap="sm">
              <Box>
                <Title order={4} style={{ letterSpacing: '-0.01em', fontWeight: 700 }}>
                  {t('reports.charts.revenueTrend', 'Revenue Trend & Breakdown')}
                </Title>
                <Text size="xs" c="dimmed" mt={2} className="hidden sm:block">
                  {t('reports.charts.revenueTrendSubtitle', 'Combined work orders and counter point-of-sale collections over time')}
                </Text>
              </Box>
              <Group gap="xs" wrap="wrap" className="w-full sm:w-auto">
                <Badge variant="light" color="amber" size="sm" radius="md">
                  {t('reports.chart.orders', 'Orders')}: {formatCurrency(totalOrderRevenue, i18n.language as any)}
                </Badge>
                <Badge variant="light" color="blue" size="sm" radius="md">
                  {t('reports.chart.pos', 'POS')}: {formatCurrency(totalDirectSaleRevenue, i18n.language as any)}
                </Badge>
                <Badge variant="filled" color="amber" size="sm" radius="md" style={{ fontWeight: 700 }}>
                  {t('reports.chart.total', 'Total')}: {formatCurrency(totalRevenue, i18n.language as any)}
                </Badge>
              </Group>
            </Group>

            {/* Stacked Bar Chart */}
            {revenueLoading ? (
              <Skeleton height={270} radius="md" />
            ) : !hasRevenueActivity && chartData.length === 0 ? (
              <Box
                py="xl"
                style={{
                  minHeight: 250,
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
                  <BarChart3 size={24} style={{ opacity: 0.4 }} />
                </Box>
                <Text size="sm" fw={600}>
                  {t('reports.charts.noRevenue', 'No revenue recorded for this period.')}
                </Text>
                <Text size="xs" c="dimmed" mt={4} style={{ maxWidth: 360 }}>
                  {t('reports.charts.noRevenueSub', 'Transactions from completed work orders and direct sales will appear here once recorded.')}
                </Text>
              </Box>
            ) : (
              <Box style={{ position: 'relative', width: '100%', overflowX: 'auto' }} className="no-scrollbar">
                <StackedBarChart
                  h={265}
                  data={chartData}
                  dataKey="displayDate"
                  valueFormatter={(value) => formatCurrency(value, i18n.language as any)}
                  tickFormatter={(val) => (val === 0 ? '0' : val >= 1000 ? `${Math.round(val / 1000)}k` : `${val}`)}
                  series={[
                    { name: 'orderRevenue', label: t('reports.chart.orders', 'Work Orders'), color: 'amber.6' },
                    { name: 'directSaleRevenue', label: t('reports.chart.pos', 'Direct Sales'), color: 'blue.6' },
                  ]}
                />
              </Box>
            )}

            {/* Subtle Divider */}
            <Box
              my="lg"
              style={{
                borderTop: '1px solid var(--surface-border-subtle)',
              }}
            />

            {/* Lower Analytics Section: 2 Donut Charts + Performance Highlights Card */}
            <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
              {/* Card 1: Revenue Stream Distribution */}
              <Box
                p="md"
                className="rounded-xl flex flex-col justify-between"
                style={{
                  backgroundColor: 'var(--surface-bg)',
                  border: '1px solid var(--surface-border)',
                }}
              >
                <div>
                  <Group justify="space-between" align="center" mb="sm">
                    <Group gap={6} align="center">
                      <PieChart size={15} style={{ color: 'var(--primary-accent)' }} />
                      <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                        {t('reports.charts.streamShare', 'Revenue Stream Share')}
                      </Text>
                    </Group>
                    <Badge size="xs" variant="outline" color="amber">
                      {totalRevenue > 0 ? t('common.active', 'Active') : t('reports.charts.noData', 'No Data')}
                    </Badge>
                  </Group>
                  <Text size="11px" c="dimmed" mb="md">
                    {t('reports.charts.streamShareDesc', 'Proportion of work order revenue vs over-the-counter retail sales')}
                  </Text>
                </div>

                <DonutPieChart
                  data={revenueStreamData}
                  size={155}
                  innerRadiusRatio={0.65}
                  valueFormatter={(v) => formatCurrency(v, i18n.language as any)}
                  centerLabel={t('reports.chart.total', 'Total')}
                  centerValue={formatCurrency(totalRevenue, i18n.language as any)}
                />
              </Box>

              {/* Card 2: Top Services Revenue Share */}
              <Box
                p="md"
                className="rounded-xl flex flex-col justify-between"
                style={{
                  backgroundColor: 'var(--surface-bg)',
                  border: '1px solid var(--surface-border)',
                }}
              >
                <div>
                  <Group justify="space-between" align="center" mb="sm">
                    <Group gap={6} align="center">
                      <Wrench size={15} style={{ color: '#a855f7' }} />
                      <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                        {t('reports.charts.serviceShare', 'Services Revenue Share')}
                      </Text>
                    </Group>
                    <Badge size="xs" variant="outline" color="purple">
                      {topServices?.length || 0} {t('common.services', 'Services')}
                    </Badge>
                  </Group>
                  <Text size="11px" c="dimmed" mb="md">
                    {t('reports.charts.serviceShareDesc', 'Top service categories contributing to workshop earnings')}
                  </Text>
                </div>

                {servicesLoading ? (
                  <Skeleton height={155} radius="md" />
                ) : (
                  <DonutPieChart
                    data={serviceDonutData}
                    size={155}
                    innerRadiusRatio={0.65}
                    valueFormatter={(v) => formatCurrency(v, i18n.language as any)}
                    centerLabel={t('reports.charts.services', 'Services')}
                    centerValue={formatCurrency(totalServiceRevenue, i18n.language as any)}
                  />
                )}
              </Box>

              {/* Card 3: Financial Performance Highlights */}
              <Box
                p="md"
                className="rounded-xl flex flex-col justify-between"
                style={{
                  backgroundColor: 'var(--surface-bg)',
                  border: '1px solid var(--surface-border)',
                }}
              >
                <div>
                  <Group justify="space-between" align="center" mb="sm">
                    <Group gap={6} align="center">
                      <TrendingUp size={15} style={{ color: '#10b981' }} />
                      <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: '0.04em' }}>
                        {t('reports.charts.highlights', 'Performance Highlights')}
                      </Text>
                    </Group>
                    <Badge size="xs" variant="light" color="teal">
                      {t('reports.charts.summary', 'Executive')}
                    </Badge>
                  </Group>
                  <Text size="11px" c="dimmed" mb="md">
                    {t('reports.charts.highlightsDesc', 'Key momentum and throughput indicators for this period')}
                  </Text>

                  <Stack gap="xs">
                    {/* Daily Average Run-Rate */}
                    <Box p="xs" className="rounded-lg bg-card border border-border/60">
                      <Group justify="space-between" align="center">
                        <Text size="xs" c="dimmed">
                          {t('reports.charts.dailyAverage', 'Avg Daily Revenue')}:
                        </Text>
                        <Text size="xs" fw={700} style={{ color: 'var(--primary-accent)' }}>
                          {formatCurrency(performanceStats.avgDailyRevenue, i18n.language as any)}
                        </Text>
                      </Group>
                      <Text size="10px" c="dimmed" mt={2}>
                        {t('reports.charts.acrossIntervals', 'Across {{count}} monitored intervals', { count: chartData.length })}
                      </Text>
                    </Box>

                    {/* Peak Day */}
                    <Box p="xs" className="rounded-lg bg-card border border-border/60">
                      <Group justify="space-between" align="center">
                        <Text size="xs" c="dimmed">
                          {t('reports.charts.peakDay', 'Peak Day')}:
                        </Text>
                        <Text size="xs" fw={700} style={{ color: '#10b981' }}>
                          {performanceStats.peakDay
                            ? formatCurrency(performanceStats.peakDay.total, i18n.language as any)
                            : '—'}
                        </Text>
                      </Group>
                      <Text size="10px" c="dimmed" mt={2} truncate>
                        {performanceStats.peakDay?.fullDate || performanceStats.peakDay?.displayDate || t('reports.charts.noPeakRecord', 'No peak record')}
                      </Text>
                    </Box>

                    {/* Dominant Stream */}
                    <Box p="xs" className="rounded-lg bg-card border border-border/60">
                      <Group justify="space-between" align="center">
                        <Text size="xs" c="dimmed">
                          {t('reports.charts.leadStream', 'Lead Stream')}:
                        </Text>
                        <Badge size="xs" variant="filled" color={totalOrderRevenue >= totalDirectSaleRevenue ? 'amber' : 'blue'}>
                          {performanceStats.dominantStream} ({performanceStats.topStreamPercent}%)
                        </Badge>
                      </Group>
                      <Text size="10px" c="dimmed" mt={2}>
                        {t('reports.charts.primaryRevenueGenerator', 'Primary revenue generator for this period')}
                      </Text>
                    </Box>
                  </Stack>
                </div>

                <Group justify="space-between" align="center" mt="sm" pt="xs" style={{ borderTop: '1px solid var(--surface-border-subtle)' }}>
                  <Text size="10px" c="dimmed">
                    {t('reports.charts.activeDaysCount', 'Active Days: {{active}} / {{total}}', { active: performanceStats.activeDaysCount, total: chartData.length })}
                  </Text>
                  <Text size="10px" fw={600} style={{ color: 'var(--primary-accent)' }}>
                    {t('reports.charts.liveSystemAudit', 'Live System Audit')}
                  </Text>
                </Group>
              </Box>
            </SimpleGrid>

            {/* Footer Strip */}
            <Group justify="space-between" align="center" mt="md" pt="xs" style={{ borderTop: '1px solid var(--surface-border-subtle)' }}>
              <Group gap={6} align="center">
                <span className="pulse-dot" style={{ backgroundColor: '#f59e0b', width: 6, height: 6 }} />
                <Text size="11px" fw={600} style={{ color: 'var(--primary-accent)' }}>
                  {t('reports.chart.liveFinancials', 'Financial Revenue Breakdown')}
                </Text>
              </Group>
              <Text size="11px" c="dimmed">
                {t('reports.charts.intervalsPlotted', '{{count}} {{unit}} plotted', { count: chartData.length, unit: datePreset === 'year' || datePreset === 'all' ? t('reports.charts.months', 'months') : t('reports.charts.intervals', 'intervals') })}
              </Text>
            </Group>
          </Box>
        )}

        {/* SECTION 2: TOP SERVICES & STAFF WORKLOAD */}
        {activeSection === 'all' && (
          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 mb-4 sm:mb-6">
            {/* Top Performers */}
            <Box className="premium-card p-4 sm:p-6">
              <Title order={4} style={{ letterSpacing: '-0.01em', fontWeight: 700 }} mb="xs">
                {t('reports.top.title', 'Top Services & Items')}
              </Title>
              <Text size="xs" c="dimmed" mb="lg">
                {t('reports.top.subtitle', 'Highest volume services and retail products sold')}
              </Text>

              <Stack gap="lg">
                {/* Top Services */}
                <Box>
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }} mb="xs">
                    {t('common.services', 'Tailoring & Decor Services')}
                  </Text>
                  <Stack gap="xs">
                    {topServices?.slice(0, 4).map((s: any) => (
                      <Group key={s.name} justify="space-between" align="center" p="xs" className="rounded-lg bg-muted/30">
                        <Box style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                          <Text size="xs" fw={600} truncate>
                            {getLocName(s)}
                          </Text>
                          <Text size="11px" c="dimmed">
                            {t('reports.top.jobsCount', '{{count}} jobs', { count: s.count })}
                          </Text>
                        </Box>
                        <Text size="xs" fw={700} style={{ color: 'var(--primary-accent)' }}>
                          {formatCurrency(s.revenue, i18n.language as any)}
                        </Text>
                      </Group>
                    ))}
                    {topServices?.length === 0 && (
                      <Text size="xs" c="dimmed">
                        {t('reports.top.noServiceData', 'No service activity recorded.')}
                      </Text>
                    )}
                  </Stack>
                </Box>

                {/* Top Materials */}
                <Box>
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }} mb="xs">
                    {t('reports.top.materialsItems', 'Materials & Retail Items')}
                  </Text>
                  <Stack gap="xs">
                    {topMaterials?.slice(0, 4).map((m: any) => (
                      <Group key={m.name} justify="space-between" align="center" p="xs" className="rounded-lg bg-muted/30">
                        <Box style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                          <Text size="xs" fw={600} truncate>
                            {getLocName(m)}
                          </Text>
                          <Text size="11px" c="dimmed">
                            {t('reports.top.unitsSold', '{{count}} units sold', { count: m.count })}
                          </Text>
                        </Box>
                        <Text size="xs" fw={700} style={{ color: '#3b82f6' }}>
                          {formatCurrency(m.revenue, i18n.language as any)}
                        </Text>
                      </Group>
                    ))}
                    {topMaterials?.length === 0 && (
                      <Text size="xs" c="dimmed">
                        {t('reports.top.noMaterialData', 'No material consumption recorded.')}
                      </Text>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Box>

            {/* Staff Workload */}
            <Box className="premium-card p-4 sm:p-6">
              <Group justify="space-between" align="flex-start" mb="md">
                <Box>
                  <Title order={4} style={{ letterSpacing: '-0.01em', fontWeight: 700 }}>
                    {t('reports.staff.workload', 'Staff Workload')}
                  </Title>
                  <Text size="xs" c="dimmed" mt={2}>
                    {t('reports.staff.subtitle', 'Task allocation and role performance during this timeframe')}
                  </Text>
                </Box>
                <Badge variant="light" color="green" size="sm" radius="md">
                  {t('reports.staff.membersCount', '{{count}} Staff Members', { count: staffWorkload?.length || 0 })}
                </Badge>
              </Group>

              <Stack gap="md">
                {staffWorkload?.map((staff: any) => (
                  <Box key={staff.name} p="xs" className="rounded-lg bg-muted/30">
                    <Group justify="space-between" align="center" mb={6}>
                      <Text size="xs" fw={700}>
                        {staff.name}
                      </Text>
                      <Badge size="xs" variant="outline" color="amber">
                        {t('reports.staff.tasksCount', '{{count}} tasks', { count: staff.total })}
                      </Badge>
                    </Group>
                    <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted/60 mb-2">
                      {Object.entries(staff.roles).map(([role, count]: any, i) => {
                        const colors = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b'];
                        const width = `${(count / staff.total) * 100}%`;
                        return (
                          <div
                            key={role}
                            title={`${role}: ${count}`}
                            style={{ width, backgroundColor: colors[i % colors.length] }}
                          />
                        );
                      })}
                    </div>
                    <Group gap="xs" wrap="wrap">
                      {Object.entries(staff.roles).map(([role, count]: any, i) => {
                        const colors = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b'];
                        return (
                          <Group key={role} gap={4} align="center">
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                backgroundColor: colors[i % colors.length],
                              }}
                            />
                            <Text size="10px" c="dimmed">
                              {role} ({count})
                            </Text>
                          </Group>
                        );
                      })}
                    </Group>
                  </Box>
                ))}
                {staffWorkload?.length === 0 && (
                  <Text size="xs" c="dimmed">
                    {t('reports.staff.noAssignments', 'No staff assignments in this period.')}
                  </Text>
                )}
              </Stack>
            </Box>
          </div>
        )}

        {/* Tab-specific Views */}
        {activeSection === 'services' && (
          <Box className="premium-card p-4 sm:p-6 mb-4 sm:mb-6">
            <Title order={4} style={{ letterSpacing: '-0.01em', fontWeight: 700 }} mb="xs">
              {t('reports.top.title', 'Top Services & Items')}
            </Title>
            <Text size="xs" c="dimmed" mb="lg">
              {t('reports.top.subtitle', 'Highest volume services and retail products sold')}
            </Text>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {/* Top Services */}
              <Box>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }} mb="xs">
                  {t('common.services', 'Tailoring & Decor Services')}
                </Text>
                <Stack gap="xs">
                  {topServices?.slice(0, 6).map((s: any) => (
                    <Group key={s.name} justify="space-between" align="center" p="xs" className="rounded-lg bg-muted/30">
                      <Box style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                        <Text size="xs" fw={600} truncate>
                          {getLocName(s)}
                        </Text>
                        <Text size="11px" c="dimmed">
                          {t('reports.top.jobsCount', '{{count}} jobs', { count: s.count })}
                        </Text>
                      </Box>
                      <Text size="xs" fw={700} style={{ color: 'var(--primary-accent)' }}>
                        {formatCurrency(s.revenue, i18n.language as any)}
                      </Text>
                    </Group>
                  ))}
                  {topServices?.length === 0 && (
                    <Text size="xs" c="dimmed">
                      {t('reports.top.noServiceData', 'No service activity recorded.')}
                    </Text>
                  )}
                </Stack>
              </Box>

              {/* Top Materials */}
              <Box>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }} mb="xs">
                  {t('reports.top.materialsItems', 'Materials & Retail Items')}
                </Text>
                <Stack gap="xs">
                  {topMaterials?.slice(0, 6).map((m: any) => (
                    <Group key={m.name} justify="space-between" align="center" p="xs" className="rounded-lg bg-muted/30">
                      <Box style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                        <Text size="xs" fw={600} truncate>
                          {getLocName(m)}
                        </Text>
                        <Text size="11px" c="dimmed">
                          {t('reports.top.unitsSold', '{{count}} units sold', { count: m.count })}
                        </Text>
                      </Box>
                      <Text size="xs" fw={700} style={{ color: '#3b82f6' }}>
                        {formatCurrency(m.revenue, i18n.language as any)}
                      </Text>
                    </Group>
                  ))}
                  {topMaterials?.length === 0 && (
                    <Text size="xs" c="dimmed">
                      {t('reports.top.noMaterialData', 'No material consumption recorded.')}
                    </Text>
                  )}
                </Stack>
              </Box>
            </SimpleGrid>
          </Box>
        )}

        {activeSection === 'staff' && (
          <Box className="premium-card p-4 sm:p-6 mb-4 sm:mb-6">
            <Group justify="space-between" align="flex-start" mb="md">
              <Box>
                <Title order={4} style={{ letterSpacing: '-0.01em', fontWeight: 700 }}>
                  {t('reports.staff.workload', 'Staff Workload')}
                </Title>
                <Text size="xs" c="dimmed" mt={2}>
                  {t('reports.staff.subtitle', 'Task allocation and role performance during this timeframe')}
                </Text>
              </Box>
              <Badge variant="light" color="green" size="sm" radius="md">
                {t('reports.staff.membersCount', '{{count}} Staff Members', { count: staffWorkload?.length || 0 })}
              </Badge>
            </Group>

            <Stack gap="md">
              {staffWorkload?.map((staff: any) => (
                <Box key={staff.name} p="xs" className="rounded-lg bg-muted/30">
                  <Group justify="space-between" align="center" mb={6}>
                    <Text size="xs" fw={700}>
                      {staff.name}
                    </Text>
                    <Badge size="xs" variant="outline" color="amber">
                      {t('reports.staff.tasksCount', '{{count}} tasks', { count: staff.total })}
                    </Badge>
                  </Group>
                  <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-muted/60 mb-2">
                    {Object.entries(staff.roles).map(([role, count]: any, i) => {
                      const colors = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b'];
                      const width = `${(count / staff.total) * 100}%`;
                      return (
                        <div
                          key={role}
                          title={`${role}: ${count}`}
                          style={{ width, backgroundColor: colors[i % colors.length] }}
                        />
                      );
                    })}
                  </div>
                  <Group gap="xs" wrap="wrap">
                    {Object.entries(staff.roles).map(([role, count]: any, i) => {
                      const colors = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b'];
                      return (
                        <Group key={role} gap={4} align="center">
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: colors[i % colors.length],
                            }}
                          />
                          <Text size="10px" c="dimmed">
                            {role} ({count})
                          </Text>
                        </Group>
                      );
                    })}
                  </Group>
                </Box>
              ))}
              {staffWorkload?.length === 0 && (
                <Text size="xs" c="dimmed">
                  {t('reports.staff.noAssignments', 'No staff assignments in this period.')}
                </Text>
              )}
            </Stack>
          </Box>
        )}

        {/* SECTION 3: STORE VALUATIONS */}
        {(activeSection === 'all' || activeSection === 'inventory') && (
          <Box className="premium-card p-4 sm:p-6 mb-4 sm:mb-6">
            <Group justify="space-between" align="flex-start" mb="md">
              <Box>
                <Title order={4} style={{ letterSpacing: '-0.01em', fontWeight: 700 }}>
                  {t('reports.store.storeValuations', 'Dual Store Valuations')}
                </Title>
                <Text size="xs" c="dimmed" mt={2}>
                  {t('reports.store.subtitle', 'Real-time inventory asset values across Mini Shop and Main Warehouse')}
                </Text>
              </Box>
              <Badge variant="light" color="blue" size="sm" radius="md">
                {t('common.total', 'Total')}: {formatCurrency(totalValuation, i18n.language as any)}
              </Badge>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
              {/* Store Balances */}
              <Stack gap="sm">
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }}>
                  {t('reports.store.hubBalances', 'Current Storage Hub Balances')}
                </Text>
                {stockValuation?.summary?.map((store: any) => (
                  <Group
                    key={store.storeName}
                    justify="space-between"
                    align="center"
                    p="sm"
                    className="rounded-xl border border-border bg-card"
                  >
                    <Group gap="sm" align="center">
                      <Box
                        className="stat-icon-wrapper"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          background: 'rgba(245, 158, 11, 0.12)',
                          color: 'var(--primary-accent)',
                        }}
                      >
                        <Store size={18} />
                      </Box>
                      <Box>
                        <Text size="xs" fw={700}>
                          {getLocalizedStoreName(store.storeName)}
                        </Text>
                        <Text size="11px" c="dimmed">
                          {t('reports.store.currentAssets', 'Current Assets')}
                        </Text>
                      </Box>
                    </Group>
                    <Text size="sm" fw={800} style={{ color: 'var(--primary-accent)' }}>
                      {formatCurrency(store.totalValue, i18n.language as any)}
                    </Text>
                  </Group>
                ))}
              </Stack>

              {/* Top Value Materials */}
              <Box>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }} mb="xs">
                  {t('reports.store.topValueAssets', 'Top Value Materials')}
                </Text>
                <Stack gap={6}>
                  {stockValuation?.details?.slice(0, 6).map((d: any, i: number) => (
                    <Group key={i} justify="space-between" align="center" p="xs" className="rounded-lg bg-muted/20">
                      <Text size="xs" c="dimmed" truncate style={{ maxWidth: '65%' }}>
                        {d.quantity}x {getLocMaterialName(d)}
                      </Text>
                      <Text size="xs" fw={600}>
                        {formatCurrency(d.totalValue, i18n.language as any)}
                      </Text>
                    </Group>
                  ))}
                  {(!stockValuation?.details || stockValuation.details.length === 0) && (
                    <Text size="xs" c="dimmed">
                      {t('reports.store.noMaterialRecords', 'No material records found.')}
                    </Text>
                  )}
                </Stack>
              </Box>
            </SimpleGrid>
          </Box>
        )}
      </Tabs>
    </Stack>
  );
}
