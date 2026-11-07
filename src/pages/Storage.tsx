import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import api from '../lib/api';
import { getImageUrl, formatUnit, formatCurrency, isUnitIntegerOnly, getQuantityStep, formatBrandSizeLabel, formatAppDate } from '../lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
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
  Store,
  Archive,
  AlertTriangle,
  AlertCircle,
  Search,
  X,
  Boxes,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, TablePagination } from '../components/common';
import { Box, Group, TextInput, ActionIcon, Button as MantineButton, Badge } from '@mantine/core';

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

type MaterialBrandStock = {
  id: string;
  storeId: string;
  quantity: string | number;
  store: {
    id: string;
    name: string;
    type: 'MAIN' | 'MINI';
  };
};

type MaterialBrand = {
  id: string;
  name: string;
  size?: string | null;
  color?: string | null;
  type?: string | null;
  price: number | string;
  brandStocks?: MaterialBrandStock[];
};

type Material = {
  id: string;
  itemCode?: string;
  nameEn: string;
  nameAm: string;
  unit: string;
  isBulkTracked: boolean;
  lowStockThreshold: number;
  imageUrl?: string;
  brands?: MaterialBrand[];
  materialStocks: MaterialStock[];
};

type HistoryEntry = {
  id: string;
  type: 'RESTOCK' | 'ADJUSTMENT' | 'TRANSFER' | 'COUNT' | 'DIRECT_SALE' | 'ORDER';
  date: string;
  store: string;
  brandName?: string | null;
  sizeName?: string | null;
  colorName?: string | null;
  typeName?: string | null;
  quantity: string;
  detail: string | null;
  user: string;
  notes: string | null;
  metadata?: any;
};

