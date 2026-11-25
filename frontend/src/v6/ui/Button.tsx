import React, { forwardRef } from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'default' | 'primary' | 'safe' | 'ice' | 'destructive' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      icon,
      iconPosition = 'left',
      isLoading,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'h-7 px-2.5 text-xs rounded-md',
      md: 'h-9 px-3.5 text-sm rounded-lg',
      lg: 'h-11 px-5 text-base rounded-xl',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          'v6-btn',
          variant !== 'default' && variant,
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-none" />
        ) : (
          icon && iconPosition === 'left' && <span className="flex-none">{icon}</span>
        )}
        {children}
        {!isLoading && icon && iconPosition === 'right' && (
          <span className="flex-none">{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
