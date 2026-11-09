import { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  ActionIcon,
  Tooltip,
  Select as MantineSelect,
  TextInput,
  SegmentedControl,
  SimpleGrid,
  Button as MantineButton,
} from '@mantine/core';
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  ClipboardCheck,
  ShoppingBag,
  Wrench,
  Calendar,
  Store,
  User,
  Copy,
  Check,
  Eye,
  DollarSign,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';

import api from '../lib/api';
import { formatCurrency, formatAppDate, formatBrandSizeLabel } from '../lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSearch,
} from '../components/DataTable';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { PageHeader, TablePagination, StatCard, AppDatePicker } from '../components/common';

export interface UnifiedStockHistoryItem {
  id: string;
  type: 'RESTOCK' | 'ADJUSTMENT' | 'TRANSFER' | 'COUNT' | 'DIRECT_SALE' | 'ORDER';
  date: string | Date;
  materialId: string;
  materialNameEn: string;
  materialNameAm: string;
  itemCode: string;
  unit: string;
  store: string;
  storeType: string;
  brandName?: string | null;
  sizeName?: string | null;
  colorName?: string | null;
  typeName?: string | null;
  quantity: string;
  quantityNum: number;
  unitPrice?: number | null;
  totalPrice?: number | null;
  detail?: string | null;
  user: string;
  notes?: string | null;
  metadata?: any;
}

