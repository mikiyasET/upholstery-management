import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { formatInputNumber, parseInputNumber, formatCurrency } from '../lib/utils';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Checkbox } from '../components/ui/checkbox';
import { Edit2, ShieldAlert, Shield, UserCog, UserRound, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '../components/ui/switch';
import { PageHeader, ExecutiveAddButton, TablePagination } from '../components/common';

// -------------------------------------------------------
// Types
// -------------------------------------------------------

type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
type TabKey = 'admins' | 'managers' | 'employees';

interface PermissionItem {
  key: string;
  label: string;
}

interface PermissionGroup {
  id: string;
  label: string;
  description: string;
  permissions: PermissionItem[];
  numericField?: {
    key: string;
    label: string;
    description: string;
    defaultValue: number;
  };
}

// -------------------------------------------------------
// Permission Grid Component
// -------------------------------------------------------

function PermissionGrid({
  groups,
  permissions,
  onChange,
}: {
  groups: PermissionGroup[];
  permissions: Record<string, boolean | number>;
  onChange: (key: string, value: boolean | number) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleGroup = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Toggle all permissions in a group
  const toggleAllInGroup = (group: PermissionGroup, allOn: boolean) => {
    group.permissions.forEach((p) => onChange(p.key, !allOn));
  };

  const getPermissionGroupLabel = (group: PermissionGroup) => {
    switch (group.id) {
      case 'orders': return t('users.permissions.groups.orders', group.label);
      case 'directSales': return t('users.permissions.groups.directSales', group.label);
      case 'customers': return t('users.permissions.groups.customers', group.label);
      case 'storage': return t('users.permissions.groups.storage', group.label);
      case 'catalog.materials': return t('users.permissions.groups.catalogMaterials', group.label);
      case 'catalog.services': return t('users.permissions.groups.catalogServices', group.label);
      case 'catalog.cars': return t('users.permissions.groups.catalogCars', group.label);
      case 'users': return t('users.permissions.groups.users', group.label);
      case 'reports': return t('users.permissions.groups.reports', group.label);
      default: return group.label;
    }
  };

  const getPermissionGroupDesc = (group: PermissionGroup) => {
    switch (group.id) {
      case 'orders': return t('users.permissions.groups.ordersDesc', group.description);
      case 'directSales': return t('users.permissions.groups.directSalesDesc', group.description);
      case 'customers': return t('users.permissions.groups.customersDesc', group.description);
      case 'storage': return t('users.permissions.groups.storageDesc', group.description);
      case 'catalog.materials': return t('users.permissions.groups.catalogMaterialsDesc', group.description);
      case 'catalog.services': return t('users.permissions.groups.catalogServicesDesc', group.description);
      case 'catalog.cars': return t('users.permissions.groups.catalogCarsDesc', group.description);
      case 'users': return t('users.permissions.groups.usersDesc', group.description);
      case 'reports': return t('users.permissions.groups.reportsDesc', group.description);
      default: return group.description;
    }
  };

  const getPermissionItemLabel = (key: string, fallback: string) => {
    switch (key) {
      case 'orders.view': return t('users.permissions.items.ordersView', fallback);
      case 'orders.create': return t('users.permissions.items.ordersCreate', fallback);
      case 'directSales.view': return t('users.permissions.items.directSalesView', fallback);
      case 'directSales.create': return t('users.permissions.items.directSalesCreate', fallback);
      case 'directSales.history': return t('users.permissions.items.directSalesHistory', fallback);
      case 'customers.view': return t('users.permissions.items.customersView', fallback);
      case 'customers.edit': return t('users.permissions.items.customersEdit', fallback);
      case 'storage.view': return t('users.permissions.items.storageView', fallback);
      case 'storage.edit': return t('users.permissions.items.storageEdit', fallback);
      case 'catalog.materials.view': return t('users.permissions.items.catalogMaterialsView', fallback);
      case 'catalog.materials.add': return t('users.permissions.items.catalogMaterialsAdd', fallback);
      case 'catalog.materials.edit': return t('users.permissions.items.catalogMaterialsEdit', fallback);
      case 'catalog.materials.remove': return t('users.permissions.items.catalogMaterialsRemove', fallback);
      case 'catalog.services.view': return t('users.permissions.items.catalogServicesView', fallback);
      case 'catalog.services.add': return t('users.permissions.items.catalogServicesAdd', fallback);
      case 'catalog.services.edit': return t('users.permissions.items.catalogServicesEdit', fallback);
      case 'catalog.services.remove': return t('users.permissions.items.catalogServicesRemove', fallback);
      case 'catalog.cars.view': return t('users.permissions.items.catalogCarsView', fallback);
      case 'catalog.cars.add': return t('users.permissions.items.catalogCarsAdd', fallback);
      case 'catalog.cars.edit': return t('users.permissions.items.catalogCarsEdit', fallback);
      case 'catalog.cars.remove': return t('users.permissions.items.catalogCarsRemove', fallback);
      case 'users.view': return t('users.permissions.items.usersView', fallback);
      case 'users.edit': return t('users.permissions.items.usersEdit', fallback);
      case 'reports.view': return t('users.permissions.items.reportsView', fallback);
      default: return fallback;
    }
  };

  return (
    <div className="space-y-2">
      {groups.map((group) => {
        const allOn = group.permissions.every((p) => permissions[p.key] === true);
        const someOn = group.permissions.some((p) => permissions[p.key] === true);
        const isExpanded = expanded[group.id] !== false; // default open

        return (
          <div key={group.id} className="rounded-xl border border-border bg-muted/30 overflow-hidden transition-all">
            {/* Group Header */}
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${allOn ? 'bg-green-500' : someOn ? 'bg-yellow-500' : 'bg-gray-400 dark:bg-gray-600'}`} />
                <div className="text-left">
                  <div className="text-sm font-semibold text-foreground">{getPermissionGroupLabel(group)}</div>
                  <div className="text-xs text-muted-foreground">{getPermissionGroupDesc(group)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Quick toggle all */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {allOn ? t('users.allOn', 'All On') : someOn ? t('users.partial', 'Partial') : t('users.off', 'Off')}
                  </span>
                  <Switch
                    checked={allOn}
                    onCheckedChange={() => toggleAllInGroup(group, allOn)}
                  />
                </div>
                {isExpanded ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
              </div>
            </button>

            {/* Individual Permissions */}
            {isExpanded && (
              <div className="border-t border-border bg-background/50">
                {group.permissions.map((perm) => (
                  <div key={perm.key} className="flex items-center justify-between px-6 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors">
                    <span className="text-sm text-foreground">{getPermissionItemLabel(perm.key, perm.label)}</span>
                    <Switch
                      checked={permissions[perm.key] === true}
                      onCheckedChange={(v) => onChange(perm.key, v)}
                    />
                  </div>
                ))}

                {/* Numeric field (e.g. orders.limitCount) */}
                {group.numericField && permissions[group.permissions[0]?.key] === true && (
                  <div className="px-6 py-3 border-t border-border bg-muted/20">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {t('users.permissions.items.ordersLimitCount', group.numericField.label)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('users.permissions.items.ordersLimitCountDesc', group.numericField.description)}
                        </div>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        className="w-24 text-center"
                        value={(permissions[group.numericField.key] as number) ?? group.numericField.defaultValue}
                        onChange={(e) => onChange(group.numericField!.key, parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// -------------------------------------------------------
// Main Users Page
// -------------------------------------------------------

export default function Users() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('admins');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [modalRole, setModalRole] = useState<UserRole>('ADMIN');
  const [baseSalary, setBaseSalary] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, boolean | number>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    },
  });

  const { data: permissionSchema = [] } = useQuery<PermissionGroup[]>({
    queryKey: ['permission-schema'],
    queryFn: async () => {
      const res = await api.get('/users/permission-schema');
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingUser) {
        return api.patch(`/users/${editingUser.id}`, payload);
      } else {
        return api.post('/users', payload);
      }
    },
    onSuccess: () => {
      toast.success(editingUser ? t('users.alerts.userUpdated', 'User updated successfully') : t('users.alerts.userCreated', 'User created successfully'));
      queryClient.invalidateQueries({ queryKey: ['users'] });
      closeModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('users.alerts.errorSaving', 'Error saving user'));
    },
  });

  // Filter users by tab
  const filteredUsers = users?.filter((u: any) => {
    if (activeTab === 'admins') return u.role === 'ADMIN';
    if (activeTab === 'managers') return u.role === 'MANAGER';
    return u.role === 'EMPLOYEE';
  }) || [];

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getRoleDisplayName = (role: UserRole) => {
    if (role === 'ADMIN') return t('users.roles.admin', 'Admin');
    if (role === 'MANAGER') return t('users.roles.manager', 'Manager');
    return t('users.roles.employee', 'Employee');
  };

  const openModal = (user?: any, overrideRole?: UserRole) => {
    if (user) {
      setEditingUser(user);
      setName(user.name);
      setPhone(user.phone || '');
      setModalRole(user.role);
      setIsActive(user.isActive);
      setBaseSalary(user.employee?.baseSalary ? formatInputNumber(user.employee.baseSalary.toString()) : '');
      setContactInfo(user.employee?.contactInfo || '');
      setPassword('');
      setPermissions(user.permissions || {});
    } else {
      const role = overrideRole || (activeTab === 'admins' ? 'ADMIN' : activeTab === 'managers' ? 'MANAGER' : 'EMPLOYEE');
      setEditingUser(null);
      setName('');
      setPhone('');
      setModalRole(role);
      setIsActive(true);
      setBaseSalary('');
      setContactInfo('');
      setPassword('');
      // For new managers, start with all permissions off
      if (role === 'MANAGER') {
        const defaults: Record<string, boolean | number> = { 'orders.limitCount': 0 };
        permissionSchema.forEach((g) => g.permissions.forEach((p) => { defaults[p.key] = false; }));
        setPermissions(defaults);
      } else {
        setPermissions({});
      }
    }
    setShowPassword(false);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleSave = () => {
    if (!name.trim()) return toast.error(t('users.alerts.nameRequired', 'Name is required'));

    const payload: any = {
      name,
      role: modalRole,
      isActive,
      baseSalary: baseSalary ? parseInputNumber(baseSalary) : undefined,
      contactInfo: contactInfo || undefined,
    };

    // Handle permissions
    if (modalRole === 'MANAGER') {
      payload.permissions = permissions;
    } else if (modalRole === 'ADMIN') {
      // Only pass the users.view/edit toggles for admins
      payload.permissions = {
        'users.view': permissions['users.view'] !== false,
        'users.edit': permissions['users.edit'] !== false,
      };
    }

    if (!editingUser) {
      if (!phone) return toast.error(t('users.alerts.phoneRequired', 'Phone is required'));
      if (modalRole !== 'EMPLOYEE' && !password) return toast.error(t('users.alerts.passwordRequired', 'Password is required'));
      payload.phone = phone;
      if (password) payload.password = password;
    } else {
      if (phone) payload.phone = phone;
      if (password) payload.password = password;
    }

    saveMutation.mutate(payload);
  };

  const handlePermissionChange = (key: string, value: boolean | number) => {
    setPermissions((prev) => ({ ...prev, [key]: value }));
  };

  const tabs: { key: TabKey; label: string; icon: any; color: string }[] = [
    { key: 'admins', label: t('users.tabs.admins', 'Super Admins'), icon: Shield, color: 'text-red-500' },
    { key: 'managers', label: t('users.tabs.managers', 'Managers'), icon: UserCog, color: 'text-purple-500' },
    { key: 'employees', label: t('users.tabs.employees', 'Employees'), icon: UserRound, color: 'text-blue-500' },
  ];

  const tabCounts = {
    admins: users?.filter((u: any) => u.role === 'ADMIN').length || 0,
    managers: users?.filter((u: any) => u.role === 'MANAGER').length || 0,
    employees: users?.filter((u: any) => u.role === 'EMPLOYEE').length || 0,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title={t('users.title', 'Users & Employees')}
        subtitle={t('users.subtitle', 'Manage system access, roles, and employee profiles')}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
        isRefreshing={isLoading}
        primaryAction={
          <ExecutiveAddButton
            label={t('users.addRole', 'Add {{role}}', { role: getRoleDisplayName(activeTab === 'admins' ? 'ADMIN' : activeTab === 'managers' ? 'MANAGER' : 'EMPLOYEE') })}
            onClick={() => openModal()}
          />
        }
      />

      {/* Tab Switcher */}
      <div className="flex gap-2 p-1.5 bg-muted/50 rounded-xl border border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setCurrentPage(1);
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            }`}
          >
            <tab.icon size={16} className={activeTab === tab.key ? tab.color : ''} />
            {tab.label}
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* User Table */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">{t('users.loadingUsers', 'Loading users...')}</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name', 'Name')}</TableHead>
                  <TableHead>{t('users.table.contact', 'Contact')}</TableHead>
                  <TableHead>{t('common.status', 'Status')}</TableHead>
                  {activeTab !== 'admins' && <TableHead>{t('users.table.salary', 'Salary (Birr)')}</TableHead>}
                  {activeTab === 'managers' && <TableHead>{t('users.table.permissions', 'Permissions')}</TableHead>}
                  <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user: any) => {
                  const permCount = user.permissions
                    ? Object.entries(user.permissions).filter(([k, v]) => v === true && k !== 'orders.limitCount').length
                    : 0;

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-semibold">{user.name}</div>
                        <div className="text-muted-foreground text-xs">{user.phone}</div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                          user.role === 'ADMIN' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' :
                          user.role === 'MANAGER' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                        }`}>
                          {user.role === 'ADMIN' ? t('users.roles.ADMIN', 'Super Admin') : user.role === 'MANAGER' ? t('users.roles.MANAGER', 'Manager') : t('users.roles.EMPLOYEE', 'Employee')}
                        </span>
                        {user.employee?.contactInfo && <div className="text-xs text-muted-foreground mt-1">{user.employee.contactInfo}</div>}
                      </TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${user.isActive ? 'text-green-600' : 'text-red-500'}`}>
                          <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                          {user.isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                        </span>
                      </TableCell>
                      {activeTab !== 'admins' && (
                        <TableCell className="text-muted-foreground font-medium">
                          {user.employee?.baseSalary ? formatCurrency(user.employee.baseSalary) : '-'}
                        </TableCell>
                      )}
                      {activeTab === 'managers' && (
                        <TableCell>
                          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-bold">
                            {t('users.table.activePerms', '{{count}} active', { count: permCount })}
                          </span>
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openModal(user)}>
                          <Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={activeTab === 'managers' ? 6 : 5} className="text-center text-muted-foreground py-8">
                      {t('users.noUsersFound', 'No {{role}} found', { role: tabs.find(t => t.key === activeTab)?.label })}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <TablePagination
              page={currentPage}
              pageSize={pageSize}
              total={filteredUsers.length}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              itemLabel="users"
              disabled={isLoading}
            />
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className={`${modalRole === 'MANAGER' ? 'sm:max-w-[600px] max-h-[85vh] overflow-y-auto' : 'sm:max-w-[425px]'}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modalRole === 'ADMIN' && <Shield className="w-5 h-5 text-red-500" />}
              {modalRole === 'MANAGER' && <UserCog className="w-5 h-5 text-purple-500" />}
              {modalRole === 'EMPLOYEE' && <UserRound className="w-5 h-5 text-blue-500" />}
              {editingUser 
                ? (modalRole === 'ADMIN' ? t('users.modal.editAdmin', 'Edit Admin') : modalRole === 'MANAGER' ? t('users.modal.editManager', 'Edit Manager') : t('users.modal.editEmployee', 'Edit Employee'))
                : (modalRole === 'ADMIN' ? t('users.modal.createAdmin', 'Add New Admin') : modalRole === 'MANAGER' ? t('users.modal.createManager', 'Add New Manager') : t('users.modal.createEmployee', 'Add New Employee'))}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">

            {/* Name */}
            <div className="grid gap-2">
              <Label>{t('users.form.fullName', 'Full Name')}</Label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder={t('users.placeholders.fullName', 'e.g. Abebe Kebede')} 
              />
            </div>

            {/* Phone */}
            <div className="grid gap-2">
              <Label>{t('users.form.phone', 'Phone Number')}</Label>
              <Input 
                type="tel" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                placeholder={t('users.placeholders.phone', '0911234567')} 
              />
            </div>

            {/* Password — only for ADMIN and MANAGER */}
            {modalRole !== 'EMPLOYEE' && (
              <div className="grid gap-2">
                <Label>{editingUser ? t('users.form.resetPassword', 'Reset Password (optional)') : t('users.form.password', 'Password')}</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t('users.placeholders.password', 'Min 6 characters')}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Salary & Contact — for MANAGER and EMPLOYEE only */}
            {modalRole !== 'ADMIN' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{t('users.form.baseSalary', 'Base Salary (Birr)')}</Label>
                  <Input 
                    value={baseSalary} 
                    onChange={e => setBaseSalary(formatInputNumber(e.target.value))} 
                    placeholder={t('common.optional', 'Optional')} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label>{t('users.form.contactInfo', 'Additional Contact Info')}</Label>
                  <Input 
                    value={contactInfo} 
                    onChange={e => setContactInfo(e.target.value)} 
                    placeholder={t('users.placeholders.contactInfo', 'Optional details...')} 
                  />
                </div>
              </div>
            )}

            {/* Active Toggle — only when editing */}
            {editingUser && (
              <div className="flex items-center space-x-2 mt-2 p-3 bg-muted/20 rounded-md border border-border">
                <Checkbox id="active" checked={isActive} onCheckedChange={(c) => setIsActive(!!c)} />
                <div className="grid gap-1.5 leading-none">
                  <label htmlFor="active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {t('users.form.accountActive', 'Account Active')}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {modalRole === 'EMPLOYEE' 
                      ? t('users.form.employeeActiveHelper', 'Mark this employee as active or inactive') 
                      : t('users.form.userActiveHelper', 'Allow user to log in')}
                  </p>
                </div>
              </div>
            )}

            {/* ADMIN: Users & Employees toggle */}
            {modalRole === 'ADMIN' && (
              <>
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-md border border-red-200 dark:border-red-900 text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{t('users.adminNotice', 'Super Admin has full access to the entire system.')}</span>
                </div>
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="px-4 py-3 bg-muted/30">
                    <div className="text-sm font-semibold text-foreground">
                      {t('users.adminRestrictionsTitle', 'Optional Access Restrictions')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('users.adminRestrictionsDesc', 'Toggle off to hide Users & Employees from this admin')}
                    </div>
                  </div>
                  <div className="border-t border-border">
                    <div className="flex items-center justify-between px-6 py-3 hover:bg-muted/20 transition-colors">
                      <span className="text-sm">{t('users.canViewUsers', 'Can view Users & Employees')}</span>
                      <Switch
                        checked={permissions['users.view'] !== false}
                        onCheckedChange={(v) => handlePermissionChange('users.view', v)}
                      />
                    </div>
                    <div className="flex items-center justify-between px-6 py-3 border-t border-border hover:bg-muted/20 transition-colors">
                      <span className="text-sm">{t('users.canEditUsers', 'Can edit Users & Employees')}</span>
                      <Switch
                        checked={permissions['users.edit'] !== false}
                        onCheckedChange={(v) => handlePermissionChange('users.edit', v)}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* MANAGER: Full Permission Grid */}
            {modalRole === 'MANAGER' && (
              <div className="space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {t('users.accessPermissions', 'Access Permissions')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('users.accessPermissionsDesc', 'Configure what this manager can access')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        const all: Record<string, boolean | number> = { 'orders.limitCount': 0 };
                        permissionSchema.forEach((g) => g.permissions.forEach((p) => { all[p.key] = true; }));
                        setPermissions(all);
                      }}
                    >
                      {t('users.grantAll', 'Grant All')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        const none: Record<string, boolean | number> = { 'orders.limitCount': 0 };
                        permissionSchema.forEach((g) => g.permissions.forEach((p) => { none[p.key] = false; }));
                        setPermissions(none);
                      }}
                    >
                      {t('users.revokeAll', 'Revoke All')}
                    </Button>
                  </div>
                </div>
                <PermissionGrid
                  groups={permissionSchema}
                  permissions={permissions}
                  onChange={handlePermissionChange}
                />
              </div>
            )}

            {/* EMPLOYEE notice */}
            {modalRole === 'EMPLOYEE' && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-md border border-blue-200 dark:border-blue-900 text-xs">
                <UserRound className="w-4 h-4 shrink-0" />
                <span>{t('users.employeeNotice', 'Employees cannot log in to the system. They are worker profiles used for order assignments.')}</span>
              </div>
            )}

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>{t('common.cancel', 'Cancel')}</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-amber-600 text-white hover:bg-amber-700 font-semibold shadow-sm">
              {saveMutation.isPending ? t('common.saving', 'Saving...') : t('users.saveRole', 'Save {{role}}', { role: getRoleDisplayName(modalRole) })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

