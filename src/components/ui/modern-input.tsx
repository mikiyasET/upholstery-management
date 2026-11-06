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
  ({ className, icon: Icon, label, error, containerClassName, inputSize = 'default', id: externalId, placeholder, disabled, ...props }, ref) => {
    const internalId = useId();
    const id = externalId || internalId;

    const isSm = inputSize === 'sm';

    return (
      <div className={cn("flex flex-col gap-1.5", containerClassName)}>
        {label && (
          <label htmlFor={id} className={cn("font-medium text-foreground/85 block select-none", isSm ? "text-xs" : "text-sm")}>
            {label}
          </label>
        )}
        <div className="relative group flex items-center w-full">
          {Icon && (
            <div className={cn(
              "absolute top-1/2 -translate-y-1/2 flex items-center justify-center text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none z-10",
              isSm ? "left-3" : "left-3.5"
            )}>
              <Icon className={cn(isSm ? "w-4 h-4" : "w-4.5 h-4.5")} />
            </div>
          )}

          <input
            id={id}
            ref={ref}
            disabled={disabled}
            placeholder={placeholder}
            className={cn(
              "w-full rounded-lg border border-input bg-background font-normal text-foreground transition-all duration-200 outline-none shadow-2xs",
              "hover:border-foreground/30",
              "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20",
              "placeholder:text-muted-foreground/60 placeholder:font-normal",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/30",
              isSm ? "h-9 text-xs px-3" : "h-10 text-sm px-3.5",
              Icon && (isSm ? "pl-9" : "pl-10"),
              error && "border-destructive text-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <span className="text-xs text-destructive font-medium ml-1">{error}</span>
        )}
      </div>
    );
  }
);

ModernInput.displayName = 'ModernInput';
