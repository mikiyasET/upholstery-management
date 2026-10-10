import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/DataTable';
import { PermissionGate } from '../components/PermissionGate';
import { Phone, CalendarDays, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '../components/ui/badge';
import { formatPlateNumber } from '../utils/plate';
import { formatStatus } from '../lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { UpdateOrderStatusDialog } from '../components/UpdateOrderStatusDialog';
import { OrderPaymentDialog } from '../components/OrderPaymentDialog';
import { PageHeader, ExecutiveAddButton } from '../components/common';
import {
  Box,
  Group,
  Stack,
  Text,
  ActionIcon,
  Tooltip,
  TextInput,
  Select,
  Button,
} from '@mantine/core';
import {
  RiEyeLine,
  RiPrinterLine,
  RiCheckDoubleLine,
  RiSearchLine,
  RiCloseLine,
  RiListCheck2,
  RiTimeLine,
  RiToolsLine,
  RiCheckboxCircleLine,
  RiShieldCheckLine,
  RiCloseCircleLine,
  RiMoneyDollarCircleLine,
  RiFileSearchLine,
} from 'react-icons/ri';
import { printOrderReceipt } from '../lib/receipt-printer';

export default function Orders() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handlePrintOrder = async (orderId: string) => {
    try {
      const res = await api.get(`/orders/${orderId}`);
      if (res.data) {
        printOrderReceipt(res.data);
      }
    } catch (e) {
      toast.error('Failed to load order for printing');
    }
  };

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const { data: orders = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await api.get('/orders');
      return res.data;
    },
  });

  // Calculate live count metrics for each tab
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: orders?.length || 0,
      OPEN: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    if (Array.isArray(orders)) {
      orders.forEach((o: any) => {
        if (counts[o.orderStatus] !== undefined) {
          counts[o.orderStatus]++;
        }
      });
    }
    return counts;
  }, [orders]);

  // Combined client filtering: Status tab + Payment filter + Search keyword
  const filteredOrders = useMemo(() => {
    return (orders || []).filter((o: any) => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && o.orderStatus !== statusFilter) {
        return false;
      }

      // 2. Payment Filter
      if (paymentFilter !== 'ALL' && o.paymentStatus !== paymentFilter) {
        return false;
      }

      // 3. Search query
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const orderNum = (o.orderNumber || '').toLowerCase();
        const custName = (o.customer?.name || '').toLowerCase();
        const custPhone = (o.customer?.phone || o.customer?.phoneNumber || '').toLowerCase();
        const plate = formatPlateNumber(o.vehicle?.plateNumber || '').toLowerCase();
        const model = (o.vehicle?.carModel?.name || '').toLowerCase();
        const brand = (o.vehicle?.carModel?.brand?.name || '').toLowerCase();

        return (
          orderNum.includes(query) ||
          custName.includes(query) ||
          custPhone.includes(query) ||
          plate.includes(query) ||
          model.includes(query) ||
          brand.includes(query)
        );
      }

      return true;
    });
  }, [orders, statusFilter, paymentFilter, search]);

  const STATUS_TABS = [
    {
      key: 'ALL',
      label: t('common.all', 'All Orders'),
      icon: RiListCheck2,
      activeColor: '#F59E0B',
    },
    {
      key: 'OPEN',
      label: t('orders.status.open', 'Open'),
      icon: RiTimeLine,
      activeColor: '#3B82F6',
    },
    {
      key: 'IN_PROGRESS',
      label: t('orders.status.inProgress', 'In Progress'),
      icon: RiToolsLine,
      activeColor: '#F59E0B',
    },
    {
      key: 'COMPLETED',
      label: t('orders.status.completed', 'Ready'),
      icon: RiCheckboxCircleLine,
      activeColor: '#A855F7',
    },
    {
      key: 'DELIVERED',
      label: t('orders.status.delivered', 'Delivered'),
      icon: RiShieldCheckLine,
      activeColor: '#10B981',
    },
    {
      key: 'CANCELLED',
      label: t('orders.status.cancelled', 'Cancelled'),
      icon: RiCloseCircleLine,
      activeColor: '#EF4444',
    },
  ];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'OPEN': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'IN_PROGRESS': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'COMPLETED': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentColor = (status: string) => {
    switch(status) {
      case 'UNPAID': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'PARTIALLY_PAID': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'PAID': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title={t('common.orders', 'Work Orders')}
        subtitle={t('orders.subtitle', 'Manage automotive customization orders, status workflows, and vehicle jobs.')}
        badge={orders ? `${orders.length} Orders` : undefined}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        refreshTooltip="Refresh orders"
        action={
          <PermissionGate permission="orders.create">
            <ExecutiveAddButton
              label={t('orders.createNew', 'New Work Order')}
              to="/orders/new"
            />
          </PermissionGate>
        }
      />

      {/* 2. Executive Control & Filter Bar (Exporter-Docs style) */}
      <Box className="premium-card" p="md">
        <Stack gap="sm">
          {/* Row 1: Live Search + Payment Select + Reset + Count Stats */}
          <Group justify="space-between" align="center" wrap="wrap" gap="sm">
            {/* Live Search Input */}
            <TextInput
              placeholder={t('orders.searchPlaceholder', 'Search by order #, customer, phone, or plate...')}
              leftSection={<RiSearchLine size={16} style={{ color: 'var(--text-muted)' }} />}
              rightSection={
                search ? (
                  <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setSearch('')} title="Clear search">
                    <RiCloseLine size={14} />
                  </ActionIcon>
                ) : null
              }
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ flex: '1 1 280px', minWidth: 240 }}
              radius="md"
              size="sm"
            />

            <Group gap="xs" align="center" wrap="wrap">
              {/* Payment Status Quick Filter */}
              <Select
                placeholder={t('orders.filter.allPayments', 'All Payments')}
                data={[
                  { value: 'ALL', label: t('orders.payment.all', 'All Payments') },
                  { value: 'UNPAID', label: t('orders.payment.unpaid', 'Unpaid') },
                  { value: 'PARTIALLY_PAID', label: t('orders.payment.partiallyPaid', 'Partially Paid') },
                  { value: 'PAID', label: t('orders.payment.paid', 'Fully Paid') },
                ]}
                value={paymentFilter}
                onChange={(val) => setPaymentFilter(val || 'ALL')}
                size="sm"
                radius="md"
                w={{ base: '100%', sm: 160 }}
                leftSection={<RiMoneyDollarCircleLine size={15} style={{ color: 'var(--text-muted)' }} />}
              />

              {/* Reset Filters CTA if any filter is active */}
              {(statusFilter !== 'ALL' || paymentFilter !== 'ALL' || search) && (
                <Button
                  variant="subtle"
                  color="gray"
                  size="xs"
                  radius="md"
                  onClick={() => {
                    setStatusFilter('ALL');
                    setPaymentFilter('ALL');
                    setSearch('');
                  }}
                  leftSection={<RiCloseLine size={13} />}
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 600,
                    height: 32,
                  }}
                >
                  {t('common.clear', 'Reset')}
                </Button>
              )}

              {/* Counter Pill */}
              <Text size="xs" fw={600} c="dimmed">
                Showing <span style={{ color: 'var(--primary-accent, #F59E0B)', fontWeight: 700 }}>{filteredOrders.length}</span> of {orders.length} orders
              </Text>
            </Group>
          </Group>

          {/* Row 2: Executive Status Filter Tabs */}
          <Box style={{ overflowX: 'auto', paddingBottom: 2 }} className="custom-scrollbar">
            <Group gap={6} wrap="nowrap">
              {STATUS_TABS.map((tab) => {
                const isSelected = statusFilter === tab.key;
                const count = statusCounts[tab.key] || 0;
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      height: 32,
                      padding: '0 11px',
                      borderRadius: 8,
                      fontSize: '12px',
                      fontWeight: isSelected ? 700 : 500,
                      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      backgroundColor: isSelected
                        ? 'rgba(245, 158, 11, 0.12)'
                        : 'var(--surface-hover, rgba(0, 0, 0, 0.03))',
                      color: isSelected
                        ? 'var(--text-main, #F59E0B)'
                        : 'var(--text-muted, #94a3b8)',
                      border: isSelected
                        ? '1px solid rgba(245, 158, 11, 0.45)'
                        : '1px solid var(--surface-border-subtle, rgba(255, 255, 255, 0.07))',
                      boxShadow: isSelected ? '0 1px 6px rgba(245, 158, 11, 0.12)' : 'none',
                    }}
                    className={
                      isSelected
                        ? ''
                        : 'hover:border-border hover:text-foreground hover:bg-muted/50'
                    }
                  >
                    <Icon
                      size={14}
                      style={{
                        color: isSelected ? tab.activeColor : 'var(--text-muted, currentColor)',
                        flexShrink: 0,
                      }}
                    />
                    <span>{tab.label}</span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 18,
                        height: 18,
                        padding: '0 5px',
                        borderRadius: 9999,
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: isSelected
                          ? 'rgba(245, 158, 11, 0.22)'
                          : 'var(--surface-border, rgba(148, 163, 184, 0.15))',
                        color: isSelected
                          ? 'var(--primary-accent, #F59E0B)'
                          : 'var(--text-muted, #94a3b8)',
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </Group>
          </Box>
        </Stack>
      </Box>

      {/* 3. Orders Data Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('orders.table.orderInfo')}</TableHead>
                <TableHead>{t('orders.table.vehicle')}</TableHead>
                <TableHead>{t('orders.table.customer')}</TableHead>
                <TableHead>{t('orders.table.status')}</TableHead>
                <TableHead>{t('orders.table.payment')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">{t('orders.table.loading')}</TableCell>
                </TableRow>
              ) : filteredOrders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <RiFileSearchLine size={38} className="text-muted-foreground/50 mb-1" />
                      <div className="font-semibold text-foreground text-sm">
                        {t('orders.table.noOrders', 'No work orders found')}
                      </div>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {search || statusFilter !== 'ALL' || paymentFilter !== 'ALL'
                          ? t('orders.table.tryDifferentFilter', 'No orders match your current filter and search keyword.')
                          : t('orders.table.emptyList', 'No work orders created yet.')}
                      </p>
                      {(search || statusFilter !== 'ALL' || paymentFilter !== 'ALL') && (
                        <Button
                          variant="light"
                          color="amber"
                          size="xs"
                          radius="md"
                          mt="xs"
                          onClick={() => {
                            setStatusFilter('ALL');
                            setPaymentFilter('ALL');
                            setSearch('');
                          }}
                          leftSection={<RiCloseLine size={14} />}
                        >
                          {t('common.clearFilters', 'Reset all filters')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders?.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div 
                        className="font-medium text-primary hover:underline cursor-pointer mb-1 transition-all"
                        onClick={() => navigate(`/orders/${order.id}`)}
                      >
                        {order.orderNumber}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {format(new Date(order.orderDateTime), 'MMM d, yyyy HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-md mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
                        <span className="text-sm font-bold tracking-wider text-amber-800 dark:text-amber-300">
                          {formatPlateNumber(order.vehicle.plateNumber)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {order.vehicle.carModel.brand.name} {order.vehicle.carModel.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{order.customer.name}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Phone className="w-3 h-3" />
                        {order.customer.phoneNumber}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(order.orderStatus)}>
                        {formatStatus(order.orderStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPaymentColor(order.paymentStatus)}>
                        {formatStatus(order.paymentStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Tooltip label={t('orders.actions.viewDetails', 'View Order')} withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="amber"
                            size="sm"
                            onClick={() => navigate(`/orders/${order.id}`)}
                          >
                            <RiEyeLine size={16} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label={t('orders.actions.printReceipt', 'Print Invoice')} withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={() => handlePrintOrder(order.id)}
                          >
                            <RiPrinterLine size={16} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label={t('orders.updateStatus', 'Update Status')} withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsStatusModalOpen(true);
                            }}
                          >
                            <RiCheckDoubleLine size={16} />
                          </ActionIcon>
                        </Tooltip>

                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted focus:outline-none text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
                              {t('orders.actions.viewDetails')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsStatusModalOpen(true);
                              }}
                            >
                              {t('orders.updateStatus')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => {
                                setSelectedOrder(order);
                                setIsPaymentModalOpen(true);
                              }}
                            >
                              {t('orders.actions.addPayment')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer text-amber-600 dark:text-amber-400"
                              onClick={() => handlePrintOrder(order.id)}
                            >
                              {t('orders.actions.printReceipt')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <UpdateOrderStatusDialog 
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        orderId={selectedOrder?.id || ''}
        currentStatus={selectedOrder?.orderStatus || 'OPEN'}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['orders'] })}
      />

      <OrderPaymentDialog 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        orderId={selectedOrder?.id || ''}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['orders'] })}
      />
    </div>
  );
}
