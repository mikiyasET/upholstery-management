import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { getImageUrl } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { ImagePreviewModal } from '../components/ui/image-preview-modal';
import { LazyImage } from '../components/common/LazyImage';
import { PermissionGate } from '../components/PermissionGate';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ConfirmDialog';
import { PageHeader, ExecutiveAddButton } from '../components/common';

type CarBrand = {
  id: string;
  name: string;
  logoUrl?: string;
};

type CarModel = {
  id: string;
  brandId: string;
  name: string;
  imageUrl?: string;
};

export default function Cars() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedBrand, setSelectedBrand] = useState<CarBrand | null>(null);
  const [showBrandSearch, setShowBrandSearch] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  
  const [showModelSearch, setShowModelSearch] = useState(false);
  const [modelSearch, setModelSearch] = useState('');
  
  const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [brandFile, setBrandFile] = useState<File | null>(null);
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);

  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [modelName, setModelName] = useState('');
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [editingModelId, setEditingModelId] = useState<string | null>(null);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<CarBrand | null>(null);
  const [modelToDelete, setModelToDelete] = useState<CarModel | null>(null);

  const { data: brands, isLoading: brandsLoading } = useQuery<CarBrand[]>({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await api.get('/catalog/car-brands');
      return res.data;
    },
  });

  const { data: models, isLoading: modelsLoading } = useQuery<CarModel[]>({
    queryKey: ['models', selectedBrand?.id],
    queryFn: async () => {
      if (!selectedBrand) return [];
      const res = await api.get(`/catalog/car-brands/${selectedBrand.id}/models`);
      return res.data;
    },
    enabled: !!selectedBrand,
  });

  // Client-side filtering from fetched data
  const filteredBrands = useMemo(() => {
    if (!brands) return [];
    if (!brandSearch.trim()) return brands;
    const q = brandSearch.toLowerCase().trim();
    return brands.filter(b => b.name.toLowerCase().includes(q));
  }, [brands, brandSearch]);

  const filteredModels = useMemo(() => {
    if (!models) return [];
    if (!modelSearch.trim()) return models;
    const q = modelSearch.toLowerCase().trim();
    return models.filter(m => m.name.toLowerCase().includes(q));
  }, [models, modelSearch]);

  const saveBrandMutation = useMutation({
    mutationFn: async () => {
      const payload = new FormData();
      payload.append('name', brandName);
      if (brandFile) payload.append('image', brandFile);
      await api.post('/catalog/car-brands', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success(t('cars.alerts.brandCreated', 'Brand created successfully'));
      setIsBrandDialogOpen(false);
      setBrandName('');
      setBrandFile(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('cars.alerts.errorSavingBrand', 'Error saving brand'));
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: async () => {
      if (!editingBrandId) return;
      const payload = new FormData();
      payload.append('name', brandName);
      if (brandFile) payload.append('image', brandFile);
      await api.patch(`/catalog/car-brands/${editingBrandId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success(t('cars.alerts.brandUpdated', 'Brand updated successfully'));
      setIsBrandDialogOpen(false);
      setBrandName('');
      setBrandFile(null);
      setEditingBrandId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('cars.alerts.errorUpdatingBrand', 'Error updating brand'));
    },
  });

  const deleteBrandMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/catalog/car-brands/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success(t('cars.alerts.brandDeleted', 'Brand deleted successfully'));
      if (selectedBrand?.id === brandToDelete?.id) {
        setSelectedBrand(null);
        setModelSearch('');
        setShowModelSearch(false);
      }
      setBrandToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('cars.alerts.errorDeletingBrand', 'Error deleting brand. It might have models attached.'));
    },
  });

  const saveModelMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBrand) return;
      const payload = new FormData();
      payload.append('brandId', selectedBrand.id);
      payload.append('name', modelName);
      if (modelFile) payload.append('image', modelFile);
      await api.post('/catalog/car-models', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models', selectedBrand?.id] });
      toast.success(t('cars.alerts.modelCreated', 'Model created successfully'));
      setIsModelDialogOpen(false);
      setModelName('');
      setModelFile(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('cars.alerts.errorSavingModel', 'Error saving model'));
    },
  });

  const updateModelMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBrand || !editingModelId) return;
      const payload = new FormData();
      payload.append('name', modelName);
      if (modelFile) payload.append('image', modelFile);
      await api.patch(`/catalog/car-models/${editingModelId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models', selectedBrand?.id] });
      toast.success(t('cars.alerts.modelUpdated', 'Model updated successfully'));
      setIsModelDialogOpen(false);
      setModelName('');
      setModelFile(null);
      setEditingModelId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('cars.alerts.errorUpdatingModel', 'Error updating model'));
    },
  });

  const deleteModelMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/catalog/car-models/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models', selectedBrand?.id] });
      toast.success(t('cars.alerts.modelDeleted', 'Model deleted successfully'));
      setModelToDelete(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('cars.alerts.errorDeletingModel', 'Error deleting model. It might be in use.'));
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('cars.title', 'Car & Vehicle Catalog')}
        subtitle={t('cars.subtitle', 'Manage vehicle manufacturers, brand logos, and model profiles')}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['brands'] });
          if (selectedBrand) queryClient.invalidateQueries({ queryKey: ['models', selectedBrand.id] });
        }}
        isRefreshing={brandsLoading || modelsLoading}
        primaryAction={
          <PermissionGate permission="catalog.cars.add">
            <ExecutiveAddButton 
              label={t('cars.addBrand', 'Add Brand')}
              onClick={() => {
                setEditingBrandId(null);
                setBrandName('');
                setBrandFile(null);
                setIsBrandDialogOpen(true);
              }}
            />
          </PermissionGate>
        }
      />

      <div className="grid md:grid-cols-3 gap-6">
        {/* BRANDS SIDEBAR */}
        <div className="md:col-span-1 border border-border rounded-xl bg-card flex flex-col h-[600px] overflow-hidden shadow-sm">
          {showBrandSearch ? (
            <div className="p-2.5 border-b border-border bg-muted/30 flex items-center gap-1.5 min-h-[52px] animate-in fade-in duration-200">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input 
                  autoFocus
                  placeholder={t('cars.searchBrands', 'Search brands...')} 
                  value={brandSearch} 
                  onChange={e => setBrandSearch(e.target.value)}
                  className="pl-8 pr-7 h-8 text-xs bg-background rounded-lg border-border focus-visible:ring-1 focus-visible:ring-amber-500"
                />
                {brandSearch && (
                  <button 
                    type="button" 
                    onClick={() => setBrandSearch('')} 
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setShowBrandSearch(false);
                  setBrandSearch('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between min-h-[52px]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">{t('cars.brands', 'Brands')}</span>
                <span className="text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {filteredBrands.length}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80"
                onClick={() => setShowBrandSearch(true)}
                title={t('cars.searchBrands', 'Search brands...')}
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <div className="p-2 flex-1 overflow-y-auto space-y-1">
            {brandsLoading ? (
              <div className="p-3 text-sm text-muted-foreground text-center">{t('common.loading', 'Loading...')}</div>
            ) : filteredBrands.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">{t('cars.noBrands', 'No brands found.')}</div>
            ) : (
              filteredBrands.map(brand => (
                <div 
                  key={brand.id} 
                  onClick={() => {
                    setSelectedBrand(brand);
                    setModelSearch('');
                    setShowModelSearch(false);
                  }}
                  className={`p-3 rounded-lg cursor-pointer flex items-center justify-between gap-3 transition-colors group ${
                    selectedBrand?.id === brand.id 
                      ? 'bg-amber-600 text-white shadow-sm font-semibold' 
                      : 'hover:bg-muted/70 text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 overflow-hidden">
                    {brand.logoUrl ? (
                      <LazyImage
                        src={brand.logoUrl}
                        alt={brand.name}
                        wrapperClassName="h-9 w-9 rounded-md overflow-hidden border border-border shrink-0 pointer-events-none select-none bg-white dark:bg-white"
                        imgClassName="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="h-9 w-9 bg-secondary/80 rounded-md flex items-center justify-center text-[10px] font-bold text-secondary-foreground shrink-0">
                        {brand.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium truncate text-sm">{brand.name}</span>
                  </div>
                  
                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                    <PermissionGate permission="catalog.cars.edit">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-7 w-7 ${
                          selectedBrand?.id === brand.id 
                            ? 'text-white/80 hover:text-white hover:bg-white/20' 
                            : 'text-muted-foreground hover:text-primary hover:bg-muted'
                        }`} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBrandId(brand.id);
                          setBrandName(brand.name);
                          setBrandFile(null);
                          setIsBrandDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </PermissionGate>
                    <PermissionGate permission="catalog.cars.remove">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`h-7 w-7 ${
                          selectedBrand?.id === brand.id 
                            ? 'text-white/80 hover:text-white hover:bg-red-500/30' 
                            : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                        }`} 
                        onClick={(e) => {
                          e.stopPropagation();
                          setBrandToDelete(brand);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </PermissionGate>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MODELS PANE */}
        <div className="md:col-span-2">
          {selectedBrand ? (
            <Card className="h-[600px] flex flex-col rounded-xl overflow-hidden shadow-sm">
              {showModelSearch ? (
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3 pt-3 px-4 border-b bg-muted/10 min-h-[57px] animate-in fade-in duration-200">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input 
                      autoFocus
                      placeholder={t('cars.searchModels', 'Search models...')} 
                      value={modelSearch} 
                      onChange={e => setModelSearch(e.target.value)}
                      className="pl-8 pr-7 h-8 text-xs bg-background rounded-lg border-border focus-visible:ring-1 focus-visible:ring-amber-500 w-full"
                    />
                    {modelSearch && (
                      <button 
                        type="button" 
                        onClick={() => setModelSearch('')} 
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setShowModelSearch(false);
                        setModelSearch('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <PermissionGate permission="catalog.cars.add">
                      <Button 
                        size="sm" 
                        className="h-8 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm font-semibold"
                        onClick={() => {
                          setEditingModelId(null);
                          setModelName('');
                          setModelFile(null);
                          setIsModelDialogOpen(true);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" /> 
                        <span className="hidden sm:inline">{t('cars.addModel', 'Add Model')}</span>
                      </Button>
                    </PermissionGate>
                  </div>
                </CardHeader>
              ) : (
                <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3 pt-3 px-4 border-b border-border bg-muted/10 min-h-[57px]">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-foreground truncate">
                    {selectedBrand.logoUrl && (
                      <LazyImage
                        src={selectedBrand.logoUrl}
                        alt=""
                        wrapperClassName="h-7 w-7 rounded-md overflow-hidden border border-border shrink-0 bg-white dark:bg-white"
                        imgClassName="w-full h-full object-cover"
                      />
                    )}
                    <span className="truncate">{t('cars.brandModels', '{{brand}} Models', { brand: selectedBrand.name })}</span>
                    <span className="text-xs font-normal text-muted-foreground ml-1">({filteredModels.length})</span>
                  </CardTitle>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={() => setShowModelSearch(true)}
                      title={t('cars.searchModels', 'Search models...')}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                    <PermissionGate permission="catalog.cars.add">
                      <Button 
                        size="sm" 
                        className="h-8 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm font-semibold"
                        onClick={() => {
                          setEditingModelId(null);
                          setModelName('');
                          setModelFile(null);
                          setIsModelDialogOpen(true);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" /> 
                        <span className="hidden sm:inline">{t('cars.addModel', 'Add Model')}</span>
                      </Button>
                    </PermissionGate>
                  </div>
                </CardHeader>
              )}
              <CardContent className="p-4 flex-1 overflow-y-auto">
                {modelsLoading ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">{t('cars.loadingModels', 'Loading models...')}</div>
                ) : filteredModels.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-12 text-center">{t('cars.noModels', 'No models found for this brand.')}</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredModels.map(model => (
                      <div key={model.id} className="p-3 border rounded-xl bg-card flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow">
                        {model.imageUrl ? (
                          <div className="w-full h-28 rounded-lg overflow-hidden flex items-center justify-center">
                            <LazyImage 
                              src={model.imageUrl} 
                              alt={model.name} 
                              wrapperClassName="w-full h-full"
                              imgClassName="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setPreviewImage(model.imageUrl ? getImageUrl(model.imageUrl)! : null)}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-28 bg-muted/60 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                            {t('cars.noImage', 'No Image')}
                          </div>
                        )}
                        <div className="w-full flex items-center justify-between mt-1 px-1">
                          <span className="font-semibold text-sm truncate pr-2 text-gray-900 dark:text-gray-100">{model.name}</span>
                          <div className="flex gap-1 shrink-0">
                            <PermissionGate permission="catalog.cars.edit">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => {
                                setEditingModelId(model.id);
                                setModelName(model.name);
                                setModelFile(null);
                                setIsModelDialogOpen(true);
                              }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </PermissionGate>
                            <PermissionGate permission="catalog.cars.remove">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => {
                                setModelToDelete(model);
                              }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </PermissionGate>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="h-[600px] flex items-center justify-center border rounded-xl bg-muted/10 text-muted-foreground p-6 text-center">
              {t('cars.selectBrandPrompt', 'Select a brand to view its models')}
            </div>
          )}
        </div>
      </div>


      <ImagePreviewModal isOpen={!!previewImage} onClose={() => setPreviewImage(null)} imageUrl={previewImage} />

      {/* BRAND DIALOG */}
      <Dialog open={isBrandDialogOpen} onOpenChange={setIsBrandDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingBrandId 
                ? t('cars.editBrand', 'Edit Car Brand') 
                : t('cars.createBrand', 'Add Car Brand')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="brandName">{t('cars.brandName', 'Brand Name')}</Label>
              <Input 
                id="brandName" 
                className="header-input w-full" 
                value={brandName} 
                onChange={e => setBrandName(e.target.value)} 
                placeholder={t('cars.placeholders.brandName', 'e.g. Toyota')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandLogo">{t('cars.logo', 'Logo')}</Label>
              <Input 
                id="brandLogo" 
                type="file" 
                className="header-input w-full p-0 file:h-full file:bg-muted file:border-0 file:mr-4 file:px-4 cursor-pointer" 
                onChange={e => setBrandFile(e.target.files?.[0] || null)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBrandDialogOpen(false)} className="header-btn-secondary">
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button 
              onClick={() => editingBrandId ? updateBrandMutation.mutate() : saveBrandMutation.mutate()} 
              disabled={saveBrandMutation.isPending || updateBrandMutation.isPending || !brandName.trim()} 
              className="header-btn-primary"
            >
              {(saveBrandMutation.isPending || updateBrandMutation.isPending) ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODEL DIALOG */}
      <Dialog open={isModelDialogOpen} onOpenChange={setIsModelDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {editingModelId 
                ? t('cars.editModel', 'Edit Model') 
                : t('cars.addModelTo', 'Add Model to {{brand}}', { brand: selectedBrand?.name })}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="modelName">{t('cars.modelName', 'Model Name')}</Label>
              <Input 
                id="modelName" 
                className="header-input w-full" 
                value={modelName} 
                onChange={e => setModelName(e.target.value)} 
                placeholder={t('cars.placeholders.modelName', 'e.g. Corolla')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelImage">{t('cars.imageOptional', 'Image (Optional)')}</Label>
              <Input 
                id="modelImage" 
                type="file" 
                className="header-input w-full p-0 file:h-full file:bg-muted file:border-0 file:mr-4 file:px-4 cursor-pointer" 
                onChange={e => setModelFile(e.target.files?.[0] || null)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModelDialogOpen(false)} className="header-btn-secondary">
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button 
              onClick={() => editingModelId ? updateModelMutation.mutate() : saveModelMutation.mutate()} 
              disabled={saveModelMutation.isPending || updateModelMutation.isPending || !modelName.trim()} 
              className="header-btn-primary"
            >
              {(saveModelMutation.isPending || updateModelMutation.isPending) ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM DELETE BRAND */}
      <ConfirmDialog
        isOpen={!!brandToDelete}
        onClose={() => setBrandToDelete(null)}
        onConfirm={() => {
          if (brandToDelete) deleteBrandMutation.mutate(brandToDelete.id);
        }}
        title={t('cars.deleteBrandTitle', 'Delete Car Brand')}
        message={
          <>
            {i18n?.language === 'am'
              ? `${brandToDelete?.name}ን መሰረዝ እንደሚፈልጉ እርግጠኛ ነዎት? ይህ እርምጃ ሊቀለበስ አይችልም።`
              : `Are you sure you want to delete ${brandToDelete?.name}? This action cannot be undone.`}
          </>
        }
        type="danger"
        confirmText={t('common.delete', 'Delete')}
      />

      {/* CONFIRM DELETE MODEL */}
      <ConfirmDialog
        isOpen={!!modelToDelete}
        onClose={() => setModelToDelete(null)}
        onConfirm={() => {
          if (modelToDelete) deleteModelMutation.mutate(modelToDelete.id);
        }}
        title={t('cars.deleteModelTitle', 'Delete Car Model')}
        message={
          <>
            {i18n?.language === 'am'
              ? `${modelToDelete?.name}ን መሰረዝ እንደሚፈልጉ እርግጠኛ ነዎት? ይህ እርምጃ ሊቀለበስ አይችልም።`
              : `Are you sure you want to delete ${modelToDelete?.name}? This action cannot be undone.`}
          </>
        }
        type="danger"
        confirmText={t('common.delete', 'Delete')}
      />
    </div>
  );
}
