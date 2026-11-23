import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { formatAppDate, cn, getImageUrl } from '../lib/utils';
import { AppDatePicker } from '../components/common/AppDatePicker';
import { PlateBadge } from '../components/common/PlateBadge';
import { PageHeader } from '../components/common';
import { StatCard } from '../components/common/StatCard';
import { LazyImage } from '../components/common/LazyImage';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '../components/ui/sheet';
import { ImagePreviewModal } from '../components/ui/image-preview-modal';
import { useMediaQuery } from '@mantine/hooks';
import {
  Box,
  Text,
  Badge,
  Tabs,
  SegmentedControl,
  Skeleton,
  ActionIcon,
  SimpleGrid,
  Button,
} from '@mantine/core';
import {
  format,
  subDays,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  parseISO,
} from 'date-fns';
import {
  Users,
  Car,
  Wrench,
  Clock,
  History,
  Calendar,
  CalendarRange,
  CalendarClock,
  Search,
  UserCheck,
  Phone,
  ExternalLink,
  X,
  Award,
  ChevronRight,
  Layers,
} from 'lucide-react';

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

interface VehicleWorked {
  orderId: string;
  orderNumber: string;
  orderDateTime: string;
  orderStatus: string;
  carBrand: string;
  carModel: string;
  carImage: string | null;
  brandLogo: string | null;
  plateNumber: string;
  customerName: string;
  customerPhone: string | null;
  roles: string[];
  assignedAt: string;
}

interface EmployeeWorkload {
  id: string;
  name: string;
  phone: string | null;
  jobRoles: string[];
  rolesSummary: Record<string, number>;
  totalTasks: number;
  carsCount: number;
  carsWorked: VehicleWorked[];
}

interface LaborActivityResponse {
  timeframe: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalEmployeesWorked: number;
    totalCarsWorked: number;
    totalAssignments: number;
  };
  employees: EmployeeWorkload[];
}

