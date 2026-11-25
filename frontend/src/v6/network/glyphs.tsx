/** One SVG icon set for graph nodes, drawn on a 24-unit grid and coloured from theme tokens. Shape differs per kind. */
import React from 'react';

export type GlyphKind = 'victim' | 'mule' | 'cashout' | 'hub' | 'bank' | 'phone' | 'sim' | 'wifi' | 'ip' | 'device';

const PATHS: Record<GlyphKind, React.ReactNode> = {
  victim: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5" />
    </>
  ),
  mule: (
    <>
      <circle cx="9" cy="8" r="3.6" />
      <path d="M2.5 21c0-3.8 2.9-6.8 6.5-6.8 1.7 0 3.2.6 4.3 1.7" />
      <path d="M14.5 17.5h7m-2.8-2.8 2.8 2.8-2.8 2.8" />
    </>
  ),
  cashout: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.8" />
      <path d="M6 9.5v5M18 9.5v5" />
    </>
  ),
  hub: (
    <>
      <path d="M3.5 9 5.5 4h13l2 5" />
      <path d="M4.5 9v11h15V9" />
      <path d="M3.5 9c0 1.4 1.2 2.5 2.7 2.5S8.9 10.4 8.9 9c0 1.4 1.2 2.5 2.7 2.5s2.7-1.1 2.7-2.5c0 1.4 1.2 2.5 2.7 2.5s2.7-1.1 2.7-2.5" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  bank: (
    <>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5.5 10.5v7M9.8 10.5v7M14.2 10.5v7M18.5 10.5v7" />
      <path d="M3 20h18" />
    </>
  ),
  phone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
      <path d="M11 18h2" />
    </>
  ),
  sim: (
    <>
      <path d="M7 2.5h7.5l4 4v15H7z" />
      <rect x="9.8" y="11" width="5.6" height="6.5" rx="1" />
    </>
  ),
  wifi: (
    <>
      <path d="M2.5 9a14 14 0 0 1 19 0" />
      <path d="M5.8 12.6a9.2 9.2 0 0 1 12.4 0" />
      <path d="M9.1 16.1a4.4 4.4 0 0 1 5.8 0" />
      <circle cx="12" cy="19.5" r="1.1" />
    </>
  ),
  ip: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18" />
    </>
  ),
  device: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="1.6" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
};

/** Icon centred on (0,0) and fitting inside a circle of radius `r`. */
export const Glyph: React.FC<{ kind: GlyphKind; r: number; color: string; strokeWidth?: number }> = ({ kind, r, color, strokeWidth = 1.6 }) => {
  const s = (r * 1.25) / 24;
  // strokeWidth is in screen px; divide by the scale so icons look the same at every size
  return (
    <g transform={`scale(${s}) translate(-12 -12)`} fill="none" stroke={color} strokeWidth={strokeWidth / Math.max(s, 0.01)} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {PATHS[kind]}
    </g>
  );
};

/** Disc + icon. `fill` / `ink` are CSS colours (usually var(--token)); `dashed` marks muted hubs. */
export const GlyphNode: React.FC<{ kind: GlyphKind; r: number; fill: string; ink: string; dashed?: boolean; stroke?: string }> = ({ kind, r, fill, ink, dashed, stroke }) => (
  <>
    <circle r={r} fill={fill} stroke={stroke ?? 'none'} strokeWidth={stroke ? 1.4 : 0} strokeDasharray={dashed ? '3 2.5' : undefined} />
    <Glyph kind={kind} r={r} color={ink} />
  </>
);
