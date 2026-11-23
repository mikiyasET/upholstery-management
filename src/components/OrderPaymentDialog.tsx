import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@mantine/hooks';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Banknote, Landmark, CreditCard, Smartphone, Sparkles, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const isMobileOrTablet = useMediaQuery('(max-width: 74.99em)');
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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

  const formFields = (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label className="text-muted-foreground">{t('orders.amountPaid')}</Label>
          {targetAutofillAmount > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {isUnpaid ? t('orders.fullTotal') : t('orders.due')}{' '}
              <strong className="text-foreground font-semibold">{formatCurrency(targetAutofillAmount)}</strong>
            </span>
          )}
        </div>
        <div className="relative flex items-center">
          <span className="absolute left-4 text-muted-foreground font-bold text-sm pointer-events-none select-none">
            ETB
          </span>
          <Input 
            type="text" 
            value={paymentForm.amount} 
            onChange={e => setPaymentForm({ ...paymentForm, amount: formatInputNumber(e.target.value) })}
            placeholder="0.00"
            className="pl-14 pr-28 text-xl font-bold h-14 border-border rounded-xl bg-background text-foreground focus-visible:ring-primary"
            autoFocus={!isMobileOrTablet}
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
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                  isSelected 
                    ? 'bg-primary/10 border-primary/30 text-primary ring-1 ring-primary/50'
                    : 'border-border bg-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground'
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
            className="h-12 border-border rounded-xl bg-background focus-visible:ring-primary"
          />
        </div>
      )}
    </div>
  );

  if (isMobileOrTablet) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="rounded-t-2xl sm:rounded-t-3xl min-h-[50dvh] max-h-[90dvh] border-t border-border bg-card shadow-2xl p-0 overflow-hidden flex flex-col w-full inset-x-0 max-w-none gap-0 focus:outline-none"
        >
          <SheetTitle className="sr-only">{t('orders.actions.addPayment')}</SheetTitle>
          <SheetDescription className="sr-only">{t('orders.amountPaid')}</SheetDescription>

          {/* Drag Handle Indicator */}
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-2.5 mb-1 shrink-0" />

          {/* Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between border-b border-border/60 bg-muted/20 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-heading text-base sm:text-lg font-bold text-foreground truncate">
                  {t('orders.actions.addPayment')}
                </h3>
                {targetAutofillAmount > 0 && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {isUnpaid ? t('orders.fullTotal') : t('orders.due')}:{' '}
                    <strong className="text-foreground font-semibold">{formatCurrency(targetAutofillAmount)}</strong>
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer"
              title={t('common.close', 'Close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 min-h-0">
            {formFields}
          </div>

          {/* Docked Footer */}
          <div className="p-3.5 sm:p-5 border-t border-border/60 bg-muted/20 shrink-0 flex items-center justify-end gap-3 sm:gap-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl flex-1 sm:flex-initial"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => addPaymentMutation.mutate()}
              disabled={addPaymentMutation.isPending || !paymentForm.amount || parseInputNumber(paymentForm.amount) <= 0}
              className="rounded-xl flex-1 sm:flex-initial font-semibold"
            >
              {addPaymentMutation.isPending ? t('common.saving') : t('orders.actions.addPayment')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => { if (!open) onClose(); }}
      hasUnsavedChanges={Boolean(paymentForm.amount || paymentForm.referenceNumber)}
    >
      <DialogContent className="sm:max-w-[425px] bg-card border border-border text-foreground">
        <DialogHeader>
          <DialogTitle>{t('orders.actions.addPayment')}</DialogTitle>
        </DialogHeader>
        <div className="pt-2">
          {formFields}
        </div>
        <DialogFooter className="mt-4 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose} className="rounded-xl">{t('common.cancel')}</Button>
          <Button 
            onClick={() => addPaymentMutation.mutate()} 
            disabled={addPaymentMutation.isPending || !paymentForm.amount || parseInputNumber(paymentForm.amount) <= 0} 
            className="rounded-xl font-semibold"
          >
            {addPaymentMutation.isPending ? t('common.saving') : t('orders.actions.addPayment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
