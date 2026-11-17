import React, { forwardRef } from 'react';
import clsx from 'clsx';
import {
  AlertTriangle,
  X,
  Loader2,
} from 'lucide-react';

/* =====================================================================
   TARKA REUSABLE SKEUOMORPHIC FORENSIC COMPONENTS
   Tokens: Warm Ivory, Tactile Graphite, Rich Brown, Burnt Orange
   Doctrine: AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.
   ===================================================================== */

// --- 1. TarkaPanel ---
export interface TarkaPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'raised' | 'flat' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const TarkaPanel: React.FC<TarkaPanelProps> = ({
  className,
  variant = 'raised',
  padding = 'md',
  children,
  ...props
}) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4 sm:p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={clsx(
        'tarka-panel rounded-xl transition-all duration-150',
        paddingClasses[padding],
        variant === 'bordered' && 'border-2 border-[var(--line)]',
        variant === 'flat' && 'shadow-none bg-[var(--surface-2)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// --- 2. TarkaInsetPanel ---
export interface TarkaInsetPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const TarkaInsetPanel: React.FC<TarkaInsetPanelProps> = ({
  className,
  padding = 'md',
  children,
  ...props
}) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-2.5',
    md: 'p-4',
    lg: 'p-5',
  };

  return (
    <div
      className={clsx(
        'tarka-inset rounded-lg transition-all',
        paddingClasses[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// --- 3. TarkaButton & TarkaIconButton ---
export type TarkaButtonVariant = 'primary' | 'secondary' | 'tactile' | 'destructive' | 'ghost' | 'safe';
export type TarkaButtonSize = 'sm' | 'md' | 'lg';

export interface TarkaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: TarkaButtonVariant;
  size?: TarkaButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const TarkaButton = forwardRef<HTMLButtonElement, TarkaButtonProps>(
  (
    {
      className,
      variant = 'secondary',
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
      sm: 'h-7.5 px-3 text-[12px] rounded-lg gap-1.5',
      md: 'h-9 px-4 text-[13px] rounded-lg gap-2',
      lg: 'h-10.5 px-5 text-[14px] rounded-xl gap-2.5',
    };

    const variantClasses = {
      primary: 'bg-[var(--accent)] text-[#FFFDF8] hover:bg-[var(--accent-hover)] border border-[#8D491E] shadow-xs active:translate-y-px',
      secondary: 'bg-[var(--surface-1)] text-[var(--fg-1)] hover:bg-[var(--surface-2)] border border-[var(--line)] shadow-xs active:translate-y-px',
      tactile: 'tarka-button text-[var(--fg-1)] hover:bg-[var(--surface-2)]',
      destructive: 'bg-[var(--risk)] text-white hover:bg-[#992F29] border border-[#992F29] shadow-xs active:translate-y-px',
      safe: 'bg-[var(--safe)] text-white hover:bg-[#1E5C40] border border-[#1E5C40] shadow-xs active:translate-y-px',
      ghost: 'bg-transparent text-[var(--fg-2)] hover:text-[var(--fg-1)] hover:bg-[var(--hover)] border border-transparent shadow-none',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          'inline-flex items-center justify-center font-semibold select-none transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
          sizeClasses[size],
          variantClasses[variant],
          (disabled || isLoading) && 'opacity-55 cursor-not-allowed pointer-events-none',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : (
          icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>
        )}
        {children}
        {!isLoading && icon && iconPosition === 'right' && (
          <span className="shrink-0">{icon}</span>
        )}
      </button>
    );
  }
);
TarkaButton.displayName = 'TarkaButton';

export interface TarkaIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  variant?: TarkaButtonVariant;
  icon: React.ReactNode;
  title: string;
}

export const TarkaIconButton = forwardRef<HTMLButtonElement, TarkaIconButtonProps>(
  ({ className, size = 'md', variant = 'secondary', icon, title, ...props }, ref) => {
    const sizeClasses = {
      sm: 'size-7 rounded-md',
      md: 'size-8.5 rounded-lg',
      lg: 'size-10 rounded-xl',
    };

    return (
      <TarkaButton
        ref={ref}
        variant={variant}
        size="md"
        title={title}
        aria-label={title}
        className={clsx('p-0 flex items-center justify-center shrink-0', sizeClasses[size], className)}
        {...props}
      >
        {icon}
      </TarkaButton>
    );
  }
);
TarkaIconButton.displayName = 'TarkaIconButton';

// --- 4. TarkaStatus ---
export type TarkaStatusType = 'safe' | 'urgent' | 'risk' | 'info' | 'neutral';

export interface TarkaStatusProps {
  status: TarkaStatusType;
  label: string;
  withDot?: boolean;
  className?: string;
}

export const TarkaStatus: React.FC<TarkaStatusProps> = ({
  status,
  label,
  withDot = true,
  className,
}) => {
  const statusStyles = {
    safe: 'bg-[var(--safe-bg)] text-[var(--safe)] border-[var(--safe)]/30',
    urgent: 'bg-[var(--urgent-bg)] text-[var(--urgent)] border-[#A66A17]/30',
    risk: 'bg-[var(--risk-bg)] text-[var(--risk)] border-[var(--risk)]/30',
    info: 'bg-[var(--flow-bg)] text-[var(--flow)] border-[var(--flow)]/30',
    neutral: 'bg-[#F1ECE4] text-[var(--fg-2)] border-[var(--line)]',
  };

  const dotColors = {
    safe: 'bg-[var(--safe)]',
    urgent: 'bg-[#A66A17] animate-pulse',
    risk: 'bg-[var(--risk)] animate-pulse',
    info: 'bg-[var(--flow)]',
    neutral: 'bg-[#978B7F]',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-bold border tabular-nums leading-none select-none',
        statusStyles[status],
        className
      )}
    >
      {withDot && <span className={clsx('size-1.5 rounded-full shrink-0', dotColors[status])} />}
      {label}
    </span>
  );
};

// --- 5. TarkaMetricCard ---
export interface TarkaMetricCardProps {
  label: string;
  value: string | number;
  subvalue?: string;
  trend?: string;
  trendUp?: boolean;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const TarkaMetricCard: React.FC<TarkaMetricCardProps> = ({
  label,
  value,
  subvalue,
  trend,
  trendUp,
  icon,
  badge,
  onClick,
  className,
}) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'tarka-panel rounded-xl p-4 flex flex-col justify-between transition-all duration-150',
        onClick && 'cursor-pointer hover:border-[var(--line-2)] hover:shadow-md select-none',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[12px] font-bold text-[var(--fg-2)] uppercase tracking-wider truncate">
          {label}
        </span>
        {icon && <span className="text-[var(--accent)] shrink-0">{icon}</span>}
        {badge && <span className="shrink-0">{badge}</span>}
      </div>
      <div>
        <div className="text-2xl font-extrabold text-[var(--fg-1)] tracking-tight tabular-nums font-mono">
          {value}
        </div>
        {(subvalue || trend) && (
          <div className="flex items-center gap-2 mt-1 text-[12px]">
            {trend && (
              <span
                className={clsx(
                  'font-bold tabular-nums',
                  trendUp ? 'text-[var(--safe)]' : 'text-[var(--risk)]'
                )}
              >
                {trend}
              </span>
            )}
            {subvalue && <span className="text-[var(--fg-3)] truncate">{subvalue}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

// --- 6. TarkaModal ---
export interface TarkaModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const TarkaModal: React.FC<TarkaModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  maxWidth = 'lg',
  children,
  footer,
}) => {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-5xl',
    '4xl': 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed tactile backdrop */}
      <div
        className="fixed inset-0 bg-[#292522]/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          'relative w-full bg-[var(--surface-1)] border border-[var(--line)] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150',
          maxWidthClasses[maxWidth]
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)] bg-[var(--surface-2)] shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-[var(--fg-1)]">{title}</h2>
              {badge}
            </div>
            {subtitle && <p className="text-[12px] text-[var(--fg-2)] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center text-[var(--fg-2)] hover:text-[var(--fg-1)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--surface-1)]">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-3.5 border-t border-[var(--line)] bg-[var(--surface-2)] flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// --- 7. TarkaDrawer ---
export interface TarkaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  width?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const TarkaDrawer: React.FC<TarkaDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  width = 'w-[520px]',
  children,
  footer,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#292522]/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          'relative h-full bg-[var(--surface-1)] border-l border-[var(--line)] shadow-[-16px_0_40px_rgba(41,37,34,0.18)] z-50 flex flex-col max-w-[96vw] animate-in slide-in-from-right duration-200',
          width
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)] bg-[var(--surface-2)] shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--fg-1)]">{title}</h2>
              {badge}
            </div>
            {subtitle && <p className="text-[12px] text-[var(--fg-2)] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center text-[var(--fg-2)] hover:text-[var(--fg-1)] hover:bg-[var(--hover)] transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-[var(--surface-1)] flex flex-col">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-5 py-3 border-t border-[var(--line)] bg-[var(--surface-2)] flex items-center justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
};

