import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Banknote, Landmark, CreditCard, Smartphone, Sparkles } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { toast } from 'sonner';
import { formatInputNumber, parseInputNumber, formatCurrency } from '../lib/utils';

interface OrderPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  onSuccess: () => void;
  balanceDue?: number;
  totalPaid?: number;
  netTotal?: number;
}

export function OrderPaymentDialog({ 
  isOpen, 
  onClose, 
  orderId, 
  onSuccess,
  balanceDue: initialBalanceDue,
  totalPaid: initialTotalPaid,
  netTotal: initialNetTotal
}: OrderPaymentDialogProps) {
  const { t } = useTranslation();
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'CASH', referenceNumber: '' });

  // If metrics are not passed in directly, fetch the order data
  const { data: orderData } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const res = await api.get(`/orders/${orderId}`);
      return res.data;
    },
    enabled: isOpen && !!orderId && (initialBalanceDue === undefined || initialTotalPaid === undefined),
  });

  const balanceDue = initialBalanceDue !== undefined 
    ? initialBalanceDue 
    : (orderData?.balanceDue !== undefined ? Number(orderData.balanceDue) : 0);

  const totalPaid = initialTotalPaid !== undefined 
    ? initialTotalPaid 
    : (orderData?.totalPaid !== undefined ? Number(orderData.totalPaid) : 0);

  const netTotal = initialNetTotal !== undefined 
    ? initialNetTotal 
    : (orderData?.netPrice !== undefined ? Number(orderData.netPrice) : (orderData?.totalPrice !== undefined ? Number(orderData.totalPrice) : 0));

  const isUnpaid = totalPaid <= 0;
  const autofillLabel = isUnpaid ? t('common.all') : t('common.remaining');
  const targetAutofillAmount = isUnpaid ? (netTotal > 0 ? netTotal : balanceDue) : balanceDue;

  const handleAutofill = () => {
    if (targetAutofillAmount > 0) {
      setPaymentForm(prev => ({
        ...prev,
        amount: formatInputNumber(targetAutofillAmount.toString()),
      }));
    }
  };

  useEffect(() => {
    if (isOpen) {
      setPaymentForm({ amount: '', method: 'CASH', referenceNumber: '' });
    }
  }, [isOpen]);

  const addPaymentMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/orders/${orderId}/payments`, {
        ...paymentForm,
        amount: parseInputNumber(paymentForm.amount)
      });
    },
    onSuccess: () => {
      onSuccess();
      onClose();
      toast.success(t('alerts.paymentAdded'));
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || t('alerts.error'))
  });

  const paymentMethods = [
    { value: 'CASH', label: t('payment.cash'), icon: Banknote },
    { value: 'BANK_TRANSFER', label: t('payment.bank'), icon: Landmark },
    { value: 'CARD', label: t('payment.card'), icon: CreditCard },
    { value: 'MOBILE_MONEY', label: t('payment.mobile'), icon: Smartphone }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white">
        <DialogHeader>
          <DialogTitle>{t('orders.actions.addPayment')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-gray-500 dark:text-gray-400">{t('orders.amountPaid')}</Label>
              {targetAutofillAmount > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {isUnpaid ? t('orders.fullTotal') : t('orders.due')}{' '}
                  <strong className="text-gray-900 dark:text-gray-100 font-semibold">{formatCurrency(targetAutofillAmount)}</strong>
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-gray-500 font-bold text-sm pointer-events-none select-none">
                ETB
              </span>
              <Input 
                type="text" 
                value={paymentForm.amount} 
                onChange={e => setPaymentForm({ ...paymentForm, amount: formatInputNumber(e.target.value) })}
                placeholder="0.00"
                className="pl-14 pr-28 text-xl font-bold h-14 border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900 focus-visible:ring-primary"
              />
              {targetAutofillAmount > 0 && (
                <button
                  type="button"
                  onClick={handleAutofill}
                  title={isUnpaid ? `Fill full amount (${formatCurrency(targetAutofillAmount)})` : `Fill remaining balance (${formatCurrency(targetAutofillAmount)})`}
                  className="absolute right-3 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-all hover:scale-105 active:scale-95 shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{autofillLabel}</span>
                </button>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-gray-500 dark:text-gray-400">{t('orders.paymentMethod')}</Label>
            <div className="grid grid-cols-4 gap-2">
              {paymentMethods.map(m => {
                const Icon = m.icon;
                const isSelected = paymentForm.method === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, method: m.value })}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
                      isSelected 
                        ? 'bg-primary/10 border-primary/30 text-primary ring-1 ring-primary/50'
                        : 'border-gray-200 dark:border-gray-800 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-center leading-tight">
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {paymentForm.method !== 'CASH' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label className="text-gray-500 dark:text-gray-400">{t('orders.referenceNumber')}</Label>
              <Input 
                value={paymentForm.referenceNumber} 
                onChange={e => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                placeholder={t('orders.referencePlaceholder')}
                className="h-12 border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900 focus-visible:ring-primary"
              />
            </div>
          )}
        </div>
        <DialogFooter className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
          <Button variant="outline" onClick={onClose} className="border-gray-200 dark:border-gray-800 rounded-xl">{t('common.cancel')}</Button>
          <Button 
            onClick={() => addPaymentMutation.mutate()} 
            disabled={addPaymentMutation.isPending || !paymentForm.amount || parseInputNumber(paymentForm.amount) <= 0} 
            className="rounded-xl"
          >
            {t('orders.actions.addPayment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
