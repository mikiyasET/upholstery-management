import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Plus, Minus, Trash2, ShoppingCart, User, Phone, CreditCard, Search, FileText, ImageOff, CheckCircle2, AlertTriangle, Tag, ArrowRight } from 'lucide-react';
import { ModernInput } from '../components/ui/modern-input';
import { ModernSelect } from '../components/ui/modern-select';
import { toast } from 'sonner';
import { formatCurrency, formatPaymentMethod, isUnitIntegerOnly, getMaterialUnallocatedStock, formatBrandSizeLabel, formatAppDate } from '../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Printer, History } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { printDirectSaleReceipt } from '../lib/receipt-printer';
import { PermissionGate } from '../components/PermissionGate';
import { LazyImage } from '../components/common/LazyImage';
import ConfirmDialog from '../components/ConfirmDialog';

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
  id?: string;
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
  unit?: string;
  currentPrice: string;
  isStandaloneSellable: boolean;
  imageUrl?: string;
  brands?: MaterialBrand[];
  materialStocks?: {
    storeId: string;
    quantity: string | number;
    store: {
      type: 'MAIN' | 'MINI';
    };
  }[];
};

type CartItem = {
  key: string;
  material: Material;
  brand?: { id?: string; name: string; size?: string | null; color?: string | null; type?: string | null; price: number };
  unitPrice: number;
  quantity: number;
};

type PaymentEntry = {
  id: number;
  method: string;
  amount: string;
  referenceNumber: string;
};

