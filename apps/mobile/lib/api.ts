const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || "https://fuchsia-x7dwxpzd.manus.space").replace(/\/$/, "");

export type ApiOptions = RequestInit & { json?: unknown };

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { json, headers, ...init } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : init.body,
  });
  const text = await response.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const message = typeof data === "object" && data && "error" in data ? String(data.error) : `فشل الطلب (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const apiBaseUrl = API_BASE_URL;
