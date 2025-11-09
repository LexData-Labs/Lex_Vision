const API_BASE = (import.meta as any).env.VITE_API_BASE || "http://localhost:8000";

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: "administrator" | "employee" | string;
}

export interface AttendanceRecord {
  employee_id: string;
  name: string;
  timestamp: string; // ISO string
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
  // @ts-expect-error allow non-json types
  return undefined as T;
}

export const api = {
  login: (data: LoginRequest) =>
    request<LoginResponse>("/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  attendance: () => request<AttendanceRecord[]>("/attendance"),
  postAttendance: (rec: AttendanceRecord) =>
    request<AttendanceRecord>("/attendance", {
      method: "POST",
      body: JSON.stringify(rec),
    }),
  employees: () => request<{ id: string; name: string }[]>("/employees"),
  health: () => request<{ status: string; camera_index: number; conf_threshold: number; cors_origins: string[] }>("/health"),
};

export { API_BASE };
