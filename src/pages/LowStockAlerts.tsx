import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { AlertTriangle, Package, ArrowRightLeft, ShieldAlert } from 'lucide-react';
import api from '../lib/api';
import { getImageUrl, formatUnit } from '../lib/utils';
import { Button } from '../components/ui/button';

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

type Material = {
  id: string;
  nameEn: string;
  nameAm: string;
  unit: string;
  isBulkTracked: boolean;
  lowStockThreshold: number;
  imageUrl?: string;
  materialStocks: MaterialStock[];
};

export default function LowStockAlerts() {
  const { t, i18n } = useTranslation();
  
  const getLocName = (m: Material) => (i18n?.language === 'am' && m.nameAm ? m.nameAm : m.nameEn);

  const { data: materials = [], isLoading } = useQuery<Material[]>({
    queryKey: ['storage_materials'],
    queryFn: async () => {
      const res = await api.get('/catalog/materials');
      return res.data;
    },
  });

  const lowStockItems = materials.filter((m) => {
    const miniStock = m.materialStocks?.find((s) => s.store.type === 'MINI');
    const mainStock = m.materialStocks?.find((s) => s.store.type === 'MAIN');
    const miniQty = miniStock ? Number(miniStock.quantity) : 0;
    const mainQty = mainStock ? Number(mainStock.quantity) : 0;
    const threshold = m.lowStockThreshold || 10;
    return miniQty <= threshold || mainQty <= threshold;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="relative overflow-hidden rounded-3xl bg-card p-8 border shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                {t('storage.lowStockAlerts', 'Low Stock Alerts')}
              </h1>
            </div>
            <p className="text-muted-foreground mt-2 text-lg max-w-2xl">
              {t('storage.lowStockDesc', 'These items are running critically low in either the Mini Store or Main Store. Take action to restock or transfer to avoid stopping sales.')}
            </p>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <div className="text-4xl font-black text-rose-600 dark:text-rose-400">
              {lowStockItems.length}
            </div>
            <div className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              {t('storage.itemsInDanger', 'Items in Danger')}
            </div>
          </div>
        </div>
      </div>

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
            
            const isMainLow = mainQty <= threshold;
            const isMiniLow = miniQty <= threshold;

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
                        <img src={getImageUrl(m.imageUrl)} alt={getLocName(m)} className="w-full h-full object-cover" />
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
    </div>
  );
}
