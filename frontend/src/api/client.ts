import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (typeof window !== "undefined" ? "" : "http://127.0.0.1:8000"),
  timeout: 35000,
});

apiClient.interceptors.request.use((config) => {
  const token =
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem("sentinelx_auth_token") || localStorage.getItem("sentinelx_auth_token")
      : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/session")
    ) {
      originalRequest._retry = true;
      try {
        const sessionRes = await axios.post("/api/v1/forensics/auth/session", {
          username: "INVESTIGATOR_DELHI",
        });
        const token = sessionRes.data?.access_token;
        if (token) {
          sessionStorage.setItem("sentinelx_auth_token", token);
          originalRequest.headers["Authorization"] = `Bearer ${token}`;
          return apiClient(originalRequest);
        }
      } catch (e) {
        console.warn("Silent apiClient re-auth failed:", e);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
