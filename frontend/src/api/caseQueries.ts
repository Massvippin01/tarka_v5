/** One shared TanStack Query entry per case for GET /cases/{id}/bundle and /networks, so no screen re-fetches them. */
import apiClient from "./client";
import { queryClient } from "../queryClient";

const FRESH_MS = 30_000;

export const rawBundleKey = (caseId: string) => ["case", caseId, "bundle-raw"] as const;

export function fetchRawBundle<T = any>(caseId: string): Promise<T> {
  return queryClient.fetchQuery({
    queryKey: rawBundleKey(caseId),
    queryFn: async () => (await apiClient.get<T>(`/api/v1/cases/${encodeURIComponent(caseId)}/bundle`)).data,
    staleTime: FRESH_MS,
  });
}

/** Same key as every useQuery(['networks', caseId]) hook. */
export function fetchNetworks<T = any>(caseId: string): Promise<T> {
  return queryClient.fetchQuery({
    queryKey: ["networks", caseId],
    queryFn: async () => (await apiClient.get<T>(`/api/v1/cases/${encodeURIComponent(caseId)}/networks`)).data,
    staleTime: FRESH_MS,
  });
}
