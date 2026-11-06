import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { formatCurrency, formatStatus, formatUnit, isUnitIntegerOnly, getMaterialUnallocatedStock, formatBrandSizeLabel, formatAppDate } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/button';
import {
  Printer,
  Car,
  User,
  CheckCircle,
  CreditCard,
  PenTool,
  ClipboardList,
  Plus,
  Trash2,
  Timer,
  CheckCircle2,
  Banknote,
  Landmark,
  Smartphone,
  Receipt,
  AlertCircle,
  Coins,
  Clock,
  Phone,
  ShieldCheck,
  ArrowUpRight,
  RotateCw,
  ArrowLeft,
  Calendar,
  CheckCheck,
  ShoppingBag,
  Pencil,
  Tag,
  Boxes,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { UpdateOrderStatusDialog } from '../components/UpdateOrderStatusDialog';
import { OrderPaymentDialog } from '../components/OrderPaymentDialog';
import { printOrderReceipt } from '../lib/receipt-printer';
import { PlateBadge } from '../components/common';
import { PermissionGate } from '../components/PermissionGate';
import { ActionIcon, Tooltip, Button as MantineButton } from '@mantine/core';

const getPaymentMethodInfo = (method: string) => {
  switch (method) {
    case 'CASH':
      return { label: 'Cash', icon: Banknote, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    case 'BANK_TRANSFER':
      return { label: 'Bank Transfer', icon: Landmark, color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20' };
    case 'MOBILE_MONEY':
      return { label: 'Mobile Money', icon: Smartphone, color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20' };
    case 'CARD':
      return { label: 'Card', icon: CreditCard, color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20' };
    default:
      return { label: method ? method.replace('_', ' ') : 'Other', icon: Coins, color: 'text-gray-600 dark:text-gray-400 bg-gray-500/10 border-gray-500/20' };
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'OPEN': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case 'IN_PROGRESS': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'COMPLETED': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    case 'DELIVERED': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
    case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getPaymentColor = (status: string) => {
  switch (status) {
    case 'UNPAID': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
    case 'PARTIALLY_PAID': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'PAID': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const getLocName = (item: any) =>
    i18n?.language === 'am' && item?.nameAm ? item.nameAm : (item?.nameEn || item?.name || '');
  const queryClient = useQueryClient();

  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedMaterialBrandId, setSelectedMaterialBrandId] = useState('');
  const [materialQty, setMaterialQty] = useState('1');
  const [serviceMaterialBrandSelections, setServiceMaterialBrandSelections] = useState<Record<string, string>>({});

  // Custom/agreed price states
  const [servicePriceInput, setServicePriceInput] = useState('');
  const [materialPriceInput, setMaterialPriceInput] = useState('');
  const [editingLine, setEditingLine] = useState<{
    type: 'service' | 'material';
    id: string;
    name: string;
    standardPrice: number;
    currentPrice: number;
    quantity?: number;
  } | null>(null);
  const [editLinePriceInput, setEditLinePriceInput] = useState('');

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isFsrModalOpen, setIsFsrModalOpen] = useState(false);
  const [fsrInputValue, setFsrInputValue] = useState('');
  const [isServiceFeeModalOpen, setIsServiceFeeModalOpen] = useState(false);
  const [serviceFeeInput, setServiceFeeInput] = useState('');

  // Queries for selectors
  const { data: allServices } = useQuery<any[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.get('/catalog/services');
      return res.data;
    },
    enabled: isAddServiceOpen,
  });

  const selectedService = allServices?.find((s) => s.id === selectedServiceId);
  const categoriesForSelectedService = selectedService?.categories || [];

  const { data: allMaterials } = useQuery<any[]>({
    queryKey: ['materials'],
    queryFn: async () => {
      const res = await api.get('/catalog/materials');
      return res.data;
    },
    enabled: isAddMaterialOpen || isAddServiceOpen,
  });

  const updateFsrMutation = useMutation({
    mutationFn: async (newFsr: string) => {
      await api.patch(`/orders/${id}/fsr-number`, { fsrNumber: newFsr.trim() || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(t('orders.detail.fsrUpdated', 'FSR Number updated successfully'));
      setIsFsrModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('alerts.error'));
    },
  });

  const handleOpenFsrDialog = () => {
    setFsrInputValue(order?.fsrNumber || '');
    setIsFsrModalOpen(true);
  };

  const updateServiceFeeMutation = useMutation({
    mutationFn: async (fee: number) => {
      await api.patch(`/orders/${id}/service-fee`, { serviceFee: fee });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(t('orders.detail.serviceFeeUpdated', 'Service fee updated successfully'));
      setIsServiceFeeModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('alerts.error'));
    },
  });

  const handleOpenServiceFeeDialog = () => {
    const currentFee = Number(order?.serviceFee || 0);
    setServiceFeeInput(currentFee > 0 ? String(currentFee) : '');
    setIsServiceFeeModalOpen(true);
  };

  // Mutations
  const addServiceMutation = useMutation({
    mutationFn: async ({ serviceCategoryId, unitPrice, selectedMaterials }: {
      serviceCategoryId: string;
      unitPrice?: number;
      selectedMaterials?: { materialId: string; materialBrandId?: string }[];
    }) => {
      await api.post(`/orders/${id}/services`, { serviceCategoryId, priceMultiplier: 1, unitPrice, selectedMaterials });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['storage_materials'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(t('alerts.serviceAdded'));
      setIsAddServiceOpen(false);
      setSelectedServiceId('');
      setSelectedCategoryId('');
      setServicePriceInput('');
      setServiceMaterialBrandSelections({});
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('alerts.error'));
    }
  });

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const selected = allServices?.find((s: any) => s.id === serviceId);
    const cats = selected?.categories || [];
    if (cats.length === 1) {
      setSelectedCategoryId(cats[0].id);
      setServicePriceInput(String(cats[0].price));
    } else {
      setSelectedCategoryId('');
      setServicePriceInput('');
    }
  };

  const removeServiceMutation = useMutation({
    mutationFn: async (lineId: string) => {
      await api.delete(`/orders/${id}/services/${lineId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['storage_materials'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(t('alerts.serviceRemoved'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('alerts.error'));
    }
  });

  const updateServiceLinePriceMutation = useMutation({
    mutationFn: async ({ lineId, priceAtOrderTime }: { lineId: string; priceAtOrderTime: number }) => {
      await api.patch(`/orders/${id}/services/${lineId}`, { priceAtOrderTime });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(t('orders.priceUpdated', 'Service price updated successfully'));
      setEditingLine(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('alerts.error'));
    }
  });

  const addMaterialMutation = useMutation({
    mutationFn: async ({ materialId, materialBrandId, brandName, sizeName, colorName, typeName, quantity, unitPrice }: {
      materialId: string;
      materialBrandId?: string;
      brandName?: string;
      sizeName?: string | null;
      colorName?: string | null;
      typeName?: string | null;
      quantity: number;
      unitPrice?: number;
    }) => {
      await api.post(`/orders/${id}/standalone-items`, { materialId, materialBrandId, brandName, sizeName, colorName, typeName, quantity, unitPrice });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['storage_materials'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(t('alerts.materialAdded'));
      setIsAddMaterialOpen(false);
      setSelectedMaterialId('');
      setSelectedMaterialBrandId('');
      setMaterialQty('1');
      setMaterialPriceInput('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('alerts.error'));
    }
  });

  const removeMaterialMutation = useMutation({
    mutationFn: async (lineId: string) => {
      await api.delete(`/orders/${id}/standalone-items/${lineId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['storage_materials'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(t('alerts.materialRemoved'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('alerts.error'));
    }
  });

  const updateStandaloneLineMutation = useMutation({
    mutationFn: async ({ lineId, priceAtOrderTime, quantity }: { lineId: string; priceAtOrderTime?: number; quantity?: number }) => {
      await api.patch(`/orders/${id}/standalone-items/${lineId}`, { priceAtOrderTime, quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['storage_materials'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(t('orders.priceUpdated', 'Item updated successfully'));
      setEditingLine(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('alerts.error'));
    }
  });

  const { data: order, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get(`/orders/${id}`);
      return res.data;
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500 animate-pulse">{t('orders.detail.loading')}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col h-64 items-center justify-center gap-4">
        <div className="text-red-500 font-semibold text-lg">{t('orders.detail.notFound')}</div>
        <Button onClick={() => navigate('/orders')}>{t('orders.detail.return')}</Button>
      </div>
    );
  }

  const handlePrint = () => {
    if (order) {
      printOrderReceipt(order);
    }
  };

  const canModify = order.orderStatus !== 'DELIVERED' && order.orderStatus !== 'CANCELLED';

  // Financial Summary Breakdown & Metrics
  const servicesCount = order.serviceLines?.length || 0;
  const servicesSubtotal = order.serviceLines?.reduce((sum: number, sl: any) => sum + Number(sl.priceAtOrderTime || 0), 0) || 0;
  
  const materialsCount = order.standaloneLines?.length || 0;
  const materialsSubtotal = order.standaloneLines?.reduce((sum: number, ml: any) => sum + (Number(ml.priceAtOrderTime || 0) * Number(ml.quantity || 1)), 0) || 0;
  
  const additionalChargesCount = order.additionalCharges?.length || 0;
  const additionalChargesSubtotal = order.additionalCharges?.reduce((sum: number, ac: any) => sum + Number(ac.price || 0), 0) || 0;
  const serviceFeeAmount = Number(order.serviceFee || 0);

  const grossSubtotal = Number(order.totalPrice !== undefined ? order.totalPrice : (servicesSubtotal + materialsSubtotal + additionalChargesSubtotal + serviceFeeAmount));
  const discountAmount = Number(order.totalDiscount !== undefined ? order.totalDiscount : (order.discountAmount || 0));
  const taxAmount = Number(order.taxAmount || 0);
  const netTotal = Number(order.netPrice !== undefined ? order.netPrice : (grossSubtotal - discountAmount + taxAmount));
  const totalPaid = Number(order.totalPaid !== undefined ? order.totalPaid : (order.payments?.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0) || 0));
  const balanceDue = Number(order.balanceDue !== undefined ? order.balanceDue : (netTotal - totalPaid));
  
  const paidPercentage = netTotal > 0 
    ? Math.min(100, Math.max(0, Math.round((totalPaid / netTotal) * 100)))
    : (totalPaid > 0 ? 100 : 0);

  const isFullyPaid = balanceDue <= 0 && totalPaid > 0;
  const isPartiallyPaid = totalPaid > 0 && balanceDue > 0;

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-10 animate-in fade-in duration-300">
      {/* 1. Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap overflow-x-auto select-none mb-2.5">
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="inline-flex items-center gap-1.5 font-medium hover:text-foreground transition-colors cursor-pointer shrink-0"
        >
          <Car className="w-3.5 h-3.5 text-amber-500 shrink-0 inline-block" />
          <span className="shrink-0">{t('common.orders', 'Work Orders')}</span>
        </button>
        <span className="text-muted-foreground/40 shrink-0 select-none">›</span>
        <span className="font-semibold text-foreground font-mono shrink-0">
          #{order.orderNumber}
        </span>
      </nav>

      {/* 2. Executive Order Header & Gridded Overview */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        {/* Top Header Bar: Order #, Status, Payment, FSR & Actions */}
        <div className="p-3.5 sm:px-5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/60 bg-card">
          {/* Left: Back Icon + Title + Status Badges + FSR */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              radius="md"
              onClick={() => navigate('/orders')}
              title="Back to Orders"
              className="shrink-0"
            >
              <ArrowLeft size={18} />
            </ActionIcon>

            <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground font-mono">
              #{order.orderNumber}
            </h1>

            <Badge variant="outline" className={`px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(order.orderStatus)}`}>
              {formatStatus(order.orderStatus)}
            </Badge>

            <Badge variant="outline" className={`px-2.5 py-0.5 text-xs font-semibold ${getPaymentColor(order.paymentStatus)}`}>
              {formatStatus(order.paymentStatus)}
            </Badge>

            {order.fsrNumber ? (
              <button 
                type="button"
                onClick={handleOpenFsrDialog} 
                className="group inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-all cursor-pointer shadow-xs"
                title={t('orders.detail.editFsr', 'Edit FSR #')}
              >
                <Receipt className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="font-mono">FSR: {order.fsrNumber}</span>
                <Pencil className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 transition-opacity" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleOpenFsrDialog}
                className="group inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/70 border border-border/80 hover:border-foreground/20 transition-all cursor-pointer"
                title={t('orders.fsrAuditReference', 'Add Fiscal Sales Receipt paper audit number')}
              >
                <Plus className="w-3 h-3 text-muted-foreground group-hover:text-foreground shrink-0" />
                <Receipt className="w-3.5 h-3.5 text-muted-foreground/70 group-hover:text-foreground shrink-0" />
                <span>{t('orders.detail.addFsr', 'Add FSR #')}</span>
              </button>
            )}
          </div>

          {/* Right: Action Toolbar strictly right-aligned */}
          <div className="flex items-center gap-2 flex-wrap shrink-0 justify-end">
            <Tooltip label={t('common.refresh', 'Refresh order')} withArrow>
              <ActionIcon
                variant="default"
                size="lg"
                radius="md"
                loading={isFetching}
                onClick={() => refetch()}
                aria-label="Refresh order"
                style={{ height: 34, width: 34 }}
              >
                <RotateCw size={16} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label={t('orders.actions.printReceipt', 'Print Receipt')} withArrow>
              <ActionIcon
                variant="default"
                size="lg"
                radius="md"
                onClick={handlePrint}
                aria-label={t('orders.actions.printReceipt', 'Print Receipt')}
                style={{ height: 34, width: 34 }}
              >
                <Printer size={16} />
              </ActionIcon>
            </Tooltip>

            <MantineButton 
              variant="default"
              radius="md"
              size="sm"
              onClick={() => setIsStatusModalOpen(true)} 
              leftSection={<CheckCheck size={16} className="text-blue-500" />}
              style={{
                fontWeight: 600,
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                height: 34,
                paddingLeft: 12,
                paddingRight: 12,
              }}
            >
              {t('common.status', 'Status')}
            </MantineButton>

            <MantineButton 
              variant="gradient"
              gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
              radius="md"
              size="sm"
              onClick={() => setIsPaymentModalOpen(true)} 
              leftSection={<CreditCard size={16} />}
              style={{
                boxShadow: "0 2px 10px rgba(245, 158, 11, 0.25)",
                fontWeight: 600,
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                letterSpacing: "-0.01em",
                height: 34,
                paddingLeft: 16,
                paddingRight: 16,
              }}
            >
              {t('orders.actions.addPayment', 'Record Payment')}
            </MantineButton>
          </div>
        </div>

        {/* Structured 5-Column Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border/60 bg-muted/10">
          {/* 1. Customer Cell */}
          <div className="p-3 sm:px-4 sm:py-3 flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>{t('common.customer', 'Customer')}</span>
                {order.customer?.id && (
                  <button
                    type="button"
                    onClick={() => navigate(`/customers/${order.customer.id}`)}
                    className="text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-0.5 font-semibold text-[10px] cursor-pointer"
                    title="View customer profile"
                  >
                    <span>{t('common.view', 'View')}</span>
                    <ArrowUpRight className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
              <div className="font-bold text-xs text-foreground truncate mt-0.5">
                {order.customer?.name || t('receipt.walkInCustomer', 'Walk-in Client')}
              </div>
              <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                {order.customer?.phone || order.customer?.phoneNumber ? (
                  <a
                    href={`tel:${order.customer.phone || order.customer.phoneNumber}`}
                    className="hover:text-amber-500 transition-colors inline-flex items-center gap-1"
                  >
                    <Phone className="w-2.5 h-2.5 text-muted-foreground" />
                    <span>{order.customer.phone || order.customer.phoneNumber}</span>
                  </a>
                ) : (
                  <span className="italic opacity-70">{t('orders.detail.walkInCustomer', 'Walk-in')}</span>
                )}
              </div>
            </div>
          </div>

          {/* 2. Vehicle Cell */}
          <div className="p-3 sm:px-4 sm:py-3 flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
              <Car className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('orders.detail.vehicleDetails', 'Vehicle')}
              </div>
              {order.vehicle ? (
                <div className="mt-0.5 min-w-0">
                  <div className="font-bold text-xs text-foreground truncate">
                    {[order.vehicle.carModel?.brand?.name, order.vehicle.carModel?.name].filter(Boolean).join(' ') || 'Vehicle'}
                  </div>
                  <div className="mt-1">
                    <PlateBadge plate={order.vehicle.plateNumber} size="xs" />
                  </div>
                </div>
              ) : (
                <div className="mt-0.5">
                  <span className="italic text-muted-foreground text-xs font-normal">{t('orders.detail.noVehicle', 'No vehicle')}</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Order Date Cell */}
          <div className="p-3 sm:px-4 sm:py-3 flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('orders.detail.orderDate', 'Order Date')}
              </div>
              <div className="font-bold text-xs text-foreground truncate mt-0.5">
                {formatAppDate(order.orderDateTime, false)}
              </div>
              <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                {new Date(order.orderDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* 4. Items & Scope Cell */}
          <div className="p-3 sm:px-4 sm:py-3 flex items-start gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('orders.detail.orderScope', 'Items & Scope')}
              </div>
              <div className="font-bold text-xs text-foreground truncate mt-0.5">
                {servicesCount + materialsCount + additionalChargesCount} {t('common.items', 'Items')}
              </div>
              <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                {servicesCount} {t('common.services', 'services')} • {materialsCount} {t('orders.detail.materialsParts', 'materials')}
              </div>
            </div>
          </div>

          {/* 5. Target Deadline Cell */}
          <div className="p-3 sm:px-4 sm:py-3 flex items-start gap-2.5 min-w-0 col-span-2 sm:col-span-1">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
              order.deadline
                ? (new Date(order.deadline) < new Date() && order.orderStatus !== 'COMPLETED' && order.orderStatus !== 'DELIVERED')
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : order.deadlineWarningSent
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'bg-muted text-muted-foreground'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t('orders.create.deadlineSchedule', 'Target Deadline')}
              </div>
              {order.deadline ? (
                <>
                  <div className="font-bold text-xs text-foreground truncate mt-0.5">
                    {formatAppDate(order.deadline, false)}
                  </div>
                  <div className="text-[11px] truncate mt-0.5 flex items-center gap-1">
                    {new Date(order.deadline) < new Date() && order.orderStatus !== 'COMPLETED' && order.orderStatus !== 'DELIVERED' ? (
                      <span className="font-bold text-rose-600 dark:text-rose-400">{t('orders.detail.overdue', 'Overdue')}</span>
                    ) : order.deadlineWarningSent ? (
                      <span className="font-bold text-amber-600 dark:text-amber-400">70% Alert</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{t('orders.detail.onSchedule', 'On Schedule')}</span>
                    )}
                    <span className="text-muted-foreground/50">•</span>
                    <span className="text-muted-foreground">{new Date(order.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="font-medium text-xs text-muted-foreground truncate mt-0.5">
                    {t('orders.detail.noDeadline', 'None')}
                  </div>
                  <div className="text-[11px] text-muted-foreground/60 truncate mt-0.5">
                    {t('orders.detail.notScheduled', 'No deadline set')}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Columns on Left, 1 Column on Right (Order Summary & Payments at Top) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-start">
        
        {/* Left 2 Columns: Client/Vehicle Hub, Items & Assignments */}
        <div className="lg:col-span-2 space-y-3.5">
          
          {/* Top Info Hub: Customer & Vehicle (Col 1) + Preset Conditions (Col 2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* Column 1: Customer Details & Vehicle Details Stacked */}
            <div className="space-y-2.5 flex flex-col justify-between">
              
              {/* Customer Details Card */}
              <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden hover:border-amber-500/30 transition-all">
                <div className="py-2 px-3.5 border-b border-border/60 flex items-center justify-between bg-card">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <User className="w-3 h-3" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t('orders.detail.customerDetails')}
                    </span>
                  </div>
                  {order.customer?.id && (
                    <Button 
                      variant="ghost" 
                      size="icon-xs" 
                      onClick={() => navigate(`/customers/${order.customer.id}`)}
                      title={t('orders.detail.viewCustomerProfile')}
                      className="text-gray-400 hover:text-primary h-5 w-5"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                <div className="p-2.5 sm:p-3">
                  {order.customer ? (
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center shadow-xs text-xs shrink-0">
                          {order.customer.name?.charAt(0).toUpperCase() || 'C'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-foreground truncate leading-tight">
                            {order.customer.name}
                          </p>
                          {(order.customer.phone || order.customer.phoneNumber) && (
                            <a 
                              href={`tel:${order.customer.phone || order.customer.phoneNumber}`} 
                              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors mt-0.5 truncate"
                            >
                              <Phone className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
                              <span className="truncate">{order.customer.phone || order.customer.phoneNumber}</span>
                            </a>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60 font-medium shrink-0">
                        {t('orders.detail.client')}
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground py-0.5">
                      <User className="w-3.5 h-3.5 opacity-40" />
                      <span className="text-xs italic">{t('orders.detail.walkInCustomer')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Details Card */}
              <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden hover:border-amber-500/30 transition-all">
                <div className="py-2 px-3.5 border-b border-border/60 flex items-center justify-between bg-card">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Car className="w-3 h-3" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t('orders.detail.vehicleDetails')}
                    </span>
                  </div>
                </div>
                <div className="p-2.5 sm:p-3">
                  {order.vehicle ? (
                    <div className="space-y-1.5 min-w-0">
                      <p className="font-bold text-xs text-foreground truncate leading-tight">
                        {[order.vehicle.carModel?.brand?.name, order.vehicle.carModel?.name].filter(Boolean).join(' ') || 'Vehicle'}
                      </p>
                      <div>
                        <PlateBadge plate={order.vehicle.plateNumber} size="xs" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground py-0.5">
                      <Car className="w-3.5 h-3.5 opacity-40" />
                      <span className="text-xs italic">{t('orders.detail.noVehicle')}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Column 2: Preset Conditions Card */}
            <div className="flex w-full">
              <div className="w-full shadow-xs border border-border bg-card rounded-2xl overflow-hidden flex flex-col hover:border-amber-500/30 transition-all">
                <div className="py-2 px-3.5 border-b border-border/60 flex items-center justify-between bg-card">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <ClipboardList className="w-3 h-3" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t('orders.detail.presetConditions')}
                    </span>
                  </div>
                  <Badge 
                    variant={order.carStatuses?.length ? "outline" : "secondary"} 
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      order.carStatuses?.length 
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20' 
                        : 'text-muted-foreground'
                    }`}
                  >
                    {order.carStatuses?.length || 0} {order.carStatuses?.length === 1 ? t('orders.detail.condition') : t('orders.detail.conditions')}
                  </Badge>
                </div>
                
                <div className="p-2.5 sm:p-3 flex-1 flex flex-col justify-start">
                  {order.carStatuses && order.carStatuses.length > 0 ? (
                    <div className="space-y-2 max-h-[175px] overflow-y-auto custom-scrollbar pr-1">
                      {order.carStatuses.map((cs: any, idx: number) => {
                        let statusLabel = cs.customName;
                        if (!statusLabel && cs.carStatus?.name) {
                          const key = cs.carStatus.name;
                          const translated = t(`carStatus.${key}`);
                          if (translated && !translated.startsWith('carStatus.')) {
                            statusLabel = translated;
                          } else {
                            statusLabel = cs.carStatus.name
                              .replace(/_/g, ' ')
                              .toLowerCase()
                              .replace(/\b\w/g, (c: string) => c.toUpperCase());
                          }
                        }
                        statusLabel = statusLabel || t('orders.detail.generalCondition');

                        return (
                          <div 
                            key={cs.id || idx}
                            className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-950/15 border border-amber-500/15 hover:border-amber-500/30 transition-colors"
                          >
                            <div className="w-5 h-5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                              <AlertCircle className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-gray-900 dark:text-amber-100 leading-snug">
                                {statusLabel}
                              </p>
                              {cs.customDescription && (
                                <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 leading-snug">
                                  {cs.customDescription}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-muted-foreground py-2 px-1">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t('orders.detail.cleanInspection')}</p>
                        <p className="text-[11px] text-muted-foreground">{t('orders.detail.noDamageNoted')}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Main Items Table */}
          <div className="bg-white dark:bg-[#141414] rounded-2xl shadow-sm border border-gray-200/90 dark:border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#111111]/50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" /> {t('orders.detail.orderItems')}
              </h3>
              {canModify && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsAddServiceOpen(true)} className="border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161616]">
                    <Plus className="w-4 h-4 mr-1" /> {t('orders.create.addService')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsAddMaterialOpen(true)} className="border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161616]">
                    <Plus className="w-4 h-4 mr-1" /> {t('orders.detail.addMaterial')}
                  </Button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('common.type')}</TableHead>
                    <TableHead>{t('orders.detail.itemService')}</TableHead>
                    <TableHead className="text-right">{t('orders.create.qty')}</TableHead>
                    <TableHead className="text-right">{t('orders.create.total')}</TableHead>
                    {canModify && <TableHead className="w-20 text-right"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.serviceLines?.map((sl: any) => {
                    const serviceName = getLocName(sl.serviceCategory?.service || {}) || getLocName(sl.serviceCategory || {}) || 'Service';
                    const categoryTier = getLocName(sl.serviceCategory || {});
                    const stdPrice = Number(sl.serviceCategory?.price || 0);
                    const currentPrice = Number(sl.priceAtOrderTime || 0);
                    const explicitDiscount = Number(sl.discount || 0);
                    const priceDiscount = stdPrice > currentPrice ? (stdPrice - currentPrice) : 0;
                    const totalDiscount = explicitDiscount + priceDiscount;
                    const lineTotal = currentPrice - explicitDiscount;
                    const basePrice = stdPrice > 0 ? stdPrice : (currentPrice + explicitDiscount);
                    const discountPercent = basePrice > 0 && totalDiscount > 0 ? Math.round((totalDiscount / basePrice) * 100) : 0;

                    return (
                      <TableRow key={sl.id}>
                        <TableCell><Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800">{t('common.service')}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-gray-900 dark:text-white">{serviceName}</span>
                            {totalDiscount > 0 && (
                              <Badge 
                                variant="outline" 
                                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold px-1.5 py-0.5 shrink-0 inline-flex items-center gap-1"
                              >
                                <Tag className="w-2.5 h-2.5" />
                                <span>-{formatCurrency(totalDiscount)}</span>
                                {discountPercent > 0 && <span>({discountPercent}%)</span>}
                              </Badge>
                            )}
                          </div>
                          {categoryTier && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t('common.category')}: <span className="font-medium text-gray-700 dark:text-gray-300">{categoryTier}</span>
                            </p>
                          )}
                          {sl.materialDeductions && sl.materialDeductions.some((d: any) => d.brandName || d.materialBrand) && (
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              <span className="text-[10px] text-muted-foreground font-medium">{t('orders.detail.materialsUsed', 'Materials')}:</span>
                              {sl.materialDeductions.filter((d: any) => d.brandName || d.materialBrand).map((d: any) => {
                                const brandLabel = formatBrandSizeLabel({
                                  name: d.brandName || d.materialBrand?.name,
                                  size: d.sizeName || d.materialBrand?.size,
                                  color: d.colorName || d.materialBrand?.color,
                                  type: d.typeName || d.materialBrand?.type,
                                });
                                return (
                                  <Badge key={d.id} variant="outline" className="bg-muted/60 text-[10px] font-mono px-1.5 py-0 border-border/60">
                                    {getLocName(d.material || {})}: <span className="font-semibold text-foreground ml-1">{brandLabel || d.brandName}</span>
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">1</TableCell>
                        <TableCell className="text-right font-bold font-mono text-gray-900 dark:text-white">
                          {lineTotal.toLocaleString()}
                        </TableCell>
                        {canModify && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => {
                                  setEditingLine({
                                    type: 'service',
                                    id: sl.id,
                                    name: `${serviceName}${categoryTier ? ` (${categoryTier})` : ''}`,
                                    standardPrice: stdPrice,
                                    currentPrice,
                                  });
                                  setEditLinePriceInput(String(currentPrice));
                                }} 
                                title={t('orders.adjustPrice', 'Adjust Price / Discount')}
                                className="h-8 w-8 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeServiceMutation.mutate(sl.id)} 
                                disabled={removeServiceMutation.isPending} 
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {order.standaloneLines?.map((ml: any) => {
                    const stdPrice = Number(
                      allMaterials?.find((m: any) => m.id === ml.materialId)?.brands?.find((b: any) => b.id === ml.materialBrandId)?.price ??
                      allMaterials?.find((m: any) => m.id === ml.materialId)?.currentPrice ??
                      ml.material?.currentPrice ??
                      ml.priceAtOrderTime ??
                      0
                    );
                    const currentPrice = Number(ml.priceAtOrderTime || 0);
                    const qty = Number(ml.quantity || 1);
                    const explicitDiscount = Number(ml.discount || 0);
                    const priceDiscount = stdPrice > currentPrice ? ((stdPrice - currentPrice) * qty) : 0;
                    const totalDiscount = explicitDiscount + priceDiscount;
                    const lineTotal = (currentPrice * qty) - explicitDiscount;
                    const baseTotal = (stdPrice > 0 ? stdPrice : currentPrice) * qty + (stdPrice > 0 ? 0 : explicitDiscount);
                    const discountPercent = baseTotal > 0 && totalDiscount > 0 ? Math.round((totalDiscount / baseTotal) * 100) : 0;

                    return (
                      <TableRow key={ml.id}>
                        <TableCell><Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-800">{t('common.material')}</Badge></TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {ml.material?.itemCode && (
                              <span className="font-mono text-xs text-muted-foreground mr-0.5 font-semibold">
                                [{ml.material.itemCode}]
                              </span>
                            )}
                            <span>{getLocName(ml.material || {})}</span>
                            {(ml.brandName || ml.sizeName || ml.colorName || ml.typeName) && (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold">
                                {formatBrandSizeLabel({ name: ml.brandName, size: ml.sizeName, color: ml.colorName, type: ml.typeName })}
                              </Badge>
                            )}
                            {totalDiscount > 0 && (
                              <Badge 
                                variant="outline" 
                                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold px-1.5 py-0.5 shrink-0 inline-flex items-center gap-1"
                              >
                                <Tag className="w-2.5 h-2.5" />
                                <span>-{formatCurrency(totalDiscount)}</span>
                                {discountPercent > 0 && <span>({discountPercent}%)</span>}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{qty}</TableCell>
                        <TableCell className="text-right font-bold font-mono text-gray-900 dark:text-white">
                          {lineTotal.toLocaleString()}
                        </TableCell>
                        {canModify && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => {
                                  setEditingLine({
                                    type: 'material',
                                    id: ml.id,
                                    name: `${getLocName(ml.material || {})}${ml.brandName ? ` (${ml.brandName})` : ''}`,
                                    standardPrice: stdPrice,
                                    currentPrice,
                                    quantity: qty,
                                  });
                                  setEditLinePriceInput(String(currentPrice));
                                }} 
                                title={t('orders.adjustPrice', 'Adjust Price / Discount')}
                                className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => removeMaterialMutation.mutate(ml.id)} 
                                disabled={removeMaterialMutation.isPending} 
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {(!order.serviceLines?.length && !order.standaloneLines?.length) && (
                    <TableRow>
                      <TableCell colSpan={canModify ? 5 : 4} className="text-center py-6 text-gray-500">{t('orders.detail.noItems')}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          
          {/* Assignments */}
          <div className="bg-white dark:bg-[#141414] rounded-2xl shadow-sm border border-gray-200/90 dark:border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-white/[0.01] flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
                <PenTool className="w-4 h-4 text-primary" /> {t('orders.detail.assignedStaff')}
              </h3>
              <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 rounded-full">
                {order.assignments?.length || 0} {t('orders.detail.assigned')}
              </Badge>
            </div>
            <div className="p-4">
              {order.assignments && order.assignments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {order.assignments.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 dark:bg-[#1a1a1a]/80 border border-gray-100 dark:border-gray-800/80 hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                        {a.employee.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-gray-900 dark:text-white">{a.employee.name}</p>
                        <p className="text-[11px] text-muted-foreground">{a.roleLabel || a.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic text-xs py-1">{t('orders.detail.noEmployees')}</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Financial Hub & Order Summary */}
        <div className="space-y-3.5">
          
          {/* Main Financial Summary Card */}
          <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden transition-all">
            
            {/* Header with Title and Payment Status Pill */}
            <div className="py-2 px-3.5 border-b border-border/60 flex items-center justify-between bg-card">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Receipt className="w-3 h-3" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t('orders.create.orderSummary')}
                </span>
              </div>
              
              {/* Payment Status Pill */}
              {isFullyPaid ? (
                <Badge variant="outline" className="gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold text-[10px] rounded-full">
                  <CheckCircle2 className="w-2.5 h-2.5" /> {t('orders.detail.fullyPaid')}
                </Badge>
              ) : isPartiallyPaid ? (
                <Badge variant="outline" className="gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold text-[10px] rounded-full">
                  <Timer className="w-2.5 h-2.5" /> {t('orders.detail.partiallyPaid')}
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-semibold text-[10px] rounded-full">
                  <AlertCircle className="w-2.5 h-2.5" /> {t('orders.detail.unpaid')}
                </Badge>
              )}
            </div>

            <div className="p-2.5 sm:p-3 space-y-3">
              
              {/* Settlement Progress Bar */}
              <div className="space-y-2 bg-muted/30 p-3.5 rounded-xl border border-border">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-500" /> {t('orders.detail.settlementProgress')}
                  </span>
                  <span className={`font-bold ${isFullyPaid ? 'text-emerald-500' : 'text-foreground'}`}>
                    {paidPercentage}% {t('orders.detail.paid')}
                  </span>
                </div>
                
                {/* Progress track */}
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden p-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFullyPaid 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                        : isPartiallyPaid
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                        : 'bg-transparent'
                    }`}
                    style={{ width: `${paidPercentage}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
                  <span>{t('orders.detail.paid')}: <strong className="text-gray-700 dark:text-gray-300">{formatCurrency(totalPaid)}</strong></span>
                  <span>{t('orders.create.total')}: <strong className="text-gray-700 dark:text-gray-300">{formatCurrency(netTotal)}</strong></span>
                </div>
              </div>

              {/* Itemized Breakdown */}
              <div className="space-y-2.5 text-sm">
                
                {/* Services row */}
                {servicesCount > 0 && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <span>{t('common.services')} ({servicesCount})</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(servicesSubtotal)}</span>
                  </div>
                )}

                {/* Materials row */}
                {materialsCount > 0 && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                      <span>{t('orders.detail.materialsParts')} ({materialsCount})</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(materialsSubtotal)}</span>
                  </div>
                )}

                {/* Additional charges */}
                {additionalChargesCount > 0 && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      <span>{t('orders.detail.additionalCharges')} ({additionalChargesCount})</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(additionalChargesSubtotal)}</span>
                  </div>
                )}

                {/* Service Fee */}
                {serviceFeeAmount > 0 ? (
                  <div className="flex justify-between items-center text-muted-foreground group">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0 bg-amber-500" />
                      <span className="flex items-center gap-1.5">
                        <span>{t('orders.detail.serviceFee', 'Service Fee')}</span>
                        {canModify && (
                          <PermissionGate permission="orders.create">
                            <button
                              type="button"
                              onClick={handleOpenServiceFeeDialog}
                              className="p-1 rounded text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                              title={t('orders.detail.editServiceFee', 'Edit Service Fee')}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </PermissionGate>
                        )}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white font-mono">
                      {formatCurrency(serviceFeeAmount)}
                    </span>
                  </div>
                ) : canModify ? (
                  <div className="flex justify-end pt-0.5">
                    <PermissionGate permission="orders.create">
                      <button
                        type="button"
                        onClick={handleOpenServiceFeeDialog}
                        className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{t('orders.detail.addServiceFee', 'Add Service Fee')}</span>
                      </button>
                    </PermissionGate>
                  </div>
                ) : null}

                {/* Subtotal line */}
                <div className="border-t border-dashed border-gray-200 dark:border-gray-800 pt-2.5 flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">{t('orders.detail.subtotal')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(grossSubtotal)}</span>
                </div>

                {/* Discount */}
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-sm text-rose-500 dark:text-rose-400">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800">
                        {t('common.discount')}
                      </Badge>
                      <span>{t('orders.detail.appliedSavings')}</span>
                    </div>
                    <span className="font-semibold">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}

                {/* Tax / VAT */}
                {taxAmount > 0 && (
                  <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700">
                        {t('orders.detail.vat')}
                      </Badge>
                      <span>{t('orders.detail.tax')}</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">+{formatCurrency(taxAmount)}</span>
                  </div>
                )}

                {/* Down Payment (Advance) */}
                {Number(order.downPayment || 0) > 0 && (
                  <div className="flex justify-between items-center text-sm text-emerald-600 dark:text-emerald-400">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                        {t('orders.create.downPayment', 'Advance')}
                      </Badge>
                      <span>{t('orders.create.downPayment', 'Down Payment (Advance)')}</span>
                    </div>
                    <span className="font-semibold font-mono">-{formatCurrency(Number(order.downPayment))}</span>
                  </div>
                )}
              </div>

              {/* Net Grand Total Highlight Box */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 dark:from-[#1e1e1e] dark:to-[#171717] text-white shadow-md border border-gray-700/50 dark:border-gray-800 flex justify-between items-center">
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-gray-400">{t('orders.detail.netTotal')}</span>
                  <p className="text-xs text-gray-400/80">{t('orders.detail.totalPayable')}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black tracking-tight text-[#f3ba4f] drop-shadow-sm">
                    {formatCurrency(netTotal)}
                  </span>
                </div>
              </div>

              {/* Balance Due / Settlement Box */}
              {isFullyPaid ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{t('orders.detail.paidInFull')}</div>
                      <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80">{t('orders.detail.noBalance')}</div>
                    </div>
                  </div>
                  <div className="text-right font-bold text-sm text-emerald-700 dark:text-emerald-300">
                    {t('orders.detail.zeroDue')}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> {t('orders.detail.balanceDue')}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">{t('orders.detail.outstanding')}</p>
                    </div>
                    <span className="text-2xl font-black text-amber-800 dark:text-amber-300">
                      {formatCurrency(balanceDue)}
                    </span>
                  </div>

                  {/* Direct Add Payment CTA */}
                  <MantineButton 
                    variant="gradient"
                    gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                    radius="md"
                    size="md"
                    fullWidth
                    onClick={() => setIsPaymentModalOpen(true)} 
                    leftSection={<CreditCard size={18} />}
                    style={{
                      boxShadow: "0 2px 10px rgba(245, 158, 11, 0.25)",
                      fontWeight: 600,
                      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                      letterSpacing: "-0.01em",
                      height: 40,
                    }}
                  >
                    {t('orders.detail.recordPayment')}
                  </MantineButton>
                </div>
              )}

              {/* Quick Actions */}
              <div className="pt-1">
                <Button 
                  variant="outline" 
                  onClick={handlePrint} 
                  className="w-full gap-2 h-10 rounded-xl border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] text-gray-700 dark:text-gray-300"
                >
                  <Printer className="w-4 h-4" /> {t('orders.actions.printReceipt')}
                </Button>
              </div>

            </div>
          </div>

          {/* Payment History Card */}
          <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
            <div className="py-2 px-3.5 border-b border-border/60 flex items-center justify-between bg-card">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-muted/60 text-muted-foreground flex items-center justify-center">
                  <Clock className="w-3 h-3" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t('orders.detail.paymentHistory')}
                </span>
              </div>
              <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {order.payments?.length || 0} {order.payments?.length === 1 ? t('orders.detail.record') : t('orders.detail.records')}
              </Badge>
            </div>
            <div className="p-2.5 sm:p-3">
              {order.payments && order.payments.length > 0 ? (
                <div className="space-y-3">
                  {order.payments.map((p: any) => {
                    const methodInfo = getPaymentMethodInfo(p.method);
                    const MethodIcon = methodInfo.icon;
                    return (
                      <div 
                        key={p.id} 
                        className="p-3 rounded-xl bg-gray-50/80 dark:bg-[#1a1a1a]/80 border border-gray-100 dark:border-gray-800/80 flex items-start justify-between gap-3 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${methodInfo.color}`}>
                            <MethodIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-gray-900 dark:text-white">
                                {methodInfo.label}
                              </span>
                              {p.methodDetails && (
                                <span className="text-[10px] bg-background border px-1.5 py-0.2 rounded text-muted-foreground font-mono">
                                  {p.methodDetails}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {p.paidAt ? formatAppDate(p.paidAt, true) : t('orders.detail.unknownDate')}
                            </div>
                            {p.recordedBy?.name && (
                              <div className="text-[10px] text-muted-foreground/80 mt-0.5">
                                {t('orders.detail.by')} {p.recordedBy.name}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(p.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-muted-foreground space-y-2">
                  <CreditCard className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-sm">{t('orders.detail.noPayments')}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="mt-2 text-xs rounded-lg"
                  >
                    {t('orders.detail.recordFirstPayment')}
                  </Button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Add Service Dialog */}
      <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white">
          <DialogHeader>
            <DialogTitle>{t('orders.create.addService')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="service-select">{t('common.service')}</Label>
              <Select value={selectedServiceId} onValueChange={(val) => handleServiceChange(val || '')}>
                <SelectTrigger id="service-select" className="border-gray-200 dark:border-gray-800">
                  <SelectValue placeholder={t('orders.create.placeholder.service', 'Select a service')}>
                    {(val: string) => {
                      if (!val) return <span className="text-muted-foreground">{t('orders.create.placeholder.service', 'Select a service')}</span>;
                      const s = allServices?.find((x: any) => x.id === val);
                      return s ? (
                        <span>
                          {s.serviceGroup && (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold mr-1">
                              [{getLocName(s.serviceGroup)}]
                            </span>
                          )}
                          {getLocName(s)}
                        </span>
                      ) : val;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800">
                  {allServices?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.serviceGroup ? `[${getLocName(s.serviceGroup)}] ${getLocName(s)}` : getLocName(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category-select">{t('common.category')}</Label>
              <Select 
                value={selectedCategoryId} 
                onValueChange={(val) => {
                  const cId = val || '';
                  setSelectedCategoryId(cId);
                  const c = categoriesForSelectedService?.find((x: any) => x.id === cId);
                  if (c) {
                    setServicePriceInput(String(c.price));
                    const initSelections: Record<string, string> = {};
                    c.materialUsages?.forEach((u: any) => {
                      const mat = allMaterials?.find((m: any) => m.id === u.materialId);
                      if (mat?.brands?.length === 1) {
                        initSelections[u.materialId] = mat.brands[0].id;
                      }
                    });
                    setServiceMaterialBrandSelections(initSelections);
                  } else {
                    setServicePriceInput('');
                    setServiceMaterialBrandSelections({});
                  }
                }} 
                disabled={!selectedServiceId}
              >
                <SelectTrigger id="category-select" className="border-gray-200 dark:border-gray-800">
                  <SelectValue placeholder={t('orders.create.placeholder.category', 'Select a category')}>
                    {(val: string) => {
                      if (!val) return <span className="text-muted-foreground">{t('orders.create.placeholder.category', 'Select a category')}</span>;
                      const c = categoriesForSelectedService?.find((x: any) => x.id === val);
                      return c ? `${getLocName(c)} (${Number(c.price).toLocaleString()} ${t('common.birr', 'Birr')})` : val;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800">
                  {categoriesForSelectedService?.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {getLocName(cat)} ({Number(cat.price).toLocaleString()} {t('common.birr', 'Birr')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCategoryId && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="service-price">{t('orders.create.unitPrice', 'Service Price (Birr)')}</Label>
                  {(() => {
                    const cat = categoriesForSelectedService?.find((c: any) => c.id === selectedCategoryId);
                    if (!cat) return null;
                    const std = Number(cat.price);
                    const custom = Number(servicePriceInput);
                    if (!isNaN(custom) && custom < std && custom > 0) {
                      return (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          -{formatCurrency(std - custom)} ({Math.round(((std - custom) / std) * 100)}% off)
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
                <Input
                  id="service-price"
                  type="text"
                  value={servicePriceInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*\.?\d*$/.test(val)) setServicePriceInput(val);
                  }}
                  placeholder="0.00"
                  className="font-mono font-bold border-gray-200 dark:border-gray-800"
                />
              </div>
            )}

            {/* Required Materials & Variant Selectors */}
            {(() => {
              const cat = categoriesForSelectedService?.find((c: any) => c.id === selectedCategoryId);
              const hasBrandedUsages = cat?.materialUsages?.some((u: any) => {
                const m = allMaterials?.find((x: any) => x.id === u.materialId);
                return m?.brands && m.brands.length > 0;
              });
              if (!hasBrandedUsages) return null;

              return (
                <div className="p-3 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5" />
                    <span>{t('orders.create.requiredMaterials', 'Required Materials & Parts')}</span>
                  </div>
                  <div className="space-y-2">
                    {cat.materialUsages.map((usage: any) => {
                      const mat = allMaterials?.find((x: any) => x.id === usage.materialId);
                      if (!mat || !mat.brands || mat.brands.length === 0) return null;
                      const selectedBrandId = serviceMaterialBrandSelections[mat.id] || '';
                      return (
                        <div key={usage.id || usage.materialId} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                            <span className="truncate">{getLocName(mat)}</span>
                            <span className="text-[11px] text-muted-foreground font-mono font-normal">
                              ({usage.quantityUsed} {mat.unit || ''})
                            </span>
                          </div>
                          <Select
                            value={selectedBrandId}
                            onValueChange={(val) => {
                              setServiceMaterialBrandSelections(prev => ({ ...prev, [mat.id]: val }));
                            }}
                          >
                            <SelectTrigger className="border-gray-200 dark:border-gray-800 text-xs h-9">
                              <SelectValue placeholder={t('materials.selectBrand', 'Select brand / variant...')}>
                                {(val: string) => {
                                  const b = mat.brands.find((x: any) => x.id === val);
                                  if (!b) return <span className="text-muted-foreground">{t('materials.selectBrand', 'Select brand / variant...')}</span>;
                                  const stock = Number(b.brandStocks?.find((s: any) => s.store?.type === 'MINI')?.quantity ?? 0);
                                  return (
                                    <span className="text-xs font-semibold truncate block">
                                      {formatBrandSizeLabel({ name: b.name, size: b.size, color: b.color, type: b.type })} ({stock} in stock)
                                    </span>
                                  );
                                }}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800">
                              {mat.brands.map((b: any) => {
                                const stock = Number(b.brandStocks?.find((s: any) => s.store?.type === 'MINI')?.quantity ?? 0);
                                const label = formatBrandSizeLabel({ name: b.name, size: b.size, color: b.color, type: b.type });
                                const isInsufficient = stock < Number(usage.quantityUsed);
                                return (
                                  <SelectItem key={b.id} value={b.id} disabled={isInsufficient} className="text-xs">
                                    {label} ({stock} {t('orders.create.inStock', 'in stock')}) {isInsufficient ? ' - Insufficient' : ''}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            {(() => {
              const cat = categoriesForSelectedService?.find((c: any) => c.id === selectedCategoryId);
              const unallocatedUsage = cat?.materialUsages?.find((u: any) => {
                const mat = allMaterials?.find((m: any) => m.id === u.materialId);
                return mat && getMaterialUnallocatedStock(mat, 'MINI') > 0;
              });
              if (!unallocatedUsage) return null;
              const unallocatedMat = allMaterials?.find((m: any) => m.id === unallocatedUsage.materialId);
              const unallocatedQty = unallocatedMat ? getMaterialUnallocatedStock(unallocatedMat, 'MINI') : 0;

              return (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-semibold">{t('storage.needsAllocation', 'Needs Allocation')}</p>
                    <p>
                      {t('storage.unallocatedServiceBlocked', {
                        serviceName: `${getLocName(selectedService)} - ${getLocName(cat)}`,
                        materialName: getLocName(unallocatedMat),
                        unallocated: unallocatedQty,
                        defaultValue: `Cannot add service: Required material "${getLocName(unallocatedMat)}" has ${unallocatedQty} unallocated stock in Mini Store. Please allocate it first in Storage.`
                      })}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddServiceOpen(false)} className="border-gray-200 dark:border-gray-800">{t('common.cancel')}</Button>
            {(() => {
              const cat = categoriesForSelectedService?.find((c: any) => c.id === selectedCategoryId);
              const hasUnallocatedUsage = Boolean(cat?.materialUsages?.some((u: any) => {
                const mat = allMaterials?.find((m: any) => m.id === u.materialId);
                return mat && getMaterialUnallocatedStock(mat, 'MINI') > 0;
              }));

              return (
                <Button 
                  onClick={() => {
                    if (!selectedCategoryId) return;
                    if (cat && cat.materialUsages) {
                      for (const usage of cat.materialUsages) {
                        const mat = allMaterials?.find((m: any) => m.id === usage.materialId);
                        if (mat) {
                          const unallocated = getMaterialUnallocatedStock(mat, 'MINI');
                          if (unallocated > 0) {
                            toast.error(
                              t('storage.unallocatedServiceBlocked', {
                                serviceName: `${getLocName(selectedService)} - ${getLocName(cat)}`,
                                materialName: getLocName(mat),
                                unallocated,
                                defaultValue: `Cannot add service: Required material "${getLocName(mat)}" has ${unallocated} unallocated stock in Mini Store. Please allocate it first in Storage.`
                              })
                            );
                            return;
                          }

                          if (mat.brands && mat.brands.length > 0) {
                            const selectedBrandId = serviceMaterialBrandSelections[mat.id];
                            if (!selectedBrandId) {
                              toast.error(t('orders.create.selectBrandForMaterial', { name: getLocName(mat), defaultValue: `Please select a brand/variant for ${getLocName(mat)}` }));
                              return;
                            }
                            const brand = mat.brands.find((b: any) => b.id === selectedBrandId);
                            const brandStock = Number(brand?.brandStocks?.find((s: any) => s.store?.type === 'MINI')?.quantity ?? 0);
                            const needed = Number(usage.quantityUsed);
                            if (needed > brandStock) {
                              toast.error(t('orders.validation.notEnoughStockForBrand', {
                                brand: formatBrandSizeLabel(brand),
                                needed,
                                available: brandStock,
                                defaultValue: `Insufficient stock for ${formatBrandSizeLabel(brand)}. Need ${needed}, but only ${brandStock} available in Mini Store.`
                              }));
                              return;
                            }
                          }
                        }
                        const qtyNeeded = Number(usage.quantityUsed);
                        const stock = mat?.materialStocks?.find((s: any) => s.store.type === 'MINI');
                        const available = stock ? Number(stock.quantity) : 0;
                        if (qtyNeeded > available) {
                          toast.error(t('orders.validation.notEnoughStock', { needed: qtyNeeded, available }));
                          return;
                        }
                      }
                    }
                    addServiceMutation.mutate({
                      serviceCategoryId: selectedCategoryId,
                      unitPrice: servicePriceInput && !isNaN(Number(servicePriceInput)) && Number(servicePriceInput) >= 0
                        ? Number(servicePriceInput)
                        : undefined,
                      selectedMaterials: cat?.materialUsages?.map((u: any) => ({
                        materialId: u.materialId,
                        materialBrandId: serviceMaterialBrandSelections[u.materialId] || undefined,
                      })),
                    });
                  }} 
                  disabled={
                    !selectedCategoryId || 
                    hasUnallocatedUsage || 
                    Boolean(cat?.materialUsages?.some((u: any) => {
                      const mat = allMaterials?.find((m: any) => m.id === u.materialId);
                      return mat?.brands && mat.brands.length > 0 && !serviceMaterialBrandSelections[mat.id];
                    })) ||
                    addServiceMutation.isPending
                  }
                >
                  {addServiceMutation.isPending ? t('common.adding') : t('orders.create.addService')}
                </Button>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Material Dialog */}
      <Dialog open={isAddMaterialOpen} onOpenChange={setIsAddMaterialOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white">
          <DialogHeader>
            <DialogTitle>{t('orders.detail.addMaterial')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="material">{t('orders.detail.materialItem')}</Label>
              <Select
                value={selectedMaterialId}
                onValueChange={(val) => {
                  const id = val || '';
                  setSelectedMaterialId(id);
                  const m = allMaterials?.find((x: any) => x.id === id);
                  if (m?.brands && m.brands.length > 0) {
                    setSelectedMaterialBrandId(m.brands[0].id);
                    setMaterialPriceInput(String(m.brands[0].price));
                  } else {
                    setSelectedMaterialBrandId('');
                    setMaterialPriceInput(m?.currentPrice ? String(m.currentPrice) : '');
                  }
                }}
              >
                <SelectTrigger id="material" className="border-gray-200 dark:border-gray-800">
                  <SelectValue placeholder={t('orders.create.placeholder.material', 'Select a material')}>
                    {(val: string) => {
                      if (!val) return <span className="text-muted-foreground">{t('orders.create.placeholder.material', 'Select a material')}</span>;
                      const m = allMaterials?.find((x: any) => x.id === val);
                      return m ? `${m.itemCode ? `[${m.itemCode}] ` : ''}${getLocName(m)}` : val;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800">
                  {allMaterials?.filter((m: any) => m.isStandaloneSellable).map((m: any) => {
                    const unalloc = getMaterialUnallocatedStock(m, 'MINI');
                    return (
                      <SelectItem key={m.id} value={m.id}>
                        {m.itemCode ? `[${m.itemCode}] ` : ''}{getLocName(m)} {m.brands && m.brands.length > 0 ? `(${m.brands.length} ${t('materials.brands', 'Brands')})` : `(${Number(m.currentPrice || 0).toLocaleString()} ${t('common.birr', 'Birr')})`}{unalloc > 0 ? ` (⚠️ ${t('storage.needsAllocation', 'Needs Allocation')})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {(() => {
              const activeMat = allMaterials?.find((x: any) => x.id === selectedMaterialId);
              const unalloc = activeMat ? getMaterialUnallocatedStock(activeMat, 'MINI') : 0;
              if (unalloc <= 0) return null;
              return (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-semibold">{t('storage.needsAllocation', 'Needs Allocation')}</p>
                      <p>
                        {t('storage.unallocatedOrderBlocked', {
                          unallocated: unalloc,
                          defaultValue: `This material has ${unalloc} unallocated stock in Mini Store. It must be allocated across brands in Storage before it can be added to an order.`
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const searchTarget = (i18n.language === 'am' && activeMat?.nameAm) ? activeMat.nameAm : (activeMat?.nameEn || activeMat?.itemCode || '');
                      setIsAddMaterialOpen(false);
                      navigate(`/storage?search=${encodeURIComponent(searchTarget)}&store=MINI&allocate=true&materialId=${activeMat?.id}`);
                    }}
                    className="shrink-0 font-bold underline text-amber-600 hover:text-amber-700 dark:text-amber-400 text-xs flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 mt-0.5"
                  >
                    <span>{t('storage.allocate', 'Allocate')}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })()}

            {(() => {
              const activeMat = allMaterials?.find((x: any) => x.id === selectedMaterialId);
              if (!activeMat?.brands || activeMat.brands.length === 0) return null;
              return (
                <div className="grid gap-2">
                  <Label htmlFor="brand">{t('materials.brands', 'Brand')}</Label>
                  <Select 
                    value={selectedMaterialBrandId} 
                    onValueChange={(val) => {
                      const bId = val || '';
                      setSelectedMaterialBrandId(bId);
                      const b = activeMat.brands?.find((x: any) => x.id === bId);
                      if (b) {
                        setMaterialPriceInput(String(b.price));
                      }
                    }}
                  >
                    <SelectTrigger id="brand" className="border-gray-200 dark:border-gray-800">
                      <SelectValue placeholder={t('materials.selectBrand', 'Select a brand')}>
                        {(val: string) => {
                          if (!val) return <span className="text-muted-foreground">{t('materials.selectBrand', 'Select a brand')}</span>;
                          const b = activeMat.brands?.find((x: any) => x.id === val);
                          return b ? formatBrandSizeLabel(b) : val;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800">
                      {activeMat.brands.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>
                          {formatBrandSizeLabel(b)} ({Number(b.price || 0).toLocaleString()} {t('common.birr', 'Birr')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })()}

            <div className="grid gap-2">
              <Label htmlFor="qty">
                {t('orders.detail.quantity')} {(() => {
                  const mat = allMaterials?.find((m: any) => m.id === selectedMaterialId);
                  return mat?.unit ? `(${formatUnit(mat.unit)})` : '';
                })()}
              </Label>
              <Input
                id="qty"
                type="text"
                value={materialQty}
                onChange={(e) => {
                  const val = e.target.value;
                  const mat = allMaterials?.find((m: any) => m.id === selectedMaterialId);
                  const isInt = isUnitIntegerOnly(mat?.unit);
                  const regex = isInt ? /^\d*$/ : /^\d*\.?\d*$/;
                  if (regex.test(val)) {
                    setMaterialQty(val);
                  }
                }}
                className="border-gray-200 dark:border-gray-800"
              />
            </div>

            {selectedMaterialId && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="material-price">{t('orders.create.unitPrice', 'Unit Price (Birr)')}</Label>
                  {(() => {
                    const mat = allMaterials?.find((m: any) => m.id === selectedMaterialId);
                    const brand = mat?.brands?.find((b: any) => b.id === selectedMaterialBrandId);
                    const std = Number(brand?.price ?? mat?.currentPrice ?? 0);
                    const custom = Number(materialPriceInput);
                    if (std > 0 && !isNaN(custom) && custom < std && custom > 0) {
                      return (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                          -{formatCurrency(std - custom)} ({Math.round(((std - custom) / std) * 100)}% off)
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
                <Input
                  id="material-price"
                  type="text"
                  value={materialPriceInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*\.?\d*$/.test(val)) setMaterialPriceInput(val);
                  }}
                  placeholder="0.00"
                  className="font-mono font-bold border-gray-200 dark:border-gray-800"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMaterialOpen(false)} className="border-gray-200 dark:border-gray-800">{t('common.cancel')}</Button>
            <Button
              onClick={() => {
                const qtyNeeded = Number(materialQty);
                const mat = allMaterials?.find((m: any) => m.id === selectedMaterialId);
                const isPcs = isUnitIntegerOnly(mat?.unit);

                if (!materialQty || isNaN(qtyNeeded) || qtyNeeded <= 0) {
                  return;
                }

                if (mat) {
                  const unallocated = getMaterialUnallocatedStock(mat, 'MINI');
                  if (unallocated > 0) {
                    toast.error(
                      t('storage.unallocatedOrderBlocked', {
                        name: getLocName(mat),
                        unallocated,
                        defaultValue: `This material has ${unallocated} unallocated stock in Mini Store. It must be allocated across brands in Storage before it can be added to an order.`
                      })
                    );
                    return;
                  }
                }

                if (isPcs && !Number.isInteger(qtyNeeded)) {
                  toast.error(t('storage.integerRequired', 'Quantity for PCS items must be a whole number (no decimals allowed)'));
                  return;
                }

                const stock = mat?.materialStocks?.find((s: any) => s.store.type === 'MINI');
                const available = stock ? Number(stock.quantity) : 0;
                
                if (qtyNeeded > available) {
                  toast.error(t('orders.validation.notEnoughStock', { needed: qtyNeeded, available }));
                  return;
                }

                if (mat?.brands && mat.brands.length > 0 && !selectedMaterialBrandId) {
                  toast.error(t('materials.brandRequired', 'Please select a brand'));
                  return;
                }

                const brand = mat?.brands?.find((b: any) => b.id === selectedMaterialBrandId);
                
                addMaterialMutation.mutate({
                  materialId: selectedMaterialId,
                  materialBrandId: brand?.id,
                  brandName: brand?.name,
                  sizeName: brand?.size || null,
                  colorName: brand?.color || null,
                  typeName: brand?.type || null,
                  quantity: qtyNeeded,
                  unitPrice: materialPriceInput && !isNaN(Number(materialPriceInput)) && Number(materialPriceInput) >= 0
                    ? Number(materialPriceInput)
                    : undefined,
                });
              }}
              disabled={
                !selectedMaterialId || 
                !materialQty || 
                Number(materialQty) <= 0 || 
                (Boolean(allMaterials?.find((m: any) => m.id === selectedMaterialId)) && getMaterialUnallocatedStock(allMaterials?.find((m: any) => m.id === selectedMaterialId), 'MINI') > 0) ||
                (isUnitIntegerOnly(allMaterials?.find((m: any) => m.id === selectedMaterialId)?.unit) && !Number.isInteger(Number(materialQty))) ||
                (Boolean(allMaterials?.find((m: any) => m.id === selectedMaterialId)?.brands?.length) && !selectedMaterialBrandId) ||
                addMaterialMutation.isPending
              }
            >
              {addMaterialMutation.isPending ? t('common.adding') : t('orders.detail.addMaterial')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpdateOrderStatusDialog
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        orderId={order?.id || ''}
        currentStatus={order?.orderStatus || 'OPEN'}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['order', id] });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['active-orders'] });
          queryClient.invalidateQueries({ queryKey: ['reports'] });
        }}
      />

      <OrderPaymentDialog
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        orderId={order?.id || ''}
        balanceDue={balanceDue}
        totalPaid={totalPaid}
        netTotal={netTotal}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['order', id] });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['reports'] });
        }}
      />

      <Dialog open={isFsrModalOpen} onOpenChange={setIsFsrModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Receipt className="w-5 h-5 text-primary" />
              {t('orders.updateFsr', 'Update FSR Number')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">
              {t('orders.fsrAuditReference', 'Fiscal Sales Receipt (FSR) paper audit reference number.')}
            </p>
            <div className="space-y-1.5">
              <Label>{t('orders.fsrNumber', 'FSR Number')}</Label>
              <Input
                placeholder="e.g. FSR-12345"
                value={fsrInputValue}
                onChange={(e) => setFsrInputValue(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsFsrModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            {order?.fsrNumber && (
              <Button
                variant="destructive"
                onClick={() => updateFsrMutation.mutate('')}
                disabled={updateFsrMutation.isPending}
                className="mr-auto"
              >
                {t('common.remove', 'Remove')}
              </Button>
            )}
            <Button
              onClick={() => updateFsrMutation.mutate(fsrInputValue)}
              disabled={updateFsrMutation.isPending}
            >
              {updateFsrMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Service Fee Dialog */}
      <Dialog open={isServiceFeeModalOpen} onOpenChange={setIsServiceFeeModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Receipt className="w-5 h-5 text-amber-500" />
              {Number(order?.serviceFee || 0) > 0 
                ? t('orders.detail.editServiceFee', 'Edit Service Fee') 
                : t('orders.detail.addServiceFee', 'Add Service Fee')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('orders.detail.adjustServiceFeeDesc', 'Set or adjust the custom service/labor fee for this order. It will immediately update the order total, net price, and balance due.')}
            </p>

            <div className="space-y-1.5">
              <Label>{t('orders.detail.serviceFee', 'Service Fee Amount')}</Label>
              <div className="relative">
                <Input
                  placeholder="0.00"
                  value={serviceFeeInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*\.?\d*$/.test(val)) setServiceFeeInput(val);
                  }}
                  className="font-mono font-bold pr-11"
                  autoFocus
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground select-none pointer-events-none">
                  ETB
                </span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsServiceFeeModalOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            {Number(order?.serviceFee || 0) > 0 && (
              <Button
                variant="destructive"
                onClick={() => updateServiceFeeMutation.mutate(0)}
                disabled={updateServiceFeeMutation.isPending}
                className="mr-auto"
              >
                {t('orders.detail.removeServiceFee', 'Remove Fee')}
              </Button>
            )}
            <Button
              onClick={() => updateServiceFeeMutation.mutate(Number(serviceFeeInput) || 0)}
              disabled={updateServiceFeeMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {updateServiceFeeMutation.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Line Price / Discount Dialog */}
      <Dialog open={!!editingLine} onOpenChange={(open) => !open && setEditingLine(null)}>
        <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-bold text-foreground leading-tight truncate">
                  {t('orders.adjustPrice', 'Adjust Item Price / Discount')}
                </DialogTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  {t('orders.adjustPriceDesc', 'Override standard catalog pricing for this item or offer a customer-specific discount.')}
                </p>
              </div>
            </div>
          </div>

          {editingLine && (() => {
            const parsed = Number(editLinePriceInput);
            const isValid = !isNaN(parsed) && parsed >= 0;
            const diff = isValid ? editingLine.standardPrice - parsed : 0;
            const isDiscount = diff > 0;
            const isSurcharge = diff < 0;
            const isPending = updateServiceLinePriceMutation.isPending || updateStandaloneLineMutation.isPending;

            return (
              <>
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Item Info Box */}
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {editingLine.type === 'service' ? t('common.service', 'Service') : t('common.material', 'Material')}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {t('orders.standardPrice', 'Standard')}: {formatCurrency(editingLine.standardPrice)}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-foreground break-words leading-snug">
                      {editingLine.name}
                    </div>
                  </div>

                  {/* Price input box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">
                        {t('orders.agreedPrice', 'Agreed Custom Price')}
                      </Label>
                      {Number(editLinePriceInput) !== editingLine.standardPrice && (
                        <button
                          type="button"
                          onClick={() => setEditLinePriceInput(String(editingLine.standardPrice))}
                          className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                        >
                          Reset to Standard
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        type="text"
                        className="font-mono font-bold pr-11"
                        value={editLinePriceInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^\d*\.?\d*$/.test(val)) setEditLinePriceInput(val);
                        }}
                        placeholder="0.00"
                        autoFocus
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground select-none pointer-events-none">
                        ETB
                      </span>
                    </div>
                  </div>

                  {/* Live Discount/Surcharge Feedback */}
                  {isValid && (
                    <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 flex-wrap ${
                      isDiscount 
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400' 
                        : isSurcharge 
                          ? 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400'
                          : 'bg-muted/40 border-border/70 text-muted-foreground'
                    }`}>
                      <span className="font-medium">
                        {isDiscount ? t('orders.customerDiscount', 'Customer Discount:') : isSurcharge ? t('orders.priceSurcharge', 'Price Surcharge:') : t('orders.standardPricing', 'Standard Pricing:')}
                      </span>
                      <span className="font-mono font-bold shrink-0">
                        {isDiscount && `-${formatCurrency(diff)} (${Math.round((diff / editingLine.standardPrice) * 100)}% off)`}
                        {isSurcharge && `+${formatCurrency(Math.abs(diff))}`}
                        {!isDiscount && !isSurcharge && t('common.noChange', 'No change')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-5 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2.5">
                  <Button
                    variant="outline"
                    onClick={() => setEditingLine(null)}
                    disabled={isPending}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    onClick={() => {
                      if (!isValid) return;
                      if (editingLine.type === 'service') {
                        updateServiceLinePriceMutation.mutate({
                          lineId: editingLine.id,
                          priceAtOrderTime: parsed,
                        });
                      } else {
                        updateStandaloneLineMutation.mutate({
                          lineId: editingLine.id,
                          priceAtOrderTime: parsed,
                        });
                      }
                    }}
                    disabled={!isValid || isPending}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                  >
                    {isPending ? t('common.saving') : t('common.save')}
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