export default function Storage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlSearch = searchParams.get('search') || searchParams.get('q') || '';
  const urlStore = (searchParams.get('store') as 'MAIN' | 'MINI') || 'MINI';
  const shouldAutoAllocate = searchParams.get('allocate') === 'true';
  const targetMaterialId = searchParams.get('materialId');

  const [search, setSearch] = useState(urlSearch);
  const [activeStore, setActiveStore] = useState<'MAIN' | 'MINI'>(urlStore);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  const hasAutoAllocatedRef = useRef(false);

  // Sync state if URL query params change
  useEffect(() => {
    const q = searchParams.get('search') || searchParams.get('q');
    if (q !== null && q !== undefined) {
      setSearch(q);
      setCurrentPage(1);
    }
    const store = searchParams.get('store') as 'MAIN' | 'MINI';
    if (store === 'MAIN' || store === 'MINI') {
      setActiveStore(store);
    }
  }, [searchParams]);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [historyMaterial, setHistoryMaterial] = useState<Material | null>(null);
  const [historyDetail, setHistoryDetail] = useState<any>(null);

  const getLocName = (m: any) =>
    i18n?.language === 'am' && m?.nameAm ? m.nameAm : (m?.nameEn || m?.name || '');

  // Dialog states
  const [restockMaterial, setRestockMaterial] = useState<Material | null>(null);
  const [transferMaterial, setTransferMaterial] = useState<Material | null>(null);
  const [adjustMaterial, setAdjustMaterial] = useState<Material | null>(null);
  const [countMaterial, setCountMaterial] = useState<Material | null>(null);
  const [allocateMaterial, setAllocateMaterial] = useState<Material | null>(null);

  // Form states with brand support
  const [restockForm, setRestockForm] = useState<{
    storeType: 'MAIN' | 'MINI';
    brandInputs: Record<string, { quantity: string; unitCost: string }>;
    quantityAdded: string;
    unitCost: string;
    notes: string;
  }>({
    storeType: 'MAIN',
    brandInputs: {},
    quantityAdded: '',
    unitCost: '',
    notes: '',
  });
  const [transferForm, setTransferForm] = useState({ quantityTransferred: '', notes: '', direction: 'MAIN_TO_MINI', materialBrandId: '' });
  const [adjustForm, setAdjustForm] = useState({ storeType: 'MAIN', quantityDelta: '', reason: 'DAMAGE', notes: '', materialBrandId: '' });
  const [countForm, setCountForm] = useState({ storeType: 'MAIN', countedQuantity: '', notes: '', materialBrandId: '' });
  const [allocateForm, setAllocateForm] = useState<{
    storeType: 'MAIN' | 'MINI';
    allocations: Record<string, string>;
    notes: string;
  }>({
    storeType: 'MINI',
    allocations: {},
    notes: '',
  });

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

      if (restockMaterial.brands && restockMaterial.brands.length > 0) {
        const items = restockMaterial.brands
          .map((b) => {
            const input = restockForm.brandInputs[b.id];
            const qty = Number(input?.quantity || 0);
            const cost = input?.unitCost ? Number(input.unitCost) : undefined;
            return {
              materialBrandId: b.id,
              quantityAdded: qty,
              unitCost: cost,
            };
          })
          .filter((item) => item.quantityAdded > 0);

        if (items.length === 0) {
          toast.error(t('storage.enterQuantity', 'Please enter quantity to add'));
          throw new Error('No quantity entered');
        }

        const isPcs = isUnitIntegerOnly(restockMaterial.unit);
        for (const item of items) {
          if (isPcs && !Number.isInteger(item.quantityAdded)) {
            toast.error(t('storage.integerRequired', 'Quantity for PCS items must be a whole number (no decimals allowed)'));
            throw new Error('PCS requires integer quantity');
          }
        }

        await api.post(`/storage/materials/${restockMaterial.id}/restock`, {
          storeType: restockForm.storeType,
          items,
        });
      } else {
        const qtyNum = Number(restockForm.quantityAdded);
        if (!qtyNum || qtyNum <= 0) {
          toast.error(t('storage.enterQuantity', 'Please enter quantity to add'));
          throw new Error('No quantity entered');
        }

        const isPcs = isUnitIntegerOnly(restockMaterial.unit);
        if (isPcs && !Number.isInteger(qtyNum)) {
          toast.error(t('storage.integerRequired', 'Quantity for PCS items must be a whole number (no decimals allowed)'));
          throw new Error('PCS requires integer quantity');
        }

        await api.post(`/storage/materials/${restockMaterial.id}/restock`, {
          storeType: restockForm.storeType,
          quantityAdded: qtyNum,
          unitCost: restockForm.unitCost ? Number(restockForm.unitCost) : undefined,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage_materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-history'] });
      toast.success(t('storage.alerts.stockAdded', 'Stock added successfully'));
      setRestockMaterial(null);
      setRestockForm({
        storeType: 'MAIN',
        brandInputs: {},
        quantityAdded: '',
        unitCost: '',
        notes: '',
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('storage.alerts.errorRestock', 'Error restocking material'));
    },
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      if (!transferMaterial) return;
      const srcStore = transferForm.direction === 'MAIN_TO_MINI' ? 'MAIN' : 'MINI';
      const unalloc = getUnallocatedStock(transferMaterial, srcStore);
      if (unalloc > 0) {
        throw new Error(t('storage.cannotTransferUnallocated', 'Must allocate brand stock before transfer'));
      }
      await api.post(`/storage/store-transfers`, {
        materialId: transferMaterial.id,
        quantityTransferred: Number(transferForm.quantityTransferred),
        notes: transferForm.notes || undefined,
        direction: transferForm.direction,
        materialBrandId: transferForm.materialBrandId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage_materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-history'] });
      toast.success(t('storage.alerts.stockTransferred', 'Stock transferred successfully'));
      setTransferMaterial(null);
      setTransferForm({ quantityTransferred: '', notes: '', direction: 'MAIN_TO_MINI', materialBrandId: '' });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || '';
      if (msg.includes('Insufficient stock')) {
        toast.error(msg);
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
        materialBrandId: adjustForm.materialBrandId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage_materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-history'] });
      toast.success(t('storage.alerts.stockAdjusted', 'Stock adjusted successfully'));
      setAdjustMaterial(null);
      setAdjustForm({ storeType: 'MAIN', quantityDelta: '', reason: 'DAMAGE', notes: '', materialBrandId: '' });
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
        materialBrandId: countForm.materialBrandId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage_materials'] });
      queryClient.invalidateQueries({ queryKey: ['material-history'] });
      toast.success(t('storage.alerts.stockCountRecorded', 'Stock count recorded successfully'));
      setCountMaterial(null);
      setCountForm({ storeType: 'MAIN', countedQuantity: '', notes: '', materialBrandId: '' });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('storage.alerts.errorStockCount', 'Error recording stock count'));
    },
  });

  const allocateBrandStockMutation = useMutation({
    mutationFn: async () => {
      if (!allocateMaterial || !allocateMaterial.brands) return;
      const isPcs = isUnitIntegerOnly(allocateMaterial.unit);
      const currentStoreStock = getStock(allocateMaterial, allocateForm.storeType);
      const currentAllocTotal = (allocateMaterial.brands || []).reduce((sum, b) => {
        const val = Number(allocateForm.allocations[b.id] || 0);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

      if (currentAllocTotal > currentStoreStock) {
        toast.error(t('storage.cannotExceedAcquiredStock', 'Total allocated quantity cannot exceed acquired store stock'));
        throw new Error('Total allocated quantity cannot exceed acquired store stock');
      }

      for (const b of allocateMaterial.brands) {
        const val = Number(allocateForm.allocations[b.id] || 0);
        if (isPcs && !Number.isInteger(val)) {
          toast.error(t('storage.integerRequired', 'Quantity for PCS items must be a whole number (no decimals allowed)'));
          throw new Error('PCS requires integer quantity');
        }
      }
      const payloadAllocations = allocateMaterial.brands.map((b) => ({
        materialBrandId: b.id,
        quantity: Number(allocateForm.allocations[b.id] || 0),
      }));
      await api.post(`/storage/materials/${allocateMaterial.id}/allocate-brand-stock`, {
        storeType: allocateForm.storeType,
        allocations: payloadAllocations,
        notes: allocateForm.notes || undefined,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['storage_materials'] });
      await queryClient.invalidateQueries({ queryKey: ['material-history'] });
      toast.success(t('storage.alerts.brandStockAllocated', 'Brand stock allocated successfully'));

      try {
        const res = await api.get('/catalog/materials');
        const updatedMat = res.data?.find((x: any) => x.id === allocateMaterial?.id);
        if (updatedMat) {
          setAllocateMaterial(updatedMat);
          const otherStore = allocateForm.storeType === 'MINI' ? 'MAIN' : 'MINI';
          const otherUnallocated = getUnallocatedStock(updatedMat, otherStore);

          if (otherUnallocated > 0) {
            const nextAlloc: Record<string, string> = {};
            updatedMat.brands?.forEach((b: any) => {
              const cur = getBrandStock(b, otherStore);
              nextAlloc[b.id] = cur > 0 ? String(cur) : '';
            });
            setAllocateForm({
              storeType: otherStore,
              allocations: nextAlloc,
              notes: '',
            });
          } else {
            setAllocateMaterial(null);
          }
        } else {
          setAllocateMaterial(null);
        }
      } catch {
        setAllocateMaterial(null);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('storage.alerts.errorAllocate', 'Error allocating brand stock'));
    },
  });

  const getStock = (material: Material, storeType: 'MAIN' | 'MINI') => {
    const stock = material.materialStocks?.find(s => s.store.type === storeType);
    return stock ? Number(stock.quantity) : 0;
  };

  const getBrandStock = (brand: MaterialBrand, storeType: 'MAIN' | 'MINI') => {
    const stock = brand.brandStocks?.find(s => s.store.type === storeType);
    return stock ? Number(stock.quantity) : 0;
  };

  const getUnallocatedStock = (material: Material, storeType: 'MAIN' | 'MINI') => {
    if (!material.brands || material.brands.length === 0) return 0;
    const total = getStock(material, storeType);
    const brandTotal = material.brands.reduce((sum, b) => sum + getBrandStock(b, storeType), 0);
    return Math.max(0, total - brandTotal);
  };

  const isMaterialLowStock = (m: Material, storeType: 'MAIN' | 'MINI') => {
    const threshold = m.lowStockThreshold || 10;
    if (m.brands && m.brands.length > 0) {
      return m.brands.some(b => getBrandStock(b, storeType) <= threshold);
    }
    return getStock(m, storeType) <= threshold;
  };

  const handleOpenAllocate = (m: Material, storeType?: 'MAIN' | 'MINI') => {
    const targetStore = storeType || activeStore;
    const initialAlloc: Record<string, string> = {};
    m.brands?.forEach((b) => {
      const cur = getBrandStock(b, targetStore);
      initialAlloc[b.id] = cur > 0 ? String(cur) : '';
    });
    setAllocateForm({
      storeType: targetStore,
      allocations: initialAlloc,
      notes: '',
    });
    setAllocateMaterial(m);
  };

  // Auto-open allocation dialog if redirected with ?allocate=true or ?materialId=...
  useEffect(() => {
    if (!materials || hasAutoAllocatedRef.current) return;
    if (shouldAutoAllocate || targetMaterialId) {
      const match = materials.find((m) =>
        (targetMaterialId && m.id === targetMaterialId) ||
        (urlSearch && (
          m.nameEn.toLowerCase() === urlSearch.toLowerCase() ||
          m.nameAm === urlSearch ||
          (m.itemCode && m.itemCode.toLowerCase() === urlSearch.toLowerCase())
        ))
      );
      if (match && match.brands && match.brands.length > 0) {
        hasAutoAllocatedRef.current = true;
        handleOpenAllocate(match, urlStore);
      }
    }
  }, [materials, shouldAutoAllocate, targetMaterialId, urlSearch, urlStore]);

  const handleOpenRestock = (m: Material) => {
    const initialBrandInputs: Record<string, { quantity: string; unitCost: string }> = {};
    if (m.brands && m.brands.length > 0) {
      m.brands.forEach((b) => {
        initialBrandInputs[b.id] = { quantity: '', unitCost: '' };
      });
    }
    setRestockForm({
      storeType: activeStore,
      brandInputs: initialBrandInputs,
      quantityAdded: '',
      unitCost: '',
      notes: '',
    });
    setRestockMaterial(m);
  };

  const handleOpenTransfer = (m: Material) => {
    const mainStock = getStock(m, 'MAIN');
    const miniStock = getStock(m, 'MINI');
    const mainUnalloc = getUnallocatedStock(m, 'MAIN');
    const miniUnalloc = getUnallocatedStock(m, 'MINI');
    
    // Default to MINI_TO_MAIN if main has no stock or needs allocation while mini has allocated stock, otherwise MAIN_TO_MINI
    const defaultDirection = ((mainStock <= 0 || mainUnalloc > 0) && miniStock > 0 && miniUnalloc === 0) ? 'MINI_TO_MAIN' : 'MAIN_TO_MINI';
    setTransferForm({
      quantityTransferred: '',
      notes: '',
      direction: defaultDirection,
      materialBrandId: m.brands?.[0]?.id || '',
    });
    setTransferMaterial(m);
  };

  const handleOpenAdjust = (m: Material) => {
    setAdjustForm({
      storeType: activeStore,
      quantityDelta: '',
      reason: 'DAMAGE',
      notes: '',
      materialBrandId: m.brands?.[0]?.id || '',
    });
    setAdjustMaterial(m);
  };

  const handleOpenCount = (m: Material) => {
    setCountForm({
      storeType: activeStore,
      countedQuantity: '',
      notes: '',
      materialBrandId: m.brands?.[0]?.id || '',
    });
    setCountMaterial(m);
  };

  // Count of items running low in the active store
  const lowStockCount = useMemo(() => {
    if (!materials) return 0;
    return materials.filter((m) => isMaterialLowStock(m, activeStore)).length;
  }, [materials, activeStore]);

  const filteredMaterials = materials?.filter((m) => {
    const matchesSearch = 
      m.nameEn.toLowerCase().includes(search.toLowerCase()) || 
      m.nameAm.includes(search) ||
      (m.itemCode && m.itemCode.toLowerCase().includes(search.toLowerCase()));
    if (!matchesSearch) return false;
    
    if (showLowStockOnly) {
      if (!isMaterialLowStock(m, activeStore)) return false;
    }
    
    return true;
  });

  const totalPages = Math.max(1, Math.ceil((filteredMaterials?.length || 0) / pageSize));
  const paginatedMaterials = (filteredMaterials || []).slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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
      <PageHeader
        title={t('storage.title', 'Storage & Inventory')}
        subtitle={t('storage.subtitle', 'Manage dual stock levels across Mini Shop Floor and Main Warehouse')}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['storage_materials'] })}
        isRefreshing={isLoading}
      />

      {/* 2. Sub-Navigation Tabs & Search Toolbar on the Same Row (Exporter-Docs style) */}
      <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="md">
        {/* Navigation Pills */}
        <Box
          p={4}
          style={{
            backgroundColor: "var(--surface-card, rgba(255, 255, 255, 0.04))",
            border: "1px solid var(--surface-border, rgba(255, 255, 255, 0.08))",
            borderRadius: 12,
            display: "inline-flex",
            gap: 6,
            boxShadow: "var(--shadow-card, 0 1px 3px rgba(0, 0, 0, 0.1))",
            maxWidth: "100%",
            overflowX: "auto",
          }}
          className="custom-scrollbar"
        >
          <MantineButton
            variant={activeStore === 'MINI' ? 'filled' : 'subtle'}
            color="amber"
            size="sm"
            radius="md"
            leftSection={<Store size={16} />}
            rightSection={
              <Badge
                size="xs"
                variant={activeStore === 'MINI' ? 'white' : 'light'}
                color="amber"
                style={{ padding: '0 6px', fontWeight: 700 }}
              >
                {materials?.length || 0}
              </Badge>
            }
            onClick={() => {
              setActiveStore('MINI');
              setCurrentPage(1);
            }}
            style={{
              fontWeight: activeStore === 'MINI' ? 700 : 500,
              height: 36,
              fontSize: '13px',
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            }}
          >
            {t('storage.miniStore', 'Mini Store')}
          </MantineButton>

          <MantineButton
            variant={activeStore === 'MAIN' ? 'filled' : 'subtle'}
            color="amber"
            size="sm"
            radius="md"
            leftSection={<Archive size={16} />}
            rightSection={
              <Badge
                size="xs"
                variant={activeStore === 'MAIN' ? 'white' : 'light'}
                color="amber"
                style={{ padding: '0 6px', fontWeight: 700 }}
              >
                {materials?.length || 0}
              </Badge>
            }
            onClick={() => {
              setActiveStore('MAIN');
              setCurrentPage(1);
            }}
            style={{
              fontWeight: activeStore === 'MAIN' ? 700 : 500,
              height: 36,
              fontSize: '13px',
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            }}
          >
            {t('storage.mainStore', 'Main Store')}
          </MantineButton>

          <MantineButton
            variant={showLowStockOnly ? 'filled' : 'subtle'}
            color="red"
            size="sm"
            radius="md"
            leftSection={<AlertTriangle size={16} />}
            rightSection={
              <Badge
                size="xs"
                variant={showLowStockOnly ? 'white' : 'light'}
                color="red"
                style={{ padding: '0 6px', fontWeight: 700 }}
              >
                {lowStockCount}
              </Badge>
            }
            onClick={() => {
              setShowLowStockOnly(!showLowStockOnly);
              setCurrentPage(1);
            }}
            style={{
              fontWeight: showLowStockOnly ? 700 : 500,
              height: 36,
              fontSize: '13px',
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            }}
            title={showLowStockOnly ? "Click to view all stock items" : "Filter items with critical inventory"}
          >
            {t('storage.showLowStock', 'Low Stock Alert')}
          </MantineButton>

          <MantineButton
            variant="subtle"
            color="gray"
            size="sm"
            radius="md"
            leftSection={<History size={16} />}
            onClick={() => navigate('/storage/history')}
            style={{
              fontWeight: 500,
              height: 36,
              fontSize: '13px',
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
            }}
            title={t('storage.stockHistoryTitle', 'Stock Movement History')}
          >
            {t('storage.stockHistory', 'Stock History')}
          </MantineButton>
        </Box>

        {/* Live Search Input on the Same Row */}
        <Group gap="xs" align="center" style={{ flex: '1 1 240px', maxWidth: 340, minWidth: 200 }}>
          <TextInput
            placeholder={t('storage.searchPlaceholder', 'Search inventory by name, code...')}
            leftSection={<Search size={16} style={{ color: 'var(--text-muted)' }} />}
            rightSection={
              search ? (
                <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setSearch('')} title="Clear search">
                  <X size={14} />
                </ActionIcon>
              ) : null
            }
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              setCurrentPage(1);
            }}
            radius="md"
            size="sm"
            style={{ flex: 1 }}
            styles={{
              input: {
                height: 36,
                fontSize: '13px',
              },
            }}
          />

          {(search || showLowStockOnly) && (
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              radius="md"
              onClick={() => {
                setSearch('');
                setShowLowStockOnly(false);
                setCurrentPage(1);
              }}
              title={t('common.clear', 'Reset filters')}
              style={{ height: 36 }}
            >
              <X size={16} />
            </ActionIcon>
          )}
        </Group>
      </Group>

      {/* 3. Storage Data Table Card */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[64px] py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{t('storage.table.image', 'Image')}</TableHead>
                <TableHead className="w-[340px] sm:w-[380px] py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{t('common.material', 'Material')}</TableHead>
                <TableHead className="w-[280px] sm:w-[320px] py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{t('orders.detail.quantity', 'Quantity')}</TableHead>
                <TableHead className="text-right py-3 px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{t('common.actions', 'Actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">{t('storage.loading', 'Loading inventory...')}</TableCell>
                </TableRow>
              ) : filteredMaterials?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">{t('storage.noMaterials', 'No materials found.')}</TableCell>
                </TableRow>
              ) : (
                paginatedMaterials.map((m) => {
                  const stock = getStock(m, activeStore);
                  const mainStock = getStock(m, 'MAIN');

                  return (
                    <TableRow key={m.id}>
                      <TableCell className="w-[64px] py-3 px-4">
                        {m.imageUrl ? (
                          <div 
                            className="w-9 h-9 shrink-0 bg-secondary/50 rounded-md flex items-center justify-center overflow-hidden border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setPreviewImage(getImageUrl(m.imageUrl) || null)}
                          >
                            <img src={getImageUrl(m.imageUrl)} alt={getLocName(m)} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center">
                            <ImageOff className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="w-[340px] sm:w-[380px] py-3 px-4">
                        <div className="max-w-[360px]">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-foreground leading-snug whitespace-nowrap truncate max-w-[200px] sm:max-w-[220px]" title={getLocName(m)}>{getLocName(m)}</span>
                            {m.itemCode && (
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyItemCode(m.itemCode);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleCopyItemCode(m.itemCode);
                                  }
                                }}
                                title={t('materials.clickToCopyCode', 'Click to copy item code')}
                                className="group inline-flex items-center gap-1 max-w-[120px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border cursor-pointer transition-all active:scale-95 shadow-xs shrink-0"
                              >
                                <span className="inline-block min-w-0 overflow-x-auto whitespace-nowrap scrollbar-none no-scrollbar font-mono text-[11px] font-medium py-0.5">
                                  {m.itemCode}
                                </span>
                                {copiedCode === m.itemCode ? (
                                  <Check className="h-3 w-3 text-emerald-500 shrink-0 animate-in zoom-in-50" />
                                ) : (
                                  <Copy className="h-2.5 w-2.5 text-muted-foreground group-hover:text-foreground shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground leading-snug mt-0.5 whitespace-nowrap truncate max-w-[320px]" title={`${i18n?.language === 'am' ? m.nameEn : m.nameAm} • ${formatUnit(m.unit)}`}>
                            {i18n?.language === 'am' ? m.nameEn : m.nameAm} • {formatUnit(m.unit)}
                          </div>
                          {m.brands && m.brands.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 overflow-x-auto whitespace-nowrap scrollbar-none no-scrollbar py-0.5 max-w-[320px]">
                              <span className="text-[10px] font-medium text-muted-foreground shrink-0">{t('materials.brands', 'Brands')}:</span>
                              {m.brands.map((b) => (
                                <span key={b.id || `${b.name}-${b.size}-${b.color}-${b.type}`} className="inline-flex shrink-0 items-center text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium whitespace-nowrap">
                                  {formatBrandSizeLabel(b)} ({formatCurrency(b.price)})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="w-[280px] sm:w-[320px] py-3 px-4">
                        <div className="max-w-[300px]">
                          <div className="text-[13px] font-bold text-foreground leading-snug whitespace-nowrap">{stock} {formatUnit(m.unit)}</div>
                          {activeStore === 'MAIN' ? (
                            m.isBulkTracked && <div className="text-[11px] text-amber-500 font-semibold leading-tight mt-0.5 whitespace-nowrap">{t('storage.bulkTracked', 'Bulk Tracked')}</div>
                          ) : (
                            !m.isBulkTracked && <div className="text-[11px] text-blue-500 font-medium leading-tight mt-0.5 whitespace-nowrap">{t('storage.directDelivery', 'Direct Delivery')}</div>
                          )}
                          {m.brands && m.brands.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 pt-1 border-t border-border/40 overflow-x-auto whitespace-nowrap scrollbar-none no-scrollbar py-0.5 max-w-[300px]">
                              {m.brands.map((b) => {
                                const bStock = getBrandStock(b, activeStore);
                                const isLow = bStock <= (m.lowStockThreshold || 10);
                                return (
                                  <span 
                                    key={b.id || `${b.name}-${b.size}-${b.color}-${b.type}`} 
                                    className={`inline-flex shrink-0 items-center text-[10px] px-1.5 py-0.5 rounded font-mono whitespace-nowrap ${
                                      isLow 
                                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-semibold' 
                                        : 'bg-muted text-muted-foreground border border-border'
                                    }`}
                                    title={`${formatBrandSizeLabel(b)}: ${bStock} ${formatUnit(m.unit)} in ${activeStore === 'MAIN' ? t('storage.mainStore', 'Main Store') : t('storage.miniStore', 'Mini Store')}`}
                                  >
                                    <span className="font-sans font-medium mr-1">{formatBrandSizeLabel(b)}:</span> {bStock}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {m.brands && m.brands.length > 0 && (() => {
                            const unallocated = getUnallocatedStock(m, activeStore);
                            return unallocated > 0 ? (
                              <div className="flex items-center gap-1.5 mt-1.5 pt-1 border-t border-amber-500/30 whitespace-nowrap max-w-[300px]">
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/25 shrink-0">
                                  <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                                  <span>{unallocated} {m.unit} {t('storage.unallocatedStock', 'unallocated')}</span>
                                </span>
                                <PermissionGate permission="storage.edit">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAllocate(m, activeStore)}
                                    className="text-[10px] font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 underline cursor-pointer bg-transparent border-0 p-0 shrink-0"
                                  >
                                    {t('storage.allocate', 'Allocate')}
                                  </button>
                                </PermissionGate>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3 px-4">
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
                              className="h-8 px-2.5 text-xs gap-1.5"
                              onClick={() => handleOpenRestock(m)}
                            >
                              <PackagePlus className="w-3.5 h-3.5" />
                              <span>{t('storage.restock', 'Restock')}</span>
                            </Button>
                            {(() => {
                              const mainUnalloc = getUnallocatedStock(m, 'MAIN');
                              const miniUnalloc = getUnallocatedStock(m, 'MINI');
                              const bothUnallocated = mainUnalloc > 0 && miniUnalloc > 0;
                              const noStock = mainStock <= 0 && getStock(m, 'MINI') <= 0;
                              const disableTransfer = noStock || bothUnallocated;
                              const tooltipTitle = bothUnallocated 
                                ? t('storage.cannotTransferUnallocated', 'Must allocate brand stock before transfer')
                                : noStock 
                                ? t('storage.noStockAnywhere', 'No stock in any store') 
                                : '';

                              return (
                                <span 
                                  title={tooltipTitle}
                                  className="inline-block"
                                >
                                  <Button 
                                    variant="default" 
                                    size="sm" 
                                    className="h-8 px-2.5 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs disabled:pointer-events-none"
                                    onClick={() => handleOpenTransfer(m)}
                                    disabled={disableTransfer}
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                    <span>{t('storage.transfer', 'Transfer')}</span>
                                  </Button>
                                </span>
                              );
                            })()}
                            <DropdownMenu>
                              <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted focus:outline-none text-muted-foreground hover:text-foreground">
                                <MoreHorizontal className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 text-xs">
                                {m.brands && m.brands.length > 0 && (
                                  <DropdownMenuItem onClick={() => handleOpenAllocate(m, activeStore)} className="gap-2 text-xs cursor-pointer text-amber-600 dark:text-amber-400 focus:text-amber-600">
                                    <Boxes className="h-4 w-4" />
                                    <span>{t('storage.allocateBrandStock', 'Allocate Brand Stock')}</span>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleOpenAdjust(m)} className="gap-2 text-xs cursor-pointer">
                                  <Settings2 className="h-4 w-4" />
                                  <span>{t('storage.adjustStock', 'Adjust Stock')}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenCount(m)} className="gap-2 text-xs cursor-pointer">
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

        <TablePagination
          page={currentPage}
          pageSize={pageSize}
          total={filteredMaterials?.length || 0}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel={t('common.materials', 'materials')}
          disabled={isLoading}
        />
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">
                            {getLocalizedQuantity(entry, historyMaterial?.unit)}
                          </span>
                          {(entry.brandName || entry.sizeName || entry.colorName || entry.typeName) && (
                            <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold">
                              {formatBrandSizeLabel({
                                name: entry.brandName || '',
                                size: entry.sizeName,
                                color: entry.colorName,
                                type: entry.typeName,
                              })}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatAppDate(entry.date, true)}
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
                <span className="text-foreground">{formatAppDate(historyDetail.date, true)}</span>

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

                {(historyDetail.brandName || historyDetail.sizeName || historyDetail.colorName || historyDetail.typeName) && (
                  <>
                    <span className="text-muted-foreground font-medium">{t('storage.brand', 'Brand / Variant')}:</span>
                    <span className="text-foreground font-semibold text-amber-600 dark:text-amber-400">
                      {formatBrandSizeLabel({
                        name: historyDetail.brandName || '',
                        size: historyDetail.sizeName,
                        color: historyDetail.colorName,
                        type: historyDetail.typeName,
                      })}
                    </span>
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
        {restockMaterial && (() => {
          const isPcsRestock = isUnitIntegerOnly(restockMaterial.unit);
          const hasBrands = Boolean(restockMaterial.brands && restockMaterial.brands.length > 0);

          const currentStoreStock = getStock(restockMaterial, restockForm.storeType);
          const miniStock = getStock(restockMaterial, 'MINI');
          const mainStock = getStock(restockMaterial, 'MAIN');

          const totalAdded = hasBrands
            ? (restockMaterial.brands || []).reduce((sum, b) => {
                const q = Number(restockForm.brandInputs[b.id]?.quantity || 0);
                return sum + (isNaN(q) ? 0 : q);
              }, 0)
            : (Number(restockForm.quantityAdded) || 0);

          const totalCost = hasBrands
            ? (restockMaterial.brands || []).reduce((sum, b) => {
                const q = Number(restockForm.brandInputs[b.id]?.quantity || 0);
                const c = Number(restockForm.brandInputs[b.id]?.unitCost || 0);
                return sum + ((!isNaN(q) && !isNaN(c) && q > 0 && c > 0) ? q * c : 0);
              }, 0)
            : ((Number(restockForm.quantityAdded) || 0) * (Number(restockForm.unitCost) || 0));

          const hasFractionalRestock = isPcsRestock && (
            hasBrands
              ? Object.values(restockForm.brandInputs).some(
                  (input) => input.quantity && !Number.isInteger(Number(input.quantity))
                )
              : Boolean(restockForm.quantityAdded && !Number.isInteger(Number(restockForm.quantityAdded)))
          );

          const isRestockValid = totalAdded > 0 && !hasFractionalRestock;

          return (
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <PackagePlus className="w-5 h-5 text-amber-600" />
                  {t('storage.restock', 'Restock')} — {restockMaterial ? getLocName(restockMaterial) : ''}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* 1. Store selector cards (Main Store vs Mini Store) */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Mini Store Tab */}
                  <button
                    type="button"
                    onClick={() => setRestockForm({ ...restockForm, storeType: 'MINI' })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      restockForm.storeType === 'MINI'
                        ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-xs'
                        : 'border-border bg-card hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${
                          restockForm.storeType === 'MINI' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-foreground block">
                            {t('storage.miniStore', 'Mini Store')}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {miniStock} {formatUnit(restockMaterial.unit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Main Store Tab */}
                  <button
                    type="button"
                    onClick={() => setRestockForm({ ...restockForm, storeType: 'MAIN' })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      restockForm.storeType === 'MAIN'
                        ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-xs'
                        : 'border-border bg-card hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${
                          restockForm.storeType === 'MAIN' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Archive className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-foreground block">
                            {t('storage.mainStore', 'Main Store')}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {mainStock} {formatUnit(restockMaterial.unit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>

                {/* 2. Metric Summary Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg border border-border bg-muted/30 text-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      {t('storage.totalStoreStock', 'Total Store Stock')}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-foreground">
                      {currentStoreStock} {formatUnit(restockMaterial.unit)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-muted/30 text-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      {t('storage.totalAdded', 'Total Added')}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400">
                      +{totalAdded} {formatUnit(restockMaterial.unit)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-muted/30 text-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      {t('storage.newTotalStock', 'New Total Stock')}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      {currentStoreStock + totalAdded} {formatUnit(restockMaterial.unit)}
                    </span>
                  </div>
                </div>

                {/* 3. Warning Card when PCS item has decimal values */}
                {hasFractionalRestock && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-800 dark:text-red-300 animate-in fade-in duration-200">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <p className="font-bold text-sm text-red-900 dark:text-red-200">
                        {t('alerts.error', 'Invalid Quantity')}
                      </p>
                      <p className="leading-relaxed text-red-700 dark:text-red-300">
                        {t('storage.integerRequired', 'Quantity for PCS items must be a whole number (no decimals allowed)')}
                      </p>
                    </div>
                  </div>
                )}

                {/* 4. Brands / Variants List */}
                {hasBrands ? (
                  <div className="space-y-2.5 max-h-[38vh] overflow-y-auto pr-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                        {t('materials.brands', 'Brands')} ({restockMaterial.brands?.length || 0})
                      </span>
                    </div>

                    {restockMaterial.brands?.map((brand) => {
                      const curBrandStock = getBrandStock(brand, restockForm.storeType);
                      const brandInput = restockForm.brandInputs[brand.id] || { quantity: '', unitCost: '' };

                      return (
                        <div
                          key={brand.id}
                          className="p-3 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-sm text-foreground truncate">
                                {formatBrandSizeLabel(brand)}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                                {formatCurrency(brand.price)}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {t('common.current', 'Current')}: {curBrandStock} {formatUnit(restockMaterial.unit)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {/* Bought Price / Unit Cost input */}
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                {t('storage.boughtPrice', 'Bought Price')}
                              </span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={brandInput.unitCost}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setRestockForm({
                                    ...restockForm,
                                    brandInputs: {
                                      ...restockForm.brandInputs,
                                      [brand.id]: {
                                        ...brandInput,
                                        unitCost: val,
                                      },
                                    },
                                  });
                                }}
                                placeholder={t('common.optional', 'Optional')}
                                className="w-24 h-9 text-xs text-right font-mono"
                              />
                            </div>

                            {/* Quantity to Add input */}
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                {t('storage.quantityToAdd', 'Qty')}
                              </span>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  step={getQuantityStep(restockMaterial.unit)}
                                  value={brandInput.quantity}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (isPcsRestock && val.includes('.')) return;
                                    setRestockForm({
                                      ...restockForm,
                                      brandInputs: {
                                        ...restockForm.brandInputs,
                                        [brand.id]: {
                                          ...brandInput,
                                          quantity: val,
                                        },
                                      },
                                    });
                                  }}
                                  placeholder="0"
                                  className="w-20 h-9 text-sm text-right font-mono"
                                />
                                <span className="text-xs text-muted-foreground w-7 truncate">
                                  {formatUnit(restockMaterial.unit)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Single Unbranded Material inputs */
                  <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                          {t('storage.quantityToAdd', 'Quantity to Add')} ({formatUnit(restockMaterial.unit)}) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step={getQuantityStep(restockMaterial.unit)}
                          value={restockForm.quantityAdded}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (isPcsRestock && val.includes('.')) return;
                            setRestockForm({ ...restockForm, quantityAdded: val });
                          }}
                          placeholder="0"
                          className="h-10 text-sm font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">
                          {t('storage.boughtPrice', 'Bought Price')} ({t('common.birr', 'Birr')})
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={restockForm.unitCost}
                          onChange={(e) => setRestockForm({ ...restockForm, unitCost: e.target.value })}
                          placeholder={t('common.optional', 'Optional')}
                          className="h-10 text-sm font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Total Estimated Cost */}
                {totalCost > 0 && (
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs">
                    <span className="font-medium text-muted-foreground">
                      {t('storage.totalEstimatedCost', 'Est. Total Cost')}:
                    </span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-3 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setRestockMaterial(null)}
                  disabled={restockMutation.isPending}
                  className="h-10 px-5 rounded-lg font-medium border-border hover:bg-muted text-foreground transition-all cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  onClick={() => restockMutation.mutate()}
                  disabled={restockMutation.isPending || !isRestockValid}
                  className="h-10 px-6 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm hover:shadow-md transition-all gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {restockMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t('storage.restocking', 'Restocking...')}</span>
                    </>
                  ) : (
                    <>
                      <PackagePlus className="w-4 h-4" />
                      <span>{t('storage.confirmRestock', 'Confirm Restock')}</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          );
        })()}
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

            {(() => {
              const srcStore = transferForm.direction === 'MAIN_TO_MINI' ? 'MAIN' : 'MINI';
              const unallocatedInSource = transferMaterial ? getUnallocatedStock(transferMaterial, srcStore) : 0;
              if (unallocatedInSource <= 0) return null;

              return (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold">{t('storage.needsAllocation', 'Needs Allocation')}</p>
                    <p>
                      {t('storage.unallocatedTransferNotice', {
                        unallocated: unallocatedInSource,
                        defaultValue: `This material has ${unallocatedInSource} unallocated stock in this store. Please allocate brand stock before transferring.`
                      })}
                    </p>
                  </div>
                </div>
              );
            })()}

            {transferMaterial?.brands && transferMaterial.brands.length > 0 && (
              <div className="space-y-2">
                <Label>{t('storage.selectBrand', 'Select Brand')} <span className="text-red-500">*</span></Label>
                <Select
                  value={transferForm.materialBrandId || ''}
                  onValueChange={(val) => setTransferForm({ ...transferForm, materialBrandId: val || '', quantityTransferred: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('storage.selectBrand', 'Select Brand')}>
                      {(val: string) => {
                        if (!val) return <span className="text-muted-foreground">{t('storage.selectBrand', 'Select Brand')}</span>;
                        const b = transferMaterial?.brands?.find((x) => x.id === val);
                        return b ? formatBrandSizeLabel(b) : val;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {transferMaterial.brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {formatBrandSizeLabel(b)} ({t('common.current', 'Current')}: {getBrandStock(b, transferForm.direction === 'MAIN_TO_MINI' ? 'MAIN' : 'MINI')} {formatUnit(transferMaterial.unit)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {(() => {
              const selectedBrand = transferMaterial?.brands?.find((b) => b.id === transferForm.materialBrandId);
              const availableStock = selectedBrand 
                ? getBrandStock(selectedBrand, transferForm.direction === 'MAIN_TO_MINI' ? 'MAIN' : 'MINI')
                : (transferMaterial ? getStock(transferMaterial, transferForm.direction === 'MAIN_TO_MINI' ? 'MAIN' : 'MINI') : 0);

              return (
                <>
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#161616] rounded-lg border border-gray-200 dark:border-gray-800">
                    <span className="text-sm text-gray-500">
                      {transferForm.direction === 'MAIN_TO_MINI' 
                        ? t('storage.availableInMain', 'Available in Main Store:') 
                        : t('storage.availableInMini', 'Available in Mini Store:')}
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {availableStock} {formatUnit(transferMaterial?.unit)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('storage.quantityToTransfer', 'Quantity to Transfer')} ({formatUnit(transferMaterial?.unit)})</Label>
                    <Input
                      type="number"
                      min={isUnitIntegerOnly(transferMaterial?.unit) ? "1" : "0.01"}
                      max={availableStock}
                      step={getQuantityStep(transferMaterial?.unit)}
                      value={transferForm.quantityTransferred}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (isUnitIntegerOnly(transferMaterial?.unit) && val.includes('.')) return;
                        setTransferForm({ ...transferForm, quantityTransferred: val });
                      }}
                      placeholder={t('storage.placeholders.quantity', 'e.g. 5')}
                    />
                  </div>
                </>
              );
            })()}
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
            {(() => {
              const selectedBrand = transferMaterial?.brands?.find((b) => b.id === transferForm.materialBrandId);
              const availableStock = selectedBrand 
                ? getBrandStock(selectedBrand, transferForm.direction === 'MAIN_TO_MINI' ? 'MAIN' : 'MINI')
                : (transferMaterial ? getStock(transferMaterial, transferForm.direction === 'MAIN_TO_MINI' ? 'MAIN' : 'MINI') : 0);
              const hasBrands = (transferMaterial?.brands?.length ?? 0) > 0;
              const isBrandInvalid = hasBrands && !transferForm.materialBrandId;
              const srcStore = transferForm.direction === 'MAIN_TO_MINI' ? 'MAIN' : 'MINI';
              const unallocatedInSource = transferMaterial ? getUnallocatedStock(transferMaterial, srcStore) : 0;
              const qty = Number(transferForm.quantityTransferred);
              const isPcs = isUnitIntegerOnly(transferMaterial?.unit);
              const isInvalidQty = !transferForm.quantityTransferred || isNaN(qty) || qty <= 0 || qty > availableStock || (isPcs && !Number.isInteger(qty));

              return (
                <Button 
                  onClick={() => transferMutation.mutate()} 
                  disabled={transferMutation.isPending || isInvalidQty || isBrandInvalid || unallocatedInSource > 0}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
                >
                  {transferMutation.isPending ? t('storage.transferring', 'Transferring...') : t('storage.confirmTransfer', 'Confirm Transfer')}
                </Button>
              );
            })()}
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
            {adjustMaterial?.brands && adjustMaterial.brands.length > 0 && (
              <div className="space-y-2">
                <Label>{t('storage.selectBrand', 'Select Brand')} <span className="text-red-500">*</span></Label>
                <Select
                  value={adjustForm.materialBrandId || ''}
                  onValueChange={(val) => setAdjustForm({ ...adjustForm, materialBrandId: val || '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('storage.selectBrand', 'Select Brand')}>
                      {(val: string) => {
                        if (!val) return <span className="text-muted-foreground">{t('storage.selectBrand', 'Select Brand')}</span>;
                        const b = adjustMaterial?.brands?.find((x) => x.id === val);
                        return b ? formatBrandSizeLabel(b) : val;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {adjustMaterial.brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {formatBrandSizeLabel(b)} ({t('common.current', 'Current')}: {getBrandStock(b, adjustForm.storeType as 'MAIN' | 'MINI')} {formatUnit(adjustMaterial.unit)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(() => {
              const selectedBrand = adjustMaterial?.brands?.find((b) => b.id === adjustForm.materialBrandId);
              const mainCurrent = selectedBrand ? getBrandStock(selectedBrand, 'MAIN') : (adjustMaterial ? getStock(adjustMaterial, 'MAIN') : 0);
              const miniCurrent = selectedBrand ? getBrandStock(selectedBrand, 'MINI') : (adjustMaterial ? getStock(adjustMaterial, 'MINI') : 0);

              return (
                <div className="space-y-2">
                  <Label>{t('storage.store', 'Store')}</Label>
                  <Select value={adjustForm.storeType} onValueChange={(val) => setAdjustForm({ ...adjustForm, storeType: val as string })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('storage.selectStore', 'Select Store')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MAIN">{t('storage.mainStore', 'Main Store')} ({t('common.current', 'Current')}: {mainCurrent} {formatUnit(adjustMaterial?.unit)})</SelectItem>
                      <SelectItem value="MINI">{t('storage.miniStore', 'Mini Store')} ({t('common.current', 'Current')}: {miniCurrent} {formatUnit(adjustMaterial?.unit)})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })()}
            <div className="space-y-2">
              <Label>{t('storage.adjustmentQuantity', 'Adjustment Quantity')} ({formatUnit(adjustMaterial?.unit)})</Label>
              <Input
                type="number"
                step={getQuantityStep(adjustMaterial?.unit)}
                value={adjustForm.quantityDelta}
                onChange={(e) => {
                  const val = e.target.value;
                  if (isUnitIntegerOnly(adjustMaterial?.unit) && val.includes('.')) return;
                  setAdjustForm({ ...adjustForm, quantityDelta: val });
                }}
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
            {(() => {
              const isPcs = isUnitIntegerOnly(adjustMaterial?.unit);
              const deltaNum = Number(adjustForm.quantityDelta);
              const isDeltaValid = Boolean(
                adjustForm.quantityDelta !== '' &&
                !isNaN(deltaNum) &&
                deltaNum !== 0 &&
                (!isPcs || Number.isInteger(deltaNum))
              );
              return (
                <Button 
                  onClick={() => adjustMutation.mutate()} 
                  disabled={adjustMutation.isPending || !isDeltaValid || ((adjustMaterial?.brands?.length ?? 0) > 0 && !adjustForm.materialBrandId)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
                >
                  {adjustMutation.isPending ? t('storage.adjusting', 'Adjusting...') : t('storage.confirmAdjustment', 'Confirm Adjustment')}
                </Button>
              );
            })()}
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
            {countMaterial?.brands && countMaterial.brands.length > 0 && (
              <div className="space-y-2">
                <Label>{t('storage.selectBrand', 'Select Brand')} <span className="text-red-500">*</span></Label>
                <Select
                  value={countForm.materialBrandId || ''}
                  onValueChange={(val) => setCountForm({ ...countForm, materialBrandId: val || '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('storage.selectBrand', 'Select Brand')}>
                      {(val: string) => {
                        if (!val) return <span className="text-muted-foreground">{t('storage.selectBrand', 'Select Brand')}</span>;
                        const b = countMaterial?.brands?.find((x) => x.id === val);
                        return b ? formatBrandSizeLabel(b) : val;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {countMaterial.brands.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {formatBrandSizeLabel(b)} ({t('storage.systemStock', 'System')}: {getBrandStock(b, countForm.storeType as 'MAIN' | 'MINI')} {formatUnit(countMaterial.unit)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(() => {
              const selectedBrand = countMaterial?.brands?.find((b) => b.id === countForm.materialBrandId);
              const mainCurrent = selectedBrand ? getBrandStock(selectedBrand, 'MAIN') : (countMaterial ? getStock(countMaterial, 'MAIN') : 0);
              const miniCurrent = selectedBrand ? getBrandStock(selectedBrand, 'MINI') : (countMaterial ? getStock(countMaterial, 'MINI') : 0);

              return (
                <div className="space-y-2">
                  <Label>{t('storage.store', 'Store')}</Label>
                  <Select value={countForm.storeType} onValueChange={(v) => setCountForm({ ...countForm, storeType: v as string })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('storage.selectStore', 'Select Store')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MAIN">{t('storage.mainStore', 'Main Store')} ({t('storage.systemStock', 'System')}: {mainCurrent} {formatUnit(countMaterial?.unit)})</SelectItem>
                      <SelectItem value="MINI">{t('storage.miniStore', 'Mini Store')} ({t('storage.systemStock', 'System')}: {miniCurrent} {formatUnit(countMaterial?.unit)})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })()}
            <div className="space-y-2">
              <Label>{t('storage.actualCount', 'Actual Count')} ({formatUnit(countMaterial?.unit)})</Label>
              <Input
                type="number"
                min="0"
                step={getQuantityStep(countMaterial?.unit)}
                value={countForm.countedQuantity}
                onChange={(e) => {
                  const val = e.target.value;
                  if (isUnitIntegerOnly(countMaterial?.unit) && val.includes('.')) return;
                  setCountForm({ ...countForm, countedQuantity: val });
                }}
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
            {(() => {
              const isPcs = isUnitIntegerOnly(countMaterial?.unit);
              const countNum = Number(countForm.countedQuantity);
              const isCountValid = Boolean(
                countForm.countedQuantity !== '' &&
                !isNaN(countNum) &&
                countNum >= 0 &&
                (!isPcs || Number.isInteger(countNum))
              );
              return (
                <Button 
                  onClick={() => countMutation.mutate()} 
                  disabled={countMutation.isPending || !isCountValid || ((countMaterial?.brands?.length ?? 0) > 0 && !countForm.materialBrandId)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm"
                >
                  {countMutation.isPending ? t('storage.recording', 'Recording...') : t('storage.recordCount', 'Record Count')}
                </Button>
              );
            })()}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Allocate Brand Stock Dialog ===== */}
      <Dialog open={!!allocateMaterial} onOpenChange={(open) => !open && setAllocateMaterial(null)}>
        {allocateMaterial && (() => {
          const isPcsAlloc = isUnitIntegerOnly(allocateMaterial.unit);
          const hasFractionalAllocations = Boolean(
            isPcsAlloc &&
            Object.values(allocateForm.allocations).some((val) => val && !Number.isInteger(Number(val)))
          );

          const currentStoreStock = getStock(allocateMaterial, allocateForm.storeType);
          const currentAllocTotal = (allocateMaterial.brands || []).reduce((sum, b) => {
            const val = Number(allocateForm.allocations[b.id] || 0);
            return sum + (isNaN(val) ? 0 : val);
          }, 0);
          const remaining = currentStoreStock - currentAllocTotal;

          const miniStock = getStock(allocateMaterial, 'MINI');
          const mainStock = getStock(allocateMaterial, 'MAIN');
          const miniUnallocated = getUnallocatedStock(allocateMaterial, 'MINI');
          const mainUnallocated = getUnallocatedStock(allocateMaterial, 'MAIN');
          const isMiniIssue = miniUnallocated > 0;
          const isMainIssue = mainUnallocated > 0;

          const handleStoreChange = (newStore: 'MAIN' | 'MINI') => {
            const newAlloc: Record<string, string> = {};
            allocateMaterial.brands?.forEach((b) => {
              const cur = getBrandStock(b, newStore);
              newAlloc[b.id] = cur > 0 ? String(cur) : '';
            });
            setAllocateForm({
              ...allocateForm,
              storeType: newStore,
              allocations: newAlloc,
            });
          };

          const handleEvenSplit = () => {
            const brands = allocateMaterial.brands || [];
            if (brands.length === 0) return;
            const newAlloc: Record<string, string> = {};

            if (isPcsAlloc) {
              const intStock = Math.floor(currentStoreStock);
              const perBrand = Math.floor(intStock / brands.length);
              const remainder = intStock % brands.length;
              brands.forEach((b, idx) => {
                const qty = perBrand + (idx === 0 ? remainder : 0);
                newAlloc[b.id] = String(qty);
              });
            } else {
              const perBrand = Math.floor((currentStoreStock / brands.length) * 100) / 100;
              const allocatedSum = Math.round(perBrand * brands.length * 100) / 100;
              const remainder = Math.round((currentStoreStock - allocatedSum) * 100) / 100;
              brands.forEach((b, idx) => {
                const qty = idx === 0 ? Math.round((perBrand + remainder) * 100) / 100 : perBrand;
                newAlloc[b.id] = String(qty);
              });
            }

            setAllocateForm({
              ...allocateForm,
              allocations: newAlloc,
            });
          };

          const handleFillRemaining = (brandId: string) => {
            const otherSum = (allocateMaterial.brands || [])
              .filter((b) => b.id !== brandId)
              .reduce((sum, b) => sum + Number(allocateForm.allocations[b.id] || 0), 0);
            let needed = Math.max(0, currentStoreStock - otherSum);
            if (isPcsAlloc) {
              needed = Math.round(needed);
            } else {
              needed = Math.round(needed * 100) / 100;
            }
            setAllocateForm({
              ...allocateForm,
              allocations: {
                ...allocateForm.allocations,
                [brandId]: String(needed),
              },
            });
          };

          // Detect which brand fields are empty (0 or unset)
          const emptyBrands = (allocateMaterial.brands || []).filter((b) => {
            const v = allocateForm.allocations[b.id];
            return !v || Number(v) === 0;
          });
          const isOnlyOneBrandLeft = emptyBrands.length === 1 && remaining > 0;

          return (
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-amber-600" />
                  {t('storage.allocateBrandStock', 'Allocate Brand Stock')} — {allocateMaterial ? getLocName(allocateMaterial) : ''}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {/* 1. Store selector cards with warning & check icons */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Mini Store Tab */}
                  <button
                    type="button"
                    onClick={() => handleStoreChange('MINI')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      allocateForm.storeType === 'MINI'
                        ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-xs'
                        : 'border-border bg-card hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${
                          allocateForm.storeType === 'MINI' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Store className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-foreground block">
                            {t('storage.miniStore', 'Mini Store')}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {miniStock} {formatUnit(allocateMaterial.unit)}
                          </span>
                        </div>
                      </div>

                      {isMiniIssue ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 animate-pulse" />
                          <span>{miniUnallocated} {t('storage.unallocatedStock', 'unallocated')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>{t('storage.storeHealthy', 'Allocated')}</span>
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Main Store Tab */}
                  <button
                    type="button"
                    onClick={() => handleStoreChange('MAIN')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      allocateForm.storeType === 'MAIN'
                        ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-500/5 shadow-xs'
                        : 'border-border bg-card hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${
                          allocateForm.storeType === 'MAIN' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          <Archive className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-foreground block">
                            {t('storage.mainStore', 'Main Store')}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {mainStock} {formatUnit(allocateMaterial.unit)}
                          </span>
                        </div>
                      </div>

                      {isMainIssue ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 animate-pulse" />
                          <span>{mainUnallocated} {t('storage.unallocatedStock', 'unallocated')}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>{t('storage.storeHealthy', 'Allocated')}</span>
                        </span>
                      )}
                    </div>
                  </button>
                </div>

                {/* 2. Metric Summary Cards */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg border border-border bg-muted/30 text-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      {t('storage.totalStoreStock', 'Total Store Stock')}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-foreground">
                      {currentStoreStock} {formatUnit(allocateMaterial.unit)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-muted/30 text-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                      {t('storage.allocatedSoFar', 'Allocated')}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-foreground">
                      {currentAllocTotal} {formatUnit(allocateMaterial.unit)}
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-lg border text-center ${
                    remaining === 0 
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
                      : remaining > 0 
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400' 
                      : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400'
                  }`}>
                    <span className="text-[10px] font-semibold uppercase tracking-wider block">
                      {remaining >= 0 ? t('storage.remainingToAllocate', 'Remaining') : t('storage.overallocated', 'Over Total')}
                    </span>
                    <span className="text-base sm:text-lg font-bold flex items-center justify-center gap-1">
                      {remaining === 0 && <CheckCircle2 className="w-4 h-4 text-emerald-600 inline shrink-0" />}
                      {Math.abs(remaining)} {formatUnit(allocateMaterial.unit)}
                    </span>
                  </div>
                </div>

                {/* 3. Error Card when allocated exceeds current stock (BLOCK OVER ENTRY) */}
                {currentAllocTotal > currentStoreStock && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-800 dark:text-red-300 animate-in fade-in duration-200">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-sm text-red-900 dark:text-red-200">
                        {t('storage.errorAllocationExceedsTitle', 'Allocation Exceeds Acquired Stock')}
                      </p>
                      <p className="leading-relaxed opacity-90 text-red-700 dark:text-red-300">
                        {t('storage.errorAllocationExceedsDesc', 
                          'Total allocated quantity ({{totalAllocated}} {{unit}}) cannot exceed acquired store stock ({{totalStore}} {{unit}}). Please reduce brand quantities by {{delta}} {{unit}}.',
                          {
                            totalAllocated: currentAllocTotal,
                            totalStore: currentStoreStock,
                            delta: Math.round((currentAllocTotal - currentStoreStock) * 100) / 100,
                            unit: formatUnit(allocateMaterial.unit),
                          }
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* 3.1 Warning Card when PCS item has decimal values */}
                {hasFractionalAllocations && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3 text-red-800 dark:text-red-300 animate-in fade-in duration-200">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <p className="font-bold text-sm text-red-900 dark:text-red-200">
                        {t('alerts.error', 'Invalid Quantity')}
                      </p>
                      <p className="leading-relaxed text-red-700 dark:text-red-300">
                        {t('storage.integerRequired', 'Quantity for PCS items must be a whole number (no decimals allowed)')}
                      </p>
                    </div>
                  </div>
                )}

                {/* 4. Brands Input List */}
                <div className="space-y-2.5 max-h-[38vh] overflow-y-auto pr-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      {t('materials.brands', 'Brands')} ({allocateMaterial.brands?.length || 0})
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                      onClick={handleEvenSplit}
                    >
                      {t('storage.evenSplit', 'Even Split')}
                    </Button>
                  </div>

                  {allocateMaterial.brands?.map((brand) => {
                    const curBrandStock = getBrandStock(brand, allocateForm.storeType);
                    const currentVal = allocateForm.allocations[brand.id] ?? '';
                    const isTheOnlyEmpty = isOnlyOneBrandLeft && emptyBrands[0]?.id === brand.id;

                    return (
                      <div
                        key={brand.id}
                        className="p-3 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-sm text-foreground truncate">{formatBrandSizeLabel(brand)}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                              {formatCurrency(brand.price)}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {t('common.current', 'Current')}: {curBrandStock} {formatUnit(allocateMaterial.unit)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {isTheOnlyEmpty && (
                            <button
                              type="button"
                              onClick={() => handleFillRemaining(brand.id)}
                              className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline flex items-center gap-1.5 transition-colors cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-md border border-amber-500/30 shrink-0"
                              title={t('storage.fillTheRest', 'Fill the rest')}
                            >
                              <span>{t('storage.fillTheRest', 'Fill the rest')}</span>
                              <span className="font-mono font-bold">({remaining})</span>
                            </button>
                          )}

                          <Input
                            type="number"
                            min="0"
                            step={getQuantityStep(allocateMaterial.unit)}
                            value={currentVal}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (isPcsAlloc && val.includes('.')) return;
                              setAllocateForm({
                                ...allocateForm,
                                allocations: {
                                  ...allocateForm.allocations,
                                  [brand.id]: val,
                                },
                              });
                            }}
                            placeholder="0"
                            className="w-24 h-9 text-sm text-right font-mono"
                          />
                          <span className="text-xs text-muted-foreground w-8 truncate">
                            {formatUnit(allocateMaterial.unit)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 5. Notes Input */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-medium text-foreground">{t('common.notesOptional', 'Notes (Optional)')}</Label>
                  <Input
                    value={allocateForm.notes}
                    onChange={(e) => setAllocateForm({ ...allocateForm, notes: e.target.value })}
                    placeholder={t('storage.placeholders.allocateNotes', 'e.g. Initial brand allocation of existing stock across Abro and Flamingo')}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-3 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setAllocateMaterial(null)}
                  disabled={allocateBrandStockMutation.isPending}
                  className="h-10 px-5 rounded-lg font-medium border-border hover:bg-muted text-foreground transition-all cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button
                  onClick={() => allocateBrandStockMutation.mutate()}
                  disabled={allocateBrandStockMutation.isPending || hasFractionalAllocations || currentAllocTotal > currentStoreStock}
                  className="h-10 px-6 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm hover:shadow-md transition-all gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {allocateBrandStockMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t('storage.allocating', 'Saving...')}</span>
                    </>
                  ) : (
                    <>
                      <Boxes className="w-4 h-4" />
                      <span>{t('storage.confirmAllocation', 'Save Allocation')}</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          );
        })()}
      </Dialog>
    </div>
  );
}
