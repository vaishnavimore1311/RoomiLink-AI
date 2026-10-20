// Central API client for communicating with Flask backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

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

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

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
    return {
      error: err?.message || "Network connection error. Ensure the backend server is running.",
      status: 503,
    };
  }
}
