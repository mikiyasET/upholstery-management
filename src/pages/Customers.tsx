import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import api from '../lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSearch
} from '../components/DataTable';
import { formatPlateNumber } from '../utils/plate';
import { formatAppDate } from '../lib/utils';
import { Car, Phone, CalendarDays, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader, TablePagination } from '../components/common';
import { ActionIcon, Tooltip } from '@mantine/core';

type Customer = {
  id: string;
  name: string;
  phoneNumber: string;
  createdAt: string;
  _count: { orders: number };
  vehicles: Vehicle[];
};

type Vehicle = {
  id: string;
  plateNumber: string;
  customerId: string;
  customer?: Customer;
  carModel: {
    brand: { name: string };
    name: string;
    imageUrl?: string;
  };
  _count: { orders: number };
  createdAt: string;
};

export default function Customers() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: customers, isLoading: isLoadingCustomers, refetch, isFetching } = useQuery<Customer[]>({
    queryKey: ['customers', search],
    queryFn: async () => {
      const res = await api.get(`/customers?search=${search}`);
      return res.data;
    },
  });

  const totalPages = Math.max(1, Math.ceil((customers?.length || 0) / pageSize));
  const paginatedCustomers = useMemo(() => {
    return (customers || []).slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [customers, currentPage, pageSize]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        title={t('customers.title', 'Customer Directory')}
        subtitle={t('customers.subtitle', 'Manage vehicle owners, fleet profiles, and order histories.')}
        badge={customers ? `${customers.length} Clients` : undefined}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        refreshTooltip="Refresh customers"
      />

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-center justify-between bg-card">
          <TableSearch
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder={t('customers.search')}
          />
        </div>

        <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('customers.customer')}</TableHead>
                  <TableHead>{t('customers.phone')}</TableHead>
                  <TableHead>{t('customers.registeredVehicles')}</TableHead>
                  <TableHead>{t('customers.totalOrders')}</TableHead>
                  <TableHead>{t('customers.joined')}</TableHead>
                  <TableHead className="text-right">{t('common.actions', 'Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingCustomers ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('customers.loading')}</TableCell>
                  </TableRow>
                ) : customers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('customers.noneFound')}</TableCell>
                  </TableRow>
                ) : (
                  paginatedCustomers.map((c) => (
                    <TableRow 
                      key={c.id} 
                      onClick={() => navigate(`/customers/${c.id}`)}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <div className="font-semibold text-foreground">{c.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4 text-amber-500" />
                          <span>{c.phoneNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {c.vehicles.length === 0 ? (
                            <span className="text-muted-foreground text-xs italic">{t('customers.none')}</span>
                          ) : (
                            c.vehicles.map((v) => (
                              <div key={v.id} className="flex items-center gap-2 text-sm text-foreground">
                                <Car className="w-3.5 h-3.5 text-primary" />
                                <span className="font-semibold">{formatPlateNumber(v.plateNumber)}</span>
                                <span className="text-muted-foreground text-xs">({v.carModel.brand.name} {v.carModel.name})</span>
                              </div>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground">{c._count.orders}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <CalendarDays className="w-4 h-4" />
                          {formatAppDate(c.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end">
                          <Tooltip label="View Customer Profile" withArrow>
                            <ActionIcon
                              variant="subtle"
                              color="amber"
                              size="sm"
                              onClick={() => navigate(`/customers/${c.id}`)}
                            >
                              <Eye size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
        </div>

        <TablePagination
          page={currentPage}
          pageSize={pageSize}
          total={customers?.length || 0}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          itemLabel={t('common.customers', 'customers')}
          disabled={isLoadingCustomers}
        />
      </div>
    </div>
  );
}
