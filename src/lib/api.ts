import axios, { AxiosError } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

export const TOKEN_KEY = "ajap_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiErrorShape {
  message: string;
  code?: string;
  feature?: string;
  limit?: number;
  used?: number;
  errors?: unknown;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  feature?: string;
  limit?: number;
  used?: number;
  errors?: unknown;

  constructor(status: number, data: ApiErrorShape) {
    super(data.message || "Something went wrong");
    this.name = "ApiError";
    this.status = status;
    this.code = data.code;
    this.feature = data.feature;
    this.limit = data.limit;
    this.used = data.used;
    this.errors = data.errors;
  }

  get isPaywall(): boolean {
    return this.status === 402 || this.code === "LIMIT_REACHED";
  }

  get isAuth(): boolean {
    return this.status === 401;
  }
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorShape>) => {
    if (!error.response) {
      return Promise.reject(
        new ApiError(0, { message: "Cannot reach the server. Is it running?" })
      );
    }

    const { status, data } = error.response;

    if (status === 401 && typeof window !== "undefined") {
      clearToken();
      const path = window.location.pathname;
      if (!path.startsWith("/login") && !path.startsWith("/signup")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(
      new ApiError(status, data ?? { message: "Request failed" })
    );
  }
);

export function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function formatSalary(min: number | null, max: number | null): string {
  if (!min && !max) return "Not disclosed";

  const lakh = (value: number) => {
    if (value >= 100000) return `${(value / 100000).toFixed(1).replace(/\.0$/, "")}L`;
    if (value >= 1000) return `${Math.round(value / 1000)}K`;
    return String(value);
  };

  if (min && max) return `₹${lakh(min)} – ₹${lakh(max)}`;
  return `₹${lakh((min ?? max)!)}+`;
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default api;