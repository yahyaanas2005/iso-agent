const BASE_URL = '/erp-api';
if (typeof window === 'undefined') {
  // On server (during SSR/build), we might still need the absolute URL if it doesn't support relative rewrites
  // but Next.js rewrites usually handle this.
}

export interface ApiResponse<T = any> {
  result: T;
  success: boolean;
  error: string | null;
  unAuthorizedRequest: boolean;
  __abp: boolean;
}

export const api = async (path: string, options: RequestInit = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;

  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (tenantId) {
    headers.set('Abp-TenantId', tenantId);
  }
  headers.set('Content-Type', 'application/json');

  try {
    const response = await fetch(`${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401 || response.status === 403) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      if (!response.ok) {
        const detail = data.error?.details || '';
        return {
          success: false,
          result: data,
          error: `${data.error?.message || data.message || 'Error'}${detail ? ': ' + detail : ''}`
        };
      }
      return data;
    } else {
      const text = await response.text();
      return { success: response.ok, result: text, error: response.ok ? null : `API Error: ${response.status}` };
    }
  } catch (error: any) {
    console.error('API Fetch Error:', error);
    return {
      success: false,
      result: null,
      error: `Connectivity Error: ${error.message || 'Unknown network error'}. Likely CORS or blocked request.`
    };
  }
};
