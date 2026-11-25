import axios, { type AxiosRequestConfig } from "axios";

/**
 * Returns the configured base API URL without trailing slash.
 * In development without VITE_API_URL, returns "" so Vite proxy handles /api.
 * In production on Render static hosting, returns VITE_API_URL (e.g. https://tarka-v5-1.onrender.com).
 */
export const getApiBaseUrl = (): string => {
  const url = (import.meta.env.VITE_API_URL || "").trim();
  return url.replace(/\/+$/, "");
};

/**
 * Resolves an API path or legacy localhost URL to the target API base URL.
 */
export const apiUrl = (pathOrUrl: string): string => {
  if (!pathOrUrl) return pathOrUrl;
  const base = getApiBaseUrl();
  let path = pathOrUrl;
  if (path.startsWith("http://localhost:8000")) {
    path = path.substring("http://localhost:8000".length);
  } else if (path.startsWith("http://127.0.0.1:8000")) {
    path = path.substring("http://127.0.0.1:8000".length);
  }
  if (path.startsWith("/")) {
    return base ? `${base}${path}` : path;
  }
  return base ? `${base}/${path}` : `/${path}`;
};

let memoryToken: string | null = null;

export const getStoredAuthToken = (): string | null => {
  if (typeof window === "undefined") return memoryToken;
  try {
    const token =
      sessionStorage.getItem("sentinelx_auth_token") ||
      localStorage.getItem("sentinelx_auth_token") ||
      sessionStorage.getItem("tarka_token") ||
      localStorage.getItem("tarka_token") ||
      memoryToken;
    if (token && token.trim()) {
      return token.trim();
    }
    return memoryToken;
  } catch {
    return memoryToken;
  }
};

export const setStoredAuthToken = (token: string): void => {
  memoryToken = token;
  if (typeof window === "undefined" || !token) return;
  try {
    sessionStorage.setItem("sentinelx_auth_token", token);
    localStorage.setItem("sentinelx_auth_token", token);
    sessionStorage.setItem("tarka_token", token);
    localStorage.setItem("tarka_token", token);
  } catch (err) {
    console.warn("Could not persist authentication token to storage:", err);
  }
};

export const clearStoredAuthToken = (): void => {
  memoryToken = null;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem("sentinelx_auth_token");
    localStorage.removeItem("sentinelx_auth_token");
    sessionStorage.removeItem("tarka_token");
    localStorage.removeItem("tarka_token");
  } catch {}
};

let authBootstrapPromise: Promise<string | null> | null = null;

/**
 * Ensures a valid signed JWT session token exists for the active forensic officer persona.
 * Bootstraps with INVESTIGATOR_DELHI ("Insp. Rajeshwar Rao", IO-4091) if unauthenticated.
 */
export const ensureAuthenticatedSession = async (
  forceRefresh: boolean = false,
  username: string = "INVESTIGATOR_DELHI"
): Promise<string | null> => {
  if (!forceRefresh) {
    const existing = getStoredAuthToken();
    if (existing) return existing;
  }

  if (authBootstrapPromise && !forceRefresh) {
    return authBootstrapPromise;
  }

  authBootstrapPromise = (async () => {
    try {
      const base = getApiBaseUrl();
      const sessionUrl = base
        ? `${base}/api/v1/forensics/auth/session`
        : typeof window === "undefined"
        ? "http://127.0.0.1:8000/api/v1/forensics/auth/session"
        : "/api/v1/forensics/auth/session";
      const fetchFn = typeof window !== "undefined" && window.fetch ? window.fetch : globalThis.fetch;
      if (typeof fetchFn === "function") {
        const res = await fetchFn(sessionUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        if (res && res.ok) {
          const data = await res.json();
          if (data?.access_token) {
            setStoredAuthToken(data.access_token);
            return data.access_token as string;
          }
        } else if (res) {
          console.warn("Forensics auth session endpoint returned status:", res.status);
        }
      }
    } catch (err) {
      console.warn("Failed to auto-bootstrap forensic investigator session:", err);
    } finally {
      authBootstrapPromise = null;
    }
    return getStoredAuthToken();
  })();

  return authBootstrapPromise;
};

export const createEventSource = (pathOrUrl: string): EventSource => {
  let resolved = apiUrl(pathOrUrl);
  const token = getStoredAuthToken();
  if (token && !resolved.includes("token=")) {
    const sep = resolved.includes("?") ? "&" : "?";
    resolved = `${resolved}${sep}token=${encodeURIComponent(token)}`;
  }
  return new EventSource(resolved);
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl() || "",
  timeout: 35000,
});

