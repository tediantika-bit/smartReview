import { Admin, QRCodeItem, NFCTagItem, AuditLogItem, DashboardStats, ApiResponse } from '../types';

const TOKEN_KEY = 'smartreview_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include', // for cookie session support
  });

  const isHtml = response.headers.get('content-type')?.includes('text/html');
  const data: ApiResponse<T> = isHtml
    ? {
        success: false,
        error: {
          code: 'BACKEND_NOT_FOUND',
          message: `Endpoint API (${endpoint}) tidak ditemukan (HTTP ${response.status}). Jika Anda mendeploy di Vercel, pastikan fungsi serverless aktif.`,
        },
      }
    : await response.json().catch(() => ({
        success: false,
        error: { code: 'PARSE_ERROR', message: 'Gagal memproses respon dari server.' },
      }));

  if (!response.ok || !data.success) {
    if (response.status === 401) {
      removeStoredToken();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('smartreview:unauthorized'));
      }
    }
    const errorMsg = data.error?.message || `Terjadi kesalahan (HTTP ${response.status})`;
    throw new Error(errorMsg);
  }

  return data.data as T;
}

export const api = {
  // Auth
  auth: {
    login: async (email: string, password: string) => {
      try {
        const res = await request<{ token: string; admin: Admin }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        if (res.token) {
          setStoredToken(res.token);
        }
        localStorage.removeItem('smartreview_is_fallback');
        return res;
      } catch (err: any) {
        // Fallback for static hosting / Vercel without active backend function
        const isServerUnavailable =
          err.message?.includes('tidak ditemukan') ||
          err.message?.includes('404') ||
          err.message?.includes('PARSE_ERROR') ||
          err.message?.includes('Failed to fetch') ||
          err.message?.includes('Gagal memproses respon');

        if (isServerUnavailable) {
          const trimmedEmail = email.trim().toLowerCase();
          const validEmail = 'admin@smartreview.id';
          const validPassword = 'admin123456';

          if (trimmedEmail === validEmail && password === validPassword) {
            const fallbackToken = 'smartreview_fallback_token_' + Date.now();
            const adminObj: Admin = {
              id: 'admin_local_primary',
              email: validEmail,
              created_at: new Date().toISOString(),
            };
            setStoredToken(fallbackToken);
            localStorage.setItem('smartreview_fallback_admin', JSON.stringify(adminObj));
            localStorage.setItem('smartreview_is_fallback', 'true');
            return { token: fallbackToken, admin: adminObj };
          } else {
            throw new Error(
              'Backend server belum terhubung di hosting Anda. Gunakan kredensial default: admin@smartreview.id / admin123456'
            );
          }
        }
        throw err;
      }
    },
    logout: async () => {
      try {
        await request('/api/auth/logout', { method: 'POST' }).catch(() => {});
      } finally {
        removeStoredToken();
        localStorage.removeItem('smartreview_fallback_admin');
        localStorage.removeItem('smartreview_is_fallback');
      }
    },
    me: async () => {
      try {
        return await request<{ admin: Admin }>('/api/auth/me');
      } catch (err) {
        const fallback = localStorage.getItem('smartreview_fallback_admin');
        const token = getStoredToken();
        if (token && fallback) {
          try {
            return { admin: JSON.parse(fallback) };
          } catch {
            // ignore
          }
        }
        throw err;
      }
    },
    changePassword: async (current_password: string, new_password: string) => {
      return request<{ message: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ current_password, new_password }),
      });
    },
  },

  // Dashboard
  dashboard: {
    getStats: async () => {
      return request<DashboardStats>('/api/dashboard');
    },
  },

  // QR Codes
  qr: {
    list: async (search?: string, status?: string) => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const query = params.toString() ? `?${params.toString()}` : '';
      return request<QRCodeItem[]>(`/api/qr-codes${query}`);
    },
    getByPublicId: async (publicId: string) => {
      return request<QRCodeItem>(`/api/qr-codes/${encodeURIComponent(publicId)}`);
    },
    activate: async (publicId: string, destination_url: string, name?: string) => {
      return request<QRCodeItem>(`/api/qr-codes/${encodeURIComponent(publicId)}/activate`, {
        method: 'POST',
        body: JSON.stringify({ destination_url, name }),
      });
    },
    updateDestination: async (publicId: string, destination_url: string, name?: string) => {
      return request<QRCodeItem>(`/api/qr-codes/${encodeURIComponent(publicId)}/destination`, {
        method: 'PATCH',
        body: JSON.stringify({ destination_url, name }),
      });
    },
    disable: async (publicId: string, reason?: string) => {
      return request<QRCodeItem>(`/api/qr-codes/${encodeURIComponent(publicId)}/disable`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
    reactivate: async (publicId: string) => {
      return request<QRCodeItem>(`/api/qr-codes/${encodeURIComponent(publicId)}/reactivate`, {
        method: 'POST',
      });
    },
    provision: async (count: number, name_prefix?: string) => {
      return request<QRCodeItem[]>('/api/qr-codes/provision', {
        method: 'POST',
        body: JSON.stringify({ count, name_prefix }),
      });
    },
  },

  // NFC Tags
  nfc: {
    list: async () => {
      return request<NFCTagItem[]>('/api/nfc-tags');
    },
    create: async (payload: {
      name: string;
      mode: 'direct' | 'redirect';
      destination_url?: string | null;
      redirect_id?: string | null;
      public_id?: string | null;
    }) => {
      return request<NFCTagItem>('/api/nfc-tags', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    update: async (id: string, updates: { name?: string; destination_url?: string }) => {
      return request<NFCTagItem>(`/api/nfc-tags/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    },
    confirmWrite: async (id: string, status: 'success' | 'failed', details?: Record<string, any>) => {
      return request<NFCTagItem>(`/api/nfc-tags/${id}/write-confirmation`, {
        method: 'POST',
        body: JSON.stringify({ status, details }),
      });
    },
  },

  // Audit Logs
  audit: {
    list: async (limit = 100) => {
      return request<AuditLogItem[]>(`/api/audit-logs?limit=${limit}`);
    },
  },

  // Backup & Restore
  backup: {
    downloadUrl: '/api/backup',
    restore: async (backupData: any) => {
      return request<{ message: string }>('/api/restore', {
        method: 'POST',
        body: JSON.stringify(backupData),
      });
    },
  },

  // System & Database Diagnostics
  system: {
    getDatabaseStatus: async () => {
      return request<{
        provider: string;
        connected: boolean;
        latencyMs?: number;
        projectId: string;
        databaseId: string;
        error?: string;
        counts: { qrCodes: number; nfcTags: number; auditLogs: number };
        dualPersistence: { cloudFirestore: string; localCache: string; offlineSupport: string };
        rulesStatus: string;
      }>('/api/system/database-status');
    },
  },
};
