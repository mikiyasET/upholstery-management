import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import api from '../lib/api';
import { getImageUrl, formatUnit, formatCurrency } from '../lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSearch
} from '../components/DataTable';
import { ImagePreviewModal } from '../components/ui/image-preview-modal';
import { PermissionGate } from '../components/PermissionGate';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ModernSelect } from '../components/ui/modern-select';
import {
  ArrowRightLeft,
  PackagePlus,
  MoreHorizontal,
  Settings2,
  ClipboardCheck,
  ImageOff,
  History,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type MaterialStock = {
  id: string;
  storeId: string;
  quantity: string | number;
  store: {
    id: string;
    name: string;
    type: 'MAIN' | 'MINI';
  };
};

type Material = {
  id: string;
  nameEn: string;
  nameAm: string;
  unit: string;
  isBulkTracked: boolean;
  lowStockThreshold: number;
  imageUrl?: string;
  materialStocks: MaterialStock[];
};

type HistoryEntry = {
  id: string;
  type: 'RESTOCK' | 'ADJUSTMENT' | 'TRANSFER' | 'COUNT';
  date: string;
  store: string;
  quantity: string;
  detail: string | null;
  user: string;
  notes: string | null;
};

export default function Storage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeStore, setActiveStore] = useState<'MAIN' | 'MINI'>('MINI');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [historyMaterial, setHistoryMaterial] = useState<Material | null>(null);
  const [historyDetail, setHistoryDetail] = useState<any>(null);

  const getLocName = (m: Material) => (i18n?.language === 'am' && m.nameAm ? m.nameAm : m.nameEn);

  // Dialog states
  const [restockMaterial, setRestockMaterial] = useState<Material | null>(null);
  const [transferMaterial, setTransferMaterial] = useState<Material | null>(null);
  const [adjustMaterial, setAdjustMaterial] = useState<Material | null>(null);
  const [countMaterial, setCountMaterial] = useState<Material | null>(null);


  // Form states
  const [restockForm, setRestockForm] = useState({ quantityAdded: '', unitCost: '' });
  const [transferForm, setTransferForm] = useState({ quantityTransferred: '', notes: '', direction: 'MAIN_TO_MINI' });
  const [adjustForm, setAdjustForm] = useState({ storeType: 'MAIN', quantityDelta: '', reason: 'DAMAGE', notes: '' });
  const [countForm, setCountForm] = useState({ storeType: 'MAIN', countedQuantity: '', notes: '' });

  const { data: materials, isLoading } = useQuery<Material[]>({
    queryKey: ['storage_materials'],
    queryFn: async () => {
      const res = await api.get('/catalog/materials');
      return res.data;
    },
  });

  const { data: historyData, isLoading: historyLoading } = useQuery<HistoryEntry[]>({
    queryKey: ['material-history', historyMaterial?.id],
    queryFn: async () => {
      const res = await api.get(`/storage/materials/${historyMaterial!.id}/history`);
      return res.data;
    },
    enabled: !!historyMaterial,
  });

  const restockMutation = useMutation({
    mutationFn: async () => {
      if (!restockMaterial) return;
      await api.post(`/storage/materials/${restockMaterial.id}/restock`, {
        quantityAdded: Number(restockForm.quantityAdded),
        unitCost: restockForm.unitCost ? Number(restockForm.unitCost) : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage_materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-history'] });
      toast.success(t('storage.alerts.stockAdded', 'Stock added successfully'));
      setRestockMaterial(null);
      setRestockForm({ quantityAdded: '', unitCost: '' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('storage.alerts.errorRestock', 'Error restocking material'));
    },
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!transferMaterial) return;
      await api.post(`/storage/store-transfers`, {
        materialId: transferMaterial.id,
        quantityTransferred: Number(transferForm.quantityTransferred),
        notes: transferForm.notes || undefined,
        direction: transferForm.direction,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage_materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-history'] });
      toast.success(t('storage.alerts.stockTransferred', 'Stock transferred successfully'));
      setTransferMaterial(null);
      setTransferForm({ quantityTransferred: '', notes: '', direction: 'MAIN_TO_MINI' });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || '';
      if (msg.includes('Insufficient stock')) {
        const storeMatch = msg.includes('Main') ? t('storage.mainStore', 'Main Store') : t('storage.miniStore', 'Mini Store');
        const availableMatch = msg.match(/Available: ([\d.]+)/);
        const available = availableMatch ? availableMatch[1] : 0;
        toast.error(t('storage.alerts.insufficientStock', { 
          defaultValue: `Insufficient stock in {{store}} for transfer. Available: {{available}}`,
          store: storeMatch,
          available
        }));
      } else {
        toast.error(msg || t('storage.alerts.errorTransfer', 'Error transferring stock'));
      }
    },
  });

  const getStoreId = (material: Material, type: 'MAIN' | 'MINI') => {
    return material.materialStocks?.find(s => s.store.type === type)?.storeId;
  };

  const adjustMutation = useMutation({
    mutationFn: async () => {
      if (!adjustMaterial) return;
      const storeId = getStoreId(adjustMaterial, adjustForm.storeType as 'MAIN' | 'MINI');
      if (!storeId) throw new Error('Store not found for this material');

      await api.post(`/storage/materials/${adjustMaterial.id}/adjust`, {
        storeId,
        quantityDelta: Number(adjustForm.quantityDelta),
        reason: adjustForm.reason,
        notes: adjustForm.notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage_materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-history'] });
      toast.success(t('storage.alerts.stockAdjusted', 'Stock adjusted successfully'));
      setAdjustMaterial(null);
      setAdjustForm({ storeType: 'MAIN', quantityDelta: '', reason: 'DAMAGE', notes: '' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('storage.alerts.errorAdjust', 'Error adjusting stock'));
    },
  });

  const countMutation = useMutation({
    mutationFn: async () => {
      if (!countMaterial) return;
      const storeId = getStoreId(countMaterial, countForm.storeType as 'MAIN' | 'MINI');
      if (!storeId) throw new Error('Store not found for this material');

      await api.post(`/storage/stock-counts`, {
        materialId: countMaterial.id,
        storeId,
        countedQuantity: Number(countForm.countedQuantity),
        notes: countForm.notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage_materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-history'] });
      toast.success(t('storage.alerts.stockCountRecorded', 'Stock count recorded successfully'));
      setCountMaterial(null);
      setCountForm({ storeType: 'MAIN', countedQuantity: '', notes: '' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('storage.alerts.errorStockCount', 'Error recording stock count'));
    },
  });

  const getStock = (material: Material, storeType: 'MAIN' | 'MINI') => {
    const stock = material.materialStocks?.find(s => s.store.type === storeType);
    return stock ? Number(stock.quantity) : 0;
  };

  const handleOpenTransfer = (m: Material) => {
    const mainStock = getStock(m, 'MAIN');
    const miniStock = getStock(m, 'MINI');
    
    // Default to MINI_TO_MAIN if main is empty but mini has stock, otherwise MAIN_TO_MINI
    const defaultDirection = mainStock <= 0 && miniStock > 0 ? 'MINI_TO_MAIN' : 'MAIN_TO_MINI';
    setTransferForm({ quantityTransferred: '', notes: '', direction: defaultDirection });
    setTransferMaterial(m);
  };

  const filteredMaterials = materials?.filter((m) => {
    const matchesSearch = m.nameEn.toLowerCase().includes(search.toLowerCase()) || m.nameAm.includes(search);
    if (!matchesSearch) return false;
    
    if (showLowStockOnly) {
      const stock = getStock(m, activeStore);
      const threshold = m.lowStockThreshold || 10;
      if (stock > threshold) return false;
    }
    
    return true;
  });

  const getHistoryBadgeColor = (type: string) => {
    switch (type) {
      case 'RESTOCK': return 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400';
      case 'ADJUSTMENT': return 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400';
      case 'TRANSFER': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400';
      case 'COUNT': return 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400';
      case 'DIRECT_SALE': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400';
      case 'ORDER': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getHistoryLabel = (type: string) => {
    switch (type) {
      case 'RESTOCK': return t('storage.restock', 'Restock');
      case 'ADJUSTMENT': return t('storage.adjustment', 'Adjustment');
      case 'TRANSFER': return t('storage.transfer', 'Transfer');
      case 'COUNT': return t('storage.physicalCount', 'Physical Count');
      case 'DIRECT_SALE': return t('storage.directSale', 'Direct Sale');
      case 'ORDER': return t('storage.order', 'Order');
      default: return type;
    }
  };

  const getLocalizedStoreName = (storeName: string) => {
    if (!storeName) return '';
    if (storeName.includes('→')) {
      const [from, to] = storeName.split('→').map((s) => s.trim());
      const fromLoc = from.toUpperCase().includes('MAIN') ? t('storage.mainStore', 'Main Store') : from.toUpperCase().includes('MINI') ? t('storage.miniStore', 'Mini Store') : from;
      const toLoc = to.toUpperCase().includes('MAIN') ? t('storage.mainStore', 'Main Store') : to.toUpperCase().includes('MINI') ? t('storage.miniStore', 'Mini Store') : to;
      return `${fromLoc} → ${toLoc}`;
    }
    if (storeName.toUpperCase().includes('MAIN')) return t('storage.mainStore', 'Main Store');
    if (storeName.toUpperCase().includes('MINI')) return t('storage.miniStore', 'Mini Store');
    return storeName;
  };

  const getLocalizedQuantity = (entry: HistoryEntry, unit?: string) => {
    const formattedUnit = formatUnit(unit);
    if (entry.type === 'COUNT' && entry.quantity.startsWith('Counted:')) {
      const qty = entry.quantity.replace('Counted:', '').trim();
      return `${t('storage.history.counted', 'Counted')}: ${qty} ${formattedUnit}`;
    }
    return `${entry.quantity} ${formattedUnit}`;
  };

  const getLocalizedDetail = (entry: HistoryEntry) => {
    if (!entry.detail) return null;
    if (entry.detail.startsWith('Unit cost:')) {
      const cost = entry.detail.replace('Unit cost:', '').trim();
      return `${t('storage.history.unitCost', 'Unit Cost')}: ${formatCurrency(cost)}`;
    }
    if (entry.detail.startsWith('Reason:')) {
      const reasonKey = entry.detail.replace('Reason:', '').trim().toUpperCase();
      const reasonText = 
        reasonKey === 'DAMAGE' ? t('storage.reasons.damage', 'Damage') :
        reasonKey === 'LOSS' ? t('storage.reasons.loss', 'Loss/Missing') :
        reasonKey === 'EXPIRED' ? t('storage.reasons.expired', 'Expired') :
        reasonKey === 'FOUND' ? t('storage.reasons.found', 'Found/Discovered') :
        t('payment.other', 'Other');
      return `${t('storage.history.reason', 'Reason')}: ${reasonText}`;
    }
    if (entry.detail.includes('System was:') && entry.detail.includes('Discrepancy:')) {
      const parts = entry.detail.split(',');
      const sysPart = parts[0]?.replace('System was:', '').trim();
      const discPart = parts[1]?.replace('Discrepancy:', '').trim();
      return `${t('storage.history.systemWas', 'System was')}: ${sysPart}, ${t('storage.history.discrepancy', 'Discrepancy')}: ${discPart}`;
    }
    return entry.detail;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{t('storage.title', 'Storage & Inventory')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('storage.subtitle', 'Manage main and mini store stock levels')}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden mt-4">
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-card">
          {/* Tabs */}
          <div className="inline-flex h-10 items-center rounded-lg bg-muted p-1 text-muted-foreground w-full md:w-max shrink-0 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => setActiveStore('MINI')}
              className={`flex-1 md:flex-none inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 md:px-8 py-1.5 text-sm font-medium transition-all ${
                activeStore === 'MINI'
                  ? 'bg-amber-600 text-white shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              {t('storage.miniStore', 'Mini Store')}
            </button>
            <button
              onClick={() => setActiveStore('MAIN')}
              className={`flex-1 md:flex-none inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 md:px-8 py-1.5 text-sm font-medium transition-all ${
                activeStore === 'MAIN'
                  ? 'bg-amber-600 text-white shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              }`}
            >
              {t('storage.mainStore', 'Main Store')}
            </button>
          </div>
          
          {/* Right Actions */}
          {/* Right Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 w-full md:w-auto md:ml-auto md:flex-1 min-w-0">
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 h-10 text-sm font-medium transition-all border shrink-0 w-full sm:w-auto ${
                showLowStockOnly
                  ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-[#111] dark:border-gray-800 dark:text-gray-400 dark:hover:bg-[#1a1a1a]'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="truncate">{t('storage.showLowStock', 'Show Low Stock')}</span>
            </button>
            
            <div className="w-full sm:w-64 md:w-auto md:flex-1 md:min-w-[150px] md:max-w-[320px] shrink relative">
              <TableSearch 
                value={search} 
                onChange={setSearch} 
                placeholder={t('storage.searchPlaceholder', 'Search inventory...')} 
                className="w-full" 
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">{t('storage.table.image', 'Image')}</TableHead>
                <TableHead>{t('common.material', 'Material')}</TableHead>
                <TableHead>{t('orders.detail.quantity', 'Quantity')}</TableHead>
                <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">{t('storage.loading', 'Loading inventory...')}</TableCell>
                </TableRow>
              ) : filteredMaterials?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">{t('storage.noMaterials', 'No materials found.')}</TableCell>
                </TableRow>
              ) : (
                filteredMaterials?.map((m) => {
                  const stock = getStock(m, activeStore);
                  const mainStock = getStock(m, 'MAIN');

                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        {m.imageUrl ? (
                          <div 
                          className="w-10 h-10 shrink-0 bg-secondary/50 rounded flex items-center justify-center overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setPreviewImage(getImageUrl(m.imageUrl) || null)}
                        >
                            <img src={getImageUrl(m.imageUrl)} alt={getLocName(m)} className="w-full h-full object-cover" />
                        </div>
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <ImageOff className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{getLocName(m)}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {i18n?.language === 'am' ? m.nameEn : m.nameAm} • {formatUnit(m.unit)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-gray-900 dark:text-white">{stock} {formatUnit(m.unit)}</div>
                        {activeStore === 'MAIN' ? (
                          m.isBulkTracked && <div className="text-xs text-amber-500 font-medium">{t('storage.bulkTracked', 'Bulk Tracked')}</div>
                        ) : (
                          !m.isBulkTracked && <div className="text-xs text-blue-500">{t('storage.directDelivery', 'Direct Delivery')}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <PermissionGate permission="storage.edit">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title={t('directSales.viewHistory', 'View History')}
                              onClick={() => setHistoryMaterial(m)}
                            >
                              <History className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 gap-1.5"
                              onClick={() => setRestockMaterial(m)}
                            >
                              <PackagePlus className="w-3.5 h-3.5" />
                              <span>{t('storage.restock', 'Restock')}</span>
                            </Button>
                            <span 
                              title={(mainStock <= 0 && getStock(m, 'MINI') <= 0) ? t('storage.noStockAnywhere', 'No stock in any store') : ''}
                              className="inline-block"
                            >
                              <Button 
                                variant="default" 
                                size="sm" 
                                className="h-8 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm disabled:pointer-events-none"
                                onClick={() => handleOpenTransfer(m)}
                                disabled={mainStock <= 0 && getStock(m, 'MINI') <= 0}
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                <span>{t('storage.transfer', 'Transfer')}</span>
                              </Button>
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted focus:outline-none text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => setAdjustMaterial(m)} className="gap-2 cursor-pointer">
                                  <Settings2 className="h-4 w-4" />
                                  <span>{t('storage.adjustStock', 'Adjust Stock')}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setCountMaterial(m)} className="gap-2 cursor-pointer">
                                  <ClipboardCheck className="h-4 w-4" />
                                  <span>{t('storage.physicalCount', 'Physical Count')}</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </PermissionGate>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage}
      />

      {/* ===== History Dialog ===== */}
      <Dialog open={!!historyMaterial} onOpenChange={(open) => !open && setHistoryMaterial(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-amber-500" />
              {t('storage.stockHistory', 'Stock History')} — {historyMaterial ? getLocName(historyMaterial) : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto -mx-6 px-6 py-2">
            {historyLoading ? (
              <div className="text-center py-8 text-muted-foreground">{t('directSales.loadingHistory', 'Loading history...')}</div>
            ) : !historyData || historyData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">{t('storage.noHistory', 'No stock activity yet')}</p>
                <p className="text-sm mt-1">{t('storage.noHistoryDesc', 'Restocks, adjustments, transfers, and counts will appear here.')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyData.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setHistoryDetail(entry)}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <span className={`inline-flex justify-center w-[100px] text-center px-1 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getHistoryBadgeColor(entry.type)}`}>
                        {getHistoryLabel(entry.type)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1 sm:gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {getLocalizedQuantity(entry, historyMaterial?.unit)}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(entry.date), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {getLocalizedStoreName(entry.store)} • {t('orders.detail.by', 'by')} {entry.user}
                      </div>
                      {getLocalizedDetail(entry) && (
                        <div className="text-xs text-muted-foreground mt-0.5">{getLocalizedDetail(entry)}</div>
                      )}
                      {entry.notes && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 italic">"{entry.notes}"</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== History Detail Modal ===== */}
      <Dialog open={!!historyDetail} onOpenChange={(open) => !open && setHistoryDetail(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('storage.historyDetail', 'History Detail')}</DialogTitle>
          </DialogHeader>
          {historyDetail && (
            <div className="space-y-4 pt-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground font-medium">{t('storage.type', 'Type')}:</span>
                <span className="text-foreground font-semibold">{getHistoryLabel(historyDetail.type)}</span>

                <span className="text-muted-foreground font-medium">{t('storage.date', 'Date')}:</span>
                <span className="text-foreground">{format(new Date(historyDetail.date), 'MMM d, yyyy h:mm a')}</span>

                <span className="text-muted-foreground font-medium">{t('storage.quantity', 'Quantity')}:</span>
                <span className="text-foreground font-bold">{getLocalizedQuantity(historyDetail, historyMaterial?.unit)}</span>

                <span className="text-muted-foreground font-medium">{t('storage.user', 'User')}:</span>
                <span className="text-foreground">{historyDetail.user}</span>

                {historyDetail.store && (
                  <>
                    <span className="text-muted-foreground font-medium">{t('storage.store', 'Store')}:</span>
                    <span className="text-foreground">{getLocalizedStoreName(historyDetail.store)}</span>
                  </>
                )}
                
                {historyDetail.detail && !historyDetail.metadata && (
                  <>
                    <span className="text-muted-foreground font-medium">{t('storage.details', 'Details')}:</span>
                    <span className="text-foreground">{getLocalizedDetail(historyDetail)}</span>
                  </>
                )}
              </div>

              {historyDetail.metadata && (
                <div className="mt-4 p-3 bg-muted rounded-md space-y-2 border border-border/50">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    {historyDetail.type === 'DIRECT_SALE' ? t('storage.saleInfo', 'Sale Info') : t('storage.orderInfo', 'Order Info')}
                  </h4>
                  <div className="grid grid-cols-[100px_1fr] gap-2">
                    <span className="text-muted-foreground font-medium text-xs">{t('storage.refNumber', 'Ref Number')}:</span>
                    <span className="text-foreground text-xs font-mono">{historyDetail.metadata.number}</span>
                    
                    <span className="text-muted-foreground font-medium text-xs">{t('storage.customer', 'Customer')}:</span>
                    <span className="text-foreground text-xs">{historyDetail.metadata.customerName}</span>
                    
                    <span className="text-muted-foreground font-medium text-xs">{t('storage.phone', 'Phone')}:</span>
                    <span className="text-foreground text-xs">{historyDetail.metadata.customerPhone}</span>
                    
                    <span className="text-muted-foreground font-medium text-xs">{t('storage.price', 'Price')}:</span>
                    <span className="text-foreground text-xs font-semibold">{historyDetail.metadata.price} Birr</span>
                  </div>
                </div>
              )}

              {historyDetail.notes && (
                <div className="mt-4 p-3 bg-muted/50 rounded-md">
                  <span className="text-muted-foreground font-medium block mb-1">{t('storage.notes', 'Notes')}:</span>
                  <span className="text-foreground whitespace-pre-wrap">{historyDetail.notes}</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Restock Dialog ===== */}
      <Dialog open={!!restockMaterial} onOpenChange={(open) => !open && setRestockMaterial(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-green-600" />
              {t('storage.restock', 'Restock')} {restockMaterial ? getLocName(restockMaterial) : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg text-sm space-y-1">
              <p className="font-semibold">{t('storage.whatIsRestock', 'What is Restock?')}</p>
              <p>{t('storage.restockDesc', 'Add newly purchased or received inventory. Use this when you buy new stock from a supplier or receive a delivery.')}</p>
              <p className="text-xs opacity-80 mt-1">
                {restockMaterial?.isBulkTracked 
                  ? t('storage.bulkTrackedInfo', '📦 This is bulk-tracked — stock goes to Main Store first, then transfer to Mini Store.') 
                  : t('storage.notBulkTrackedInfo', '🏪 This is not bulk-tracked — stock goes directly to Mini Store.')}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t('storage.quantityToAdd', 'Quantity to Add')} ({formatUnit(restockMaterial?.unit)})</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={restockForm.quantityAdded}
                onChange={(e) => setRestockForm({ ...restockForm, quantityAdded: e.target.value })}
                placeholder={t('storage.placeholders.quantity', 'e.g. 50')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('storage.unitCostOptional', 'Unit Cost (Optional)')}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={restockForm.unitCost}
                onChange={(e) => setRestockForm({ ...restockForm, unitCost: e.target.value })}
                placeholder={t('storage.placeholders.unitCost', 'e.g. 1500')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockMaterial(null)}>{t('common.cancel', 'Cancel')}</Button>
            <Button 
              onClick={() => restockMutation.mutate()} 
              disabled={restockMutation.isPending || !restockForm.quantityAdded}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
            >
              {restockMutation.isPending ? t('storage.restocking', 'Restocking...') : t('storage.confirmRestock', 'Confirm Restock')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Transfer Dialog ===== */}
      <Dialog open={!!transferMaterial} onOpenChange={(open) => !open && setTransferMaterial(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              {t('storage.transferStock', 'Transfer Stock')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            
            <div className="space-y-2">
              <Label>{t('storage.transferDirection', 'Transfer Direction')}</Label>
              <ModernSelect
                value={transferForm.direction}
                onValueChange={(val) => setTransferForm({ ...transferForm, direction: val, quantityTransferred: '' })}
                options={[
                  { label: t('storage.mainToMini', 'Main Store → Mini Store'), value: 'MAIN_TO_MINI' },
                  { label: t('storage.miniToMain', 'Mini Store → Main Store'), value: 'MINI_TO_MAIN' },
                ]}
              />
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg text-sm space-y-1">
              <p>{transferForm.direction === 'MAIN_TO_MINI' 
                ? t('storage.transferDesc', 'Move stock from Main Store (warehouse) to Mini Store (shop floor) for daily use.')
                : t('storage.transferDescReverse', 'Move stock from Mini Store back to Main Store.')}
              </p>
            </div>
            
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#161616] rounded-lg border border-gray-200 dark:border-gray-800">
              <span className="text-sm text-gray-500">
                {transferForm.direction === 'MAIN_TO_MINI' 
                  ? t('storage.availableInMain', 'Available in Main Store:') 
                  : t('storage.availableInMini', 'Available in Mini Store:')}
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {transferMaterial ? getStock(transferMaterial, transferForm.direction === 'MAIN_TO_MINI' ? 'MAIN' : 'MINI') : 0} {formatUnit(transferMaterial?.unit)}
              </span>
            </div>
            <div className="space-y-2">
              <Label>{t('storage.quantityToTransfer', 'Quantity to Transfer')} ({formatUnit(transferMaterial?.unit)})</Label>
              <Input
                type="number"
                min="0.01"
                max={transferMaterial ? getStock(transferMaterial, transferForm.direction === 'MAIN_TO_MINI' ? 'MAIN' : 'MINI') : undefined}
                step="0.01"
                value={transferForm.quantityTransferred}
                onChange={(e) => setTransferForm({ ...transferForm, quantityTransferred: e.target.value })}
                placeholder={t('storage.placeholders.quantity', 'e.g. 5')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common.notesOptional', 'Notes (Optional)')}</Label>
              <Input
                value={transferForm.notes}
                onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                placeholder={t('storage.placeholders.transferNotes', "e.g. For today's orders")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferMaterial(null)}>{t('common.cancel', 'Cancel')}</Button>
            <Button 
              onClick={() => transferMutation.mutate()} 
              disabled={transferMutation.isPending || !transferForm.quantityTransferred || Number(transferForm.quantityTransferred) > (transferMaterial ? getStock(transferMaterial, transferForm.direction === 'MAIN_TO_MINI' ? 'MAIN' : 'MINI') : 0) || Number(transferForm.quantityTransferred) <= 0}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
            >
              {transferMutation.isPending ? t('storage.transferring', 'Transferring...') : t('storage.confirmTransfer', 'Confirm Transfer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Adjust Stock Dialog ===== */}
      <Dialog open={!!adjustMaterial} onOpenChange={(open) => !open && setAdjustMaterial(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-orange-600" />
              {t('storage.adjustStock', 'Adjust Stock')} — {adjustMaterial ? getLocName(adjustMaterial) : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 rounded-lg text-sm space-y-1">
              <p className="font-semibold">{t('storage.whatIsAdjust', 'What is Adjust Stock?')}</p>
              <p>{t('storage.adjustDesc', 'Manually correct stock when there\'s a known discrepancy — for example, damaged items, lost stock, or items found that weren\'t in the system.')}</p>
              <p className="text-xs opacity-80 mt-1">{t('storage.adjustTip', '💡 Use negative values to deduct, positive to add. Always provide a reason.')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('storage.store', 'Store')}</Label>
              <Select value={adjustForm.storeType} onValueChange={(val) => setAdjustForm({ ...adjustForm, storeType: val as string })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('storage.selectStore', 'Select Store')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAIN">{t('storage.mainStore', 'Main Store')} ({t('common.current', 'Current')}: {adjustMaterial ? getStock(adjustMaterial, 'MAIN') : 0} {formatUnit(adjustMaterial?.unit)})</SelectItem>
                  <SelectItem value="MINI">{t('storage.miniStore', 'Mini Store')} ({t('common.current', 'Current')}: {adjustMaterial ? getStock(adjustMaterial, 'MINI') : 0} {formatUnit(adjustMaterial?.unit)})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('storage.adjustmentQuantity', 'Adjustment Quantity')}</Label>
              <Input
                type="number"
                step="0.01"
                value={adjustForm.quantityDelta}
                onChange={(e) => setAdjustForm({ ...adjustForm, quantityDelta: e.target.value })}
                placeholder={t('storage.placeholders.adjustQuantity', 'e.g. -5 for loss, +5 for gain')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('storage.reason', 'Reason')}</Label>
              <Select value={adjustForm.reason} onValueChange={(v) => setAdjustForm({ ...adjustForm, reason: v as string })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('storage.selectReason', 'Select Reason')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAMAGE">{t('storage.reasons.damage', 'Damage')}</SelectItem>
                  <SelectItem value="LOSS">{t('storage.reasons.loss', 'Loss/Missing')}</SelectItem>
                  <SelectItem value="EXPIRED">{t('storage.reasons.expired', 'Expired')}</SelectItem>
                  <SelectItem value="FOUND">{t('storage.reasons.found', 'Found/Discovered')}</SelectItem>
                  <SelectItem value="OTHER">{t('payment.other', 'Other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('common.notesOptional', 'Notes (Optional)')}</Label>
              <Input
                value={adjustForm.notes}
                onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                placeholder={t('storage.placeholders.adjustNotes', 'e.g. Found in back room')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustMaterial(null)}>{t('common.cancel', 'Cancel')}</Button>
            <Button 
              onClick={() => adjustMutation.mutate()} 
              disabled={adjustMutation.isPending || !adjustForm.quantityDelta}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
            >
              {adjustMutation.isPending ? t('storage.adjusting', 'Adjusting...') : t('storage.confirmAdjustment', 'Confirm Adjustment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Stock Count Dialog ===== */}
      <Dialog open={!!countMaterial} onOpenChange={(open) => !open && setCountMaterial(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-purple-600" />
              {t('storage.physicalCount', 'Physical Count')} — {countMaterial ? getLocName(countMaterial) : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 rounded-lg text-sm space-y-1">
              <p className="font-semibold">{t('storage.whatIsCount', 'What is Physical Count?')}</p>
              <p>{t('storage.countDesc', 'Physically count the actual items on the shelf and enter the real number. The system will compare it against recorded stock and log any discrepancy.')}</p>
              <p className="text-xs opacity-80 mt-1">{t('storage.countTip', '📋 This replaces the system quantity with the counted amount. Use during audits or when you suspect stock numbers are off.')}</p>
            </div>
            <div className="space-y-2">
              <Label>{t('storage.store', 'Store')}</Label>
              <Select value={countForm.storeType} onValueChange={(v) => setCountForm({ ...countForm, storeType: v as string })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('storage.selectStore', 'Select Store')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAIN">{t('storage.mainStore', 'Main Store')} ({t('storage.systemStock', 'System')}: {countMaterial ? getStock(countMaterial, 'MAIN') : 0} {formatUnit(countMaterial?.unit)})</SelectItem>
                  <SelectItem value="MINI">{t('storage.miniStore', 'Mini Store')} ({t('storage.systemStock', 'System')}: {countMaterial ? getStock(countMaterial, 'MINI') : 0} {formatUnit(countMaterial?.unit)})</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('storage.actualCount', 'Actual Count')} ({formatUnit(countMaterial?.unit)})</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={countForm.countedQuantity}
                onChange={(e) => setCountForm({ ...countForm, countedQuantity: e.target.value })}
                placeholder={t('storage.placeholders.quantity', 'e.g. 45')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('common.notesOptional', 'Notes (Optional)')}</Label>
              <Input
                value={countForm.notes}
                onChange={(e) => setCountForm({ ...countForm, notes: e.target.value })}
                placeholder={t('storage.placeholders.countNotes', 'e.g. Weekly audit check')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCountMaterial(null)}>{t('common.cancel', 'Cancel')}</Button>
            <Button 
              onClick={() => countMutation.mutate()} 
              disabled={countMutation.isPending || !countForm.countedQuantity}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
            >
              {countMutation.isPending ? t('storage.recording', 'Recording...') : t('storage.recordCount', 'Record Count')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
