import axios from "axios";

export const TOKEN_KEY = "orchestrr_token";
export const USER_KEY = "orchestrr_user";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    // Expired/invalid session anywhere except the auth endpoints -> back to login
    if (error.response?.status === 401 && !url.startsWith("/auth/")) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (window.location.pathname !== "/login") window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

export function errMsg(err) {
  return err?.response?.data?.error || err?.message || "Something went wrong";
}

export default api;
