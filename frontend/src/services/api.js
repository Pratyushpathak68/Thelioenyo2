import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("lioneyo_admin_token");
  if (token && cfg.url?.includes("/admin")) cfg.headers.Authorization = `Bearer ${token}`;
  const userToken = localStorage.getItem("lioneyo_user_token");
  if (userToken && !cfg.url?.includes("/admin")) cfg.headers.Authorization = `Bearer ${userToken}`;
  return cfg;
});

export default api;
