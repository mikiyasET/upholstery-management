import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface ModernInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  label?: string;
  error?: string;
  containerClassName?: string;
  inputSize?: 'sm' | 'default';
}

export const ModernInput = forwardRef<HTMLInputElement, ModernInputProps>(
  ({ className, icon: Icon, label, error, containerClassName, inputSize = 'default', id: externalId, placeholder, ...props }, ref) => {
    const internalId = useId();
    const id = externalId || internalId;

    const isSm = inputSize === 'sm';

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label && (
          <label htmlFor={id} className={cn("font-semibold text-gray-700 dark:text-gray-300", isSm ? "text-xs" : "text-sm")}>
            {label}
          </label>
        )}
        <div className="relative group flex items-center w-full">
          {Icon && (
            <div className={cn("absolute top-1/2 -translate-y-1/2 flex items-center justify-center text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none", isSm ? "left-2.5" : "left-3.5")}>
              <Icon className={cn(isSm ? "w-4 h-4" : "w-5 h-5")} />
            </div>
          )}

          <input
            id={id}
            ref={ref}
            placeholder={placeholder}
            className={cn(
              "w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2 font-medium text-gray-900 dark:text-white transition-all duration-200 outline-none",
              "focus:border-primary focus:ring-1 focus:ring-primary",
              "placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:font-medium",
              isSm ? "h-9 text-xs" : "h-[46px] text-sm",
              Icon && (isSm ? "pl-9" : "pl-11"),
              error && "border-red-500 focus:ring-red-500 focus:border-red-500",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <span className="text-xs text-red-500 font-medium ml-1">{error}</span>
        )}
      </div>
    );
  }
);

ModernInput.displayName = 'ModernInput';
