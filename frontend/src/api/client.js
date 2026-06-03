// Thin fetch wrapper that injects the JWT and normalises errors.
// Everything goes through "/api" which Vite/the gateway proxies to the services.
const BASE = '/api';

// Read the stored access token (set at login).
function getToken() {
  return localStorage.getItem('fems_token');
}

// Core request helper used by all verbs below.
async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`; // attach JWT when present

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    // Only serialise a body for methods that send one.
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Export endpoints (CSV/PDF) return text/binary, not JSON — hand back the raw
  // Response so the caller can read .blob()/.text() itself.
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return res;
  }

  // JSON path: parse, and on a non-2xx surface the server's { error } message.
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status; // expose status so callers can branch (e.g. 403)
    throw err;
  }
  return data;
}

// Public API surface used across the app.
export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  put: (p, b) => request('PUT', p, b),
  del: (p, b) => request('DELETE', p, b),       // body carries the OTP for protected deletes
  downloadUrl: (p) => `${BASE}${p}`,            // build a full URL for file downloads
  token: getToken,                               // exposed so download fetches can add the header
};
