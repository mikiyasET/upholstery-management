import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { getImageUrl, formatCurrency, formatInputNumber, parseInputNumber, formatUnit } from '../lib/utils';
import { TableSearch } from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import { PermissionGate } from '../components/PermissionGate';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ImagePreviewModal } from '../components/ui/image-preview-modal';
import { PageHeader } from '../components/common/PageHeader';
import { RiAddLine } from 'react-icons/ri';

type Material = {
  id: string;
  nameEn: string;
  nameAm: string;
  unit: string;
};

type MaterialUsage = {
  materialId: string;
  quantity: number | string;
  quantityUsed?: number | string;
};

type ServiceCategory = {
  id: string;
  nameEn: string;
  nameAm: string;
  price: number;
  materialUsages: MaterialUsage[];
};

type Service = {
  id: string;
  nameEn: string;
  nameAm: string;
  description: string | null;
  imageUrl?: string;
  categories: ServiceCategory[];
};

export default function Services() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const getLocName = (item?: { nameEn: string; nameAm?: string }) => 
    (i18n?.language === 'am' && item?.nameAm ? item.nameAm : (item?.nameEn || ''));

  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceFormData, setServiceFormData] = useState({ nameEn: '', nameAm: '', description: '' });
  const [serviceFile, setServiceFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  
  // Deletion state
  const [catToDelete, setCatToDelete] = useState<{serviceId: string, catId: string, name: string} | null>(null);

  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [editingCat, setEditingCat] = useState<ServiceCategory | null>(null);
  const [catFormData, setCatFormData] = useState({ nameEn: '', nameAm: '', price: '' });
  const [materialUsages, setMaterialUsages] = useState<MaterialUsage[]>([]);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { data: services, isLoading: servicesLoading, refetch, isFetching } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.get('/catalog/services');
      return res.data;
    },
  });

  const { data: materials } = useQuery<Material[]>({
    queryKey: ['materials'],
    queryFn: async () => {
      const res = await api.get('/catalog/materials');
      return res.data;
    },
  });

  // --- Service Mutations ---
  const saveServiceMutation = useMutation({
    mutationFn: async () => {
      const formPayload = new FormData();
      formPayload.append('nameEn', serviceFormData.nameEn);
      formPayload.append('nameAm', serviceFormData.nameAm);
      if (serviceFormData.description) formPayload.append('description', serviceFormData.description);
      if (serviceFile) formPayload.append('image', serviceFile);

      if (editingService) {
        await api.patch(`/catalog/services/${editingService.id}`, formPayload);
      } else {
        await api.post('/catalog/services', formPayload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success(t('services.alerts.serviceSaved', 'Service saved successfully'));
      setIsServiceDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('services.alerts.errorSavingService', 'Error saving service'));
    },
  });

  // --- Category Mutations ---
  const saveCatMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nameEn: catFormData.nameEn,
        nameAm: catFormData.nameAm,
        price: parseInputNumber(catFormData.price),
        materialUsages: materialUsages.map(mu => ({
          materialId: mu.materialId,
          quantity: Number(mu.quantity) || 0
        })),
      };

      if (editingCat) {
        await api.patch(`/catalog/services/${selectedServiceId}/categories/${editingCat.id}`, payload);
      } else {
        await api.post(`/catalog/services/${selectedServiceId}/categories`, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success(t('services.alerts.categorySaved', 'Category saved successfully'));
      setIsCatDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('services.alerts.errorSavingCategory', 'Error saving category'));
    },
  });

  const deleteCatMutation = useMutation({
    mutationFn: async ({ serviceId, catId }: { serviceId: string, catId: string }) => {
      await api.delete(`/catalog/services/${serviceId}/categories/${catId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success(t('services.alerts.categoryDeleted', 'Category deleted successfully'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('services.alerts.errorDeletingCategory', 'Error deleting category'));
    },
  });

  const handleOpenServiceDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setServiceFormData({
        nameEn: service.nameEn,
        nameAm: service.nameAm,
        description: service.description || '',
      });
    } else {
      setEditingService(null);
      setServiceFormData({ nameEn: '', nameAm: '', description: '' });
    }
    setServiceFile(null);
    setIsServiceDialogOpen(true);
  };

  const handleOpenCatDialog = (serviceId: string, cat?: ServiceCategory) => {
    setSelectedServiceId(serviceId);
    if (cat) {
      setEditingCat(cat);
      setCatFormData({
        nameEn: cat.nameEn,
        nameAm: cat.nameAm,
        price: cat.price ? formatInputNumber(cat.price.toString()) : '',
      });
      setMaterialUsages(
        (cat.materialUsages || []).map((mu: any) => ({
          materialId: mu.materialId,
          quantity: (mu.quantityUsed ?? mu.quantity ?? 0).toString(),
        }))
      );
    } else {
      setEditingCat(null);
      setCatFormData({ nameEn: '', nameAm: '', price: '' });
      setMaterialUsages([]);
    }
    setIsCatDialogOpen(true);
  };

  const addMaterialUsage = () => {
    setMaterialUsages([...materialUsages, { materialId: '', quantity: '1' }]);
  };

  const updateMaterialUsage = (index: number, field: keyof MaterialUsage, value: any) => {
    const updated = [...materialUsages];
    updated[index] = { ...updated[index], [field]: value };
    setMaterialUsages(updated);
  };

  const removeMaterialUsage = (index: number) => {
    setMaterialUsages(materialUsages.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Executive PageHeader */}
      <PageHeader
        title={t('common.services', 'Services Catalog')}
        subtitle={t('services.subtitle', 'Manage your service offerings, pricing categories, and required materials.')}
        badge={services ? `${services.length} Services` : undefined}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        refreshTooltip="Refresh services"
        action={
          <PermissionGate permission="catalog.services.add">
            <Button 
              onClick={() => handleOpenServiceDialog()}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2 shadow-sm font-semibold rounded-lg"
            >
              <RiAddLine className="w-4 h-4" />
              {t('services.newService', 'New Service')}
            </Button>
          </PermissionGate>
        }
      />

      {/* 2. Search Toolbar */}
      <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex items-center justify-between">
        <TableSearch 
          value={search} 
          onChange={setSearch} 
          placeholder={t('services.searchPlaceholder', 'Search services by name or keyword...')} 
          className="w-full sm:w-[480px]"
        />
      </div>

      {servicesLoading ? (
        <div className="text-center py-8 text-muted-foreground">{t('common.loading', 'Loading...')}</div>
      ) : services?.length === 0 ? (
        <div className="text-center p-8 bg-card rounded-md border text-muted-foreground">{t('services.noServices', 'No services found.')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {services?.filter(s => s.nameEn.toLowerCase().includes(search.toLowerCase()) || s.nameAm.includes(search)).map((service) => (
            <Card key={service.id} className="rounded-2xl border-border shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow bg-card">
              {/* Header: Image & Name */}
              <div className="p-5 flex items-start gap-4 border-b border-border">
                <div className="w-14 h-14 rounded-xl bg-muted border border-border shrink-0 flex items-center justify-center overflow-hidden">
                  {service.imageUrl ? (
                    <img 
                      src={getImageUrl(service.imageUrl)} 
                      alt={getLocName(service)} 
                      className="w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-300"
                      onClick={() => setPreviewImage(getImageUrl(service.imageUrl)!)}
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                       <span className="text-primary font-bold text-xl">{service.nameEn.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <h3 className="font-bold text-base text-foreground truncate" title={getLocName(service)}>
                    {getLocName(service)}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {i18n?.language === 'am' ? service.nameEn : service.nameAm}
                  </p>
                </div>
                <div className="flex gap-1">
                  <PermissionGate permission="catalog.services.edit">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenServiceDialog(service)} className="h-8 w-8 rounded-full text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </PermissionGate>
                </div>
              </div>

              {/* Categories & Materials */}
              <div className="p-5 flex-1 flex flex-col gap-4 bg-muted/20">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('services.pricingCategories', 'Pricing Categories')}</h4>
                  <PermissionGate permission="catalog.services.add">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenCatDialog(service.id)} className="h-6 text-xs px-2 text-primary hover:bg-primary/10 rounded-md">
                      <Plus className="mr-1 h-3 w-3" /> {t('common.add', 'Add')}
                    </Button>
                  </PermissionGate>
                </div>
                
                {service.categories && service.categories.length > 0 ? (
                  <div className="space-y-3">
                    {service.categories.map(cat => (
                      <div key={cat.id} className="bg-card p-4 rounded-xl border border-border shadow-sm relative group transition-all hover:border-amber-500/40">
                        <div className="flex justify-between items-start mb-2 pr-12">
                          <div>
                            <p className="font-semibold text-sm text-foreground">
                              {getLocName(cat)} <span className="text-xs text-muted-foreground font-normal">({i18n?.language === 'am' ? cat.nameEn : cat.nameAm})</span>
                            </p>
                            <p className="font-bold text-primary mt-0.5">{formatCurrency(cat.price)}</p>
                          </div>
                          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <PermissionGate permission="catalog.services.edit">
                              <button onClick={() => handleOpenCatDialog(service.id, cat)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors">
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            </PermissionGate>
                            <PermissionGate permission="catalog.services.remove">
                              <button onClick={() => setCatToDelete({ serviceId: service.id, catId: cat.id, name: getLocName(cat) })} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </PermissionGate>
                          </div>
                        </div>

                        {cat.materialUsages?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800/60">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">{t('services.materialsRequired', 'Materials Required')}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {cat.materialUsages.map(u => {
                                const m = materials?.find(mat => mat.id === u.materialId);
                                return m ? (
                                  <span key={u.materialId} className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] font-medium border border-gray-200 dark:border-gray-700">
                                    {getLocName(m)} ({(u.quantityUsed ?? u.quantity).toString()} {formatUnit(m.unit)})
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-sm text-gray-400 italic py-6">
                    {t('services.noCategories', 'No categories defined.')}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ImagePreviewModal isOpen={!!previewImage} onClose={() => setPreviewImage(null)} imageUrl={previewImage} />

      {/* SERVICE MODAL */}
      <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingService 
                ? t('services.editService', 'Edit Service') 
                : t('services.createService', 'Create Service')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="serviceNameEn">{t('materials.nameEn', 'Name (EN)')}</Label>
              <Input
                id="serviceNameEn"
                className="header-input w-full"
                value={serviceFormData.nameEn}
                onChange={(e) => setServiceFormData({ ...serviceFormData, nameEn: e.target.value })}
                placeholder={t('services.placeholders.serviceNameEn', 'e.g. Tinting')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceNameAm">{t('materials.nameAm', 'Name (AM)')}</Label>
              <Input
                id="serviceNameAm"
                className="header-input w-full"
                value={serviceFormData.nameAm}
                onChange={(e) => setServiceFormData({ ...serviceFormData, nameAm: e.target.value })}
                placeholder={t('services.placeholders.serviceNameAm', 'e.g. ጥቁር ፌሮ')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceDesc">{t('common.description', 'Description')}</Label>
              <Input
                id="serviceDesc"
                className="header-input w-full"
                value={serviceFormData.description}
                onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                placeholder={t('services.placeholders.serviceDesc', 'e.g. Full window tinting')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceImage">{t('storage.table.image', 'Image')}</Label>
              <Input
                id="serviceImage"
                type="file"
                className="header-input w-full p-0 file:h-full file:bg-muted file:border-0 file:mr-4 file:px-4 cursor-pointer"
                onChange={(e) => setServiceFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsServiceDialogOpen(false)} className="header-btn-secondary">
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={() => saveServiceMutation.mutate()} disabled={saveServiceMutation.isPending} className="header-btn-primary">
              {saveServiceMutation.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={isCatDialogOpen} onOpenChange={setIsCatDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCat 
                ? t('services.editCategory', 'Edit Category') 
                : t('services.createCategory', 'Create Category')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="catNameEn">{t('materials.nameEn', 'Name (EN)')}</Label>
                <Input 
                  id="catNameEn" 
                  className="header-input w-full" 
                  value={catFormData.nameEn} 
                  onChange={e => setCatFormData({ ...catFormData, nameEn: e.target.value })} 
                  placeholder={t('services.placeholders.catNameEn', 'e.g. Sedan')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="catNameAm">{t('materials.nameAm', 'Name (AM)')}</Label>
                <Input 
                  id="catNameAm" 
                  className="header-input w-full" 
                  value={catFormData.nameAm} 
                  onChange={e => setCatFormData({ ...catFormData, nameAm: e.target.value })} 
                  placeholder={t('services.placeholders.catNameAm', 'e.g. ሰዳን')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="catPrice">{t('common.price', 'Price')} ({i18n?.language === 'am' ? 'ብር' : 'Birr'})</Label>
              <Input 
                id="catPrice" 
                type="text" 
                className="header-input w-full" 
                value={catFormData.price} 
                onChange={e => setCatFormData({ ...catFormData, price: formatInputNumber(e.target.value) })} 
                placeholder="0.00"
              />
            </div>

            
            <div className="space-y-3 border-t pt-4 mt-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t('services.materialsUsed', 'Materials Used')}</Label>
                <Button variant="outline" size="sm" onClick={addMaterialUsage} className="header-btn-secondary h-8">
                  <Plus className="mr-2 h-3 w-3" /> {t('services.addMaterial', 'Add Material')}
                </Button>
              </div>
              {materialUsages.map((mu, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-muted/20 p-2 rounded-lg border border-border w-full">
                    <Select value={mu.materialId} onValueChange={(v) => updateMaterialUsage(idx, 'materialId', v)}>
                      <SelectTrigger className="header-input flex-1 h-9">
                        <SelectValue placeholder={t('services.selectMaterial', 'Select Material...')}>
                          {(val: string) => {
                            if (!val) return <span className="text-muted-foreground">{t('services.selectMaterial', 'Select Material...')}</span>;
                            const m = materials?.find(x => x.id === val);
                            return m ? `${getLocName(m)} (${formatUnit(m.unit)})` : val;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {materials?.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {getLocName(m)} ({formatUnit(m.unit)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input 
                      type="text" 
                      value={mu.quantity} 
                      onChange={(e) => {
                        const val = e.target.value;
                        if (/^\d*\.?\d*$/.test(val)) {
                          updateMaterialUsage(idx, 'quantity', val);
                        }
                      }}
                      className="header-input w-[110px] h-9"
                      placeholder={t('orders.detail.quantity', 'Qty')}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeMaterialUsage(idx)} className="header-btn-danger h-9 w-9 p-0 shrink-0">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCatDialogOpen(false)} className="header-btn-secondary">
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={() => saveCatMutation.mutate()} disabled={saveCatMutation.isPending} className="header-btn-primary">
              {saveCatMutation.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        isOpen={!!catToDelete}
        onClose={() => setCatToDelete(null)}
        onConfirm={() => {
          if (catToDelete) deleteCatMutation.mutate({ serviceId: catToDelete.serviceId, catId: catToDelete.catId });
        }}
        title={t('services.deleteCategoryTitle', 'Delete Category')}
        message={
          <>
            {i18n?.language === 'am' 
              ? `${catToDelete?.name} መሰረዝ እንደሚፈልጉ እርግጠኛ ነዎት? ይህ እርምጃ ሊቀለበስ አይችልም።` 
              : `Are you sure you want to delete ${catToDelete?.name}? This action cannot be undone.`}
          </>
        }
        type="danger"
        confirmText={t('common.delete', 'Delete')}
      />
    </div>
  );
}