// --- 8. TarkaEmptyState ---
export interface TarkaEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const TarkaEmptyState: React.FC<TarkaEmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={clsx(
        'tarka-panel rounded-xl p-8 text-center flex flex-col items-center justify-center my-4',
        className
      )}
    >
      {icon && (
        <div className="size-12 rounded-xl bg-[var(--surface-2)] border border-[var(--line)] flex items-center justify-center text-[var(--accent)] mb-3 shadow-2xs">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-bold text-[var(--fg-1)]">{title}</h3>
      <p className="text-[12.5px] text-[var(--fg-2)] max-w-md mt-1 mb-4 leading-relaxed">
        {description}
      </p>
      {action}
    </div>
  );
};

// --- 9. TarkaLoadingState ---
export interface TarkaLoadingStateProps {
  label?: string;
  className?: string;
}

export const TarkaLoadingState: React.FC<TarkaLoadingStateProps> = ({
  label = 'Loading forensic data...',
  className,
}) => {
  return (
    <div
      className={clsx(
        'tarka-panel rounded-xl p-10 flex flex-col items-center justify-center gap-3 text-center my-4',
        className
      )}
    >
      <Loader2 className="size-6 text-[var(--accent)] animate-spin" />
      <span className="text-[13px] font-semibold text-[var(--fg-2)]">{label}</span>
    </div>
  );
};

// --- 10. TarkaErrorState ---
export interface TarkaErrorStateProps {
  title?: string;
  error: string;
  onRetry?: () => void;
  className?: string;
}

export const TarkaErrorState: React.FC<TarkaErrorStateProps> = ({
  title = 'Investigation Anomaly Detected',
  error,
  onRetry,
  className,
}) => {
  return (
    <div
      className={clsx(
        'tarka-panel rounded-xl p-6 border-l-4 border-l-[var(--risk)] bg-[var(--surface-1)] my-4 space-y-3',
        className
      )}
    >
      <div className="flex items-center gap-2 text-[var(--risk)] font-bold text-sm">
        <AlertTriangle className="size-4 shrink-0" />
        <span>{title}</span>
      </div>
      <p className="text-[12.5px] text-[var(--fg-2)] font-mono bg-[var(--surface-2)] p-2.5 rounded-lg border border-[var(--line)]">
        {error}
      </p>
      {onRetry && (
        <TarkaButton variant="secondary" size="sm" onClick={onRetry}>
          Retry Verification
        </TarkaButton>
      )}
    </div>
  );
};
