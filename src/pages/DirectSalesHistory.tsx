import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Calendar, FileText, Printer, Eye, Search, X, CircleDollarSign, Receipt, Pencil, Plus } from 'lucide-react';
import { formatCurrency, formatStatus, formatPaymentMethod, formatAppDate } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetTitle } from '../components/ui/sheet';
import { printDirectSaleReceipt } from '../lib/receipt-printer';
import { PageHeader, ExecutiveAddButton, TablePagination } from '../components/common';
import { ActionIcon, Tooltip, Box, TextInput, Select, Button as MantineButton, Badge } from '@mantine/core';
import { ModernInput } from '../components/ui/modern-input';
import { toast } from 'sonner';

export const getSaleTotal = (sale: any) => {
  if (sale?.totalAmount !== undefined && sale?.totalAmount !== null && !isNaN(Number(sale.totalAmount)) && Number(sale.totalAmount) > 0) {
    return Number(sale.totalAmount);
  }
  const subtotal = sale?.lines?.reduce((sum: number, line: any) =>
    sum + (Number(line.priceAtSaleTime || 0) * Number(line.quantity || 0)), 0) || 0;
  const discount = Number(sale?.discountAmount || 0);
  const tax = Number(sale?.taxAmount || 0);
  const calculated = Math.max(0, subtotal - discount + tax);
  if (calculated > 0) return calculated;
  const paymentsTotal = sale?.payments?.reduce((s: number, p: any) => s + Number(p.amount || 0), 0) || 0;
  if (paymentsTotal > 0) return paymentsTotal;
  return Number(sale?.totalAmount || 0);
};

