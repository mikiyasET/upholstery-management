import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { getImageUrl, formatAppDate } from '../lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSearch,
} from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import { ImagePreviewModal } from '../components/ui/image-preview-modal';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Boxes,
  History,
  Edit2,
  Trash2,
  RotateCcw,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ImageOff,
  User,
  ArrowRight,
  MapPin,
  Lock,
  UploadCloud,
  X,
  ListFilter,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, ExecutiveAddButton, TablePagination } from '../components/common';
import { Badge, Box, Button as MantineButton, Tooltip, Select as MantineSelect } from '@mantine/core';

export type AssetLog = {
  id: string;
  assetId: string;
  action: 'CREATE' | 'UPDATE' | 'TRASH' | 'RESTORE' | 'PERMANENT_DELETE';
  changes: Record<string, { from?: any; to?: any }> | null;
  notes: string | null;
  changedById: string;
  createdAt: string;
  changedBy: { id: string; name: string; role: string };
};

export type Asset = {
  id: string;
  assetTag: string;
  nameEn: string;
  nameAm: string;
  description: string | null;
  quantity: number;
  unit: string;
  category: string | null;
  location: string | null;
  imageUrl: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  scheduledPurgeAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string; role: string };
  deletedBy?: { id: string; name: string; role: string };
  _count?: { logs: number };
  logs?: AssetLog[];
};

const CATEGORY_OPTIONS = [
  'Machines & Equipment',
  'Power Tools',
  'Hand Tools',
  'Screws & Fasteners',
  'Electronics & Testing',
  'Furniture & Workshop',
  'Company Vehicles',
  'Other Equipment',
];

const UNIT_OPTIONS = ['PCS', 'SET', 'KG', 'METER', 'BOX', 'PAIR', 'ROLL', 'LITER', 'OTHER'];

