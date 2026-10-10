import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { formatAppDate, getImageUrl, formatCurrency, formatStatus } from '../lib/utils';
import { formatPlateNumber, parsePlateNumber } from '../utils/plate';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Car, Calendar, Wrench, User, Phone, Receipt, Clock } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { useTranslation } from 'react-i18next';

const renderPlateBadge = (plateStr: string) => {
  const parsed = parsePlateNumber(plateStr);
  if (parsed) {
    let bg = '#FFFFFF';
    let fg = '#111827';
    if (parsed.category === '1') fg = '#B91C1C';
    else if (parsed.category === '2') fg = '#1E50BC';
    else if (parsed.category === '3') fg = '#15803D';
    else if (parsed.category === '5') fg = '#EA580C';
    else if (['un', 'au', 'temp'].includes(parsed.category)) fg = '#009BDA';
    else if (parsed.category === 'police') { bg = '#FFB300'; fg = '#111827'; }

    return (
      <div 
        className="flex items-stretch shadow-[0_5px_20px_rgba(0,0,0,0.4)] rounded overflow-hidden border-[1.5px] border-white/20 transform transition-transform group-hover:-translate-y-1 scale-90 sm:scale-100 origin-bottom" 
        style={{ color: fg, backgroundColor: bg }}
      >
        <div className="flex flex-col items-center justify-center px-1.5 py-0.5 text-[7px] sm:text-[8px] leading-[1.1] font-black text-white" style={{ backgroundColor: fg }}>
          <span>{parsed.amharic}</span>
          <span>{parsed.english}</span>
        </div>
        
        <div className="flex items-center justify-center px-2 border-r-[1.5px]" style={{ borderColor: `${fg}30` }}>
           <span className="text-xs sm:text-sm font-black">{parsed.category.toUpperCase()}</span>
        </div>
        
        <div className="flex items-center justify-center px-2.5 sm:px-3 py-0.5">
           <span className="text-sm sm:text-base font-mono font-black tracking-wider">{parsed.serial}</span>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="inline-flex items-center px-4 py-2 bg-white border-2 border-gray-300 rounded shadow-[0_10px_40px_rgba(0,0,0,0.5)] transform transition-transform group-hover:-translate-y-1">
      <span className="font-mono text-xl font-black tracking-widest text-gray-900">
        {formatPlateNumber(plateStr)}
      </span>
    </div>
  );
};

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const res = await api.get(`/customers/${id}`);
      return res.data;
    },
    enabled: !!id
  });

  if (isLoading) return (
    <div className="flex h-[calc(100vh-100px)] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">{t('customers.detail.loading', 'Loading customer details...')}</p>
      </div>
    </div>
  );
  if (!customer) return (
    <div className="flex h-[calc(100vh-100px)] items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <User className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{t('customers.detail.notFound', 'Customer Not Found')}</h2>
        <p className="text-sm text-muted-foreground max-w-sm">{t('customers.detail.notFoundDesc', 'The customer you are looking for might have been removed or the link is invalid.')}</p>
        <Button variant="outline" className="mt-2 rounded-xl" onClick={() => navigate(-1)}>{t('common.goBack', 'Go Back')}</Button>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent -z-10 pointer-events-none" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4">
        <div className="flex items-center gap-4">
          <Button onClick={() => navigate(-1)} variant="ghost" size="icon" className="rounded-full hover:bg-background/80 backdrop-blur-sm border shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              {t('customers.detail.profile', 'Customer Profile')}
            </h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4" /> {t('customers.detail.memberSince', 'Member since')} {formatAppDate(customer.createdAt)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-card border rounded-2xl p-1.5 shadow-sm">
           <div className="flex flex-col px-4 border-r border-border/50">
             <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('customers.detail.totalValue', 'Total Value')}</span>
             <span className="text-sm font-bold text-primary">
               {formatCurrency(customer.orders.reduce((acc: number, o: any) => acc + o.subTotal, 0))}
             </span>
           </div>
           <div className="flex flex-col px-4">
             <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('customers.detail.status', 'Status')}</span>
             <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/20 px-2 py-0">{t('customers.detail.active', 'Active')}</Badge>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Customer Info */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-0 shadow-xl shadow-black/5 bg-gradient-to-b from-card to-card/50 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />
            
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center mb-8 relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/50 p-1 mb-4 shadow-lg shadow-primary/20">
                   <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                     <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-primary to-primary/50">
                       {customer.name.substring(0, 2).toUpperCase()}
                     </span>
                   </div>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-1">{customer.name}</h2>
                <div className="flex items-center gap-2 text-muted-foreground bg-muted/50 px-3 py-1 rounded-full text-sm">
                  <Phone className="w-4 h-4 text-primary" />
                  {customer.phoneNumber}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-muted/30 border border-border/50 transition-all hover:bg-muted/50">
                  <Car className="w-6 h-6 text-[#c9a84c] mb-2" />
                  <span className="text-2xl font-bold text-foreground">{customer.vehicles.length}</span>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('customers.detail.vehicles', 'Vehicles')}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-muted/30 border border-border/50 transition-all hover:bg-muted/50">
                  <Receipt className="w-6 h-6 text-blue-500 mb-2" />
                  <span className="text-2xl font-bold text-foreground">{customer.orders.length}</span>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('common.orders', 'Orders')}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Vehicles & Orders */}
        <div className="lg:col-span-8 space-y-8">
          {/* Vehicles List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                {t('customers.detail.registeredVehicles', 'Registered Vehicles')}
              </h3>
            </div>

            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0">
                {customer.vehicles.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Car className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-lg font-medium text-foreground">{t('customers.detail.noVehicles', 'No vehicles registered')}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t('customers.detail.noVehiclesDesc', 'This customer hasn\'t registered any vehicles yet.')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 p-3">
                    {customer.vehicles.map((v: any) => (
                      <div key={v.id} className="group relative rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all overflow-hidden flex flex-col">
                        
                        {/* Car Image Area (16:9 Aspect Ratio) */}
                        <div className="w-full aspect-[16/9] bg-muted relative overflow-hidden border-b border-border/50">
                          {v.carModel?.imageUrl ? (
                             <img src={getImageUrl(v.carModel.imageUrl)} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                          ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
                               <Car className="w-12 h-12 text-muted-foreground/30 mb-1" />
                               <span className="text-xs text-muted-foreground/50 font-medium">{t('common.noImage', 'No Image Available')}</span>
                             </div>
                          )}
                          
                          {/* Gradient Overlay for Text Readability */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                          
                          {/* Plate Number Floating on Image */}
                          <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                             {renderPlateBadge(v.plateNumber)}
                          </div>
                        </div>
                        
                        {/* Car Details Area */}
                        <div className="py-2 px-3 flex flex-col items-center text-center bg-card">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                            {v.carModel?.brand?.name || t('customers.detail.unknownBrand', 'Unknown Brand')}
                          </p>
                          <p className="text-base font-bold text-foreground leading-tight">
                            {v.carModel?.name || t('customers.detail.unknownModel', 'Unknown Model')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Orders History */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-500" />
                {t('customers.detail.serviceHistory', 'Service History')}
              </h3>
            </div>
            
            <Card className="border-0 shadow-lg bg-card/50 backdrop-blur-sm overflow-hidden">
              <CardContent className="p-0">
                {customer.orders.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Receipt className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-lg font-medium text-foreground">{t('customers.detail.noOrders', 'No orders found')}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t('customers.detail.noOrdersDesc', 'This customer doesn\'t have any service history.')}</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {customer.orders.map((o: any) => (
                      <Link to={`/orders/${o.id}`} key={o.id} className="block hover:bg-muted/30 transition-colors">
                        <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl shrink-0 ${
                              o.orderStatus === 'DELIVERED' ? 'bg-green-500/10 text-green-500' :
                              o.orderStatus === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500' :
                              'bg-orange-500/10 text-orange-500'
                            }`}>
                              <Wrench className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-foreground text-sm sm:text-base">{t('common.order', 'Order')} #{o.id.substring(o.id.length - 6).toUpperCase()}</span>
                                <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-bold border ${
                                  o.orderStatus === 'DELIVERED' ? 'bg-green-500/5 text-green-500 border-green-500/20' :
                                  o.orderStatus === 'IN_PROGRESS' ? 'bg-blue-500/5 text-blue-500 border-blue-500/20' :
                                  'bg-orange-500/5 text-orange-500 border-orange-500/20'
                                }`}>
                                  {formatStatus(o.orderStatus)}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" /> 
                                  {formatAppDate(o.createdAt, true)}
                                </span>
                                {o.vehicle && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                    <span className="flex items-center gap-1.5 font-medium text-foreground/70">
                                      <Car className="w-3.5 h-3.5" />
                                      {formatPlateNumber(o.vehicle.plateNumber)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center pl-14 sm:pl-0">
                            <span className="text-sm font-medium text-muted-foreground sm:hidden">{t('common.total', 'Total')}</span>
                            <span className="font-bold text-lg text-primary tracking-tight">
                              {formatCurrency(o.subTotal)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
