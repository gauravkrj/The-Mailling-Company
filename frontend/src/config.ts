// Central API Base URL Configuration for Production & Development
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

// Utility helper for fetch calls with default credentials and headers
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    credentials: 'include',
    ...options,
  };

  return fetch(url, defaultOptions);
}
