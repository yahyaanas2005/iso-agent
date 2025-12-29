const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.isolaterp.ai';

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

  const response = await fetch(`${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      // Potential redirect or callback for logout can be handled here
    }
  }

  return response.json();
};
