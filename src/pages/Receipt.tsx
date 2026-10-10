import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { format } from 'date-fns';
import { Button } from '../components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import { formatCurrency, formatStatus, formatPaymentMethod } from '../lib/utils';
import { formatPlateNumber } from '../utils/plate';
import { printOrderReceipt, generateBarcodeSvg } from '../lib/receipt-printer';

export default function Receipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const getLocMaterialName = (item: any) =>
    i18n?.language === 'am' && item?.nameAm ? item.nameAm : (item?.nameEn || item?.name || t('receipt.material', 'Material'));

  const getLocServiceName = (sl: any) => {
    if (i18n?.language === 'am') {
      return sl?.serviceCategory?.service?.nameAm || sl?.serviceCategory?.nameAm || sl?.serviceCategory?.service?.nameEn || sl?.serviceCategory?.nameEn || t('receipt.service', 'Service');
    }
    return sl?.serviceCategory?.service?.nameEn || sl?.serviceCategory?.nameEn || t('receipt.service', 'Service');
  };

  const getLocCategoryTier = (sl: any) => {
    if (i18n?.language === 'am' && sl?.serviceCategory?.nameAm) {
      return sl.serviceCategory.nameAm;
    }
    return sl?.serviceCategory?.nameEn || '';
  };

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get(`/orders/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500 animate-pulse font-medium">{t('receipt.loadingReceipt', 'Loading receipt...')}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col h-64 items-center justify-center gap-4">
        <div className="text-red-500 font-semibold text-lg">{t('orders.detail.notFound', 'Order not found')}</div>
        <Button onClick={() => navigate('/orders')}>{t('orders.detail.return', 'Return to Orders')}</Button>
      </div>
    );
  }

  const handlePrint = () => {
    printOrderReceipt(order);
  };

  const subtotal = order.totalPrice || (
    (order.serviceLines || []).reduce((s: number, l: any) => s + Number(l.priceAtOrderTime || 0), 0) +
    (order.standaloneLines || []).reduce((s: number, l: any) => s + (Number(l.priceAtOrderTime || 0) * Number(l.quantity || 1)), 0) +
    (order.additionalCharges || []).reduce((s: number, l: any) => s + Number(l.price || l.amount || 0), 0)
  );

  const discountAmount = Number(order.totalDiscount || order.discountAmount || 0);
  const taxAmount = Number(order.taxAmount || 0);
  const netTotal = Number(order.netPrice || (subtotal - discountAmount + taxAmount));
  const totalPaid = (order.payments || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const balanceDue = Number(order.balanceDue !== undefined ? order.balanceDue : (netTotal - totalPaid));
  const isFullyPaid = balanceDue <= 0 && totalPaid > 0;

  const customerName = order.customer?.name || t('receipt.walkInCustomer', 'Walk-in Client');
  const customerPhone = order.customer?.phoneNumber || order.customer?.phone || '';
  const vehiclePlate = order.vehicle ? formatPlateNumber(order.vehicle.plateNumber) : '';
  const vehicleModel = order.vehicle?.carModel ? `${[order.vehicle.carModel?.brand?.name, order.vehicle.carModel?.name].filter(Boolean).join(' ')}` : '';
  const formattedDate = order.orderDateTime ? format(new Date(order.orderDateTime), 'MMMM dd, yyyy • h:mm a') : 'N/A';

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-[#0c0c0c]">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Navigation & Print Controls */}
        <div className="flex justify-between items-center print:hidden">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)} 
            className="border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> {t('common.back', 'Back')}
          </Button>
          <Button 
            onClick={handlePrint} 
            className="bg-primary text-white hover:bg-primary/90 rounded-xl shadow-md gap-2"
          >
            <Printer className="w-4 h-4" /> {t('orders.printInvoice', 'Print A4 Invoice')}
          </Button>
        </div>

        {/* A4 Paper Card Preview */}
        <div className="bg-white text-gray-900 p-4 sm:p-6 md:p-8 rounded-2xl shadow-xl border border-gray-200/90 relative overflow-hidden min-h-[850px] flex flex-col justify-between">
          
          {/* Large Watermark Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.07] z-20">
            <img src="/logo.png" alt="Watermark" className="w-[520px] max-w-[85%] object-contain" />
          </div>

          <div className="relative z-10 flex-1 flex flex-col justify-between space-y-6">
            
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-gray-200 pb-5 gap-4">
              <div className="flex items-center gap-4">
                <img src="/logo.png" alt="Logo" className="h-16 w-auto object-contain" />
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-gray-900 uppercase leading-tight">
                    {t('receipt.companyName', 'Yonatan Car Decoration & Upholstery')}
                  </h1>
                  <p className="text-xs text-gray-600">
                    {t('receipt.companySubtitle', 'Premium Auto Customization, Upholstery & Accessories')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t('receipt.companyAddress', 'Addis Ababa, Ethiopia • www.yonatanupholstery.com')}
                  </p>
                </div>
              </div>
              <div className="sm:text-right">
                <span className="inline-block bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider mb-1">
                  {t('receipt.workOrderInvoice', 'Work Order Invoice')}
                </span>
                <div className="text-lg font-extrabold font-mono text-gray-900">
                  #{order.orderNumber}
                </div>
                <div className="text-xs text-gray-500">
                  {formattedDate}
                </div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50/80 border border-gray-200 rounded-xl p-4">
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  {t('receipt.billedTo', 'Customer / Billed To')}
                </div>
                <div className="text-sm font-bold text-gray-900">{customerName}</div>
                {customerPhone && <div className="text-xs text-gray-600 mt-0.5">📞 {customerPhone}</div>}
              </div>

              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  {t('receipt.vehicleDetails', 'Vehicle Details')}
                </div>
                {vehiclePlate ? (
                  <>
                    <div className="text-sm font-bold text-gray-900">{vehicleModel || t('common.vehicle', 'Vehicle')}</div>
                    <div className="text-xs text-gray-600 font-mono font-semibold mt-0.5">
                      {t('receipt.plateLabel', 'Plate:')} {vehiclePlate}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-gray-400 italic">{t('receipt.noVehicle', 'No vehicle attached')}</div>
                )}
              </div>

              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  {t('receipt.paymentStatus', 'Payment Status')}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-md ${
                    isFullyPaid ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {formatStatus(order.paymentStatus || 'UNPAID')}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {t('receipt.orderStatus', 'Order Status')}: <strong>{formatStatus(order.orderStatus || 'OPEN')}</strong>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-gray-100 border-t border-b-2 border-gray-300">
                    <th className="py-2.5 px-3 font-bold text-xs text-gray-700 uppercase tracking-wider text-center w-8">#</th>
                    <th className="py-2.5 px-3 font-bold text-xs text-gray-700 uppercase tracking-wider">
                      {t('receipt.itemDescription', 'Description')}
                    </th>
                    <th className="py-2.5 px-3 font-bold text-xs text-gray-700 uppercase tracking-wider text-center w-20">
                      {t('receipt.type', 'Type')}
                    </th>
                    <th className="py-2.5 px-3 font-bold text-xs text-gray-700 uppercase tracking-wider text-center w-12">
                      {t('receipt.qty', 'Qty')}
                    </th>
                    <th className="py-2.5 px-3 font-bold text-xs text-gray-700 uppercase tracking-wider text-right w-24">
                      {t('receipt.unitPrice', 'Unit Price')}
                    </th>
                    <th className="py-2.5 px-3 font-bold text-xs text-gray-700 uppercase tracking-wider text-right w-28">
                      {t('receipt.totalAmount', 'Total Amount')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.serviceLines?.map((sl: any, idx: number) => {
                    const realServiceName = getLocServiceName(sl);
                    const categoryTier = getLocCategoryTier(sl);
                    const unitPrice = Number(sl.priceAtOrderTime || 0);
                    const discount = Number(sl.discount || 0);
                    const lineTotal = unitPrice - discount;
                    return (
                      <tr key={sl.id} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 text-center text-gray-500 font-semibold text-xs">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-gray-900">{realServiceName}</div>
                          {categoryTier && <div className="text-xs text-gray-500">{t('common.category', 'Category')}: {categoryTier}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            {t('receipt.service', 'Service')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold">1</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(unitPrice)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {formatCurrency(lineTotal)}
                          {discount > 0 && <div className="text-[11px] text-red-600 font-normal">(-{formatCurrency(discount)})</div>}
                        </td>
                      </tr>
                    );
                  })}

                  {order.standaloneLines?.map((ml: any, idx: number) => {
                    const offset = (order.serviceLines?.length || 0);
                    const unitPrice = Number(ml.priceAtOrderTime || 0);
                    const qty = Number(ml.quantity || 1);
                    const discount = Number(ml.discount || 0);
                    const lineTotal = (unitPrice * qty) - discount;
                    return (
                      <tr key={ml.id} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 text-center text-gray-500 font-semibold text-xs">{offset + idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-gray-900">{getLocMaterialName(ml.material)}</div>
                          <div className="text-xs text-gray-500">{t('receipt.standaloneMaterial', 'Standalone Material')}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            {t('receipt.material', 'Material')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold">{qty}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(unitPrice)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          {formatCurrency(lineTotal)}
                          {discount > 0 && <div className="text-[11px] text-red-600 font-normal">(-{formatCurrency(discount)})</div>}
                        </td>
                      </tr>
                    );
                  })}

                  {order.additionalCharges?.map((ac: any, idx: number) => {
                    const offset = (order.serviceLines?.length || 0) + (order.standaloneLines?.length || 0);
                    const lineTotal = Number(ac.price || ac.amount || 0);
                    return (
                      <tr key={ac.id} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 text-center text-gray-500 font-semibold text-xs">{offset + idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-gray-900">{ac.name || ac.description || t('receipt.charge', 'Additional Charge')}</div>
                          <div className="text-xs text-gray-500">{t('receipt.customSurcharge', 'Custom Surcharge')}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                            {t('receipt.charge', 'Charge')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-semibold">1</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(lineTotal)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">{formatCurrency(lineTotal)}</td>
                      </tr>
                    );
                  })}

                  {(!order.serviceLines?.length && !order.standaloneLines?.length && !order.additionalCharges?.length) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                        {t('receipt.noItemsOrder', 'No items or services in this order')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary & Totals Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
                <div className="text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-100 pb-2">
                  {t('receipt.paymentHistory', 'Payment History & Warranty')}
                </div>
                {order.payments && order.payments.length > 0 ? (
                  <div className="space-y-2">
                    {order.payments.map((p: any) => (
                      <div key={p.id} className="flex justify-between items-center text-xs">
                        <div>
                          <span className="font-semibold text-gray-900">
                            {formatPaymentMethod(p.method)}
                          </span>
                          {p.methodDetails && <span className="text-gray-500"> ({p.methodDetails})</span>}
                          {p.paidAt && <div className="text-[10px] text-gray-400">{format(new Date(p.paidAt), 'MMM d, yyyy • h:mm a')}</div>}
                        </div>
                        <span className="font-bold text-emerald-600 font-mono">+{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic">{t('receipt.noPaymentRecorded', 'No payments recorded yet.')}</div>
                )}
                <div className="border-t border-dashed border-gray-200 pt-3 text-[11px] text-gray-500 leading-relaxed">
                  <strong className="text-gray-700">{t('receipt.qualityGuarantee', 'Quality Guarantee')}:</strong> {t('receipt.guaranteeDesc', 'All craftsmanship, leather tailoring, and vehicle accessories are backed by Yonatan Car Decor.')}
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/80 space-y-2.5">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{t('receipt.subtotal', 'Gross Subtotal')}</span>
                  <span className="font-semibold text-gray-900 font-mono">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>{t('receipt.discount', 'Total Discount')}</span>
                    <span className="font-semibold font-mono">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{t('receipt.vat', 'VAT (15%)')}</span>
                    <span className="font-semibold text-gray-900 font-mono">+{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="border-t-2 border-gray-300 pt-2 flex justify-between items-baseline">
                  <span className="font-extrabold text-base text-gray-900 uppercase">{t('receipt.netTotal', 'Net Total')}</span>
                  <span className="font-extrabold text-xl text-gray-900 font-mono">{formatCurrency(netTotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-emerald-600 pt-1">
                  <span>{t('receipt.totalPaid', 'Amount Paid')}</span>
                  <span className="font-bold font-mono">{formatCurrency(totalPaid)}</span>
                </div>
                {balanceDue > 0 ? (
                  <div className="border-t border-dashed border-red-200 pt-2 flex justify-between text-sm font-extrabold text-red-600">
                    <span>{t('receipt.balanceDue', 'Balance Due')}</span>
                    <span className="font-mono">{formatCurrency(balanceDue)}</span>
                  </div>
                ) : (
                  <div className="border-t border-dashed border-emerald-200 pt-2 flex justify-between text-xs font-bold text-emerald-700">
                    <span>{t('receipt.settlement', 'Settlement')}</span>
                    <span>{t('receipt.fullySettled', 'FULLY SETTLED')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Barcode */}
            <div className="text-center border-t border-gray-200 pt-4 mt-auto">
              <div 
                className="flex justify-center mb-1"
                dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(order.orderNumber) }}
              />
              <div className="font-mono text-xs font-bold text-gray-700 tracking-wider">
                {order.orderNumber}
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                {t('receipt.footer', 'Official Work Order Invoice • Yonatan Car Decoration & Upholstery')}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

