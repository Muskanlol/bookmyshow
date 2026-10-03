const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const ACCESS = "bms_access";
const REFRESH = "bms_refresh";
const USER = "bms_user";
const CITY = "bms_city";

function notify(name) {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(name));
}

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
  notify("bms-auth");
}

export function clearSession() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem(USER);
  notify("bms-auth");
}

export function savedCity() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CITY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCity(city) {
  localStorage.setItem(CITY, JSON.stringify({ id: city.id, name: city.name, state: city.state }));
  notify("bms-city");
}

export function safeNext(value) {
  if (typeof value === "string" && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

function errorMessage(data) {
  if (!data) return "Something went wrong. Try again.";
  if (typeof data === "string") return data;
  if (typeof data.detail === "string") return data.detail;
  const parts = [];
  Object.entries(data).forEach(([key, value]) => {
    const text = Array.isArray(value) ? value.join(" ") : String(value);
    parts.push(key === "non_field_errors" ? text : text);
  });
  return parts.join(" ") || "Something went wrong. Try again.";
}

async function refreshAccess() {
  const refresh = localStorage.getItem(REFRESH);
  if (!refresh) return null;
  const response = await fetch(`${API_URL}/api/v1/auth/refresh/`, {
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

export async function api(path, { method = "GET", body, query } = {}) {
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
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const send = (token) => {
    const requestHeaders = { ...headers };
    if (token) requestHeaders.Authorization = `Bearer ${token}`;
    return fetch(url, { method, headers: requestHeaders, body: payload });
  };

  const hadToken = Boolean(getAccess());
  let response = await send(getAccess());
  if (response.status === 401 && hadToken && !path.includes("/auth/")) {
    const token = await refreshAccess();
    if (!token) {
      const error = new Error("Your session expired. Sign in again.");
      error.status = 401;
      throw error;
    }
    response = await send(token);
  }

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
    throw error;
  }
  return data;
}
