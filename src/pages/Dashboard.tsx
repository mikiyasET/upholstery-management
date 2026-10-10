import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Package, Activity, AlertCircle, ShoppingCart, ShoppingBag, Wrench, ArrowRight, TrendingUp, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { formatAppDate, getImageUrl, formatStatus, formatUnit } from '../lib/utils';
import { parsePlateNumber } from '../utils/plate';
import { usePermission } from '../lib/permissions';

export default function Dashboard() {
  const { t } = useTranslation();
  const canViewOrders = usePermission('orders.view');
  const canViewMaterials = usePermission('catalog.materials.view');
  const canViewDirectSales = usePermission('directSales.view');

  const { data: orders = [] } = useQuery({
    queryKey: ['active-orders'],
    queryFn: async () => {
      const res = await api.get('/orders');
      return res.data;
    },
    enabled: canViewOrders
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['materials'],
    queryFn: async () => {
      const res = await api.get('/catalog/materials');
      return res.data;
    },
    enabled: canViewMaterials
  });

  const { data: directSales = [] } = useQuery({
    queryKey: ['direct-sales-today'],
    queryFn: async () => {
      const res = await api.get('/direct-sales');
      return res.data;
    },
    enabled: canViewDirectSales
  });

  const activeOrders = orders.filter((o: any) => o.status === 'WAITING' || o.status === 'IN_PROGRESS');
  const deliveredOrders = orders.filter((o: any) => o.status === 'DELIVERED');
  
  const lowStockMaterials = materials.filter((m: any) => {
    const miniStock = m.materialStocks?.find((s: any) => s.store.type === 'MINI');
    const mainStock = m.materialStocks?.find((s: any) => s.store.type === 'MAIN');
    const miniQty = miniStock ? Number(miniStock.quantity) : 0;
    const mainQty = mainStock ? Number(mainStock.quantity) : 0;
    const threshold = m.lowStockThreshold || 10;
    return miniQty <= threshold || mainQty <= threshold;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border border-primary/10 shadow-sm">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-primary/20 blur-3xl rounded-full pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              {t('common.dashboard')}
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              {t('dashboard.welcome')}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
            {usePermission('orders.create') && (
              <Link to="/orders/new">
                <Button className="bg-primary border border-primary hover:bg-primary/90 hover:border-primary/90 text-primary-foreground shadow-sm transition-all rounded-xl font-medium px-5 h-10">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {t('dashboard.newOrder')}
                </Button>
              </Link>
            )}
            {usePermission('directSales.create') && (
              <Link to="/direct-sales">
                <Button variant="outline" className="bg-background hover:bg-primary/5 text-primary border-primary/20 hover:border-primary/40 shadow-sm transition-colors rounded-xl font-medium px-5 h-10">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  {t('dashboard.directSale')}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title={t('dashboard.activeOrders')} 
          value={canViewOrders ? (activeOrders.length || "-") : "-"} 
          subtitle={t('dashboard.currentlyInProgress')}
          icon={<Activity className="w-5 h-5 text-blue-500" />}
          gradient="from-blue-500/10 to-blue-600/5"
          borderColor="border-blue-500/20"
        />
        <MetricCard 
          title={t('dashboard.delivered')} 
          value={canViewOrders ? (deliveredOrders.length || "-") : "-"} 
          subtitle={t('dashboard.completedTotal')}
          icon={<Package className="w-5 h-5 text-emerald-500" />}
          gradient="from-emerald-500/10 to-emerald-600/5"
          borderColor="border-emerald-500/20"
        />
        <MetricCard 
          title={t('dashboard.lowStock')} 
          value={canViewMaterials ? (lowStockMaterials.length || "-") : "-"} 
          subtitle={t('dashboard.itemsInMiniStore')}
          icon={<AlertCircle className="w-5 h-5 text-rose-500" />}
          gradient="from-rose-500/10 to-rose-600/5"
          borderColor="border-rose-500/20"
          valueColor={canViewMaterials && lowStockMaterials.length > 0 ? "text-rose-600 dark:text-rose-400" : ""}
        />
        <MetricCard 
          title={t('dashboard.directSale')} 
          value={canViewDirectSales ? (directSales.length || "-") : "-"} 
          subtitle={t('dashboard.overTheCounter')}
          icon={<TrendingUp className="w-5 h-5 text-purple-500" />}
          gradient="from-purple-500/10 to-purple-600/5"
          borderColor="border-purple-500/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Orders List */}
        <Card className="shadow-lg border-border/50 overflow-hidden rounded-2xl flex flex-col h-full hover:shadow-xl transition-shadow duration-500">
          <CardHeader className="border-b bg-card pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wrench className="w-5 h-5 text-primary" />
                </div>
                {t('dashboard.currentBayActivity')}
              </CardTitle>
              <Link to="/orders">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                  {t('dashboard.viewAll')} <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 bg-card/50">
            {!canViewOrders ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-muted-foreground p-8">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-8 h-8 text-destructive/50" />
                </div>
                <p className="font-medium text-destructive">{t('alerts.accessRestricted')}</p>
                <p className="text-sm opacity-70">{t('dashboard.accessRestrictedMessageOrders')}</p>
              </div>
            ) : activeOrders.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-muted-foreground p-8">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <ShoppingCart className="w-8 h-8 opacity-20" />
                </div>
                <p className="font-medium">{t('dashboard.noActiveOrders')}</p>
                <p className="text-sm opacity-70">{t('dashboard.shopFloorClear')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {activeOrders.slice(0, 6).map((order: any, idx: number) => (
                  <Link 
                    to={`/orders/${order.id}`} 
                    key={order.id}
                    className="block p-5 hover:bg-muted/30 transition-colors group"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-xs font-bold border border-border/50 group-hover:border-primary/30 transition-colors overflow-hidden">
                          {parsePlateNumber(order.vehicle?.plateNumber)?.serial?.substring(0, 4) || order.vehicle?.plateNumber?.substring(0, 4) || 'N/A'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {order.customer?.firstName} {order.customer?.lastName}
                          </span>
                          <span className="text-sm text-muted-foreground flex items-center gap-2">
                            {order.vehicle?.brand?.name} {order.vehicle?.model?.name}
                            <span className="w-1 h-1 rounded-full bg-border"></span>
                            {formatAppDate(order.createdAt)}
                          </span>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full border shadow-sm ${
                        order.status === 'WAITING' ? 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400' : 
                        'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400'
                      }`}>
                        {formatStatus(order.status)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Warning */}
        <Card className="shadow-lg border-border/50 overflow-hidden rounded-2xl flex flex-col h-full hover:shadow-xl transition-shadow duration-500 p-0">
          <CardHeader className="border-b bg-rose-50/30 dark:bg-rose-950/20 px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-lg">
                <div className="p-2 bg-rose-500/10 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                </div>
                {t('dashboard.lowStock', 'Low Stock Items')}
              </CardTitle>
              <Link to="/storage">
                <Button variant="ghost" size="sm" className="text-rose-600/70 hover:text-rose-700 hover:bg-rose-500/10 dark:hover:text-rose-300">
                  {t('dashboard.manage')} <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 bg-card/50">
            {!canViewMaterials ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-muted-foreground p-8">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-8 h-8 text-destructive/50" />
                </div>
                <p className="font-medium text-destructive">{t('alerts.accessRestricted')}</p>
                <p className="text-sm opacity-70">{t('dashboard.accessRestrictedMessageMaterials')}</p>
              </div>
            ) : lowStockMaterials.length === 0 ? (
              <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-muted-foreground p-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Package className="w-8 h-8 text-emerald-500/50" />
                </div>
                <p className="font-medium">{t('dashboard.allStockHealthy')}</p>
                <p className="text-sm opacity-70">{t('dashboard.noMaterialsLow')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {lowStockMaterials.slice(0, 6).map((mat: any, idx: number) => {
                  const miniStock = mat.materialStocks?.find((s: any) => s.store.type === 'MINI');
                  const mainStock = mat.materialStocks?.find((s: any) => s.store.type === 'MAIN');
                  const miniQty = miniStock ? Number(miniStock.quantity) : 0;
                  const mainQty = mainStock ? Number(mainStock.quantity) : 0;
                  const threshold = mat.lowStockThreshold || 10;
                  const isMiniLow = miniQty <= threshold;
                  const isMainLow = mainQty <= threshold;

                  return (
                    <Link
                      key={mat.id}
                      to="/storage"
                      className="p-5 flex items-center justify-between hover:bg-rose-50/30 dark:hover:bg-rose-950/10 transition-colors cursor-pointer block"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden border border-border/50 shrink-0">
                           {mat.imageUrl ? (
                             <img src={getImageUrl(mat.imageUrl)} alt="" className="w-full h-full object-cover opacity-80 grayscale-[30%]" />
                           ) : (
                             <Package className="w-5 h-5 text-muted-foreground/50" />
                           )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{mat.nameEn}</span>
                          <span className="text-xs text-muted-foreground">{mat.nameAm}</span>
                          <div className="flex items-center gap-2 mt-1">
                            {isMiniLow && (
                              <span className="text-[10px] bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-medium">
                                Mini: {miniQty} {formatUnit(mat.unit)}
                              </span>
                            )}
                            {isMainLow && (
                              <span className="text-[10px] bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-medium">
                                Main: {mainQty} {formatUnit(mat.unit)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon, gradient, borderColor, valueColor }: any) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${borderColor} bg-card p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group`}>
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-500`}></div>
      <div className="relative z-10 flex justify-between items-start">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">{title}</p>
          <p className={`text-4xl font-black tracking-tighter ${valueColor || 'text-foreground'}`}>
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} border border-white/10 shadow-sm`}>
          {icon}
        </div>
      </div>
      <p className="relative z-10 mt-4 text-xs font-medium text-muted-foreground/80 flex items-center gap-1">
        {subtitle}
      </p>
    </div>
  );
}
