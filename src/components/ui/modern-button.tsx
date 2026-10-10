import * as React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ModernButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const ModernButton = React.forwardRef<HTMLButtonElement, ModernButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    
    // Core Material Design button properties: transitions, active scaling, and focus rings
    const baseClasses = "relative inline-flex items-center justify-center font-semibold tracking-wide transition-all duration-300 ease-out overflow-hidden active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";
    
    // Material 2 style rounding
    const roundingClasses = size === 'icon' ? "rounded-full" : "rounded-lg";
    
    const variantClasses = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 hover:-translate-y-[1px]",
      secondary: "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 shadow-sm hover:shadow",
      outline: "border-2 border-primary text-primary hover:bg-primary/5",
      ghost: "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300",
    };

    const sizeClasses = {
      sm: "h-8 px-4 text-xs",
      md: "h-10 px-6 text-sm", 
      lg: "h-12 px-8 text-base",
      icon: "h-10 w-10",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          baseClasses,
          roundingClasses,
          variantClasses[variant],
          sizeClasses[size],
          (disabled || isLoading) && "opacity-60 cursor-not-allowed shadow-none hover:shadow-none hover:translate-y-0 active:scale-100",
          className
        )}
        {...props}
      >
        {/* Subtle Material Ink Ripple / Light Reflection effect */}
        <span className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-10 transition-opacity duration-300 pointer-events-none" />
        
        {isLoading && <Loader2 className="w-5 h-5 mr-2 animate-spin shrink-0" />}
        {!isLoading && leftIcon && <span className="mr-2 shrink-0">{leftIcon}</span>}
        <span className="truncate">{children}</span>
        {!isLoading && rightIcon && <span className="ml-2 shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

ModernButton.displayName = 'ModernButton';
