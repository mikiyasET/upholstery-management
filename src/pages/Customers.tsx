import { useState } from 'react';
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
import { Car, Phone, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

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

  const { data: customers, isLoading: isLoadingCustomers } = useQuery<Customer[]>({
    queryKey: ['customers', search],
    queryFn: async () => {
      const res = await api.get(`/customers?search=${search}`);
      return res.data;
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{t('customers.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('customers.subtitle')}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#161616] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-[#161616]">
          <TableSearch value={search} onChange={setSearch} placeholder={t('customers.search')} />
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingCustomers ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">{t('customers.loading')}</TableCell>
                  </TableRow>
                ) : customers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">{t('customers.noneFound')}</TableCell>
                  </TableRow>
                ) : (
                  customers?.map((c) => (
                    <TableRow 
                      key={c.id} 
                      onClick={() => navigate(`/customers/${c.id}`)}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{c.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Phone className="w-4 h-4 text-gray-400" />
                          {c.phoneNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {c.vehicles.length === 0 ? (
                            <span className="text-gray-400 text-sm">{t('customers.none')}</span>
                          ) : (
                            c.vehicles.map((v) => (
                              <div key={v.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <Car className="w-3.5 h-3.5 text-[#c9a84c]" />
                                <span>{formatPlateNumber(v.plateNumber)}</span>
                                <span className="text-gray-400">({v.carModel.brand.name} {v.carModel.name})</span>
                              </div>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-gray-900 dark:text-white">{c._count.orders}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                          <CalendarDays className="w-4 h-4 text-gray-400" />
                          {format(new Date(c.createdAt), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
        </div>
      </div>
    </div>
  );
}
