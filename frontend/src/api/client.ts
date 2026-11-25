import axios from "axios";

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

/**
 * Creates an EventSource instance resolving to the correct API base URL.
 */
export const createEventSource = (pathOrUrl: string): EventSource => {
  return new EventSource(apiUrl(pathOrUrl));
};

const getStoredAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem("sentinelx_auth_token") || localStorage.getItem("sentinelx_auth_token");
  } catch {
    return null;
  }
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl() || "",
  timeout: 35000,
});

// Configure interceptor to rewrite localhost URLs and attach auth tokens across axios instances
const applyInterceptors = (instance: typeof axios | typeof apiClient) => {
  instance.interceptors.request.use((config) => {
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

    const token = getStoredAuthToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
};

applyInterceptors(apiClient);
applyInterceptors(axios);

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
      console.warn("API request timed out. Render Free tier instance may be cold-starting (up to 50s).", error);
    }
    return Promise.reject(error);
  }
);

// Global browser window patches for fetch and EventSource
if (typeof window !== "undefined") {
  const rawFetch = window.fetch;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const base = getApiBaseUrl();
    if (base) {
      if (typeof input === "string") {
        if (input.startsWith("/api/")) {
          input = `${base}${input}`;
        } else if (input.startsWith("http://localhost:8000/")) {
          input = input.replace("http://localhost:8000", base);
        } else if (input.startsWith("http://127.0.0.1:8000/")) {
          input = input.replace("http://127.0.0.1:8000", base);
        }
      } else if (input instanceof URL) {
        if (input.origin === window.location.origin && input.pathname.startsWith("/api/")) {
          input = new URL(`${base}${input.pathname}${input.search}`);
        }
      }
    }
    return rawFetch(input, init);
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
        super(resolved, eventSourceInitDict);
      }
    } as typeof EventSource;
  }
}

export default apiClient;
