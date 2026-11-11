import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Package, ArrowRightLeft, ShieldAlert, Store, Archive } from 'lucide-react';
import api from '../lib/api';
import { formatUnit, getImageUrl } from '../lib/utils';
import { LazyImage } from '../components/common/LazyImage';
import { Button } from '../components/ui/button';
import { ImagePreviewModal } from '../components/ui/image-preview-modal';
import { PageHeader } from '../components/common';
import { Box, Group, SimpleGrid, Text, Button as MantineButton } from '@mantine/core';

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
  price: string | number;
  brandStocks?: MaterialBrandStock[];
};

type Material = {
  id: string;
  nameEn: string;
  nameAm: string;
  unit: string;
  isBulkTracked: boolean;
  lowStockThreshold: number;
  imageUrl?: string;
  materialStocks: MaterialStock[];
  brands?: MaterialBrand[];
};

export default function LowStockAlerts() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const getLocName = (m: any) =>
    i18n?.language === 'am' && m?.nameAm ? m.nameAm : (m?.nameEn || m?.name || '');

  const getBrandStock = (brand: MaterialBrand, storeType: 'MAIN' | 'MINI') => {
    const stock = brand.brandStocks?.find((s) => s.store?.type === storeType);
    return stock ? Number(stock.quantity) : 0;
  };

  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const { data: materials = [], isLoading, refetch, isFetching } = useQuery<Material[]>({
    queryKey: ['storage_materials'],
    queryFn: async () => {
      const res = await api.get('/catalog/materials');
      return res.data;
    },
  });

  const lowStockItems = materials.filter((m) => {
    const threshold = m.lowStockThreshold || 10;
    if (m.brands && m.brands.length > 0) {
      return m.brands.some((b) => {
        const mini = getBrandStock(b, 'MINI');
        const main = getBrandStock(b, 'MAIN');
        return mini <= threshold || main <= threshold;
      });
    }
    const miniStock = m.materialStocks?.find((s) => s.store.type === 'MINI');
    const mainStock = m.materialStocks?.find((s) => s.store.type === 'MAIN');
    const miniQty = miniStock ? Number(miniStock.quantity) : 0;
    const mainQty = mainStock ? Number(mainStock.quantity) : 0;
    return miniQty <= threshold || mainQty <= threshold;
  });

  const miniLowCount = materials.filter((m) => {
    const threshold = m.lowStockThreshold || 10;
    if (m.brands && m.brands.length > 0) {
      return m.brands.some((b) => getBrandStock(b, 'MINI') <= threshold);
    }
    const miniStock = m.materialStocks?.find((s) => s.store.type === 'MINI');
    const miniQty = miniStock ? Number(miniStock.quantity) : 0;
    return miniQty <= threshold;
  }).length;

  const mainLowCount = materials.filter((m) => {
    const threshold = m.lowStockThreshold || 10;
    if (m.brands && m.brands.length > 0) {
      return m.brands.some((b) => getBrandStock(b, 'MAIN') <= threshold);
    }
    const mainStock = m.materialStocks?.find((s) => s.store.type === 'MAIN');
    const mainQty = mainStock ? Number(mainStock.quantity) : 0;
    return mainQty <= threshold;
  }).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* 1. Page Header */}
      <PageHeader
        title={t('storage.lowStockAlerts', 'Low Stock Alerts')}
        subtitle={
          <span className="hidden sm:inline">
            {t('storage.lowStockDesc', 'These items are running critically low in either the Mini Store or Main Store. Take action to restock or transfer.')}
          </span>
        }
        badge={lowStockItems.length > 0 ? `${lowStockItems.length} In Danger` : t('dashboard.allStockHealthy', 'Stock Healthy')}
        badgeColor={lowStockItems.length > 0 ? "red" : "teal"}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        refreshTooltip={t('common.refresh', 'Refresh')}
        action={
          <MantineButton
            variant="light"
            color="amber"
            size="sm"
            radius="md"
            leftSection={<Store size={15} />}
            onClick={() => navigate('/storage')}
            className="!w-full sm:!w-auto justify-center font-semibold transition-all duration-200"
            style={{
              height: 36,
              fontSize: '13px',
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              border: '1px solid rgba(245, 158, 11, 0.35)',
              backgroundColor: 'rgba(245, 158, 11, 0.10)',
            }}
          >
            {t('storage.title', 'Storage & Inventory')}
          </MantineButton>
        }
      />

      {/* 2. Top Metric KPI Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {/* Total Critical Items */}
        <Box className="premium-card" p={{ base: "xs", sm: "md" }}>
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                {t('storage.itemsInDanger', 'Items in Danger')}
              </Text>
              <Text
                fw={700}
                size="1.45rem"
                lh={1.1}
                mt={4}
                style={{
                  letterSpacing: "-0.02em",
                  color: lowStockItems.length > 0 ? "var(--status-danger, #ef4444)" : "#10b981",
                }}
              >
                {lowStockItems.length}
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: lowStockItems.length > 0 ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
                color: lowStockItems.length > 0 ? "#ef4444" : "#10b981",
              }}
            >
              <ShieldAlert size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" wrap="wrap" gap="xs" style={{ borderTop: "1px solid var(--surface-border-subtle)" }}>
            <Text
              size="11px"
              fw={600}
              style={{
                color: lowStockItems.length > 0 ? "#ef4444" : "#10b981",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {lowStockItems.length > 0 ? t('dashboard.requiresRestock', 'Requires restock') : t('dashboard.optimalStock', 'Optimal stock')}
            </Text>
            <Text size="11px" c="dimmed" truncate style={{ whiteSpace: "nowrap", flexShrink: 1 }}>
              {t('storage.bothStores', 'Mini & Main warehouses')}
            </Text>
          </Group>
        </Box>

        {/* Mini Store Shortage */}
        <Box className="premium-card" p={{ base: "xs", sm: "md" }}>
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                {t('storage.miniStore', 'Mini Store')} {t('dashboard.lowStock', 'Shortage')}
              </Text>
              <Text
                fw={700}
                size="1.45rem"
                lh={1.1}
                mt={4}
                style={{
                  letterSpacing: "-0.02em",
                  color: miniLowCount > 0 ? "#f59e0b" : "#10b981",
                }}
              >
                {miniLowCount}
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: miniLowCount > 0 ? "rgba(245, 158, 11, 0.12)" : "rgba(16, 185, 129, 0.12)",
                color: miniLowCount > 0 ? "#f59e0b" : "#10b981",
              }}
            >
              <Store size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" wrap="wrap" gap="xs" style={{ borderTop: "1px solid var(--surface-border-subtle)" }}>
            <Text
              size="11px"
              fw={600}
              style={{
                color: miniLowCount > 0 ? "#f59e0b" : "#10b981",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {miniLowCount > 0 ? t('storage.transferNeeded', 'Transfer needed') : t('dashboard.optimalStock', 'Optimal stock')}
            </Text>
            <Text size="11px" c="dimmed" truncate style={{ whiteSpace: "nowrap", flexShrink: 1 }}>
              {t('dashboard.counterSales', 'Shop floor level')}
            </Text>
          </Group>
        </Box>

        {/* Main Store Shortage */}
        <Box className="premium-card" p={{ base: "xs", sm: "md" }}>
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                {t('storage.mainStore', 'Main Store')} {t('dashboard.lowStock', 'Shortage')}
              </Text>
              <Text
                fw={700}
                size="1.45rem"
                lh={1.1}
                mt={4}
                style={{
                  letterSpacing: "-0.02em",
                  color: mainLowCount > 0 ? "#ef4444" : "#10b981",
                }}
              >
                {mainLowCount}
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: mainLowCount > 0 ? "rgba(59, 130, 246, 0.12)" : "rgba(16, 185, 129, 0.12)",
                color: mainLowCount > 0 ? "#3b82f6" : "#10b981",
              }}
            >
              <Archive size={20} />
            </Box>
          </Group>
          <Group justify="space-between" align="center" mt="sm" pt="xs" wrap="wrap" gap="xs" style={{ borderTop: "1px solid var(--surface-border-subtle)" }}>
            <Text
              size="11px"
              fw={600}
              style={{
                color: mainLowCount > 0 ? "#3b82f6" : "#10b981",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {mainLowCount > 0 ? t('storage.purchaseNeeded', 'Purchase needed') : t('dashboard.optimalStock', 'Optimal stock')}
            </Text>
            <Text size="11px" c="dimmed" truncate style={{ whiteSpace: "nowrap", flexShrink: 1 }}>
              {t('storage.mainWarehouse', 'Central warehouse')}
            </Text>
          </Group>
        </Box>
      </SimpleGrid>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : lowStockItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl text-emerald-700 dark:text-emerald-400">
          <Package className="w-16 h-16 opacity-50 mb-4" />
          <h2 className="text-xl font-bold">{t('dashboard.allStockHealthy', 'Stock is Healthy')}</h2>
          <p className="opacity-80 mt-2">{t('dashboard.noMaterialsLow', 'There are no materials running low in any store.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lowStockItems.map((m, idx) => {
            const miniStock = m.materialStocks?.find((s) => s.store.type === 'MINI');
            const mainStock = m.materialStocks?.find((s) => s.store.type === 'MAIN');
            const miniQty = miniStock ? Number(miniStock.quantity) : 0;
            const mainQty = mainStock ? Number(mainStock.quantity) : 0;
            const threshold = m.lowStockThreshold || 10;
            
            const hasBrands = !!(m.brands && m.brands.length > 0);
            const isBrandMainLow = hasBrands ? m.brands!.some((b) => getBrandStock(b, 'MAIN') <= threshold) : false;
            const isBrandMiniLow = hasBrands ? m.brands!.some((b) => getBrandStock(b, 'MINI') <= threshold) : false;
            const isMainLow = mainQty <= threshold || isBrandMainLow;
            const isMiniLow = miniQty <= threshold || isBrandMiniLow;

            return (
              <div 
                key={m.id}
                className="relative overflow-hidden rounded-2xl bg-card border shadow-sm transition-all duration-300 hover:shadow-md"
                style={{ animationFillMode: 'both', animationDelay: `${idx * 50}ms`, animationName: 'fade-in-up' }}
              >
                {/* Visual indicator for main store danger */}
                {isMainLow && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                )}
                
                <div className="p-5 flex flex-col h-full gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden border border-border shrink-0 shadow-sm">
                      {m.imageUrl ? (
                        <LazyImage 
                          src={m.imageUrl} 
                          alt={getLocName(m)} 
                          className="w-full h-full object-cover cursor-pointer hover:opacity-85 transition-opacity" 
                          onClick={() => setPreviewImage(getImageUrl(m.imageUrl) || null)}
                        />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground opacity-50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <h3 className="font-bold truncate text-lg">
                        {getLocName(m)}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {i18n?.language === 'am' ? m.nameEn : m.nameAm}
                      </p>
                      <div className="inline-flex mt-1 items-center px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                        Threshold: {threshold} {formatUnit(m.unit)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {/* Mini Store */}
                    <div className={`flex flex-col rounded-lg p-3 border ${isMiniLow ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50' : 'bg-muted/30 border-transparent'}`}>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        {t('storage.miniStore', 'Mini Store')}
                      </span>
                      <div className="flex items-end gap-2">
                        <span className={`text-2xl font-black leading-none ${isMiniLow ? 'text-red-600 dark:text-red-400' : ''}`}>
                          {miniQty}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium mb-0.5">{formatUnit(m.unit)}</span>
                      </div>
                      {isMiniLow && (
                        <div className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Low Stock
                        </div>
                      )}
                    </div>

                    {/* Main Store */}
                    <div className={`flex flex-col rounded-lg p-3 border ${isMainLow ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50' : 'bg-muted/30 border-transparent'}`}>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                        {t('storage.mainStore', 'Main Store')}
                      </span>
                      <div className="flex items-end gap-2">
                        <span className={`text-2xl font-black leading-none ${isMainLow ? 'text-red-600 dark:text-red-400' : ''}`}>
                          {mainQty}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium mb-0.5">{formatUnit(m.unit)}</span>
                      </div>
                      {isMainLow && (
                        <div className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-semibold flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" />
                          Critical Shortage
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Brand Breakdown if brands exist */}
                  {hasBrands && (
                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        {t('storage.brandStock', 'Brand Stock')}:
                      </span>
                      <div className="space-y-1 max-h-36 overflow-y-auto">
                        {m.brands!.map((b) => {
                          const bMini = getBrandStock(b, 'MINI');
                          const bMain = getBrandStock(b, 'MAIN');
                          const isBMiniLow = bMini <= threshold;
                          const isBMainLow = bMain <= threshold;
                          return (
                            <div key={b.id} className="flex items-center justify-between p-1.5 rounded-lg bg-muted/40 text-xs">
                              <span className="font-semibold text-foreground truncate max-w-[120px]">{b.name}</span>
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isBMiniLow ? 'bg-red-500/15 text-red-600 dark:text-red-400 font-bold border border-red-500/30' : 'text-muted-foreground'}`}>
                                  Mini: {bMini}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${isBMainLow ? 'bg-red-500/15 text-red-600 dark:text-red-400 font-bold border border-red-500/30' : 'text-muted-foreground'}`}>
                                  Main: {bMain}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-auto pt-4">
                    <Link to="/storage" className="w-full block">
                      <Button 
                        variant={isMainLow ? "destructive" : "default"} 
                        className="w-full font-semibold rounded-xl h-11"
                      >
                        {isMainLow ? (
                          <>
                            <ShieldAlert className="w-4 h-4 mr-2" />
                            {t('storage.restockMain', 'Restock Main Store')}
                          </>
                        ) : isMiniLow && mainQty > threshold ? (
                          <>
                            <ArrowRightLeft className="w-4 h-4 mr-2" />
                            {t('storage.transferToMini', 'Transfer to Mini Store')}
                          </>
                        ) : (
                          t('storage.title', 'Go to Storage')
                        )}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ImagePreviewModal isOpen={!!previewImage} onClose={() => setPreviewImage(null)} imageUrl={previewImage} />
    </div>
  );
}