export default function DirectSalesHistory() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // FSR Modal State & Mutation
  const [isFsrModalOpen, setIsFsrModalOpen] = useState(false);
  const [fsrSaleTarget, setFsrSaleTarget] = useState<any | null>(null);
  const [fsrInputValue, setFsrInputValue] = useState('');

  const updateFsrMutation = useMutation({
    mutationFn: async ({ id, newFsr }: { id: string; newFsr: string }) => {
      const res = await api.patch(`/direct-sales/${id}/fsr-number`, { fsrNumber: newFsr.trim() || null });
      return res.data;
    },
    onSuccess: (updatedSale) => {
      queryClient.invalidateQueries({ queryKey: ['direct-sales'] });
      if (selectedSale?.id === updatedSale.id) {
        queryClient.invalidateQueries({ queryKey: ['direct-sale', updatedSale.id] });
        setSelectedSale((prev: any) => prev ? { ...prev, fsrNumber: updatedSale.fsrNumber } : null);
      }
      toast.success(t('orders.detail.fsrUpdated', 'FSR Number updated successfully'));
      setIsFsrModalOpen(false);
      setFsrSaleTarget(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || t('alerts.error', 'Error updating FSR Number'));
    },
  });

  const handleOpenFsrDialog = (sale: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFsrSaleTarget(sale);
    setFsrInputValue(sale.fsrNumber || '');
    setIsFsrModalOpen(true);
  };

  const getLocName = (item: any) =>
    i18n?.language === 'am' && item?.nameAm ? item.nameAm : (item?.nameEn || t('common.unknown', 'Unknown Item'));

  const handleRowClick = (sale: any) => {
    setSelectedSale(sale);
  };

  const { data: sales = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['direct-sales'],
    queryFn: async () => {
      const res = await api.get('/direct-sales');
      return res.data;
    },
  });

  const { data: fullSaleDetails, isLoading: isDetailsLoading } = useQuery({
    queryKey: ['direct-sale', selectedSale?.id],
    queryFn: async () => {
      const res = await api.get(`/direct-sales/${selectedSale.id}`);
      return res.data;
    },
    enabled: !!selectedSale?.id,
  });

  const filteredSales = sales.filter((s: any) => {
    const matchesSearch =
      !searchTerm ||
      (s.saleNumber && s.saleNumber.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (s.fsrNumber && s.fsrNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.customerName && s.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.customerPhone && s.customerPhone.includes(searchTerm)) ||
      (s.createdBy?.name && s.createdBy.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPayment =
      paymentFilter === 'ALL' || s.paymentStatus === paymentFilter;

    return matchesSearch && matchesPayment;
  });

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-300 pb-8">
      {/* 1. Executive PageHeader */}
      <PageHeader
        title={t('directSales.history', 'Direct Sales History')}
        subtitle={t('directSales.historySubtitle', 'View past walk-in sales and reprint receipts.')}
        badge={sales ? `${sales.length} ${t('common.sales', 'Sales')}` : undefined}
        onRefresh={() => refetch()}
        isRefreshing={isFetching}
        refreshTooltip="Refresh sales history"
        action={
          <ExecutiveAddButton
            label={t('directSales.newSale', 'New POS Sale')}
            to="/direct-sales"
          />
        }
      />

      {/* 2. Executive Control & Filter Bar */}
      <Box className="premium-card overflow-hidden" p={{ base: "xs", sm: "md" }} style={{ minWidth: 0, maxWidth: "100%" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          {/* Live Search Input */}
          <TextInput
            placeholder={t('directSales.searchHistoryPlaceholder', 'Search by receipt #, customer, phone, cashier...')}
            leftSection={<Search size={16} style={{ color: 'var(--text-muted)' }} />}
            rightSection={
              searchTerm ? (
                <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => { setSearchTerm(''); setCurrentPage(1); }} title={t('common.clear', 'Clear search')}>
                  <X size={14} />
                </ActionIcon>
              ) : null
            }
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.currentTarget.value);
              setCurrentPage(1);
            }}
            className="flex-1 w-full"
            radius="md"
            size="sm"
            styles={{
              input: {
                backgroundColor: 'var(--surface-bg)',
                borderColor: 'var(--surface-border)',
                fontSize: '13px',
              },
            }}
          />

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {/* Payment Status Quick Filter */}
            <Select
              placeholder={t('orders.filter.allPayments', 'All Payments')}
              data={[
                { value: 'ALL', label: t('orders.payment.all', 'All Payments') },
                { value: 'PAID', label: t('orders.payment.paid', 'Fully Paid') },
                { value: 'PARTIALLY_PAID', label: t('orders.payment.partiallyPaid', 'Partially Paid') },
                { value: 'UNPAID', label: t('orders.payment.unpaid', 'Unpaid') },
              ]}
              value={paymentFilter}
              onChange={(val) => {
                setPaymentFilter(val || 'ALL');
                setCurrentPage(1);
              }}
              size="sm"
              radius="md"
              className="flex-1 sm:w-44"
              leftSection={<CircleDollarSign size={15} style={{ color: 'var(--text-muted)' }} />}
              styles={{
                input: {
                  backgroundColor: 'var(--surface-bg)',
                  borderColor: 'var(--surface-border)',
                  fontSize: '13px',
                },
              }}
            />

            {/* Reset Filters CTA if any filter is active */}
            {(paymentFilter !== 'ALL' || searchTerm) && (
              <MantineButton
                variant="subtle"
                color="gray"
                size="xs"
                radius="md"
                onClick={() => {
                  setPaymentFilter('ALL');
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                leftSection={<X size={13} />}
                className="shrink-0 h-9"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontWeight: 600,
                }}
              >
                {t('common.clear', 'Reset')}
              </MantineButton>
            )}

            {/* Count Stats Badge */}
            <Badge variant="light" color="blue" size="md" radius="md" className="hidden sm:inline-flex">
              {filteredSales.length} {t('common.sales', 'Sales')}
            </Badge>
          </div>
        </div>
      </Box>

      {/* Main Content */}
      <div className="flex-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col min-w-0 max-w-full">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left min-w-[780px]">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">{t('receipt.receiptNumber', 'Receipt #')}</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">{t('orders.table.customer', 'Customer')}</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">{t('receipt.cashier', 'Cashier')}</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">{t('receipt.totalAmount', 'Total Amount')}</th>
                <th className="px-6 py-4 font-semibold text-center whitespace-nowrap">{t('orders.detail.materialsParts', 'Items')}</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">{t('common.dateTime', 'Date & Time')}</th>
                <th className="px-6 py-4 font-semibold whitespace-nowrap">{t('common.status', 'Status')}</th>
                <th className="px-6 py-4 font-semibold text-right whitespace-nowrap">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-1" />
                      <p className="text-sm font-medium">{t('directSales.loadingHistory', 'Loading history...')}</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mb-1">
                        <FileText className="w-7 h-7 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-medium text-foreground/80">{t('directSales.noSalesFound', 'No direct sales found.')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedSales.map((sale: any) => (
                  <tr 
                    key={sale.id} 
                    className="hover:bg-muted/40 transition-colors cursor-pointer"
                    onClick={() => handleRowClick(sale)}
                  >
                    <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">
                      <div className="flex items-center gap-2 font-bold text-foreground">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{sale.saleNumber}</span>
                        {sale.fsrNumber && (
                          <span 
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 tracking-wide font-mono"
                            title={`Fiscal Sales Receipt / Paper Audit FSR #: ${sale.fsrNumber}`}
                          >
                            FSR: {sale.fsrNumber}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {sale.customerName ? (
                        <div>
                          <div className="font-semibold text-foreground">{sale.customerName}</div>
                          {sale.customerPhone && (
                            <div className="text-xs text-muted-foreground">{sale.customerPhone}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">{t('receipt.walkInCustomer', 'Walk-in Client')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-foreground/80 font-medium whitespace-nowrap">
                      {sale.createdBy?.name || '-'}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground whitespace-nowrap">
                      {formatCurrency(getSaleTotal(sale))}
                    </td>
                    <td className="px-6 py-4 text-center font-medium whitespace-nowrap">
                      {sale._count?.lines || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-foreground/80">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {formatAppDate(sale.saleDateTime, true)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {sale.paymentStatus === 'PAID' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 border border-green-200 dark:border-green-500/20">
                          {formatStatus('PAID')}
                        </span>
                      ) : sale.paymentStatus === 'PARTIALLY_PAID' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                          {formatStatus('PARTIALLY_PAID')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200 dark:border-red-500/20">
                          {formatStatus('UNPAID')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Tooltip label={sale.fsrNumber ? t('orders.detail.editFsr', 'Edit FSR #') : t('orders.detail.addFsr', 'Add FSR #')} withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            size="sm"
                            onClick={(e) => handleOpenFsrDialog(sale, e)}
                          >
                            <Receipt size={16} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label="View Details" withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="amber"
                            size="sm"
                            onClick={() => handleRowClick(sale)}
                          >
                            <Eye size={16} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Print Receipt" withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="sm"
                            onClick={() => printDirectSaleReceipt(sale)}
                          >
                            <Printer size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <TablePagination
          page={currentPage}
          pageSize={itemsPerPage}
          total={filteredSales.length}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setItemsPerPage(newSize);
            setCurrentPage(1);
          }}
          itemLabel={t('common.sales', 'sales')}
          disabled={isLoading}
        />
      </div>

      {/* 1. Sale Details Bottom Sheet */}
      <Sheet open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl sm:rounded-t-3xl min-h-[50dvh] max-h-[88dvh] border-t sm:border-x border-border bg-card shadow-2xl p-0 overflow-hidden flex flex-col w-full inset-x-0 sm:max-w-2xl sm:mx-auto gap-0 focus:outline-none"
        >
          <SheetTitle className="sr-only">
            {t('receipt.receipt', 'Receipt')} #{selectedSale?.saleNumber}
          </SheetTitle>

          {/* Drag Handle Indicator */}
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

          {/* Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between border-b border-border/60 bg-muted/20 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-heading text-base sm:text-lg font-bold text-foreground truncate">
                    {t('receipt.receipt', 'Receipt')} #{selectedSale?.saleNumber}
                  </h3>
                  {fullSaleDetails?.fsrNumber ? (
                    <button
                      type="button"
                      onClick={(e) => handleOpenFsrDialog(fullSaleDetails, e)}
                      className="group inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/30 transition-all cursor-pointer shadow-xs"
                      title={t('orders.detail.editFsr', 'Edit FSR #')}
                    >
                      <Receipt className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="font-mono">FSR: {fullSaleDetails.fsrNumber}</span>
                      <Pencil className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleOpenFsrDialog(fullSaleDetails || selectedSale, e)}
                      className="group inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground bg-muted/30 hover:bg-muted/70 border border-border/80 hover:border-foreground/20 transition-all cursor-pointer"
                      title={t('orders.fsrAuditReference', 'Add Fiscal Sales Receipt paper audit number')}
                    >
                      <Plus className="w-3 h-3 text-muted-foreground group-hover:text-foreground shrink-0" />
                      <Receipt className="w-3.5 h-3.5 text-muted-foreground/70 group-hover:text-foreground shrink-0" />
                      <span>{t('orders.detail.addFsr', 'Add FSR #')}</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {selectedSale && formatAppDate(selectedSale.saleDateTime, true)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedSale(null)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer shrink-0 ml-2"
              title={t('common.close', 'Close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-5 min-h-0">
            {isDetailsLoading ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Receipt className="w-8 h-8 opacity-30 text-muted-foreground animate-pulse" />
                <p className="text-xs font-medium">{t('common.loading', 'Loading details...')}</p>
              </div>
            ) : fullSaleDetails ? (
              <div className="space-y-5">
                {/* Customer Info */}
                {(fullSaleDetails.customerName || fullSaleDetails.customerPhone) && (
                  <div className="bg-muted/30 p-3.5 rounded-xl border border-border/60 text-sm">
                    <h3 className="font-semibold mb-2 text-xs text-muted-foreground uppercase tracking-wider">{t('orders.table.customer', 'Customer')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {fullSaleDetails.customerName && (
                        <div>
                          <span className="text-muted-foreground mr-2">{t('common.name', 'Name')}:</span>
                          <span className="font-medium text-foreground">{fullSaleDetails.customerName}</span>
                        </div>
                      )}
                      {fullSaleDetails.customerPhone && (
                        <div>
                          <span className="text-muted-foreground mr-2">{t('common.phone', 'Phone')}:</span>
                          <span className="font-medium text-foreground font-mono">{fullSaleDetails.customerPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div>
                  <h3 className="font-semibold mb-2.5 text-xs text-muted-foreground uppercase tracking-wider">{t('directSales.itemsPurchased', 'Items Purchased')}</h3>
                  <div className="space-y-2 max-h-[35vh] overflow-y-auto custom-scrollbar pr-1">
                    {fullSaleDetails.lines?.map((line: any) => (
                      <div key={line.id} className="flex justify-between items-start text-sm bg-card border border-border/70 rounded-xl p-3 shadow-2xs">
                        <div>
                          <div className="font-medium flex items-center gap-1.5 flex-wrap">
                            <span>{getLocName(line.material)}</span>
                            {line.brandName && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold rounded border border-amber-500/30">
                                {line.brandName}
                              </span>
                            )}
                          </div>
                          <div className="text-muted-foreground text-xs mt-0.5">{line.quantity}x @ {formatCurrency(line.priceAtSaleTime)}</div>
                        </div>
                        <div className="font-semibold text-foreground">
                          {formatCurrency(Number(line.priceAtSaleTime) * Number(line.quantity))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-muted/30 p-4 rounded-xl border border-border/60 space-y-3">
                  {(() => {
                    const saleSubtotal = fullSaleDetails.subtotal !== undefined
                      ? Number(fullSaleDetails.subtotal)
                      : (fullSaleDetails.lines?.reduce((sum: number, line: any) =>
                          sum + (Number(line.priceAtSaleTime || 0) * Number(line.quantity || 0)), 0) || 0);
                    const saleDiscount = Number(fullSaleDetails.discountAmount || 0);
                    const saleTax = Number(fullSaleDetails.taxAmount || 0);
                    const grandTotal = getSaleTotal(fullSaleDetails);
                    const totalPaid = fullSaleDetails.payments?.reduce((s: number, p: any) => s + Number(p.amount || 0), 0) || 0;
                    const balanceDue = Math.max(0, grandTotal - totalPaid);

                    return (
                      <>
                        {(saleDiscount > 0 || saleTax > 0) && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{t('receipt.subtotal', 'Subtotal')}</span>
                            <span>{formatCurrency(saleSubtotal)}</span>
                          </div>
                        )}

                        {saleDiscount > 0 && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{t('orders.discount', 'Discount')}</span>
                            <span className="text-red-500 font-medium">-{formatCurrency(saleDiscount)}</span>
                          </div>
                        )}

                        {saleTax > 0 && (
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{t('receipt.vat', 'VAT (15%)')}</span>
                            <span>{formatCurrency(saleTax)}</span>
                          </div>
                        )}

                        <div className="flex justify-between text-sm font-semibold pt-1 border-t border-border/60">
                          <span>{t('receipt.totalAmount', 'Total Amount')}</span>
                          <span className="font-bold text-foreground text-base">{formatCurrency(grandTotal)}</span>
                        </div>

                        {fullSaleDetails.payments?.length > 0 && (
                          <div className="pt-2 border-t border-border/60">
                            <h3 className="font-semibold mb-2 text-xs text-muted-foreground uppercase tracking-wider">{t('receipt.paymentsRecorded', 'Payments Recorded')}</h3>
                            <div className="space-y-2">
                              {fullSaleDetails.payments.map((p: any) => (
                                <div key={p.id} className="flex justify-between text-sm items-center">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-background border border-border/60 rounded text-xs font-medium">
                                      {formatPaymentMethod(p.method)}
                                    </span>
                                    {p.methodDetails && (
                                      <span className="text-xs text-muted-foreground" title={p.methodDetails}>
                                        {t('orders.referenceNumber', 'Ref')}: {p.methodDetails.length > 15 ? p.methodDetails.slice(0, 15) + '...' : p.methodDetails}
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-medium text-foreground">{formatCurrency(p.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-3 border-t border-border/60 mt-3">
                          <span className="font-bold text-foreground">{t('receipt.totalPaid', 'Amount Paid')}</span>
                          <span className="text-xl font-bold text-primary">
                            {formatCurrency(totalPaid)}
                          </span>
                        </div>

                        {balanceDue > 0 && (
                          <div className="flex justify-between items-center text-sm font-semibold text-amber-600 dark:text-amber-400">
                            <span>{t('receipt.balanceDue', 'Balance Due')}</span>
                            <span>{formatCurrency(balanceDue)}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-red-500">{t('common.failedToLoad', 'Failed to load details')}</div>
            )}
          </div>

          {/* Docked Footer */}
          <div className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20 shrink-0 flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setSelectedSale(null)} className="rounded-xl">
              {t('common.close', 'Close')}
            </Button>
            {fullSaleDetails?.paymentStatus === 'PAID' ? (
              <Button
                onClick={() => fullSaleDetails && printDirectSaleReceipt(fullSaleDetails)}
                className="rounded-xl"
                disabled={isDetailsLoading || !fullSaleDetails}
              >
                <Printer className="w-4 h-4 mr-2" /> {t('receipt.receipt', 'Print Receipt')}
              </Button>
            ) : (
              <Button
                onClick={() => navigate(`/direct-sales?editId=${selectedSale?.id}`)}
                className="rounded-xl"
                disabled={isDetailsLoading || !fullSaleDetails}
              >
                {t('directSales.editSale', 'Edit Sale / Add Payment')}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 2. FSR Update Bottom Sheet */}
      <Sheet open={isFsrModalOpen} onOpenChange={setIsFsrModalOpen}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl sm:rounded-t-3xl min-h-[40dvh] max-h-[85dvh] border-t sm:border-x border-border bg-card shadow-2xl p-0 overflow-hidden flex flex-col w-full inset-x-0 sm:max-w-md sm:mx-auto gap-0 focus:outline-none z-[300]"
        >
          <SheetTitle className="sr-only">
            {t('orders.updateFsr', 'Update FSR Number')}
          </SheetTitle>

          {/* Drag Handle Indicator */}
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

          {/* Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between border-b border-border/60 bg-muted/20 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-heading text-base font-bold text-foreground truncate">
                  {t('orders.updateFsr', 'Update FSR Number')}
                </h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {t('orders.fsrAuditReference', 'Fiscal Sales Receipt (FSR) paper audit reference number.')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFsrModalOpen(false)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer shrink-0 ml-2"
              title={t('common.close', 'Close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4 min-h-0">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('orders.fsrNumber', 'FSR Number')}
              </label>
              <ModernInput
                icon={Receipt}
                inputSize="default"
                placeholder={t('orders.create.fsrPlaceholder', 'e.g. FSR-00123')}
                value={fsrInputValue}
                onChange={(e) => setFsrInputValue(e.target.value)}
                className="font-mono tracking-wider font-semibold uppercase text-base sm:text-sm"
                autoFocus
              />
            </div>
            {fsrSaleTarget?.fsrNumber && (
              <p className="text-xs text-muted-foreground flex items-center justify-between">
                <span>{t('orders.detail.currentFsr', 'Current')}: <span className="font-mono font-semibold text-foreground">{fsrSaleTarget.fsrNumber}</span></span>
                <button
                  type="button"
                  onClick={() => setFsrInputValue('')}
                  className="text-red-500 hover:underline text-xs cursor-pointer font-medium"
                >
                  {t('common.clear', 'Clear')}
                </button>
              </p>
            )}
          </div>

          {/* Docked Footer */}
          <div className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20 shrink-0 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsFsrModalOpen(false)}
              disabled={updateFsrMutation.isPending}
              className="rounded-xl"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <div className="flex items-center gap-2">
              {fsrSaleTarget?.fsrNumber && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    if (fsrSaleTarget) {
                      updateFsrMutation.mutate({ id: fsrSaleTarget.id, newFsr: '' });
                    }
                  }}
                  disabled={updateFsrMutation.isPending}
                  className="rounded-xl"
                >
                  {t('common.remove', 'Remove')}
                </Button>
              )}
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                onClick={() => {
                  if (fsrSaleTarget) {
                    updateFsrMutation.mutate({ id: fsrSaleTarget.id, newFsr: fsrInputValue });
                  }
                }}
                disabled={updateFsrMutation.isPending}
              >
                {updateFsrMutation.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}


