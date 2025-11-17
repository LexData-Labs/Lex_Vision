// Derive API base:
// - Use VITE_API_BASE if provided
// - For network access, use HTTP with port 8000 (direct backend access)
// - Fallback to localhost:8000
const deriveApiBase = () => {
  const envBase = (import.meta as any).env.VITE_API_BASE as string | undefined;
  if (envBase) return envBase;
  try {
    const hostname = (window as any)?.location?.hostname;
    
    // For network access, use HTTP with port 8000 (direct backend access)
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `http://${hostname}:8000`;
    }
  } catch {
    // ignore if window is not available
  }
  return "http://localhost:8000";
};
const API_BASE = deriveApiBase();

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: "administrator" | "employee" | "editor" | string;
  employee_id: string;
  name: string;
  password_reset_required: boolean;
}

export interface PasswordGenerateResponse {
  employee_id: string;
  password: string;
  message: string;
}

export interface AttendanceRecord {
  employee_id: string;
  name: string;
  timestamp: string; // ISO string
  camera_id?: string;
  entry_type?: "entry" | "exit" | null;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  category: "security" | "face_recognition" | "camera" | "system" | "user";
  status: "active" | "acknowledged" | "resolved";
  timestamp: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  location?: string;
  cameraId?: string;
}

export interface CameraConfig {
  id: string;
  name: string;
  role: "entry" | "exit" | "live" | "none";
  status: "online" | "offline";
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
    const contentType = res.headers.get("content-type") || "";
    let detail = "";
    if (contentType.includes("application/json")) {
      try {
        const body = await res.json();
        detail = body?.detail || JSON.stringify(body);
      } catch {
        // ignore
      }
    } else {
      try {
        detail = await res.text();
      } catch {
        // ignore
      }
    }
    throw new Error(detail || `Request failed: ${res.status}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as T;
  }
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
  employees: () => request<{ id: string; name: string; has_password: boolean; password_reset_required: boolean; last_login: string | null; role: string }[]>("/employees"),
  createEmployee: (emp: { id: string; name: string; role?: string }) =>
    request<{ id: string; name: string; role: string }>("/employees", {
      method: "POST",
      body: JSON.stringify(emp),
    }),
  updateEmployee: (employeeId: string, data: { newEmployeeId?: string; name?: string; role?: string }) => {
    const params = new URLSearchParams();
    if (data.newEmployeeId) params.append("new_employee_id", data.newEmployeeId);
    if (data.name) params.append("name", data.name);
    if (data.role) params.append("role", data.role);
    return request<{ employee_id: string; name: string; role: string; message: string }>(`/employees/${employeeId}?${params.toString()}`, {
      method: "PATCH",
    });
  },
  deleteEmployee: (employeeId: string) =>
    request<{ status: string; message: string }>(`/employees/${employeeId}`, {
      method: "DELETE",
    }),
  reloadEmployees: () => request<{ status: string; count: number }>("/employees/reload", { method: "POST" }),
  uploadEmployee: async (data: { id: string; name: string; file: File }) => {
    const formData = new FormData();
    formData.append("id", data.id);
    formData.append("name", data.name);
    formData.append("image", data.file, data.file.name);
    const res = await fetch(`${API_BASE}/employees/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Upload failed: ${res.status}`);
    }
    return (await res.json()) as { id: string; name: string };
  },
  health: () => request<{ status: string; camera_index: number; conf_threshold: number; cors_origins: string[] }>("/health"),

  // Alerts API
  alerts: () => request<Alert[]>("/alerts"),
  createAlert: (alert: Alert) =>
    request<Alert>("/alerts", {
      method: "POST",
      body: JSON.stringify(alert),
    }),
  updateAlert: (alertId: string, status: string, acknowledgedBy?: string) => {
    const params = new URLSearchParams();
    if (status) params.append("status_update", status);
    if (acknowledgedBy) params.append("acknowledged_by", acknowledgedBy);
    return request<Alert>(`/alerts/${alertId}?${params.toString()}`, {
      method: "PATCH",
    });
  },

  // Camera API
  cameras: () => request<CameraConfig[]>("/cameras"),
  discoverCameras: () => request<{ cameras: Array<{ index: number; id: string; name: string; available: boolean }> }>("/cameras/discover"),
  updateCamera: (cameraId: string, role: string) => {
    const params = new URLSearchParams();
    if (role) params.append("role", role);
    return request<CameraConfig>(`/cameras/${cameraId}?${params.toString()}`, {
      method: "PATCH",
    });
  },

  // Password Management API
  generatePassword: (employeeId: string) =>
    request<PasswordGenerateResponse>(`/employees/${employeeId}/generate-password`, {
      method: "POST",
    }),
  resetPassword: (employeeId: string, newPassword: string) => {
    const params = new URLSearchParams();
    params.append("new_password", newPassword);
    return request<{ message: string }>(`/employees/${employeeId}/reset-password?${params.toString()}`, {
      method: "POST",
    });
  },

  // Database Management API
  clearDatabase: () =>
    request<{ status: string; message: string; deleted: { employees: number; attendance: number }; note: string }>("/database/clear-all", {
      method: "POST",
    }),

  getVideoFeedUrl: (cameraIndex?: number) => {
    // Video feeds use direct backend endpoint (HTTP, port 8000)
    // Always use the same base as API_BASE (which is already http://hostname:8000)
    let videoBase = API_BASE;
    
    // Remove /api prefix if present (shouldn't be, but just in case)
    if (videoBase.endsWith('/api')) {
      videoBase = videoBase.slice(0, -4);
    } else if (videoBase.includes('/api/')) {
      videoBase = videoBase.replace('/api', '');
    }
    
    // Ensure we're using HTTP for video feeds (direct backend access)
    try {
      const hostname = (window as any)?.location?.hostname;
      if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
        // Always use HTTP with port 8000 for network access
        videoBase = `http://${hostname}:8000`;
      }
    } catch {
      // Keep existing videoBase if window is not available
    }
    
    if (cameraIndex !== undefined) {
      return `${videoBase}/video_feed/${cameraIndex}`;
    }
    return `${videoBase}/video_feed`;
  },
};

export { API_BASE };