const getOrderStatusColor = (status: string) => {
  switch (status) {
    case 'OPEN':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case 'IN_PROGRESS':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'COMPLETED':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    case 'DELIVERED':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export default function DailyWorkload() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isMobileOrTablet = useMediaQuery('(max-width: 74.99em)');

  // Date filter state
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [customStart, setCustomStart] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isSingleDayMode, setIsSingleDayMode] = useState<boolean>(true);

  // Search and selected employee
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Compute start/end dates
  const getDateParams = useCallback(() => {
    const today = new Date();
    switch (datePreset) {
      case 'today':
        return {
          startDate: startOfDay(today).toISOString(),
          endDate: endOfDay(today).toISOString(),
        };
      case 'yesterday': {
        const yesterday = subDays(today, 1);
        return {
          startDate: startOfDay(yesterday).toISOString(),
          endDate: endOfDay(yesterday).toISOString(),
        };
      }
      case 'week':
        return {
          startDate: startOfDay(subDays(today, 6)).toISOString(),
          endDate: endOfDay(today).toISOString(),
        };
      case 'month':
        return {
          startDate: startOfDay(startOfMonth(today)).toISOString(),
          endDate: endOfDay(endOfMonth(today)).toISOString(),
        };
      case 'custom':
        if (customStart && customEnd) {
          const s = parseISO(customStart);
          const e = parseISO(customEnd);
          return {
            startDate: startOfDay(s).toISOString(),
            endDate: endOfDay(e).toISOString(),
          };
        }
        return {
          startDate: startOfDay(today).toISOString(),
          endDate: endOfDay(today).toISOString(),
        };
      default:
        return {};
    }
  }, [datePreset, customStart, customEnd]);

  // Fetch labor activity data
  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<LaborActivityResponse>({
    queryKey: ['reports', 'labor-activity', datePreset, customStart, customEnd, isSingleDayMode],
    queryFn: async () => {
      const params = getDateParams();
      const res = await api.get('/reports/labor-activity', { params });
      return res.data;
    },
    staleTime: 30_000,
  });

  const employees = useMemo(() => data?.employees || [], [data]);
  const summary = data?.summary || { totalEmployeesWorked: 0, totalCarsWorked: 0, totalAssignments: 0 };

  // Collect all unique roles for filter pill
  const availableRoles = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((emp) => {
      emp.jobRoles?.forEach((r) => set.add(r));
      Object.keys(emp.rolesSummary || {}).forEach((r) => set.add(r));
    });
    return Array.from(set).sort();
  }, [employees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        (emp.phone && emp.phone.includes(q)) ||
        emp.jobRoles?.some((r) => r.toLowerCase().includes(q)) ||
        Object.keys(emp.rolesSummary || {}).some((r) => r.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (roleFilter !== 'ALL') {
        const hasRole =
          emp.jobRoles?.includes(roleFilter) ||
          Boolean(emp.rolesSummary && emp.rolesSummary[roleFilter]);
        if (!hasRole) return false;
      }

      return true;
    });
  }, [employees, search, roleFilter]);

  // Top technician (first in array since sorted descending by carsCount)
  const topTechnician = employees[0] || null;

  // Selected employee object
  const activeSelectedEmployee = useMemo(() => {
    if (selectedEmpId) {
      const found = employees.find((e) => e.id === selectedEmpId);
      if (found) return found;
    }
    return filteredEmployees[0] || employees[0] || null;
  }, [employees, filteredEmployees, selectedEmpId]);

  // Open employee detail
  const handleSelectEmployee = (emp: EmployeeWorkload) => {
    setSelectedEmpId(emp.id);
    if (isMobileOrTablet) {
      setIsMobileSheetOpen(true);
    }
  };

  // Human-readable date range label
  const timeframeBadgeLabel = useMemo(() => {
    if (datePreset === 'today') return t('labor.timeframe.today', 'Today');
    if (datePreset === 'yesterday') return t('labor.timeframe.yesterday', 'Yesterday');
    if (datePreset === 'week') return t('labor.timeframe.week', 'Last 7 Days');
    if (datePreset === 'month') return t('labor.timeframe.month', 'This Month');
    if (datePreset === 'custom') {
      if (isSingleDayMode || customStart === customEnd) {
        return formatAppDate(customStart, false, i18n.language);
      }
      return `${formatAppDate(customStart, false, i18n.language)} - ${formatAppDate(customEnd, false, i18n.language)}`;
    }
    return t('labor.title');
  }, [datePreset, isSingleDayMode, customStart, customEnd, t, i18n.language]);

  return (
    <div className="space-y-5 pb-12">
      {/* 1. Header with Title & Refresh */}
      <PageHeader
        title={t('labor.title', 'Daily Workload')}
        subtitle={t('labor.subtitle', 'Daily technician activity and vehicle completion tracking for daily compensation')}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['reports', 'labor-activity'] });
          refetch();
        }}
        isRefreshing={isFetching}
      />

      {/* 2. Low-profile Luxury Timeframe Switcher Tabs */}
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
                  {t('labor.timeframe.today', 'Today')}
                </Tabs.Tab>
                <Tabs.Tab
                  value="yesterday"
                  leftSection={<History size={13} />}
                  className="whitespace-nowrap shrink-0"
                  style={{ height: 30, padding: '0 10px', fontSize: '12px' }}
                >
                  {t('labor.timeframe.yesterday', 'Yesterday')}
                </Tabs.Tab>
                <Tabs.Tab
                  value="week"
                  leftSection={<Calendar size={13} />}
                  className="whitespace-nowrap shrink-0"
                  style={{ height: 30, padding: '0 10px', fontSize: '12px' }}
                >
                  {t('labor.timeframe.week', 'Last 7 Days')}
                </Tabs.Tab>
                <Tabs.Tab
                  value="month"
                  leftSection={<CalendarRange size={13} />}
                  className="whitespace-nowrap shrink-0"
                  style={{ height: 30, padding: '0 10px', fontSize: '12px' }}
                >
                  {t('labor.timeframe.month', 'This Month')}
                </Tabs.Tab>
                <Tabs.Tab
                  value="custom"
                  leftSection={<CalendarClock size={13} />}
                  className="whitespace-nowrap shrink-0"
                  style={{ height: 30, padding: '0 10px', fontSize: '12px' }}
                >
                  {t('labor.timeframe.custom', 'Custom Date')}
                </Tabs.Tab>
              </Tabs.List>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-[var(--surface-border-subtle)]">
              <Badge
                size="md"
                variant="dot"
                color="amber"
                className="font-medium tracking-wide bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20"
              >
                {timeframeBadgeLabel}
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
                    { value: 'single', label: t('labor.timeframe.singleDay', 'Single Day') },
                    { value: 'range', label: t('labor.timeframe.dateRange', 'Date Range') },
                  ]}
                />

                {isSingleDayMode ? (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Text size="xs" fw={600} c="dimmed" className="shrink-0">
                      {t('labor.timeframe.selectSingleDay', 'Date')}:
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
                        {t('labor.timeframe.from', 'From')}:
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
                        {t('labor.timeframe.to', 'To')}:
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
            </div>
          </Box>
        )}
      </Box>

      {/* 3. KPI Summary Banner */}
      <SimpleGrid cols={{ base: 2, sm: 2, lg: 4 }} spacing={{ base: 'xs', sm: 'md' }}>
        <StatCard
          title={t('labor.technicians', 'Technicians Active')}
          value={isLoading ? '-' : summary.totalEmployeesWorked}
          subtitle={t('labor.timeframe.today', 'In selected timeframe')}
          icon={<Users size={22} />}
          iconColor="blue"
        />
        <StatCard
          title={t('labor.carsWorked', 'Cars Worked On')}
          value={isLoading ? '-' : summary.totalCarsWorked}
          subtitle={t('labor.cars', 'Unique vehicles')}
          icon={<Car size={22} />}
          iconColor="amber"
          badge={summary.totalCarsWorked > 0 ? t('labor.carsCount', { count: summary.totalCarsWorked }) : undefined}
          badgeColor="amber"
        />
        <StatCard
          title={t('labor.totalTasks', 'Total Work Tasks')}
          value={isLoading ? '-' : summary.totalAssignments}
          subtitle={t('labor.tasks', 'Work assignments performed')}
          icon={<Wrench size={22} />}
          iconColor="grape"
        />
        <StatCard
          title={t('labor.topTechnician', 'Top Technician')}
          value={isLoading ? '-' : topTechnician ? topTechnician.name : '-'}
          subtitle={
            topTechnician
              ? t('labor.carsCount', { count: topTechnician.carsCount })
              : t('reports.kpi.noRecords', 'No records')
          }
          icon={<Award size={22} />}
          iconColor="green"
          badge={topTechnician ? `${topTechnician.carsCount} Cars` : undefined}
          badgeColor="green"
        />
      </SimpleGrid>

      {/* 4. Search & Filter Bar (Clean stacked rows for Tablets & Mobile to avoid overlap) */}
      <div className="bg-card border border-border/70 rounded-xl p-3 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('labor.searchPlaceholder', 'Search technicians by name, phone or role...')}
              className="w-full pl-9 pr-8 py-2 text-sm bg-muted/40 hover:bg-muted/60 focus:bg-background border border-border/60 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {(search || roleFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setRoleFilter('ALL');
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground px-2 py-1 rounded-md shrink-0 self-end sm:self-center transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>{t('common.cancel', 'Reset')}</span>
            </button>
          )}
        </div>

        {/* Dynamic Role Pill Filter (Dedicated Row with smooth horizontal scroll) */}
        {availableRoles.length > 0 && (
          <div className="pt-2 border-t border-border/40">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-0.5 w-full">
              <button
                onClick={() => setRoleFilter('ALL')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 border',
                  roleFilter === 'ALL'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                    : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted'
                )}
              >
                {t('labor.allRoles', 'All Roles')}
              </button>
              {availableRoles.map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-lg transition-all whitespace-nowrap shrink-0 border',
                    roleFilter === role
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                      : 'bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted'
                  )}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. Main Content: Master-Detail on Desktop, Card Grid + BottomSheet on Tablet/Mobile */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} height={160} radius="lg" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        /* Empty State: No activity in selected timeframe */
        <div className="flex flex-col items-center justify-center p-10 sm:p-16 bg-card border border-border/60 rounded-2xl text-center shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
            <UserCheck className="w-8 h-8" />
          </div>
          <h3 className="font-heading text-lg sm:text-xl font-bold text-foreground mb-1">
            {t('labor.noActivityTitle', 'No Technician Work Recorded')}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5 leading-relaxed">
            {t(
              'labor.noActivityDesc',
              'No technicians worked on vehicles during this timeframe. Technicians will appear here automatically when assigned to work orders.'
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="light"
              color="amber"
              leftSection={<Clock size={14} />}
              onClick={() => setDatePreset('today')}
            >
              {t('labor.timeframe.today', 'View Today')}
            </Button>
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              leftSection={<CalendarRange size={14} />}
              onClick={() => setDatePreset('month')}
            >
              {t('labor.timeframe.month', 'View This Month')}
            </Button>
          </div>
        </div>
      ) : filteredEmployees.length === 0 ? (
        /* Filter Empty State */
        <div className="flex flex-col items-center justify-center p-8 bg-card border border-border/60 rounded-2xl text-center">
          <Search className="w-10 h-10 text-muted-foreground mb-2" />
          <h3 className="text-base font-semibold text-foreground mb-1">
            {t('labor.noMatchTitle', 'No Technicians Found')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('labor.noMatchDesc', 'No technicians matched your search query.')}
          </p>
          <Button size="xs" variant="outline" onClick={() => { setSearch(''); setRoleFilter('ALL'); }}>
            {t('common.cancel', 'Reset Filters')}
          </Button>
        </div>
      ) : (
        /* Content Area */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Technicians Cards */}
          <div className={cn(
            isMobileOrTablet ? 'col-span-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5' : 'lg:col-span-5 space-y-3'
          )}>
            {filteredEmployees.map((emp, index) => {
              const isSelected = activeSelectedEmployee?.id === emp.id;
              const isTop = index === 0;

              return (
                <div
                  key={emp.id}
                  onClick={() => handleSelectEmployee(emp)}
                  className={cn(
                    'group relative text-left rounded-xl p-4 transition-all cursor-pointer border',
                    isSelected && !isMobileOrTablet
                      ? 'bg-amber-500/10 border-amber-500 shadow-md ring-1 ring-amber-500/40'
                      : 'bg-card border-border/70 hover:border-amber-500/50 hover:bg-muted/30 shadow-xs'
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar / Initials */}
                      <div className={cn(
                        'w-11 h-11 rounded-xl font-bold flex items-center justify-center shrink-0 transition-colors',
                        isTop
                          ? 'bg-amber-500 text-white shadow-xs'
                          : isSelected && !isMobileOrTablet
                          ? 'bg-amber-500 text-white'
                          : 'bg-muted text-foreground'
                      )}>
                        {isTop ? (
                          <Award className="w-5 h-5 text-white" />
                        ) : (
                          emp.name.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-heading font-bold text-sm text-foreground truncate">
                            {emp.name}
                          </h4>
                          {isTop && (
                            <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded">
                              #1
                            </span>
                          )}
                        </div>

                        {emp.phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span className="truncate">{emp.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Primary Metric: Cars Count Badge */}
                    <div className="flex flex-col items-end shrink-0">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 rounded-lg font-bold text-xs">
                        <Car className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>{emp.carsCount} {emp.carsCount === 1 ? t('labor.car', 'Car') : t('labor.cars', 'Cars')}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground mt-1">
                        {emp.totalTasks} {t('labor.tasks', 'tasks')}
                      </span>
                    </div>
                  </div>

                  {/* Roles summary badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
                    {Object.entries(emp.rolesSummary || {}).slice(0, 3).map(([role, count]) => (
                      <span
                        key={role}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-muted text-muted-foreground"
                      >
                        <span>{role}</span>
                        <span className="font-bold text-foreground">({count})</span>
                      </span>
                    ))}
                    {Object.keys(emp.rolesSummary || {}).length > 3 && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        +{Object.keys(emp.rolesSummary || {}).length - 3} more
                      </span>
                    )}

                    {isMobileOrTablet && (
                      <div className="ml-auto flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                        <span>{t('labor.viewOrder', 'View Details')}</span>
                        <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Detail Inspector (Desktop Only) */}
          {!isMobileOrTablet && activeSelectedEmployee && (
            <div className="lg:col-span-7 sticky top-4 bg-card border border-border/70 rounded-2xl p-5 shadow-xs flex flex-col gap-4">
              {/* Technician Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-border/70">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold text-xl flex items-center justify-center shrink-0 border border-amber-500/20">
                    {activeSelectedEmployee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading text-lg font-bold text-foreground truncate">
                      {activeSelectedEmployee.name}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {activeSelectedEmployee.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {activeSelectedEmployee.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {activeSelectedEmployee.jobRoles?.join(', ') || t('labor.allRoles', 'Technician')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Counter Badges */}
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-center">
                    <div className="text-base font-extrabold text-amber-600 dark:text-amber-400 leading-tight">
                      {activeSelectedEmployee.carsCount}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 tracking-wider">
                      {t('labor.carsWorked', 'Cars')}
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-muted border border-border rounded-xl text-center">
                    <div className="text-base font-extrabold text-foreground leading-tight">
                      {activeSelectedEmployee.totalTasks}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                      {t('labor.tasks', 'Tasks')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Vehicle List Title */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h4 className="font-heading text-sm font-bold text-foreground">
                    {t('labor.vehiclesWorkedOn', 'Vehicles Worked On')} ({activeSelectedEmployee.carsWorked.length})
                  </h4>
                </div>
                <span className="text-xs text-muted-foreground">
                  {timeframeBadgeLabel}
                </span>
              </div>

              {/* Vehicles Worked On Cards */}
              <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
                {activeSelectedEmployee.carsWorked.map((car) => (
                  <div
                    key={car.orderId}
                    className="p-3.5 bg-muted/20 hover:bg-muted/40 border border-border/60 rounded-xl transition-all flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Car Model Image with LazyImage & ImagePreview */}
                        <div className="w-14 h-12 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-center shrink-0 overflow-hidden p-1">
                          {car.carImage || car.brandLogo ? (
                            <LazyImage
                              src={car.carImage || car.brandLogo}
                              alt={`${car.carBrand} ${car.carModel}`}
                              containWithBlur={false}
                              wrapperClassName="w-full h-full bg-transparent flex items-center justify-center cursor-pointer"
                              imgClassName="w-full h-full object-contain hover:scale-105 transition-transform duration-200"
                              onClick={() => setPreviewImage(getImageUrl(car.carImage || car.brandLogo) || null)}
                              fallback={
                                <div className="w-full h-full flex items-center justify-center bg-muted/30">
                                  <Car className="w-5 h-5 text-muted-foreground/60" />
                                </div>
                              }
                            />
                          ) : (
                            <Car className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-heading font-bold text-sm text-foreground truncate">
                              {car.carBrand} {car.carModel}
                            </span>
                            <span className={cn('px-2 py-0.5 text-[10px] font-semibold rounded-md border', getOrderStatusColor(car.orderStatus))}>
                              {car.orderStatus}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <PlateBadge plate={car.plateNumber} size="xs" />
                            <span className="text-xs text-muted-foreground truncate">
                              • {car.customerName}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Order Number Badge Linking to Order */}
                      <Link
                        to={`/orders/${car.orderId}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-background border border-border hover:border-amber-500/60 hover:text-amber-600 transition-colors shrink-0"
                      >
                        <span>{car.orderNumber}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                    </div>

                    {/* Assigned Roles & Timestamp Footer */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                          {t('labor.assignedRoles', 'Roles')}:
                        </span>
                        {car.roles.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                          >
                            {role}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-1 shrink-0 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatAppDate(car.assignedAt, true, i18n.language)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Tablet & Mobile Full-Width Bottom Sheet Inspector */}
      {isMobileOrTablet && (
        <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            className="rounded-t-2xl sm:rounded-t-3xl min-h-[50dvh] max-h-[88dvh] border-t border-border bg-card shadow-2xl p-0 overflow-hidden flex flex-col w-full inset-x-0 max-w-none gap-0 focus:outline-none"
          >
            <SheetTitle className="sr-only">
              {activeSelectedEmployee?.name || t('labor.vehiclesWorkedOn', 'Vehicles Worked On')}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {t('labor.subtitle', 'Daily technician activity and vehicle completion tracking')}
            </SheetDescription>

            {/* Drag Handle */}
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

            {/* Sheet Header */}
            {activeSelectedEmployee && (
              <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-border/60 bg-muted/20 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold flex items-center justify-center shrink-0 border border-amber-500/20">
                    {activeSelectedEmployee.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading text-base font-bold text-foreground truncate">
                      {activeSelectedEmployee.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="text-amber-600 dark:text-amber-400 font-bold">
                        {activeSelectedEmployee.carsCount} {activeSelectedEmployee.carsCount === 1 ? t('labor.car', 'Car') : t('labor.cars', 'Cars')}
                      </span>
                      <span>•</span>
                      <span>{activeSelectedEmployee.totalTasks} {t('labor.tasks', 'tasks')}</span>
                    </div>
                  </div>
                </div>

                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="lg"
                  onClick={() => setIsMobileSheetOpen(false)}
                  className="rounded-full"
                >
                  <X className="w-5 h-5" />
                </ActionIcon>
              </div>
            )}

            {/* Scrollable Vehicle List inside Sheet */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-semibold text-foreground">
                  {t('labor.vehiclesWorkedOn', 'Vehicles Worked On')} ({activeSelectedEmployee?.carsWorked.length || 0})
                </span>
                <span>{timeframeBadgeLabel}</span>
              </div>

              {activeSelectedEmployee?.carsWorked.map((car) => (
                <div
                  key={car.orderId}
                  className="p-3.5 bg-muted/30 hover:bg-muted/50 border border-border/70 rounded-xl flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Car Model Image with LazyImage & ImagePreview */}
                      <div className="w-14 h-12 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-center shrink-0 overflow-hidden p-1">
                        {car.carImage || car.brandLogo ? (
                          <LazyImage
                            src={car.carImage || car.brandLogo}
                            alt={`${car.carBrand} ${car.carModel}`}
                            containWithBlur={false}
                            wrapperClassName="w-full h-full bg-transparent flex items-center justify-center cursor-pointer"
                            imgClassName="w-full h-full object-contain hover:scale-105 transition-transform duration-200"
                            onClick={() => setPreviewImage(getImageUrl(car.carImage || car.brandLogo) || null)}
                            fallback={
                              <div className="w-full h-full flex items-center justify-center bg-muted/30">
                                <Car className="w-5 h-5 text-muted-foreground/60" />
                              </div>
                            }
                          />
                        ) : (
                          <Car className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-heading font-bold text-sm text-foreground truncate">
                            {car.carBrand} {car.carModel}
                          </span>
                          <span className={cn('px-2 py-0.5 text-[10px] font-semibold rounded-md border', getOrderStatusColor(car.orderStatus))}>
                            {car.orderStatus}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                          <PlateBadge plate={car.plateNumber} size="xs" />
                          <span className="text-xs text-muted-foreground truncate">
                            • {car.customerName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      to={`/orders/${car.orderId}`}
                      onClick={() => setIsMobileSheetOpen(false)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-background border border-border hover:border-amber-500/60 hover:text-amber-600 transition-colors shrink-0"
                    >
                      <span>{car.orderNumber}</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </Link>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-medium text-muted-foreground shrink-0">
                        {t('labor.assignedRoles', 'Roles')}:
                      </span>
                      {car.roles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                        >
                          {role}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatAppDate(car.assignedAt, true, i18n.language)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Full-screen Zoomable Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage}
      />
    </div>
  );
}
