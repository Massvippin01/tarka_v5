import React, { useEffect } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface InspectorProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Inspector: React.FC<InspectorProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  meta,
  children,
  className,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Optional translucent backdrop click-away */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx('v6-inspector', isOpen && 'open', className)}
        aria-label="Inspector Details"
      >
        <div className="v6-insp-h">
          <div className="flex-1 min-w-0 pr-3">
            {subtitle && (
              <div className="text-xs font-semibold text-[var(--fg-3)] mb-1">
                {subtitle}
              </div>
            )}
            <div className="text-lg font-extrabold text-[var(--fg-1)] truncate">
              {title}
            </div>
            {meta && (
              <div className="text-xs font-mono text-[var(--fg-2)] mt-0.5">
                {meta}
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close inspector"
            className="h-8 w-8 p-0"
            icon={<X className="w-4 h-4" />}
          />
        </div>
        <div className="v6-insp-b">
          {children}
        </div>
      </aside>
    </>
  );
};
