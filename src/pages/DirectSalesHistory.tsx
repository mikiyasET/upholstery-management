import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Calendar, FileText, Printer, Eye } from 'lucide-react';
import { TableSearch } from '../components/DataTable';
import { formatCurrency, formatStatus, formatPaymentMethod, formatAppDate } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { printDirectSaleReceipt } from '../lib/receipt-printer';
import { PageHeader, ExecutiveAddButton, TablePagination } from '../components/common';
import { ActionIcon, Tooltip } from '@mantine/core';

export default function DirectSalesHistory() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  const filteredSales = sales.filter((s: any) => 
    (s.saleNumber && s.saleNumber.toLowerCase().includes(searchTerm.toLowerCase())) || 
    (s.customerName && s.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.customerPhone && s.customerPhone.includes(searchTerm))
  );

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-300 pb-8">
      {/* 1. Executive PageHeader */}
      <PageHeader
        title={t('directSales.history', 'Direct Sales History')}
        subtitle={t('directSales.historySubtitle', 'View past walk-in sales and reprint receipts.')}
        badge={sales ? `${sales.length} Sales` : undefined}
        backTo="/direct-sales"
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

      {/* 2. Search & Filter Bar */}
      <div className="bg-card p-3 rounded-xl border border-border shadow-sm flex items-center justify-between">
        <TableSearch 
          placeholder={t('directSales.searchHistoryPlaceholder', 'Search by receipt # or customer...')} 
          className="w-full sm:w-[480px]"
          value={searchTerm}
          onChange={(val) => {
            setSearchTerm(val);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-semibold">{t('receipt.receiptNumber', 'Receipt #')}</th>
                <th className="px-6 py-4 font-semibold">{t('orders.table.customer', 'Customer')}</th>
                <th className="px-6 py-4 font-semibold">{t('receipt.cashier', 'Cashier')}</th>
                <th className="px-6 py-4 font-semibold">{t('receipt.totalAmount', 'Total Amount')}</th>
                <th className="px-6 py-4 font-semibold text-center">{t('orders.detail.materialsParts', 'Items')}</th>
                <th className="px-6 py-4 font-semibold">{t('common.dateTime', 'Date & Time')}</th>
                <th className="px-6 py-4 font-semibold">{t('common.status', 'Status')}</th>
                <th className="px-6 py-4 font-semibold text-right">{t('common.actions', 'Actions')}</th>
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
                  <td colSpan={7} className="px-6 py-20 text-center text-muted-foreground">
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
                    <td className="px-6 py-4 font-medium text-foreground">
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        {sale.saleNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4 text-foreground/80 font-medium">
                      {sale.createdBy?.name || '-'}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {formatCurrency(sale.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-center font-medium">
                      {sale._count?.lines || 0}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-foreground/80">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {formatAppDate(sale.saleDateTime, true)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
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
      </div>

      {/* Sale Details Modal */}
      <Dialog open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-4">
              <span>{t('receipt.receipt', 'Receipt')} #{selectedSale?.saleNumber}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {selectedSale && formatAppDate(selectedSale.saleDateTime, true)}
              </span>
            </DialogTitle>
          </DialogHeader>

          {isDetailsLoading ? (
            <div className="py-8 text-center text-muted-foreground">{t('common.loading', 'Loading details...')}</div>
          ) : fullSaleDetails ? (
            <div className="space-y-6">
              {/* Customer Info */}
              {(fullSaleDetails.customerName || fullSaleDetails.customerPhone) && (
                <div className="bg-muted/30 p-3 rounded-lg border text-sm">
                  <h3 className="font-semibold mb-2 text-xs text-muted-foreground uppercase tracking-wider">{t('orders.table.customer', 'Customer')}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {fullSaleDetails.customerName && (
                      <div>
                        <span className="text-muted-foreground mr-2">{t('common.name', 'Name')}:</span>
                        <span className="font-medium">{fullSaleDetails.customerName}</span>
                      </div>
                    )}
                    {fullSaleDetails.customerPhone && (
                      <div>
                        <span className="text-muted-foreground mr-2">{t('common.phone', 'Phone')}:</span>
                        <span className="font-medium">{fullSaleDetails.customerPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-3 text-xs text-muted-foreground uppercase tracking-wider">{t('directSales.itemsPurchased', 'Items Purchased')}</h3>
                <div className="space-y-2 max-h-[30vh] overflow-y-auto custom-scrollbar pr-1">
                  {fullSaleDetails.lines?.map((line: any) => (
                    <div key={line.id} className="flex justify-between items-start text-sm bg-card border rounded-lg p-3">
                      <div>
                        <div className="font-medium flex items-center gap-1.5 flex-wrap">
                          <span>{getLocName(line.material)}</span>
                          {line.brandName && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold rounded border border-amber-500/30">
                              {line.brandName}
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground text-xs">{line.quantity}x @ {formatCurrency(line.priceAtSaleTime)}</div>
                      </div>
                      <div className="font-semibold">
                        {formatCurrency(Number(line.priceAtSaleTime) * Number(line.quantity))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Summary */}
              <div className="bg-muted/30 p-4 rounded-lg border space-y-3">
                {Number(fullSaleDetails.taxAmount) > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t('receipt.vat', 'VAT (15%)')}</span>
                    <span>{formatCurrency(fullSaleDetails.taxAmount)}</span>
                  </div>
                )}
                
                {fullSaleDetails.payments?.length > 0 && (
                  <div className="pt-2 border-t">
                    <h3 className="font-semibold mb-2 text-xs text-muted-foreground uppercase tracking-wider">{t('receipt.paymentsRecorded', 'Payments Recorded')}</h3>
                    <div className="space-y-2">
                      {fullSaleDetails.payments.map((p: any) => (
                        <div key={p.id} className="flex justify-between text-sm items-center">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-background border rounded text-xs font-medium">
                              {formatPaymentMethod(p.method)}
                            </span>
                            {p.methodDetails && (
                              <span className="text-xs text-muted-foreground" title={p.methodDetails}>
                                {t('orders.referenceNumber', 'Ref')}: {p.methodDetails.length > 15 ? p.methodDetails.slice(0, 15) + '...' : p.methodDetails}
                              </span>
                            )}
                          </div>
                          <span className="font-medium">{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-3 border-t mt-3">
                  <span className="font-bold">{t('receipt.totalPaid', 'Amount Paid')}</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(fullSaleDetails.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0)}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-red-500">{t('common.failedToLoad', 'Failed to load details')}</div>
          )}

          <DialogFooter className="sm:justify-between border-t pt-4 mt-2">
            <Button variant="outline" onClick={() => setSelectedSale(null)}>{t('common.close', 'Close')}</Button>
            {fullSaleDetails?.paymentStatus === 'PAID' ? (
              <Button 
                onClick={() => fullSaleDetails && printDirectSaleReceipt(fullSaleDetails)} 
                className="bg-amber-600 text-white hover:bg-amber-700 font-semibold shadow-sm"
                disabled={isDetailsLoading || !fullSaleDetails}
              >
                <Printer className="w-4 h-4 mr-2" /> {t('receipt.receipt', 'Print Receipt')}
              </Button>
            ) : (
              <Button 
                onClick={() => navigate(`/direct-sales?editId=${selectedSale?.id}`)}
                className="bg-amber-600 text-white hover:bg-amber-700 font-semibold shadow-sm"
                disabled={isDetailsLoading || !fullSaleDetails}
              >
                {t('directSales.editSale', 'Edit Sale / Add Payment')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


