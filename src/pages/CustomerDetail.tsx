import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { formatAppDate, getImageUrl, formatCurrency, formatStatus } from '../lib/utils';
import { formatPlateNumber, parsePlateNumber } from '../utils/plate';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Group,
  ActionIcon,
  Tooltip,
  Breadcrumbs,
  Text,
  Button as MantineButton,
  Badge as MantineBadge,
  TextInput,
  CopyButton,
} from '@mantine/core';
import {
  RiArrowLeftLine,
  RiRefreshLine,
  RiGroupLine,
  RiCarLine,
  RiFileTextLine,
  RiUser3Line,
  RiPhoneLine,
  RiCalendarLine,
  RiFileCopyLine,
  RiCheckLine,
  RiEyeLine,
  RiSearchLine,
  RiCloseLine,
  RiShieldCheckLine,
  RiWallet3Line,
  RiBarChartLine,
  RiAddLine,
  RiTimeLine,
  RiStickyNoteLine,
} from 'react-icons/ri';
import { ExecutiveAddButton, TablePagination } from '../components/common';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/DataTable';

const renderPlateBadge = (plateStr: string, compact = false) => {
  const parsed = parsePlateNumber(plateStr);
  if (parsed) {
    let bg = '#FFFFFF';
    let fg = '#111827';
    if (parsed.category === '1') fg = '#B91C1C';
    else if (parsed.category === '2') fg = '#1E50BC';
    else if (parsed.category === '3') fg = '#15803D';
    else if (parsed.category === '5') fg = '#EA580C';
    else if (['un', 'au', 'temp'].includes(parsed.category)) fg = '#009BDA';
    else if (parsed.category === 'police') { bg = '#FFB300'; fg = '#111827'; }

    return (
      <div 
        className={compact 
          ? "inline-flex items-stretch shadow-xs rounded overflow-hidden border border-black/10 text-[10px]" 
          : "inline-flex items-stretch shadow-md rounded overflow-hidden border border-black/15 transition-transform group-hover:scale-102"}
        style={{ color: fg, backgroundColor: bg }}
      >
        <div className="flex flex-col items-center justify-center px-1.5 py-0.5 text-[7px] leading-[1.1] font-black text-white" style={{ backgroundColor: fg }}>
          <span>{parsed.amharic}</span>
          <span>{parsed.english}</span>
        </div>
        
        <div className="flex items-center justify-center px-1.5 border-r" style={{ borderColor: `${fg}30` }}>
           <span className="text-[11px] font-black">{parsed.category.toUpperCase()}</span>
        </div>
        
        <div className="flex items-center justify-center px-2 py-0.5">
           <span className="text-xs font-mono font-black tracking-wider">{parsed.serial}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center px-2 py-0.5 bg-muted/60 border border-border rounded shadow-xs">
      <span className="font-mono text-xs font-black tracking-wider text-foreground">
        {formatPlateNumber(plateStr)}
      </span>
    </div>
  );
};

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'fleet' | 'orders' | 'profile'>('fleet');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize, setOrderPageSize] = useState(5);

  const { data: customer, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const res = await api.get(`/customers/${id}`);
      return res.data;
    },
    enabled: !!id
  });

  // Financial & KPI Computations
  const totalSpent = useMemo(() => {
    return (customer?.orders || []).reduce((acc: number, o: any) => acc + (Number(o.subTotal) || 0), 0);
  }, [customer?.orders]);

  const ordersCount = customer?.orders?.length || 0;
  const vehiclesCount = customer?.vehicles?.length || 0;
  const avgTicket = ordersCount > 0 ? totalSpent / ordersCount : 0;

  const completedOrders = useMemo(() => {
    return (customer?.orders || []).filter((o: any) => o.orderStatus === 'DELIVERED' || o.orderStatus === 'COMPLETED').length;
  }, [customer?.orders]);

  const inProgressOrders = useMemo(() => {
    return (customer?.orders || []).filter((o: any) => o.orderStatus === 'IN_PROGRESS' || o.orderStatus === 'OPEN').length;
  }, [customer?.orders]);

  // Order Filtering and Pagination
  const filteredOrders = useMemo(() => {
    return (customer?.orders || []).filter((o: any) => {
      if (orderStatusFilter !== 'ALL' && o.orderStatus !== orderStatusFilter) {
        return false;
      }
      if (orderSearch.trim()) {
        const query = orderSearch.toLowerCase().trim();
        const orderNum = (o.id || '').toLowerCase();
        const plateStr = (o.vehicle?.plateNumber || '').toLowerCase();
        const formattedPlate = formatPlateNumber(o.vehicle?.plateNumber).toLowerCase();
        const modelName = `${o.vehicle?.carModel?.brand?.name || ''} ${o.vehicle?.carModel?.name || ''}`.toLowerCase();
        return orderNum.includes(query) || plateStr.includes(query) || formattedPlate.includes(query) || modelName.includes(query);
      }
      return true;
    });
  }, [customer?.orders, orderStatusFilter, orderSearch]);

  const orderTotalPages = Math.max(1, Math.ceil(filteredOrders.length / orderPageSize));
  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice((orderPage - 1) * orderPageSize, orderPage * orderPageSize);
  }, [filteredOrders, orderPage, orderPageSize]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'IN_PROGRESS':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'COMPLETED':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'DELIVERED':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'CANCELLED':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-140px)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary/20 border-t-primary" />
          <p className="text-xs text-muted-foreground animate-pulse font-medium">
            {t('customers.detail.loading', 'Loading customer profile...')}
          </p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex h-[calc(100vh-140px)] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm bg-card border border-border p-8 rounded-2xl shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <RiGroupLine size={28} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">{t('customers.detail.notFound', 'Customer Not Found')}</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t('customers.detail.notFoundDesc', 'The customer profile does not exist or may have been deleted.')}
            </p>
          </div>
          <MantineButton variant="light" color="amber" size="sm" radius="md" onClick={() => navigate('/customers')}>
            {t('common.goBack', 'Return to Customers')}
          </MantineButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-16 max-w-7xl mx-auto">
      {/* 1. Breadcrumbs */}
      <Breadcrumbs separator="›" separatorMargin="xs" mb="xs">
        <Text
          size="xs"
          fw={600}
          c="dimmed"
          onClick={() => navigate('/customers')}
          className="hover:text-foreground transition-colors cursor-pointer"
          style={{
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <RiGroupLine size={13} style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'middle', marginRight: '5px' }} />
          <span>{t('customers.title', 'Customers & Vehicles')}</span>
        </Text>
        <Text size="xs" fw={600} c="dimmed" style={{ display: 'inline-flex', alignItems: 'center' }}>
          {customer.name}
        </Text>
        <MantineBadge size="xs" variant="light" color="amber">
          {activeTab === 'fleet' ? t('customers.detail.tabFleet', 'Vehicle Fleet') : activeTab === 'orders' ? t('customers.detail.tabOrders', 'Work Orders') : t('customers.detail.tabProfile', 'Client Profile')}
        </MantineBadge>
      </Breadcrumbs>

      {/* 2. Executive Page Header */}
      <div className="bg-card border border-border p-4 sm:p-5 rounded-2xl shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Avatar initial, Name, Status, Phone & Joined */}
          <div className="flex items-start sm:items-center gap-3.5">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              radius="md"
              onClick={() => navigate('/customers')}
              title={t('common.goBack', 'Back')}
            >
              <RiArrowLeftLine size={18} />
            </ActionIcon>

            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-xs">
              <span className="text-base font-extrabold text-amber-500 tracking-wider">
                {customer.name.substring(0, 2).toUpperCase()}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
                  {customer.name}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t('customers.detail.active', 'Active Client')}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                <a
                  href={`tel:${customer.phoneNumber}`}
                  className="inline-flex items-center gap-1.5 font-medium hover:text-primary transition-colors"
                >
                  <RiPhoneLine size={13} className="text-amber-500" />
                  <span>{customer.phoneNumber}</span>
                </a>

                <CopyButton value={customer.phoneNumber} timeout={2000}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? t('common.copied', 'Copied') : t('customers.detail.copyPhone', 'Copy Phone')} withArrow>
                      <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" size="xs" onClick={copy}>
                        {copied ? <RiCheckLine size={12} /> : <RiFileCopyLine size={12} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>

                <span className="opacity-40">•</span>

                <span className="inline-flex items-center gap-1.5">
                  <RiCalendarLine size={13} />
                  <span>{t('customers.detail.memberSince', 'Client since')} {formatAppDate(customer.createdAt)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2.5 self-end lg:self-center">
            <Tooltip label={t('common.refresh', 'Refresh')} withArrow>
              <ActionIcon
                variant="subtle"
                color="amber"
                size="lg"
                radius="md"
                loading={isFetching}
                onClick={() => refetch()}
                aria-label="Refresh"
              >
                <RiRefreshLine size={17} />
              </ActionIcon>
            </Tooltip>

            <ExecutiveAddButton
              label={t('dashboard.newOrder', 'New Order')}
              to="/orders/new"
            />
          </div>
        </div>
      </div>

      {/* 3. Executive KPI Metric Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Spend */}
        <div className="bg-card border border-border p-4 rounded-xl shadow-xs transition-all hover:border-amber-500/30">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {t('customers.detail.totalSpend', 'Lifetime Spend')}
              </p>
              <p className="text-lg sm:text-xl font-extrabold text-foreground mt-1 tracking-tight">
                {formatCurrency(totalSpent)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {ordersCount} {ordersCount === 1 ? 'service engagement' : 'service engagements'}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <RiWallet3Line size={17} />
            </div>
          </div>
        </div>

        {/* Work Orders */}
        <div className="bg-card border border-border p-4 rounded-xl shadow-xs transition-all hover:border-blue-500/30">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {t('orders.title', 'Total Orders')}
              </p>
              <p className="text-lg sm:text-xl font-extrabold text-foreground mt-1 tracking-tight">
                {ordersCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {completedOrders} completed • {inProgressOrders} in progress
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
              <RiFileTextLine size={17} />
            </div>
          </div>
        </div>

        {/* Fleet Vehicles */}
        <div className="bg-card border border-border p-4 rounded-xl shadow-xs transition-all hover:border-emerald-500/30">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {t('customers.detail.vehicles', 'Fleet Vehicles')}
              </p>
              <p className="text-lg sm:text-xl font-extrabold text-foreground mt-1 tracking-tight">
                {vehiclesCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                Registered customer cars
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <RiCarLine size={17} />
            </div>
          </div>
        </div>

        {/* Average Ticket Value */}
        <div className="bg-card border border-border p-4 rounded-xl shadow-xs transition-all hover:border-purple-500/30">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                {t('customers.detail.avgTicket', 'Avg Order Value')}
              </p>
              <p className="text-lg sm:text-xl font-extrabold text-foreground mt-1 tracking-tight">
                {formatCurrency(avgTicket)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                Average ticket across services
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shrink-0">
              <RiBarChartLine size={17} />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Sub-Navigation Tabs Switcher Bar */}
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <Box
          p={4}
          style={{
            backgroundColor: "var(--surface-card, rgba(255, 255, 255, 0.04))",
            border: "1px solid var(--surface-border, rgba(255, 255, 255, 0.08))",
            borderRadius: 12,
            display: "inline-flex",
            gap: 6,
            boxShadow: "var(--shadow-card, 0 1px 3px rgba(0, 0, 0, 0.05))",
            maxWidth: "100%",
            overflowX: "auto",
          }}
          className="custom-scrollbar"
        >
          <MantineButton
            variant={activeTab === 'fleet' ? 'filled' : 'subtle'}
            color="amber"
            size="sm"
            radius="md"
            leftSection={<RiCarLine size={16} />}
            rightSection={
              <MantineBadge
                size="xs"
                variant={activeTab === 'fleet' ? 'white' : 'light'}
                color="amber"
                style={{ padding: '0 6px', fontWeight: 700 }}
              >
                {vehiclesCount}
              </MantineBadge>
            }
            onClick={() => setActiveTab('fleet')}
            style={{
              fontWeight: activeTab === 'fleet' ? 700 : 500,
              height: 36,
              fontSize: '13px',
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            }}
          >
            {t('customers.detail.tabFleet', 'Vehicle Fleet')}
          </MantineButton>

          <MantineButton
            variant={activeTab === 'orders' ? 'filled' : 'subtle'}
            color="amber"
            size="sm"
            radius="md"
            leftSection={<RiFileTextLine size={16} />}
            rightSection={
              <MantineBadge
                size="xs"
                variant={activeTab === 'orders' ? 'white' : 'light'}
                color="amber"
                style={{ padding: '0 6px', fontWeight: 700 }}
              >
                {ordersCount}
              </MantineBadge>
            }
            onClick={() => setActiveTab('orders')}
            style={{
              fontWeight: activeTab === 'orders' ? 700 : 500,
              height: 36,
              fontSize: '13px',
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            }}
          >
            {t('customers.detail.tabOrders', 'Service & Work Orders')}
          </MantineButton>

          <MantineButton
            variant={activeTab === 'profile' ? 'filled' : 'subtle'}
            color="amber"
            size="sm"
            radius="md"
            leftSection={<RiUser3Line size={16} />}
            onClick={() => setActiveTab('profile')}
            style={{
              fontWeight: activeTab === 'profile' ? 700 : 500,
              height: 36,
              fontSize: '13px',
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            }}
          >
            {t('customers.detail.tabProfile', 'Client Profile')}
          </MantineButton>
        </Box>
      </Group>

      {/* 5. TAB CONTENT */}
      {/* TAB 1: VEHICLE FLEET */}
      {activeTab === 'fleet' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <RiCarLine className="text-amber-500" size={17} />
                <span>{t('customers.detail.registeredVehicles', 'Registered Vehicle Fleet')}</span>
                <span className="text-xs font-semibold text-muted-foreground">({vehiclesCount})</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('customers.detail.vehiclesSubtitle', 'Fleet profiles and vehicle service histories associated with this account.')}
              </p>
            </div>
            <MantineButton
              variant="light"
              color="amber"
              size="xs"
              radius="md"
              leftSection={<RiAddLine size={14} />}
              onClick={() => navigate('/orders/new')}
            >
              {t('customers.detail.addVehicle', 'Register Vehicle')}
            </MantineButton>
          </div>

          {customer.vehicles.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground/60 mb-3">
                <RiCarLine size={26} />
              </div>
              <h3 className="text-sm font-bold text-foreground">
                {t('customers.detail.noVehicles', 'No vehicles registered yet')}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                {t('customers.detail.noVehiclesDesc', 'This customer does not have any vehicles on record. Register a vehicle during order creation.')}
              </p>
              <MantineButton
                variant="light"
                color="amber"
                size="xs"
                radius="md"
                mt="md"
                leftSection={<RiAddLine size={14} />}
                onClick={() => navigate('/orders/new')}
              >
                {t('dashboard.newOrder', 'Create First Order')}
              </MantineButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customer.vehicles.map((v: any) => {
                const vehicleOrders = (customer.orders || []).filter(
                  (o: any) => o.vehicleId === v.id || o.vehicle?.id === v.id
                );
                const vehicleSpend = vehicleOrders.reduce(
                  (sum: number, o: any) => sum + (Number(o.subTotal) || 0),
                  0
                );

                return (
                  <div
                    key={v.id}
                    className="group bg-card border border-border hover:border-amber-500/40 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col"
                  >
                    {/* Top Image & Plate Banner */}
                    <div className="w-full aspect-[16/9] bg-muted/40 relative overflow-hidden border-b border-border/60">
                      {v.carModel?.imageUrl ? (
                        <img
                          src={getImageUrl(v.carModel.imageUrl)}
                          alt={`${v.carModel?.brand?.name || ''} ${v.carModel?.name || ''}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted/70 to-card">
                          <RiCarLine size={36} className="text-muted-foreground/30 mb-1" />
                          <span className="text-[11px] text-muted-foreground/60 font-medium">
                            {t('common.noImage', 'No Vehicle Image')}
                          </span>
                        </div>
                      )}

                      {/* Gentle overlay for plate badge */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none" />

                      {/* Floating Plate Badge */}
                      <div className="absolute bottom-2.5 left-0 right-0 flex justify-center px-2">
                        {renderPlateBadge(v.plateNumber)}
                      </div>
                    </div>

                    {/* Vehicle Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                          {v.carModel?.brand?.name || t('customers.detail.unknownBrand', 'Unknown Brand')}
                        </span>
                        <h3 className="text-base font-extrabold text-foreground truncate mt-0.5">
                          {v.carModel?.name || t('customers.detail.unknownModel', 'Unknown Model')}
                        </h3>
                      </div>

                      {/* Micro stats strip */}
                      <div className="grid grid-cols-2 gap-2 bg-muted/30 border border-border/50 rounded-lg p-2 text-xs">
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                            {t('common.orders', 'Orders')}
                          </span>
                          <span className="font-bold text-foreground">
                            {vehicleOrders.length} {vehicleOrders.length === 1 ? 'visit' : 'visits'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                            {t('customers.detail.totalSpend', 'Spent')}
                          </span>
                          <span className="font-bold text-amber-500">
                            {formatCurrency(vehicleSpend)}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <MantineButton
                          variant="light"
                          color="amber"
                          size="xs"
                          radius="md"
                          fullWidth
                          leftSection={<RiAddLine size={13} />}
                          onClick={() => navigate('/orders/new')}
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                          }}
                        >
                          {t('dashboard.newOrder', 'Create Order')}
                        </MantineButton>

                        <MantineButton
                          variant="subtle"
                          color="gray"
                          size="xs"
                          radius="md"
                          onClick={() => {
                            setActiveTab('orders');
                            setOrderSearch(v.plateNumber);
                          }}
                          title={t('customers.detail.viewVehicleOrders', 'Filter vehicle orders')}
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                          }}
                        >
                          {t('common.view', 'History')}
                        </MantineButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SERVICE & WORK ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <TextInput
              placeholder={t('orders.searchPlaceholder', 'Search by Order # or Vehicle Plate...')}
              leftSection={<RiSearchLine size={15} style={{ color: 'var(--text-muted)' }} />}
              rightSection={
                orderSearch ? (
                  <ActionIcon variant="subtle" size="xs" color="gray" onClick={() => setOrderSearch('')}>
                    <RiCloseLine size={13} />
                  </ActionIcon>
                ) : null
              }
              value={orderSearch}
              onChange={(e) => {
                setOrderSearch(e.currentTarget.value);
                setOrderPage(1);
              }}
              style={{ flex: '1 1 240px', width: '100%' }}
              radius="md"
              size="sm"
            />

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              {/* Quick Status Filters */}
              {['ALL', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED'].map((st) => (
                <MantineButton
                  key={st}
                  variant={orderStatusFilter === st ? 'light' : 'subtle'}
                  color="amber"
                  size="xs"
                  radius="md"
                  onClick={() => {
                    setOrderStatusFilter(st);
                    setOrderPage(1);
                  }}
                  style={{
                    fontSize: '11px',
                    fontWeight: orderStatusFilter === st ? 700 : 500,
                    height: 30,
                  }}
                >
                  {st === 'ALL' ? t('common.all', 'All') : formatStatus(st)}
                </MantineButton>
              ))}

              {(orderSearch || orderStatusFilter !== 'ALL') && (
                <MantineButton
                  variant="subtle"
                  color="gray"
                  size="xs"
                  radius="md"
                  onClick={() => {
                    setOrderSearch('');
                    setOrderStatusFilter('ALL');
                    setOrderPage(1);
                  }}
                  leftSection={<RiCloseLine size={13} />}
                  style={{ fontSize: '11px', height: 30 }}
                >
                  {t('common.clear', 'Reset')}
                </MantineButton>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground/60 mb-3">
                  <RiFileTextLine size={26} />
                </div>
                <h3 className="text-sm font-bold text-foreground">
                  {t('customers.detail.noOrders', 'No work orders found')}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {orderSearch || orderStatusFilter !== 'ALL'
                    ? t('orders.table.tryDifferentFilter', 'No orders match your filter criteria.')
                    : t('customers.detail.noOrdersDesc', 'This customer has no recorded service orders yet.')}
                </p>
                {orderSearch || orderStatusFilter !== 'ALL' ? (
                  <MantineButton
                    variant="light"
                    color="amber"
                    size="xs"
                    radius="md"
                    mt="md"
                    onClick={() => {
                      setOrderSearch('');
                      setOrderStatusFilter('ALL');
                    }}
                  >
                    {t('common.clearFilters', 'Reset filters')}
                  </MantineButton>
                ) : (
                  <MantineButton
                    variant="light"
                    color="amber"
                    size="xs"
                    radius="md"
                    mt="md"
                    leftSection={<RiAddLine size={14} />}
                    onClick={() => navigate('/orders/new')}
                  >
                    {t('dashboard.newOrder', 'Create First Order')}
                  </MantineButton>
                )}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('common.order', 'Order #')}</TableHead>
                      <TableHead>{t('common.date', 'Date & Time')}</TableHead>
                      <TableHead>{t('customers.detail.vehicle', 'Vehicle')}</TableHead>
                      <TableHead>{t('common.services', 'Services')}</TableHead>
                      <TableHead>{t('common.status', 'Status')}</TableHead>
                      <TableHead className="text-right">{t('common.total', 'Total Amount')}</TableHead>
                      <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOrders.map((o: any) => (
                      <TableRow
                        key={o.id}
                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/orders/${o.id}`)}
                      >
                        {/* Order # */}
                        <TableCell>
                          <div className="font-bold text-primary hover:underline flex items-center gap-1.5 text-xs">
                            <RiFileTextLine size={14} className="text-amber-500" />
                            <span>#{o.id.substring(o.id.length - 6).toUpperCase()}</span>
                          </div>
                        </TableCell>

                        {/* Date */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <RiTimeLine size={13} />
                            <span>{formatAppDate(o.createdAt, true)}</span>
                          </div>
                        </TableCell>

                        {/* Vehicle */}
                        <TableCell>
                          {o.vehicle ? (
                            <div className="flex flex-col gap-1">
                              <div>{renderPlateBadge(o.vehicle.plateNumber, true)}</div>
                              <span className="text-[11px] text-muted-foreground font-medium truncate max-w-[180px]">
                                {o.vehicle.carModel?.brand?.name} {o.vehicle.carModel?.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">—</span>
                          )}
                        </TableCell>

                        {/* Services Breakdown */}
                        <TableCell>
                          <div className="text-xs text-foreground font-medium">
                            {o.serviceLines?.length > 0 ? (
                              <span>
                                {o.serviceLines.length} {o.serviceLines.length === 1 ? 'service line' : 'service lines'}
                              </span>
                            ) : o.standaloneLines?.length > 0 ? (
                              <span>
                                {o.standaloneLines.length} {o.standaloneLines.length === 1 ? 'item' : 'items'}
                              </span>
                            ) : (
                              <span className="text-muted-foreground italic">Standard Order</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(
                              o.orderStatus
                            )}`}
                          >
                            {formatStatus(o.orderStatus)}
                          </span>
                        </TableCell>

                        {/* Total Amount */}
                        <TableCell className="text-right">
                          <span className="text-xs font-bold text-primary tracking-tight">
                            {formatCurrency(o.subTotal)}
                          </span>
                        </TableCell>

                        {/* Action */}
                        <TableCell className="text-right">
                          <MantineButton
                            variant="subtle"
                            color="amber"
                            size="xs"
                            radius="md"
                            rightSection={<RiEyeLine size={13} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/orders/${o.id}`);
                            }}
                            style={{
                              fontSize: '11px',
                              height: 28,
                              padding: '0 8px',
                              fontWeight: 600,
                            }}
                          >
                            {t('common.view', 'View')}
                          </MantineButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Table Pagination */}
                <TablePagination
                  page={orderPage}
                  pageSize={orderPageSize}
                  total={filteredOrders.length}
                  totalPages={orderTotalPages}
                  onPageChange={setOrderPage}
                  onPageSizeChange={(newSize) => {
                    setOrderPageSize(newSize);
                    setOrderPage(1);
                  }}
                  pageSizeOptions={['5', '10', '20']}
                  itemLabel="orders"
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CLIENT PROFILE & OVERVIEW */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Contact & Identity Card */}
          <div className="bg-card border border-border p-5 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                <RiUser3Line size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {t('customers.detail.identity', 'Contact & Identity')}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Verified account details
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {t('common.name', 'Full Name')}
                </span>
                <span className="text-xs font-semibold text-foreground mt-0.5 block">
                  {customer.name}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {t('customers.phone', 'Phone Number')}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <a
                    href={`tel:${customer.phoneNumber}`}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <RiPhoneLine size={12} />
                    {customer.phoneNumber}
                  </a>
                  <CopyButton value={customer.phoneNumber}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow>
                        <ActionIcon size="xs" variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
                          {copied ? <RiCheckLine size={12} /> : <RiFileCopyLine size={12} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {t('customers.detail.customerId', 'Customer ID')}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-xs text-muted-foreground truncate">
                    {customer.id}
                  </span>
                  <CopyButton value={customer.id}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'Copied' : 'Copy'} withArrow>
                        <ActionIcon size="xs" variant="subtle" color={copied ? 'teal' : 'gray'} onClick={copy}>
                          {copied ? <RiCheckLine size={12} /> : <RiFileCopyLine size={12} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  {t('customers.joined', 'Joined Date')}
                </span>
                <span className="text-xs text-foreground mt-0.5 block">
                  {formatAppDate(customer.createdAt, true)}
                </span>
              </div>
            </div>
          </div>

          {/* Account Summary Card */}
          <div className="bg-card border border-border p-5 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <RiShieldCheckLine size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {t('customers.detail.commercialSummary', 'Account Activity')}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Historical activity breakdown
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">{t('customers.detail.vehicles', 'Fleet Vehicles')}</span>
                <span className="font-bold text-foreground">{vehiclesCount}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">{t('orders.title', 'Total Work Orders')}</span>
                <span className="font-bold text-foreground">{ordersCount}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">{t('customers.detail.completedOrders', 'Completed Orders')}</span>
                <span className="font-bold text-emerald-500">{completedOrders}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/40">
                <span className="text-muted-foreground">{t('customers.detail.totalSpend', 'Lifetime Spend')}</span>
                <span className="font-bold text-amber-500">{formatCurrency(totalSpent)}</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">{t('customers.detail.avgTicket', 'Average Ticket')}</span>
                <span className="font-bold text-foreground">{formatCurrency(avgTicket)}</span>
              </div>
            </div>
          </div>

          {/* Customer Notes Card */}
          <div className="bg-card border border-border p-5 rounded-xl shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                <RiStickyNoteLine size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  {t('customers.detail.notes', 'Client Notes')}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Special preferences or instructions
                </p>
              </div>
            </div>

            <div className="text-xs">
              {customer.notes ? (
                <p className="text-foreground leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/40">
                  {customer.notes}
                </p>
              ) : (
                <div className="p-4 rounded-lg bg-muted/20 border border-dashed border-border/80 text-center">
                  <p className="text-muted-foreground italic">
                    {t('customers.detail.noNotes', 'No custom notes recorded for this client.')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