interface RetriableRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

const applyInterceptors = (instance: typeof axios | typeof apiClient) => {
  instance.interceptors.request.use(async (config) => {
    const base = getApiBaseUrl();
    if (config.url) {
      if (config.url.startsWith("http://localhost:8000")) {
        const path = config.url.substring("http://localhost:8000".length);
        config.url = base ? `${base}${path}` : path;
      } else if (config.url.startsWith("http://127.0.0.1:8000")) {
        const path = config.url.substring("http://127.0.0.1:8000".length);
        config.url = base ? `${base}${path}` : path;
      } else if (config.url.startsWith("/api/") && base && !config.baseURL) {
        config.url = `${base}${config.url}`;
      }
    }

    // Attach auth token, bootstrapping if needed
    let token = getStoredAuthToken();
    if (!token && !config.url?.includes("/auth/session")) {
      token = await ensureAuthenticatedSession();
    }

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const originalRequest = error.config as RetriableRequestConfig | undefined;
      if (
        error.response?.status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !originalRequest.url?.includes("/auth/session")
      ) {
        originalRequest._retry = true;
        const freshToken = await ensureAuthenticatedSession(true);
        if (freshToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          return instance(originalRequest);
        }
      }

      if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
        console.warn("API request timed out. Render Free tier instance may be cold-starting (up to 50s).", error);
      }
      return Promise.reject(error);
    }
  );
};

applyInterceptors(apiClient);
applyInterceptors(axios);

// Global browser window patches for fetch and EventSource
if (typeof window !== "undefined") {
  const rawFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const base = getApiBaseUrl();
    let urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    // Rewrite URL if target base is configured
    if (base) {
      if (urlStr.startsWith("/api/")) {
        urlStr = `${base}${urlStr}`;
      } else if (urlStr.startsWith("http://localhost:8000/")) {
        urlStr = urlStr.replace("http://localhost:8000", base);
      } else if (urlStr.startsWith("http://127.0.0.1:8000/")) {
        urlStr = urlStr.replace("http://127.0.0.1:8000", base);
      }
    }

    const isApiCall =
      urlStr.startsWith("/api/") ||
      (base && urlStr.startsWith(base)) ||
      urlStr.includes("/api/v1/");

    const reqInit: RequestInit = init ? { ...init } : {};

    // Auto-attach Authorization header for API calls
    if (isApiCall && !urlStr.includes("/auth/session")) {
      const headers = new Headers(reqInit.headers || {});
      const authHeader = headers.get("Authorization");
      if (!authHeader || authHeader.trim() === "Bearer" || authHeader.trim() === "Bearer null") {
        let token = getStoredAuthToken();
        if (!token) {
          token = await ensureAuthenticatedSession();
        }
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
      }
      reqInit.headers = headers;
    }

    const modifiedInput = typeof input === "string" ? urlStr : input instanceof URL ? new URL(urlStr) : urlStr;
    const response = await rawFetch(modifiedInput, reqInit);

    // Silent re-auth on 401 for protected API calls
    if (response.status === 401 && isApiCall && !urlStr.includes("/auth/session")) {
      const freshToken = await ensureAuthenticatedSession(true);
      if (freshToken) {
        const retryHeaders = new Headers(reqInit.headers || {});
        retryHeaders.set("Authorization", `Bearer ${freshToken}`);
        reqInit.headers = retryHeaders;
        return rawFetch(modifiedInput, reqInit);
      }
    }

    return response;
  };

  if (window.EventSource) {
    const RawEventSource = window.EventSource;
    window.EventSource = class extends RawEventSource {
      constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
        const base = getApiBaseUrl();
        let resolved = typeof url === "string" ? url : url.toString();
        if (base) {
          if (resolved.startsWith("/api/")) {
            resolved = `${base}${resolved}`;
          } else if (resolved.startsWith("http://localhost:8000/")) {
            resolved = resolved.replace("http://localhost:8000", base);
          } else if (resolved.startsWith("http://127.0.0.1:8000/")) {
            resolved = resolved.replace("http://127.0.0.1:8000", base);
          }
        }
        const token = getStoredAuthToken();
        if (token && !resolved.includes("token=")) {
          const sep = resolved.includes("?") ? "&" : "?";
          resolved = `${resolved}${sep}token=${encodeURIComponent(token)}`;
        }
        super(resolved, eventSourceInitDict);
      }
    } as typeof EventSource;
  }
}

export default apiClient;
