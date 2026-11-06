import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme-provider';
import { usePermission } from '../../lib/permissions';
import {
  LogOut,
  Menu,
  LayoutDashboard,
  Package,
  Archive,
  ShoppingCart,
  DollarSign,
  Users,
  BarChart,
  Globe,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useState, useEffect } from 'react';
import api from '../../lib/api';
import ConfirmDialog from '../ConfirmDialog';
import { BrandLogo } from '../common';

// Section Heading Component
function NavSection({ title }: { title: string }) {
  return (
    <div className="px-4 py-2 mt-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
      {title}
    </div>
  );
}

// Collapsible Nav Group Component
function NavGroup({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  hasBadge = false,
  badgeCount,
  to,
  onNavigate,
  isActive = false,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
  hasBadge?: boolean;
  badgeCount?: number;
  to?: string;
  onNavigate?: () => void;
  isActive?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const navigate = useNavigate();

  useEffect(() => {
    if (defaultOpen) {
      setIsOpen(true);
    }
  }, [defaultOpen]);

  const handleClick = () => {
    if (to) {
      setIsOpen(true);
      if (onNavigate) onNavigate();
      navigate(to);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleToggleChevron = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="space-y-1">
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all font-medium text-sm cursor-pointer select-none ${
          isActive
            ? 'bg-primary/10 text-primary font-bold'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-primary'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon size={18} strokeWidth={2.5} />
          <div className="flex items-center gap-2">
            <span className="text-sm">{title}</span>
            {hasBadge && !badgeCount && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                !
              </span>
            )}
            {badgeCount !== undefined && badgeCount > 0 && (
              <span className="flex min-w-[20px] h-5 items-center justify-center rounded-full bg-red-600 text-white text-[11px] font-bold px-1.5 shadow-sm shadow-red-500/20">
                {badgeCount}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleChevron}
          className="p-1 -mr-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer"
        >
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      {isOpen && (
        <div className="pl-4 pr-2 py-1 space-y-1 animate-in slide-in-from-top-1 duration-200">
          <div className="border-l-2 border-border ml-3 pl-3 space-y-1">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUser } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  // Fetch materials for low stock badge
  const { data: materials = [] } = useQuery({
    queryKey: ['storage_materials'],
    queryFn: async () => {
      const res = await api.get('/catalog/materials');
      return res.data;
    },
    staleTime: 60000,
  });

  const lowStockCount = materials.filter((m: any) => {
    const miniStock = m.materialStocks?.find((s: any) => s.store.type === 'MINI');
    const mainStock = m.materialStocks?.find((s: any) => s.store.type === 'MAIN');
    const miniQty = miniStock ? Number(miniStock.quantity) : 0;
    const mainQty = mainStock ? Number(mainStock.quantity) : 0;
    const threshold = m.lowStockThreshold || 10;
    return miniQty <= threshold || mainQty <= threshold;
  }).length;

  // Poll for permission updates
  useEffect(() => {
    const fetchFreshUser = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data?.user) {
          updateUser(res.data.user);
        }
      } catch (err) {
        // Will be handled by interceptor if 401
      }
    };

    fetchFreshUser();

    // Poll every 1 minute
    const intervalId = setInterval(fetchFreshUser, 60000);
    return () => clearInterval(intervalId);
  }, [updateUser]);

  // Permission checks for nav visibility
  const canViewOrders = usePermission('orders.view');
  const canViewDirectSales = usePermission('directSales.view');
  const canViewDirectSalesHistory = usePermission('directSales.history');
  const canViewCustomers = usePermission('customers.view');
  const canViewStorage = usePermission('storage.view');
  const canViewMaterials = usePermission('catalog.materials.view');
  const canViewServices = usePermission('catalog.services.view');
  const canViewCars = usePermission('catalog.cars.view');
  const canViewAssets = usePermission('assets.view');
  const canViewUsers = usePermission('users.view');
  const canViewReports = usePermission('reports.view');

  const showCatalog = canViewMaterials || canViewServices || canViewCars;
  const showBusiness = canViewOrders || canViewDirectSales || canViewDirectSalesHistory || canViewCustomers;

  const confirmLogout = () => {
    setIsLogoutDialogOpen(false);
    logout();
    navigate('/login');
  };

  const BrandTitle = () => (
    <BrandLogo size="md" onClick={() => navigate('/')} />
  );

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-card border-r border-border overflow-hidden shadow-sm">
      <div className="flex h-[72px] items-center border-b border-border px-4 md:px-6 z-10 shrink-0 justify-between">
        <BrandTitle />
        <Button variant="ghost" size="icon" className="lg:hidden -mr-2" onClick={() => setIsMobileMenuOpen(false)}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar z-10">
        <NavSection title={t('common.main')} />
        <Link
          to="/"
          onClick={() => setIsMobileMenuOpen(false)}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${location.pathname === '/' ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted hover:text-primary'}`}
        >
          <LayoutDashboard size={18} strokeWidth={2.5} />
          {t('common.dashboard')}
        </Link>

        {showBusiness && <NavSection title={t('common.business')} />}
        {canViewOrders && (
          <Link to="/orders" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${location.pathname === '/orders' ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted hover:text-primary'}`}>
            <ShoppingCart size={18} strokeWidth={2.5} />
            {t('common.orders')}
          </Link>
        )}
        {(canViewDirectSales || canViewDirectSalesHistory) && (
          canViewDirectSales && canViewDirectSalesHistory ? (
            <NavGroup 
              title={t('common.directSales')} 
              icon={DollarSign} 
              to="/direct-sales"
              isActive={location.pathname === '/direct-sales'}
              defaultOpen={location.pathname.startsWith('/direct-sales')}
              onNavigate={() => setIsMobileMenuOpen(false)}
            >
              <Link to="/direct-sales" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium ${location.pathname === '/direct-sales' ? 'text-primary bg-primary/10 font-bold' : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}>
                {t('directSales.newSale', 'New Direct Sale')}
              </Link>
              <Link to="/direct-sales/history" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium ${location.pathname === '/direct-sales/history' ? 'text-primary bg-primary/10 font-bold' : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}>
                {t('directSales.history', 'Sales History')}
              </Link>
            </NavGroup>
          ) : canViewDirectSales ? (
            <Link to="/direct-sales" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${location.pathname === '/direct-sales' ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted hover:text-primary'}`}>
              <DollarSign size={18} strokeWidth={2.5} />
              {t('common.directSales')}
            </Link>
          ) : (
            <Link to="/direct-sales/history" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${location.pathname === '/direct-sales/history' ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted hover:text-primary'}`}>
              <DollarSign size={18} strokeWidth={2.5} />
              {t('directSales.history', 'Sales History')}
            </Link>
          )
        )}
        {canViewCustomers && (
          <Link to="/customers" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${location.pathname === '/customers' ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted hover:text-primary'}`}>
            <Users size={18} strokeWidth={2.5} />
            {t('common.customers')}
          </Link>
        )}

        {(showCatalog || canViewStorage) && <NavSection title={t('common.catalogAndInventory')} />}
        {canViewStorage && (
          <NavGroup 
            title={t('common.storage')} 
            icon={Archive} 
            to="/storage"
            badgeCount={lowStockCount}
            isActive={location.pathname.startsWith('/storage')}
            defaultOpen={location.pathname.startsWith('/storage')}
            onNavigate={() => setIsMobileMenuOpen(false)}
          >
            <Link to="/storage" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm font-medium ${location.pathname === '/storage' ? 'text-primary bg-primary/10 font-bold' : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}>
              <span>{t('storage.title', 'Storage & Inventory')}</span>
            </Link>
            <Link to="/storage/low-stock" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all text-sm font-medium ${location.pathname === '/storage/low-stock' ? 'text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 font-bold' : 'text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20'}`}>
              <span className="flex items-center gap-2">
                <AlertCircle size={14} />
                {t('storage.lowStockAlerts', 'Low Stock Alerts')}
              </span>
              {lowStockCount > 0 && (
                <span className="flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold px-1">
                  {lowStockCount}
                </span>
              )}
            </Link>
          </NavGroup>
        )}

        {showCatalog && (
          <NavGroup title={t('common.catalog')} icon={Package} defaultOpen={true}>
            {canViewMaterials && (
              <Link to="/materials" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium ${location.pathname === '/materials' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}>
                {t('common.materials')}
              </Link>
            )}
            {canViewServices && (
              <Link to="/services" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium ${location.pathname === '/services' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}>
                {t('common.services')}
              </Link>
            )}
            {canViewCars && (
              <Link to="/cars" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium ${location.pathname === '/cars' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}>
                {t('common.carCatalog')}
              </Link>
            )}
            {canViewAssets && (
              <Link to="/assets" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm font-medium ${location.pathname === '/assets' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-muted/50'}`}>
                {t('assets.title', 'Company Assets')}
              </Link>
            )}
          </NavGroup>
        )}

        {(canViewUsers || canViewReports) && <NavSection title={t('common.system')} />}
        {canViewUsers && (
          <Link to="/users" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${location.pathname === '/users' ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted hover:text-primary'}`}>
            <Users size={18} strokeWidth={2.5} />
            {t('common.users')}
          </Link>
        )}
        {canViewReports && (
          <Link to="/reports" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all font-medium text-sm ${location.pathname === '/reports' ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground hover:bg-muted hover:text-primary'}`}>
            <BarChart size={18} strokeWidth={2.5} />
            {t('common.reports')}
          </Link>
        )}
      </div>

      <div className="p-4 border-t border-border bg-muted/20 shrink-0 z-10 flex flex-col gap-2">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
            <CircleUserRound className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="flex flex-col truncate">
            <span className="text-lg font-bold truncate text-foreground">{user?.name || 'User'}</span>
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
              {user?.role === 'ADMIN' ? t('roles.admin') : user?.role === 'MANAGER' ? t('roles.manager') : t('roles.employee')}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsLogoutDialogOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary hover:bg-destructive/10 hover:text-destructive text-foreground rounded-xl transition-all duration-200 font-semibold text-sm"
        >
          <LogOut size={16} strokeWidth={2.5} />
          {t('common.logout')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden flex bg-background text-foreground transition-colors duration-200 font-sans">
      <div className="hidden lg:block h-screen shrink-0 w-[280px]">
        <SidebarContent />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-[72px] bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-8 z-30 sticky top-0 transition-colors duration-200">
          <div className="flex items-center gap-2 lg:gap-4">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger className="inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary p-1.5 lg:hidden transition-colors">
                <Menu className="h-6 w-6 text-foreground" />
              </SheetTrigger>
              <SheetContent side="left" className="p-0 border-none w-[300px] bg-transparent shadow-2xl" showCloseButton={false}>
                <SidebarContent />
              </SheetContent>
            </Sheet>
            
            <div className="lg:hidden">
              <BrandTitle />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-full hover:bg-secondary">
              {theme === 'dark' ? <Sun className="h-5 w-5 text-muted-foreground" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="h-9 px-3 rounded-full flex items-center gap-2 border border-border/50 bg-card hover:bg-secondary/80 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-bold tracking-wider">{i18n.language === 'am' ? 'አማ' : 'EN'}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl p-1 bg-card border border-border shadow-xl">
                <DropdownMenuItem
                  onClick={() => i18n.changeLanguage('en')}
                  className={`cursor-pointer rounded-lg mb-1 flex items-center justify-between px-3 py-2 ${i18n.language === 'en' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}
                >
                  <span>English (EN)</span>
                  {i18n.language === 'en' && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => i18n.changeLanguage('am')}
                  className={`cursor-pointer rounded-lg flex items-center justify-between px-3 py-2 ${i18n.language === 'am' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}
                >
                  <span>Amharic (AM)</span>
                  {i18n.language === 'am' && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar relative p-4 lg:p-8 scroll-smooth" id="main-content">
          <div className="relative w-full max-w-7xl mx-auto pb-20">
            <Outlet />
          </div>
        </main>
      </div>

      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onConfirm={confirmLogout}
        title={t('common.logout')}
        message={t('common.logoutConfirm')}
        type="danger"
        confirmText={t('common.logout')}
      />
    </div>
  );
}
