const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const ACCESS = "bms_admin_access";
const REFRESH = "bms_admin_refresh";
const USER = "bms_admin_user";

export function getAccess() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS);
}

export function savedUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSession(data) {
  localStorage.setItem(ACCESS, data.access);
  localStorage.setItem(REFRESH, data.refresh);
  if (data.user) localStorage.setItem(USER, JSON.stringify(data.user));
}

export function clearSession() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem(USER);
}

function errorMessage(data) {
  if (!data) return "Request failed.";
  if (typeof data === "string") return data;
  if (typeof data.detail === "string") return data.detail;
  const parts = [];
  Object.entries(data).forEach(([key, value]) => {
    if (key === "conflicts") return;
    const text = Array.isArray(value)
      ? value.map((item) => (typeof item === "string" ? item : JSON.stringify(item))).join(" ")
      : typeof value === "string"
        ? value
        : JSON.stringify(value);
    parts.push(key === "non_field_errors" ? text : `${key}: ${text}`);
  });
  return parts.join(" ") || "Request failed.";
}

async function refreshAccess() {
  const refresh = localStorage.getItem(REFRESH);
  if (!refresh) return null;
  const response = await fetch(`${API_URL}/api/v1/admin/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!response.ok) {
    clearSession();
    return null;
  }
  const data = await response.json();
  localStorage.setItem(ACCESS, data.access);
  if (data.refresh) localStorage.setItem(REFRESH, data.refresh);
  return data.access;
}

export async function api(path, { method = "GET", body, form, query } = {}) {
  const url = new URL(`${API_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });
  }

  const headers = {};
  let payload;
  if (form) {
    payload = form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const send = (token) => {
    const requestHeaders = { ...headers };
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
    return fetch(url, { method, headers: requestHeaders, body: payload });
  };

  let response = await send(getAccess());
  if (response.status === 401 && !path.includes("/auth/login")) {
    const token = await refreshAccess();
    if (!token) {
      const error = new Error("Your session expired. Log in again.");
      error.status = 401;
      throw error;
    }
    response = await send(token);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const error = new Error(errorMessage(data));
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

export async function downloadCsv(path, query) {
  const url = new URL(`${API_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${getAccess()}` },
  });
  if (!response.ok) {
    throw new Error("Could not download the report.");
  }
  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "revenue.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}
