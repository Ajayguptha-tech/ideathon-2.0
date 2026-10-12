/**
 * Ideathon 2.0 Client API Configuration
 * Supports production decoupled deployments via VITE_API_URL,
 * with resilient fallback to the production Render backend when hosted on cloud providers (e.g. Vercel),
 * and clean relative path proxying for local development.
 */
const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.') ||
  window.location.hostname.startsWith('10.')
);

const defaultBackendUrl = isBrowser && !isLocalhost
  ? 'https://ideathon-2-0-backend.onrender.com'
  : '';

export const API_BASE_URL = (import.meta.env.VITE_API_URL || defaultBackendUrl).trim().replace(/\/$/, '');

export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}
