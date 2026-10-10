import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { format } from 'date-fns';
import { formatCurrency, formatStatus } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { formatPlateNumber, parsePlateNumber } from '../utils/plate';
import { Button } from '../components/ui/button';
import { ArrowLeft, Printer, Car, User, CheckCircle, CreditCard, PenTool, ClipboardList, Plus, Trash2, Timer, CheckCircle2, Banknote, Landmark, Smartphone, Receipt, AlertCircle, Coins, Clock, Phone, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { UpdateOrderStatusDialog } from '../components/UpdateOrderStatusDialog';
import { OrderPaymentDialog } from '../components/OrderPaymentDialog';
import { printOrderReceipt } from '../lib/receipt-printer';

const renderPlateBadge = (plateStr?: string) => {
  if (!plateStr) return null;
  const parsed = parsePlateNumber(plateStr);
  if (parsed) {
    let bg = '#FFFFFF';
    let fg = '#111827';
    const cat = (parsed.category || '').toLowerCase();
    if (cat === '1') fg = '#B91C1C';
    else if (cat === '2') fg = '#1E50BC';
    else if (cat === '3') fg = '#15803D';
    else if (cat === '5') fg = '#EA580C';
    else if (['un', 'au', 'temp'].includes(cat)) fg = '#009BDA';
    else if (cat === 'police') { bg = '#FFB300'; fg = '#111827'; }

    return (
      <div 
        className="inline-flex items-stretch shadow-sm rounded overflow-hidden border border-gray-300 dark:border-gray-700 select-none shrink-0" 
        style={{ color: fg, backgroundColor: bg }}
      >
        <div className="flex flex-col items-center justify-center px-1.5 py-0.5 text-[7px] leading-[1.1] font-black text-white" style={{ backgroundColor: fg }}>
          <span>{parsed.amharic || 'ኢትዮጵያ'}</span>
          <span>{parsed.english || 'ET'}</span>
        </div>
        
        <div className="flex items-center justify-center px-1.5 border-r" style={{ borderColor: `${fg}30` }}>
          <span className="text-xs font-black">{parsed.category.toUpperCase()}</span>
        </div>
        
        <div className="flex items-center justify-center px-2 py-0.5">
          <span className="text-xs font-mono font-black tracking-wider">{parsed.serial}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center px-2 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded shadow-sm">
      <span className="font-mono text-xs font-bold tracking-wider text-gray-900 dark:text-white">
        {formatPlateNumber(plateStr)}
      </span>
    </div>
  );
};

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
  const getLocName = (item: any) => i18n.language === 'am' && item.nameAm ? item.nameAm : item.name;
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialQty, setMaterialQty] = useState('1');

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

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

  // Mutations
  const addServiceMutation = useMutation({
    mutationFn: async (serviceCategoryId: string) => {
      await api.post(`/orders/${id}/services`, { serviceCategoryId, priceMultiplier: 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      toast.success(t('alerts.serviceAdded'));
      setIsAddServiceOpen(false);
      setSelectedServiceId('');
      setSelectedCategoryId('');
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
    } else {
      setSelectedCategoryId('');
    }
  };

  const removeServiceMutation = useMutation({
    mutationFn: async (lineId: string) => {
      await api.delete(`/orders/${id}/services/${lineId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      toast.success(t('alerts.serviceRemoved'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('alerts.error'));
    }
  });

  const addMaterialMutation = useMutation({
    mutationFn: async ({ materialId, quantity }: { materialId: string, quantity: number }) => {
      await api.post(`/orders/${id}/standalone-items`, { materialId, quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      toast.success(t('alerts.materialAdded'));
      setIsAddMaterialOpen(false);
      setSelectedMaterialId('');
      setMaterialQty('1');
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
      toast.success(t('alerts.materialRemoved'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('alerts.error'));
    }
  });

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get(`/orders/${id}`);
      return res.data;
    },
    enabled: !!id,
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

  const grossSubtotal = Number(order.totalPrice !== undefined ? order.totalPrice : (servicesSubtotal + materialsSubtotal + additionalChargesSubtotal));
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
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="rounded-full w-10 h-10 border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161616]">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              {t('common.order')} {order.orderNumber}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {format(new Date(order.orderDateTime), 'MMMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <Button 
            onClick={() => setIsStatusModalOpen(true)} 
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white border-none rounded-xl shadow-[0_4px_14px_0_rgba(37,99,235,0.25)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.23)] hover:-translate-y-0.5 transition-all font-semibold px-5"
          >
            <CheckCircle className="w-4 h-4" /> {t('orders.updateStatus')}
          </Button>
          <Button 
            onClick={() => setIsPaymentModalOpen(true)} 
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground border-none rounded-xl shadow-[0_4px_14px_0_rgba(255,100,50,0.25)] hover:shadow-[0_6px_20px_rgba(255,100,50,0.23)] hover:-translate-y-0.5 transition-all font-semibold px-5"
          >
            <CreditCard className="w-4 h-4" /> {t('orders.actions.addPayment')}
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={handlePrint} 
            title="Print Receipt"
            className="rounded-xl border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161616] hover:bg-gray-50 dark:hover:bg-[#1f1f1f] transition-all shadow-sm hover:-translate-y-0.5"
          >
            <Printer className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          </Button>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex gap-3">
        <Badge variant="outline" className={`px-3 py-1 text-sm font-semibold ${getStatusColor(order.orderStatus)}`}>
          {formatStatus(order.orderStatus)}
        </Badge>
        <Badge variant="outline" className={`px-3 py-1 text-sm font-semibold ${getPaymentColor(order.paymentStatus)}`}>
          {formatStatus(order.paymentStatus)}
        </Badge>
      </div>

      {/* Main Grid: 2 Columns on Left, 1 Column on Right (Order Summary & Payments at Top) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left 2 Columns: Client/Vehicle Hub, Items & Assignments */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Top Info Hub: Customer & Vehicle (Col 1) + Preset Conditions (Col 2) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Column 1: Customer Details & Vehicle Details Stacked */}
            <div className="space-y-4 flex flex-col justify-between">
              
              {/* Customer Details Card */}
              <Card className="shadow-sm border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-[#141414] rounded-2xl overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-all">
                <div className="p-3 px-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-white/[0.01] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      {t('orders.detail.customerDetails')}
                    </span>
                  </div>
                  {order.customer?.id && (
                    <Button 
                      variant="ghost" 
                      size="icon-xs" 
                      onClick={() => navigate(`/customers/${order.customer.id}`)}
                      title={t('orders.detail.viewCustomerProfile')}
                      className="text-gray-400 hover:text-primary h-6 w-6"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <CardContent className="p-4">
                  {order.customer ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center shadow-sm text-sm shrink-0">
                          {order.customer.name?.charAt(0).toUpperCase() || 'C'}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                            {order.customer.name}
                          </p>
                          {(order.customer.phone || order.customer.phoneNumber) && (
                            <a 
                              href={`tel:${order.customer.phone || order.customer.phoneNumber}`} 
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-0.5"
                            >
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span>{order.customer.phone || order.customer.phoneNumber}</span>
                            </a>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/60 font-medium shrink-0">
                        {t('orders.detail.client')}
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground py-1">
                      <User className="w-4 h-4 opacity-40" />
                      <span className="text-xs italic">{t('orders.detail.walkInCustomer')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Vehicle Details Card */}
              <Card className="shadow-sm border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-[#141414] rounded-2xl overflow-hidden hover:border-gray-300 dark:hover:border-gray-700 transition-all">
                <div className="p-3 px-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-white/[0.01] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Car className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      {t('orders.detail.vehicleDetails')}
                    </span>
                  </div>
                  {order.vehicle && (
                    <Badge variant="outline" className="text-[10px] bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 font-medium shrink-0">
                      {t('orders.detail.attached')}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4">
                  {order.vehicle ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {renderPlateBadge(order.vehicle.plateNumber)}
                        <div>
                          <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                            {order.vehicle.carModel?.brand?.name} {order.vehicle.carModel?.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                            {formatPlateNumber(order.vehicle.plateNumber)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground py-1">
                      <Car className="w-4 h-4 opacity-40" />
                      <span className="text-xs italic">{t('orders.detail.noVehicle')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>

            {/* Column 2: Preset Conditions Card */}
            <div className="flex">
              <Card className="w-full shadow-sm border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-[#141414] rounded-2xl overflow-hidden flex flex-col hover:border-gray-300 dark:hover:border-gray-700 transition-all">
                <div className="p-3 px-4 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-white/[0.01] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <ClipboardList className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
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
                
                <CardContent className="p-3.5 flex-1 flex flex-col justify-start">
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
                </CardContent>
              </Card>
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
                    <TableHead className="text-right">{t('orders.detail.priceBirr')}</TableHead>
                    <TableHead className="text-right">{t('common.discount')}</TableHead>
                    <TableHead className="text-right">{t('orders.create.total')}</TableHead>
                    {canModify && <TableHead className="w-10"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.serviceLines?.map((sl: any) => {
                    const serviceName = getLocName(sl.serviceCategory?.service || {}) || getLocName(sl.serviceCategory || {}) || 'Service';
                    const categoryTier = getLocName(sl.serviceCategory || {});
                    return (
                      <TableRow key={sl.id}>
                        <TableCell><Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800">{t('common.service')}</Badge></TableCell>
                        <TableCell>
                          <p className="font-semibold text-gray-900 dark:text-white">{serviceName}</p>
                          {categoryTier && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t('common.category')}: <span className="font-medium text-gray-700 dark:text-gray-300">{categoryTier}</span>
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">1</TableCell>
                        <TableCell className="text-right">{Number(sl.priceAtOrderTime || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-red-500">{Number(sl.discount || 0) > 0 ? `-${Number(sl.discount || 0).toLocaleString()}` : '-'}</TableCell>
                        <TableCell className="text-right font-bold text-gray-900 dark:text-white">{(Number(sl.priceAtOrderTime || 0) - Number(sl.discount || 0)).toLocaleString()}</TableCell>
                        {canModify && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => removeServiceMutation.mutate(sl.id)} disabled={removeServiceMutation.isPending} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {order.standaloneLines?.map((ml: any) => (
                    <TableRow key={ml.id}>
                      <TableCell><Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-800">{t('common.material')}</Badge></TableCell>
                      <TableCell className="font-medium text-gray-900 dark:text-white">{getLocName(ml.material || {})}</TableCell>
                      <TableCell className="text-right">{ml.quantity}</TableCell>
                      <TableCell className="text-right">{Number(ml.priceAtOrderTime || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-500">{Number(ml.discount || 0) > 0 ? `-${Number(ml.discount || 0).toLocaleString()}` : '-'}</TableCell>
                      <TableCell className="text-right font-bold text-gray-900 dark:text-white">{((Number(ml.priceAtOrderTime || 0) * Number(ml.quantity)) - Number(ml.discount || 0)).toLocaleString()}</TableCell>
                      {canModify && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => removeMaterialMutation.mutate(ml.id)} disabled={removeMaterialMutation.isPending} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {(!order.serviceLines?.length && !order.standaloneLines?.length) && (
                    <TableRow>
                      <TableCell colSpan={canModify ? 7 : 6} className="text-center py-6 text-gray-500">{t('orders.detail.noItems')}</TableCell>
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
        <div className="space-y-6">
          
          {/* Main Financial Summary Card */}
          <Card className="shadow-lg shadow-black/5 border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-[#141414] rounded-2xl overflow-hidden transition-all">
            
            {/* Header with Title and Payment Status Pill */}
            <div className="p-5 pb-4 border-b border-gray-100 dark:border-gray-800/80 bg-gradient-to-b from-gray-50/80 to-transparent dark:from-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20 flex items-center justify-center shadow-sm">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base tracking-tight leading-none">
                    {t('orders.create.orderSummary')}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">{t('orders.detail.financialBreakdown')}</p>
                </div>
              </div>
              
              {/* Payment Status Pill */}
              {isFullyPaid ? (
                <Badge variant="outline" className="gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold text-xs rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('orders.detail.fullyPaid')}
                </Badge>
              ) : isPartiallyPaid ? (
                <Badge variant="outline" className="gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold text-xs rounded-full">
                  <Timer className="w-3.5 h-3.5" /> {t('orders.detail.partiallyPaid')}
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-semibold text-xs rounded-full">
                  <AlertCircle className="w-3.5 h-3.5" /> {t('orders.detail.unpaid')}
                </Badge>
              )}
            </div>

            <CardContent className="p-5 space-y-5">
              
              {/* Settlement Progress Bar */}
              <div className="space-y-2 bg-gray-50/60 dark:bg-[#1a1a1a]/60 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800/80">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-[#c9a84c]" /> {t('orders.detail.settlementProgress')}
                  </span>
                  <span className={`font-bold ${isFullyPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                    {paidPercentage}% {t('orders.detail.paid')}
                  </span>
                </div>
                
                {/* Progress track */}
                <div className="w-full h-2.5 bg-gray-200/80 dark:bg-gray-800 rounded-full overflow-hidden p-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      isFullyPaid 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
                        : isPartiallyPaid
                        ? 'bg-gradient-to-r from-amber-500 to-[#c9a84c]'
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
                  <Button 
                    onClick={() => setIsPaymentModalOpen(true)} 
                    className="w-full gap-2 bg-[#c9a84c] hover:bg-[#b89842] text-white font-semibold rounded-xl h-11 shadow-sm transition-all hover:shadow-md"
                  >
                    <CreditCard className="w-4 h-4" /> {t('orders.detail.recordPayment')}
                  </Button>
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

            </CardContent>
          </Card>

          {/* Payment History Card */}
          <Card className="shadow-sm border border-gray-200/90 dark:border-gray-800 bg-white dark:bg-[#141414] rounded-2xl overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-white/[0.01] flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" /> {t('orders.detail.paymentHistory')}
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 rounded-full">
                {order.payments?.length || 0} {order.payments?.length === 1 ? t('orders.detail.record') : t('orders.detail.records')}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 pt-3">
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
                              {p.paidAt ? format(new Date(p.paidAt), 'MMM d, yyyy • h:mm a') : t('orders.detail.unknownDate')}
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
            </CardContent>
          </Card>

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
                      return s ? getLocName(s) : val;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800">
                  {allServices?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {getLocName(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category-select">{t('common.category')}</Label>
              <Select value={selectedCategoryId} onValueChange={(val) => setSelectedCategoryId(val || '')} disabled={!selectedServiceId}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddServiceOpen(false)} className="border-gray-200 dark:border-gray-800">{t('common.cancel')}</Button>
            <Button 
              onClick={() => {
                if (!selectedCategoryId) return;
                const cat = categoriesForSelectedService?.find((c: any) => c.id === selectedCategoryId);
                if (cat && cat.materialUsages) {
                  for (const usage of cat.materialUsages) {
                    const qtyNeeded = Number(usage.quantityUsed);
                    const mat = allMaterials?.find((m: any) => m.id === usage.materialId);
                    const stock = mat?.materialStocks?.find((s: any) => s.store.type === 'MINI');
                    const available = stock ? Number(stock.quantity) : 0;
                    if (qtyNeeded > available) {
                      toast.error(t('orders.validation.notEnoughStock', { needed: qtyNeeded, available }));
                      return;
                    }
                  }
                }
                addServiceMutation.mutate(selectedCategoryId);
              }} 
              disabled={!selectedCategoryId || addServiceMutation.isPending}
            >
              {addServiceMutation.isPending ? t('common.adding') : t('orders.create.addService')}
            </Button>
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
              <Select value={selectedMaterialId} onValueChange={(val) => setSelectedMaterialId(val || '')}>
                <SelectTrigger id="material" className="border-gray-200 dark:border-gray-800">
                  <SelectValue placeholder={t('orders.create.placeholder.material', 'Select a material')}>
                    {(val: string) => {
                      if (!val) return <span className="text-muted-foreground">{t('orders.create.placeholder.material', 'Select a material')}</span>;
                      const m = allMaterials?.find((x: any) => x.id === val);
                      return m ? getLocName(m) : val;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800">
                  {allMaterials?.filter((m: any) => m.isStandaloneSellable).map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {getLocName(m)} ({Number(m.currentPrice || 0).toLocaleString()} {t('common.birr', 'Birr')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qty">{t('orders.detail.quantity')}</Label>
              <Input
                id="qty"
                type="text"
                value={materialQty}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*\.?\d*$/.test(val)) {
                    setMaterialQty(val);
                  }
                }}
                className="border-gray-200 dark:border-gray-800"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMaterialOpen(false)} className="border-gray-200 dark:border-gray-800">{t('common.cancel')}</Button>
            <Button
              onClick={() => {
                const qtyNeeded = Number(materialQty);
                const mat = allMaterials?.find((m: any) => m.id === selectedMaterialId);
                const stock = mat?.materialStocks?.find((s: any) => s.store.type === 'MINI');
                const available = stock ? Number(stock.quantity) : 0;
                
                if (qtyNeeded > available) {
                  toast.error(t('orders.validation.notEnoughStock', { needed: qtyNeeded, available }));
                  return;
                }
                
                addMaterialMutation.mutate({ materialId: selectedMaterialId, quantity: qtyNeeded });
              }}
              disabled={!selectedMaterialId || !materialQty || Number(materialQty) <= 0 || addMaterialMutation.isPending}
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
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['order', id] })}
      />

      <OrderPaymentDialog
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        orderId={order?.id || ''}
        balanceDue={balanceDue}
        totalPaid={totalPaid}
        netTotal={netTotal}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['order', id] })}
      />
    </div>
  );
}
