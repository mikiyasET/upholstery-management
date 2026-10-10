import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { getImageUrl, formatCurrency, formatInputNumber, parseInputNumber, formatUnit } from '../lib/utils';
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
import { PermissionGate } from '../components/PermissionGate';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Edit2, Trash2, ImageOff } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader, ExecutiveAddButton } from '../components/common';

type Material = {
  id: string;
  nameEn: string;
  nameAm: string;
  unit: string;
  currentPrice: number | null;
  lowStockThreshold: number;
  isBulkTracked: boolean;
  isStandaloneSellable: boolean;
  imageUrl?: string;
};

const ITEMS_PER_PAGE = 20;

export default function Materials() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [search, setSearch] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Delete state
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nameEn: '',
    nameAm: '',
    unit: 'PCS',
    lowStockThreshold: '10',
    currentPrice: '',
    isBulkTracked: false,
    isStandaloneSellable: false,
  });
  const [file, setFile] = useState<File | null>(null);

  const { data: materials, isLoading, refetch, isFetching } = useQuery<Material[]>({
    queryKey: ['materials'],
    queryFn: async () => {
      const res = await api.get('/catalog/materials');
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const formPayload = new FormData();
      formPayload.append('nameEn', formData.nameEn);
      formPayload.append('nameAm', formData.nameAm);
      formPayload.append('unit', formData.unit);
      formPayload.append('lowStockThreshold', formData.lowStockThreshold);
      if (formData.currentPrice) formPayload.append('currentPrice', String(parseInputNumber(formData.currentPrice)));
      formPayload.append('isBulkTracked', String(formData.isBulkTracked));
      formPayload.append('isStandaloneSellable', String(formData.isStandaloneSellable));
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
      toast.error(err.response?.data?.error?.message || t('materials.errorSaving', 'Error saving material'));
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
        nameEn: material.nameEn,
        nameAm: material.nameAm,
        unit: material.unit,
        lowStockThreshold: material.lowStockThreshold.toString(),
        currentPrice: material.currentPrice ? formatInputNumber(material.currentPrice.toString()) : '',
        isBulkTracked: material.isBulkTracked,
        isStandaloneSellable: material.isStandaloneSellable,
      });
    } else {
      setEditingMaterial(null);
      setFormData({
        nameEn: '',
        nameAm: '',
        unit: 'PCS',
        lowStockThreshold: '10',
        currentPrice: '',
        isBulkTracked: false,
        isStandaloneSellable: false,
      });
    }
    setFile(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingMaterial(null);
  };

  // Filtering
  const filteredMaterials = materials?.filter(m =>
    m.nameEn.toLowerCase().includes(search.toLowerCase()) || m.nameAm.includes(search)
  ) ?? [];

  // Pagination
  const totalPages = Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE);
  const paginatedMaterials = filteredMaterials.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
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
              <TableHead>{t('storage.table.image', 'Image')}</TableHead>
              <TableHead>{t('materials.nameEn', 'Name (EN)')}</TableHead>
              <TableHead>{t('materials.nameAm', 'Name (AM)')}</TableHead>
              <TableHead>{t('common.unit', 'Unit')}</TableHead>
              <TableHead>{t('common.price', 'Price')}</TableHead>
              <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">{t('common.loading', 'Loading...')}</TableCell>
              </TableRow>
            ) : filteredMaterials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">{t('storage.noMaterials', 'No materials found.')}</TableCell>
              </TableRow>
            ) : (
              paginatedMaterials.map((mat) => (
                <TableRow key={mat.id}>
                  <TableCell>
                    {mat.imageUrl ? (
                      <img 
                        src={getImageUrl(mat.imageUrl)} 
                        alt={mat.nameEn} 
                        className="h-10 w-10 rounded object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setPreviewImage(getImageUrl(mat.imageUrl)!)}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <ImageOff className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{mat.nameEn}</TableCell>
                  <TableCell>{mat.nameAm}</TableCell>
                  <TableCell>{formatUnit(mat.unit)}</TableCell>
                  <TableCell>{mat.currentPrice ? formatCurrency(mat.currentPrice) : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-800">
            <span className="text-sm text-muted-foreground">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredMaterials.length)} of {filteredMaterials.length} materials
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="text-sm font-medium">Page {currentPage} of {totalPages}</div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <ImagePreviewModal isOpen={!!previewImage} onClose={() => setPreviewImage(null)} imageUrl={previewImage} />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="header-modal sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial 
                ? t('materials.editMaterial', 'Edit Material') 
                : t('materials.addMaterial', 'Add Material')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v || '' })}>
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
                <Label htmlFor="price">{t('common.price', 'Price')} ({i18n?.language === 'am' ? 'ብር' : 'Birr'})</Label>
                <div className="relative">
                  <Input
                    id="price"
                    type="text"
                    className="header-input w-full"
                    value={formData.currentPrice}
                    onChange={(e) => setFormData({ ...formData, currentPrice: formatInputNumber(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">{t('materials.lowStockThreshold', 'Low Stock Alert Threshold')}</Label>
              <Input
                id="threshold"
                type="number"
                className="header-input w-full"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
              />
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
