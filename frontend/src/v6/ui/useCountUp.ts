import { useState, useEffect } from 'react';
import { formatInr, formatIndianNumber } from '../../utils/formatters';

interface UseCountUpOptions {
  duration?: number;
  isInr?: boolean;
  showPaise?: boolean;
}

export function useCountUp(
  targetValue: number,
  options?: UseCountUpOptions
): string {
  const { duration = 1000, isInr = false, showPaise = false } = options || {};
  const [current, setCurrent] = useState<number>(0);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setCurrent(targetValue);
      return;
    }

    let startTime: number | null = null;
    let animationFrameId: number;

    const startVal = 0;
    const diff = targetValue - startVal;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease-out cubic: 1 - (1 - p)^3
      const ease = 1 - Math.pow(1 - progress, 3);
      setCurrent(startVal + diff * ease);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCurrent(targetValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [targetValue, duration]);

  if (isInr) {
    return formatInr(Math.round(current), { showPaise });
  }

  return formatIndianNumber(Math.round(current));
}
