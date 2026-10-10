import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSearch
} from '../components/DataTable';
import { PermissionGate } from '../components/PermissionGate';
import { Phone, CalendarDays, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '../components/ui/badge';
import { formatPlateNumber } from '../utils/plate';
import { formatStatus } from '../lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UpdateOrderStatusDialog } from '../components/UpdateOrderStatusDialog';
import { OrderPaymentDialog } from '../components/OrderPaymentDialog';
import { PageHeader, ExecutiveAddButton } from '../components/common';
import { ActionIcon, Tooltip } from '@mantine/core';
import { RiEyeLine, RiPrinterLine, RiCheckDoubleLine } from 'react-icons/ri';
import { printOrderReceipt } from '../lib/receipt-printer';

export default function Orders() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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

  const { data: orders, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: async () => {
      const qs = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const res = await api.get(`/orders${qs}`);
      return res.data;
    },
  });

  const filteredOrders = orders?.filter((o: any) => 
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
    formatPlateNumber(o.vehicle.plateNumber).toLowerCase().includes(search.toLowerCase())
  );

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

      <div className="flex gap-2 pb-2 overflow-x-auto">
        {['ALL', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              statusFilter === status 
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-card text-muted-foreground hover:bg-muted border border-border hover:text-foreground'
            }`}
          >
            {formatStatus(status)}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-center justify-between bg-card">
          <TableSearch value={search} onChange={setSearch} placeholder={t('orders.searchPlaceholder')} />
        </div>

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
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">{t('orders.table.noOrders')}</TableCell>
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
