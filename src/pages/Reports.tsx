import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatCurrency } from '../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns';
import { TrendingUp, Package, Users, BarChart3, Calendar, CalendarRange, Clock } from 'lucide-react';

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'all' | 'custom';

export default function Reports() {
  const { t, i18n } = useTranslation();
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
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
          startDate: startOfMonth(today).toISOString(),
          endDate: endOfMonth(today).toISOString(),
          group: 'day',
        };
      case 'year':
        return {
          startDate: startOfYear(today).toISOString(),
          endDate: endOfYear(today).toISOString(),
          group: 'month',
        };
      case 'custom': {
        const start = customStart ? startOfDay(parseISO(customStart)) : undefined;
        const end = isSingleDayMode && customStart 
          ? endOfDay(parseISO(customStart))
          : customEnd ? endOfDay(parseISO(customEnd)) : undefined;

        const diffDays = start && end ? Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) : 0;
        return {
          startDate: start?.toISOString(),
          endDate: end?.toISOString(),
          group: diffDays > 60 ? 'month' : 'day',
        };
      }
      case 'all':
      default:
        return {};
    }
  };

  const params = getDateParams();

  // Queries
  const { data: revenue } = useQuery({
    queryKey: ['reports', 'revenue', params],
    queryFn: async () => (await api.get('/reports/revenue', { params })).data,
  });

  const { data: topServices } = useQuery({
    queryKey: ['reports', 'top-services', params],
    queryFn: async () => (await api.get('/reports/top-services', { params })).data,
  });

  const { data: topMaterials } = useQuery({
    queryKey: ['reports', 'top-materials', params],
    queryFn: async () => (await api.get('/reports/top-materials', { params })).data,
  });

  const { data: stockValuation } = useQuery({
    queryKey: ['reports', 'inventory-valuation'],
    queryFn: async () => (await api.get('/reports/inventory-valuation')).data,
  });

  const { data: staffWorkload } = useQuery({
    queryKey: ['reports', 'staff-workload', params],
    queryFn: async () => (await api.get('/reports/staff-workload', { params })).data,
  });

  // Calculate totals
  const totalRevenue = revenue?.reduce((sum: number, item: any) => sum + item.orderRevenue + item.directSaleRevenue, 0) || 0;
  const totalValuation = stockValuation?.summary?.reduce((sum: number, item: any) => sum + item.totalValue, 0) || 0;
  const topServiceCount = topServices?.[0]?.count || 0;
  
  // Find max for simple CSS charts
  const maxRevenue = revenue?.reduce((max: number, item: any) => Math.max(max, item.orderRevenue + item.directSaleRevenue), 0) || 1;

  const presets: { key: DatePreset; label: string }[] = [
    { key: 'today', label: t('reports.timeframe.today', 'Today') },
    { key: 'yesterday', label: t('reports.timeframe.yesterday', 'Yesterday') },
    { key: 'week', label: t('reports.timeframe.week', 'Last 7 Days') },
    { key: 'month', label: t('reports.timeframe.month', 'This Month') },
    { key: 'year', label: t('reports.timeframe.year', 'This Year') },
    { key: 'all', label: t('reports.timeframe.all', 'All Time') },
    { key: 'custom', label: t('reports.timeframe.custom', 'Custom Range') },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {t('reports.title', 'Reports & Analytics')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('reports.subtitle', 'Real-time business insights and performance metrics.')}
          </p>
        </div>

        {/* Mobile quick dropdown */}
        <div className="md:hidden w-full">
          <Select value={datePreset} onValueChange={v => setDatePreset(v as DatePreset)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('reports.timeframe.placeholder', 'Select timeframe')} />
            </SelectTrigger>
            <SelectContent>
              {presets.map(p => (
                <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preset Pills Filter Bar */}
      <div className="bg-card border border-border p-2 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {presets.map(p => {
            const isActive = datePreset === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setDatePreset(p.key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#c9a84c] text-white shadow-sm ring-2 ring-[#c9a84c]/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                {p.key === 'today' && <Clock className="w-3.5 h-3.5" />}
                {p.key === 'custom' && <CalendarRange className="w-3.5 h-3.5" />}
                {p.key !== 'today' && p.key !== 'custom' && <Calendar className="w-3.5 h-3.5" />}
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Custom Range / Single Day Expandable Bar */}
        {datePreset === 'custom' && (
          <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200 bg-muted/20 p-3 rounded-xl">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={isSingleDayMode ? 'default' : 'outline'}
                  onClick={() => {
                    const nextMode = !isSingleDayMode;
                    setIsSingleDayMode(nextMode);
                    if (nextMode) {
                      setCustomEnd(customStart);
                    }
                  }}
                  className={`h-8 text-xs font-medium rounded-lg ${
                    isSingleDayMode ? 'bg-[#c9a84c] hover:bg-[#b89842] text-white' : ''
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 mr-1" />
                  {t('reports.timeframe.singleDay', 'Single Day')}
                </Button>
              </div>

              {isSingleDayMode ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">
                    {t('reports.timeframe.selectSingleDay', 'Pick a Day')}:
                  </span>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => {
                      setCustomStart(e.target.value);
                      setCustomEnd(e.target.value);
                    }}
                    className="h-8 w-40 text-xs rounded-lg bg-background"
                  />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground font-medium">
                      {t('reports.timeframe.from', 'From')}:
                    </span>
                    <Input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="h-8 w-38 text-xs rounded-lg bg-background"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground font-medium">
                      {t('reports.timeframe.to', 'To')}:
                    </span>
                    <Input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="h-8 w-38 text-xs rounded-lg bg-background"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground bg-background px-3 py-1.5 rounded-md border shadow-2xs font-medium">
              {isSingleDayMode && customStart ? (
                <span>{format(parseISO(customStart), 'MMM d, yyyy')}</span>
              ) : customStart && customEnd ? (
                <span>
                  {format(parseISO(customStart), 'MMM d, yyyy')} – {format(parseISO(customEnd), 'MMM d, yyyy')}
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-[#c9a84c]/10 to-transparent border-[#c9a84c]/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.kpi.totalRevenue', 'Total Revenue')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-[#c9a84c]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#c9a84c]">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('reports.kpi.forPeriod', 'For selected period')}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.kpi.stockValuation', 'Stock Valuation')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValuation)}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('reports.kpi.currentTotalValue', 'Current total value')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.kpi.topServiceSales', 'Top Service Sales')}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topServiceCount} <span className="text-lg font-normal text-muted-foreground">{t('reports.kpi.jobsCount', '{{count}} jobs', { count: 0 }).replace(/^[0-9\s]+/, '').trim() || 'jobs'}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{getLocName(topServices?.[0]) || t('common.unknown', 'N/A')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('reports.kpi.activeStaff', 'Active Staff')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffWorkload?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{t('reports.kpi.involvedInOrders', 'Involved in orders')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Revenue Chart */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>{t('reports.charts.revenueTrend', 'Revenue Trend')}</CardTitle>
          </CardHeader>
          <CardContent>
            {(!revenue || revenue.length === 0) ? (
              <div className="h-[300px] w-full flex flex-col items-center justify-center text-center gap-2">
                <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mb-1">
                  <BarChart3 className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('reports.charts.noRevenue', 'No revenue data found.')}
                </p>
              </div>
            ) : (
              <div className="h-[300px] w-full flex items-end gap-2 pt-4">
                {revenue.map((item: any) => {
                  const total = item.orderRevenue + item.directSaleRevenue;
                  const heightPct = Math.max((total / maxRevenue) * 100, 2); // min 2% height
                  
                  return (
                    <div key={item.date} className="flex-1 flex flex-col justify-end group relative h-full">
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap transition-opacity z-10 pointer-events-none shadow-md border border-gray-700">
                        {item.date}: {formatCurrency(total)}
                      </div>
                      <div className="w-full bg-[#c9a84c] rounded-t-sm transition-all duration-500 ease-out" style={{ height: `${heightPct}%` }} />
                      {/* Only show labels if not too many bars */}
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
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t('reports.top.title', 'Top Services & Items')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">{t('common.services', 'Services')}</h4>
              <div className="space-y-3">
                {topServices?.slice(0,3).map((s: any) => (
                  <div key={s.name} className="flex items-center justify-between">
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-medium line-clamp-1">{getLocName(s)}</p>
                      <p className="text-xs text-muted-foreground">{t('reports.top.jobsCount', '{{count}} jobs', { count: s.count })}</p>
                    </div>
                    <div className="text-sm font-semibold text-right">
                      {formatCurrency(s.revenue)}
                    </div>
                  </div>
                ))}
                {topServices?.length === 0 && <p className="text-sm text-muted-foreground">{t('reports.top.noServiceData', 'No service data.')}</p>}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">{t('reports.top.materialsItems', 'Materials/Items')}</h4>
              <div className="space-y-3">
                {topMaterials?.slice(0,3).map((m: any) => (
                  <div key={m.name} className="flex items-center justify-between">
                    <div className="flex-1 pr-4">
                      <p className="text-sm font-medium line-clamp-1">{getLocName(m)}</p>
                      <p className="text-xs text-muted-foreground">{t('reports.top.unitsSold', '{{count}} units sold', { count: m.count })}</p>
                    </div>
                    <div className="text-sm font-semibold text-right">
                      {formatCurrency(m.revenue)}
                    </div>
                  </div>
                ))}
                {topMaterials?.length === 0 && <p className="text-sm text-muted-foreground">{t('reports.top.noMaterialData', 'No material data.')}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Staff Workload */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.staff.workload', 'Staff Workload')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {staffWorkload?.map((staff: any) => (
                <div key={staff.name} className="flex flex-col">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-sm">{staff.name}</span>
                    <span className="text-sm font-bold">{t('reports.staff.tasksCount', '{{count}} tasks', { count: staff.total })}</span>
                  </div>
                  <div className="flex gap-1 h-2 rounded overflow-hidden">
                    {/* Render color bars per role just as visual flair */}
                    {Object.entries(staff.roles).map(([role, count]: any, i) => {
                      const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
                      const width = `${(count / staff.total) * 100}%`;
                      return <div key={role} title={`${role}: ${count}`} className={`${colors[i % colors.length]}`} style={{ width }} />
                    })}
                  </div>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {Object.entries(staff.roles).map(([role, count]: any, i) => {
                      const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
                      return (
                        <span key={role} className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
                          {role} ({count})
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
              {staffWorkload?.length === 0 && <p className="text-sm text-muted-foreground">{t('reports.staff.noAssignments', 'No staff assignments in this period.')}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Inventory Valuation Details */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.store.storeValuations', 'Store Valuations')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stockValuation?.summary?.map((store: any) => (
                <div key={store.storeName} className="flex justify-between items-center p-3 border rounded-lg bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-md shadow-sm border">
                      <Package className="w-5 h-5 text-[#c9a84c]" />
                    </div>
                    <div>
                      <p className="font-semibold">{getLocalizedStoreName(store.storeName)}</p>
                      <p className="text-xs text-muted-foreground">{t('reports.store.currentAssets', 'Current Assets')}</p>
                    </div>
                  </div>
                  <div className="font-bold text-lg">
                    {formatCurrency(store.totalValue)}
                  </div>
                </div>
              ))}
              
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">{t('reports.store.topValueAssets', 'Top Value Assets')}</h4>
                <div className="space-y-2">
                  {stockValuation?.details?.slice(0, 4).map((d: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="truncate pr-4 text-muted-foreground">{d.quantity}x {getLocMaterialName(d)}</span>
                      <span className="font-medium">{formatCurrency(d.totalValue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

