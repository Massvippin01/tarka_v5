import React from 'react';
import clsx from 'clsx';

export interface GaugeProps {
  value: number; // 0 to 100
  color?: string;
  className?: string;
  height?: number;
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  color = 'var(--frozen)',
  className,
  height = 8,
}) => {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={clsx('v6-gauge-track', className)}
      style={{ height: `${height}px` }}
    >
      <div
        className="v6-gauge-fill"
        style={{
          width: `${clamped}%`,
          background: color,
        }}
      />
    </div>
  );
};
