import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { getImageUrl, formatCurrency, formatInputNumber, parseInputNumber, isUnitIntegerOnly, getQuantityStep, formatBrandSizeLabel } from '../lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSearch
} from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import { ImagePreviewModal } from '../components/ui/image-preview-modal';
import { LazyImage } from '../components/common/LazyImage';
import { PermissionGate } from '../components/PermissionGate';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Edit2, Trash2, ImageOff, Plus, Tag, ChevronUp, Copy, Check, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, ExecutiveAddButton, TablePagination } from '../components/common';

export type MaterialBrand = {
  id?: string;
  name: string;
  size?: string | null;
  color?: string | null;
  type?: string | null;
  price: number | string;
};

export type BrandSizeItem = {
  id?: string;
  size: string;
  color: string;
  type: string;
  price: string;
};

export type BrandGroup = {
  name: string;
  baseId?: string;
  basePrice: string;
  sizes: BrandSizeItem[];
};

interface AddVariantPopoverProps {
  title?: string;
  defaultPrice?: string;
  existingVariants: BrandSizeItem[];
  onAdd: (variant: { size: string; color: string; type: string; price: string }) => void;
  triggerLabel?: string;
  triggerClassName?: string;
}

function AddVariantPopover({
  title,
  defaultPrice = '',
  existingVariants,
  onAdd,
  triggerLabel,
  triggerClassName,
}: AddVariantPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [type, setType] = useState('');
  const [price, setPrice] = useState(defaultPrice);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setSize('');
      setColor('');
      setType('');
      setPrice(defaultPrice || '');
    }
  };

  const handleAdd = () => {
    const trimmedSize = size.trim();
    const trimmedColor = color.trim();
    const trimmedType = type.trim();
    const priceVal = parseInputNumber(price);

    if (!trimmedSize && !trimmedColor && !trimmedType) {
      toast.error(t('materials.variantRequired', 'At least one attribute (size, color, or type) is required'));
      return;
    }
    if (!price || isNaN(priceVal) || priceVal <= 0) {
      toast.error(t('materials.validPriceRequired', 'Valid variant price is required'));
      return;
    }
    if (existingVariants.some(v =>
      (v.size || '').trim().toLowerCase() === trimmedSize.toLowerCase() &&
      (v.color || '').trim().toLowerCase() === trimmedColor.toLowerCase() &&
      (v.type || '').trim().toLowerCase() === trimmedType.toLowerCase()
    )) {
      toast.error(t('materials.variantExists', 'This variant already exists'));
      return;
    }

    onAdd({
      size: trimmedSize,
      color: trimmedColor,
      type: trimmedType,
      price: formatInputNumber(price),
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        type="button"
        className={triggerClassName || "inline-flex items-center gap-0.5 h-5 px-1.5 rounded-full text-[10px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/25 transition-all cursor-pointer shrink-0"}
      >
        <Plus className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
        <span>{triggerLabel || t('materials.addVariant', 'Add Variant')}</span>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        className="w-80 p-3 bg-card border border-border shadow-2xl rounded-xl space-y-3 z-[300]"
      >
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="truncate max-w-[170px]">{title || t('materials.addVariant', 'Add Variant')}</span>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">
            {t('materials.variantHint', 'Any combo + price')}
          </span>
        </div>

        <div className="space-y-2">
          {/* Size */}
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <Label className="text-[11px] font-semibold text-foreground">
                {t('materials.size', 'Size')}
              </Label>
              <span className="text-[10px] text-muted-foreground">{t('common.optional', 'Optional')}</span>
            </div>
            <Input
              className="h-7 text-xs bg-background"
              placeholder={t('materials.sizePlaceholder', 'e.g. 500ml, XL, 16"')}
              value={size}
              onChange={(e) => setSize(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
              autoFocus
            />
          </div>

          {/* Color */}
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <Label className="text-[11px] font-semibold text-foreground">
                {t('materials.color', 'Color')}
              </Label>
              <span className="text-[10px] text-muted-foreground">{t('common.optional', 'Optional')}</span>
            </div>
            <Input
              className="h-7 text-xs bg-background"
              placeholder={t('materials.colorPlaceholder', 'e.g. Red, Black, Blue')}
              value={color}
              onChange={(e) => setColor(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            />
          </div>

          {/* Type */}
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <Label className="text-[11px] font-semibold text-foreground">
                {t('materials.type', 'Type')}
              </Label>
              <span className="text-[10px] text-muted-foreground">{t('common.optional', 'Optional')}</span>
            </div>
            <Input
              className="h-7 text-xs bg-background"
              placeholder={t('materials.typePlaceholder', 'e.g. Premium, Matte, Spray')}
              value={type}
              onChange={(e) => setType(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
            />
          </div>

          {/* Price */}
          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <Label className="text-[11px] font-semibold text-foreground">
                {t('common.price', 'Price')} (ETB)
              </Label>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">{t('common.required', 'Required')}</span>
            </div>
            <div className="relative flex items-center">
              <Input
                className="h-7 text-xs bg-background font-mono font-semibold pr-8"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(formatInputNumber(e.target.value))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
              />
              <span className="absolute right-2 text-[10px] font-bold text-muted-foreground select-none">
                ETB
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            className="h-7 px-3 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white gap-1 rounded-md shadow-xs cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>{t('materials.addVariant', 'Add Variant')}</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

type Material = {
  id: string;
  itemCode: string;
  nameEn: string;
  nameAm: string;
  unit: string;
  currentPrice: number | null;
  lowStockThreshold: number;
  isBulkTracked: boolean;
  isStandaloneSellable: boolean;
  imageUrl?: string;
  brands?: MaterialBrand[];
};

export default function Materials() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [search, setSearch] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
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
  
  // Delete state
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    itemCode: '',
    nameEn: '',
    nameAm: '',
    unit: 'PCS',
    lowStockThreshold: '10',
    currentPrice: '',
    isBulkTracked: false,
    isStandaloneSellable: false,
  });
  const [brandGroups, setBrandGroups] = useState<BrandGroup[]>([]);
  const [newBrandName, setNewBrandName] = useState('');
  const [showAddBrandInput, setShowAddBrandInput] = useState(false);
  const [sizesOnlyList, setSizesOnlyList] = useState<BrandSizeItem[]>([]);
  const [showSizeOnlyInput, setShowSizeOnlyInput] = useState(false);
  const [editingPriceKey, setEditingPriceKey] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const { data: materials, isLoading, refetch, isFetching } = useQuery<Material[]>({
    queryKey: ['materials'],
    queryFn: async () => {
      const res = await api.get('/catalog/materials');
      return res.data;
    },
  });

  const handleAddBrandGroup = () => {
    const trimmed = newBrandName.trim();
    if (!trimmed) {
      toast.error(t('materials.brandRequired', 'Brand name is required'));
      return;
    }
    const exists = brandGroups.some(g => g.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      toast.error(t('materials.brandExists', 'This brand already exists. Add sizes to it directly in its card below.'));
      return;
    }
    setBrandGroups(prev => [
      ...prev,
      {
        name: trimmed,
        basePrice: '',
        sizes: [],
      }
    ]);
    setNewBrandName('');
  };

  const handleRemoveBrandGroup = (groupIndex: number) => {
    setBrandGroups(prev => prev.filter((_, idx) => idx !== groupIndex));
  };

  const handleUpdateBrandBasePrice = (groupIndex: number, priceStr: string) => {
    setBrandGroups(prev => prev.map((g, idx) => {
      if (idx !== groupIndex) return g;
      return { ...g, basePrice: formatInputNumber(priceStr) };
    }));
  };

  const handleUpdateBrandVariantPrice = (groupIndex: number, sizeIndex: number, priceStr: string) => {
    setBrandGroups(prev => prev.map((g, idx) => {
      if (idx !== groupIndex) return g;
      return {
        ...g,
        sizes: g.sizes.map((s, sIdx) => {
          if (sIdx !== sizeIndex) return s;
          return { ...s, price: formatInputNumber(priceStr) };
        }),
      };
    }));
  };

  const handleUpdateVariantOnlyPrice = (sizeIndex: number, priceStr: string) => {
    setSizesOnlyList(prev => prev.map((s, idx) => {
      if (idx !== sizeIndex) return s;
      return { ...s, price: formatInputNumber(priceStr) };
    }));
  };

  const handleAddVariantToBrand = (groupIndex: number, variant: BrandSizeItem) => {
    setBrandGroups(prev => prev.map((g, idx) => {
      if (idx !== groupIndex) return g;
      return {
        ...g,
        sizes: [...g.sizes, variant],
      };
    }));
  };

  const handleRemoveSizeFromBrand = (groupIndex: number, sizeIndex: number) => {
    setBrandGroups(prev => prev.map((g, idx) => {
      if (idx !== groupIndex) return g;
      return {
        ...g,
        sizes: g.sizes.filter((_, sIdx) => sIdx !== sizeIndex),
      };
    }));
  };

  const handleAddVariantOnly = (variant: BrandSizeItem) => {
    setSizesOnlyList(prev => [...prev, variant]);
  };

  const handleRemoveSizeOnly = (sizeIndex: number) => {
    setSizesOnlyList(prev => prev.filter((_, idx) => idx !== sizeIndex));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isUnitIntegerOnly(formData.unit) && !Number.isInteger(Number(formData.lowStockThreshold))) {
        throw new Error(t('storage.integerRequired', 'Quantity for PCS items must be a whole number (no decimals allowed)'));
      }

      const formPayload = new FormData();
      if (formData.itemCode?.trim()) formPayload.append('itemCode', formData.itemCode.trim());
      formPayload.append('nameEn', formData.nameEn);
      formPayload.append('nameAm', formData.nameAm);
      formPayload.append('unit', formData.unit);
      formPayload.append('lowStockThreshold', formData.lowStockThreshold);
      formPayload.append('isBulkTracked', String(formData.isBulkTracked));
      formPayload.append('isStandaloneSellable', String(formData.isStandaloneSellable));

      if (brandGroups.length > 0) {
        // Brands mode — has brand groups
        for (const group of brandGroups) {
          if (group.sizes.length === 0) {
            const num = parseInputNumber(group.basePrice);
            if (!group.basePrice || isNaN(num) || num <= 0) {
              throw new Error(t('materials.brandPriceRequired', {
                brand: group.name,
                defaultValue: `Please enter a valid price or add sizes for brand "${group.name}".`
              }));
            }
          }
        }

        const brandsPayload: { id?: string; name: string; size: string | null; color: string | null; type: string | null; price: number }[] = [];
        for (const group of brandGroups) {
          if (group.sizes.length > 0) {
            for (const s of group.sizes) {
              brandsPayload.push({
                id: s.id,
                name: group.name.trim(),
                size: s.size.trim() || null,
                color: s.color.trim() || null,
                type: s.type.trim() || null,
                price: parseInputNumber(s.price),
              });
            }
          } else {
            brandsPayload.push({
              id: group.baseId,
              name: group.name.trim(),
              size: null,
              color: null,
              type: null,
              price: parseInputNumber(group.basePrice),
            });
          }
        }

        formPayload.append('brands', JSON.stringify(brandsPayload));
        formPayload.append('currentPrice', String(brandsPayload[0]?.price || 0));
      } else if (sizesOnlyList.length > 0) {
        // Sizes-only mode — has size entries under Universal

        const brandsPayload = sizesOnlyList.map(s => ({
          id: s.id,
          name: 'Universal',
          size: s.size.trim() || null,
          color: s.color.trim() || null,
          type: s.type.trim() || null,
          price: parseInputNumber(s.price),
        }));

        formPayload.append('brands', JSON.stringify(brandsPayload));
        formPayload.append('currentPrice', String(brandsPayload[0]?.price || 0));
      } else {
        formPayload.append('brands', JSON.stringify([]));
        if (formData.currentPrice) {
          formPayload.append('currentPrice', String(parseInputNumber(formData.currentPrice)));
        }
      }

      if (file) {
        formPayload.append('image', file);
      }

      if (editingMaterial) {
        await api.patch(`/catalog/materials/${editingMaterial.id}`, formPayload);
      } else {
        await api.post('/catalog/materials', formPayload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success(t('materials.savedSuccessfully', 'Material saved successfully'));
      handleCloseDialog();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || err.message || t('materials.errorSaving', 'Error saving material'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/catalog/materials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success(t('materials.deletedSuccessfully', 'Material deleted successfully'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('materials.errorDeleting', 'Error deleting material'));
    },
  });

  const handleOpenDialog = (material?: Material) => {
    if (material) {
      setEditingMaterial(material);
      setFormData({
        itemCode: material.itemCode || '',
        nameEn: material.nameEn,
        nameAm: material.nameAm,
        unit: material.unit,
        lowStockThreshold: material.lowStockThreshold.toString(),
        currentPrice: material.currentPrice ? formatInputNumber(material.currentPrice.toString()) : '',
        isBulkTracked: material.isBulkTracked,
        isStandaloneSellable: material.isStandaloneSellable,
      });
      const hasBrandList = Array.isArray(material.brands) && material.brands.length > 0;
      const isSizesOnly = hasBrandList && material.brands!.every(b => (b.name.toLowerCase() === 'universal' || b.name.toLowerCase() === 'standard') && Boolean(b.size || b.color || b.type));
      if (isSizesOnly) {
        setSizesOnlyList(
          material.brands!.map(b => ({
            id: b.id,
            size: b.size || '',
            color: b.color || '',
            type: b.type || '',
            price: formatInputNumber(String(b.price)),
          }))
        );
        setBrandGroups([]);
        setShowSizeOnlyInput(true);
      } else if (hasBrandList) {
        const groups: BrandGroup[] = [];
        const map = new Map<string, BrandGroup>();

        for (const b of (material.brands || [])) {
          const bName = (b.name || '').trim();
          if (!map.has(bName)) {
            const newG: BrandGroup = {
              name: bName,
              baseId: undefined,
              basePrice: '',
              sizes: [],
            };
            map.set(bName, newG);
            groups.push(newG);
          }
          const grp = map.get(bName)!;
          if (b.size || b.color || b.type) {
            grp.sizes.push({
              id: b.id,
              size: b.size || '',
              color: b.color || '',
              type: b.type || '',
              price: formatInputNumber(String(b.price)),
            });
          } else {
            grp.baseId = b.id;
            grp.basePrice = formatInputNumber(String(b.price));
          }
        }
        setBrandGroups(groups);
        setSizesOnlyList([]);
        setShowAddBrandInput(true);
      } else {
        setBrandGroups([]);
        setSizesOnlyList([]);
      }
    } else {
      setEditingMaterial(null);
      setFormData({
        itemCode: '',
        nameEn: '',
        nameAm: '',
        unit: 'PCS',
        lowStockThreshold: '10',
        currentPrice: '',
        isBulkTracked: false,
        isStandaloneSellable: false,
      });
      setBrandGroups([]);
      setSizesOnlyList([]);
    }
    setNewBrandName('');
    setShowAddBrandInput(false);
    setShowSizeOnlyInput(false);
    setEditingPriceKey(null);
    setFile(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMaterial(null);
    setNewBrandName('');
    setBrandGroups([]);
    setSizesOnlyList([]);
    setShowAddBrandInput(false);
    setShowSizeOnlyInput(false);
    setEditingPriceKey(null);
  };

  // Filtering
  const filteredMaterials = materials?.filter(m =>
    m.nameEn.toLowerCase().includes(search.toLowerCase()) || 
    m.nameAm.includes(search) ||
    (m.itemCode && m.itemCode.toLowerCase().includes(search.toLowerCase())) ||
    (m.brands && m.brands.some(b => b.name.toLowerCase().includes(search.toLowerCase())))
  ) ?? [];

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredMaterials.length / pageSize));
  const paginatedMaterials = filteredMaterials.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title={t('common.materials', 'Materials Catalog')}
        subtitle={t('materials.subtitle', 'Manage workshop fabrics, leather rolls, vinyls, and hardware inventory items.')}
        badge={materials ? `${materials.length} Items` : undefined}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        refreshTooltip="Refresh materials"
        action={
          <PermissionGate permission="catalog.materials.add">
            <ExecutiveAddButton
              label={t('common.create', 'Create Material')}
              onClick={() => handleOpenDialog()}
            />
          </PermissionGate>
        }
      />

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-center justify-between bg-card">
          <TableSearch 
            value={search} 
            onChange={handleSearchChange} 
            placeholder={t('materials.searchPlaceholder', 'Search materials...')} 
            className="w-full sm:w-[440px] md:w-[500px]"
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {filteredMaterials.length} {t('common.materials', 'Materials')}
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] px-3 py-2.5 whitespace-nowrap">{t('storage.table.image', 'Image')}</TableHead>
              <TableHead className="w-[130px] px-3 py-2.5 whitespace-nowrap">{t('materials.itemCode', 'Item Code')}</TableHead>
              <TableHead className="max-w-[170px] px-3 py-2.5 whitespace-nowrap">{t('materials.nameEn', 'Name (EN)')}</TableHead>
              <TableHead className="max-w-[170px] px-3 py-2.5 whitespace-nowrap">{t('materials.nameAm', 'Name (AM)')}</TableHead>
              <TableHead className="max-w-[240px] px-3 py-2.5 whitespace-nowrap">{t('common.price', 'Price')}</TableHead>
              <TableHead className="text-right w-[80px] px-3 py-2.5 whitespace-nowrap">{t('common.actions', 'Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">{t('common.loading', 'Loading...')}</TableCell>
              </TableRow>
            ) : filteredMaterials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6">{t('storage.noMaterials', 'No materials found.')}</TableCell>
              </TableRow>
            ) : (
              paginatedMaterials.map((mat) => (
                <TableRow key={mat.id}>
                  <TableCell className="w-[50px] px-3 py-2">
                    {mat.imageUrl ? (
                      <LazyImage 
                        src={mat.imageUrl} 
                        alt={mat.nameEn} 
                        className="h-9 w-9 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setPreviewImage(getImageUrl(mat.imageUrl)!)}
                      />
                    ) : (
                      <div className="h-9 w-9 rounded bg-muted flex items-center justify-center">
                        <ImageOff className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="w-[130px] max-w-[130px] px-3 py-2">
                    {mat.itemCode ? (
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleCopyItemCode(mat.itemCode)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleCopyItemCode(mat.itemCode);
                          }
                        }}
                        title={t('materials.clickToCopyCode', 'Click to copy item code')}
                        className="group inline-flex items-center gap-1.5 max-w-full px-2 py-1 rounded bg-muted/80 hover:bg-muted text-foreground border border-border cursor-pointer transition-all active:scale-95 shadow-xs"
                      >
                        <span className="inline-block min-w-0 overflow-x-auto whitespace-nowrap scrollbar-none no-scrollbar font-mono text-xs font-semibold tracking-wide py-0.5">
                          {mat.itemCode}
                        </span>
                        {copiedCode === mat.itemCode ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 animate-in zoom-in-50" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs font-mono">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[170px] px-3 py-2 whitespace-nowrap">
                    <div 
                      className="font-medium whitespace-nowrap overflow-x-auto scrollbar-none no-scrollbar py-0.5 text-xs sm:text-sm" 
                      title={mat.nameEn}
                    >
                      {mat.nameEn}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[170px] px-3 py-2 whitespace-nowrap">
                    <div 
                      className="whitespace-nowrap overflow-x-auto scrollbar-none no-scrollbar py-0.5 text-xs sm:text-sm" 
                      title={mat.nameAm}
                    >
                      {mat.nameAm}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[240px] px-3 py-2 whitespace-nowrap">
                    {mat.brands && mat.brands.length > 0 ? (
                      <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none no-scrollbar py-0.5">
                        {mat.brands.map((b) => (
                          <span
                            key={b.id || `${b.name}-${b.size}-${b.color}-${b.type}`}
                            className="inline-flex shrink-0 items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 whitespace-nowrap"
                          >
                            <span className="font-semibold">{formatBrandSizeLabel(b)}:</span>
                            <span className="font-mono">{formatCurrency(b.price)}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="font-mono font-medium whitespace-nowrap">{mat.currentPrice ? formatCurrency(mat.currentPrice) : '-'}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right w-[80px] px-3 py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <PermissionGate permission="catalog.materials.edit">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(mat)} className="header-btn-secondary h-8 w-8 p-0">
                          <Edit2 className="h-4 w-4 text-blue-500" />
                        </Button>
                      </PermissionGate>
                      <PermissionGate permission="catalog.materials.remove">
                        <Button variant="ghost" size="icon" onClick={() => setMaterialToDelete(mat)} className="header-btn-danger h-8 w-8 p-0">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </PermissionGate>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <TablePagination
          page={currentPage}
          pageSize={pageSize}
          total={filteredMaterials.length}
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

      <ImagePreviewModal isOpen={!!previewImage} onClose={() => setPreviewImage(null)} imageUrl={previewImage} />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="header-modal sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial 
                ? t('materials.editMaterial', 'Edit Material') 
                : t('materials.addMaterial', 'Add Material')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="itemCode">{t('materials.itemCode', 'Item Code')}</Label>
                <span className="text-xs text-muted-foreground">
                  {editingMaterial ? t('common.modifiable', 'Modifiable') : t('common.optional', 'Auto if left blank')}
                </span>
              </div>
              <Input
                id="itemCode"
                className="header-input w-full font-mono uppercase tracking-wider"
                value={formData.itemCode}
                onChange={(e) => setFormData({ ...formData, itemCode: e.target.value.toUpperCase() })}
                placeholder={t('materials.placeholders.itemCode', 'e.g. MAT-001 (auto if empty)')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nameEn">{t('materials.nameEn', 'Name (EN)')}</Label>
                <Input
                  id="nameEn"
                  className="header-input w-full"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  placeholder={t('materials.placeholders.nameEn', 'e.g. Leather')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameAm">{t('materials.nameAm', 'Name (AM)')}</Label>
                <Input
                  id="nameAm"
                  className="header-input w-full"
                  value={formData.nameAm}
                  onChange={(e) => setFormData({ ...formData, nameAm: e.target.value })}
                  placeholder={t('materials.placeholders.nameAm', 'e.g. ሌዘር')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">{t('common.unit', 'Unit')}</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(v) => {
                    const newUnit = v || '';
                    let newThreshold = formData.lowStockThreshold;
                    if (isUnitIntegerOnly(newUnit) && newThreshold.includes('.')) {
                      newThreshold = String(Math.round(Number(newThreshold)) || 10);
                    }
                    setFormData({ ...formData, unit: newUnit, lowStockThreshold: newThreshold });
                  }}
                >
                  <SelectTrigger className="header-input w-full">
                    <SelectValue placeholder={t('materials.selectUnit', 'Select unit')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PCS">{t('units.pcs', 'Pcs')}</SelectItem>
                    <SelectItem value="METERS">{t('units.meters', 'Meters')}</SelectItem>
                    <SelectItem value="LITERS">{t('units.liters', 'Liters')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="threshold">{t('materials.lowStockThreshold', 'Low Stock Alert Threshold')}</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  step={getQuantityStep(formData.unit)}
                  className="header-input w-full"
                  value={formData.lowStockThreshold}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isUnitIntegerOnly(formData.unit) && val.includes('.')) return;
                    setFormData({ ...formData, lowStockThreshold: val });
                  }}
                />
              </div>
            </div>


            {/* ─── Unified Pricing & Variations ─── */}
            <div className="space-y-3 mt-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" />
                {t('materials.pricingMode', 'Pricing & Variations')}
              </Label>

              {/* Base Price — always visible */}
              <div className="space-y-1.5 p-3 rounded-lg border border-border bg-card">
                <Label htmlFor="price" className="text-xs font-semibold">
                  {t('materials.basePrice', 'Base Price')} ({i18n?.language === 'am' ? 'ብር' : 'Birr'})
                </Label>
                <Input
                  id="price"
                  type="text"
                  className="header-input w-full font-mono font-bold"
                  value={formData.currentPrice}
                  onChange={(e) => setFormData({ ...formData, currentPrice: formatInputNumber(e.target.value) })}
                  placeholder="0.00"
                />
                {(brandGroups.length > 0 || sizesOnlyList.length > 0) && (
                  <p className="text-[10.5px] text-muted-foreground">
                    {t('materials.basePriceHint', 'Used as default when no brand/size variant matches.')}
                  </p>
                )}
              </div>

              {/* Action Buttons Row */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddBrandInput(prev => !prev)}
                  className={`flex-1 h-8 text-xs gap-1.5 border transition-all cursor-pointer ${
                    showAddBrandInput
                      ? 'border-amber-500/60 bg-amber-500/15 text-amber-800 dark:text-amber-300 shadow-2xs font-semibold'
                      : 'border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 hover:text-amber-800 dark:hover:text-amber-300'
                  }`}
                >
                  {showAddBrandInput ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  {t('materials.addBrand', 'Add Brand')}
                  {brandGroups.length > 0 && (
                    <span className="ml-1 px-1.5 py-0 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                      {brandGroups.length}
                    </span>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSizeOnlyInput(prev => !prev)}
                  className={`flex-1 h-8 text-xs gap-1.5 border transition-all cursor-pointer ${
                    showSizeOnlyInput
                      ? 'border-amber-500/60 bg-amber-500/15 text-amber-800 dark:text-amber-300 shadow-2xs font-semibold'
                      : 'border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 hover:text-amber-800 dark:hover:text-amber-300'
                  }`}
                >
                  {showSizeOnlyInput ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  {t('materials.addVariant', 'Add Variant')}
                  {sizesOnlyList.length > 0 && (
                    <span className="ml-1 px-1.5 py-0 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                      {sizesOnlyList.length}
                    </span>
                  )}
                </Button>
              </div>

              {/* ─── Brands Section ─── */}
              {(showAddBrandInput || brandGroups.length > 0) && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      {t('materials.brands', 'Brands')}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {brandGroups.length} {brandGroups.length === 1 ? 'brand' : 'brands'}
                    </span>
                  </div>

                  {/* Add Brand Input */}
                  {showAddBrandInput && (
                    <div className="flex items-end gap-2 bg-background/80 p-2.5 rounded-lg border border-border">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs font-semibold">{t('materials.brandName', 'Brand Name')}</Label>
                        <Input
                          placeholder={t('materials.brandPlaceholder', 'e.g. Abro, Flamingo, 3M...')}
                          value={newBrandName}
                          onChange={(e) => setNewBrandName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddBrandGroup();
                            }
                          }}
                          className="h-8 text-xs bg-background px-2.5 py-1 rounded-md"
                          autoFocus
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddBrandGroup}
                        className="h-8 px-3.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white gap-1 shrink-0 rounded-md shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t('common.add', 'Add')}</span>
                      </Button>
                    </div>
                  )}

                  {/* Brand Groups List */}
                  {brandGroups.length > 0 && (
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                      {brandGroups.map((group, gIdx) => (
                        <div
                          key={gIdx}
                          className="rounded-lg border border-border bg-card shadow-2xs overflow-hidden"
                        >
                          {group.sizes.length === 0 ? (
                            /* ── Compact single-line: brand name + add variant popover + price + delete ── */
                            <div className="flex items-center gap-2 p-2 px-2.5">
                              <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-[11px] shrink-0">
                                {gIdx + 1}
                              </span>
                              <span className="font-semibold text-xs text-foreground truncate max-w-[130px] sm:max-w-[180px]" title={group.name}>
                                {group.name}
                              </span>

                              {/* Add Variant Popover */}
                              <AddVariantPopover
                                title={`${t('materials.addVariant', 'Add Variant')} — ${group.name}`}
                                defaultPrice={group.basePrice}
                                existingVariants={group.sizes}
                                onAdd={(v) => handleAddVariantToBrand(gIdx, v)}
                              />

                              {/* Right side: Base price & Delete button on the same line */}
                              <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                {editingPriceKey === `brand-base-${gIdx}` ? (
                                  <>
                                    <div className="relative flex items-center">
                                      <Input
                                        autoFocus
                                        className="h-7 w-20 sm:w-24 text-xs font-mono font-semibold bg-background pr-7 pl-2 py-0.5 rounded-md border-input"
                                        placeholder="0.00"
                                        value={group.basePrice}
                                        onChange={(e) => handleUpdateBrandBasePrice(gIdx, e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            setEditingPriceKey(null);
                                          }
                                        }}
                                        onBlur={() => setEditingPriceKey(null)}
                                      />
                                      <span className="absolute right-1.5 text-[9px] font-bold text-muted-foreground/80 pointer-events-none select-none">
                                        ETB
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        setEditingPriceKey(null);
                                      }}
                                      className="h-7 w-7 flex items-center justify-center text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded transition-colors cursor-pointer"
                                      title="Done"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-300">
                                      {formatCurrency(parseInputNumber(group.basePrice))}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setEditingPriceKey(`brand-base-${gIdx}`)}
                                      className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 rounded transition-colors cursor-pointer"
                                      title={t('common.edit', 'Edit Price')}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBrandGroup(gIdx)}
                                  className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0 cursor-pointer"
                                  title={t('materials.deleteBrand', 'Delete Brand')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* ── Has variants: header row with brand name + add variant popover + delete ── */
                            <div>
                              <div className="flex items-center justify-between p-2 px-2.5 border-b border-border/40">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-[11px] shrink-0">
                                    {gIdx + 1}
                                  </span>
                                  <span className="font-semibold text-xs text-foreground truncate max-w-[130px] sm:max-w-[180px]" title={group.name}>
                                    {group.name}
                                  </span>
                                  <span className="text-[10px] h-5 px-1.5 flex items-center rounded-full bg-muted text-muted-foreground font-semibold border border-border">
                                    {group.sizes.length} {t('materials.variants', 'variants')}
                                  </span>
                                  {/* Add Variant Popover */}
                                  <AddVariantPopover
                                    title={`${t('materials.addVariant', 'Add Variant')} — ${group.name}`}
                                    defaultPrice={group.sizes[0]?.price || group.basePrice}
                                    existingVariants={group.sizes}
                                    onAdd={(v) => handleAddVariantToBrand(gIdx, v)}
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBrandGroup(gIdx)}
                                  className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0 cursor-pointer"
                                  title={t('materials.deleteBrand', 'Delete Brand')}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Variants list */}
                              <div className="p-2 px-2.5 space-y-1">
                                {group.sizes.map((s, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="flex items-center justify-between py-1 px-2 rounded-md bg-muted/30 hover:bg-muted/60 border border-border/40 text-xs transition-colors"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                      <span className="font-medium text-foreground text-xs">
                                        {[s.size, s.color, s.type].filter(Boolean).join(' • ') || '—'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {editingPriceKey === `brand-variant-${gIdx}-${sIdx}` ? (
                                        <>
                                          <div className="relative flex items-center">
                                            <Input
                                              autoFocus
                                              className="h-7 w-20 sm:w-24 text-xs font-mono font-semibold bg-background pr-7 pl-2 py-0.5 rounded-md border-input"
                                              placeholder="0.00"
                                              value={s.price}
                                              onChange={(e) => handleUpdateBrandVariantPrice(gIdx, sIdx, e.target.value)}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                  e.preventDefault();
                                                  setEditingPriceKey(null);
                                                }
                                              }}
                                              onBlur={() => setEditingPriceKey(null)}
                                            />
                                            <span className="absolute right-1.5 text-[9px] font-bold text-muted-foreground/80 pointer-events-none select-none">
                                              ETB
                                            </span>
                                          </div>
                                          <button
                                            type="button"
                                            onMouseDown={(e) => {
                                              e.preventDefault();
                                              setEditingPriceKey(null);
                                            }}
                                            className="h-7 w-7 flex items-center justify-center text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded transition-colors cursor-pointer"
                                            title="Done"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-300">
                                            {formatCurrency(parseInputNumber(s.price))}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => setEditingPriceKey(`brand-variant-${gIdx}-${sIdx}`)}
                                            className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 rounded transition-colors cursor-pointer"
                                            title={t('common.edit', 'Edit Price')}
                                          >
                                            <Pencil className="w-3 h-3" />
                                          </button>
                                        </>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveSizeFromBrand(gIdx, sIdx)}
                                        className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                                        title="Remove variant"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Variants Only Section (Universal brand) ─── */}
              {(showSizeOnlyInput || sizesOnlyList.length > 0) && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5" />
                        {t('materials.variantsNoBrand', 'Variants (No Brand)')}
                      </span>
                      {sizesOnlyList.length > 0 && (
                        <span className="text-[10px] h-5 px-1.5 flex items-center rounded-full bg-muted text-muted-foreground font-semibold border border-border">
                          {sizesOnlyList.length} {sizesOnlyList.length === 1 ? t('materials.variant', 'variant') : t('materials.variants', 'variants')}
                        </span>
                      )}
                      <AddVariantPopover
                        title={t('materials.variantsNoBrand', 'Variants (No Brand)')}
                        defaultPrice={formData.currentPrice}
                        existingVariants={sizesOnlyList}
                        onAdd={handleAddVariantOnly}
                      />
                    </div>
                  </div>

                  {/* Added variants list */}
                  {sizesOnlyList.length > 0 ? (
                    <div className="space-y-1 max-h-[180px] overflow-y-auto pr-1">
                      {sizesOnlyList.map((s, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1 px-2.5 rounded-md bg-background border border-border text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-[10px] shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-foreground truncate">
                              {[s.size, s.color, s.type].filter(Boolean).join(' • ') || '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {editingPriceKey === `variant-only-${idx}` ? (
                              <>
                                <div className="relative flex items-center">
                                  <Input
                                    autoFocus
                                    className="h-7 w-20 sm:w-24 text-xs font-mono font-semibold bg-background pr-7 pl-2 py-0.5 rounded-md border-input"
                                    placeholder="0.00"
                                    value={s.price}
                                    onChange={(e) => handleUpdateVariantOnlyPrice(idx, e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        setEditingPriceKey(null);
                                      }
                                    }}
                                    onBlur={() => setEditingPriceKey(null)}
                                  />
                                  <span className="absolute right-1.5 text-[9px] font-bold text-muted-foreground/80 pointer-events-none select-none">
                                    ETB
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    setEditingPriceKey(null);
                                  }}
                                  className="h-7 w-7 flex items-center justify-center text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded transition-colors cursor-pointer"
                                  title="Done"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-300">
                                  {formatCurrency(parseInputNumber(s.price))}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingPriceKey(`variant-only-${idx}`)}
                                  className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 rounded transition-colors cursor-pointer"
                                  title={t('common.edit', 'Edit Price')}
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveSizeOnly(idx)}
                              className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-1">
                      {t('materials.noVariantsYet', 'No variants added yet. Click "+ Add Variant" above to add one.')}
                    </p>
                  )}
                </div>
              )}
            </div>


            <div className="flex items-center justify-between rounded-lg border border-border p-3 mt-2 bg-card">
              <div className="space-y-0.5">
                <Label htmlFor="bulk">{t('materials.bulkTrackedQ', 'Bulk Tracked?')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('materials.bulkTrackedDesc', 'Track inventory in bulk units rather than individually.')}
                </p>
              </div>
              <Switch
                id="bulk"
                checked={formData.isBulkTracked}
                onCheckedChange={(c) => setFormData({ ...formData, isBulkTracked: c })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3 bg-card">
              <div className="space-y-0.5">
                <Label htmlFor="standalone">{t('materials.standaloneSaleQ', 'Standalone Sale?')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('materials.standaloneSaleDesc', 'Can this material be sold directly to customers?')}
                </p>
              </div>
              <Switch
                id="standalone"
                checked={formData.isStandaloneSellable}
                onCheckedChange={(c) => setFormData({ ...formData, isStandaloneSellable: c })}
              />
            </div>
            
            <div className="space-y-2 mt-2">
              <Label htmlFor="image">{t('materials.materialImage', 'Material Image')}</Label>
              <Input
                id="image"
                type="file"
                className="header-input w-full cursor-pointer p-0 file:h-full file:bg-muted file:border-0 file:mr-4 file:px-4"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog} className="header-btn-secondary">{t('common.cancel', 'Cancel')}</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="header-btn-primary">
              {saveMutation.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!materialToDelete}
        onClose={() => setMaterialToDelete(null)}
        onConfirm={() => {
          if (materialToDelete) deleteMutation.mutate(materialToDelete.id);
        }}
        title={t('materials.deleteTitle', 'Delete Material')}
        message={
          <>
            {i18n?.language === 'am' 
              ? `${materialToDelete?.nameAm || materialToDelete?.nameEn} መሰረዝ እንደሚፈልጉ እርግጠኛ ነዎት? ይህ እርምጃ ሊቀለበስ አይችልም።`
              : `Are you sure you want to delete ${materialToDelete?.nameEn}? This action cannot be undone.`}
          </>
        }
        type="danger"
        confirmText={t('common.delete', 'Delete')}
      />
    </div>
  );
}
