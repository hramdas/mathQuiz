/**
 * Base URL for the API server (REST + Socket.IO).
 * Set VITE_SERVER_URL in .env (e.g. http://localhost:4000).
 * Leave unset to use same-origin URLs (Vite dev proxy for /api and /socket.io).
 */
const raw = import.meta.env.VITE_SERVER_URL?.trim();

export const SERVER_URL =
  raw && raw.length > 0 ? raw.replace(/\/$/, '') : undefined;

/** Build full URL for REST endpoints. Uses relative path when SERVER_URL is unset. */
export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return SERVER_URL ? `${SERVER_URL}${p}` : p;
}
