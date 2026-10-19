import axios from "axios";


const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  timeout: 35000,
});

apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("sentinelx_auth_token") || localStorage.getItem("sentinelx_auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;