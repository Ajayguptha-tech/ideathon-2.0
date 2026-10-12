/**
 * Ideathon 2.0 Client API Configuration
 * 
 * Guarantees that in production (cloud hosting, Vercel, or custom domains),
 * all API requests target the live Render backend:
 *   https://ideathon-2-0-backend.onrender.com
 * 
 * In local development (localhost, 127.0.0.1, LAN IP),
 * requests use clean relative paths (/api/*) proxied by Vite to port 5000.
 */

export const PROD_BACKEND_URL = 'https://ideathon-2-0-backend.onrender.com';

export function getApiBaseUrl(): string {
  // 1. Explicit build-time or runtime environment variable override
  const envUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
  if (envUrl) {
    return envUrl;
  }

  // 2. Browser runtime check: if running on localhost or private LAN, use Vite proxy
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.');

    if (isLocal) {
      return '';
    }

    // Any cloud host (e.g. *.vercel.app, custom domain) MUST use the production backend
    return PROD_BACKEND_URL;
  }

  // 3. Fallback for any production environment or cloud host
  return PROD_BACKEND_URL;
}

export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const base = getApiBaseUrl();
  return `${base}${cleanEndpoint}`;
}

export const API_BASE_URL = getApiBaseUrl();
