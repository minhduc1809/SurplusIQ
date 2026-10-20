const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

function getToken(): string | null {
  return localStorage.getItem('sq_store_token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('sq_store_token', token);
  else localStorage.removeItem('sq_store_token');
}

/**
 * Map lỗi HTTP sang copy thân thiện theo rule 13.2 - không hiển thị "Something went wrong".
 */
function friendlyMessage(status: number, serverMessage?: string): string {
  if (serverMessage) return serverMessage;
  switch (status) {
    case 401:
      return 'Phiên đăng nhập đã hết. Đăng nhập lại để tiếp tục.';
    case 403:
      return 'Bạn không có quyền thực hiện hành động này.';
    case 404:
      return 'Không tìm thấy dữ liệu bạn yêu cầu.';
    case 409:
      return 'Dữ liệu đã thay đổi, vui lòng tải lại trang.';
    case 422:
      return 'Thông tin chưa hợp lệ, vui lòng kiểm tra lại.';
    case 429:
      return 'Bạn đang thao tác quá nhanh, vui lòng thử lại sau một chút.';
    case 500:
    case 502:
    case 503:
      return 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.';
    default:
      return 'Không kết nối được. Kiểm tra mạng rồi thử lại.';
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { idempotent?: boolean } = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.idempotent && (options.method === 'POST' || options.method === 'PATCH')) {
    headers['Idempotency-Key'] = crypto.randomUUID();
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, 'NETWORK', friendlyMessage(0));
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    if (res.status === 401) setToken(null);
    throw new ApiError(res.status, body?.code, friendlyMessage(res.status, body?.message));
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, data?: unknown, idempotent = false) =>
    request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined, idempotent }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
