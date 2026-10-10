import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Timer, CheckCircle2, PackageCheck, XCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { toast } from 'sonner';

interface UpdateOrderStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  currentStatus: string;
  onSuccess: () => void;
}

export function UpdateOrderStatusDialog({ isOpen, onClose, orderId, currentStatus, onSuccess }: UpdateOrderStatusDialogProps) {
  const { t } = useTranslation();
  const [statusForm, setStatusForm] = useState({ status: '', notes: '' });

  useEffect(() => {
    if (isOpen) {
      setStatusForm({ status: currentStatus || 'OPEN', notes: '' });
    }
  }, [isOpen, currentStatus]);

  const updateStatusMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/orders/${orderId}/status`, statusForm);
    },
    onSuccess: () => {
      onSuccess();
      onClose();
      toast.success(t('alerts.statusUpdated'));
    },
    onError: (err: any) => toast.error(err.response?.data?.error?.message || t('alerts.error'))
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#161616] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white">
        <DialogHeader>
          <DialogTitle>{t('orders.updateStatus')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>{t('orders.table.status')}</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'IN_PROGRESS', label: t('status.inProgress'), icon: Timer, activeClass: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/50' },
                { value: 'COMPLETED', label: t('status.completed'), icon: CheckCircle2, activeClass: 'bg-purple-500/10 border-purple-500/30 text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/50' },
                { value: 'DELIVERED', label: t('status.delivered'), icon: PackageCheck, activeClass: 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400 ring-1 ring-green-500/50' },
                { value: 'CANCELLED', label: t('status.cancelled'), icon: XCircle, activeClass: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400 ring-1 ring-red-500/50' }
              ].map(s => {
                const Icon = s.icon;
                const isSelected = statusForm.status === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatusForm({ ...statusForm, status: s.value })}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
                      isSelected 
                        ? s.activeClass
                        : 'border-gray-200 dark:border-gray-800 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-center leading-tight">
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <Label>{t('common.notesOptional')}</Label>
            <textarea 
              value={statusForm.notes} 
              onChange={e => setStatusForm({ ...statusForm, notes: e.target.value })}
              placeholder={t('orders.notesPlaceholder')}
              className="flex min-h-[80px] w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>
        <DialogFooter className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
          <Button variant="outline" onClick={onClose} className="border-gray-200 dark:border-gray-800 rounded-xl">{t('common.cancel')}</Button>
          <Button onClick={() => updateStatusMutation.mutate()} disabled={updateStatusMutation.isPending} className="rounded-xl">{t('orders.saveStatus')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
