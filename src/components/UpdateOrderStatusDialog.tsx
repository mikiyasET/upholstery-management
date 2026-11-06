import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { Button } from '@mantine/core';
import { 
  Timer, 
  CheckCircle2, 
  PackageCheck, 
  XCircle, 
  ClipboardCheck, 
  Check, 
  ArrowRight, 
  Activity 
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { toast } from 'sonner';
import { formatStatus } from '../lib/utils';

interface UpdateOrderStatusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  currentStatus: string;
  onSuccess: () => void;
}

export function UpdateOrderStatusDialog({
  isOpen,
  onClose,
  orderId,
  currentStatus,
  onSuccess,
}: UpdateOrderStatusDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      await queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      await queryClient.invalidateQueries({ queryKey: ['active-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['reports'] });
      onSuccess();
      onClose();
      toast.success(t('alerts.statusUpdated'));
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error?.message || t('alerts.error')),
  });

  const TIMELINE_STEPS = [
    {
      value: 'OPEN',
      step: 1,
      label: t('orders.status.open', 'Open'),
      shortLabel: 'Intake',
      description: t('orders.timeline.openDesc', 'Intake completed, order registered & waiting for workshop bay'),
      icon: ClipboardCheck,
      activeBorder: 'border-sky-500/60 dark:border-sky-500/70',
      activeBg: 'bg-sky-500/10 dark:bg-sky-950/30',
      ring: 'ring-1 ring-sky-500/40',
      nodeActive: 'bg-sky-500 text-white shadow-md shadow-sky-500/30 ring-4 ring-sky-500/20',
      nodePast: 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/40',
      nodeUpcoming: 'bg-muted/60 text-muted-foreground border border-border',
      badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30',
    },
    {
      value: 'IN_PROGRESS',
      step: 2,
      label: t('orders.status.inProgress', 'In Progress'),
      shortLabel: 'Servicing',
      description: t('orders.timeline.inProgressDesc', 'Active servicing & work underway in workshop bay'),
      icon: Timer,
      activeBorder: 'border-amber-500/60 dark:border-amber-500/70',
      activeBg: 'bg-amber-500/10 dark:bg-amber-950/30',
      ring: 'ring-1 ring-amber-500/40',
      nodeActive: 'bg-amber-500 text-black shadow-md shadow-amber-500/30 ring-4 ring-amber-500/20',
      nodePast: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40',
      nodeUpcoming: 'bg-muted/60 text-muted-foreground border border-border',
      badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
    },
    {
      value: 'COMPLETED',
      step: 3,
      label: t('orders.status.completed', 'Ready / Completed'),
      shortLabel: 'Inspected',
      description: t('orders.timeline.completedDesc', 'Work finished, quality inspection verified & ready for pickup'),
      icon: CheckCircle2,
      activeBorder: 'border-purple-500/60 dark:border-purple-500/70',
      activeBg: 'bg-purple-500/10 dark:bg-purple-950/30',
      ring: 'ring-1 ring-purple-500/40',
      nodeActive: 'bg-purple-600 text-white shadow-md shadow-purple-500/30 ring-4 ring-purple-500/20',
      nodePast: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/40',
      nodeUpcoming: 'bg-muted/60 text-muted-foreground border border-border',
      badge: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30',
    },
    {
      value: 'DELIVERED',
      step: 4,
      label: t('orders.status.delivered', 'Delivered'),
      shortLabel: 'Released',
      description: t('orders.timeline.deliveredDesc', 'Vehicle handed over to customer, keys released & departed'),
      icon: PackageCheck,
      activeBorder: 'border-emerald-500/60 dark:border-emerald-500/70',
      activeBg: 'bg-emerald-500/10 dark:bg-emerald-950/30',
      ring: 'ring-1 ring-emerald-500/40',
      nodeActive: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-4 ring-emerald-500/20',
      nodePast: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40',
      nodeUpcoming: 'bg-muted/60 text-muted-foreground border border-border',
      badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
    },
  ];

  const selectedStepIndex = TIMELINE_STEPS.findIndex((s) => s.value === statusForm.status);
  const progressPercentage = statusForm.status === 'CANCELLED' 
    ? 0 
    : selectedStepIndex >= 0 
      ? Math.round(((selectedStepIndex + 1) / TIMELINE_STEPS.length) * 100)
      : 25;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[490px] p-0 gap-0 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 pb-3 sm:pb-3.5 border-b border-border/60 bg-gradient-to-b from-muted/40 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-sm">
              <Activity className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-base font-bold text-foreground truncate">
                  {t('orders.updateStatus')}
                </DialogTitle>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-muted text-muted-foreground border border-border shrink-0">
                  {formatStatus(currentStatus)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {t('orders.timeline.subtitle')}
              </p>
            </div>
          </div>

          {/* Transition indicator banner */}
          {statusForm.status !== currentStatus && (
            <div className="flex items-center gap-2 mt-2.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs">
              <span className="text-muted-foreground font-medium">{t('orders.timeline.current')}:</span>
              <span className="font-semibold text-foreground">{formatStatus(currentStatus)}</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0 mx-0.5" />
              <span className="text-muted-foreground font-medium">{t('orders.timeline.selected')}:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{formatStatus(statusForm.status)}</span>
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 min-h-0">
          {/* Horizontal Mini Progression Tracker */}
          <div className="p-3 rounded-xl bg-muted/40 dark:bg-muted/20 border border-border/60">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-muted-foreground">
                {statusForm.status === 'CANCELLED' 
                  ? t('orders.timeline.exceptionSection') 
                  : `${t('orders.timeline.stageStep', { step: Math.max(1, selectedStepIndex + 1) })} of ${TIMELINE_STEPS.length}`}
              </span>
              <span className="font-bold text-foreground">
                {statusForm.status === 'CANCELLED' ? t('status.cancelled') : `${progressPercentage}%`}
              </span>
            </div>
            <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 rounded-full ${
                  statusForm.status === 'CANCELLED'
                    ? 'bg-red-500 w-full'
                    : 'bg-gradient-to-r from-sky-500 via-amber-500 via-purple-500 to-emerald-500'
                }`}
                style={{ width: statusForm.status === 'CANCELLED' ? '100%' : `${progressPercentage}%` }}
              />
            </div>
            {/* Step markers */}
            <div className="grid grid-cols-4 gap-1 mt-2.5">
              {TIMELINE_STEPS.map((step, idx) => {
                const isPastOrCurrent = selectedStepIndex >= idx && statusForm.status !== 'CANCELLED';
                const isSelected = statusForm.status === step.value;
                return (
                  <button
                    key={step.value}
                    type="button"
                    onClick={() => setStatusForm({ ...statusForm, status: step.value })}
                    className="group/mini text-left focus:outline-none transition-transform hover:scale-[1.02] cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full transition-all shrink-0 ${
                        isSelected 
                          ? 'bg-amber-500 ring-2 ring-amber-500/40 scale-125' 
                          : isPastOrCurrent 
                            ? 'bg-emerald-500' 
                            : 'bg-muted-foreground/30'
                      }`} />
                      <span className={`text-[10px] font-medium truncate ${
                        isSelected ? 'font-bold text-foreground' : 'text-muted-foreground group-hover/mini:text-foreground'
                      }`}>
                        {step.shortLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vertical Connected Timeline Buttons */}
          <div className="space-y-2.5">
            {TIMELINE_STEPS.map((step, index) => {
              const isSelected = statusForm.status === step.value;
              const isCurrent = currentStatus === step.value;
              const isPast = selectedStepIndex > index && statusForm.status !== 'CANCELLED';
              const Icon = step.icon;

              let nodeClass = step.nodeUpcoming;
              let nodeIcon = <Icon className="w-4 h-4 opacity-70" />;

              if (isSelected) {
                nodeClass = step.nodeActive;
                nodeIcon = <Icon className="w-4 h-4" />;
              } else if (isPast) {
                nodeClass = step.nodePast;
                nodeIcon = <Check className="w-4 h-4" />;
              }

              return (
                <div key={step.value} className="relative">
                  {/* Connecting spine between steps */}
                  {index < TIMELINE_STEPS.length - 1 && (
                    <div
                      className={`absolute left-[27px] top-[48px] bottom-[-10px] w-0.5 z-0 pointer-events-none transition-colors duration-300 ${
                        isPast || isSelected ? 'bg-amber-500/60 dark:bg-amber-400/60' : 'bg-border/60'
                      }`}
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => setStatusForm({ ...statusForm, status: step.value })}
                    className={`relative z-10 w-full flex items-start gap-3.5 p-3 rounded-xl border transition-all duration-200 text-left group cursor-pointer ${
                      isSelected
                        ? `${step.activeBorder} ${step.activeBg} ${step.ring} shadow-sm`
                        : 'border-border/60 bg-card hover:bg-muted/40 hover:border-border text-card-foreground'
                    }`}
                  >
                    {/* Timeline node */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${nodeClass}`}
                    >
                      {nodeIcon}
                    </div>

                    {/* Milestone Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {t('orders.timeline.stageStep', { step: step.step })}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                              {t('orders.timeline.current')}
                            </span>
                          )}
                          {isSelected && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${step.badge}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                              {t('orders.timeline.selected')}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="font-bold text-sm text-foreground mt-0.5 flex items-center gap-1.5">
                        <span>{step.label}</span>
                      </div>

                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Cancellation Exception Card */}
          <div className="pt-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px bg-border/60 flex-1" />
              <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                {t('orders.timeline.exceptionSection')}
              </span>
              <div className="h-px bg-border/60 flex-1" />
            </div>

            <button
              type="button"
              onClick={() => setStatusForm({ ...statusForm, status: 'CANCELLED' })}
              className={`w-full flex items-start gap-3.5 p-3 rounded-xl border transition-all text-left group cursor-pointer ${
                statusForm.status === 'CANCELLED'
                  ? 'border-red-500/60 bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/30 shadow-sm'
                  : 'border-border/60 bg-card hover:bg-red-500/5 hover:border-red-500/30 text-muted-foreground hover:text-foreground'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                  statusForm.status === 'CANCELLED'
                    ? 'bg-red-500 text-white shadow-md shadow-red-500/30 ring-4 ring-red-500/20'
                    : 'bg-red-500/10 text-red-500 border border-red-500/30'
                }`}
              >
                <XCircle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-red-600 dark:text-red-400">
                    {t('status.cancelled')}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {currentStatus === 'CANCELLED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border">
                        {t('orders.timeline.current')}
                      </span>
                    )}
                    {statusForm.status === 'CANCELLED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        {t('orders.timeline.selected')}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {t('orders.timeline.cancelOrderDesc')}
                </p>
              </div>
            </button>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5 pt-0.5">
            <Label className="text-xs font-semibold text-muted-foreground">
              {t('common.notesOptional')}
            </Label>
            <textarea
              value={statusForm.notes}
              onChange={(e) => setStatusForm({ ...statusForm, notes: e.target.value })}
              placeholder={t('orders.notesPlaceholder')}
              rows={2}
              className="flex min-h-[46px] h-[46px] w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-foreground ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none"
            />
          </div>
        </div>

        {/* Custom Symmetrical Footer */}
        <div className="px-4 sm:px-5 py-3.5 border-t border-border/60 bg-muted/20 shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
            <span className="truncate font-medium text-xs">
              {statusForm.status ? formatStatus(statusForm.status) : t('orders.table.status')}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="default"
              radius="md"
              size="sm"
              onClick={onClose}
              style={{
                fontWeight: 600,
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                height: 36,
                paddingLeft: 14,
                paddingRight: 14,
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="gradient"
              gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
              radius="md"
              size="sm"
              loading={updateStatusMutation.isPending}
              disabled={updateStatusMutation.isPending || !statusForm.status}
              onClick={() => updateStatusMutation.mutate()}
              rightSection={<ArrowRight className="w-4 h-4" />}
              style={{
                boxShadow: (updateStatusMutation.isPending || !statusForm.status) ? "none" : "0 2px 10px rgba(245, 158, 11, 0.25)",
                fontWeight: 600,
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                letterSpacing: "-0.01em",
                height: 36,
                paddingLeft: 16,
                paddingRight: 16,
              }}
            >
              {t('orders.timeline.applyTransition')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
