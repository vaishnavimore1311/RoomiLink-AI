function normalizeApiUrl(url: string): string {
  let cleaned = url.trim();
  if (!cleaned.startsWith("http://") && !cleaned.startsWith("https://")) {
    cleaned = `https://${cleaned}`;
  }
  cleaned = cleaned.replace(/\/+$/, "");
  if (!cleaned.endsWith("/api/v1")) {
    cleaned = `${cleaned}/api/v1`;
  }
  return cleaned;
}

export function getApiBaseUrl(): string {
  // 1. Check runtime localStorage override (allows manual override in console: localStorage.setItem('roomilink_api_url', '...'))
  if (typeof window !== "undefined") {
    try {
      const override = localStorage.getItem("roomilink_api_url");
      if (override && override.trim()) {
        return normalizeApiUrl(override);
      }
    } catch {
      // ignore
    }
  }

  // 2. Check process.env.NEXT_PUBLIC_API_URL
  const rawEnv = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.trim() : "";

  // If env var is set and contains a valid domain with a dot (e.g. "https://roomilink-backend.onrender.com" or "http://localhost:5000")
  if (rawEnv && (rawEnv.includes(".") || rawEnv.includes("localhost"))) {
    // If running in browser on HTTPS (e.g. on Render) but rawEnv is http://localhost, ignore to prevent mixed content
    if (typeof window !== "undefined" && window.location.protocol === "https:" && rawEnv.includes("localhost")) {
      // Fall through to domain derivation below
    } else {
      return normalizeApiUrl(rawEnv);
    }
  }

  // 3. If in browser, inspect window.location
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    // If running on Render (e.g. roomilink-frontend.onrender.com or roomilink-frontend-xxxx.onrender.com)
    if (hostname.endsWith(".onrender.com")) {
      const backendHost = hostname.includes("roomilink-frontend")
        ? hostname.replace("roomilink-frontend", "roomilink-backend")
        : (rawEnv && !rawEnv.includes(".") ? `${rawEnv}.onrender.com` : "roomilink-backend.onrender.com");
      return `https://${backendHost}/api/v1`;
    }
    // If running on another remote host
    if (rawEnv && !rawEnv.includes(".")) {
      return `https://${rawEnv}.onrender.com/api/v1`;
    }
  }

  // 4. If rawEnv was given without a dot (like "roomilink-backend")
  if (rawEnv && !rawEnv.includes(".")) {
    return `https://${rawEnv}.onrender.com/api/v1`;
  }

  // 5. Default to localhost:5000 for local dev
  return "http://localhost:5000/api/v1";
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  requiresAuth?: boolean;
  body?: any;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const { requiresAuth = true, headers = {}, body, ...rest } = options;

  const defaultHeaders: Record<string, string> = {};

  // Do not set Content-Type for FormData; the browser sets multipart/form-data with the correct boundary
  if (!(body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  Object.assign(defaultHeaders, headers as Record<string, string>);

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("roomilink_token");
    if (token) {
      defaultHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint}`;

  const requestBody =
    body && typeof body !== "string" && !(body instanceof FormData)
      ? JSON.stringify(body)
      : body;

  try {
    const response = await fetch(url, {
      headers: defaultHeaders,
      body: requestBody,
      ...rest,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data?.message || `Request failed with status ${response.status}`;
      return { error: errorMessage, status: response.status, data };
    }

    return { data, status: response.status };
  } catch (err: any) {
    console.error(`[RoomiLink API Error] Fetch failed for ${url}:`, err);
    return {
      error: err?.message || `Network connection error fetching from ${url}. Ensure the backend is reachable.`,
      status: 503,
    };
  }
}
