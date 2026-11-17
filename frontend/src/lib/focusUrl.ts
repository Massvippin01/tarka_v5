/**
 * Zoom focus in the address bar, shared by every case screen:
 *   no net/acct → Project level (all networks in the case)
 *   ?net=NET-…  → Network level (one gang)
 *   ?net=…&acct=<party key> → Account level (one mule). acct alone is allowed too.
 */
import { useSyncExternalStore } from 'react';

export interface Focus {
  networkId: string | null;
  account: string | null;
}

export type FocusLevel = 'project' | 'network' | 'account';

export function parseFocus(search: string): Focus {
  const p = new URLSearchParams(search);
  return { networkId: p.get('net') || null, account: p.get('acct') || null };
}

export function focusLevel(f: Focus): FocusLevel {
  return f.account ? 'account' : f.networkId ? 'network' : 'project';
}

/** New query string with the focus applied; other params (view, case, …) kept. */
export function serializeFocus(search: string, f: Focus): string {
  const p = new URLSearchParams(search);
  for (const [key, val] of [['net', f.networkId], ['acct', f.account]] as const) {
    if (val) p.set(key, val);
    else p.delete(key);
  }
  const qs = p.toString();
  return qs ? `?${qs}` : '';
}

const EVENT = 'tarka:focus';

export function setFocus(f: Focus): void {
  const search = serializeFocus(window.location.search, f);
  if (search === window.location.search) return;
  window.history.pushState({}, '', `${window.location.pathname}${search}${window.location.hash}`);
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener('popstate', cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener('popstate', cb);
    window.removeEventListener(EVENT, cb);
  };
}

/** Current focus; re-renders on back/forward and on setFocus from any screen. */
export function useFocus(): Focus {
  const search = useSyncExternalStore(subscribe, () => window.location.search, () => '');
  const f = parseFocus(search);
  return f;
}
