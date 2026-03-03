const API_BASE = '/team-hub/api/v1';

interface ApiResponse<T> {
  success: boolean;
  message: string;
  code: string;
  data: T;
  meta: {
    traceId: string;
    timestamp: string;
    pagination?: {
      page: number;
      size: number;
      totalItems: number;
      totalPages: number;
    };
  };
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 204) {
      return { success: true, message: 'OK', code: 'SUCCESS', data: null as T, meta: { traceId: '', timestamp: '' } };
    }

    const json = await res.json();

    if (!res.ok) {
      throw new ApiError(json.code || 'UNKNOWN', json.message || 'Request failed', res.status);
    }

    return json;
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  }

  patch<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
  }

  delete(path: string) {
    return this.request(path, { method: 'DELETE' });
  }
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = new ApiClient();
