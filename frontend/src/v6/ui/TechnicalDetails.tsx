import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** Collapsed "Technical details" card: where legal and cryptographic terms live, out of the main view. */
export const TechnicalDetails: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="v6-card">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex items-center justify-between text-[12.5px] font-medium text-[var(--fg-2)] hover:text-[var(--fg-1)]">
        Technical details
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-3 text-[12.5px] leading-relaxed text-[var(--fg-2)] space-y-2">{children}</div>}
    </div>
  );
};
