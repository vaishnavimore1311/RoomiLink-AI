// Central API client for communicating with Flask backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const { requiresAuth = true, headers = {}, ...rest } = options;

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (requiresAuth && typeof window !== "undefined") {
    const token = localStorage.getItem("roomilink_token");
    if (token) {
      defaultHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: defaultHeaders,
      ...rest,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = data?.message || `Request failed with status ${response.status}`;
      return { error: errorMessage, status: response.status, data };
    }

    return { data, status: response.status };
  } catch (err: any) {
    return {
      error: err?.message || "Network connection error. Ensure the backend server is running.",
      status: 503,
    };
  }
}
