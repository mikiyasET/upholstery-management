import type { ReactNode } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: ReactNode;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
    closeOnConfirm?: boolean;
}

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    type = 'info',
    closeOnConfirm = true
}: ConfirmDialogProps) {
    const { t } = useTranslation();

    if (!isOpen) return null;

    const colors = {
        danger: 'bg-red-500 hover:bg-red-600 shadow-red-500/20',
        warning: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
        info: 'bg-[#c9a84c] hover:bg-[#b3933c] shadow-[#c9a84c]/20'
    };

    const iconColors = {
        danger: 'text-red-500 bg-red-50 dark:bg-red-500/10',
        warning: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10',
        info: 'text-[#c9a84c] bg-[#c9a84c]/10'
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            ></div>

            {/* Dialog Content */}
            <div className="relative bg-white dark:bg-[#161616] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800">
                <div className="p-6 pb-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl shrink-0 ${iconColors[type]}`}>
                                <AlertTriangle size={20} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                                {title}
                            </h3>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors shrink-0"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed pl-[44px]">
                        {message}
                    </p>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50/50 dark:bg-[#000000]/50 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                    >
                        {cancelText || t('common.cancel')}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            if (closeOnConfirm) {
                                onClose();
                            }
                        }}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-white font-semibold transition-all shadow-lg active:scale-95 ${colors[type]}`}
                    >
                        {confirmText || t('common.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}