export default function StockHistory() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state initialization
  const urlMaterial = searchParams.get('materialId') || 'ALL';
  const urlType = searchParams.get('type') || 'ALL';
  const urlStore = searchParams.get('storeType') || 'ALL';
  const urlSearch = searchParams.get('search') || '';
  const urlStartDate = searchParams.get('startDate') || '';
  const urlEndDate = searchParams.get('endDate') || '';
  const urlMinPrice = searchParams.get('minPrice') || '';
  const urlMaxPrice = searchParams.get('maxPrice') || '';
  const urlPage = parseInt(searchParams.get('page') || '1', 10);
  const urlLimit = parseInt(searchParams.get('limit') || '25', 10);
  const urlDateMode = (searchParams.get('dateMode') as 'range' | 'single') || 'range';

  // State
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [materialFilter, setMaterialFilter] = useState(urlMaterial);
  const [typeFilter, setTypeFilter] = useState(urlType);
  const [storeFilter, setStoreFilter] = useState(urlStore);
  const [dateMode, setDateMode] = useState<'range' | 'single'>(urlDateMode);
  const [startDate, setStartDate] = useState<Date | null>(urlStartDate ? new Date(urlStartDate) : null);
  const [endDate, setEndDate] = useState<Date | null>(urlEndDate ? new Date(urlEndDate) : null);
  const [singleDate, setSingleDate] = useState<Date | null>(urlStartDate ? new Date(urlStartDate) : null);
  const [minPrice, setMinPrice] = useState(urlMinPrice);
  const [maxPrice, setMaxPrice] = useState(urlMaxPrice);
  const [currentPage, setCurrentPage] = useState(urlPage);
  const [itemsPerPage, setItemsPerPage] = useState(urlLimit);
  const [showFiltersPanel, setShowFiltersPanel] = useState(
    Boolean(urlMinPrice || urlMaxPrice || urlStartDate || urlEndDate || urlMaterial !== 'ALL' || urlStore !== 'ALL')
  );

  // Selected item for modal
  const [selectedRecord, setSelectedRecord] = useState<UnifiedStockHistoryItem | null>(null);

  // Click to copy state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const formatPrice = (v: any) => formatCurrency(v, i18n.language === 'am' ? 'am' : 'en');

  const handleCopyItemCode = (code?: string) => {
    if (!code) return;
    const onCopied = () => {
      setCopiedCode(code);
      toast.success(t('materials.itemCodeCopied', 'Item code {{code}} copied to clipboard', { code }));
      setTimeout(() => {
        setCopiedCode((prev) => (prev === code ? null : prev));
      }, 2000);
    };

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(onCopied).catch(() => {
        try {
          const textArea = document.createElement('textarea');
          textArea.value = code;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          textArea.remove();
          onCopied();
        } catch {
          toast.error(t('common.copyFailed', 'Failed to copy to clipboard'));
        }
      });
    } else {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        onCopied();
      } catch {
        toast.error(t('common.copyFailed', 'Failed to copy to clipboard'));
      }
    }
  };

  // Fetch materials for filter dropdown
  const { data: materials = [] } = useQuery({
    queryKey: ['catalog-materials-list'],
    queryFn: async () => {
      const res = await api.get('/catalog/materials');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const materialOptions = useMemo(() => {
    const list = [
      { value: 'ALL', label: t('storage.allMaterials', 'All Materials') },
    ];
    for (const m of materials) {
      const locName = i18n.language === 'am' && m.nameAm ? m.nameAm : m.nameEn;
      const codePrefix = m.itemCode ? `[${m.itemCode}] ` : '';
      list.push({
        value: m.id,
        label: `${codePrefix}${locName}`,
      });
    }
    return list;
  }, [materials, i18n.language, t]);

  // Query stock history
  const queryParams = useMemo(() => {
    const params: any = {
      page: currentPage,
      limit: itemsPerPage,
    };
    if (materialFilter && materialFilter !== 'ALL') params.materialId = materialFilter;
    if (typeFilter && typeFilter !== 'ALL') params.type = typeFilter;
    if (storeFilter && storeFilter !== 'ALL') params.storeType = storeFilter;
    if (searchTerm.trim()) params.search = searchTerm.trim();

    if (dateMode === 'single' && singleDate) {
      const dStr = singleDate.toISOString().slice(0, 10);
      params.startDate = dStr;
      params.endDate = dStr;
    } else if (dateMode === 'range') {
      if (startDate) params.startDate = startDate.toISOString().slice(0, 10);
      if (endDate) params.endDate = endDate.toISOString().slice(0, 10);
    }

    if (minPrice && !isNaN(Number(minPrice))) params.minPrice = Number(minPrice);
    if (maxPrice && !isNaN(Number(maxPrice))) params.maxPrice = Number(maxPrice);

    return params;
  }, [
    currentPage,
    itemsPerPage,
    materialFilter,
    typeFilter,
    storeFilter,
    searchTerm,
    dateMode,
    singleDate,
    startDate,
    endDate,
    minPrice,
    maxPrice,
  ]);

  const {
    data,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['stock-history-all', queryParams],
    queryFn: async () => {
      const res = await api.get('/storage/history', { params: queryParams });
      return res.data;
    },
  });

  const historyItems: UnifiedStockHistoryItem[] = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const summary = data?.summary || {
    totalMovements: 0,
    totalRestocksCount: 0,
    totalRestockQty: 0,
    totalRestockExpenditure: 0,
    totalDeductionsCount: 0,
    totalDeductionQty: 0,
    totalSalesRevenue: 0,
    totalTransfersCount: 0,
    totalAdjustmentsCount: 0,
  };

  // Reset filters handler
  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setMaterialFilter('ALL');
    setTypeFilter('ALL');
    setStoreFilter('ALL');
    setStartDate(null);
    setEndDate(null);
    setSingleDate(null);
    setMinPrice('');
    setMaxPrice('');
    setCurrentPage(1);
    setSearchParams({});
  }, [setSearchParams]);

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
      materialFilter !== 'ALL' ||
      typeFilter !== 'ALL' ||
      storeFilter !== 'ALL' ||
      startDate ||
      endDate ||
      singleDate ||
      minPrice ||
      maxPrice
  );

  // Quick Date Presets
  const handleApplyPreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    const now = new Date();
    if (preset === 'all') {
      setStartDate(null);
      setEndDate(null);
      setSingleDate(null);
      setCurrentPage(1);
      return;
    }
    if (preset === 'today') {
      setDateMode('single');
      setSingleDate(now);
      setStartDate(now);
      setEndDate(now);
      setCurrentPage(1);
      return;
    }
    if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      setDateMode('single');
      setSingleDate(y);
      setStartDate(y);
      setEndDate(y);
      setCurrentPage(1);
      return;
    }
    if (preset === 'week') {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      setDateMode('range');
      setStartDate(weekStart);
      setEndDate(now);
      setCurrentPage(1);
      return;
    }
    if (preset === 'month') {
      const monthStart = new Date();
      monthStart.setDate(monthStart.getDate() - 30);
      setDateMode('range');
      setStartDate(monthStart);
      setEndDate(now);
      setCurrentPage(1);
      return;
    }
  };

  const getLocMaterialName = (item: UnifiedStockHistoryItem) => {
    if (i18n.language === 'am' && item.materialNameAm) return item.materialNameAm;
    return item.materialNameEn;
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'RESTOCK':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
            <ArrowDownLeft className="w-3 h-3 shrink-0" />
            <span>{t('storage.typeRestock', 'Restock')}</span>
          </span>
        );
      case 'TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 whitespace-nowrap">
            <ArrowRightLeft className="w-3 h-3 shrink-0" />
            <span>{t('storage.typeTransfer', 'Transfer')}</span>
          </span>
        );
      case 'ADJUSTMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 whitespace-nowrap">
            <SlidersHorizontal className="w-3 h-3 shrink-0" />
            <span>{t('storage.typeAdjustment', 'Adjustment')}</span>
          </span>
        );
      case 'COUNT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 whitespace-nowrap">
            <ClipboardCheck className="w-3 h-3 shrink-0" />
            <span>{t('storage.typeCount', 'Audit Count')}</span>
          </span>
        );
      case 'DIRECT_SALE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
            <ShoppingBag className="w-3 h-3 shrink-0" />
            <span>{t('storage.typeDirectSale', 'Direct Sale')}</span>
          </span>
        );
      case 'ORDER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 whitespace-nowrap">
            <Wrench className="w-3 h-3 shrink-0" />
            <span>{t('storage.typeOrder', 'Workshop Order')}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border whitespace-nowrap">
            <span>{type}</span>
          </span>
        );
    }
  };

  const getStoreBadge = (storeName: string) => {
    const isMain = storeName.toUpperCase().includes('MAIN') && !storeName.includes('→');
    const isMini = storeName.toUpperCase().includes('MINI') && !storeName.includes('→');
    const isTransfer = storeName.includes('→');

    if (isTransfer) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 whitespace-nowrap">
          {storeName}
        </span>
      );
    }
    if (isMain) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 whitespace-nowrap">
          {t('storage.mainStore', 'Main Store')}
        </span>
      );
    }
    if (isMini) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-secondary text-foreground border border-border whitespace-nowrap">
          {t('storage.miniStore', 'Mini Store')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-muted text-muted-foreground border border-border whitespace-nowrap">
        {storeName}
      </span>
    );
  };

  const typeOptions = [
    { value: 'ALL', label: t('storage.allTypes', 'All Movement Types') },
    { value: 'RESTOCK', label: t('storage.typeRestock', 'Restock / Purchase') },
    { value: 'TRANSFER', label: t('storage.typeTransfer', 'Store Transfer') },
    { value: 'ADJUSTMENT', label: t('storage.typeAdjustment', 'Adjustment') },
    { value: 'COUNT', label: t('storage.typeCount', 'Physical Count') },
    { value: 'DIRECT_SALE', label: t('storage.typeDirectSale', 'Direct Sale (POS)') },
    { value: 'ORDER', label: t('storage.typeOrder', 'Workshop Order') },
  ];

  const storeOptions = [
    { value: 'ALL', label: t('storage.allStores', 'All Stores') },
    { value: 'MAIN', label: t('storage.mainStore', 'Main Store') },
    { value: 'MINI', label: t('storage.miniStore', 'Mini Store') },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title={t('storage.stockHistoryTitle', 'Stock Movement History')}
        subtitle={t('storage.stockHistorySubtitle', 'Complete timeline of stock restocks, transfers, adjustments, audits, and sales deductions.')}
        badge={total ? `${total} Movements` : undefined}
        hideSubtitleOnMobile
        hideBadgeOnMobile
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        refreshTooltip={t('common.refresh', 'Refresh')}
        action={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto [&_button]:!w-full sm:[&_button]:!w-auto">
            <MantineButton
              variant="light"
              color="amber"
              size="sm"
              radius="md"
              leftSection={<Store size={15} />}
              onClick={() => navigate('/storage')}
              className="!w-full sm:!w-auto justify-center font-semibold transition-all duration-200"
              style={{
                height: 36,
                fontSize: '13px',
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                border: '1px solid rgba(245, 158, 11, 0.35)',
                backgroundColor: 'rgba(245, 158, 11, 0.10)',
              }}
            >
              {t('storage.title', 'Storage & Inventory')}
            </MantineButton>
            <MantineButton
              variant="light"
              color="blue"
              size="sm"
              radius="md"
              leftSection={<ShoppingBag size={15} />}
              onClick={() => navigate('/direct-sales/history')}
              className="!w-full sm:!w-auto justify-center font-semibold transition-all duration-200"
              style={{
                height: 36,
                fontSize: '13px',
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                border: '1px solid rgba(59, 130, 246, 0.35)',
                backgroundColor: 'rgba(59, 130, 246, 0.10)',
              }}
            >
              {t('directSales.history', 'Direct Sales History')}
            </MantineButton>
          </div>
        }
      />

      {/* 2. Top Summary KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <StatCard
          title={t('storage.totalMovements', 'Total Movements')}
          value={summary.totalMovements.toLocaleString()}
          subtitle={t('storage.allTime', 'Filtered Results')}
          icon={<History className="w-5 h-5 text-amber-500" />}
          iconColor="amber"
        />
        <StatCard
          title={t('storage.totalRestocks', 'Total Restocks')}
          value={`+${summary.totalRestockQty.toLocaleString()}`}
          subtitle={`${summary.totalRestocksCount} ${t('storage.typeRestock', 'Restocks')} • ${formatPrice(summary.totalRestockExpenditure)}`}
          icon={<ArrowDownLeft className="w-5 h-5 text-emerald-500" />}
          iconColor="teal"
        />
        <StatCard
          title={t('storage.totalDeductions', 'Total Deductions')}
          value={`-${summary.totalDeductionQty.toLocaleString()}`}
          subtitle={`${summary.totalDeductionsCount} ${t('common.actions', 'Orders & POS')} • ${formatPrice(summary.totalSalesRevenue)}`}
          icon={<ArrowUpRight className="w-5 h-5 text-purple-500" />}
          iconColor="violet"
        />
        <StatCard
          title={t('storage.netAdjustments', 'Audits & Transfers')}
          value={`${summary.totalTransfersCount + summary.totalAdjustmentsCount}`}
          subtitle={`${summary.totalTransfersCount} ${t('storage.typeTransfer', 'Transfers')} • ${summary.totalAdjustmentsCount} ${t('storage.typeAdjustment', 'Adjustments')}`}
          icon={<ArrowRightLeft className="w-5 h-5 text-blue-500" />}
          iconColor="blue"
        />
      </SimpleGrid>

      {/* 3. Main Filter Card */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden p-4 space-y-4">
        {/* Primary Filter Row */}
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          <TableSearch
            value={searchTerm}
            onChange={(val) => {
              setSearchTerm(val);
              setCurrentPage(1);
            }}
            placeholder={t('storage.searchPlaceholder', 'Search by order #, receipt #, material, staff, customer...')}
            className="w-full lg:w-[380px]"
          />

          <div className="flex flex-wrap items-center gap-2.5">
            <MantineSelect
              data={materialOptions}
              value={materialFilter}
              onChange={(val) => {
                setMaterialFilter(val || 'ALL');
                setCurrentPage(1);
              }}
              searchable
              clearable={false}
              placeholder={t('storage.filterByMaterial', 'Filter by Material')}
              className="w-full sm:w-[220px]"
              size="sm"
            />

            <MantineSelect
              data={typeOptions}
              value={typeFilter}
              onChange={(val) => {
                setTypeFilter(val || 'ALL');
                setCurrentPage(1);
              }}
              clearable={false}
              className="w-[170px]"
              size="sm"
            />

            <MantineSelect
              data={storeOptions}
              value={storeFilter}
              onChange={(val) => {
                setStoreFilter(val || 'ALL');
                setCurrentPage(1);
              }}
              clearable={false}
              className="w-[140px]"
              size="sm"
            />

            <Button
              variant={showFiltersPanel ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className="h-[36px] text-xs gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{t('reports.customRange', 'More Filters')}</span>
              {(minPrice || maxPrice || startDate || endDate || singleDate) && (
                <Badge size="xs" color="amber" circle>
                  !
                </Badge>
              )}
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-[36px] text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1"
                title={t('storage.resetFilters', 'Reset Filters')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('storage.resetFilters', 'Reset')}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Collapsible Secondary Filters (Dates & Price Range) */}
        {showFiltersPanel && (
          <div className="pt-3 border-t border-border/60 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end bg-muted/20 p-3 rounded-lg animate-in slide-in-from-top-2 duration-200">
            {/* Date Mode & Presets */}
            <div className="md:col-span-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>{t('storage.date', 'Date')}</span>
                </span>
                <SegmentedControl
                  value={dateMode}
                  onChange={(val) => {
                    setDateMode(val as 'range' | 'single');
                    setCurrentPage(1);
                  }}
                  data={[
                    { label: t('storage.dateRange', 'Range'), value: 'range' },
                    { label: t('storage.singleDay', 'Single Date'), value: 'single' },
                  ]}
                  size="xs"
                />
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-1">
                {(['all', 'today', 'yesterday', 'week', 'month'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2 py-0.5 text-[11px] rounded bg-muted hover:bg-muted/80 text-foreground border border-border cursor-pointer transition-colors"
                  >
                    {preset === 'all' && t('storage.allTime', 'All')}
                    {preset === 'today' && t('storage.presetToday', 'Today')}
                    {preset === 'yesterday' && t('storage.presetYesterday', 'Yesterday')}
                    {preset === 'week' && t('storage.presetWeek', 'This Week')}
                    {preset === 'month' && t('storage.presetMonth', 'This Month')}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Pickers */}
            <div className="md:col-span-4 space-y-1.5">
              {dateMode === 'single' ? (
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground mb-1 block">
                    {t('storage.singleDay', 'Specific Date')}
                  </span>
                  <AppDatePicker
                    value={singleDate}
                    onChange={(d) => {
                      setSingleDate(d);
                      setCurrentPage(1);
                    }}
                    placeholder={t('storage.singleDay', 'Select date...')}
                    size="small"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground mb-1 block">
                      {t('reports.startDate', 'Start Date')}
                    </span>
                    <AppDatePicker
                      value={startDate}
                      onChange={(d) => {
                        setStartDate(d);
                        setCurrentPage(1);
                      }}
                      placeholder={t('reports.startDate', 'Start')}
                      size="small"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-muted-foreground mb-1 block">
                      {t('reports.endDate', 'End Date')}
                    </span>
                    <AppDatePicker
                      value={endDate}
                      onChange={(d) => {
                        setEndDate(d);
                        setCurrentPage(1);
                      }}
                      placeholder={t('reports.endDate', 'End')}
                      size="small"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Price Range Filter */}
            <div className="md:col-span-3 space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground mb-1 block flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-amber-500" />
                <span>{t('storage.price', 'Price')} (ETB)</span>
              </span>
              <div className="grid grid-cols-2 gap-2">
                <TextInput
                  type="number"
                  placeholder={t('storage.minPrice', 'Min')}
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    setCurrentPage(1);
                  }}
                  size="xs"
                />
                <TextInput
                  type="number"
                  placeholder={t('storage.maxPrice', 'Max')}
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value);
                    setCurrentPage(1);
                  }}
                  size="xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Movements Data Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[130px] px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {t('storage.type', 'Type')}
              </TableHead>
              <TableHead className="w-[240px] max-w-[260px] px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {t('common.material', 'Material')}
              </TableHead>
              <TableHead className="w-[150px] px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {t('materials.brands', 'Attributes')}
              </TableHead>
              <TableHead className="w-[130px] px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {t('storage.store', 'Store')}
              </TableHead>
              <TableHead className="w-[130px] px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {t('storage.quantity', 'Quantity')}
              </TableHead>
              <TableHead className="w-[120px] px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {t('storage.price', 'Unit / Value')}
              </TableHead>
              <TableHead className="w-[110px] px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {t('storage.user', 'Staff')}
              </TableHead>
              <TableHead className="w-[60px] text-right px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                {t('common.actions', 'Action')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-sm">
                  {t('storage.loading', 'Loading stock history...')}
                </TableCell>
              </TableRow>
            ) : historyItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 space-y-3">
                  <div className="flex flex-col items-center justify-center">
                    <History className="w-10 h-10 text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-semibold text-foreground">
                      {t('storage.noHistoryFound', 'No stock movements found matching your filters.')}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleResetFilters}
                        className="text-xs text-primary mt-1"
                      >
                        {t('storage.resetFilters', 'Clear all filters')}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              historyItems.map((item) => {
                const isPositive = item.quantity.startsWith('+');
                const isNegative = item.quantity.startsWith('-');

                return (
                  <TableRow
                    key={`${item.type}-${item.id}`}
                    className="hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => setSelectedRecord(item)}
                  >
                    {/* Type */}
                    <TableCell className="w-[130px] px-3 py-2.5 whitespace-nowrap">
                      {getTypeBadge(item.type)}
                    </TableCell>

                    {/* Material & itemCode */}
                    <TableCell className="w-[240px] max-w-[260px] px-3 py-2.5">
                      <div className="max-w-[250px]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[13px] font-semibold text-foreground leading-snug whitespace-nowrap truncate max-w-[150px]"
                            title={getLocMaterialName(item)}
                          >
                            {getLocMaterialName(item)}
                          </span>
                          {item.itemCode && (
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyItemCode(item.itemCode);
                              }}
                              title={t('materials.clickToCopyCode', 'Click to copy item code')}
                              className="group inline-flex items-center gap-1 max-w-[95px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border cursor-pointer transition-all active:scale-95 shadow-xs shrink-0"
                            >
                              <span className="inline-block min-w-0 overflow-x-auto whitespace-nowrap scrollbar-none no-scrollbar font-mono text-[10px] font-medium py-0.5">
                                {item.itemCode}
                              </span>
                              {copiedCode === item.itemCode ? (
                                <Check className="h-2.5 w-2.5 text-emerald-500 shrink-0 animate-in zoom-in-50" />
                              ) : (
                                <Copy className="h-2.5 w-2.5 text-muted-foreground group-hover:text-foreground shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground leading-snug mt-0.5 whitespace-nowrap truncate max-w-[240px]">
                          {i18n.language === 'am' ? item.materialNameEn : item.materialNameAm} • {item.unit}
                        </div>
                      </div>
                    </TableCell>

                    {/* Attributes */}
                    <TableCell className="w-[150px] px-3 py-2.5 whitespace-nowrap">
                      {item.brandName || item.sizeName || item.colorName || item.typeName ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-medium">
                          {formatBrandSizeLabel({
                            name: item.brandName || '',
                            size: item.sizeName,
                            color: item.colorName,
                            type: item.typeName,
                          })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>

                    {/* Store */}
                    <TableCell className="w-[130px] px-3 py-2.5 whitespace-nowrap">
                      {getStoreBadge(item.store)}
                    </TableCell>

                    {/* Quantity */}
                    <TableCell className="w-[130px] px-3 py-2.5 whitespace-nowrap font-mono text-xs font-bold">
                      <span
                        className={
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isNegative
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-foreground'
                        }
                      >
                        {item.quantity} {item.unit}
                      </span>
                    </TableCell>

                    {/* Price / Value */}
                    <TableCell className="w-[120px] px-3 py-2.5 whitespace-nowrap text-xs font-mono">
                      {item.unitPrice ? (
                        <div>
                          <div className="font-semibold text-foreground">{formatPrice(item.unitPrice)}</div>
                          {item.totalPrice && (
                            <div className="text-[10px] text-muted-foreground">
                              {formatPrice(item.totalPrice)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    {/* Staff */}
                    <TableCell className="w-[110px] px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                        <span className="truncate max-w-[90px]">{item.user}</span>
                      </div>
                    </TableCell>

                    {/* Action */}
                    <TableCell className="w-[60px] text-right px-3 py-2.5 whitespace-nowrap">
                      <Tooltip label={t('storage.viewDetail', 'View Details')}>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecord(item);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </ActionIcon>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* 5. Pagination */}
        <div className="p-4 border-t border-border bg-card">
          <TablePagination
            page={currentPage}
            total={total}
            pageSize={itemsPerPage}
            totalPages={totalPages}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(ps) => {
              setItemsPerPage(ps);
              setCurrentPage(1);
            }}
            pageSizeOptions={['10', '25', '50', '100']}
            itemLabel={t('common.movements', 'Movements')}
          />
        </div>
      </div>

      {/* 6. Detailed View Modal */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="header-modal sm:max-w-[540px]">
          <DialogHeader>
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                {selectedRecord && getTypeBadge(selectedRecord.type)}
                <DialogTitle className="text-base font-bold text-foreground">
                  {t('storage.historyDetail', 'Movement Detail')}
                </DialogTitle>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {selectedRecord && formatAppDate(selectedRecord.date, true, i18n.language)}
              </span>
            </div>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4 py-3 text-sm">
              {/* Material Capsule */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground text-sm leading-snug">
                    {getLocMaterialName(selectedRecord)}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {i18n.language === 'am' ? selectedRecord.materialNameEn : selectedRecord.materialNameAm} • {selectedRecord.unit}
                  </p>
                </div>
                {selectedRecord.itemCode && (
                  <span
                    onClick={() => handleCopyItemCode(selectedRecord.itemCode)}
                    className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border cursor-pointer hover:bg-muted/80"
                    title="Click to copy"
                  >
                    {selectedRecord.itemCode}
                  </span>
                )}
              </div>

              {/* Movement Details Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border border-border bg-card">
                <div>
                  <span className="text-xs text-muted-foreground block">{t('storage.quantity', 'Quantity')}</span>
                  <span className="text-sm font-mono font-bold text-foreground mt-0.5 block">
                    {selectedRecord.quantity} {selectedRecord.unit}
                  </span>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block">{t('storage.store', 'Store')}</span>
                  <span className="mt-0.5 block">{getStoreBadge(selectedRecord.store)}</span>
                </div>

                {selectedRecord.unitPrice && (
                  <div>
                    <span className="text-xs text-muted-foreground block">{t('storage.price', 'Unit Price')}</span>
                    <span className="text-sm font-mono font-semibold text-foreground mt-0.5 block">
                      {formatPrice(selectedRecord.unitPrice)}
                    </span>
                  </div>
                )}

                {selectedRecord.totalPrice && (
                  <div>
                    <span className="text-xs text-muted-foreground block">{t('reports.revenue', 'Total Value')}</span>
                    <span className="text-sm font-mono font-bold text-foreground mt-0.5 block">
                      {formatPrice(selectedRecord.totalPrice)}
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-xs text-muted-foreground block">{t('storage.user', 'Recorded By')}</span>
                  <span className="text-xs font-medium text-foreground mt-0.5 block flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    {selectedRecord.user}
                  </span>
                </div>

                {selectedRecord.detail && (
                  <div>
                    <span className="text-xs text-muted-foreground block">{t('storage.details', 'Details')}</span>
                    <span className="text-xs font-medium text-foreground mt-0.5 block">
                      {selectedRecord.detail}
                    </span>
                  </div>
                )}
              </div>

              {/* Variation Attributes if present */}
              {(selectedRecord.brandName || selectedRecord.sizeName || selectedRecord.colorName || selectedRecord.typeName) && (
                <div className="p-3 rounded-lg border border-border bg-card space-y-1">
                  <span className="text-xs text-muted-foreground block">{t('materials.brands', 'Variation Attributes')}</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedRecord.brandName && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                        Brand: {selectedRecord.brandName}
                      </span>
                    )}
                    {selectedRecord.sizeName && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary text-foreground border border-border">
                        Size: {selectedRecord.sizeName}
                      </span>
                    )}
                    {selectedRecord.colorName && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary text-foreground border border-border">
                        Color: {selectedRecord.colorName}
                      </span>
                    )}
                    {selectedRecord.typeName && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-secondary text-foreground border border-border">
                        Type: {selectedRecord.typeName}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Context Specific Metadata */}
              {selectedRecord.metadata && Object.keys(selectedRecord.metadata).length > 0 && (
                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    {selectedRecord.type === 'DIRECT_SALE'
                      ? t('storage.saleInfo', 'Direct Sale Information')
                      : selectedRecord.type === 'ORDER'
                      ? t('storage.orderInfo', 'Work Order Information')
                      : t('storage.details', 'Additional Details')}
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {selectedRecord.metadata.number && (
                      <div>
                        <span className="text-muted-foreground">{t('storage.refNumber', 'Reference #')}:</span>
                        <p className="font-semibold text-foreground font-mono mt-0.5">{selectedRecord.metadata.number}</p>
                      </div>
                    )}
                    {selectedRecord.metadata.customerName && (
                      <div>
                        <span className="text-muted-foreground">{t('storage.customer', 'Customer')}:</span>
                        <p className="font-semibold text-foreground mt-0.5">{selectedRecord.metadata.customerName}</p>
                      </div>
                    )}
                    {selectedRecord.metadata.customerPhone && (
                      <div>
                        <span className="text-muted-foreground">{t('storage.phone', 'Phone')}:</span>
                        <p className="font-semibold text-foreground font-mono mt-0.5">{selectedRecord.metadata.customerPhone}</p>
                      </div>
                    )}
                    {selectedRecord.metadata.supplier && (
                      <div>
                        <span className="text-muted-foreground">{t('storage.supplier', 'Supplier')}:</span>
                        <p className="font-semibold text-foreground mt-0.5">{selectedRecord.metadata.supplier}</p>
                      </div>
                    )}
                    {selectedRecord.metadata.supplierPhone && (
                      <div>
                        <span className="text-muted-foreground">{t('storage.phone', 'Supplier Phone')}:</span>
                        <p className="font-semibold text-foreground font-mono mt-0.5">{selectedRecord.metadata.supplierPhone}</p>
                      </div>
                    )}
                    {selectedRecord.metadata.reason && (
                      <div>
                        <span className="text-muted-foreground">{t('storage.history.reason', 'Reason')}:</span>
                        <p className="font-semibold text-foreground mt-0.5">{selectedRecord.metadata.reason}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedRecord.notes && (
                <div className="p-3 rounded-lg border border-border bg-card">
                  <span className="text-xs text-muted-foreground block">{t('storage.notes', 'Notes')}</span>
                  <p className="text-xs text-foreground mt-1 whitespace-pre-wrap">{selectedRecord.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRecord(null)}>
              {t('common.close', 'Close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