export default function DirectSales() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = searchParams.get('editId');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [brandPickerMaterial, setBrandPickerMaterial] = useState<Material | null>(null);

  // Tax toggle
  const [taxEnabled, setTaxEnabled] = useState(localStorage.getItem('defaultVatEnabled') === 'true');

  // Multi-payment
  const [payments, setPayments] = useState<PaymentEntry[]>([
    { id: Date.now(), method: 'CASH', amount: '', referenceNumber: '' }
  ]);

  // Confirmation & Receipt Modals
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<any | null>(null);
  
  // Animation state
  const [isBouncing, setIsBouncing] = useState(false);

  // VAT Long Press Logic
  const [isVatConfirmOpen, setIsVatConfirmOpen] = useState(false);
  const vatPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleVatPointerDown = () => {
    vatPressTimer.current = setTimeout(() => {
      setIsVatConfirmOpen(true);
    }, 5000);
  };

  const handleVatPointerUp = () => {
    if (vatPressTimer.current) {
      clearTimeout(vatPressTimer.current);
    }
  };

  const handleVatConfirm = () => {
    localStorage.setItem('defaultVatEnabled', taxEnabled.toString());
    if (taxEnabled) {
      toast.success(t('directSales.defaultVatEnabled', 'Default VAT Enabled'));
    } else {
      toast.success(t('directSales.defaultVatDisabled', 'Default VAT Disabled'));
    }
    setIsVatConfirmOpen(false);
  };

  const { data: materials, isLoading } = useQuery<Material[]>({
    queryKey: ['materials', 'mini'],
    queryFn: async () => {
      const res = await api.get('/catalog/materials');
      return res.data.filter((m: any) => m.isStandaloneSellable);
    },
  });

  const { data: editSaleData } = useQuery({
    queryKey: ['direct-sale', editId],
    queryFn: async () => {
      const res = await api.get(`/direct-sales/${editId}`);
      return res.data;
    },
    enabled: !!editId,
  });

  useEffect(() => {
    if (editSaleData && materials) {
      setCustomerName(editSaleData.customerName || '');
      setCustomerPhone(editSaleData.customerPhone || '');
      setTaxEnabled(Number(editSaleData.taxAmount) > 0);

      // Reconstruct cart
      const newCart: CartItem[] = [];
      editSaleData.lines?.forEach((line: any) => {
        const mat = materials.find(m => m.id === line.materialId);
        if (mat) {
          const brand = line.brandName
            ? { id: line.materialBrandId || undefined, name: line.brandName, size: line.sizeName || null, color: line.colorName || null, type: line.typeName || null, price: Number(line.priceAtSaleTime) }
            : undefined;
          const key = `${mat.id}-${brand?.name || 'standard'}`;
          newCart.push({
            key,
            material: mat,
            brand,
            unitPrice: Number(line.priceAtSaleTime),
            quantity: line.quantity,
          });
        }
      });
      setCart(newCart);

      // Reconstruct payments
      if (editSaleData.payments && editSaleData.payments.length > 0) {
        setPayments(editSaleData.payments.map((p: any) => ({
          id: p.id,
          method: p.method,
          amount: p.amount.toString(),
          referenceNumber: p.methodDetails || '',
        })));
      }
    }
  }, [editSaleData, materials]);

  const getLocName = (item: any) =>
    i18n?.language === 'am' && item?.nameAm ? item.nameAm : (item?.nameEn || t('common.unknown', 'Unknown Item'));

  const filteredMaterials = (materials || []).filter(m => 
    (m.nameEn && m.nameEn.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (m.nameAm && m.nameAm.includes(searchTerm)) ||
    (m.itemCode && m.itemCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
    getLocName(m).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mini Store Stock Helper
  const getMiniStoreStock = (m: Material) => {
    const miniStock = m.materialStocks?.find(s => s.store?.type === 'MINI');
    return miniStock ? Number(miniStock.quantity) : 0;
  };

  const getBrandMiniStock = (brand: MaterialBrand) => {
    const stock = brand.brandStocks?.find(s => s.store?.type === 'MINI');
    return stock ? Number(stock.quantity) : 0;
  };

  const getCartQuantityForMaterial = (materialId: string, currentCart: CartItem[] = cart) => {
    return currentCart
      .filter(item => item.material.id === materialId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const navigateToStorageAllocation = (material: Material) => {
    const searchTarget = (i18n.language === 'am' && material.nameAm) ? material.nameAm : (material.nameEn || material.itemCode || '');
    toast.info(
      t('storage.redirectingToAllocate', 'Redirecting to Stock to allocate "{{name}}"...', {
        name: getLocName(material),
      })
    );
    navigate(`/storage?search=${encodeURIComponent(searchTarget)}&store=MINI&allocate=true&materialId=${material.id}`);
  };

  // Cart operations
  const handleMaterialCardClick = (material: Material) => {
    const unallocated = getMaterialUnallocatedStock(material, 'MINI');
    if (material.brands && material.brands.length > 0 && unallocated > 0) {
      toast.error(t('storage.unallocatedSaleBlocked', 'Cannot sell "{{name}}": It has {{unallocated}} unallocated stock in Mini Store. It must be allocated in Storage before selling.', {
        name: getLocName(material),
        unallocated: `${unallocated} ${material.unit || ''}`,
      }), {
        action: {
          label: t('storage.allocate', 'Allocate'),
          onClick: () => navigateToStorageAllocation(material),
        },
      });
      navigateToStorageAllocation(material);
      return;
    }

    const currentStock = getMiniStoreStock(material);
    if (currentStock <= 0) {
      toast.error(t('storage.outOfStock', 'This item is out of stock in Mini Store'));
      return;
    }

    if (material.brands && material.brands.length > 0) {
      setBrandPickerMaterial(material);
    } else {
      addItemToCart(material, undefined);
    }
  };

  const addItemToCart = (material: Material, brand?: { id?: string; name: string; size?: string | null; color?: string | null; type?: string | null; price: number }) => {
    if (brand && material.brands) {
      const fullBrand = material.brands.find(b => b.id === brand.id || (b.name === brand.name && (b.size || null) === (brand.size || null) && (b.color || null) === (brand.color || null) && (b.type || null) === (brand.type || null)));
      if (fullBrand) {
        const bStock = getBrandMiniStock(fullBrand);
        const brandKey = `${material.id}-${brand.id || `${brand.name}-${brand.size || 'std'}-${brand.color || ''}-${brand.type || ''}`}`;
        const inCartForBrand = cart.find(i => i.key === brandKey)?.quantity || 0;
        const brandLabel = formatBrandSizeLabel(brand);
        if (inCartForBrand >= bStock) {
          toast.error(`${brandLabel}: ${t('storage.outOfStock', 'Cannot add more')} (${t('storage.availableStock', 'Only')} ${bStock} ${t('storage.availableStock', 'available')})`);
          return;
        }
      }
    }

    const currentStock = getMiniStoreStock(material);
    const currentTotalInCart = getCartQuantityForMaterial(material.id);
    if (currentTotalInCart >= currentStock) {
      toast.error(`${t('storage.outOfStock', 'Cannot add more')}: ${t('storage.availableStock', 'Only')} ${currentStock} ${t('storage.availableStock', 'available')}`);
      return;
    }

    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 300);

    const key = `${material.id}-${brand?.id || `${brand?.name || 'standard'}-${brand?.size || 'std'}-${brand?.color || ''}-${brand?.type || ''}`}`;
    const unitPrice = brand ? Number(brand.price) : Number(material.currentPrice || 0);

    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.key === key);
      if (existingIndex >= 0) {
        return prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { key, material, brand, unitPrice, quantity: 1 }];
    });

    if (brandPickerMaterial) {
      setBrandPickerMaterial(null);
    }
  };

  const updateQuantity = (key: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(key);
      return;
    }
    const item = cart.find(i => i.key === key);
    if (!item) return;

    if (quantity > item.quantity) {
      if (item.brand && item.material.brands) {
        const fullBrand = item.material.brands.find(b => b.id === item.brand?.id || (b.name === item.brand?.name && (b.size || null) === (item.brand?.size || null) && (b.color || null) === (item.brand?.color || null) && (b.type || null) === (item.brand?.type || null)));
        if (fullBrand) {
          const bStock = getBrandMiniStock(fullBrand);
          const brandLabel = formatBrandSizeLabel(item.brand);
          if (quantity > bStock) {
            toast.error(`${brandLabel}: ${t('storage.availableStock', 'Only')} ${bStock} ${t('storage.availableStock', 'available')}`);
            return;
          }
        }
      }

      const currentStock = getMiniStoreStock(item.material);
      const otherQty = cart
        .filter(i => i.material.id === item.material.id && i.key !== key)
        .reduce((s, i) => s + i.quantity, 0);

      if (otherQty + quantity > currentStock) {
        toast.error(`${t('storage.outOfStock', 'Cannot set quantity to')} ${quantity}: ${t('storage.availableStock', 'Only')} ${Math.max(0, currentStock - otherQty)} ${t('storage.availableStock', 'more available')}`);
        return;
      }
    }

    setCart(prev =>
      prev.map(i => (i.key === key ? { ...i, quantity } : i))
    );
  };

  const removeFromCart = (key: string) => {
    setCart(prev => prev.filter(item => item.key !== key));
  };

  // Calculations
  const totalItems = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity);
    }, 0);
  }, [cart]);

  const taxAmount = taxEnabled ? subtotal * 0.15 : 0;
  const grandTotal = subtotal + taxAmount;

  // Payment helpers
  const addPaymentSplit = () => {
    setPayments(prev => [...prev, { id: Date.now(), method: 'CASH', amount: '', referenceNumber: '' }]);
  };

  const removePaymentSplit = (id: number) => {
    if (payments.length <= 1) return;
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const updatePayment = (id: number, field: keyof PaymentEntry, value: string) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const totalPaid = useMemo(() => {
    return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const remaining = grandTotal - totalPaid;

  const handleInitiateCheckout = () => {
    if (cart.length === 0) {
      toast.error(t('directSales.cartEmpty', 'Cart is empty. Please add items to sell.'));
      return;
    }

    // Integer validation for PCS items
    for (const item of cart) {
      if (isUnitIntegerOnly(item.material.unit) && !Number.isInteger(item.quantity)) {
        toast.error(t('storage.integerRequired', 'Quantity for PCS items must be a whole number (no decimals allowed)'));
        return;
      }
    }

    // Allocation validation for branded items
    for (const item of cart) {
      const unallocated = getMaterialUnallocatedStock(item.material, 'MINI');
      if (item.material.brands && item.material.brands.length > 0 && unallocated > 0) {
        toast.error(t('storage.unallocatedSaleBlocked', 'Cannot sell "{{name}}": It has {{unallocated}} unallocated stock in Mini Store. It must be allocated in Storage before selling.', {
          name: getLocName(item.material),
          unallocated: `${unallocated} ${item.material.unit || ''}`,
        }), {
          action: {
            label: t('storage.allocate', 'Allocate'),
            onClick: () => navigateToStorageAllocation(item.material),
          },
        });
        return;
      }
    }

    // Stock validation
    for (const item of cart) {
      const stock = getMiniStoreStock(item.material);
      if (item.quantity > stock) {
        toast.error(`${getLocName(item.material)}: ${t('storage.outOfStock', 'Insufficient stock')} (${stock} ${t('storage.availableStock', 'available')})`);
        return;
      }
    }

    const finalPayments = payments.map(p => ({
      method: p.method,
      amount: (Number(p.amount) || 0) === 0 && payments.length === 1 ? grandTotal : Number(p.amount),
      referenceNumber: p.referenceNumber || undefined,
    }));

    const totalPaying = finalPayments.reduce((s, p) => s + p.amount, 0);
    if (totalPaying <= 0) {
      toast.error(t('orders.create.validation.paymentGreaterThanZero', 'Payment amount must be greater than 0'));
      return;
    }

    setIsConfirmOpen(true);
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error('Cart is empty');

      // If single payment with no amount entered, auto-fill with grandTotal
      const finalPayments = payments.map(p => ({
        method: p.method,
        amount: (Number(p.amount) || 0) === 0 && payments.length === 1 ? grandTotal : Number(p.amount),
        referenceNumber: p.referenceNumber || undefined,
      }));

      const totalPaying = finalPayments.reduce((s, p) => s + p.amount, 0);
      if (totalPaying <= 0) throw new Error('Payment amount must be greater than 0');

      const payload = {
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        items: cart.map(item => ({
          materialId: item.material.id,
          materialBrandId: item.brand?.id,
          brandName: item.brand?.name,
          sizeName: item.brand?.size || null,
          colorName: item.brand?.color || null,
          typeName: item.brand?.type || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: 0,
        })),
        payments: finalPayments,
        additionalDiscount: 0,
        taxEnabled,
        taxRate: 0.15,
      };

      if (editId) {
        const res = await api.put(`/direct-sales/${editId}`, payload);
        return res.data;
      } else {
        const res = await api.post('/direct-sales', payload);
        return res.data;
      }
    },
    onSuccess: (data) => {
      setIsConfirmOpen(false);
      toast.success(editId ? t('directSales.saleUpdated', 'Sale updated successfully') : t('directSales.saleCompleted', 'Sale completed successfully'));
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setPayments([{ id: Date.now(), method: 'CASH', amount: '', referenceNumber: '' }]);
      setTaxEnabled(true);
      if (editId) {
        navigate('/direct-sales/history');
      } else {
        setCompletedSale(data);
      }
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      queryClient.invalidateQueries({ queryKey: ['direct-sales'] });
    },
    onError: (err: any) => {
      setIsConfirmOpen(false);
      toast.error(err.response?.data?.error?.message || err.message || t('directSales.errorProcessingSale', 'Error processing sale'));
    },
  });

  return (
    <div className="flex flex-col md:flex-row gap-6 animate-in fade-in duration-300 md:h-[calc(100vh-8rem)] min-h-[calc(100vh-8rem)] relative">
      {/* Left side: Products */}
      <div className="flex-1 flex flex-col bg-card border rounded-lg overflow-hidden shadow-sm min-h-[500px] md:min-h-0 md:h-auto">
        <div className="p-4 border-b bg-muted/30 flex items-end gap-3">
          <div className="flex-1">
            <ModernInput
              inputSize="sm"
              label={t("directSales.searchCatalog", "Search Catalog")}
              icon={Search}
              placeholder={t("orders.create.placeholder.material", "Search items...")}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <PermissionGate permission="directSales.history">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9 shrink-0 border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:text-amber-500" 
              title={t("directSales.viewHistory", "View History")} 
              onClick={() => navigate('/direct-sales/history')}
            >
              <History className="h-4 w-4" />
            </Button>
          </PermissionGate>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">{t('common.loading', 'Loading items...')}</div>
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">{t('directSales.noItems', 'No standalone items available.')}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMaterials.map(m => {
                const stock = getMiniStoreStock(m);
                const unallocated = getMaterialUnallocatedStock(m, 'MINI');
                const needsAllocation = Boolean(m.brands && m.brands.length > 0 && unallocated > 0);
                const isOutOfStock = stock <= 0;
                
                return (
                <div
                  key={m.id}
                  onClick={() => !isOutOfStock && handleMaterialCardClick(m)}
                  className={`border border-border rounded-lg overflow-hidden h-40 flex flex-col group relative bg-card ${
                    isOutOfStock 
                      ? 'opacity-50 cursor-not-allowed grayscale' 
                      : needsAllocation
                      ? 'border-amber-500/50 hover:border-amber-500 hover:shadow-md cursor-pointer'
                      : 'cursor-pointer hover:border-amber-500 hover:shadow-md transition-all'
                  }`}
                >
                  {m.imageUrl ? (
                    <>
                      <div className="flex-1 overflow-hidden bg-muted relative flex items-center justify-center">
                        {isOutOfStock ? (
                          /* On out of stock, fill the entire space with the material image as cover */
                          <LazyImage
                            src={m.imageUrl}
                            alt={getLocName(m)}
                            wrapperClassName="w-full h-full"
                            imgClassName="w-full h-full object-cover"
                          />
                        ) : (
                          <>
                            {/* Blurred background of the same image covering unfilled space (subtle blur) */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                              <LazyImage
                                src={m.imageUrl}
                                alt=""
                                fallback={<div className="w-full h-full bg-muted" />}
                                wrapperClassName="w-full h-full bg-transparent dark:bg-transparent"
                                imgClassName="w-full h-full object-cover blur-[1px] scale-[1.02] opacity-80 dark:opacity-70"
                              />
                            </div>
                            {/* Crisp foreground image cleanly contained */}
                            <LazyImage
                              src={m.imageUrl}
                              alt={getLocName(m)}
                              wrapperClassName="w-full h-full bg-transparent dark:bg-transparent flex items-center justify-center relative z-10"
                              imgClassName="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                            />
                          </>
                        )}
                        <div className="absolute top-1 right-1 z-20 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium backdrop-blur-sm shadow-sm">
                          {t('common.stock', 'Stock')}: {stock}
                        </div>
                      </div>
                      <div className="p-2.5 border-t border-border bg-card">
                        <h4 className="font-semibold text-foreground text-xs line-clamp-1">{getLocName(m)}</h4>
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <div className="font-bold text-amber-500 text-xs">
                            {m.brands && m.brands.length > 0 
                              ? formatCurrency(Math.min(...m.brands.map(b => Number(b.price))))
                              : formatCurrency(m.currentPrice)
                            }
                          </div>
                          {m.brands && m.brands.length > 0 && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                              {m.brands.length} {t('materials.brands', 'Brands')}
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className={`flex-1 flex flex-col items-center justify-center p-3 bg-muted/30 ${!isOutOfStock && 'group-hover:bg-amber-500/5'} relative`}>
                      <div className="absolute top-1 right-1 bg-muted-foreground/20 text-foreground text-[10px] px-1.5 py-0.5 rounded font-medium">
                        {t('common.stock', 'Stock')}: {stock}
                      </div>
                      <ImageOff className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <h4 className="font-semibold text-foreground text-sm text-center line-clamp-2">
                        {getLocName(m)}
                      </h4>
                      <div className="flex items-center justify-between gap-1 mt-1.5 w-full px-1">
                        <div className="font-bold text-amber-500 text-xs">
                          {m.brands && m.brands.length > 0 
                            ? formatCurrency(Math.min(...m.brands.map(b => Number(b.price))))
                            : formatCurrency(m.currentPrice)
                          }
                        </div>
                        {m.brands && m.brands.length > 0 && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                            {m.brands.length} {t('materials.brands', 'Brands')}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Out of stock overlay (z-30 ensures it displays over image & stock pill) */}
                  {isOutOfStock && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/10 pointer-events-none">
                      <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg transform -rotate-12">
                        {t('common.outOfStock', 'Out of Stock')}
                      </div>
                    </div>
                  )}

                  {!isOutOfStock && needsAllocation && (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToStorageAllocation(m);
                      }}
                      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-background/90 dark:bg-zinc-950/92 backdrop-blur-xs p-2 text-center cursor-pointer transition-all hover:bg-background/95 dark:hover:bg-zinc-950/96 group/alloc border border-amber-500/40 rounded-lg select-none"
                    >
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold tracking-tight whitespace-nowrap shadow-2xs">
                        <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-amber-500" />
                        <span>{t('storage.needsAllocation', 'Needs Allocation')}</span>
                      </span>

                      <span className="text-[10px] text-muted-foreground font-medium mt-1.5 whitespace-nowrap">
                        <span className="font-bold text-amber-600 dark:text-amber-400">{unallocated} {m.unit || ''}</span> {t('storage.unallocatedStock', 'unallocated')}
                      </span>

                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 group-hover/alloc:underline mt-1 whitespace-nowrap">
                        <span>{t('storage.allocateInStock', 'Allocate in Stock')}</span>
                        <ArrowRight className="w-2.5 h-2.5 shrink-0 group-hover/alloc:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  )}
                </div>
              )})}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Cart */}
      <div id="cart-section" className="w-full md:w-[320px] lg:w-[420px] flex flex-col bg-card border border-border rounded-lg shadow-sm overflow-hidden flex-shrink-0 min-h-[500px] md:min-h-0 md:h-auto scroll-mt-6">
        <div className="p-4 border-b border-amber-600/30 bg-amber-600 text-white flex justify-between items-center shadow-sm">
          <h2 className="font-bold flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" /> {t('directSales.currentSale', 'Current Sale')}
          </h2>
          <span className="bg-white/20 px-2 py-0.5 rounded text-sm font-semibold">{cart.length} {t('common.items', 'items')}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-4 bg-muted/10 p-3.5 rounded-xl border border-border/50">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80 mb-2">
              <User className="w-4 h-4 text-amber-500" />
              {t('common.customerDetails', 'Customer Details')}
              <span className="text-[10px] font-medium text-muted-foreground ml-auto bg-muted px-2 py-0.5 rounded-full uppercase tracking-wider">{t('common.optional', 'Optional')}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ModernInput
                inputSize="sm"
                icon={User}
                placeholder={t("customers.table.customer", "John Doe")}
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
              <ModernInput
                inputSize="sm"
                icon={Phone}
                placeholder={t("customers.table.phone", "0911...")}
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            {cart.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 flex flex-col items-center">
                <ShoppingCart className="w-12 h-12 mb-2 opacity-20" />
                <p>{t('directSales.cartEmpty', 'Cart is empty')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.key} className="flex justify-between items-start text-sm">
                    <div className="flex-1 pr-2">
                      <div className="font-medium line-clamp-1 flex items-center gap-1.5 flex-wrap">
                        <span>{getLocName(item.material)}</span>
                        {item.brand && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30">
                            {formatBrandSizeLabel(item.brand)}
                          </span>
                        )}
                      </div>
                      <div className="text-muted-foreground text-xs">{formatCurrency(item.unitPrice)}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={() => {
                          const isInt = isUnitIntegerOnly(item.material.unit);
                          const next = isInt 
                            ? Math.max(0, Math.floor(item.quantity) - 1)
                            : Math.max(0, Math.round((item.quantity - 1) * 100) / 100);
                          updateQuantity(item.key, next);
                        }}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <input
                        type="text"
                        className="w-12 h-6 text-center bg-transparent border border-input rounded text-xs font-mono font-medium focus:outline-none"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = e.target.value;
                          const isInt = isUnitIntegerOnly(item.material.unit);
                          const regex = isInt ? /^\d*$/ : /^\d*\.?\d*$/;
                          if (regex.test(val)) {
                            updateQuantity(item.key, Number(val) || 0);
                          }
                        }}
                      />
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-6 w-6" 
                        onClick={() => {
                          const isInt = isUnitIntegerOnly(item.material.unit);
                          const next = isInt 
                            ? item.quantity + 1
                            : Math.round((item.quantity + 1) * 100) / 100;
                          updateQuantity(item.key, next);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeFromCart(item.key)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-3 border-t bg-muted/10 flex flex-col gap-3">
          {/* Payments Header & Tax Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">{t('common.payments', 'Payments')}</span>
              <div 
                className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-md border border-border/50 select-none cursor-pointer"
                onPointerDown={handleVatPointerDown}
                onPointerUp={handleVatPointerUp}
                onPointerLeave={handleVatPointerUp}
                onPointerCancel={handleVatPointerUp}
              >
                <span className="text-[10px] font-semibold text-foreground/80 uppercase tracking-wide pointer-events-none">{t('common.vat', 'VAT')}</span>
                <Switch checked={taxEnabled} onCheckedChange={setTaxEnabled} className="scale-75 origin-left pointer-events-auto" />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white hover:border-blue-500 px-3 font-medium transition-all"
              onClick={addPaymentSplit}
            >
              <Plus className="h-3 w-3 mr-1" /> {t('directSales.split', 'Split')}
            </Button>
          </div>

          {/* Multi-Payment Section */}
          <div className="space-y-2 flex-1 overflow-y-auto max-h-[25vh] custom-scrollbar pr-1">
            {payments.map((payment) => (
              <div key={payment.id} className="bg-muted/20 p-2 rounded-lg border border-border/50 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex-[2]">
                    <ModernSelect
                      inputSize="sm"
                      icon={CreditCard}
                      placeholder={t("common.method", "Method")}
                      value={payment.method}
                      onValueChange={v => updatePayment(payment.id, 'method', v)}
                      options={[
                        { value: 'CASH', label: t('payment.cash', 'Cash') },
                        { value: 'BANK_TRANSFER', label: t('payment.bank', 'Bank Transfer') },
                        { value: 'MOBILE_MONEY', label: t('payment.mobile', 'Mobile Money') },
                        { value: 'OTHER', label: t('payment.other', 'Other') },
                      ]}
                    />
                  </div>
                  <div className="flex-[1.5]">
                    <ModernInput
                      inputSize="sm"
                      placeholder={payments.length === 1 ? formatCurrency(grandTotal) : t('common.amount', 'Amount')}
                      type="number"
                      value={payment.amount}
                      onChange={e => updatePayment(payment.id, 'amount', e.target.value)}
                    />
                  </div>
                  {payments.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                      onClick={() => removePaymentSplit(payment.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                {payment.method !== 'CASH' && (
                  <ModernInput
                    inputSize="sm"
                    icon={FileText}
                    placeholder={t("orders.referenceNumber", "Ref No...")}
                    value={payment.referenceNumber}
                    onChange={e => updatePayment(payment.id, 'referenceNumber', e.target.value)}
                  />
                )}
              </div>
            ))}

            {/* Payment summary when split */}
            {payments.length > 1 && (
              <div className="flex justify-between text-xs px-1 pt-1">
                <span className="text-muted-foreground">{t('directSales.paidSoFar', 'Paid so far')}</span>
                <span className={remaining > 0.01 ? 'text-amber-500 font-semibold' : 'text-green-500 font-semibold'}>
                  {formatCurrency(totalPaid)} / {formatCurrency(grandTotal)}
                </span>
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="flex items-end justify-between pt-2 border-t">
            <div className="text-[11px] space-y-0.5 text-muted-foreground">
              <div>{t('orders.detail.subtotal')}: <span className="text-foreground font-medium">{formatCurrency(subtotal)}</span></div>
              <div>{t('common.vat', 'VAT')} {taxEnabled ? '(15%)' : `(${t('common.off', 'Off')})`}: <span className="text-foreground font-medium">{taxEnabled ? formatCurrency(taxAmount) : '-'}</span></div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">{t('common.total', 'Total')}</div>
              <div className="text-xl font-bold leading-none text-gray-900 dark:text-white">{formatCurrency(grandTotal)}</div>
            </div>
          </div>

              <Button 
                className="w-full h-12 text-lg font-semibold bg-amber-600 text-white hover:bg-amber-700 shadow-sm" 
                disabled={cart.length === 0 || checkoutMutation.isPending}
                onClick={handleInitiateCheckout}
              >
                {checkoutMutation.isPending ? t('common.processing', 'Processing...') : (editId ? t('directSales.updateSale', 'Update Sale & Payments') : t('directSales.completeSale', 'Complete Sale'))}
              </Button>
        </div>
      </div>

      {/* Checkout Confirmation Modal */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-[480px] bg-card text-card-foreground border-border">
          <DialogHeader className="pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {editId ? t('directSales.confirmUpdateTitle', 'Confirm Sale Update') : t('directSales.confirmSaleTitle', 'Confirm Direct Sale')}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('directSales.confirmSaleDesc', 'Please review the sale and payment details before completing.')}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm text-foreground">
            {/* Customer info */}
            <div className="bg-muted/40 p-3 rounded-lg border border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">{t('orders.table.customer', 'Customer')}:</span>
              <span className="font-semibold text-foreground">
                {customerName ? `${customerName} ${customerPhone ? `(${customerPhone})` : ''}` : t('receipt.walkInCustomer', 'Walk-in Client')}
              </span>
            </div>

            {/* Items summary */}
            <div className="space-y-1.5 max-h-[22vh] overflow-y-auto custom-scrollbar pr-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('directSales.itemsPurchased', 'Items')} ({cart.reduce((s, i) => s + i.quantity, 0)})
              </div>
              {cart.map((item) => (
                <div key={item.key} className="flex justify-between items-center text-xs bg-muted/20 border border-border/60 rounded-lg p-2.5">
                  <span className="font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                    <span>{item.quantity}x {getLocName(item.material)}</span>
                    {item.brand && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30">
                        {item.brand.name}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Payment and totals summary */}
            <div className="bg-muted/40 p-3.5 rounded-xl border border-border space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>{t('orders.detail.subtotal', 'Subtotal')}</span>
                <span className="font-medium text-foreground">{formatCurrency(subtotal)}</span>
              </div>
              {taxEnabled && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('receipt.vat', 'VAT (15%)')}</span>
                  <span className="font-medium text-foreground">{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-border font-bold">
                <span className="text-sm text-foreground">{t('common.total', 'Grand Total')}</span>
                <span className="text-lg text-primary">{formatCurrency(grandTotal)}</span>
              </div>

              {/* Payments breakdown */}
              <div className="pt-2 border-t border-border space-y-1">
                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('receipt.paymentsRecorded', 'Payment Methods')}
                </div>
                {payments.map((p, idx) => {
                  const amt = (Number(p.amount) || 0) === 0 && payments.length === 1 ? grandTotal : Number(p.amount) || 0;
                  return (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <span className="px-2 py-0.5 rounded bg-background border border-border text-[11px] font-medium text-foreground">
                        {formatPaymentMethod(p.method)}
                        {p.referenceNumber && ` (${p.referenceNumber})`}
                      </span>
                      <span className="font-semibold text-foreground">{formatCurrency(amt)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stock notice */}
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
              <span className="text-base">📦</span>
              <span>{t('directSales.stockDeductNotice', 'Inventory stock will be deducted from Mini Store automatically upon confirmation.')}</span>
            </div>
          </div>

          <DialogFooter className="sm:justify-between border-t border-border pt-4 mt-2">
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={checkoutMutation.isPending}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button 
              onClick={() => checkoutMutation.mutate()} 
              disabled={checkoutMutation.isPending}
              className="bg-amber-600 text-white hover:bg-amber-700 font-semibold shadow-sm"
            >
              {checkoutMutation.isPending ? t('common.processing', 'Processing...') : (editId ? t('directSales.updateSale', 'Update Sale & Payments') : t('directSales.confirmAndProceed', 'Confirm & Complete Sale'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal with full Dark & Light mode styling */}
      <Dialog open={!!completedSale} onOpenChange={(open) => !open && setCompletedSale(null)}>
        <DialogContent className="sm:max-w-[440px] bg-card text-card-foreground border-border">
          <DialogHeader className="print:hidden pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">{t('directSales.saleCompleted', 'Sale Completed')}</DialogTitle>
                <p className="text-xs text-muted-foreground">{completedSale?.saleNumber}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm text-foreground">
            {/* Header info */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border">
              <span>{completedSale && formatAppDate(completedSale.saleDateTime, true)}</span>
              <span className="font-semibold text-primary">{t('receipt.directSale', 'Direct Sale')}</span>
            </div>

            {/* Customer */}
            {(completedSale?.customerName || completedSale?.customerPhone) && (
              <div className="bg-muted/30 p-2.5 rounded-lg border border-border text-xs space-y-1">
                {completedSale.customerName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('orders.table.customer', 'Customer')}:</span>
                    <span className="font-medium text-foreground">{completedSale.customerName}</span>
                  </div>
                )}
                {completedSale.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('common.phone', 'Phone')}:</span>
                    <span className="font-medium text-foreground">{completedSale.customerPhone}</span>
                  </div>
                )}
              </div>
            )}

            {/* Line items */}
            <div className="space-y-2 max-h-[22vh] overflow-y-auto custom-scrollbar pr-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('directSales.itemsPurchased', 'Items Purchased')}
              </div>
              {completedSale?.lines?.map((line: any) => (
                <div key={line.id} className="flex justify-between items-start text-xs bg-muted/20 border border-border/60 rounded-lg p-2.5">
                  <div>
                    <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                      <span>{getLocName(line.material)}</span>
                      {line.brandName && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30">
                          {line.brandName}
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground text-[11px]">{line.quantity}x @ {formatCurrency(line.priceAtSaleTime)}</div>
                  </div>
                  <div className="font-bold text-foreground">
                    {formatCurrency(Number(line.priceAtSaleTime) * Number(line.quantity))}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial summary */}
            <div className="bg-muted/30 p-3 rounded-lg border border-border space-y-2 text-xs">
              {Number(completedSale?.taxAmount) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t('receipt.vat', 'VAT (15%)')}</span>
                  <span className="font-medium text-foreground">{formatCurrency(completedSale.taxAmount)}</span>
                </div>
              )}
              {completedSale?.payments?.length > 0 && (
                <div className="pt-2 border-t border-border space-y-1.5">
                  <div className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    {t('receipt.paymentsRecorded', 'Payments Recorded')}
                  </div>
                  {completedSale.payments.map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center text-xs">
                      <span className="px-2 py-0.5 rounded bg-background border border-border text-[11px] font-medium text-foreground">
                        {formatPaymentMethod(p.method)}
                        {p.methodDetails && ` (${p.methodDetails})`}
                      </span>
                      <span className="font-semibold text-foreground">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-border text-sm font-bold">
                <span className="text-foreground">{t('receipt.totalPaid', 'Total Paid')}</span>
                <span className="text-base text-primary">
                  {formatCurrency(completedSale?.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0)}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="print:hidden sm:justify-between border-t border-border pt-4 mt-2">
            <Button variant="outline" onClick={() => setCompletedSale(null)}>{t("common.close", "Close")}</Button>
            <Button 
              onClick={() => printDirectSaleReceipt(completedSale)} 
              className="bg-amber-600 text-white hover:bg-amber-700 font-semibold shadow-sm"
            >
              <Printer className="w-4 h-4 mr-2" /> {t('receipt.receipt', 'Print Receipt')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Sticky Floating Cart Button (Portaled to document.body so it stays strictly sticky on scroll) */}
      {cart.length > 0 && typeof document !== 'undefined' && createPortal(
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("cart-section");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          aria-label={t("directSales.viewCart", "View Cart")}
          className={`md:hidden fixed z-[999] pointer-events-auto rounded-full text-white flex items-center justify-center transition-all cursor-pointer ${
            isBouncing
              ? 'scale-115 duration-100 ease-out'
              : 'scale-100 duration-200 ease-in active:scale-95'
          }`}
          style={{
            position: "fixed",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 22px)",
            right: "18px",
            width: "52px",
            height: "52px",
            zIndex: 999,
            background: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
            boxShadow: "0 8px 24px rgba(217, 119, 6, 0.45), 0 2px 8px rgba(0, 0, 0, 0.25)",
            border: "1px solid rgba(254, 243, 199, 0.35)",
            touchAction: "manipulation",
          }}
        >
          <ShoppingCart className="w-6 h-6 text-white" />
          {/* Unique Items Count */}
          <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-zinc-900 shadow-md">
            {cart.length}
          </span>
          {/* Total Quantity Count */}
          <span className="absolute -top-1.5 -left-2 bg-emerald-500 text-white text-[10px] font-bold px-1.5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-zinc-900 shadow-md">
            x{totalItems}
          </span>
        </button>,
        document.body
      )}

      {/* Brand Selection Modal */}
      <Dialog open={!!brandPickerMaterial} onOpenChange={(open) => !open && setBrandPickerMaterial(null)}>
        <DialogContent className="sm:max-w-[420px] bg-card text-card-foreground border-border">
          <DialogHeader className="pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Tag className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {brandPickerMaterial?.brands?.every(b => !b.name || b.name.toLowerCase() === 'universal' || b.name.toLowerCase() === 'standard')
                    ? t('materials.selectSize', 'Select Size')
                    : t('materials.selectBrand', 'Select Brand')}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {brandPickerMaterial ? getLocName(brandPickerMaterial) : ''}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 space-y-2 max-h-[50vh] overflow-y-auto">
            {brandPickerMaterial && (() => {
              const unallocated = getMaterialUnallocatedStock(brandPickerMaterial, 'MINI');
              if (unallocated <= 0) return null;
              return (
                <div className="p-1.5 px-2 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-1.5 text-[10px] text-amber-700 dark:text-amber-400 mb-2">
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0 text-amber-600" />
                    <span>
                      {unallocated} {brandPickerMaterial.unit || ''} {t('storage.unallocatedStock', 'unallocated')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const mat = brandPickerMaterial;
                      setBrandPickerMaterial(null);
                      navigateToStorageAllocation(mat);
                    }}
                    className="font-bold underline text-amber-600 hover:text-amber-700 dark:text-amber-400 cursor-pointer text-[10px] flex items-center gap-0.5"
                  >
                    <span>{t('storage.allocate', 'Allocate')}</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })()}
            <p className="text-xs text-muted-foreground mb-3">
              {brandPickerMaterial?.brands?.every(b => !b.name || b.name.toLowerCase() === 'universal' || b.name.toLowerCase() === 'standard')
                ? t('materials.selectSizeDesc', 'Choose a size for this item:')
                : t('materials.hasBrandsDesc', 'Choose a brand for this item:')}
            </p>
            {brandPickerMaterial?.brands?.map((brand) => {
              const bStock = getBrandMiniStock(brand);
              const brandKey = `${brandPickerMaterial.id}-${brand.id || `${brand.name}-${brand.size || 'std'}-${brand.color || ''}-${brand.type || ''}`}`;
              const inCartForBrand = cart.find(c => c.key === brandKey)?.quantity || 0;
              const isOutOfStock = bStock <= 0;
              const isMaxInCart = inCartForBrand >= bStock;
              const isDisabled = isOutOfStock || isMaxInCart;

              return (
                <button
                  key={brand.id || `${brand.name}-${brand.size}-${brand.color}-${brand.type}`}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    if (brandPickerMaterial) {
                      addItemToCart(brandPickerMaterial, {
                        id: brand.id,
                        name: brand.name,
                        size: brand.size,
                        color: brand.color,
                        type: brand.type,
                        price: Number(brand.price),
                      });
                    }
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left group ${
                    isDisabled 
                      ? 'border-border/40 bg-muted/20 opacity-60 cursor-not-allowed' 
                      : 'border-border bg-card hover:border-amber-500 hover:bg-amber-500/5 cursor-pointer'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {formatBrandSizeLabel(brand)}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{t('materials.brandPrice', 'Price')}: <span className="font-medium text-foreground">{formatCurrency(brand.price)}</span></span>
                      <span>•</span>
                      <span className={bStock <= 0 ? 'text-red-500 font-semibold' : 'text-muted-foreground'}>
                        {t('storage.brandStock', 'Stock')}: <span className="font-medium text-foreground">{bStock}</span>
                      </span>
                    </div>
                  </div>
                  {isOutOfStock ? (
                    <div className="text-[11px] font-semibold text-red-500 bg-red-500/10 px-2.5 py-1 rounded-md border border-red-500/20">
                      {t('storage.outOfStock', 'Out of Stock')}
                    </div>
                  ) : isMaxInCart ? (
                    <div className="text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                      {t('storage.limitReached', 'Max in Cart')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 group-hover:bg-amber-600 group-hover:text-white transition-all">
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('common.add', 'Add')}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <DialogFooter className="border-t border-border pt-3">
            <Button variant="outline" size="sm" onClick={() => setBrandPickerMaterial(null)}>
              {t('common.cancel', 'Cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={isVatConfirmOpen}
        onClose={() => setIsVatConfirmOpen(false)}
        onConfirm={handleVatConfirm}
        title={t('common.vat', 'VAT')}
        message={taxEnabled 
          ? t('directSales.confirmEnableVatDefault', 'Do you want to turn ON VAT by default for all future sales?') 
          : t('directSales.confirmDisableVatDefault', 'Do you want to turn OFF VAT by default for all future sales?')}
        confirmText={t('common.confirm', 'Confirm')}
      />
    </div>
  );
}
