import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Tooltip, ActionIcon } from '@mantine/core';
import {
  Plus,
  Edit2,
  Trash2,
  Layers,
  Settings2,
  Check,
  X,
  Eye,
  LayoutGrid,
  List,
  Boxes,
  Car,
  Image as ImageIcon,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

import api from '../lib/api';
import {
  getImageUrl,
  formatCurrency,
  formatInputNumber,
  parseInputNumber,
  formatUnit,
  isUnitIntegerOnly,
} from '../lib/utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  TableSearch,
} from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import { LazyImage } from '../components/common/LazyImage';
import { PermissionGate } from '../components/PermissionGate';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { ImagePreviewModal } from '../components/ui/image-preview-modal';
import { PageHeader, ExecutiveAddButton, TablePagination } from '../components/common';

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

type ServiceGroup = {
  id: string;
  nameEn: string;
  nameAm: string;
  _count?: {
    services: number;
  };
};

type Service = {
  id: string;
  nameEn: string;
  nameAm: string;
  description: string | null;
  imageUrl?: string;
  serviceGroupId?: string | null;
  serviceGroup?: ServiceGroup | null;
  categories: ServiceCategory[];
};

export default function Services() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getLocName = (item?: { nameEn: string; nameAm?: string }) =>
    i18n?.language === 'am' && item?.nameAm ? item.nameAm : item?.nameEn || '';

  const formatPrice = (val: number | string | null | undefined) =>
    formatCurrency(val, i18n.language === 'am' ? 'am' : 'en');

  // --- View Mode & Filtering State ---
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // --- Detail Modal State ---
  const [selectedDetailServiceId, setSelectedDetailServiceId] = useState<string | null>(null);

  // --- Service Dialog State ---
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceFormData, setServiceFormData] = useState({
    nameEn: '',
    nameAm: '',
    description: '',
    serviceGroupId: '',
  });
  const [serviceFile, setServiceFile] = useState<File | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<{ id: string; name: string } | null>(null);

  // --- Category Dialog State ---
  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [editingCat, setEditingCat] = useState<ServiceCategory | null>(null);
  const [catFormData, setCatFormData] = useState({ nameEn: '', nameAm: '', price: '' });
  const [materialUsages, setMaterialUsages] = useState<MaterialUsage[]>([]);
  const [catToDelete, setCatToDelete] = useState<{ serviceId: string; catId: string; name: string } | null>(null);

  // --- Manage Service Types / Groups State ---
  const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
  const [newGroupNameEn, setNewGroupNameEn] = useState('');
  const [newGroupNameAm, setNewGroupNameAm] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupNameEn, setEditGroupNameEn] = useState('');
  const [editGroupNameAm, setEditGroupNameAm] = useState('');
  const [groupToDelete, setGroupToDelete] = useState<{ id: string; name: string } | null>(null);

  // --- Image Preview Modal ---
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // --- Queries ---
  const { data: services, isLoading: servicesLoading, refetch, isFetching } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.get('/catalog/services');
      return res.data;
    },
  });

  const { data: serviceGroups } = useQuery<ServiceGroup[]>({
    queryKey: ['service-groups'],
    queryFn: async () => {
      const res = await api.get('/catalog/service-groups');
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

  // Active service being inspected in the detail modal (reactive to query cache)
  const activeDetailService = useMemo(() => {
    if (!selectedDetailServiceId || !services) return null;
    return services.find((s) => s.id === selectedDetailServiceId) || null;
  }, [selectedDetailServiceId, services]);

  // Helper for computing price range and materials for a service
  const getServiceStats = (service: Service) => {
    const categories = service.categories || [];
    const prices = categories
      .map((c) => Number(c.price))
      .filter((p) => !isNaN(p) && p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

    const matIdSet = new Set<string>();
    const matCounts: number[] = [];
    categories.forEach((c) => {
      const uCount = (c.materialUsages || []).filter((u) => u.materialId).length;
      matCounts.push(uCount);
      (c.materialUsages || []).forEach((mu) => {
        if (mu.materialId) matIdSet.add(mu.materialId);
      });
    });
    const distinctMats = Array.from(matIdSet)
      .map((id) => materials?.find((m) => m.id === id))
      .filter(Boolean) as Material[];

    const minMats = matCounts.length > 0 ? Math.min(...matCounts) : 0;
    const maxMats = matCounts.length > 0 ? Math.max(...matCounts) : 0;

    const materialsRange =
      maxMats === 0
        ? '-'
        : minMats === maxMats
        ? `${minMats} ${minMats === 1 ? t('services.oneMaterial', 'Material') : t('services.materialsCountLabel', 'Materials')}`
        : `${minMats} - ${maxMats} ${t('services.materialsCountLabel', 'Materials')}`;

    return {
      categoriesCount: categories.length,
      minPrice,
      maxPrice,
      priceRange:
        minPrice === null
          ? '-'
          : minPrice === maxPrice
          ? formatPrice(minPrice)
          : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`,
      distinctMats,
      materialsRange,
    };
  };

  // --- Service Type / Group Mutations ---
  const createGroupMutation = useMutation({
    mutationFn: async () => {
      await api.post('/catalog/service-groups', {
        nameEn: newGroupNameEn.trim(),
        nameAm: newGroupNameAm.trim(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-groups'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setNewGroupNameEn('');
      setNewGroupNameAm('');
      toast.success(t('services.typeSaved', 'Service type saved successfully'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Error creating service type');
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, nameEn, nameAm }: { id: string; nameEn: string; nameAm: string }) => {
      await api.patch(`/catalog/service-groups/${id}`, { nameEn, nameAm });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-groups'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setEditingGroupId(null);
      toast.success(t('services.typeSaved', 'Service type updated successfully'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Error updating service type');
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/catalog/service-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-groups'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
      if (selectedGroupFilter === groupToDelete?.id) {
        setSelectedGroupFilter('all');
      }
      setGroupToDelete(null);
      toast.success(t('services.typeDeleted', 'Service type deleted successfully'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Error deleting service type');
    },
  });

  // --- Service Mutations ---
  const saveServiceMutation = useMutation({
    mutationFn: async () => {
      const formPayload = new FormData();
      formPayload.append('nameEn', serviceFormData.nameEn.trim());
      formPayload.append('nameAm', serviceFormData.nameAm.trim());
      if (serviceFormData.description) formPayload.append('description', serviceFormData.description.trim());
      if (serviceFormData.serviceGroupId) formPayload.append('serviceGroupId', serviceFormData.serviceGroupId);
      if (serviceFile) formPayload.append('image', serviceFile);

      if (editingService) {
        await api.patch(`/catalog/services/${editingService.id}`, formPayload);
      } else {
        await api.post('/catalog/services', formPayload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service-groups'] });
      toast.success(t('services.alerts.serviceSaved', 'Service saved successfully'));
      setIsServiceDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('services.alerts.errorSavingService', 'Error saving service'));
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/catalog/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['service-groups'] });
      if (selectedDetailServiceId === serviceToDelete?.id) {
        setSelectedDetailServiceId(null);
      }
      setServiceToDelete(null);
      toast.success(t('services.serviceDeleted', 'Service deleted successfully'));
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Error deleting service');
    },
  });

  // --- Category Mutations ---
  const saveCatMutation = useMutation({
    mutationFn: async () => {
      for (const mu of materialUsages) {
        const mat = materials?.find((m) => m.id === mu.materialId);
        if (mat && isUnitIntegerOnly(mat.unit) && !Number.isInteger(Number(mu.quantity))) {
          toast.error(t('storage.integerRequired', 'Quantity for PCS items must be a whole number (no decimals allowed)'));
          throw new Error('PCS items require integer quantity');
        }
      }

      const payload = {
        nameEn: catFormData.nameEn.trim(),
        nameAm: catFormData.nameAm.trim(),
        price: parseInputNumber(catFormData.price),
        materialUsages: materialUsages.map((mu) => ({
          materialId: mu.materialId,
          quantity: Number(mu.quantity) || 0,
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
    mutationFn: async ({ serviceId, catId }: { serviceId: string; catId: string }) => {
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
        serviceGroupId: service.serviceGroupId || '',
      });
    } else {
      setEditingService(null);
      setServiceFormData({
        nameEn: '',
        nameAm: '',
        description: '',
        serviceGroupId: selectedGroupFilter !== 'all' ? selectedGroupFilter : '',
      });
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

  // --- Filter and Search Logic ---
  const filteredServices = useMemo(() => {
    return (
      services?.filter((s) => {
        const term = search.toLowerCase().trim();
        const matchesSearch =
          !term ||
          s.nameEn.toLowerCase().includes(term) ||
          s.nameAm.toLowerCase().includes(term) ||
          (s.description && s.description.toLowerCase().includes(term)) ||
          (s.serviceGroup &&
            (s.serviceGroup.nameEn.toLowerCase().includes(term) ||
              s.serviceGroup.nameAm.toLowerCase().includes(term)));

        if (!matchesSearch) return false;

        if (selectedGroupFilter === 'all') return true;
        return s.serviceGroupId === selectedGroupFilter;
      }) ?? []
    );
  }, [services, search, selectedGroupFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / pageSize));
  const paginatedServices = useMemo(() => {
    return filteredServices.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredServices, currentPage, pageSize]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* 1. Executive PageHeader */}
      <PageHeader
        title={t('common.services', 'Services Catalog')}
        subtitle={t('services.subtitle', 'Manage your service offerings, pricing categories, and required materials.')}
        badge={services ? `${services.length} Services` : undefined}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        refreshTooltip="Refresh services"
        action={
          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 [&>*]:!w-full sm:[&>*]:!w-auto [&_button]:!w-full sm:[&_button]:!w-auto">
            <PermissionGate permission="catalog.services.edit">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsManageGroupsOpen(true)}
                className="!w-full sm:!w-auto h-9 px-3 rounded-xl border border-border bg-card hover:bg-muted font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Settings2 className="w-3.5 h-3.5 text-primary" />
                <span>{t('services.manageTypes', 'Manage Types')}</span>
              </Button>
            </PermissionGate>
            <PermissionGate permission="catalog.services.add">
              <ExecutiveAddButton
                label={t('services.newService', 'New Service')}
                onClick={() => handleOpenServiceDialog()}
                className="!w-full sm:!w-auto justify-center"
              />
            </PermissionGate>
          </div>
        }
      />

      {/* 2. Refined, Compact Service Types Tab Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none no-scrollbar">
        {/* All Services Tab */}
        <button
          type="button"
          onClick={() => {
            setSelectedGroupFilter('all');
            setCurrentPage(1);
          }}
          className={`h-8 px-3 rounded-lg text-xs transition-all flex items-center gap-1.5 shrink-0 ${
            selectedGroupFilter === 'all'
              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-semibold shadow-2xs'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border/80 font-medium'
          }`}
        >
          <Layers className={`w-3.5 h-3.5 ${selectedGroupFilter === 'all' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`} />
          <span>{t('services.allTypes', 'All Services')}</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono transition-colors ${
              selectedGroupFilter === 'all'
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {services?.length || 0}
          </span>
        </button>

        {/* Dynamic Service Group Tabs */}
        {serviceGroups?.map((group) => {
          const count = services?.filter((s) => s.serviceGroupId === group.id).length || 0;
          const isSelected = selectedGroupFilter === group.id;
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => {
                setSelectedGroupFilter(group.id);
                setCurrentPage(1);
              }}
              className={`h-8 px-3 rounded-lg text-xs transition-all flex items-center gap-1.5 shrink-0 ${
                isSelected
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-semibold shadow-2xs'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-border/80 font-medium'
              }`}
            >
              <span>{getLocName(group)}</span>
              {count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold font-mono transition-colors ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Search and View Switcher Toolbar */}
      <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <TableSearch
          value={search}
          onChange={(val) => {
            setSearch(val);
            setCurrentPage(1);
          }}
          placeholder={t('services.searchPlaceholder', 'Search services by name, type, or keyword...')}
          className="w-full sm:w-[480px]"
        />

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs text-muted-foreground font-medium">
            {filteredServices.length}{' '}
            {filteredServices.length === 1 ? t('services.oneService', 'service') : t('common.services', 'services')}
          </span>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={t('services.tableView', 'Table View')}
            >
              <List className="w-4 h-4" />
              <span className="hidden md:inline text-xs">{t('services.tableView', 'Table')}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                viewMode === 'grid'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={t('services.gridView', 'Grid View')}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline text-xs">{t('services.gridView', 'Grid')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Content: Table or Compact Grid */}
      {servicesLoading ? (
        <div className="text-center py-16 text-muted-foreground text-sm">{t('common.loading', 'Loading services...')}</div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center p-12 bg-card rounded-2xl border border-dashed border-border text-muted-foreground space-y-3">
          <Layers className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm font-semibold text-foreground">{t('services.noServices', 'No services found.')}</p>
          {selectedGroupFilter !== 'all' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedGroupFilter('all')}
              className="text-xs"
            >
              {t('services.allTypes', 'Show all services')}
            </Button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* ======================== TABLE VIEW (PRIMARY) ======================== */
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <Table page={currentPage} pageSize={pageSize}>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[320px] max-w-[350px] px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  {t('common.services', 'Service')}
                </TableHead>
                <TableHead className="w-[180px] px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  {t('services.pricing', 'Pricing')}
                </TableHead>
                <TableHead className="w-[180px] px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  {t('services.materialsRequired', 'Required Materials')}
                </TableHead>
                <TableHead className="w-[120px] text-right px-3 py-2.5 text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  {t('common.actions', 'Action')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedServices.map((service) => {
                const { priceRange, materialsRange } = getServiceStats(service);

                return (
                  <TableRow
                    key={service.id}
                    className="hover:bg-muted/40 cursor-pointer transition-colors group"
                    onClick={() => setSelectedDetailServiceId(service.id)}
                  >
                    {/* 1. Service Info & Thumbnail */}
                    <TableCell className="w-[320px] max-w-[350px] px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl bg-muted border border-border shrink-0 flex items-center justify-center overflow-hidden shadow-2xs"
                          onClick={(e) => {
                            if (service.imageUrl) {
                              e.stopPropagation();
                              setPreviewImage(getImageUrl(service.imageUrl)!);
                            }
                          }}
                        >
                          {service.imageUrl ? (
                            <LazyImage
                              src={service.imageUrl}
                              alt={getLocName(service)}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                              {service.nameEn.charAt(0)}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p
                              className="text-xs sm:text-sm font-semibold text-foreground truncate whitespace-nowrap"
                              title={getLocName(service)}
                            >
                              {getLocName(service)}
                            </p>
                            {service.serviceGroup && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 whitespace-nowrap">
                                <Layers className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                <span>{getLocName(service.serviceGroup)}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate whitespace-nowrap mt-0.5">
                            {i18n?.language === 'am' ? service.nameEn : service.nameAm}
                          </p>
                          {service.description && (
                            <p
                              className="text-[10px] text-muted-foreground/70 truncate whitespace-nowrap max-w-[260px]"
                              title={service.description}
                            >
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* 2. Pricing */}
                    <TableCell className="w-[180px] px-3 py-2.5 whitespace-nowrap">
                      <span className="text-xs sm:text-sm font-semibold font-mono text-foreground">
                        {priceRange}
                      </span>
                    </TableCell>

                    {/* 3. Required Materials Range */}
                    <TableCell className="w-[180px] px-3 py-2.5 whitespace-nowrap">
                      <span className="text-xs sm:text-sm font-medium text-foreground">
                        {materialsRange}
                      </span>
                    </TableCell>

                    {/* 4. Row Actions */}
                    <TableCell className="w-[120px] text-right px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* View Details */}
                        <Tooltip label={t('services.viewDetails', 'View Details')}>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={() => setSelectedDetailServiceId(service.id)}
                            className="hover:bg-muted text-muted-foreground hover:text-foreground"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </ActionIcon>
                        </Tooltip>

                        {/* Add Category Shortcut */}
                        <PermissionGate permission="catalog.services.add">
                          <Tooltip label={t('services.addCategory', 'Add Category')}>
                            <ActionIcon
                              variant="subtle"
                              color="amber"
                              size="sm"
                              onClick={() => handleOpenCatDialog(service.id)}
                              className="hover:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </ActionIcon>
                          </Tooltip>
                        </PermissionGate>

                        {/* Edit Service */}
                        <PermissionGate permission="catalog.services.edit">
                          <Tooltip label={t('services.editService', 'Edit Service')}>
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              size="sm"
                              onClick={() => handleOpenServiceDialog(service)}
                              className="hover:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </ActionIcon>
                          </Tooltip>
                        </PermissionGate>

                        {/* Delete Service */}
                        <PermissionGate permission="catalog.services.remove">
                          <Tooltip label={t('common.delete', 'Delete')}>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              size="sm"
                              onClick={() => setServiceToDelete({ id: service.id, name: getLocName(service) })}
                              className="hover:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </ActionIcon>
                          </Tooltip>
                        </PermissionGate>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* ======================== COMPACT GRID VIEW ======================== */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedServices.map((service) => {
            const { categoriesCount, priceRange, materialsRange, distinctMats } = getServiceStats(service);
            const categories = service.categories || [];

            return (
              <Card
                key={service.id}
                onClick={() => setSelectedDetailServiceId(service.id)}
                className="rounded-xl border border-border shadow-xs hover:shadow-md hover:border-amber-500/40 transition-all cursor-pointer bg-card overflow-hidden flex flex-col justify-between p-4 group"
              >
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-xl bg-muted border border-border shrink-0 flex items-center justify-center overflow-hidden shadow-2xs"
                    onClick={(e) => {
                      if (service.imageUrl) {
                        e.stopPropagation();
                        setPreviewImage(getImageUrl(service.imageUrl)!);
                      }
                    }}
                  >
                    {service.imageUrl ? (
                      <LazyImage
                        src={service.imageUrl}
                        alt={getLocName(service)}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base">
                        {service.nameEn.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="font-bold text-sm text-foreground truncate" title={getLocName(service)}>
                        {getLocName(service)}
                      </h3>
                      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <PermissionGate permission="catalog.services.edit">
                          <button
                            type="button"
                            onClick={() => handleOpenServiceDialog(service)}
                            className="p-1 rounded text-muted-foreground hover:text-blue-500 hover:bg-muted"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </PermissionGate>
                        <PermissionGate permission="catalog.services.remove">
                          <button
                            type="button"
                            onClick={() => setServiceToDelete({ id: service.id, name: getLocName(service) })}
                            className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-muted"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </PermissionGate>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground truncate">
                      {i18n?.language === 'am' ? service.nameEn : service.nameAm}
                    </p>

                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {service.serviceGroup ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          <Layers className="w-2.5 h-2.5" />
                          {getLocName(service.serviceGroup)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] text-muted-foreground bg-muted border border-border">
                          {t('services.unassigned', 'General')}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground font-medium">
                        • {categoriesCount} {t('services.pricingCategories', 'Categories')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price and Category Pills */}
                <div className="mt-4 pt-3 border-t border-border/60 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t('services.priceRange', 'Price Range')}:</span>
                    <span className="font-mono font-bold text-foreground text-sm">{priceRange}</span>
                  </div>

                  {categories.length > 0 && (
                    <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none no-scrollbar py-0.5">
                      {categories.map((cat) => (
                        <span
                          key={cat.id}
                          className="inline-flex shrink-0 items-center gap-1 px-2 py-0.5 rounded bg-muted/60 text-foreground text-[10px] font-medium border border-border"
                        >
                          <span>{getLocName(cat)}:</span>
                          <span className="font-mono font-semibold text-primary">{formatPrice(cat.price)}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {distinctMats.length > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Boxes className="w-3 h-3 text-emerald-500" />
                        <span>{materialsRange}</span>
                      </span>
                      <span className="text-primary font-semibold text-xs flex items-center gap-0.5 group-hover:underline">
                        <span>{t('services.viewDetails', 'Details')}</span>
                        <Eye className="w-3 h-3 ml-0.5" />
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 5. Pagination Bar */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden p-3">
        <TablePagination
          page={currentPage}
          pageSize={pageSize}
          total={filteredServices.length}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={['10', '20', '30', '50']}
          itemLabel={t('common.services', 'services')}
          disabled={servicesLoading}
        />
      </div>

      {/* 6. Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage}
      />

      {/* ========================================================================= */}
      {/* 7. HIGH-END SERVICE DETAIL MODAL (Opens on Row / Card Click)              */}
      {/* ========================================================================= */}
      <Dialog
        open={!!selectedDetailServiceId}
        onOpenChange={(open) => !open && setSelectedDetailServiceId(null)}
      >
        <DialogContent className="sm:max-w-[680px] p-0 gap-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-card max-h-[88vh] flex flex-col">
          {activeDetailService && (
            <>
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-border bg-gradient-to-b from-muted/40 to-card flex items-start gap-4">
                <div
                  className="w-16 h-16 rounded-2xl bg-muted border border-border shrink-0 flex items-center justify-center overflow-hidden shadow-xs cursor-pointer group"
                  onClick={() => {
                    if (activeDetailService.imageUrl) {
                      setPreviewImage(getImageUrl(activeDetailService.imageUrl)!);
                    }
                  }}
                  title={activeDetailService.imageUrl ? t('common.view', 'View Image') : undefined}
                >
                  {activeDetailService.imageUrl ? (
                    <LazyImage
                      src={activeDetailService.imageUrl}
                      alt={getLocName(activeDetailService)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                      {activeDetailService.nameEn.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-foreground truncate">
                      {getLocName(activeDetailService)}
                    </h2>
                    {activeDetailService.serviceGroup && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 shrink-0">
                        <Layers className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        {getLocName(activeDetailService.serviceGroup)}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {i18n?.language === 'am' ? activeDetailService.nameEn : activeDetailService.nameAm}
                  </p>

                  {activeDetailService.description ? (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                      {activeDetailService.description}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 mt-1 italic">
                      {t('common.noDescription', 'No description provided')}
                    </p>
                  )}
                </div>
              </div>

              {/* Metric Strip */}
              {(() => {
                const stats = getServiceStats(activeDetailService);
                return (
                  <div className="px-6 py-3 bg-muted/25 border-b border-border grid grid-cols-3 gap-3">
                    <div className="bg-card p-3 rounded-xl border border-border shadow-2xs">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        {t('services.pricingCategories', 'Vehicle Categories')}
                      </span>
                      <span className="text-base font-bold text-foreground mt-0.5 block">
                        {stats.categoriesCount}
                      </span>
                    </div>
                    <div className="bg-card p-3 rounded-xl border border-border shadow-2xs">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        {t('services.priceRange', 'Price Range')}
                      </span>
                      <span className="text-xs sm:text-sm font-mono font-bold text-primary mt-0.5 block truncate">
                        {stats.priceRange}
                      </span>
                    </div>
                    <div className="bg-card p-3 rounded-xl border border-border shadow-2xs">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        {t('services.materialsRequired', 'Materials in BOM')}
                      </span>
                      <span className="text-base font-bold text-foreground mt-0.5 block">
                        {stats.distinctMats.length}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Body: Categories & Materials */}
              <div className="px-6 py-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      {t('services.pricingCategories', 'Pricing Categories & Materials')}
                    </h3>
                  </div>
                  <PermissionGate permission="catalog.services.add">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenCatDialog(activeDetailService.id)}
                      className="h-8 text-xs px-3 border border-dashed border-primary/40 text-primary hover:bg-primary/10 rounded-xl font-medium"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      <span>{t('services.addCategory', 'Add Category')}</span>
                    </Button>
                  </PermissionGate>
                </div>

                {activeDetailService.categories && activeDetailService.categories.length > 0 ? (
                  <div className="space-y-3">
                    {activeDetailService.categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="bg-card p-4 rounded-xl border border-border/80 shadow-2xs hover:border-amber-500/40 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-sm text-foreground">
                                {getLocName(cat)}
                              </h4>
                              <span className="text-xs text-muted-foreground">
                                ({i18n?.language === 'am' ? cat.nameEn : cat.nameAm})
                              </span>
                            </div>
                            <div className="mt-1.5">
                              <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold font-mono text-sm border border-primary/20 inline-block">
                                {formatPrice(cat.price)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <PermissionGate permission="catalog.services.edit">
                              <Tooltip label={t('common.edit', 'Edit')}>
                                <ActionIcon
                                  variant="subtle"
                                  color="blue"
                                  size="sm"
                                  onClick={() => handleOpenCatDialog(activeDetailService.id, cat)}
                                  className="hover:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </ActionIcon>
                              </Tooltip>
                            </PermissionGate>
                            <PermissionGate permission="catalog.services.remove">
                              <Tooltip label={t('common.delete', 'Delete')}>
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  size="sm"
                                  onClick={() =>
                                    setCatToDelete({
                                      serviceId: activeDetailService.id,
                                      catId: cat.id,
                                      name: getLocName(cat),
                                    })
                                  }
                                  className="hover:bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </ActionIcon>
                              </Tooltip>
                            </PermissionGate>
                          </div>
                        </div>

                        {/* Bill of Materials for this Category */}
                        {cat.materialUsages && cat.materialUsages.length > 0 ? (
                          <div className="pt-3 border-t border-border/60">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Boxes className="w-3.5 h-3.5 text-emerald-500" />
                              <span>{t('services.materialsRequired', 'Materials Required')}:</span>
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {cat.materialUsages.map((u) => {
                                const m = materials?.find((mat) => mat.id === u.materialId);
                                return m ? (
                                  <span
                                    key={u.materialId}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/70 text-foreground text-xs font-medium border border-border shadow-2xs"
                                  >
                                    <span className="font-semibold">{getLocName(m)}:</span>
                                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                      {(u.quantityUsed ?? u.quantity).toString()} {formatUnit(m.unit)}
                                    </span>
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground italic">
                            {t('services.noMaterialsRequired', 'No specific materials required')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-card rounded-xl border border-dashed border-border p-5 text-muted-foreground space-y-3">
                    <Car className="w-8 h-8 mx-auto text-muted-foreground/30" />
                    <p className="text-xs font-medium text-foreground">{t('services.noCategories', 'No pricing categories defined yet.')}</p>
                    <PermissionGate permission="catalog.services.add">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenCatDialog(activeDetailService.id)}
                        className="text-xs h-8 rounded-xl font-medium"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5 text-primary" />
                        <span>{t('services.addCategory', 'Add First Category')}</span>
                      </Button>
                    </PermissionGate>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between">
                <PermissionGate permission="catalog.services.edit">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleOpenServiceDialog(activeDetailService);
                    }}
                    className="text-xs h-9 px-3.5 rounded-xl border border-border bg-card hover:bg-muted font-medium flex items-center gap-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                    <span>{t('services.editService', 'Edit Service Info')}</span>
                  </Button>
                </PermissionGate>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedDetailServiceId(null)}
                    className="h-9 px-4 rounded-xl text-xs font-medium"
                  >
                    {t('common.close', 'Close')}
                  </Button>
                  <PermissionGate permission="catalog.services.add">
                    <Button
                      onClick={() => handleOpenCatDialog(activeDetailService.id)}
                      className="header-btn-primary h-9 text-xs px-4"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      <span>{t('services.addCategory', 'Add Category')}</span>
                    </Button>
                  </PermissionGate>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 8. SERVICE CREATE / EDIT MODAL                                            */}
      {/* ========================================================================= */}
      <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
        <DialogContent className="sm:max-w-[540px] p-0 gap-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-card">
          {/* Header */}
          <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20">
            <DialogTitle className="text-lg font-bold text-foreground">
              {editingService
                ? t('services.editService', 'Edit Service')
                : t('services.createService', 'Create Service')}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingService
                ? t('services.editServiceSubtitle', 'Update service information, bilingual names, and category group')
                : t('services.createServiceSubtitle', 'Add a new craft or installation service to your catalog')}
            </p>
          </DialogHeader>

          {/* Form Body */}
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {/* Service Type Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="serviceGroup" className="text-xs font-semibold text-foreground">
                  {t('services.serviceType', 'Service Type')}
                </Label>
                <button
                  type="button"
                  onClick={() => setIsManageGroupsOpen(true)}
                  className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{t('services.newType', 'New Type')}</span>
                </button>
              </div>
              <Select
                value={serviceFormData.serviceGroupId || 'none'}
                onValueChange={(val) =>
                  setServiceFormData({
                    ...serviceFormData,
                    serviceGroupId: !val || val === 'none' ? '' : val,
                  })
                }
              >
                <SelectTrigger id="serviceGroup" className="header-input w-full h-10">
                  <SelectValue placeholder={t('services.selectType', 'Select Service Type...')}>
                    {(val: string) => {
                      if (!val || val === 'none')
                        return (
                          <span className="text-muted-foreground">
                            {t('services.unassigned', 'General / Unassigned')}
                          </span>
                        );
                      const g = serviceGroups?.find((x) => x.id === val);
                      return g ? `${getLocName(g)} (${i18n?.language === 'am' ? g.nameEn : g.nameAm})` : val;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {t('services.unassigned', 'General / Unassigned')}
                  </SelectItem>
                  {serviceGroups?.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {getLocName(g)}{' '}
                      <span className="text-xs text-muted-foreground font-normal">
                        ({i18n?.language === 'am' ? g.nameEn : g.nameAm})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bilingual Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="serviceNameEn" className="text-xs font-semibold text-foreground">
                  {t('materials.nameEn', 'Name (EN)')} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="serviceNameEn"
                  className="header-input w-full h-10 text-sm"
                  value={serviceFormData.nameEn}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, nameEn: e.target.value })}
                  placeholder={t('services.placeholders.serviceNameEn', 'e.g. Tinting')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="serviceNameAm" className="text-xs font-semibold text-foreground">
                  {t('materials.nameAm', 'Name (AM)')}
                </Label>
                <Input
                  id="serviceNameAm"
                  className="header-input w-full h-10 text-sm"
                  value={serviceFormData.nameAm}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, nameAm: e.target.value })}
                  placeholder={t('services.placeholders.serviceNameAm', 'e.g. ጥቁር ፌሮ')}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="serviceDesc" className="text-xs font-semibold text-foreground">
                {t('common.description', 'Description')}
              </Label>
              <Input
                id="serviceDesc"
                className="header-input w-full h-10 text-sm"
                value={serviceFormData.description}
                onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                placeholder={t('services.placeholders.serviceDesc', 'e.g. Full window tinting service')}
              />
            </div>

            {/* Image Upload Box */}
            <div className="space-y-2 pt-1">
              <Label className="text-xs font-semibold text-foreground block">
                {t('storage.table.image', 'Service Image')}
              </Label>

              <div className="p-3.5 rounded-xl border border-border bg-muted/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-card border border-border shrink-0 flex items-center justify-center overflow-hidden shadow-2xs">
                    {serviceFile ? (
                      <img
                        src={URL.createObjectURL(serviceFile)}
                        alt="Selected"
                        className="w-full h-full object-contain p-0.5"
                      />
                    ) : editingService?.imageUrl ? (
                      <LazyImage
                        src={editingService.imageUrl}
                        alt="Current"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-muted-foreground/60" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {serviceFile
                        ? serviceFile.name
                        : editingService?.imageUrl
                        ? t('common.currentImage', 'Current Service Photo')
                        : t('common.noImageSelected', 'No photo uploaded')}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      JPG, PNG, WEBP (max 5MB)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setServiceFile(e.target.files?.[0] || null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 text-xs px-3 rounded-lg border border-border bg-card hover:bg-muted font-medium flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>{serviceFile || editingService?.imageUrl ? t('common.change', 'Change') : t('common.upload', 'Upload')}</span>
                  </Button>
                  {serviceFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setServiceFile(null)}
                      className="h-8 text-xs px-2 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                      title={t('common.remove', 'Remove')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              onClick={() => setIsServiceDialogOpen(false)}
              className="h-9 px-4 rounded-xl text-xs font-medium"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={() => saveServiceMutation.mutate()}
              disabled={saveServiceMutation.isPending || !serviceFormData.nameEn.trim()}
              className="header-btn-primary h-9 px-5 text-xs font-semibold"
            >
              {saveServiceMutation.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 9. MANAGE SERVICE TYPES MODAL                                             */}
      {/* ========================================================================= */}
      <Dialog open={isManageGroupsOpen} onOpenChange={setIsManageGroupsOpen}>
        <DialogContent className="sm:max-w-[540px] p-0 gap-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-card">
          <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
              <Layers className="w-5 h-5 text-primary" />
              <span>{t('services.manageTypes', 'Manage Service Types')}</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('services.manageTypesDesc', 'Organize services under types such as Seats, Carpets, Sponge, Mastic, Polish, Brush...')}
            </p>
          </DialogHeader>

          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
            {/* Add New Type Form */}
            <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t('services.newType', 'Add New Service Type')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Input
                  className="header-input h-9 text-xs"
                  placeholder={t('services.typeNameAm', 'Type Name (AM, e.g. ወንበር)')}
                  value={newGroupNameAm}
                  onChange={(e) => setNewGroupNameAm(e.target.value)}
                />
                <Input
                  className="header-input h-9 text-xs"
                  placeholder={t('services.typeNameEn', 'Type Name (EN, e.g. Seats)')}
                  value={newGroupNameEn}
                  onChange={(e) => setNewGroupNameEn(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => createGroupMutation.mutate()}
                  disabled={!newGroupNameAm.trim() || !newGroupNameEn.trim() || createGroupMutation.isPending}
                  className="header-btn-primary h-8 text-xs font-semibold px-4"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {createGroupMutation.isPending ? t('common.saving', 'Saving...') : t('services.addType', 'Add Type')}
                </Button>
              </div>
            </div>

            {/* List of Existing Types */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t('services.serviceTypes', 'Existing Types')} ({serviceGroups?.length || 0})
              </p>
              {serviceGroups?.map((group) => {
                const isEditing = editingGroupId === group.id;
                return (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:border-border/80 transition-colors"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <Input
                          className="header-input h-8 text-xs flex-1"
                          value={editGroupNameAm}
                          onChange={(e) => setEditGroupNameAm(e.target.value)}
                        />
                        <Input
                          className="header-input h-8 text-xs flex-1"
                          value={editGroupNameEn}
                          onChange={(e) => setEditGroupNameEn(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateGroupMutation.mutate({
                              id: group.id,
                              nameAm: editGroupNameAm,
                              nameEn: editGroupNameEn,
                            })
                          }
                          disabled={updateGroupMutation.isPending}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-md"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGroupId(null)}
                          className="p-1.5 text-muted-foreground hover:bg-muted rounded-md"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <Layers className="w-4 h-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">
                              {group.nameAm} <span className="font-normal text-muted-foreground">({group.nameEn})</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {group._count?.services || 0} {group._count?.services === 1 ? 'service' : 'services'} assigned
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGroupId(group.id);
                              setEditGroupNameAm(group.nameAm);
                              setEditGroupNameEn(group.nameEn);
                            }}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setGroupToDelete({ id: group.id, name: getLocName(group) })}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {(!serviceGroups || serviceGroups.length === 0) && (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  {t('services.noTypes', 'No service types created yet.')}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end">
            <Button
              variant="outline"
              onClick={() => setIsManageGroupsOpen(false)}
              className="h-9 px-4 rounded-xl text-xs font-medium"
            >
              {t('common.close', 'Close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 10. PRICING CATEGORY CREATE / EDIT MODAL                                  */}
      {/* ========================================================================= */}
      <Dialog open={isCatDialogOpen} onOpenChange={setIsCatDialogOpen}>
        <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden rounded-2xl border border-border shadow-2xl bg-card">
          <DialogHeader className="px-6 py-5 border-b border-border bg-muted/20">
            <DialogTitle className="text-lg font-bold text-foreground">
              {editingCat
                ? t('services.editCategory', 'Edit Category')
                : t('services.createCategory', 'Create Category')}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('services.categorySubtitle', 'Set vehicle category pricing and material consumption')}
            </p>
          </DialogHeader>

          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="catNameEn" className="text-xs font-semibold text-foreground">
                  {t('materials.nameEn', 'Name (EN)')} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="catNameEn"
                  className="header-input w-full h-10 text-sm"
                  value={catFormData.nameEn}
                  onChange={(e) => setCatFormData({ ...catFormData, nameEn: e.target.value })}
                  placeholder={t('services.placeholders.catNameEn', 'e.g. Sedan')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="catNameAm" className="text-xs font-semibold text-foreground">
                  {t('materials.nameAm', 'Name (AM)')}
                </Label>
                <Input
                  id="catNameAm"
                  className="header-input w-full h-10 text-sm"
                  value={catFormData.nameAm}
                  onChange={(e) => setCatFormData({ ...catFormData, nameAm: e.target.value })}
                  placeholder={t('services.placeholders.catNameAm', 'e.g. ሰዳን')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="catPrice" className="text-xs font-semibold text-foreground">
                {t('common.price', 'Price')} ({i18n?.language === 'am' ? 'ብር' : 'Birr'}) <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="catPrice"
                type="text"
                className="header-input w-full h-10 font-mono text-sm"
                value={catFormData.price}
                onChange={(e) => setCatFormData({ ...catFormData, price: formatInputNumber(e.target.value) })}
                placeholder="0.00"
              />
            </div>

            {/* Bill of Materials (BOM) Editor */}
            <div className="space-y-3 border-t border-border/80 pt-4 mt-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-foreground uppercase tracking-wider block">
                    {t('services.materialsUsed', 'Materials Used')}
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t('services.materialsUsedDesc', 'Automatically deducted when order is completed')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addMaterialUsage}
                  className="h-8 text-xs px-3 rounded-lg border border-dashed border-primary/40 text-primary hover:bg-primary/10 font-medium"
                >
                  <Plus className="mr-1 h-3 w-3" /> {t('services.addMaterial', 'Add Material')}
                </Button>
              </div>

              {materialUsages.map((mu, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-muted/30 p-2.5 rounded-xl border border-border w-full">
                  <Select
                    value={mu.materialId}
                    onValueChange={(v) => {
                      const newMatId = v || '';
                      const m = materials?.find((x) => x.id === newMatId);
                      let curQty = mu.quantity;
                      if (isUnitIntegerOnly(m?.unit) && String(curQty).includes('.')) {
                        curQty = String(Math.round(Number(curQty)) || 1);
                      }
                      updateMaterialUsage(idx, 'materialId', newMatId);
                      updateMaterialUsage(idx, 'quantity', curQty);
                    }}
                  >
                    <SelectTrigger className="header-input flex-1 h-9 bg-card">
                      <SelectValue placeholder={t('services.selectMaterial', 'Select Material...')}>
                        {(val: string) => {
                          if (!val) return <span className="text-muted-foreground">{t('services.selectMaterial', 'Select Material...')}</span>;
                          const m = materials?.find((x) => x.id === val);
                          return m ? `${getLocName(m)} (${formatUnit(m.unit)})` : val;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {materials?.map((m) => (
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
                      const m = materials?.find((mat) => mat.id === mu.materialId);
                      const isInt = isUnitIntegerOnly(m?.unit);
                      const regex = isInt ? /^\d*$/ : /^\d*\.?\d*$/;
                      if (regex.test(val)) {
                        updateMaterialUsage(idx, 'quantity', val);
                      }
                    }}
                    className="header-input w-[100px] h-9 bg-card font-mono text-xs"
                    placeholder={t('orders.detail.quantity', 'Qty')}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMaterialUsage(idx)}
                    className="h-9 w-9 p-0 text-rose-500 hover:bg-rose-500/10 rounded-lg shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {materialUsages.length === 0 && (
                <div className="text-center py-4 rounded-xl border border-dashed border-border/70 p-3 text-xs text-muted-foreground italic">
                  {t('services.noMaterialsRequired', 'No materials assigned to this category.')}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              onClick={() => setIsCatDialogOpen(false)}
              className="h-9 px-4 rounded-xl text-xs font-medium"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={() => saveCatMutation.mutate()}
              disabled={saveCatMutation.isPending || !catFormData.nameEn.trim()}
              className="header-btn-primary h-9 px-5 text-xs font-semibold"
            >
              {saveCatMutation.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 11. CONFIRM DIALOGS                                                       */}
      {/* ========================================================================= */}
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

      <ConfirmDialog
        isOpen={!!groupToDelete}
        onClose={() => setGroupToDelete(null)}
        onConfirm={() => {
          if (groupToDelete) deleteGroupMutation.mutate(groupToDelete.id);
        }}
        title={t('services.deleteTypeTitle', 'Delete Service Type')}
        message={
          <>
            {i18n?.language === 'am'
              ? `${groupToDelete?.name} መሰረዝ እንደሚፈልጉ እርግጠኛ ነዎት? በእዚህ አይነት ስር ያሉ አገልግሎቶች ያልተመደቡ ይሆናሉ።`
              : `Are you sure you want to delete ${groupToDelete?.name}? Services assigned to this type will become unassigned.`}
          </>
        }
        type="danger"
        confirmText={t('common.delete', 'Delete')}
      />

      <ConfirmDialog
        isOpen={!!serviceToDelete}
        onClose={() => setServiceToDelete(null)}
        onConfirm={() => {
          if (serviceToDelete) deleteServiceMutation.mutate(serviceToDelete.id);
        }}
        title={t('services.deleteServiceTitle', 'Delete Service')}
        message={
          <>
            {i18n?.language === 'am'
              ? `${serviceToDelete?.name} መሰረዝ እንደሚፈልጉ እርግጠኛ ነዎት?`
              : `Are you sure you want to delete ${serviceToDelete?.name}?`}
          </>
        }
        type="danger"
        confirmText={t('common.delete', 'Delete')}
      />
    </div>
  );
}