export default function Assets() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();

  // Navigation tab: 'active' | 'trash'
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');

  // Search & Filtering
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const getCategoryLabel = useCallback(
    (cat: string) => {
      if (!cat || cat === 'all') return t('assets.filterByCategory', 'All Categories');
      switch (cat) {
        case 'Machines & Equipment':
          return t('assets.categories.machines', 'Machines & Equipment');
        case 'Power Tools':
          return t('assets.categories.powerTools', 'Power Tools');
        case 'Hand Tools':
          return t('assets.categories.handTools', 'Hand Tools');
        case 'Screws & Fasteners':
          return t('assets.categories.fasteners', 'Screws & Fasteners');
        case 'Electronics & Testing':
          return t('assets.categories.electronics', 'Electronics & Testing');
        case 'Furniture & Workshop':
        case 'Furniture & Fixtures':
          return t('assets.categories.furniture', 'Furniture & Workshop');
        case 'Company Vehicles':
        case 'Vehicles':
          return t('assets.categories.vehicles', 'Company Vehicles');
        case 'Other Equipment':
        case 'Other':
          return t('assets.categories.other', 'Other Equipment');
        default:
          return cat;
      }
    },
    [t]
  );

  const categorySelectData = useMemo(() => [
    { value: 'all', label: t('assets.filterByCategory', 'All Categories') },
    ...CATEGORY_OPTIONS.map((cat) => ({
      value: cat,
      label: getCategoryLabel(cat),
    })),
  ], [t, i18n.language, getCategoryLabel]);

  // Modals
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Audit History Modal
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState<Asset | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Trashing & Restoring Confirmations
  const [assetToTrash, setAssetToTrash] = useState<Asset | null>(null);
  const [assetToRestore, setAssetToRestore] = useState<Asset | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    assetTag: '',
    nameEn: '',
    nameAm: '',
    quantity: '1',
    unit: 'PCS',
    category: 'Machines & Equipment',
    location: '',
    description: '',
    auditNote: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // 1. Fetch Assets query based on active tab
  const {
    data: assets = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<Asset[]>({
    queryKey: ['company-assets', activeTab, selectedCategory, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('status', activeTab);
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      if (search.trim()) {
        params.append('search', search.trim());
      }
      const res = await api.get(`/assets?${params.toString()}`);
      return res.data;
    },
  });

  // 2. Fetch Trash Summary query for real-time alert badges
  const { data: trashSummary } = useQuery<{ trashCount: number; earliestPurgeAt: string | null }>({
    queryKey: ['assets-trash-summary'],
    queryFn: async () => {
      const res = await api.get('/assets/trash-summary');
      return res.data;
    },
    staleTime: 30 * 1000,
  });

  // 3. Detailed Asset Query for History Modal
  const { data: detailedAsset, isLoading: isDetailedLoading } = useQuery<Asset>({
    queryKey: ['asset-detailed', selectedAssetForHistory?.id],
    queryFn: async () => {
      if (!selectedAssetForHistory?.id) throw new Error('No asset selected');
      const res = await api.get(`/assets/${selectedAssetForHistory.id}`);
      return res.data;
    },
    enabled: !!selectedAssetForHistory?.id && isHistoryOpen,
  });

  // Create / Update Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = new FormData();
      if (formData.assetTag.trim()) payload.append('assetTag', formData.assetTag.trim());
      payload.append('nameEn', formData.nameEn.trim());
      payload.append('nameAm', formData.nameAm.trim());
      payload.append('quantity', formData.quantity || '1');
      payload.append('unit', formData.unit);
      if (formData.category) payload.append('category', formData.category);
      if (formData.location.trim()) payload.append('location', formData.location.trim());
      if (formData.description.trim()) payload.append('description', formData.description.trim());
      if (formData.auditNote.trim()) payload.append('auditNote', formData.auditNote.trim());
      if (imageFile) payload.append('image', imageFile);

      if (editingAsset) {
        await api.patch(`/assets/${editingAsset.id}`, payload);
      } else {
        await api.post('/assets', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets-trash-summary'] });
      toast.success(
        editingAsset
          ? t('assets.savedSuccessfully', 'Asset updated successfully (audit log saved)')
          : t('assets.savedSuccessfully', 'Asset registered successfully')
      );
      handleCloseForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Operation failed');
    },
  });

  // Move to Trash Mutation (30-day retention)
  const trashMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/assets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets-trash-summary'] });
      toast.success(
        t('assets.movedToTrashSuccessfully', 'Asset moved to 30-day retention trash bin')
      );
      setAssetToTrash(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to move to trash');
    },
  });

  // Restore from Trash Mutation
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/assets/${id}/restore`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets-trash-summary'] });
      toast.success(t('assets.restoreSuccess', 'Asset restored to active inventory'));
      setAssetToRestore(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to restore asset');
    },
  });

  // Open Form for Create / Edit
  const handleOpenForm = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        assetTag: asset.assetTag,
        nameEn: asset.nameEn,
        nameAm: asset.nameAm,
        quantity: String(asset.quantity),
        unit: asset.unit || 'PCS',
        category: asset.category || 'Machines & Equipment',
        location: asset.location || '',
        description: asset.description || '',
        auditNote: '',
      });
      setImagePreviewUrl(asset.imageUrl ? getImageUrl(asset.imageUrl) || null : null);
    } else {
      setEditingAsset(null);
      setFormData({
        assetTag: '',
        nameEn: '',
        nameAm: '',
        quantity: '1',
        unit: 'PCS',
        category: 'Machines & Equipment',
        location: '',
        description: '',
        auditNote: '',
      });
      setImagePreviewUrl(null);
    }
    setImageFile(null);
    setIsFormDialogOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormDialogOpen(false);
    setEditingAsset(null);
    setImageFile(null);
    setImagePreviewUrl(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleOpenHistory = (asset: Asset) => {
    setSelectedAssetForHistory(asset);
    setIsHistoryOpen(true);
  };

  // Pagination calculation
  const totalItems = assets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedAssets = assets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const calculateDaysRemaining = (purgeDateString: string | null) => {
    if (!purgeDateString) return 30;
    const purge = new Date(purgeDateString).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((purge - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const trashCount = trashSummary?.trashCount || 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Page Header */}
      <PageHeader
        title={t('assets.title', 'Company Assets')}
        subtitle={t(
          'assets.subtitle',
          'Track and audit company property (machines, tools, hardware) with mandatory 30-day retention.'
        )}
        hideSubtitleOnMobile
        badge={`${assets.length} ${activeTab === 'trash' ? t('assets.deletedBadge', 'Deleted') : t('common.active', 'Active')}`}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        refreshTooltip={t('assets.refreshTooltip', 'Refresh asset catalog')}
        action={
          <PermissionGate permission="assets.add">
            <ExecutiveAddButton
              label={t('assets.createAsset', 'Register Asset')}
              onClick={() => handleOpenForm()}
            />
          </PermissionGate>
        }
      />

      {/* 2. Top Notice Banner when Trash has items */}
      {trashCount > 0 && activeTab === 'active' && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {t(
                  'assets.itemsInTrashAlert',
                  '{{count}} company asset(s) are held in the 30-Day Trash Bin pending auto-purge.',
                  { count: trashCount }
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t(
                  'assets.trashAlertBanner',
                  'Deleted assets cannot be erased immediately; they remain retrievable for 30 days.'
                )}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 shrink-0"
            onClick={() => {
              setActiveTab('trash');
              setCurrentPage(1);
            }}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {t('assets.viewTrash', 'View Deleted Assets')} ({trashCount})
          </Button>
        </div>
      )}

      {/* 3. Sub-Navigation Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div className="overflow-x-auto no-scrollbar scrollbar-none -mx-1 px-1 sm:mx-0 sm:px-0">
          <Box
            p={4}
            style={{
              backgroundColor: 'var(--surface-card, rgba(255, 255, 255, 0.04))',
              border: '1px solid var(--surface-border, rgba(255, 255, 255, 0.08))',
              borderRadius: 12,
              display: 'inline-flex',
              gap: 6,
              boxShadow: 'var(--shadow-card, 0 1px 3px rgba(0, 0, 0, 0.1))',
            }}
            className="flex-nowrap shrink-0"
          >
            <MantineButton
              variant={activeTab === 'active' ? 'filled' : 'subtle'}
              color="amber"
              size="sm"
              radius="md"
              leftSection={<Boxes size={16} />}
              className="whitespace-nowrap shrink-0"
              onClick={() => {
                setActiveTab('active');
                setCurrentPage(1);
              }}
            >
              {t('assets.activeAssets', 'Active Assets')}
            </MantineButton>

            <MantineButton
              variant={activeTab === 'trash' ? 'filled' : 'subtle'}
              color={trashCount > 0 ? 'red' : 'gray'}
              size="sm"
              radius="md"
              leftSection={<Trash2 size={16} />}
              className="whitespace-nowrap shrink-0"
              rightSection={
                trashCount > 0 ? (
                  <Badge size="xs" variant="filled" color="red">
                    {trashCount}
                  </Badge>
                ) : undefined
              }
              onClick={() => {
                setActiveTab('trash');
                setCurrentPage(1);
              }}
            >
              {t('assets.trashBin', 'Deleted Assets (30-Day Retention)')}
            </MantineButton>
          </Box>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <MantineSelect
            data={categorySelectData}
            value={selectedCategory}
            onChange={(val) => {
              setSelectedCategory(val || 'all');
              setCurrentPage(1);
            }}
            clearable={false}
            leftSection={<ListFilter size={15} style={{ color: 'var(--text-muted)' }} />}
            size="sm"
            radius="md"
            className="w-full sm:w-60"
            styles={{
              input: {
                backgroundColor: 'var(--surface-bg)',
                borderColor: 'var(--surface-border)',
                fontSize: '13px',
                fontWeight: 500,
                height: 36,
              },
            }}
          />

          {selectedCategory !== 'all' && (
            <MantineButton
              variant="subtle"
              color="gray"
              size="xs"
              radius="md"
              onClick={() => {
                setSelectedCategory('all');
                setCurrentPage(1);
              }}
              leftSection={<X size={13} />}
              className="shrink-0 h-9 font-semibold"
            >
              {t('common.clear', 'Reset')}
            </MantineButton>
          )}
        </div>
      </div>

      {/* 4. Trash Bin Warning Info Card (when in trash tab) */}
      {activeTab === 'trash' && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-bold">
              {t('assets.trashAlertBanner', '30-Day Mandatory Retention Policy Active')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(
                'assets.retentionPolicyDesc',
                'To protect company assets against accidental or unauthorized permanent loss, items moved to deleted assets cannot be deleted instantly. The system will hold them safely for 30 days and auto-purge them once the period lapses. You can restore items at any time.'
              )}
            </p>
          </div>
        </div>
      )}

      {/* 5. Main Assets Table Card */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-border flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between bg-card">
          <TableSearch
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder={t('assets.searchPlaceholder', 'Search by name, tag, category, location...')}
            className="w-full sm:w-[440px] md:w-[500px]"
          />
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {totalItems}{' '}
              {activeTab === 'trash'
                ? t('assets.deletedAssetsCount', 'Deleted Assets')
                : t('assets.activeAssetsCount', 'Assets')}
            </span>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('common.image', 'Image')}</TableHead>
              <TableHead>{t('assets.assetTag', 'Asset Tag')}</TableHead>
              <TableHead>{t('assets.nameEn', 'Name (EN)')}</TableHead>
              <TableHead>{t('assets.nameAm', 'Name (AM)')}</TableHead>
              <TableHead>{t('assets.quantity', 'Quantity')}</TableHead>
              <TableHead>{t('assets.category', 'Category')}</TableHead>
              <TableHead>{t('assets.location', 'Location')}</TableHead>
              {activeTab === 'trash' ? (
                <>
                  <TableHead>{t('assets.changedBy', 'Deleted By')}</TableHead>
                  <TableHead>{t('assets.scheduledPurgeDate', '30-Day Auto-Purge')}</TableHead>
                </>
              ) : (
                <TableHead>{t('assets.history', 'Audit Trail')}</TableHead>
              )}
              <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={activeTab === 'trash' ? 10 : 9} className="text-center py-10">
                  {t('common.loading', 'Loading assets...')}
                </TableCell>
              </TableRow>
            ) : paginatedAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={activeTab === 'trash' ? 10 : 9} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Boxes className="h-10 w-10 stroke-1 opacity-40" />
                    <p className="font-medium text-sm">
                      {activeTab === 'trash'
                        ? t('assets.noTrashItems', 'Trash bin is empty. No assets pending purge.')
                        : t('assets.noAssetsFound', 'No assets found.')}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedAssets.map((asset) => {
                const daysRemaining = calculateDaysRemaining(asset.scheduledPurgeAt);

                return (
                  <TableRow key={asset.id} className="hover:bg-muted/40 transition-colors">
                    {/* Thumbnail Image */}
                    <TableCell>
                      {asset.imageUrl ? (
                        <LazyImage
                          src={asset.imageUrl}
                          alt={asset.nameEn}
                          className="h-11 w-11 rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity border border-border"
                          onClick={() => setPreviewImage(getImageUrl(asset.imageUrl)!)}
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-lg bg-muted flex items-center justify-center border border-border">
                          <ImageOff className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>

                    {/* Asset Tag */}
                    <TableCell>
                      <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-secondary text-secondary-foreground border border-border inline-block tracking-wider">
                        {asset.assetTag}
                      </span>
                    </TableCell>

                    {/* Name EN */}
                    <TableCell className="font-semibold text-foreground">
                      {asset.nameEn}
                      {asset.description && (
                        <p className="text-xs text-muted-foreground font-normal line-clamp-1 max-w-[200px]">
                          {asset.description}
                        </p>
                      )}
                    </TableCell>

                    {/* Name AM */}
                    <TableCell className="font-medium text-foreground">{asset.nameAm}</TableCell>

                    {/* Quantity */}
                    <TableCell>
                      <Badge
                        size="md"
                        variant="light"
                        color={asset.quantity > 0 ? 'teal' : 'gray'}
                        className="font-bold tracking-tight"
                      >
                        {asset.quantity} {asset.unit}
                      </Badge>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      {asset.category ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground border border-border">
                          {getCategoryLabel(asset.category)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Location */}
                    <TableCell>
                      {asset.location ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin size={12} className="text-amber-500 shrink-0" />
                          <span>{asset.location}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Trash Tab Extra Info */}
                    {activeTab === 'trash' ? (
                      <>
                        <TableCell>
                          <div className="text-xs">
                            <span className="font-medium text-foreground">
                              {asset.deletedBy?.name || 'User'}
                            </span>
                            <span className="block text-[10px] text-muted-foreground">
                              {asset.deletedAt
                                ? formatAppDate(asset.deletedAt)
                                : '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge
                              size="sm"
                              variant="filled"
                              color={daysRemaining <= 3 ? 'red' : 'amber'}
                            >
                              <Clock size={11} className="mr-1 inline" />
                              {daysRemaining === 0
                                ? t('assets.autoPurgesToday', 'Purges today')
                                : t('assets.autoPurgesIn', 'Purges in {{days}}d', {
                                    days: daysRemaining,
                                  })}
                            </Badge>
                            {asset.scheduledPurgeAt && (
                              <p className="text-[10px] text-muted-foreground">
                                {formatAppDate(asset.scheduledPurgeAt)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      /* Active Tab: Log Count Badge & Quick History */
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenHistory(asset)}
                        >
                          <History size={14} className="text-primary" />
                          <span>
                            {asset._count?.logs || 0} {t('assets.history', 'logs')}
                          </span>
                        </Button>
                      </TableCell>
                    )}

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {activeTab === 'trash' ? (
                          <>
                            {/* Restore Button */}
                            <PermissionGate permission="assets.remove">
                              <Tooltip label="Restore asset to active inventory">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2.5 text-xs text-teal-600 dark:text-teal-400 border-teal-500/30 hover:bg-teal-500/10"
                                  onClick={() => setAssetToRestore(asset)}
                                >
                                  <RotateCcw size={14} className="mr-1" />
                                  {t('assets.restore', 'Restore')}
                                </Button>
                              </Tooltip>
                            </PermissionGate>

                            {/* Locked Indicator */}
                            <Tooltip label="Protected by 30-day retention lock. Cannot be deleted instantly.">
                              <span className="inline-flex items-center justify-center p-1.5 text-muted-foreground">
                                <Lock size={15} className="opacity-60" />
                              </span>
                            </Tooltip>
                          </>
                        ) : (
                          <>
                            {/* View Audit History */}
                            <Tooltip label="View complete audit trail">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() => handleOpenHistory(asset)}
                              >
                                <History size={15} />
                              </Button>
                            </Tooltip>

                            {/* Edit Asset */}
                            <PermissionGate permission="assets.edit">
                              <Tooltip label="Edit asset details">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => handleOpenForm(asset)}
                                >
                                  <Edit2 size={15} />
                                </Button>
                              </Tooltip>
                            </PermissionGate>

                            {/* Move to Trash */}
                            <PermissionGate permission="assets.remove">
                              <Tooltip label="Move to 30-day retention trash">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  onClick={() => setAssetToTrash(asset)}
                                >
                                  <Trash2 size={15} />
                                </Button>
                              </Tooltip>
                            </PermissionGate>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {totalItems > 0 && (
          <TablePagination
            page={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            total={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            itemLabel={t('common.assets', 'assets')}
          />
        )}
      </div>

      {/* ======================================================== */}
      {/* 6. CREATE / EDIT ASSET DIALOG */}
      {/* ======================================================== */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5 text-amber-500" />
              {editingAsset
                ? t('assets.editAsset', 'Edit Company Asset')
                : t('assets.createAsset', 'Register New Company Asset')}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            {/* Asset Tag & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>{t('assets.assetTag', 'Asset Tag (Optional)')}</Label>
                <Input
                  value={formData.assetTag}
                  onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })}
                  placeholder="Auto-generated (e.g. AST-0001)"
                  className="font-mono text-sm"
                />
              </div>

              <div className="grid gap-1.5">
                <Label>{t('assets.category', 'Category')}</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val || '' })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={t('assets.selectCategory', 'Select Category')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {getCategoryLabel(cat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Names: English and Amharic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>
                  {t('assets.nameEn', 'Name (English)')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  placeholder="e.g. Bosch Rotary Hammer Drill"
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label>
                  {t('assets.nameAm', 'Name (Amharic)')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.nameAm}
                  onChange={(e) => setFormData({ ...formData, nameAm: e.target.value })}
                  placeholder="e.g. የቦሽ መሰርሰሪያ ማሽን"
                  required
                />
              </div>
            </div>

            {/* Quantity, Unit & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label>
                  {t('assets.quantity', 'Quantity')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>

              <div className="grid gap-1.5">
                <Label>{t('assets.unit', 'Unit')}</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(val) => setFormData({ ...formData, unit: val || 'PCS' })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="PCS" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label>{t('assets.location', 'Location')}</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Bay 2 Locker"
                />
              </div>
            </div>

            {/* Description */}
            <div className="grid gap-1.5">
              <Label>{t('assets.description', 'Description / Technical Specs')}</Label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Serial numbers, voltage, brand details, or condition notes..."
                className="w-full min-h-[70px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Image Upload */}
            <div className="grid gap-1.5">
              <Label>{t('assets.image', 'Asset Photo')}</Label>
              <div className="flex items-center gap-4">
                {imagePreviewUrl ? (
                  <div className="relative h-16 w-16 rounded-lg overflow-hidden border border-border group shrink-0">
                    <img
                      src={imagePreviewUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreviewUrl(null);
                      }}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground shrink-0 bg-muted/30">
                    <UploadCloud size={20} />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="text-xs cursor-pointer"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Upload JPEG/PNG/WebP image (max 5MB).
                  </p>
                </div>
              </div>
            </div>

            {/* Audit Note (mandatory/highlighted on Edit) */}
            {editingAsset && (
              <div className="grid gap-1.5 p-3 rounded-lg bg-muted/40 border border-border">
                <Label className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <History size={13} className="text-primary" />
                  {t('assets.auditNote', 'Reason / Audit Note for Changes')}
                </Label>
                <Input
                  value={formData.auditNote}
                  onChange={(e) => setFormData({ ...formData, auditNote: e.target.value })}
                  placeholder={t(
                    'assets.auditNotePlaceholder',
                    'Describe why this asset is updated (e.g. Bought 3 more, serviced motor)...'
                  )}
                  className="text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Changes to quantity, location, or details are permanently saved with your user ID.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm} disabled={saveMutation.isPending}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={
                saveMutation.isPending || !formData.nameEn.trim() || !formData.nameAm.trim()
              }
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {saveMutation.isPending
                ? t('common.loading', 'Saving...')
                : editingAsset
                ? t('common.save', 'Save Changes')
                : t('assets.createAsset', 'Register Asset')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 7. AUDIT HISTORY & DIFF TRAIL MODAL */}
      {/* ======================================================== */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <span>{t('assets.auditHistory', 'Asset Audit History')}</span>
            </DialogTitle>
          </DialogHeader>

          {isDetailedLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              {t('common.loading', 'Loading audit trail...')}
            </div>
          ) : !detailedAsset ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              {t('assets.noHistory', 'No audit logs found.')}
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Asset Summary Banner */}
              <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted">
                      {detailedAsset.assetTag}
                    </span>
                    <span className="font-bold text-foreground">{detailedAsset.nameEn}</span>
                    <span className="text-xs text-muted-foreground">({detailedAsset.nameAm})</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Current Quantity: <strong>{detailedAsset.quantity} {detailedAsset.unit}</strong> •{' '}
                    Location: <strong>{detailedAsset.location || '—'}</strong>
                  </p>
                </div>
                <Badge size="lg" variant="light" color="amber">
                  {detailedAsset.logs?.length || 0} Total Events
                </Badge>
              </div>

              {/* Timeline of Logs */}
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-border before:z-0">
                {detailedAsset.logs && detailedAsset.logs.length > 0 ? (
                  detailedAsset.logs.map((log) => {
                    const actionColors: Record<string, string> = {
                      CREATE: 'teal',
                      UPDATE: 'blue',
                      TRASH: 'red',
                      RESTORE: 'violet',
                      PERMANENT_DELETE: 'gray',
                    };

                    return (
                      <div
                        key={log.id}
                        className="relative z-10 pl-8 space-y-2 pb-3 border-b border-border/50 last:border-b-0"
                      >
                        {/* Dot on Timeline */}
                        <div className="absolute left-2.5 top-1.5 h-3 w-3 rounded-full bg-background border-2 border-primary" />

                        {/* Log Header: Action, User, Timestamp */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              size="sm"
                              variant="filled"
                              color={actionColors[log.action] || 'gray'}
                            >
                              {log.action}
                            </Badge>
                            <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                              <User size={12} className="text-muted-foreground" />
                              {log.changedBy?.name || 'System User'}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase px-1.5 py-0.5 rounded bg-muted">
                              {log.changedBy?.role || 'USER'}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock size={11} />
                            {formatAppDate(log.createdAt, true)}
                          </span>
                        </div>

                        {/* Audit Note */}
                        {log.notes && (
                          <p className="text-xs italic text-muted-foreground bg-muted/40 p-2 rounded-md border border-border/60">
                            "{log.notes}"
                          </p>
                        )}

                        {/* Changed Fields Diff */}
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <div className="bg-card rounded-lg border border-border p-2.5 space-y-1.5 text-xs">
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                              {t('assets.changes', 'Fields Modified')}
                            </p>
                            <div className="grid gap-1">
                              {Object.entries(log.changes).map(([field, delta]: [string, any]) => (
                                <div
                                  key={field}
                                  className="flex items-center justify-between gap-2 p-1 rounded bg-muted/20"
                                >
                                  <span className="font-mono text-[11px] font-semibold text-foreground capitalize">
                                    {field}:
                                  </span>
                                  <div className="flex items-center gap-2 text-[11px]">
                                    <span className="line-through text-red-500 font-medium">
                                      {delta.from !== undefined && delta.from !== null
                                        ? String(delta.from)
                                        : '(empty)'}
                                    </span>
                                    <ArrowRight size={11} className="text-muted-foreground" />
                                    <span className="text-teal-600 dark:text-teal-400 font-bold">
                                      {delta.to !== undefined && delta.to !== null
                                        ? String(delta.to)
                                        : '(cleared)'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    {t('assets.noHistory', 'No logs recorded for this asset.')}
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>
              {t('common.close', 'Close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* 8. MOVE TO TRASH CONFIRMATION DIALOG */}
      {/* ======================================================== */}
      <ConfirmDialog
        isOpen={!!assetToTrash}
        onClose={() => setAssetToTrash(null)}
        onConfirm={() => assetToTrash && trashMutation.mutate(assetToTrash.id)}
        title={t('assets.moveToTrashConfirmTitle', 'Move Asset to 30-Day Trash?')}
        message={
          <div className="space-y-2 text-sm">
            <p>
              {t(
                'assets.moveToTrashConfirmMessage',
                'Are you sure you want to move this asset to the Trash Bin?'
              )}
            </p>
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs">
              <strong>Mandatory 30-Day Retention:</strong> This item will remain safely in the Trash
              Bin for 30 days before being automatically and permanently purged. You can restore it
              at any time during this period.
            </div>
            {assetToTrash && (
              <p className="font-mono text-xs text-muted-foreground">
                Target: {assetToTrash.assetTag} — {assetToTrash.nameEn} ({assetToTrash.quantity}{' '}
                {assetToTrash.unit})
              </p>
            )}
          </div>
        }
        confirmText={t('assets.moveToTrash', 'Move to Trash')}
        cancelText={t('common.cancel', 'Cancel')}
        type="warning"
      />

      {/* ======================================================== */}
      {/* 9. RESTORE ASSET CONFIRMATION DIALOG */}
      {/* ======================================================== */}
      <ConfirmDialog
        isOpen={!!assetToRestore}
        onClose={() => setAssetToRestore(null)}
        onConfirm={() => assetToRestore && restoreMutation.mutate(assetToRestore.id)}
        title={t('assets.restoreConfirmTitle', 'Restore Asset to Active Inventory?')}
        message={
          <div className="space-y-2 text-sm">
            <p>
              {t(
                'assets.restoreConfirmMessage',
                'This asset will be restored immediately back to active company inventory, and its scheduled 30-day purge will be cancelled.'
              )}
            </p>
            {assetToRestore && (
              <p className="font-mono text-xs text-muted-foreground">
                Target: {assetToRestore.assetTag} — {assetToRestore.nameEn}
              </p>
            )}
          </div>
        }
        confirmText={t('assets.restore', 'Restore Asset')}
        cancelText={t('common.cancel', 'Cancel')}
        type="info"
      />

      {/* ======================================================== */}
      {/* 10. IMAGE PREVIEW MODAL */}
      {/* ======================================================== */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage}
      />
    </div>
  );
}
