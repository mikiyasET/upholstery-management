import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
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
} from 'date-fns';
import {
  Box,
  Group,
  Stack,
  Title,
  Text,
  Badge,
  Tabs,
  TextInput,
  SegmentedControl,
  SimpleGrid,
} from '@mantine/core';
import {
  RiCalendarEventLine,
  RiCalendarLine,
  RiCalendar2Line,
  RiCalendarScheduleLine,
  RiTimeLine,
  RiHistoryLine,
  RiBarChartBoxLine,
  RiArchiveLine,
  RiExchangeDollarLine,
  RiToolsLine,
  RiUser3Line,
  RiStore2Line,
} from 'react-icons/ri';
import { PageHeader } from '../components/common';

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all' | 'custom';

export default function Reports() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [activeSection, setActiveSection] = useState<string | null>('all');
  const [customStart, setCustomStart] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isSingleDayMode, setIsSingleDayMode] = useState<boolean>(false);

  const getLocName = (item: any) => {
    if (!item) return '';
    if (i18n.language === 'am' && item.nameAm) return item.nameAm;
    return item.nameEn || item.name || '';
  };

  const getLocMaterialName = (item: any) => {
    if (!item) return '';
    if (i18n.language === 'am' && item.materialNameAm) return item.materialNameAm;
    return item.materialNameEn || item.materialName || '';
  };

  const getLocalizedStoreName = (storeName: string) => {
    const norm = (storeName || '').toUpperCase();
    if (norm.includes('MAIN')) return t('reports.store.mainStore', 'MAIN STORE');
    if (norm.includes('MINI')) return t('reports.store.miniStore', 'MINI STORE');
    return `${storeName} STORE`;
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
        return {};
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
  const totalRevenue = revenue?.reduce((sum: number, item: any) => sum + item.orderRevenue + item.directSaleRevenue, 0) || 0;
  const totalValuation = stockValuation?.summary?.reduce((sum: number, item: any) => sum + item.totalValue, 0) || 0;
  const topServiceCount = topServices?.[0]?.count || 0;
  const maxRevenue = revenue?.reduce((max: number, item: any) => Math.max(max, item.orderRevenue + item.directSaleRevenue), 0) || 1;

  // Human-readable formatted period display
  const getPeriodDisplay = () => {
    const today = new Date();
    if (datePreset === 'today') return format(today, 'EEEE, MMM d, yyyy');
    if (datePreset === 'yesterday') return format(subDays(today, 1), 'EEEE, MMM d, yyyy');
    if (datePreset === 'week') return `${format(subDays(today, 6), 'MMM d')} – ${format(today, 'MMM d, yyyy')}`;
    if (datePreset === 'month') return format(today, 'MMMM yyyy');
    if (datePreset === 'year') return format(today, 'yyyy');
    if (datePreset === 'all') return t('reports.timeframe.all', 'All Historical Records');
    if (datePreset === 'custom') {
      if (isSingleDayMode && customStart) {
        try {
          return format(parseISO(customStart), 'MMM d, yyyy');
        } catch {
          return customStart;
        }
      }
      if (customStart && customEnd) {
        try {
          return `${format(parseISO(customStart), 'MMM d, yyyy')} – ${format(parseISO(customEnd), 'MMM d, yyyy')}`;
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
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['reports'] });
        }}
        isRefreshing={isAnyLoading}
      />

      {/* 2. Executive Timeframe Switcher Tabs (Low-profile Luxury Pill Bar) */}
      <Box
        className="premium-card"
        style={{
          padding: '6px 12px',
        }}
      >
        <Group justify="space-between" align="center" wrap="wrap" gap="xs">
          <Tabs
            value={datePreset}
            onChange={(v) => v && setDatePreset(v as DatePreset)}
            variant="pills"
            radius="md"
          >
            <Tabs.List style={{ gap: 4, flexWrap: 'wrap' }}>
              <Tabs.Tab
                value="today"
                leftSection={<RiTimeLine size={13} />}
                style={{ height: 30, padding: '0 10px', fontSize: '12px' }}
              >
                {t('reports.timeframe.today', 'Today')}
              </Tabs.Tab>
              <Tabs.Tab
                value="yesterday"
                leftSection={<RiHistoryLine size={13} />}
                style={{ height: 30, padding: '0 10px', fontSize: '12px' }}
              >
                {t('reports.timeframe.yesterday', 'Yesterday')}
              </Tabs.Tab>
              <Tabs.Tab
                value="week"
                leftSection={<RiCalendarLine size={13} />}
                style={{ height: 30, padding: '0 10px', fontSize: '12px' }}
              >
                {t('reports.timeframe.week', 'Last 7 Days')}
              </Tabs.Tab>
              <Tabs.Tab
                value="month"
                leftSection={<RiCalendar2Line size={13} />}
                style={{ height: 30, padding: '0 10px', fontSize: '12px' }}
              >
                {t('reports.timeframe.month', 'This Month')}
              </Tabs.Tab>
              <Tabs.Tab
                value="year"
                leftSection={<RiBarChartBoxLine size={13} />}
                style={{ height: 30, padding: '0 10px', fontSize: '12px' }}
              >
                {t('reports.timeframe.year', 'This Year')}
              </Tabs.Tab>
              <Tabs.Tab
                value="all"
                leftSection={<RiArchiveLine size={13} />}
                style={{ height: 30, padding: '0 10px', fontSize: '12px' }}
              >
                {t('reports.timeframe.all', 'All Time')}
              </Tabs.Tab>
              <Tabs.Tab
                value="custom"
                leftSection={<RiCalendarScheduleLine size={13} />}
                style={{ height: 30, padding: '0 10px', fontSize: '12px' }}
              >
                {t('reports.timeframe.custom', 'Custom Range')}
              </Tabs.Tab>
            </Tabs.List>
          </Tabs>

          <Badge
            size="md"
            radius="md"
            variant="light"
            color="amber"
            leftSection={<RiCalendarEventLine size={13} />}
            style={{ fontWeight: 600, textTransform: 'none', fontSize: '0.78rem', height: 26 }}
          >
            {getPeriodDisplay()}
          </Badge>
        </Group>

        {/* Custom Range Expansion Panel */}
        {datePreset === 'custom' && (
          <Box
            mt="xs"
            pt="xs"
            className="animate-in fade-in duration-200"
            style={{
              borderTop: '1px solid var(--surface-border-subtle, rgba(255,255,255,0.08))',
            }}
          >
            <Group justify="space-between" align="center" wrap="wrap" gap="xs">
              <Group gap="sm" align="center" wrap="wrap">
                <SegmentedControl
                  size="xs"
                  radius="md"
                  value={isSingleDayMode ? 'single' : 'range'}
                  onChange={(val) => {
                    const isSingle = val === 'single';
                    setIsSingleDayMode(isSingle);
                    if (isSingle) setCustomEnd(customStart);
                  }}
                  data={[
                    { value: 'range', label: 'Date Range' },
                    { value: 'single', label: 'Single Day' },
                  ]}
                />

                {isSingleDayMode ? (
                  <Group gap={6} align="center">
                    <Text size="xs" fw={600} c="dimmed">
                      {t('reports.timeframe.selectSingleDay', 'Date')}:
                    </Text>
                    <TextInput
                      type="date"
                      size="xs"
                      radius="md"
                      value={customStart}
                      onChange={(e) => {
                        setCustomStart(e.target.value);
                        setCustomEnd(e.target.value);
                      }}
                      style={{ width: 145 }}
                    />
                  </Group>
                ) : (
                  <Group gap={6} align="center" wrap="wrap">
                    <Text size="xs" fw={600} c="dimmed">
                      {t('reports.timeframe.from', 'From')}:
                    </Text>
                    <TextInput
                      type="date"
                      size="xs"
                      radius="md"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      style={{ width: 140 }}
                    />
                    <Text size="xs" fw={600} c="dimmed">
                      {t('reports.timeframe.to', 'To')}:
                    </Text>
                    <TextInput
                      type="date"
                      size="xs"
                      radius="md"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      style={{ width: 140 }}
                    />
                  </Group>
                )}
              </Group>

              <Text size="11px" c="dimmed">
                Range applied automatically to all charts
              </Text>
            </Group>
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
                {formatCurrency(totalRevenue)}
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                color: 'var(--primary-accent)',
              }}
            >
              <RiExchangeDollarLine size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" style={{ borderTop: '1px solid var(--surface-border-subtle, rgba(255,255,255,0.06))' }}>
            <Group gap={4}>
              <span className="pulse-dot" style={{ backgroundColor: '#f59e0b', width: 5, height: 5 }} />
              <Text size="11px" fw={600} style={{ color: 'var(--primary-accent)' }}>
                {t('reports.kpi.forPeriod', 'Selected Period')}
              </Text>
            </Group>
            <Text size="11px" c="dimmed">
              Orders & POS
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
                {formatCurrency(totalValuation)}
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                background: 'rgba(59, 130, 246, 0.12)',
                color: '#3b82f6',
              }}
            >
              <RiArchiveLine size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" style={{ borderTop: '1px solid var(--surface-border-subtle, rgba(255,255,255,0.06))' }}>
            <Text size="11px" fw={600} style={{ color: '#3b82f6' }}>
              Dual Storage Hubs
            </Text>
            <Text size="11px" c="dimmed">
              Current inventory
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
                  jobs
                </Text>
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                background: 'rgba(168, 85, 247, 0.12)',
                color: '#a855f7',
              }}
            >
              <RiToolsLine size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" style={{ borderTop: '1px solid var(--surface-border-subtle, rgba(255,255,255,0.06))' }}>
            <Text size="11px" fw={600} style={{ color: '#a855f7' }} truncate>
              {getLocName(topServices?.[0]) || 'No records'}
            </Text>
            <Text size="11px" c="dimmed" style={{ flexShrink: 0 }}>
              Leading service
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
                  members
                </Text>
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
              }}
            >
              <RiUser3Line size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" style={{ borderTop: '1px solid var(--surface-border-subtle, rgba(255,255,255,0.06))' }}>
            <Text size="11px" fw={600} style={{ color: '#10b981' }}>
              Workshop operations
            </Text>
            <Text size="11px" c="dimmed">
              Involved in orders
            </Text>
          </Group>
        </Box>
      </SimpleGrid>

      {/* 4. Section Switcher Tabs (Unified Analytics Hub) */}
      <Tabs value={activeSection} onChange={setActiveSection} variant="pills" radius="md">
        <Tabs.List style={{ gap: 4, flexWrap: 'wrap' }} mb="md">
          <Tabs.Tab value="all" leftSection={<RiBarChartBoxLine size={15} />} style={{ height: 30, padding: '0 10px', fontSize: '12px' }}>
            All Reports & Charts
          </Tabs.Tab>
          <Tabs.Tab value="revenue" leftSection={<RiExchangeDollarLine size={15} />} style={{ height: 30, padding: '0 10px', fontSize: '12px' }}>
            Revenue Trend
          </Tabs.Tab>
          <Tabs.Tab value="services" leftSection={<RiToolsLine size={15} />} style={{ height: 30, padding: '0 10px', fontSize: '12px' }}>
            Top Services & Items
          </Tabs.Tab>
          <Tabs.Tab value="staff" leftSection={<RiUser3Line size={15} />} style={{ height: 30, padding: '0 10px', fontSize: '12px' }}>
            Staff Workload
          </Tabs.Tab>
          <Tabs.Tab value="inventory" leftSection={<RiStore2Line size={15} />} style={{ height: 30, padding: '0 10px', fontSize: '12px' }}>
            Store Valuations
          </Tabs.Tab>
        </Tabs.List>

        {/* SECTION: REVENUE & TOP SERVICES */}
        {(activeSection === 'all' || activeSection === 'revenue' || activeSection === 'services') && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7 mb-6">
            {/* Revenue Trend Chart */}
            {(activeSection === 'all' || activeSection === 'revenue') && (
              <Box
                className={`premium-card p-6 ${activeSection === 'revenue' ? 'lg:col-span-7' : 'lg:col-span-4'}`}
              >
                <Group justify="space-between" align="flex-start" mb="md">
                  <Box>
                    <Title order={4} style={{ letterSpacing: '-0.01em', fontWeight: 700 }}>
                      {t('reports.charts.revenueTrend', 'Revenue Trend')}
                    </Title>
                    <Text size="xs" c="dimmed" mt={2}>
                      Combined work orders and counter point-of-sale collections
                    </Text>
                  </Box>
                  <Badge variant="light" color="amber" size="sm" radius="md">
                    Total: {formatCurrency(totalRevenue)}
                  </Badge>
                </Group>

                {!revenue || revenue.length === 0 ? (
                  <div className="h-[280px] w-full flex flex-col items-center justify-center text-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mb-1">
                      <RiBarChartBoxLine size={24} className="text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t('reports.charts.noRevenue', 'No revenue recorded for this period.')}
                    </p>
                  </div>
                ) : (
                  <div className="h-[280px] w-full flex items-end gap-2 pt-6">
                    {revenue.map((item: any) => {
                      const total = item.orderRevenue + item.directSaleRevenue;
                      const heightPct = Math.max((total / maxRevenue) * 100, 3);

                      return (
                        <div key={item.date} className="flex-1 flex flex-col justify-end group relative h-full">
                          {/* Hover Tooltip */}
                          <div className="opacity-0 group-hover:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-800 text-white text-[11px] py-1 px-2.5 rounded-lg whitespace-nowrap transition-opacity z-20 pointer-events-none shadow-lg border border-gray-700">
                            <span className="font-semibold">{item.date}:</span> {formatCurrency(total)}
                          </div>
                          <div
                            className="w-full rounded-t-md transition-all duration-300 group-hover:brightness-110"
                            style={{
                              height: `${heightPct}%`,
                              background: 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)',
                              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.25)',
                            }}
                          />
                          {revenue.length <= 15 && (
                            <div className="text-[10px] text-muted-foreground text-center mt-2 truncate w-full transform -rotate-45 origin-top-left">
                              {item.date.split('-').slice(1).join('/')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Box>
            )}

            {/* Top Performers */}
            {(activeSection === 'all' || activeSection === 'services') && (
              <Box
                className={`premium-card p-6 ${activeSection === 'services' ? 'lg:col-span-7' : 'lg:col-span-3'}`}
              >
                <Title order={4} style={{ letterSpacing: '-0.01em', fontWeight: 700 }} mb="xs">
                  {t('reports.top.title', 'Top Services & Items')}
                </Title>
                <Text size="xs" c="dimmed" mb="lg">
                  Highest volume services and retail products sold
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
                            {formatCurrency(s.revenue)}
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
                            {formatCurrency(m.revenue)}
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
            )}
          </div>
        )}

        {/* SECTION: STAFF WORKLOAD & STORE VALUATIONS */}
        {(activeSection === 'all' || activeSection === 'staff' || activeSection === 'inventory') && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Staff Workload */}
            {(activeSection === 'all' || activeSection === 'staff') && (
              <Box className="premium-card p-6">
                <Group justify="space-between" align="flex-start" mb="md">
                  <Box>
                    <Title order={4} style={{ letterSpacing: '-0.01em', fontWeight: 700 }}>
                      {t('reports.staff.workload', 'Staff Workload')}
                    </Title>
                    <Text size="xs" c="dimmed" mt={2}>
                      Task allocation and role performance during this timeframe
                    </Text>
                  </Box>
                  <Badge variant="light" color="green" size="sm" radius="md">
                    {staffWorkload?.length || 0} Staff Members
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

            {/* Store Valuations */}
            {(activeSection === 'all' || activeSection === 'inventory') && (
              <Box className="premium-card p-6">
                <Group justify="space-between" align="flex-start" mb="md">
                  <Box>
                    <Title order={4} style={{ letterSpacing: '-0.01em', fontWeight: 700 }}>
                      {t('reports.store.storeValuations', 'Dual Store Valuations')}
                    </Title>
                    <Text size="xs" c="dimmed" mt={2}>
                      Real-time inventory asset values across Mini Shop and Main Warehouse
                    </Text>
                  </Box>
                  <Badge variant="light" color="blue" size="sm" radius="md">
                    Total: {formatCurrency(totalValuation)}
                  </Badge>
                </Group>

                <Stack gap="md">
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
                            background: 'rgba(245, 158, 11, 0.12)',
                            color: 'var(--primary-accent)',
                            width: 36,
                            height: 36,
                          }}
                        >
                          <RiStore2Line size={18} />
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
                        {formatCurrency(store.totalValue)}
                      </Text>
                    </Group>
                  ))}

                  <Box pt="xs" style={{ borderTop: '1px solid var(--surface-border-subtle, rgba(255,255,255,0.06))' }}>
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.05em' }} mb="xs">
                      {t('reports.store.topValueAssets', 'Top Value Materials')}
                    </Text>
                    <Stack gap={6}>
                      {stockValuation?.details?.slice(0, 4).map((d: any, i: number) => (
                        <Group key={i} justify="space-between" align="center" text-xs="true">
                          <Text size="xs" c="dimmed" truncate style={{ maxWidth: '65%' }}>
                            {d.quantity}x {getLocMaterialName(d)}
                          </Text>
                          <Text size="xs" fw={600}>
                            {formatCurrency(d.totalValue)}
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              </Box>
            )}
          </div>
        )}
      </Tabs>
    </Stack>
  );
}
