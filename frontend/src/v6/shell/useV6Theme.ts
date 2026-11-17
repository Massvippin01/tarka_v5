import { create } from 'zustand';

export type V6Theme = 'light' | 'dark';
const KEY = 'tarka_v6_theme';

const read = (): V6Theme => {
  try {
    const v = localStorage.getItem(KEY);
    // shortcut: light unless chosen; follow prefers-color-scheme once every screen is dark-clean.
    return v === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

// Own attribute so the legacy ThemeProvider's data-theme on <html> can't overwrite it.
const apply = (t: V6Theme) => {
  if (typeof document !== 'undefined') document.documentElement.setAttribute('data-v6-theme', t);
};

const initial: V6Theme = typeof window === 'undefined' ? 'light' : read();
apply(initial);

export const useV6Theme = create<{ theme: V6Theme; toggle: () => void }>((set, get) => ({
  theme: initial,
  toggle: () => {
    const next: V6Theme = get().theme === 'dark' ? 'light' : 'dark';
    apply(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    set({ theme: next });
  },
}));
