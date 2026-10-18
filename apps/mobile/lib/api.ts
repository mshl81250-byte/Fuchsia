import { clearSession, getToken } from "./auth-storage";

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.2.2:3000").replace(/\/$/, "");

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_READ_RETRIES = 2;
export type ApiOptions = RequestInit & { json?: unknown; timeoutMs?: number };
export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: string, public readonly retryable = false) { super(message); this.name = "ApiError"; }
}
const isRetrySafe = (method: string) => ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
const isRetryableStatus = (status: number) => status === 408 || status === 429 || status >= 500;
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function requestOnce(path: string, options: ApiOptions): Promise<Response> {
  const { json, headers, timeoutMs = REQUEST_TIMEOUT_MS, ...init } = options;
  const token = await getToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    signal: controller.signal,
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : init.body,
  }); } finally { clearTimeout(timeout); }
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const attempts = isRetrySafe(options.method || "GET") ? MAX_READ_RETRIES + 1 : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await requestOnce(path, options);
      const text = await response.text();
      let data: unknown = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      if (!response.ok) {
        const payload = typeof data === "object" && data ? data as { error?: unknown; code?: unknown } : {};
        if (response.status === 401) await clearSession();
        throw new ApiError(typeof payload.error === "string" ? payload.error : `فشل الطلب (${response.status})`, response.status, typeof payload.code === "string" ? payload.code : undefined, isRetryableStatus(response.status));
      }
      return data as T;
    } catch (error) {
      const retryable = error instanceof ApiError ? error.retryable : true;
      if (!retryable || attempt === attempts - 1) {
        if (error instanceof Error && error.name === "AbortError") throw new ApiError("انتهت مهلة الاتصال بالخادم. تحقق من الإنترنت وحاول مجددًا.", 0, "NETWORK_TIMEOUT", true);
        if (error instanceof TypeError) throw new ApiError("تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مجددًا.", 0, "NETWORK_ERROR", true);
        throw error;
      }
      await delay(350 * (attempt + 1));
    }
  }
  throw new ApiError("تعذر تنفيذ الطلب", 0);
}

export const apiBaseUrl = API_BASE_URL;

export async function logoutFromServer(): Promise<void> {
  const token = await getToken();
  if (token) await apiRequest<void>("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` }, timeoutMs: 8_000 });
}

export async function uploadReceipt(uri: string): Promise<{ url: string }> {
  const token = await getToken();
  const form = new FormData();
  form.append("receipt", { uri, name: `receipt-${Date.now()}.jpg`, type: "image/jpeg" } as unknown as Blob);
  const response = await fetch(`${API_BASE_URL}/api/uploads/receipt`, { method: "POST", headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) await clearSession();
    throw new ApiError(data.error || "تعذر رفع الإيصال", response.status, data.code);
  }
  return data as { url: string };
}
