import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Button, ActionIcon } from '@mantine/core';
import { AppDatePicker } from '../components/common/AppDatePicker';
import { ModernInput } from '../components/ui/modern-input';
import { ModernSelect } from '../components/ui/modern-select';
import { Label } from '../components/ui/label';
import { formatCurrency, isUnitIntegerOnly, getMaterialUnallocatedStock, formatUnit, formatBrandSizeLabel, formatAppDate } from '../lib/utils';
import { toast } from 'sonner';
import {
  Car,
  Users,
  Plus,
  Trash2,
  User,
  Phone,
  Receipt,
  Wrench,
  Layers,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  X,
  Minus,
  ShieldCheck,
  ClipboardList,
  PackageCheck,
  Check,
  Zap,
  Clock,
  Calendar,
  CalendarClock,
  Send,
  Timer,
  Banknote,
  Landmark,
  Smartphone,
  CreditCard,
  Hash,
  Pencil,
  Tag,
  Boxes,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';

import EthiopianPlateInput from '../components/EthiopianPlateInput';
import { parsePlateNumber } from '../utils/plate';
import { useTranslation } from 'react-i18next';
import { PlateBadge } from '../components/common';

const QUICK_ROLES = [
  'Technician',
  'Lead Tech',
  'Upholsterer',
  'Seat Dismantler',
  'Tapestry',
  'Electrician',
  'Finisher',
];

const DEADLINE_HOURS_PRESETS = [
  { key: '1h', label: '+1h', title: '1 Hour from now', type: 'hours' as const, val: 1 },
  { key: '2h', label: '+2h', title: '2 Hours from now', type: 'hours' as const, val: 2 },
  { key: '3h', label: '+3h', title: '3 Hours from now', type: 'hours' as const, val: 3 },
  { key: '5h', label: '+5h', title: '5 Hours from now', type: 'hours' as const, val: 5 },
  { key: '8h', label: '+8h', title: '8 Hours (Full Day)', type: 'hours' as const, val: 8 },
];

const DEADLINE_DAYS_PRESETS = [
  { key: '1d', label: '+1d', title: 'Tomorrow (24 Hours)', type: 'days' as const, val: 1 },
  { key: '2d', label: '+2d', title: '2 Days from now', type: 'days' as const, val: 2 },
  { key: '3d', label: '+3d', title: '3 Days from now', type: 'days' as const, val: 3 },
  { key: '5d', label: '+5d', title: '5 Days from now', type: 'days' as const, val: 5 },
  { key: '1w', label: '+1w', title: '1 Week (7 Days)', type: 'days' as const, val: 7 },
];

export default function CreateOrder() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const getLocName = (item: any) =>
    i18n?.language === 'am' && item?.nameAm ? item.nameAm : (item?.nameEn || item?.name || '');

  // Add Item Workspace Mode: 'service' | 'material' | 'staff'
  const [activeAddMode, setActiveAddMode] = useState<'service' | 'material' | 'staff'>('service');

  // Customer & Vehicle Form
  const [plateNumber, setPlateNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [carModelId, setCarModelId] = useState('');
  const [fsrNumber, setFsrNumber] = useState('');

  // Target Completion Deadline & Schedule
  const [deadline, setDeadline] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Adjustable Service Fee
  const [serviceFee, setServiceFee] = useState('');
  const [showServiceFee, setShowServiceFee] = useState(false);

  // Down Payment (Advance) & Financial Settlement
  const [downPayment, setDownPayment] = useState('');
  const [downPaymentMethod, setDownPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'OTHER'>('CASH');
  const [downPaymentRef, setDownPaymentRef] = useState('');

  // Vehicle Inspection & Condition
  const [selectedCarStatusIds, setSelectedCarStatusIds] = useState<string[]>([]);
  const [customConditionName, setCustomConditionName] = useState('');
  const [customConditionDesc, setCustomConditionDesc] = useState('');
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [inspectionModalTab, setInspectionModalTab] = useState<'exterior' | 'interior' | 'custom'>('exterior');

  // Order Items
  const [selectedServices, setSelectedServices] = useState<{
    tempId: number;
    categoryId: string;
    name: string;
    price: number;
    standardPrice: number;
    selectedMaterials?: {
      materialId: string;
      materialBrandId?: string;
      brandName?: string;
      sizeName?: string | null;
      colorName?: string | null;
      typeName?: string | null;
      qty: number;
      materialName?: string;
    }[];
  }[]>([]);
  const [serviceMaterialBrandSelections, setServiceMaterialBrandSelections] = useState<Record<string, string>>({});
  const [selectedMaterials, setSelectedMaterials] = useState<{
    tempId: number;
    materialId: string;
    brandId?: string;
    brandName?: string;
    sizeName?: string | null;
    colorName?: string | null;
    typeName?: string | null;
    name: string;
    qty: number;
    price: number;
    standardPrice: number;
  }[]>([]);
  const [selectedAssignments, setSelectedAssignments] = useState<{ tempId: number; employeeId: string; name: string; role: string }[]>([]);

  // Selection Inputs
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [servicePriceInput, setServicePriceInput] = useState('');
  const [materialSelect, setMaterialSelect] = useState('');
  const [materialBrandSelect, setMaterialBrandSelect] = useState('');
  const [materialQty, setMaterialQty] = useState('1');
  const [materialPriceInput, setMaterialPriceInput] = useState('');
  const [employeeSelect, setEmployeeSelect] = useState('');
  const [roleInput, setRoleInput] = useState('Technician');

  // Cart item price adjustment modal
  const [editingCartItem, setEditingCartItem] = useState<{
    type: 'service' | 'material';
    tempId: number;
    name: string;
    price: number;
    standardPrice: number;
  } | null>(null);
  const [editCartPriceInput, setEditCartPriceInput] = useState('');

  // Data Fetching
  const { data: carModels } = useQuery({ queryKey: ['car-models'], queryFn: async () => (await api.get('/catalog/car-models')).data });
  const { data: carStatuses } = useQuery({ queryKey: ['car-statuses'], queryFn: async () => (await api.get('/catalog/car-statuses')).data });
  const { data: services } = useQuery({ queryKey: ['services'], queryFn: async () => (await api.get('/catalog/services')).data });
  const { data: materials } = useQuery({ queryKey: ['materials'], queryFn: async () => (await api.get('/catalog/materials')).data });
  const { data: employees } = useQuery({ queryKey: ['users'], queryFn: async () => (await api.get('/users')).data });

  const selectedService = services?.find((s: any) => s.id === selectedServiceId);
  const categoriesForSelectedService = selectedService?.categories || [];

  const exteriorStatuses = (carStatuses || []).filter((cs: any) => 
    cs.code?.startsWith('EXT') || 
    cs.name?.startsWith('scratch') || 
    cs.name?.startsWith('dent') || 
    cs.name?.startsWith('cracked') || 
    cs.name?.startsWith('chipped')
  );

  const interiorStatuses = (carStatuses || []).filter((cs: any) => 
    !exteriorStatuses.some((e: any) => e.id === cs.id)
  );

  const exteriorSelectedCount = exteriorStatuses.filter((cs: any) => selectedCarStatusIds.includes(cs.id)).length;
  const interiorSelectedCount = interiorStatuses.filter((cs: any) => selectedCarStatusIds.includes(cs.id)).length;

  // Auto-Search Vehicle by Plate Number (Canvas modal & lookup untouched)
  const [, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [matchingVehicles, setMatchingVehicles] = useState<any[]>([]);
  const [lastAutoFilledVehicleId, setLastAutoFilledVehicleId] = useState<string | null>(null);

  useEffect(() => {
    if (searchStatus === 'found') {
      const timer = setTimeout(() => setSearchStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [searchStatus]);

  useEffect(() => {
    const searchStr = parsePlateNumber(plateNumber)?.serial || plateNumber;
    if (searchStr.length >= 4) {
      setSearchStatus('idle');
      const timer = setTimeout(async () => {
        setIsSearching(true);
        setSearchStatus('searching');
        try {
          const res = await api.get(`/customers/vehicles?search=${encodeURIComponent(searchStr)}`);
          const vehicles = res.data;
          
          if (vehicles.length === 1) {
            const exactMatch = vehicles[0];
            setCustomerName(exactMatch.customer.name);
            setCustomerPhone(exactMatch.customer.phoneNumber);
            setCarModelId(exactMatch.carModelId);
            setPlateNumber(exactMatch.plateNumber);
            setMatchingVehicles([]);
            setSearchStatus('found');
            
            if (lastAutoFilledVehicleId !== exactMatch.id) {
              setLastAutoFilledVehicleId(exactMatch.id);
              toast.success(t('orders.validation.vehicleFound'));
            }
          } else if (vehicles.length > 1) {
            setMatchingVehicles(vehicles);
            setSearchStatus('idle');
          } else {
            setMatchingVehicles([]);
            setSearchStatus('not_found');
          }
        } catch (error) {
          console.error(error);
          setSearchStatus('not_found');
        } finally {
          setIsSearching(false);
        }
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setMatchingVehicles([]);
      setSearchStatus('idle');
    }
  }, [plateNumber]);

  const selectVehicle = (v: any) => {
    setCustomerName(v.customer.name);
    setCustomerPhone(v.customer.phoneNumber);
    setCarModelId(v.carModelId);
    setPlateNumber(v.plateNumber);
    setMatchingVehicles([]);
    setSearchStatus('found');
    toast.success(t('orders.validation.vehicleSelected'));
  };

  // Deadline helper calculations
  const setDeadlinePreset = (type: 'hours' | 'days' | 'months', amount: number, key?: string) => {
    const target = new Date();
    if (type === 'hours') {
      target.setHours(target.getHours() + amount);
    } else if (type === 'days') {
      target.setDate(target.getDate() + amount);
    } else if (type === 'months') {
      target.setMonth(target.getMonth() + amount);
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    const str = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
    setDeadline(str);
    setSelectedPreset(key || null);
  };

  const formatDurationPreview = (targetDate: Date) => {
    const diffMs = targetDate.getTime() - Date.now();
    if (diffMs <= 0) return 'Immediate / Now';
    const totalMin = Math.floor(diffMs / (60 * 1000));
    const totalHours = Math.floor(totalMin / 60);
    const days = Math.floor(totalHours / 24);
    const months = Math.floor(days / 30);

    if (months > 0) {
      const remDays = days % 30;
      return remDays > 0 ? `${months} mo ${remDays} d` : `${months} month${months > 1 ? 's' : ''}`;
    }
    if (days > 0) {
      const remHours = totalHours % 24;
      return remHours > 0 ? `${days} d ${remHours} hr` : `${days} day${days > 1 ? 's' : ''}`;
    }
    if (totalHours > 0) {
      const remMin = totalMin % 60;
      return remMin > 0 ? `${totalHours} hr ${remMin} min` : `${totalHours} hr`;
    }
    return `${totalMin} min`;
  };

  const get70PercentTime = (targetDate: Date) => {
    const now = Date.now();
    const total = targetDate.getTime() - now;
    return new Date(now + total * 0.7);
  };

  // Form validity check
  const isFormValid = Boolean(plateNumber.trim() && customerName.trim() && customerPhone.trim() && carModelId);

  // Submit Order Mutation
  const submitOrderMutation = useMutation({
    mutationFn: async () => {
      if (!plateNumber || !customerName || !customerPhone || !carModelId) {
        throw new Error(t('orders.validation.customerVehicleRequired'));
      }

      // Pre-validate down payment does not exceed total
      const totalOrderAmt = calculateTotal();
      const downPaymentNum = Number(downPayment) || 0;
      if (downPaymentNum > totalOrderAmt) {
        throw new Error(t('orders.create.downPaymentExceeds', 'Down payment cannot exceed the total order amount.'));
      }

      // Pre-validate that none of selected materials has unallocated stock in Mini Store
      for (const m of selectedMaterials) {
        const mat = materials?.find((x: any) => x.id === m.materialId);
        if (mat) {
          const unallocated = getMaterialUnallocatedStock(mat, 'MINI');
          if (unallocated > 0) {
            throw new Error(
              t('storage.unallocatedOrderBlocked', {
                name: getLocName(mat),
                unallocated,
                defaultValue: `Cannot create order. Material "${getLocName(mat)}" has ${unallocated} unallocated stock in Mini Store. It must be allocated in Storage first.`
              })
            );
          }
        }
      }

      // 1. Create Order
      const res = await api.post('/orders', {
        customerName,
        customerPhone,
        plateNumber,
        carModelId,
        fsrNumber: fsrNumber.trim() || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        downPayment: downPaymentNum,
        serviceFee: serviceFeeAmount,
        notes: customConditionDesc.trim() || undefined,
      });
      const orderId = res.data.id;

      // 2. Add Conditions
      for (const id of selectedCarStatusIds) {
        await api.post(`/orders/${orderId}/car-status`, {
          carStatusId: id,
        });
      }
      
      if (customConditionName.trim() || customConditionDesc.trim()) {
        await api.post(`/orders/${orderId}/car-status`, {
          customName: customConditionName.trim() || 'Intake Inspection Note',
          customDescription: customConditionDesc.trim() || undefined,
        });
      }

      // 3. Add Services
      for (const s of selectedServices) {
        await api.post(`/orders/${orderId}/services`, {
          serviceCategoryId: s.categoryId,
          priceMultiplier: 1,
          unitPrice: s.price,
          selectedMaterials: s.selectedMaterials?.map((m: any) => ({
            materialId: m.materialId,
            materialBrandId: m.materialBrandId || undefined,
          })),
        });
      }

      // 4. Add Materials
      for (const m of selectedMaterials) {
        await api.post(`/orders/${orderId}/standalone-items`, {
          materialId: m.materialId,
          materialBrandId: m.brandId,
          brandName: m.brandName,
          sizeName: m.sizeName || null,
          colorName: m.colorName || null,
          typeName: m.typeName || null,
          quantity: m.qty,
          unitPrice: m.price,
        });
      }

      // 5. Add Assignments
      for (const a of selectedAssignments) {
        await api.post(`/orders/${orderId}/assignments`, { employeeId: a.employeeId, roleLabel: a.role });
      }

      // 6. Record Down Payment if provided
      if (downPaymentNum > 0) {
        await api.post(`/orders/${orderId}/payments`, {
          amount: downPaymentNum,
          method: downPaymentMethod,
          referenceNumber: downPaymentRef.trim() || undefined,
        });
      }

      // 7. Dispatch Telegram Notification with detailed order instruction
      try {
        await api.post(`/orders/${orderId}/notify-telegram`);
      } catch (err: any) {
        console.warn('Telegram notification dispatch failed:', err?.message);
      }

      return orderId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['materials'] });
      await queryClient.invalidateQueries({ queryKey: ['storage_materials'] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(t('alerts.orderCreated'));
      navigate('/orders');
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || err.message || t('orders.validation.createError'))
  });

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const selected = services?.find((s: any) => s.id === serviceId);
    const cats = selected?.categories || [];
    if (cats.length === 1) {
      setSelectedCategoryId(cats[0].id);
      setServicePriceInput(String(cats[0].price));
      const initSelections: Record<string, string> = {};
      cats[0].materialUsages?.forEach((u: any) => {
        const mat = materials?.find((m: any) => m.id === u.materialId);
        if (mat?.brands?.length === 1) {
          initSelections[u.materialId] = mat.brands[0].id;
        }
      });
      setServiceMaterialBrandSelections(initSelections);
    } else {
      setSelectedCategoryId('');
      setServicePriceInput('');
      setServiceMaterialBrandSelections({});
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const cat = categoriesForSelectedService?.find((c: any) => c.id === categoryId);
    if (cat) {
      setServicePriceInput(String(cat.price));
      const initSelections: Record<string, string> = {};
      cat.materialUsages?.forEach((u: any) => {
        const mat = materials?.find((m: any) => m.id === u.materialId);
        if (mat?.brands?.length === 1) {
          initSelections[u.materialId] = mat.brands[0].id;
        }
      });
      setServiceMaterialBrandSelections(initSelections);
    } else {
      setServicePriceInput('');
      setServiceMaterialBrandSelections({});
    }
  };

  const handleMaterialChange = (matId: string) => {
    setMaterialSelect(matId);
    const m = materials?.find((x: any) => x.id === matId);
    if (m?.brands && m.brands.length > 0) {
      setMaterialBrandSelect(m.brands[0].id);
      setMaterialPriceInput(String(m.brands[0].price));
    } else {
      setMaterialBrandSelect('');
      setMaterialPriceInput(m?.currentPrice ? String(m.currentPrice) : '');
    }
  };

  const handleBrandChange = (brandId: string) => {
    setMaterialBrandSelect(brandId);
    const b = activeSelectedMat?.brands?.find((x: any) => x.id === brandId);
    if (b) {
      setMaterialPriceInput(String(b.price));
    }
  };

  const getMiniStoreStock = (materialId: string) => {
    const mat = materials?.find((m: any) => m.id === materialId);
    if (!mat) return 0;
    const stock = mat.materialStocks?.find((s: any) => s.store.type === 'MINI');
    return stock ? Number(stock.quantity) : 0;
  };

  const getCurrentMaterialRequirements = () => {
    const reqs = new Map<string, { totalNeeded: number; name: string }>();
    
    for (const m of selectedMaterials) {
      const existing = reqs.get(m.materialId);
      if (existing) {
        existing.totalNeeded += m.qty;
      } else {
        reqs.set(m.materialId, { totalNeeded: m.qty, name: m.name });
      }
    }
    
    for (const s of selectedServices) {
      const service = services?.find((srv: any) => srv.categories.some((c: any) => c.id === s.categoryId));
      const cat = service?.categories.find((c: any) => c.id === s.categoryId);
      if (cat && cat.materialUsages) {
        for (const usage of cat.materialUsages) {
          const qty = Number(usage.quantityUsed);
          const existing = reqs.get(usage.materialId);
          if (existing) {
            existing.totalNeeded += qty;
          } else {
            reqs.set(usage.materialId, { totalNeeded: qty, name: getLocName(usage.material) });
          }
        }
      }
    }
    return reqs;
  };

  const handleAddService = () => {
    if (!selectedCategoryId || !selectedService) return;
    const cat = categoriesForSelectedService?.find((c: any) => c.id === selectedCategoryId);
    if (cat) {
      if (cat.materialUsages) {
        for (const usage of cat.materialUsages) {
          const mat = materials?.find((m: any) => m.id === usage.materialId);
          if (mat) {
            const unallocated = getMaterialUnallocatedStock(mat, 'MINI');
            if (unallocated > 0) {
              toast.error(
                t('storage.unallocatedServiceBlocked', {
                  serviceName: `${getLocName(selectedService)} - ${getLocName(cat)}`,
                  materialName: getLocName(mat),
                  unallocated,
                  defaultValue: `Cannot add service "${getLocName(selectedService)} - ${getLocName(cat)}": Required material "${getLocName(mat)}" has ${unallocated} unallocated stock in Mini Store. Please allocate it first in Storage.`
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
        }
      }

      const currentReqs = getCurrentMaterialRequirements();
      if (cat.materialUsages) {
        for (const usage of cat.materialUsages) {
          const qtyNeeded = Number(usage.quantityUsed);
          const currentTotal = currentReqs.get(usage.materialId)?.totalNeeded || 0;
          const available = getMiniStoreStock(usage.materialId);
          if (currentTotal + qtyNeeded > available) {
            toast.error(t('orders.validation.notEnoughStock', { needed: currentTotal + qtyNeeded, available }));
            return;
          }
        }
      }

      const stdPrice = Number(cat.price);
      const parsedPrice = servicePriceInput && !isNaN(Number(servicePriceInput)) && Number(servicePriceInput) >= 0
        ? Number(servicePriceInput)
        : stdPrice;

      setSelectedServices([
        ...selectedServices,
        {
          tempId: Date.now(),
          categoryId: cat.id,
          name: `${getLocName(selectedService)} - ${getLocName(cat)}`,
          price: parsedPrice,
          standardPrice: stdPrice,
          selectedMaterials: cat.materialUsages?.map((u: any) => {
            const mat = materials?.find((m: any) => m.id === u.materialId);
            const bId = serviceMaterialBrandSelections[u.materialId];
            const b = mat?.brands?.find((x: any) => x.id === bId);
            return {
              materialId: u.materialId,
              materialBrandId: bId || undefined,
              brandName: b?.name,
              sizeName: b?.size || null,
              colorName: b?.color || null,
              typeName: b?.type || null,
              qty: Number(u.quantityUsed),
              materialName: mat ? getLocName(mat) : undefined,
            };
          }) || [],
        },
      ]);
      setSelectedCategoryId('');
      setServicePriceInput('');
      setServiceMaterialBrandSelections({});
    }
  };

  const handleAddMaterial = () => {
    const qtyNum = Number(materialQty);
    if (!materialSelect || isNaN(qtyNum) || qtyNum <= 0) return;
    const mat = materials?.find((m: any) => m.id === materialSelect);
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

      if (mat.brands && mat.brands.length > 0 && !materialBrandSelect) {
        toast.error(t('materials.brandRequired', 'Please select a brand for this material'));
        return;
      }

      if (isUnitIntegerOnly(mat.unit) && !Number.isInteger(qtyNum)) {
        toast.error(t('storage.integerRequired', 'Quantity for PCS items must be a whole number (no decimals allowed)'));
        return;
      }

      const selectedBrand = mat.brands?.find((b: any) => b.id === materialBrandSelect);
      const currentReqs = getCurrentMaterialRequirements();
      const currentTotal = currentReqs.get(mat.id)?.totalNeeded || 0;
      const available = selectedBrand
        ? Number(selectedBrand.brandStocks?.find((s: any) => s.store?.type === 'MINI')?.quantity ?? 0)
        : getMiniStoreStock(mat.id);
      
      if (currentTotal + qtyNum > available) {
        toast.error(t('orders.validation.notEnoughStock', { needed: currentTotal + qtyNum, available }));
        return;
      }

      const unitPrice = selectedBrand ? Number(selectedBrand.price) : Number(mat.currentPrice || 0);
      const parsedPrice = materialPriceInput && !isNaN(Number(materialPriceInput)) && Number(materialPriceInput) >= 0
        ? Number(materialPriceInput)
        : unitPrice;

      setSelectedMaterials([
        ...selectedMaterials,
        {
          tempId: Date.now(),
          materialId: mat.id,
          brandId: selectedBrand?.id,
          brandName: selectedBrand?.name,
          sizeName: selectedBrand?.size || null,
          colorName: selectedBrand?.color || null,
          typeName: selectedBrand?.type || null,
          name: `${mat.itemCode ? `[${mat.itemCode}] ` : ''}${getLocName(mat)}`,
          qty: qtyNum,
          price: parsedPrice,
          standardPrice: unitPrice,
        },
      ]);
      setMaterialSelect('');
      setMaterialBrandSelect('');
      setMaterialQty('1');
      setMaterialPriceInput('');
    }
  };

  const handleAddAssignment = () => {
    if (!employeeSelect || !roleInput.trim()) return;
    if (selectedAssignments.some(a => a.employeeId === employeeSelect)) return;
    const emp = employees?.find((e: any) => e.employee?.id === employeeSelect);
    if (emp) {
      setSelectedAssignments([
        ...selectedAssignments,
        {
          tempId: Date.now(),
          employeeId: emp.employee.id,
          name: emp.name,
          role: roleInput.trim(),
        },
      ]);
      setEmployeeSelect('');
      setRoleInput('Technician');
    }
  };

  const serviceFeeAmount = Number(serviceFee) || 0;

  const calculateTotal = () => {
    const sTotal = selectedServices.reduce((acc, s) => acc + s.price, 0);
    const mTotal = selectedMaterials.reduce((acc, m) => acc + (m.price * m.qty), 0);
    return sTotal + mTotal + serviceFeeAmount;
  };

  const totalOrderAmount = calculateTotal();
  const downPaymentAmount = Number(downPayment) || 0;
  const isDownPaymentInvalid = downPaymentAmount > totalOrderAmount;
  const remainingBalanceDue = Math.max(0, totalOrderAmount - downPaymentAmount);

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'BANK_TRANSFER': return Landmark;
      case 'MOBILE_MONEY': return Smartphone;
      case 'OTHER': return CreditCard;
      default: return Banknote;
    }
  };

  const paymentMethodOptions = [
    { value: 'CASH', label: t('payment.cash', 'Cash') },
    { value: 'BANK_TRANSFER', label: t('payment.bank', 'Bank Transfer') },
    { value: 'MOBILE_MONEY', label: t('payment.mobile', 'Mobile Money') },
    { value: 'OTHER', label: t('payment.card', 'Other / POS') },
  ];

  const renderPaymentMethodValue = (val: string) => {
    switch (val) {
      case 'BANK_TRANSFER': return t('payment.bank', 'Bank Transfer');
      case 'MOBILE_MONEY': return t('payment.mobile', 'Mobile Money');
      case 'OTHER': return t('payment.card', 'Other / POS');
      default: return t('payment.cash', 'Cash');
    }
  };

  const totalItemsCount = selectedServices.length + selectedMaterials.length;
  const activeSelectedCategory = categoriesForSelectedService?.find((c: any) => c.id === selectedCategoryId);
  const activeSelectedMat = materials?.find((m: any) => m.id === materialSelect);
  const activeSelectedBrand = activeSelectedMat?.brands?.find((b: any) => b.id === materialBrandSelect);
  const activeMatPrice = activeSelectedBrand ? Number(activeSelectedBrand.price) : Number(activeSelectedMat?.currentPrice || 0);
  const activeBrandStock = activeSelectedBrand
    ? Number(activeSelectedBrand.brandStocks?.find((s: any) => s.store?.type === 'MINI')?.quantity ?? 0)
    : 0;
  const activeMatStock = activeSelectedBrand ? activeBrandStock : (activeSelectedMat ? getMiniStoreStock(activeSelectedMat.id) : 0);
  const activeMatUnallocated = activeSelectedMat ? getMaterialUnallocatedStock(activeSelectedMat, 'MINI') : 0;
  const activeMatNeedsAllocation = activeMatUnallocated > 0;
  const activeCategoryUnallocatedMat = activeSelectedCategory?.materialUsages?.find((u: any) => {
    const m = materials?.find((x: any) => x.id === u.materialId) || u.material;
    return m && getMaterialUnallocatedStock(m, 'MINI') > 0;
  });

  return (
    <div className="flex flex-col lg:min-h-[580px] lg:h-[calc(100vh-8.5rem)] gap-2.5 animate-in fade-in duration-200">
      {/* 1. Slim Executive Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-1.5 bg-card border border-border rounded-xl shadow-2xs shrink-0">
        <div className="flex items-center gap-2.5">
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            radius="md"
            onClick={() => navigate('/orders')}
            title="Back to Orders"
          >
            <ArrowLeft className="w-4 h-4" />
          </ActionIcon>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-extrabold tracking-tight text-foreground">
              {t('orders.createNew', 'New Work Order')}
            </h1>
            {isFormValid ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="w-3 h-3" />
                <span>Ready</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <AlertCircle className="w-3 h-3" />
                <span>Vehicle & Client required</span>
              </span>
            )}
          </div>
        </div>

        {/* Header Summary & CTAs */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground font-medium px-2.5 py-1 rounded-lg bg-muted/50 border border-border/50">
            <span className="font-bold text-foreground">{selectedServices.length}</span> services •{' '}
            <span className="font-bold text-foreground">{selectedMaterials.length}</span> parts •{' '}
            <span className="font-bold text-foreground">{selectedAssignments.length}</span> staff
          </div>
          {/* Pre-Inspection Modal Trigger Button */}
          <Button
            variant={
              selectedCarStatusIds.length > 0 || customConditionName.trim() || customConditionDesc.trim()
                ? 'light'
                : 'default'
            }
            color={
              selectedCarStatusIds.length > 0 || customConditionName.trim() || customConditionDesc.trim()
                ? 'amber'
                : undefined
            }
            radius="md"
            size="sm"
            onClick={() => setIsInspectionModalOpen(true)}
            leftSection={
              <ShieldCheck className={`w-3.5 h-3.5 ${
                selectedCarStatusIds.length > 0 || customConditionName.trim() || customConditionDesc.trim()
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-amber-500'
              }`} />
            }
            rightSection={
              (selectedCarStatusIds.length > 0 || customConditionName.trim()) ? (
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold bg-amber-500 text-white leading-none">
                  {selectedCarStatusIds.length + (customConditionName.trim() ? 1 : 0)}
                </span>
              ) : undefined
            }
            style={{
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              height: 34,
            }}
            title={t('orders.create.inspectionModalTitle', 'Vehicle Pre-Inspection Checklist & Intake Notes')}
          >
            {t('orders.create.vehiclePreInspection', 'Pre-Inspection')}
          </Button>
          <Button
            variant="default"
            radius="md"
            size="sm"
            onClick={() => navigate('/orders')}
            style={{
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              height: 34,
            }}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
        </div>
      </div>

      {/* 2. Side-by-Side Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-[560px] items-stretch">
        {/* ========================================================= */}
        {/* LEFT COLUMN: Vehicle Intake, Customer & Schedule (5 cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-5 flex flex-col gap-2.5 min-h-[560px] h-full pr-0.5">
          {/* Card 1: Customer & Vehicle Identification + Optional FSR */}
          <div className="relative rounded-2xl p-[2px] transition-all duration-500 overflow-hidden shadow-2xs shrink-0">
            {/* Animated Search Border Background Overlay */}
            <div className={`absolute inset-0 transition-colors duration-1000 ease-in-out z-0 ${
               searchStatus === 'found' ? 'bg-emerald-500' : 
               searchStatus === 'not_found' ? 'bg-gray-300 dark:bg-gray-700' : 
               'bg-gray-200 dark:bg-gray-800'
            }`}></div>
            <div className={`absolute top-1/2 left-1/2 w-[1500px] h-[1500px] -translate-x-1/2 -translate-y-1/2 animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#3b82f6_50%,transparent_100%)] dark:bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#3b82f6_50%,transparent_100%)] z-0 transition-opacity duration-700 ${searchStatus === 'searching' ? 'opacity-100' : 'opacity-0'}`}></div>

            <div className="relative z-10 w-full h-full bg-card rounded-[14px] flex flex-col overflow-hidden">
              {/* Card 1 Header */}
              <div className="py-2 px-3.5 border-b border-border/50 bg-muted/20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground shrink-0">
                  <div className="p-1 rounded-md bg-primary/10 text-primary">
                    <Car className="w-3.5 h-3.5" />
                  </div>
                  <span>{t('orders.create.customerVehicleDetails')}</span>
                </div>

                {plateNumber && (
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <PlateBadge plate={plateNumber} size="xs" />
                  </div>
                )}
              </div>

              {/* Card 1 Content */}
              <div className="p-3 space-y-2">
                {/* Plate Input with Ethiopian Plate canvas modal untouched */}
                <div className="space-y-0.5 relative z-50">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t('orders.create.plateNumberLabel')}
                    </Label>
                    {searchStatus === 'searching' && (
                      <span className="text-[9.5px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 animate-pulse">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Searching...</span>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <EthiopianPlateInput 
                      value={plateNumber} 
                      onChange={setPlateNumber} 
                      isSearching={searchStatus === 'searching'}
                      inputSize="sm"
                    />
                  </div>
                  
                  {matchingVehicles.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1">
                      <div className="px-3 py-1.5 bg-muted/80 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>{t('orders.create.selectMatchingVehicle')}</span>
                        <span className="text-[10px] font-medium text-primary">({matchingVehicles.length} found)</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-border/60">
                        {matchingVehicles.map(v => (
                          <div 
                            key={v.id} 
                            onClick={() => selectVehicle(v)}
                            className="flex items-center justify-between p-2.5 hover:bg-muted/60 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <PlateBadge plate={v.plateNumber} size="sm" />
                              <div>
                                <div className="text-xs font-bold text-foreground">{v.customer.name}</div>
                                <div className="text-[10px] text-muted-foreground">{v.customer.phoneNumber}</div>
                              </div>
                            </div>
                            <div className="text-right text-xs">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-foreground border border-border">
                                {v.carModel.brand.name} {v.carModel.name}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Auto-detected recognition chip */}
                {searchStatus === 'found' && (
                  <div className="flex items-center gap-1.5 p-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold animate-in fade-in slide-in-from-top-1">
                    <CheckCircle className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{t('orders.validation.vehicleFound', 'Vehicle records loaded')}</span>
                  </div>
                )}

                {/* Customer Details Inputs */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block leading-none">
                      {t('orders.create.customerName')}
                    </label>
                    <ModernInput
                      icon={User}
                      inputSize="sm"
                      placeholder={t('orders.create.placeholder.name', 'John Doe')}
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block leading-none">
                      {t('orders.create.phoneNumber')}
                    </label>
                    <ModernInput
                      icon={Phone}
                      inputSize="sm"
                      placeholder={t('orders.create.placeholder.phone', '0911...')}
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </div>

                {/* Car Model & Optional FSR Number placed together */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block leading-none">
                      {t('orders.create.carModel')}
                    </label>
                    <ModernSelect
                      icon={Car}
                      inputSize="sm"
                      placeholder={t('orders.create.selectCarModel')}
                      value={carModelId}
                      onValueChange={v => setCarModelId(v as string)}
                      cacheKey="carModels"
                      maxRecentCount={5}
                      options={carModels?.length ? carModels.map((c: any) => ({
                        value: c.id,
                        label: c.name, 
                        category: c.brand.name,
                        labelNode: (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="truncate">{c.name}</span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-muted text-muted-foreground border border-border shrink-0 uppercase tracking-wider">
                              {c.brand.name}
                            </span>
                          </div>
                        )
                      })) : [{ value: 'no-cars', label: t('orders.create.noCarsAvailable'), disabled: true }]}
                      valueRender={(val: string) => {
                        if (!val || val === 'no-cars') return <span className="text-muted-foreground/60 font-normal text-xs">{t('orders.create.selectCarModel')}</span>;
                        const c = carModels?.find((x: any) => x.id === val);
                        return c ? (
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="truncate font-semibold">{c.name}</span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-muted text-muted-foreground border border-border shrink-0 uppercase">
                              {c.brand.name}
                            </span>
                          </div>
                        ) : val;
                      }}
                    />
                  </div>

                  {/* FSR Number neatly integrated as optional field */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block leading-none">
                      {t('orders.detail.fsrNumber', 'FSR # (Optional)')}
                    </label>
                    <div className="relative">
                      <ModernInput
                        icon={Receipt}
                        inputSize="sm"
                        placeholder={t('orders.create.fsrPlaceholder', 'e.g. FSR-00123')}
                        value={fsrNumber}
                        onChange={e => setFsrNumber(e.target.value)}
                        className="font-mono tracking-wider font-semibold uppercase text-xs"
                      />
                      {fsrNumber && (
                        <button
                          type="button"
                          onClick={() => setFsrNumber('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                          title="Clear FSR"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Schedule & Completion Deadline Card */}
          <div className="flex-1 flex flex-col min-h-[290px] border border-border/80 shadow-2xs rounded-xl bg-card">
            {/* Card 2 Header */}
            <div className="py-2.5 px-3.5 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between shrink-0 rounded-t-xl">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border transition-colors ${
                  deadline 
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-2xs' 
                    : 'bg-muted text-muted-foreground border-border/60'
                }`}>
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground leading-tight">
                    {t('orders.create.deadlineSchedule', 'Target Deadline')}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {deadline ? (
                      <span className="font-medium text-foreground">
                        Due: {formatAppDate(deadline, true)}
                      </span>
                    ) : (
                      <span>{t('orders.create.deadlineHelpShort', 'Set target delivery time & automated alerts')}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {deadline ? (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/25 font-mono shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {formatDurationPreview(new Date(deadline))}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDeadline('');
                        setSelectedPreset(null);
                      }}
                      className="p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title={t('common.clear', 'Clear deadline')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/50">
                    {t('common.optional', 'Optional')}
                  </span>
                )}
              </div>
            </div>

            {/* Card 2 Content */}
            <div className="p-2.5 sm:p-3 flex-1 flex flex-col gap-2 min-h-0 overflow-y-auto">
              {/* 1. Quick Presets (Unified Slim Matrix) */}
              <div className="p-2 rounded-xl bg-muted/20 border border-border/50 space-y-1.5 shrink-0">
                {/* Hours Row */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-2.5 h-2.5 text-amber-500" />
                      <span>{t('orders.create.hoursCategory', 'Same-Day Hours')}</span>
                    </span>
                    {selectedPreset && DEADLINE_HOURS_PRESETS.some(p => p.key === selectedPreset) && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[9px] font-extrabold border border-amber-500/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        +{selectedPreset}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {DEADLINE_HOURS_PRESETS.map(p => {
                      const isSelected = selectedPreset === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          title={p.title}
                          onClick={() => {
                            if (isSelected) {
                              setDeadline('');
                              setSelectedPreset(null);
                            } else {
                              setDeadlinePreset(p.type, p.val, p.key);
                            }
                          }}
                          className={`h-7 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center active:scale-95 select-none ${
                            isSelected
                              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold border border-amber-600 shadow-2xs shadow-amber-500/30'
                              : 'bg-card hover:bg-background text-foreground/80 border border-border/70 hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-400 shadow-2xs'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Days Row */}
                <div className="space-y-1 pt-1 border-t border-border/30">
                  <div className="flex items-center justify-between text-[9.5px] font-bold text-muted-foreground uppercase tracking-wider px-0.5">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-2.5 h-2.5 text-blue-500" />
                      <span>{t('orders.create.daysCategory', 'Multi-Day Turnaround')}</span>
                    </span>
                    {selectedPreset && DEADLINE_DAYS_PRESETS.some(p => p.key === selectedPreset) && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[9px] font-extrabold border border-amber-500/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        +{selectedPreset}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {DEADLINE_DAYS_PRESETS.map(p => {
                      const isSelected = selectedPreset === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          title={p.title}
                          onClick={() => {
                            if (isSelected) {
                              setDeadline('');
                              setSelectedPreset(null);
                            } else {
                              setDeadlinePreset(p.type, p.val, p.key);
                            }
                          }}
                          className={`h-7 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center active:scale-95 select-none ${
                            isSelected
                              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold border border-amber-600 shadow-2xs shadow-amber-500/30'
                              : 'bg-card hover:bg-background text-foreground/80 border border-border/70 hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-400 shadow-2xs'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. Specific Date & Time Input */}
              <div className="space-y-1 shrink-0 pt-1 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <Label htmlFor="deadline-picker" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CalendarClock className="w-3 h-3 text-muted-foreground" />
                    <span>{t('orders.create.exactDateTime', 'Specific Date & Time')}</span>
                  </Label>
                  {deadline && !selectedPreset && (
                    <span className="text-[9.5px] font-bold text-amber-600 dark:text-amber-400 font-mono">
                      Custom
                    </span>
                  )}
                </div>

                <AppDatePicker
                  value={deadline ? new Date(deadline) : null}
                  onChange={(_d, str) => {
                    if (!str) {
                      setDeadline('');
                      setSelectedPreset(null);
                    } else {
                      setDeadline(str);
                      setSelectedPreset(null);
                    }
                  }}
                  showTime={true}
                  placeholder={t('orders.create.pickDateTime', 'Click to set custom target date & time...')}
                  size="small"
                  className="w-full"
                />
              </div>

              {/* 3. Live Turnaround & Milestone Card OR Empty State */}
              <div className="shrink-0 pt-0.5">
                {deadline ? (
                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border/80 shadow-2xs space-y-2.5 animate-in fade-in duration-200">
                    {/* Visual 3-Point Milestone Timeline */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Timer className="w-3 h-3 text-amber-500" />
                          <span>{t('orders.create.milestonePlan', 'Turnaround Milestones')}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-mono">
                          <Clock className="w-2.5 h-2.5 text-amber-500" />
                          {formatDurationPreview(new Date(deadline))}
                        </span>
                      </div>

                      {/* Connecting Bar & Points */}
                      <div className="pt-1 pb-0.5">
                        <div className="h-1 w-full bg-muted-foreground/15 rounded-full relative">
                          <div className="absolute left-0 top-0 bottom-0 w-[70%] bg-blue-500/30 rounded-full" />
                          {/* 70% marker point */}
                          <div 
                            className="absolute top-1/2 -translate-y-1/2 left-[70%] -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-card shadow-xs flex items-center justify-center z-10" 
                            title="70% Notification Trigger"
                          >
                            <div className="w-1 h-1 rounded-full bg-white" />
                          </div>
                          {/* Start marker point */}
                          <div className="absolute top-1/2 -translate-y-1/2 left-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card shadow-xs z-10" />
                          {/* End marker point */}
                          <div className="absolute top-1/2 -translate-y-1/2 right-0 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-card shadow-xs z-10" />
                        </div>

                        <div className="grid grid-cols-3 gap-1 mt-2 text-[10px]">
                          {/* Point 1: Start (Now) */}
                          <div className="flex flex-col items-start leading-tight">
                            <span className="text-[8.5px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                              {t('orders.create.milestoneNow', 'Intake')}
                            </span>
                            <span className="font-mono text-[9.5px] text-foreground font-semibold mt-0.5">
                              {formatAppDate(new Date(), true)}
                            </span>
                          </div>

                          {/* Point 2: 70% Telegram Alert */}
                          <div className="flex flex-col items-center leading-tight">
                            <span className="text-[8.5px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <Send className="w-2.5 h-2.5" />
                              {t('orders.create.milestone70', '70% Alert')}
                            </span>
                            <span className="font-mono text-[9.5px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                              {formatAppDate(get70PercentTime(new Date(deadline)), true)}
                            </span>
                          </div>

                          {/* Point 3: Target Handover */}
                          <div className="flex flex-col items-end leading-tight">
                            <span className="text-[8.5px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <CheckCircle className="w-2.5 h-2.5" />
                              {t('orders.create.milestoneTarget', 'Target Due')}
                            </span>
                            <span className="font-mono text-[9.5px] text-foreground font-semibold mt-0.5">
                              {formatAppDate(deadline, true)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Telegram Alert Dispatch Banner */}
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
                      <div className="p-1 rounded-md bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
                        <Send className="w-3 h-3" />
                      </div>
                      <p className="text-[9.5px] leading-tight flex-1">
                        Automated Telegram dispatch will notify technicians at <strong>{formatAppDate(get70PercentTime(new Date(deadline)), true)}</strong> when 70% duration is reached.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed border-border/80 bg-muted/20 text-muted-foreground">
                    <Clock className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                    <div className="text-[10px] leading-tight flex-1">
                      <span className="font-semibold text-foreground/80">{t('orders.create.noDeadlineSet', 'No Target Deadline Scheduled')}.</span> {t('orders.create.deadlineHelp', 'Select a quick preset above or pick an exact date & time to enable automated turnaround tracking and 70% Telegram alerts.')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Work Order Workspace & Live Manifest (7 cols) */}
        {/* ========================================================= */}
        <div className="lg:col-span-7 flex flex-col bg-card border border-border rounded-xl shadow-2xs min-h-[560px] h-full overflow-hidden">
          {/* Top Section: Quick Add Control Panel */}
          <div className="p-2.5 bg-muted/20 border-b border-border/60 shrink-0 space-y-2">
            {/* Clean Segmented Tab Switcher with Sleek Typography */}
            <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-lg border border-border/50">
              <button
                type="button"
                onClick={() => setActiveAddMode('service')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-[11px] font-medium transition-all ${
                  activeAddMode === 'service'
                    ? 'bg-card text-foreground shadow-2xs font-bold border border-border/80 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Wrench className="w-3 h-3 text-blue-500" />
                <span>Services</span>
                {selectedServices.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-blue-500/15 text-blue-600 dark:text-blue-400 font-mono font-bold">
                    {selectedServices.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveAddMode('material')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-[11px] font-medium transition-all ${
                  activeAddMode === 'material'
                    ? 'bg-card text-foreground shadow-2xs font-bold border border-border/80 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Layers className="w-3 h-3 text-amber-500" />
                <span>Materials & Parts</span>
                {selectedMaterials.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-bold">
                    {selectedMaterials.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveAddMode('staff')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-[11px] font-medium transition-all ${
                  activeAddMode === 'staff'
                    ? 'bg-card text-foreground shadow-2xs font-bold border border-border/80 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Users className="w-3 h-3 text-purple-500" />
                <span>Technicians</span>
                {selectedAssignments.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-purple-500/15 text-purple-600 dark:text-purple-400 font-mono font-bold">
                    {selectedAssignments.length}
                  </span>
                )}
              </button>
            </div>

            {/* Dynamic Single-Row Adder based on Active Mode */}
            {activeAddMode === 'service' && (
              <div className="space-y-1.5 pt-0.5">
                {/* Row 1: Service and Category Selects side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="min-w-0">
                    <ModernSelect 
                      placeholder={t('orders.create.placeholder.service', 'Select service...')}
                      inputSize="sm"
                      value={selectedServiceId} 
                      onValueChange={(v) => handleServiceChange(v || '')}
                      options={services?.length ? services.map((s: any) => ({
                        value: s.id,
                        label: s.serviceGroup ? `[${getLocName(s.serviceGroup)}] ${getLocName(s)}` : getLocName(s)
                      })) : [{ value: 'no-services', label: t('orders.create.noServices', 'No services available'), disabled: true }]}
                      valueRender={(val: string) => {
                        if (!val || val === 'no-services') return <span className="text-gray-400 font-normal text-xs">{t('orders.create.placeholder.service', 'Select service...')}</span>;
                        const s = services?.find((x: any) => x.id === val);
                        return s ? (
                          <span className="text-xs font-medium truncate block">
                            {s.serviceGroup && (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold mr-1">
                                [{getLocName(s.serviceGroup)}]
                              </span>
                            )}
                            {getLocName(s)}
                          </span>
                        ) : val;
                      }}
                    />
                  </div>

                  <div className="min-w-0">
                    <ModernSelect 
                      placeholder={t('orders.create.selectCategory', 'Select category...')}
                      inputSize="sm"
                      value={selectedCategoryId} 
                      onValueChange={v => handleCategoryChange(v as string)} 
                      disabled={!selectedServiceId}
                      options={categoriesForSelectedService?.length ? categoriesForSelectedService.map((c: any) => ({
                        value: c.id,
                        label: `${getLocName(c)} (${formatCurrency(c.price)})`
                      })) : [{ value: 'no-categories', label: t('orders.create.noCategories'), disabled: true }]}
                      valueRender={(val: string) => {
                        if (!val || val === 'no-categories') return <span className="text-gray-400 font-normal text-xs">{t('orders.create.selectCategory', 'Select category...')}</span>;
                        const c = categoriesForSelectedService?.find((x: any) => x.id === val);
                        return c ? <span className="text-xs font-semibold truncate block">{`${getLocName(c)} (${formatCurrency(c.price)})`}</span> : val;
                      }}
                    />
                  </div>
                </div>

                {/* Material Variant Pickers if service requires materials with variants */}
                {activeSelectedCategory?.materialUsages && activeSelectedCategory.materialUsages.some((u: any) => {
                  const m = materials?.find((x: any) => x.id === u.materialId);
                  return m?.brands && m.brands.length > 0;
                }) && (
                  <div className="p-2.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-2 mt-1">
                    <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <Boxes className="w-3.5 h-3.5" />
                      <span>{t('orders.create.requiredMaterials', 'Required Materials & Parts')}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeSelectedCategory.materialUsages.map((usage: any) => {
                        const mat = materials?.find((x: any) => x.id === usage.materialId);
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
                            <ModernSelect
                              placeholder={t('materials.selectBrand', 'Select brand / variant...')}
                              inputSize="sm"
                              value={selectedBrandId}
                              onValueChange={(val) => {
                                setServiceMaterialBrandSelections(prev => ({ ...prev, [mat.id]: val as string }));
                              }}
                              options={mat.brands.map((b: any) => {
                                const stock = Number(b.brandStocks?.find((s: any) => s.store?.type === 'MINI')?.quantity ?? 0);
                                const label = formatBrandSizeLabel({ name: b.name, size: b.size, color: b.color, type: b.type });
                                return {
                                  value: b.id,
                                  label: `${label} (${stock} ${t('orders.create.inStock', 'in stock')})`,
                                  disabled: stock < Number(usage.quantityUsed),
                                };
                              })}
                              valueRender={(val) => {
                                const b = mat.brands.find((x: any) => x.id === val);
                                if (!b) return <span className="text-gray-400 text-xs">{t('materials.selectBrand', 'Select brand / variant...')}</span>;
                                const stock = Number(b.brandStocks?.find((s: any) => s.store?.type === 'MINI')?.quantity ?? 0);
                                return (
                                  <span className="text-xs font-semibold truncate block">
                                    {formatBrandSizeLabel({ name: b.name, size: b.size, color: b.color, type: b.type })} ({stock} in stock)
                                  </span>
                                );
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Row 2: Category info on left, Custom Price Input + Add Button on right */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 truncate">
                    {activeSelectedCategory && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 border border-border/60 text-[11px] font-mono truncate">
                        <span className="font-semibold text-foreground truncate">{getLocName(activeSelectedCategory)}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-muted-foreground">Standard: {formatCurrency(activeSelectedCategory.price)}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-auto shrink-0">
                    {selectedCategoryId && activeSelectedCategory && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="relative w-28">
                          <input
                            type="text"
                            placeholder="0.00"
                            value={servicePriceInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^\d*\.?\d*$/.test(val)) setServicePriceInput(val);
                            }}
                            className="w-full h-9 px-2 pr-7 text-xs font-mono font-bold bg-card border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            title={t('orders.create.servicePrice', 'Service Price (ETB)')}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground select-none pointer-events-none">
                            ETB
                          </span>
                        </div>
                        {Number(servicePriceInput) < Number(activeSelectedCategory.price) && Number(servicePriceInput) > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 whitespace-nowrap">
                            -{formatCurrency(Number(activeSelectedCategory.price) - Number(servicePriceInput))}
                          </span>
                        )}
                      </div>
                    )}

                    <Button 
                      variant="gradient"
                      gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                      radius="md"
                      size="sm"
                      onClick={handleAddService} 
                      disabled={
                        !selectedCategoryId || 
                        Boolean(activeCategoryUnallocatedMat) ||
                        Boolean(activeSelectedCategory?.materialUsages?.some((u: any) => {
                          const m = materials?.find((x: any) => x.id === u.materialId);
                          return m?.brands && m.brands.length > 0 && !serviceMaterialBrandSelections[m.id];
                        }))
                      }
                      leftSection={<Plus className="w-3.5 h-3.5" />}
                      style={{
                        boxShadow: (!selectedCategoryId || Boolean(activeCategoryUnallocatedMat)) ? "none" : "0 2px 10px rgba(245, 158, 11, 0.25)",
                        fontWeight: 600,
                        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                        height: 36,
                        flexShrink: 0,
                      }}
                    >
                      Add {activeSelectedCategory && `(${formatCurrency(Number(servicePriceInput) || activeSelectedCategory.price)})`}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeAddMode === 'service' && activeCategoryUnallocatedMat && (
              <div className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  {t('storage.unallocatedServiceBlocked', {
                    serviceName: `${getLocName(selectedService)} - ${getLocName(activeSelectedCategory)}`,
                    materialName: getLocName(materials?.find((x: any) => x.id === activeCategoryUnallocatedMat.materialId) || activeCategoryUnallocatedMat.material),
                    unallocated: getMaterialUnallocatedStock(materials?.find((x: any) => x.id === activeCategoryUnallocatedMat.materialId) || activeCategoryUnallocatedMat.material, 'MINI'),
                    defaultValue: 'Cannot add service: A required material has unallocated stock in Mini Store and must be allocated in Storage first.'
                  })}
                </span>
              </div>
            )}

            {activeAddMode === 'material' && (
              <div className="space-y-2 pt-0.5">
                {activeSelectedMat?.brands && activeSelectedMat.brands.length > 0 ? (
                  <>
                    {/* Row 1: Material and Brand selectors side-by-side with equal width */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="min-w-0">
                        <ModernSelect 
                          placeholder={t('orders.create.selectMaterial', 'Select standalone part...')}
                          inputSize="sm"
                          value={materialSelect} 
                          onValueChange={v => handleMaterialChange(v as string)}
                          options={materials?.filter((m: any) => m.isStandaloneSellable).length ? materials.filter((m: any) => m.isStandaloneSellable).map((m: any) => {
                            const stock = getMiniStoreStock(m.id);
                            const unalloc = getMaterialUnallocatedStock(m, 'MINI');
                            const needsAlloc = unalloc > 0;
                            return {
                              value: m.id,
                              label: `${m.itemCode ? `[${m.itemCode}] ` : ''}${getLocName(m)} (${formatCurrency(m.currentPrice)})${needsAlloc ? ` (⚠️ ${t('storage.needsAllocation', 'Needs Allocation')})` : ''}`,
                              labelNode: (
                                <div className="flex items-center justify-between w-full gap-2">
                                  <span className="truncate">{m.itemCode ? `[${m.itemCode}] ` : ''}{getLocName(m)}</span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {needsAlloc && (
                                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                        ⚠️ {t('storage.needsAllocation', 'Needs Allocation')}
                                      </span>
                                    )}
                                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${stock > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500 font-bold'}`}>
                                      {stock > 0 ? `Stock: ${stock}` : 'Out'}
                                    </span>
                                  </div>
                                </div>
                              )
                            };
                          }) : [{ value: 'no-materials', label: t('orders.create.noMaterials', 'No materials available'), disabled: true }]}
                          valueRender={(val: string) => {
                            if (!val || val === 'no-materials') return <span className="text-gray-400 font-normal text-xs">{t('orders.create.selectMaterial', 'Select standalone part...')}</span>;
                            const m = materials?.find((x: any) => x.id === val);
                            return m ? <span className="text-xs font-semibold">{`${m.itemCode ? `[${m.itemCode}] ` : ''}${getLocName(m)}`}</span> : val;
                          }}
                        />
                      </div>

                      <div className="min-w-0">
                        <ModernSelect
                          placeholder={t('materials.selectBrand', 'Select Brand')}
                          inputSize="sm"
                          value={materialBrandSelect}
                          onValueChange={v => handleBrandChange(v as string)}
                          options={activeSelectedMat.brands.map((b: any) => {
                            const bStock = Number(b.brandStocks?.find((s: any) => s.store?.type === 'MINI')?.quantity ?? 0);
                            const label = formatBrandSizeLabel(b);
                            return {
                              value: b.id,
                              label: `${label} (${formatCurrency(b.price)})`,
                              labelNode: (
                                <div className="flex items-center justify-between w-full gap-2">
                                  <span className="truncate">{label} ({formatCurrency(b.price)})</span>
                                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${bStock > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500 font-bold'}`}>
                                    {bStock > 0 ? `Stock: ${bStock}` : 'Out'}
                                  </span>
                                </div>
                              )
                            };
                          })}
                          valueRender={(val: string) => {
                            if (!val) return <span className="text-gray-400 font-normal text-xs">{t('materials.selectBrand', 'Select Brand')}</span>;
                            const b = activeSelectedMat.brands?.find((x: any) => x.id === val);
                            return b ? <span className="text-xs font-semibold">{`${formatBrandSizeLabel(b)} (${formatCurrency(b.price)})`}</span> : val;
                          }}
                        />
                      </div>
                    </div>

                    {/* Row 2: Brand Stock info on left, Stepper + Unit Price + Add Button on right */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0 truncate">
                        {activeSelectedBrand && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 border border-border/60 text-[11px] font-mono truncate">
                            <span className="font-semibold text-foreground truncate">{formatBrandSizeLabel(activeSelectedBrand)}</span>
                            <span className="text-muted-foreground">•</span>
                            <span className={`font-semibold ${activeBrandStock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                              {activeBrandStock > 0 ? `${activeBrandStock} ${formatUnit(activeSelectedMat.unit)} in stock` : 'Out of stock'}
                            </span>
                            <span className="text-muted-foreground">•</span>
                            <span className="font-semibold text-foreground">{formatCurrency(activeMatPrice)}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-auto shrink-0 flex-wrap sm:flex-nowrap">
                        {/* Stepper */}
                        <div className="flex items-center gap-1 bg-card border border-input rounded-md px-1.5 h-9 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const isInt = isUnitIntegerOnly(activeSelectedMat?.unit);
                              setMaterialQty((prev) => {
                                const cur = Number(prev || 1);
                                const next = isInt
                                  ? Math.max(1, Math.floor(cur) - 1)
                                  : Math.max(0.1, Math.round((cur - 1) * 100) / 100);
                                return String(next);
                              });
                            }}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="text"
                            className="w-12 text-center bg-transparent text-xs font-bold font-mono focus:outline-none"
                            value={materialQty}
                            onChange={(e) => {
                              const val = e.target.value;
                              const isInt = isUnitIntegerOnly(activeSelectedMat?.unit);
                              const regex = isInt ? /^\d*$/ : /^\d*\.?\d*$/;
                              if (regex.test(val)) setMaterialQty(val);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const isInt = isUnitIntegerOnly(activeSelectedMat?.unit);
                              setMaterialQty((prev) => {
                                const cur = Number(prev || 0);
                                const next = isInt
                                  ? cur + 1
                                  : Math.round((cur + 1) * 100) / 100;
                                return String(next);
                              });
                            }}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                            title="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Custom Unit Price Input */}
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="relative w-24">
                            <input
                              type="text"
                              placeholder="0.00"
                              value={materialPriceInput}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^\d*\.?\d*$/.test(val)) setMaterialPriceInput(val);
                              }}
                              className="w-full h-9 px-2 pr-7 text-xs font-mono font-bold bg-card border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              title={t('orders.create.unitPrice', 'Unit Price (ETB)')}
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground select-none pointer-events-none">
                              ETB
                            </span>
                          </div>
                          {Number(materialPriceInput) < activeMatPrice && Number(materialPriceInput) > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 whitespace-nowrap">
                              -{formatCurrency(activeMatPrice - Number(materialPriceInput))}
                            </span>
                          )}
                        </div>

                        {(() => {
                          const isPcsMat = isUnitIntegerOnly(activeSelectedMat?.unit);
                          const qtyVal = Number(materialQty);
                          const isQtyValid = Boolean(
                            materialQty &&
                            !isNaN(qtyVal) &&
                            qtyVal > 0 &&
                            (!isPcsMat || Number.isInteger(qtyVal))
                          );

                          return (
                            <Button 
                              variant="gradient"
                              gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                              radius="md"
                              size="sm"
                              onClick={handleAddMaterial} 
                              disabled={!materialSelect || activeMatNeedsAllocation || activeMatStock <= 0 || (Boolean(activeSelectedMat?.brands?.length) && !materialBrandSelect) || !isQtyValid}
                              leftSection={<Plus className="w-3.5 h-3.5" />}
                              style={{
                                boxShadow: (!materialSelect || activeMatNeedsAllocation || activeMatStock <= 0 || !isQtyValid) ? "none" : "0 2px 10px rgba(245, 158, 11, 0.25)",
                                fontWeight: 600,
                                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                                height: 36,
                                flexShrink: 0,
                              }}
                            >
                              Add {activeSelectedMat && `(${formatCurrency((Number(materialPriceInput) || activeMatPrice) * (Number(materialQty) || 1))})`}
                            </Button>
                          );
                        })()}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Unbranded single row */
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <ModernSelect 
                        placeholder={t('orders.create.selectMaterial', 'Select standalone part...')}
                        inputSize="sm"
                        value={materialSelect} 
                        onValueChange={v => handleMaterialChange(v as string)}
                        options={materials?.filter((m: any) => m.isStandaloneSellable).length ? materials.filter((m: any) => m.isStandaloneSellable).map((m: any) => {
                          const stock = getMiniStoreStock(m.id);
                          const unalloc = getMaterialUnallocatedStock(m, 'MINI');
                          const needsAlloc = unalloc > 0;
                          return {
                            value: m.id,
                            label: `${m.itemCode ? `[${m.itemCode}] ` : ''}${getLocName(m)} (${formatCurrency(m.currentPrice)})${needsAlloc ? ` (⚠️ ${t('storage.needsAllocation', 'Needs Allocation')})` : ''}`,
                            labelNode: (
                              <div className="flex items-center justify-between w-full gap-2">
                                <span className="truncate">{m.itemCode ? `[${m.itemCode}] ` : ''}{getLocName(m)}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {needsAlloc && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                      ⚠️ {t('storage.needsAllocation', 'Needs Allocation')}
                                    </span>
                                  )}
                                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${stock > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500 font-bold'}`}>
                                    {stock > 0 ? `Stock: ${stock}` : 'Out'}
                                  </span>
                                </div>
                              </div>
                            )
                          };
                        }) : [{ value: 'no-materials', label: t('orders.create.noMaterials', 'No materials available'), disabled: true }]}
                        valueRender={(val: string) => {
                          if (!val || val === 'no-materials') return <span className="text-gray-400 font-normal text-xs">{t('orders.create.selectMaterial', 'Select standalone part...')}</span>;
                          const m = materials?.find((x: any) => x.id === val);
                          return m ? <span className="text-xs font-semibold">{`${m.itemCode ? `[${m.itemCode}] ` : ''}${getLocName(m)}`}</span> : val;
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Stepper */}
                      <div className="flex items-center gap-1 bg-card border border-input rounded-md px-1.5 h-9 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const isInt = isUnitIntegerOnly(activeSelectedMat?.unit);
                            setMaterialQty((prev) => {
                              const cur = Number(prev || 1);
                              const next = isInt
                                ? Math.max(1, Math.floor(cur) - 1)
                                : Math.max(0.1, Math.round((cur - 1) * 100) / 100);
                              return String(next);
                            });
                          }}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                          title="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="text"
                          className="w-12 text-center bg-transparent text-xs font-bold font-mono focus:outline-none"
                          value={materialQty}
                          onChange={(e) => {
                            const val = e.target.value;
                            const isInt = isUnitIntegerOnly(activeSelectedMat?.unit);
                            const regex = isInt ? /^\d*$/ : /^\d*\.?\d*$/;
                            if (regex.test(val)) setMaterialQty(val);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const isInt = isUnitIntegerOnly(activeSelectedMat?.unit);
                            setMaterialQty((prev) => {
                              const cur = Number(prev || 0);
                              const next = isInt
                                ? cur + 1
                                : Math.round((cur + 1) * 100) / 100;
                              return String(next);
                            });
                          }}
                          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                          title="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Custom Unit Price Input */}
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="relative w-24">
                          <input
                            type="text"
                            placeholder="0.00"
                            value={materialPriceInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (/^\d*\.?\d*$/.test(val)) setMaterialPriceInput(val);
                            }}
                            className="w-full h-9 px-2 pr-7 text-xs font-mono font-bold bg-card border border-input rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            title={t('orders.create.unitPrice', 'Unit Price (ETB)')}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground select-none pointer-events-none">
                            ETB
                          </span>
                        </div>
                        {Number(materialPriceInput) < activeMatPrice && Number(materialPriceInput) > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 whitespace-nowrap">
                            -{formatCurrency(activeMatPrice - Number(materialPriceInput))}
                          </span>
                        )}
                      </div>

                      {(() => {
                        const isPcsMat = isUnitIntegerOnly(activeSelectedMat?.unit);
                        const qtyVal = Number(materialQty);
                        const isQtyValid = Boolean(
                          materialQty &&
                          !isNaN(qtyVal) &&
                          qtyVal > 0 &&
                          (!isPcsMat || Number.isInteger(qtyVal))
                        );

                        return (
                          <Button 
                            variant="gradient"
                            gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                            radius="md"
                            size="sm"
                            onClick={handleAddMaterial} 
                            disabled={!materialSelect || activeMatNeedsAllocation || activeMatStock <= 0 || !isQtyValid}
                            leftSection={<Plus className="w-3.5 h-3.5" />}
                            style={{
                              boxShadow: (!materialSelect || activeMatNeedsAllocation || activeMatStock <= 0 || !isQtyValid) ? "none" : "0 2px 10px rgba(245, 158, 11, 0.25)",
                              fontWeight: 600,
                              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                              height: 36,
                              flexShrink: 0,
                            }}
                          >
                            Add {activeSelectedMat && `(${formatCurrency((Number(materialPriceInput) || activeMatPrice) * (Number(materialQty) || 1))})`}
                          </Button>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeAddMode === 'material' && activeMatNeedsAllocation && (
              <div className="mt-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 text-xs text-amber-700 dark:text-amber-400 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    {t('storage.unallocatedOrderBlocked', {
                      unallocated: activeMatUnallocated,
                      defaultValue: `This material has ${activeMatUnallocated} unallocated stock in Mini Store. It must be allocated across brands in Storage before it can be added to an order.`
                    })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const searchTarget = (i18n.language === 'am' && activeSelectedMat?.nameAm) ? activeSelectedMat.nameAm : (activeSelectedMat?.nameEn || activeSelectedMat?.itemCode || '');
                    navigate(`/storage?search=${encodeURIComponent(searchTarget)}&store=MINI&allocate=true&materialId=${activeSelectedMat?.id}`);
                  }}
                  className="shrink-0 font-bold underline text-amber-600 hover:text-amber-700 dark:text-amber-400 text-xs flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                >
                  <span>{t('storage.allocate', 'Allocate')}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {activeAddMode === 'staff' && (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1">
                    <ModernSelect 
                      placeholder={t('orders.create.placeholder.employee', 'Select employee...')}
                      inputSize="sm"
                      value={employeeSelect} 
                      onValueChange={v => setEmployeeSelect(v as string)}
                      options={employees?.filter((e: any) => e.employee && !selectedAssignments.some(a => a.employeeId === e.employee.id)).length ? employees.filter((e: any) => e.employee && !selectedAssignments.some(a => a.employeeId === e.employee.id)).map((e: any) => ({
                        value: e.employee.id,
                        label: `${e.name} (${e.role})`
                      })) : [{ value: 'no-employees', label: t('orders.create.noEmployees', 'No employees available'), disabled: true }]}
                      valueRender={(val: string) => {
                        if (!val || val === 'no-employees') return <span className="text-gray-400 font-normal text-xs">{t('orders.create.selectEmployee')}</span>;
                        const e = employees?.find((x: any) => x.employee?.id === val);
                        return e ? <span className="text-xs font-semibold">{`${e.name} (${e.role})`}</span> : val;
                      }}
                    />
                  </div>

                  <div className="sm:w-36 shrink-0">
                    <ModernInput 
                      value={roleInput} 
                      onChange={e => setRoleInput(e.target.value)} 
                      inputSize="sm"
                      placeholder={t('orders.create.role', 'Role')} 
                    />
                  </div>

                  <Button 
                    variant="gradient"
                    gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                    radius="md"
                    size="sm"
                    onClick={handleAddAssignment} 
                    disabled={!employeeSelect}
                    leftSection={<Plus className="w-3.5 h-3.5" />}
                    style={{
                      boxShadow: !employeeSelect ? "none" : "0 2px 10px rgba(245, 158, 11, 0.25)",
                      fontWeight: 600,
                      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                      height: 36,
                      flexShrink: 0,
                    }}
                  >
                    Assign
                  </Button>
                </div>

                {/* Quick Role Suggestions Grid */}
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    {t('orders.create.quickRoles', 'Roles')}:
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
                    {QUICK_ROLES.map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setRoleInput(role)}
                        className={`py-1 px-1 rounded-md text-[10px] font-medium border text-center transition-all truncate ${
                          roleInput === role 
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs font-bold' 
                            : 'bg-card text-muted-foreground hover:text-foreground border-border/80 hover:bg-muted/60'
                        }`}
                        title={role}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Middle Section: Live Order Cart & Manifest (Clean container with ZERO scrollbar when empty!) */}
          <div className="flex-1 min-h-0 flex flex-col p-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider pb-1.5 border-b border-border/50 shrink-0">
              <span className="flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-primary" />
                <span>Work Order Manifest</span>
              </span>
              <span>{totalItemsCount} items • {selectedAssignments.length} staff</span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pt-2">
              {totalItemsCount === 0 && selectedAssignments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-4 text-center text-muted-foreground select-none">
                  <div className="p-2.5 rounded-full bg-muted/60 border border-border/60 mb-2">
                    <Wrench className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                  <div className="font-bold text-xs text-foreground">Order Manifest is Empty</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 max-w-xs">
                    Choose a service, spare part, or assign a technician using the tabs above.
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 pr-1 pb-1">
                  {/* 1. Services Section */}
                  {selectedServices.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                        <Wrench className="w-3 h-3" />
                        <span>Services ({selectedServices.length})</span>
                      </div>
                      <div className="space-y-1">
                        {selectedServices.map(s => {
                          const hasDiscount = s.price < s.standardPrice;
                          return (
                            <div 
                              key={s.tempId} 
                              className="flex items-center justify-between p-2 rounded-lg bg-card border border-border hover:border-blue-500/30 transition-all shadow-2xs group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="p-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                                  <Wrench className="w-3.5 h-3.5" />
                                </span>
                                <div className="min-w-0">
                                  <span className="font-semibold text-xs text-foreground truncate block">{s.name}</span>
                                  {s.selectedMaterials && s.selectedMaterials.some((m: any) => m.brandName) && (
                                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                      {s.selectedMaterials.filter((m: any) => m.brandName).map((m: any, idx: number) => (
                                        <span key={idx} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted/60 border border-border/60 text-muted-foreground">
                                          {m.materialName ? `${m.materialName}: ` : ''}{formatBrandSizeLabel({ name: m.brandName, size: m.sizeName, color: m.colorName, type: m.typeName })}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {hasDiscount && (
                                    <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                                      <span className="line-through text-muted-foreground font-mono">{formatCurrency(s.standardPrice)}</span>
                                      <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                                        -{formatCurrency(s.standardPrice - s.price)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-bold text-xs text-foreground font-mono">{formatCurrency(s.price)}</span>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setEditingCartItem({
                                      type: 'service',
                                      tempId: s.tempId,
                                      name: s.name,
                                      price: s.price,
                                      standardPrice: s.standardPrice,
                                    });
                                    setEditCartPriceInput(s.price > 0 ? String(s.price) : '');
                                  }}
                                  className="p-1 rounded text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 opacity-70 group-hover:opacity-100 transition-opacity"
                                  title={t('orders.adjustPrice', 'Adjust Price / Discount')}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => setSelectedServices(selectedServices.filter(x => x.tempId !== s.tempId))} 
                                  className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-70 group-hover:opacity-100 transition-opacity"
                                  title="Remove service"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. Parts & Materials Section */}
                  {selectedMaterials.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        <span>Direct Parts & Materials ({selectedMaterials.length})</span>
                      </div>
                      <div className="space-y-1">
                        {selectedMaterials.map(m => {
                          const hasDiscount = m.price < m.standardPrice;
                          return (
                            <div 
                              key={m.tempId} 
                              className="flex items-center justify-between p-2 rounded-lg bg-card border border-border hover:border-amber-500/30 transition-all shadow-2xs group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="p-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                                  <Layers className="w-3.5 h-3.5" />
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-xs text-foreground truncate block">{m.name}</span>
                                    {(m.brandName || m.sizeName || m.colorName || m.typeName) && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                                        {formatBrandSizeLabel({ name: m.brandName, size: m.sizeName, color: m.colorName, type: m.typeName })}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      {m.qty} &times; {formatCurrency(m.price)}
                                    </span>
                                    {hasDiscount && (
                                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                                        -{formatCurrency((m.standardPrice - m.price) * m.qty)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="font-bold text-xs text-foreground font-mono">{formatCurrency(m.price * m.qty)}</span>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setEditingCartItem({
                                      type: 'material',
                                      tempId: m.tempId,
                                      name: `${m.name}${(m.brandName || m.sizeName || m.colorName || m.typeName) ? ` (${formatBrandSizeLabel({ name: m.brandName, size: m.sizeName, color: m.colorName, type: m.typeName })})` : ''}`,
                                      price: m.price,
                                      standardPrice: m.standardPrice,
                                    });
                                    setEditCartPriceInput(m.price > 0 ? String(m.price) : '');
                                  }}
                                  className="p-1 rounded text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 opacity-70 group-hover:opacity-100 transition-opacity"
                                  title={t('orders.adjustPrice', 'Adjust Price / Discount')}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => setSelectedMaterials(selectedMaterials.filter(x => x.tempId !== m.tempId))} 
                                  className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-70 group-hover:opacity-100 transition-opacity"
                                  title="Remove material"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Assigned Staff Section */}
                  {selectedAssignments.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>Assigned Technicians ({selectedAssignments.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {selectedAssignments.map(a => (
                          <div 
                            key={a.tempId} 
                            className="flex items-center justify-between p-2 rounded-lg bg-card border border-border hover:border-purple-500/30 transition-all shadow-2xs group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 font-extrabold text-[10px] flex items-center justify-center shrink-0 border border-purple-500/20">
                                {a.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-foreground truncate">{a.name}</div>
                                <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">{a.role}</div>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setSelectedAssignments(selectedAssignments.filter(x => x.tempId !== a.tempId))} 
                              className="p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 opacity-70 group-hover:opacity-100 transition-opacity"
                              title="Remove assignment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Pinned Settlement Footer */}
          <div className="p-3 px-4 bg-muted/40 border-t border-border/80 space-y-2.5 shrink-0">
            {/* Down Payment (Advance) Section */}
            <div className="p-2.5 rounded-xl bg-card border border-border space-y-2 shadow-2xs">
              {/* Top Sub-Row: Label on Left, Primary-Themed Micro-Pill Segment on Right */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Banknote className="w-3.5 h-3.5 text-primary" />
                  <span>{t('orders.create.downPayment', 'Advance Payment')}</span>
                  <span className="text-[10px] text-muted-foreground font-normal hidden sm:inline">
                    ({t('orders.create.deducted', 'deducted from total')})
                  </span>
                </div>

                {/* Sleek Primary-Themed Micro-Pill Segment */}
                <div className="inline-flex items-center p-[2px] rounded-md bg-muted/70 border border-border/50 gap-0.5 shrink-0">
                  {[
                    { label: '0%', factor: 0 },
                    { label: '25%', factor: 0.25 },
                    { label: '50%', factor: 0.5 },
                    { label: '100%', factor: 1 },
                  ].map((p) => {
                    const isSelected = p.factor === 0
                      ? (!downPayment || Number(downPayment) === 0)
                      : (totalOrderAmount > 0 && Math.abs(downPaymentAmount - Math.round(totalOrderAmount * p.factor)) < 1);
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          if (p.factor === 0) {
                            setDownPayment('');
                          } else {
                            if (totalOrderAmount <= 0) return;
                            setDownPayment(String(Math.round(totalOrderAmount * p.factor)));
                          }
                        }}
                        className={`px-1.5 py-0.5 text-[9px] font-bold rounded transition-all cursor-pointer select-none leading-none ${
                          isSelected
                            ? 'bg-primary text-primary-foreground font-extrabold shadow-2xs'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                        }`}
                        title={p.factor === 0 ? 'Clear advance' : `Set ${p.label} of total`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Sub-Row: Unified ModernInput & ModernSelect Fields */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* 1. Amount input */}
                <div className="relative flex-1 min-w-[120px]">
                  <ModernInput
                    icon={Banknote}
                    inputSize="sm"
                    type="text"
                    placeholder="0.00"
                    value={downPayment}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d*$/.test(val)) setDownPayment(val);
                    }}
                    className={`font-mono font-bold pr-11 text-xs ${
                      isDownPaymentInvalid ? '!border-destructive !ring-destructive/20 text-destructive' : ''
                    }`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-muted-foreground select-none pointer-events-none">
                    ETB
                  </span>
                </div>

                {/* 2. Payment Method Select */}
                <div className="w-[145px] sm:w-[160px] shrink-0">
                  <ModernSelect
                    inputSize="sm"
                    icon={getPaymentMethodIcon(downPaymentMethod)}
                    options={paymentMethodOptions}
                    value={downPaymentMethod}
                    onValueChange={(val: any) => setDownPaymentMethod(val as any)}
                    valueRender={renderPaymentMethodValue}
                    triggerClassName="font-semibold"
                  />
                </div>

                {/* 3. Reference / Transaction ID Input (Only shown for Bank or Mobile) */}
                {(downPaymentMethod === 'BANK_TRANSFER' || downPaymentMethod === 'MOBILE_MONEY') && (
                  <div className="flex-1 min-w-[120px] animate-in fade-in zoom-in-95 duration-150">
                    <ModernInput
                      icon={Hash}
                      inputSize="sm"
                      type="text"
                      placeholder={t('orders.create.refNumber', 'Ref / Txn #')}
                      value={downPaymentRef}
                      onChange={(e) => setDownPaymentRef(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Error banner if down payment exceeds total */}
            {isDownPaymentInvalid && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{t('orders.create.downPaymentExceeds', 'Down payment cannot exceed the total order amount.')}</span>
              </div>
            )}

            {/* Row 2: Financial tally & Submit Button */}
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/50">
              <div className="flex items-center gap-3 text-xs flex-wrap">
                {/* Items & Service Fee breakdown if fee is set */}
                {serviceFeeAmount > 0 && (
                  <>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-muted-foreground block leading-none">
                        Items
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground font-mono">
                        {formatCurrency(totalOrderAmount - serviceFeeAmount)}
                      </span>
                    </div>
                    <span className="text-muted-foreground font-bold">+</span>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-amber-600 dark:text-amber-400 block leading-none">
                        Fee
                      </span>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {formatCurrency(serviceFeeAmount)}
                      </span>
                    </div>
                    <span className="text-muted-foreground font-bold">=</span>
                  </>
                )}

                {/* Total */}
                <div>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block leading-none">
                    {t('orders.create.orderTotal', 'Order Total')}
                  </span>
                  <span className="text-sm font-bold text-foreground font-mono">
                    {formatCurrency(totalOrderAmount)}
                  </span>
                </div>

                {/* Down Payment deducted */}
                {downPaymentAmount > 0 && !isDownPaymentInvalid && (
                  <>
                    <span className="text-muted-foreground font-bold">-</span>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block leading-none">
                        Advance ({t('orders.create.deducted', 'deducted')})
                      </span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrency(downPaymentAmount)}
                      </span>
                    </div>
                  </>
                )}

                {/* Balance Due */}
                <span className="text-muted-foreground font-bold">=</span>
                <div>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground block leading-none">
                    {t('orders.create.balanceDue', 'Remaining Balance')}
                  </span>
                  <span className={`text-base font-black font-mono leading-tight ${
                    remainingBalanceDue === 0 && totalOrderAmount > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isDownPaymentInvalid
                      ? 'text-red-500'
                      : 'text-amber-500'
                  }`}>
                    {formatCurrency(remainingBalanceDue)}
                  </span>
                </div>

                {/* Target Deadline Tag if chosen */}
                {deadline && (
                  <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                    <Clock className="w-3 h-3" />
                    <span>Due: {formatAppDate(deadline, true)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Service Fee on the left of Submit */}
                {!showServiceFee && (!serviceFee || Number(serviceFee) === 0) ? (
                  <button
                    type="button"
                    onClick={() => setShowServiceFee(true)}
                    className="h-[38px] px-2.5 rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer hover:border-amber-500/70 shadow-2xs shrink-0"
                    title={t('orders.create.addServiceFee', 'Add Service Fee')}
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{t('orders.create.addServiceFee', 'Add Service Fee')}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 h-[38px] px-2 rounded-md bg-card border border-amber-500/50 shadow-2xs animate-in fade-in zoom-in-95 duration-150 shrink-0">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 select-none">
                      <Receipt className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{t('orders.create.serviceFee', 'Fee')}:</span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="0.00"
                        value={serviceFee}
                        autoFocus
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^\d*\.?\d*$/.test(val)) setServiceFee(val);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="w-20 h-7 px-2 pr-6 text-xs font-mono font-bold bg-muted/60 hover:bg-muted focus:bg-background border border-input rounded text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
                      />
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-muted-foreground select-none pointer-events-none">
                        ETB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setServiceFee('');
                        setShowServiceFee(false);
                      }}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                      title={t('common.remove', 'Remove')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <Button 
                  variant="gradient"
                  gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                  radius="md"
                  size="sm"
                  loading={submitOrderMutation.isPending}
                  disabled={!isFormValid || isDownPaymentInvalid || submitOrderMutation.isPending}
                  onClick={() => submitOrderMutation.mutate()} 
                  leftSection={<Check className="w-4 h-4" />}
                  style={{
                    boxShadow: (!isFormValid || isDownPaymentInvalid || submitOrderMutation.isPending) ? "none" : "0 2px 10px rgba(245, 158, 11, 0.25)",
                    fontWeight: 600,
                    fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                    letterSpacing: "-0.01em",
                    height: 38,
                    paddingLeft: 20,
                    paddingRight: 20,
                    flexShrink: 0,
                  }}
                >
                  {t('orders.create.submitOrder', 'Submit Order')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VEHICLE PRE-INSPECTION MODAL CHECKLIST                   */}
      {/* ========================================================= */}
      <Dialog open={isInspectionModalOpen} onOpenChange={setIsInspectionModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-4 gap-3 bg-card border border-border">
          <DialogHeader className="gap-1 pb-2 border-b border-border/60 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-sm sm:text-base font-extrabold text-foreground">
                  {t('orders.create.inspectionModalTitle', 'Vehicle Pre-Inspection Checklist')}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {t('orders.create.inspectionModalDesc', 'Check any existing scratches, dents, or defects to protect the shop before service begins.')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Modal Tab Switcher */}
          <div className="flex items-center gap-1 p-0.5 bg-muted/60 rounded-lg border border-border/50 shrink-0">
            <button
              type="button"
              onClick={() => setInspectionModalTab('exterior')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-[11px] font-medium transition-all ${
                inspectionModalTab === 'exterior'
                  ? 'bg-card text-foreground font-bold shadow-2xs border border-border/80 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Car className="w-3.5 h-3.5 text-blue-500" />
              <span>{t('orders.create.exteriorTab', 'Exterior Body & Glass')}</span>
              {exteriorSelectedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-blue-500/15 text-blue-600 dark:text-blue-400 font-mono font-bold">
                  {exteriorSelectedCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setInspectionModalTab('interior')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-[11px] font-medium transition-all ${
                inspectionModalTab === 'interior'
                  ? 'bg-card text-foreground font-bold shadow-2xs border border-border/80 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('orders.create.interiorTab', 'Interior & Electrical')}</span>
              {interiorSelectedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-bold">
                  {interiorSelectedCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setInspectionModalTab('custom')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md text-[11px] font-medium transition-all ${
                inspectionModalTab === 'custom'
                  ? 'bg-card text-foreground font-bold shadow-2xs border border-border/80 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5 text-purple-500" />
              <span>{t('orders.create.customDefectTab', 'Custom Defect')}</span>
              {customConditionName.trim() && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-purple-500/15 text-purple-600 dark:text-purple-400 font-mono font-bold">
                  1
                </span>
              )}
            </button>
          </div>

          {/* Tab 1: Exterior & Glass Checklist */}
          {inspectionModalTab === 'exterior' && (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {exteriorStatuses.map((cs: any) => {
                  const isSelected = selectedCarStatusIds.includes(cs.id);
                  return (
                    <div
                      key={cs.id}
                      onClick={() => {
                        setSelectedCarStatusIds(prev => 
                          prev.includes(cs.id) ? prev.filter(id => id !== cs.id) : [...prev, cs.id]
                        );
                      }}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/50 text-amber-950 dark:text-amber-200 font-bold shadow-2xs'
                          : 'bg-card border-border/70 text-foreground hover:bg-muted/50 hover:border-border font-medium'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-amber-500 border-amber-600 text-white'
                          : 'border-muted-foreground/30 bg-background'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs leading-snug">{t(`carStatus.${cs.name}`) || cs.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Interior & Electrical Checklist */}
          {inspectionModalTab === 'interior' && (
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {interiorStatuses.map((cs: any) => {
                  const isSelected = selectedCarStatusIds.includes(cs.id);
                  return (
                    <div
                      key={cs.id}
                      onClick={() => {
                        setSelectedCarStatusIds(prev => 
                          prev.includes(cs.id) ? prev.filter(id => id !== cs.id) : [...prev, cs.id]
                        );
                      }}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/50 text-amber-950 dark:text-amber-200 font-bold shadow-2xs'
                          : 'bg-card border-border/70 text-foreground hover:bg-muted/50 hover:border-border font-medium'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-amber-500 border-amber-600 text-white'
                          : 'border-muted-foreground/30 bg-background'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs leading-snug">{t(`carStatus.${cs.name}`) || cs.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 3: Custom Defect */}
          {inspectionModalTab === 'custom' && (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 p-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Custom Defect Title</Label>
                <ModernInput
                  inputSize="sm"
                  placeholder="e.g. Scratched alloy rims, loose spoiler, missing hubcap"
                  value={customConditionName}
                  onChange={e => setCustomConditionName(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Specify any uncommon defect or pre-existing condition not covered in the standard checklist above.
                </p>
              </div>
            </div>
          )}

          {/* Global Intake Notes & Vehicle Observations (Pinned across all tabs) */}
          <div className="pt-2 border-t border-border/60 space-y-1.5 shrink-0">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 text-primary" />
                <span>{t('orders.create.globalIntakeNotes', 'General Intake Notes & Observations')}</span>
              </Label>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                Fuel level, tools in trunk, personal items, overall condition
              </span>
            </div>
            <textarea
              className="flex min-h-[56px] h-[64px] w-full rounded-lg border border-input bg-muted/20 px-3 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary resize-none transition-all"
              placeholder={t('orders.create.conditionDescription', 'Intake notes (tools left in trunk, fuel level, personal items, overall body condition...)')}
              value={customConditionDesc}
              onChange={e => setCustomConditionDesc(e.target.value)}
            />
          </div>

          {/* Modal Footer */}
          <DialogFooter className="pt-2 border-t border-border/60 flex items-center justify-between sm:justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">
                {selectedCarStatusIds.length + (customConditionName.trim() ? 1 : 0) + (customConditionDesc.trim() ? 1 : 0)} notes/defects logged
              </span>
              {(selectedCarStatusIds.length > 0 || customConditionName.trim() || customConditionDesc.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCarStatusIds([]);
                    setCustomConditionName('');
                    setCustomConditionDesc('');
                  }}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-red-500 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                radius="md"
                size="sm"
                onClick={() => setIsInspectionModalOpen(false)}
                style={{
                  fontWeight: 600,
                  fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                  height: 36,
                }}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                variant="gradient"
                gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                radius="md"
                size="sm"
                onClick={() => setIsInspectionModalOpen(false)}
                leftSection={<Check className="w-3.5 h-3.5" />}
                style={{
                  boxShadow: "0 2px 10px rgba(245, 158, 11, 0.25)",
                  fontWeight: 600,
                  fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                  height: 36,
                }}
              >
                {t('orders.create.saveInspection', 'Done / Save Inspection')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Adjustment Dialog for Manifest Items */}
      <Dialog 
        open={!!editingCartItem} 
        onOpenChange={(open) => !open && setEditingCartItem(null)}
        hasUnsavedChanges={editingCartItem ? Number(editCartPriceInput) !== editingCartItem.standardPrice : false}
      >
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
                <DialogDescription className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  {t('orders.adjustPriceDesc', 'Override standard catalog pricing for this item or offer a customer-specific discount.')}
                </DialogDescription>
              </div>
            </div>
          </div>

          {editingCartItem && (() => {
            const parsed = Number(editCartPriceInput);
            const isValid = !isNaN(parsed) && parsed >= 0;
            const diff = isValid ? editingCartItem.standardPrice - parsed : 0;
            const isDiscount = diff > 0;
            const isSurcharge = diff < 0;

            return (
              <>
                <div className="p-4 sm:p-5 space-y-4">
                  {/* Item Info Box */}
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {editingCartItem.type === 'service' ? t('common.service', 'Service Line') : t('orders.detail.partMaterial', 'Part / Material')}
                      </span>
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {t('orders.standardPrice', 'Standard')}: {formatCurrency(editingCartItem.standardPrice)}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-foreground break-words leading-snug">
                      {editingCartItem.name}
                    </div>
                  </div>

                  {/* Price input box */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">
                        {t('orders.agreedPrice', 'Agreed Custom Price')}
                      </Label>
                      {Number(editCartPriceInput) !== editingCartItem.standardPrice && (
                        <button
                          type="button"
                          onClick={() => setEditCartPriceInput(String(editingCartItem.standardPrice))}
                          className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                        >
                          Reset to Standard
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        className="w-full h-10 px-3 pr-12 text-sm font-mono font-bold bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                        value={editCartPriceInput}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (/^0[0-9]/.test(val)) val = val.replace(/^0+/, '');
                          if (/^\d*\.?\d*$/.test(val)) setEditCartPriceInput(val);
                        }}
                        placeholder="—"
                        autoFocus
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-muted-foreground select-none pointer-events-none">
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
                        {isDiscount && `-${formatCurrency(diff)} (${Math.round((diff / editingCartItem.standardPrice) * 100)}% off)`}
                        {isSurcharge && `+${formatCurrency(Math.abs(diff))}`}
                        {!isDiscount && !isSurcharge && t('common.noChange', 'No change')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 sm:p-5 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2.5">
                  <Button
                    variant="default"
                    radius="md"
                    size="sm"
                    onClick={() => setEditingCartItem(null)}
                    style={{
                      fontWeight: 600,
                      height: 36,
                    }}
                  >
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button
                    variant="gradient"
                    gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                    radius="md"
                    size="sm"
                    disabled={!isValid}
                    onClick={() => {
                      if (!isValid) return;
                      if (editingCartItem.type === 'service') {
                        setSelectedServices(prev => prev.map(s => 
                          s.tempId === editingCartItem.tempId ? { ...s, price: parsed } : s
                        ));
                      } else {
                        setSelectedMaterials(prev => prev.map(m => 
                          m.tempId === editingCartItem.tempId ? { ...m, price: parsed } : m
                        ));
                      }
                      toast.success(t('orders.priceUpdated', 'Item price updated'));
                      setEditingCartItem(null);
                    }}
                    style={{
                      fontWeight: 600,
                      height: 36,
                      boxShadow: isValid ? "0 2px 10px rgba(245, 158, 11, 0.25)" : "none",
                    }}
                  >
                    {t('common.save', 'Save Price')}
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
