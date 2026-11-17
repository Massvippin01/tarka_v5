/**
 * URL <-> app state helpers. The address bar (?view=...&case=...) is the source of truth on load.
 * Pure functions only; the store decides when to push history entries.
 */

export interface UrlState {
  view: string | null;
  caseId: string | null;
}

export const DEFAULT_VIEW = "home";

export function parseUrlState(search: string): UrlState {
  const params = new URLSearchParams(search);
  const view = params.get("view") || params.get("screen");
  const caseId = params.get("case");
  return { view: view || null, caseId: caseId || null };
}

/** Returns a new query string ("?a=b" or "") with view/case applied, other params preserved. */
export function serializeUrlState(
  search: string,
  next: { view?: string | null; caseId?: string | null },
): string {
  const params = new URLSearchParams(search);
  params.delete("screen");
  if (next.view !== undefined) {
    if (next.view) params.set("view", next.view);
    else params.delete("view");
  }
  if (next.caseId !== undefined) {
    if (next.caseId) params.set("case", next.caseId);
    else params.delete("case");
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/** Push a history entry for the new state unless the URL already matches. */
export function pushUrlState(next: { view?: string | null; caseId?: string | null }): void {
  if (typeof window === "undefined") return;
  const search = serializeUrlState(window.location.search, next);
  if (search === window.location.search) return;
  window.history.pushState({}, "", `${window.location.pathname}${search}${window.location.hash}`);
}
