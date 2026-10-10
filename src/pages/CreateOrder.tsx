import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { ModernButton } from '../components/ui/modern-button';
import { ModernInput } from '../components/ui/modern-input';
import { ModernSelect } from '../components/ui/modern-select';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';
import { Car, Settings2, Users, Plus, Trash2, User, Phone } from 'lucide-react';

import EthiopianPlateInput from '../components/EthiopianPlateInput';
import { parsePlateNumber, formatPlateNumber } from '../utils/plate';
import { useTranslation } from 'react-i18next';

export default function CreateOrder() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const getLocName = (item: any) =>
    i18n?.language === 'am' && item?.nameAm ? item.nameAm : (item?.nameEn || item?.name || '');

  // Forms
  const [plateNumber, setPlateNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [carModelId, setCarModelId] = useState('');

  // Vehicle Condition
  const [selectedCarStatusIds, setSelectedCarStatusIds] = useState<string[]>([]);
  const [customConditionName, setCustomConditionName] = useState('');
  const [customConditionDesc, setCustomConditionDesc] = useState('');

  // Lists
  const [selectedServices, setSelectedServices] = useState<{ tempId: number; categoryId: string; name: string; price: number }[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<{ tempId: number; materialId: string; name: string; qty: number; price: number }[]>([]);
  const [selectedAssignments, setSelectedAssignments] = useState<{ tempId: number; employeeId: string; name: string; role: string }[]>([]);

  // Selection Inputs
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [materialSelect, setMaterialSelect] = useState('');
  const [materialQty, setMaterialQty] = useState('1');
  const [employeeSelect, setEmployeeSelect] = useState('');
  const [roleInput, setRoleInput] = useState('Technician');

  // Data Fetching
  const { data: carModels } = useQuery({ queryKey: ['car-models'], queryFn: async () => (await api.get('/catalog/car-models')).data });
  const { data: carStatuses } = useQuery({ queryKey: ['car-statuses'], queryFn: async () => (await api.get('/catalog/car-statuses')).data });
  const { data: services } = useQuery({ queryKey: ['services'], queryFn: async () => (await api.get('/catalog/services')).data });
  const { data: materials } = useQuery({ queryKey: ['materials'], queryFn: async () => (await api.get('/catalog/materials')).data });
  const { data: employees } = useQuery({ queryKey: ['users'], queryFn: async () => (await api.get('/users')).data });

  const selectedService = services?.find((s: any) => s.id === selectedServiceId);
  const categoriesForSelectedService = selectedService?.categories || [];

  // Auto-Search Vehicle by Plate Number
  const [, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
  const [matchingVehicles, setMatchingVehicles] = useState<any[]>([]);
  const [lastAutoFilledVehicleId, setLastAutoFilledVehicleId] = useState<string | null>(null);

  useEffect(() => {
    if (searchStatus === 'found') {
      const t = setTimeout(() => setSearchStatus('idle'), 3000);
      return () => clearTimeout(t);
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
            setPlateNumber(exactMatch.plateNumber); // Format correctly
            setMatchingVehicles([]);
            setSearchStatus('found');
            
            if (lastAutoFilledVehicleId !== exactMatch.id) {
              setLastAutoFilledVehicleId(exactMatch.id);
              toast.success(t('orders.validation.vehicleFound'));
            }
          } else if (vehicles.length > 1) {
            setMatchingVehicles(vehicles);
            setSearchStatus('idle'); // Leave idle until they select one
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

  // Mutations
  const submitOrderMutation = useMutation({
    mutationFn: async () => {
      if (!plateNumber || !customerName || !customerPhone || !carModelId) {
        throw new Error(t('orders.validation.customerVehicleRequired'));
      }

      // 1. Create Order
      const res = await api.post('/orders', {
        customerName,
        customerPhone,
        plateNumber,
        carModelId,
      });
      const orderId = res.data.id;

      // 2. Add Conditions
      for (const id of selectedCarStatusIds) {
        await api.post(`/orders/${orderId}/car-status`, {
          carStatusId: id,
        });
      }
      
      if (customConditionName) {
        await api.post(`/orders/${orderId}/car-status`, {
          customName: customConditionName,
          customDescription: customConditionDesc || undefined,
        });
      }

      // 3. Add Services
      for (const s of selectedServices) {
        await api.post(`/orders/${orderId}/services`, { serviceCategoryId: s.categoryId, priceMultiplier: 1 });
      }

      // 4. Add Materials
      for (const m of selectedMaterials) {
        await api.post(`/orders/${orderId}/standalone-items`, { materialId: m.materialId, quantity: m.qty });
      }

      // 5. Add Assignments
      for (const a of selectedAssignments) {
        await api.post(`/orders/${orderId}/assignments`, { employeeId: a.employeeId, roleLabel: a.role });
      }

      return orderId;
    },
    onSuccess: () => {
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
    } else {
      setSelectedCategoryId('');
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
      // Validate stock for materials used by this service
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

      setSelectedServices([...selectedServices, { tempId: Date.now(), categoryId: cat.id, name: getLocName(selectedService) + ' - ' + getLocName(cat), price: Number(cat.price) }]);
      setSelectedCategoryId('');
    }
  };

  const handleAddMaterial = () => {
    const qtyNum = Number(materialQty);
    if (!materialSelect || isNaN(qtyNum) || qtyNum <= 0) return;
    const mat = materials?.find((m: any) => m.id === materialSelect);
    if (mat) {
      const currentReqs = getCurrentMaterialRequirements();
      const currentTotal = currentReqs.get(mat.id)?.totalNeeded || 0;
      const available = getMiniStoreStock(mat.id);
      
      if (currentTotal + qtyNum > available) {
        toast.error(t('orders.validation.notEnoughStock', { needed: currentTotal + qtyNum, available }));
        return;
      }

      setSelectedMaterials([...selectedMaterials, { tempId: Date.now(), materialId: mat.id, name: getLocName(mat), qty: qtyNum, price: Number(mat.currentPrice) }]);
      setMaterialSelect('');
      setMaterialQty('1');
    }
  };

  const handleAddAssignment = () => {
    if (!employeeSelect || !roleInput) return;
    if (selectedAssignments.some(a => a.employeeId === employeeSelect)) return;
    const emp = employees?.find((e: any) => e.employee?.id === employeeSelect);
    if (emp) {
      setSelectedAssignments([...selectedAssignments, { tempId: Date.now(), employeeId: emp.employee.id, name: emp.name, role: roleInput }]);
      setEmployeeSelect('');
      setRoleInput('Technician');
    }
  };

  const calculateTotal = () => {
    const sTotal = selectedServices.reduce((acc, s) => acc + s.price, 0);
    const mTotal = selectedMaterials.reduce((acc, m) => acc + (m.price * m.qty), 0);
    return sTotal + mTotal;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('orders.createNew')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">{t('orders.create.subtitle', 'Fill in the details below to create a comprehensive service order.')}</p>
        </div>
        <ModernButton 
          size="md" 
          onClick={() => submitOrderMutation.mutate()} 
          isLoading={submitOrderMutation.isPending}
        >
          {t('orders.create.submitOrder')}
        </ModernButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Customer & Vehicle */}
        <div className="lg:col-span-5 space-y-6">
          <div className="relative rounded-xl p-[2px] transition-all duration-500 overflow-hidden shadow-sm">
            {/* Solid Background Color */}
            <div className={`absolute inset-0 transition-colors duration-1000 ease-in-out z-0 ${
               searchStatus === 'found' ? 'bg-green-500' : 
               searchStatus === 'not_found' ? 'bg-gray-300 dark:bg-gray-700' : 
               'bg-gray-200 dark:bg-gray-800'
            }`}></div>
            
            {/* Animated Search Border Background Overlay */}
            <div className={`absolute top-1/2 left-1/2 w-[1500px] h-[1500px] -translate-x-1/2 -translate-y-1/2 animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#3b82f6_50%,transparent_100%)] dark:bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#3b82f6_50%,transparent_100%)] z-0 transition-opacity duration-700 ${searchStatus === 'searching' ? 'opacity-100' : 'opacity-0'}`}></div>

            <Card className="relative z-10 w-full h-full border-0 bg-white dark:bg-[#161616] rounded-[10px]">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Car className="w-5 h-5 text-primary" />
                {t('orders.create.customerVehicleDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 relative z-50">
                <Label>{t('orders.create.plateNumberLabel')}</Label>
                  <div className="relative">
                    <EthiopianPlateInput 
                      value={plateNumber} 
                      onChange={setPlateNumber} 
                      isSearching={searchStatus === 'searching'}
                    />
                  </div>
                  
                  {matchingVehicles.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                      <div className="px-3 py-2 bg-gray-50 dark:bg-[#111111] border-b border-gray-100 dark:border-gray-800 text-xs font-bold uppercase tracking-wider text-gray-500">
                        {t('orders.create.selectMatchingVehicle')}
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {matchingVehicles.map(v => (
                          <div 
                            key={v.id} 
                            onClick={() => selectVehicle(v)}
                            className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-[#222222] cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors"
                          >
                            <div>
                              <div className="font-bold text-primary">{formatPlateNumber(v.plateNumber)}</div>
                              <div className="text-sm font-medium">{v.customer.name}</div>
                            </div>
                            <div className="text-right text-xs text-gray-500">
                              <div>{v.customer.phoneNumber}</div>
                              <div>{v.carModel.brand.name} {v.carModel.name}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <ModernInput
                  label={t('orders.create.customerName')}
                  icon={User}
                  placeholder={t('orders.create.placeholder.name', 'John Doe')}
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                />
                <ModernInput
                  label={t('orders.create.phoneNumber')}
                  icon={Phone}
                  placeholder={t('orders.create.placeholder.phone', '0911...')}
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                />
              </div>
              <ModernSelect
                label={t('orders.create.carModel')}
                icon={Car}
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
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{c.name}</span>
                      <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 shrink-0 uppercase tracking-wider">
                        {c.brand.name}
                      </span>
                    </div>
                  )
                })) : [{ value: 'no-cars', label: t('orders.create.noCarsAvailable'), disabled: true }]}
                valueRender={(val: string) => {
                  if (!val || val === 'no-cars') return <span className="text-gray-400 font-normal">{t('orders.create.selectCarModel')}</span>;
                  const c = carModels?.find((x: any) => x.id === val);
                  return c ? (
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{c.name}</span>
                      <span className="inline-flex items-center px-1.5 py-0 rounded-full text-[9px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 shrink-0 uppercase tracking-wider">
                        {c.brand.name}
                      </span>
                    </div>
                  ) : val;
                }}
              />
            </CardContent>
          </Card>
          </div>

          <Card className="shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161616] rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="w-5 h-5 text-primary" />
                {t('orders.create.vehicleCondition')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {selectedCarStatusIds.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedCarStatusIds.map(id => {
                      const cs = carStatuses?.find((x: any) => x.id === id);
                      return (
                        <div key={id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm animate-in zoom-in-95 duration-200">
                          <span>{cs ? t(`carStatus.${cs.name}`) : id}</span>
                          <button 
                            type="button" 
                            onClick={() => setSelectedCarStatusIds(prev => prev.filter(p => p !== id))}
                            className="hover:bg-gray-200 dark:hover:bg-gray-700 p-0.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <svg className="w-3 h-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <ModernSelect
                  label={t('orders.create.presetConditions', 'Preset Conditions')}
                  placeholder={t('orders.create.placeholder.presetConditions', 'Select to add preset conditions...')}
                  value=""
                  onValueChange={v => {
                    if (v && v !== 'no-status' && !selectedCarStatusIds.includes(v)) {
                      setSelectedCarStatusIds(prev => [...prev, v]);
                    }
                  }}
                  options={carStatuses?.length ? carStatuses
                    .filter((cs: any) => !selectedCarStatusIds.includes(cs.id))
                    .map((cs: any) => {
                      return {
                        value: cs.id,
                        label: t(`carStatus.${cs.name}`)
                      };
                    }) : [{ value: 'no-status', label: t('orders.create.noPresetCondition', 'No preset condition available'), disabled: true }]}
                  valueRender={() => <span className="text-gray-400 font-normal">{t('orders.create.placeholder.presetConditions', 'Select to add preset conditions...')}</span>}
                />
              </div>
              <ModernInput 
                label={t('orders.create.customCondition')}
                placeholder={t('orders.create.placeholder.customCondition', 'e.g. Scratched bumper')} 
                value={customConditionName} 
                onChange={e => setCustomConditionName(e.target.value)} 
              />
              <div className="space-y-2">
                <Label>{t('common.notesOptional')}</Label>
                <textarea 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder={t('orders.create.conditionDescription')} 
                  value={customConditionDesc} 
                  onChange={e => setCustomConditionDesc(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Order Items & Assignments */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161616] rounded-xl">
            <CardHeader className="pb-4 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="w-5 h-5 text-primary" />
                {t('orders.create.servicesMaterials')}
              </CardTitle>
              <div className="text-xl font-bold text-primary">
                {t('orders.create.total')}: {formatCurrency(calculateTotal())}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              
               {/* Add Services */}
              <div className="space-y-3">
                <Label className="text-gray-500 font-bold uppercase tracking-wider text-xs">{t('orders.create.addService')}</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <ModernSelect 
                    placeholder={t('orders.create.placeholder.service', 'Select a service')}
                    value={selectedServiceId} 
                    onValueChange={(v) => handleServiceChange(v || '')}
                    containerClassName="flex-1"
                    options={services?.length ? services.map((s: any) => ({
                      value: s.id,
                      label: getLocName(s)
                    })) : [{ value: 'no-services', label: t('orders.create.noServices', 'No services available'), disabled: true }]}
                    valueRender={(val: string) => {
                      if (!val || val === 'no-services') return <span className="text-gray-400 font-normal">{t('orders.create.placeholder.service', 'Select a service')}</span>;
                      const s = services?.find((x: any) => x.id === val);
                      return s ? getLocName(s) : val;
                    }}
                  />

                  <ModernSelect 
                    placeholder={t('orders.create.selectCategory')}
                    value={selectedCategoryId} 
                    onValueChange={v => setSelectedCategoryId(v as string)} 
                    disabled={!selectedServiceId}
                    containerClassName="flex-1"
                    options={categoriesForSelectedService?.length ? categoriesForSelectedService.map((c: any) => ({
                      value: c.id,
                      label: `${getLocName(c)} (${formatCurrency(c.price)})`
                    })) : [{ value: 'no-categories', label: t('orders.create.noCategories'), disabled: true }]}
                    valueRender={(val: string) => {
                      if (!val || val === 'no-categories') return <span className="text-gray-400 font-normal">{t('orders.create.selectCategory')}</span>;
                      const c = categoriesForSelectedService?.find((x: any) => x.id === val);
                      return c ? `${getLocName(c)} (${formatCurrency(c.price)})` : val;
                    }}
                  />
                  <Button variant="secondary" onClick={handleAddService} disabled={!selectedCategoryId}><Plus className="w-4 h-4" /></Button>
                </div>
                {selectedServices.map(s => (
                  <div key={s.tempId} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#222222] border border-gray-100 dark:border-gray-800">
                    <span className="font-medium text-sm">{s.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-primary">{formatCurrency(s.price)}</span>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedServices(selectedServices.filter(x => x.tempId !== s.tempId))} className="h-8 w-8 p-0 text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Materials */}
              <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Label className="text-gray-500 font-bold uppercase tracking-wider text-xs">{t('common.materials')}</Label>
                <div className="flex gap-2">
                  <ModernSelect 
                    placeholder={t('orders.create.selectMaterial')}
                    value={materialSelect} 
                    onValueChange={v => setMaterialSelect(v as string)}
                    containerClassName="flex-1"
                    options={materials?.filter((m: any) => m.isStandaloneSellable).length ? materials.filter((m: any) => m.isStandaloneSellable).map((m: any) => ({
                      value: m.id,
                      label: `${getLocName(m)} (${formatCurrency(m.currentPrice)})`
                    })) : [{ value: 'no-materials', label: t('orders.create.noMaterials', 'No materials available'), disabled: true }]}
                    valueRender={(val: string) => {
                      if (!val || val === 'no-materials') return <span className="text-gray-400 font-normal">{t('orders.create.selectMaterial')}</span>;
                      const m = materials?.find((x: any) => x.id === val);
                      return m ? getLocName(m) : val;
                    }}
                  />
                  <ModernInput
                    type="text"
                    placeholder={t('orders.create.qty')}
                    value={materialQty}
                    onChange={e => {
                      const val = e.target.value;
                      if (/^\d*\.?\d*$/.test(val)) {
                        setMaterialQty(val);
                      }
                    }}
                    containerClassName="w-20 shrink-0"
                  />
                  <Button variant="secondary" onClick={handleAddMaterial} disabled={!materialSelect}><Plus className="w-4 h-4" /></Button>
                </div>
                {selectedMaterials.map(m => (
                  <div key={m.tempId} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#222222] border border-gray-100 dark:border-gray-800">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{m.name}</span>
                      <span className="text-xs text-gray-500">{t('orders.create.qty')}: {m.qty} &times; {formatCurrency(m.price)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-primary">{formatCurrency(m.price * m.qty)}</span>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedMaterials(selectedMaterials.filter(x => x.tempId !== m.tempId))} className="h-8 w-8 p-0 text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>

            </CardContent>
          </Card>

          <Card className="shadow-sm border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161616] rounded-xl">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-primary" />
                {t('orders.create.staffAssignment')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <ModernSelect 
                  placeholder={t('orders.create.placeholder.employee', 'Select employee')}
                  value={employeeSelect} 
                  onValueChange={v => setEmployeeSelect(v as string)}
                  containerClassName="flex-1"
                  options={employees?.filter((e: any) => e.employee && !selectedAssignments.some(a => a.employeeId === e.employee.id)).length ? employees.filter((e: any) => e.employee && !selectedAssignments.some(a => a.employeeId === e.employee.id)).map((e: any) => ({
                    value: e.employee.id,
                    label: `${e.name} (${e.role})`
                  })) : [{ value: 'no-employees', label: t('orders.create.noEmployees', 'No employees available'), disabled: true }]}
                  valueRender={(val: string) => {
                    if (!val || val === 'no-employees') return <span className="text-gray-400 font-normal">{t('orders.create.selectEmployee')}</span>;
                    const e = employees?.find((x: any) => x.employee?.id === val);
                    return e ? `${e.name} (${e.role})` : val;
                  }}
                />
                <ModernInput 
                  value={roleInput} 
                  onChange={e => setRoleInput(e.target.value)} 
                  placeholder={t('orders.create.role')} 
                  containerClassName="w-40 shrink-0" 
                />
                <Button variant="secondary" onClick={handleAddAssignment} disabled={!employeeSelect}><Plus className="w-4 h-4" /></Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {selectedAssignments.map(a => (
                  <div key={a.tempId} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-[#222222] border border-gray-200 dark:border-gray-800">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{a.name}</span>
                      <span className="text-xs text-primary/70">{a.role}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedAssignments(selectedAssignments.filter(x => x.tempId !== a.tempId))} className="h-8 w-8 p-0 text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
