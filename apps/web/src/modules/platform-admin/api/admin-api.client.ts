/// <reference types="vite/client" />

// =====================================================
// 1. CẤU HÌNH API
// =====================================================

/**
 * Địa chỉ Backend được lấy từ biến môi trường Vite.
 *
 * Nếu chưa cấu hình, sử dụng Backend cục bộ
 * đang chạy trên cổng 4000.
 *
 * Không tự thêm /api vì trong Backend hiện tại,
 * /api là địa chỉ Swagger, không phải API prefix
 * mặc định.
 */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() ||
  import.meta.env.VITE_API_URL?.trim() ||
  'http://localhost:4000';

/**
 * Thời gian chờ mặc định cho mỗi request.
 */
const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Khóa dùng để lưu token riêng cho Super Admin.
 *
 * sessionStorage chỉ tồn tại trong phiên tab.
 * Đây là giải pháp tạm thời tương thích với API
 * hiện có nhận refreshToken trong request body.
 *
 * Khi Backend hỗ trợ HttpOnly Secure Cookie,
 * nên chuyển sang cơ chế lưu phiên an toàn hơn.
 */
const TOKEN_STORAGE_KEY = 'surplusiq.platform-admin.tokens.v1';

/**
 * Sự kiện thông báo phiên Admin đã hết hạn.
 */
export const ADMIN_SESSION_EXPIRED_EVENT = 'surplusiq:admin-session-expired';

// =====================================================
// 2. ĐỊNH NGHĨA KIỂU DỮ LIỆU
// =====================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiQueryValue = string | number | boolean | null | undefined;

export type ApiQueryParams = Record<string, ApiQueryValue>;

/**
 * Cặp token được Backend trả về khi đăng nhập.
 */
export interface AdminAuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Cấu hình cho một request.
 *
 * auth:
 *   Có gửi Bearer Token hay không.
 *
 * retryOnUnauthorized:
 *   Có thử refresh token khi nhận HTTP 401.
 *
 * timeoutMs:
 *   Thời gian chờ tối đa tính theo mili giây.
 *
 * signal:
 *   Cho phép component cha hủy request.
 */
export interface AdminApiRequestOptions {
  method?: HttpMethod;

  params?: ApiQueryParams;

  headers?: HeadersInit;

  body?: unknown;

  auth?: boolean;

  retryOnUnauthorized?: boolean;

  timeoutMs?: number;

  signal?: AbortSignal;
}

/**
 * Cấu trúc lỗi do API Client chuẩn hóa.
 *
 * status = 0 nghĩa là lỗi mạng, timeout
 * hoặc request bị hủy trước khi nhận HTTP response.
 */
export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);

    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
  }
}

// =====================================================
// 3. QUẢN LÝ TOKEN
// =====================================================

/**
 * Phiên bản của lần đăng nhập hiện tại.
 *
 * Biến này giúp ngăn request refresh cũ
 * ghi đè token sau khi người dùng đăng xuất
 * hoặc đăng nhập bằng một tài khoản khác.
 */
let sessionVersion = 0;

/**
 * Đọc token từ sessionStorage.
 *
 * Nếu dữ liệu không hợp lệ, trả về null.
 */
function readTokens(): AdminAuthTokens | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const tokens = parsed as Partial<AdminAuthTokens>;

    if (
      typeof tokens.accessToken !== 'string' ||
      typeof tokens.refreshToken !== 'string' ||
      !tokens.accessToken ||
      !tokens.refreshToken
    ) {
      return null;
    }

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  } catch {
    return null;
  }
}

/**
 * Lưu token sau khi đăng nhập thành công.
 *
 * Hàm này chỉ nên được gọi sau khi tầng
 * Authentication xác minh user.role === 'ADMIN'.
 */
function writeTokens(tokens: AdminAuthTokens): void {
  if (!tokens.accessToken?.trim() || !tokens.refreshToken?.trim()) {
    throw new AdminApiError('Thông tin phiên đăng nhập không hợp lệ.', 0, 'INVALID_TOKENS');
  }

  if (typeof window === 'undefined') {
    throw new AdminApiError('Không thể lưu phiên ngoài trình duyệt.', 0, 'STORAGE_UNAVAILABLE');
  }

  try {
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));

    sessionVersion += 1;
  } catch {
    throw new AdminApiError('Trình duyệt không thể lưu phiên đăng nhập.', 0, 'STORAGE_UNAVAILABLE');
  }
}

/**
 * Xóa phiên đăng nhập ở phía Frontend.
 *
 * Lưu ý: Việc xóa token cục bộ không tự thu hồi
 * refresh token trên máy chủ.
 */
function clearTokens(): void {
  sessionVersion += 1;

  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Không để lỗi lưu trữ làm gián đoạn giao diện.
  }
}

/**
 * Cập nhật access token sau khi refresh.
 *
 * Không đổi sessionVersion vì đây vẫn là
 * cùng một phiên đăng nhập.
 */
function updateAccessToken(accessToken: string): void {
  const current = readTokens();

  if (!current) {
    throw new AdminApiError('Không tìm thấy phiên đăng nhập.', 401, 'SESSION_NOT_FOUND');
  }

  try {
    window.sessionStorage.setItem(
      TOKEN_STORAGE_KEY,
      JSON.stringify({
        ...current,
        accessToken,
      }),
    );
  } catch {
    throw new AdminApiError('Không thể cập nhật phiên đăng nhập.', 0, 'STORAGE_UNAVAILABLE');
  }
}

/**
 * Cung cấp các thao tác phiên cho tầng Auth.
 *
 * Không lưu mật khẩu hoặc thông tin người dùng
 * vào sessionStorage của API Client.
 */
export const adminTokenStorage = {
  get: readTokens,
  set: writeTokens,
  clear: clearTokens,
};

// =====================================================
// 4. XỬ LÝ LỖI API
// =====================================================

/**
 * Lấy thông báo lỗi từ response của NestJS.
 *
 * NestJS có thể trả message dưới dạng chuỗi
 * hoặc mảng thông báo validation.
 */
function getServerErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload !== 'object' || payload === null) {
    return fallback;
  }

  const data = payload as Record<string, unknown>;

  if (typeof data.message === 'string') {
    return data.message;
  }

  if (Array.isArray(data.message)) {
    const messages = data.message.filter((item): item is string => typeof item === 'string');

    if (messages.length > 0) {
      return messages.join('. ');
    }
  }

  return fallback;
}

/**
 * Lấy mã lỗi nghiệp vụ nếu Backend có trả về.
 */
function getServerErrorCode(payload: unknown, fallback: string): string {
  if (typeof payload === 'object' && payload !== null) {
    const data = payload as Record<string, unknown>;

    if (typeof data.code === 'string') {
      return data.code;
    }
  }

  return fallback;
}

/**
 * Tạo thông báo lỗi mặc định cho HTTP status.
 */
function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Dữ liệu gửi lên không hợp lệ.';

    case 401:
      return 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.';

    case 403:
      return 'Bạn không có quyền thực hiện thao tác này.';

    case 404:
      return 'Không tìm thấy tài nguyên yêu cầu.';

    case 409:
      return 'Dữ liệu đang bị xung đột.';

    case 422:
      return 'Dữ liệu không đáp ứng quy tắc nghiệp vụ.';

    case 429:
      return 'Có quá nhiều yêu cầu. Vui lòng thử lại sau.';

    default:
      return status >= 500 ? 'Máy chủ đang gặp sự cố.' : `Yêu cầu thất bại (HTTP ${status}).`;
  }
}

// =====================================================
// 5. XÂY DỰNG URL
// =====================================================

/**
 * Ghép API_BASE_URL với đường dẫn API.
 *
 * Hỗ trợ cả:
 * - http://localhost:4000
 * - http://localhost:4000/v1
 * - /backend
 *
 * Không chấp nhận URL bên ngoài làm endpoint
 * để tránh vô tình gửi Bearer Token sai máy chủ.
 */
function buildApiUrl(path: string, params?: ApiQueryParams): string {
  const cleanPath = path.replace(/^\/+/, '');

  if (
    !cleanPath ||
    cleanPath.startsWith('//') ||
    cleanPath.includes('://') ||
    cleanPath.split('/').includes('..')
  ) {
    throw new AdminApiError('Đường dẫn API không hợp lệ.', 0, 'INVALID_API_PATH');
  }

  const base = API_BASE_URL.replace(/\/+$/, '');

  const rawUrl = `${base}/${cleanPath}`;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';

  const url = new URL(rawUrl, origin);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

// =====================================================
// 6. THỰC HIỆN MỘT HTTP REQUEST
// =====================================================

/**
 * Hàm này chỉ gửi một request duy nhất.
 *
 * Không tự refresh token tại đây để tránh
 * vòng lặp khi gọi POST /auth/refresh.
 */
async function sendOnce<T>(
  path: string,
  options: AdminApiRequestOptions,
  accessToken: string | null,
): Promise<T> {
  const {
    method = 'GET',
    params,
    headers: customHeaders,
    body,
    auth = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
  } = options;

  const url = buildApiUrl(path, params);

  const headers = new Headers(customHeaders);

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  // Chỉ gửi Bearer Token khi request yêu cầu xác thực.
  // Khi auth = false, xóa Authorization do caller thêm.
  if (auth && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  } else {
    headers.delete('Authorization');
  }

  let requestBody: BodyInit | undefined;

  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      // Để trình duyệt tự gắn multipart boundary.
      headers.delete('Content-Type');
      requestBody = body;
    } else if (body instanceof Blob) {
      requestBody = body;
    } else {
      // Backend NestJS hiện chủ yếu nhận dữ liệu JSON.
      headers.set('Content-Type', 'application/json');

      requestBody = JSON.stringify(body);
    }
  }

  // Bộ điều khiển dùng chung cho timeout và hủy request.
  const controller = new AbortController();

  let timedOut = false;

  const handleExternalAbort = () => {
    controller.abort();
  };

  if (signal?.aborted) {
    controller.abort();
  } else {
    signal?.addEventListener('abort', handleExternalAbort, { once: true });
  }

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: requestBody,
      signal: controller.signal,

      // Backend hiện dùng token trong Header/Body,
      // chưa sử dụng cookie để xác thực API Admin.
      credentials: 'omit',
    });

    // HTTP 204 hoặc 205 không có nội dung phản hồi.
    if (response.status === 204 || response.status === 205) {
      return undefined as T;
    }

    const responseText = await response.text();

    let payload: unknown = undefined;

    if (responseText) {
      try {
        payload = JSON.parse(responseText);
      } catch {
        const contentType = response.headers.get('content-type') || '';

        if (response.ok && contentType.includes('json')) {
          throw new AdminApiError(
            'Máy chủ trả về dữ liệu JSON không hợp lệ.',
            response.status,
            'INVALID_RESPONSE',
          );
        }

        payload = responseText;
      }
    }

    if (!response.ok) {
      throw new AdminApiError(
        getServerErrorMessage(payload, getDefaultErrorMessage(response.status)),
        response.status,
        getServerErrorCode(payload, `HTTP_${response.status}`),
      );
    }

    return payload as T;
  } catch (error) {
    // Giữ nguyên lỗi đã được API Client chuẩn hóa.
    if (error instanceof AdminApiError) {
      throw error;
    }

    if (timedOut) {
      throw new AdminApiError('Kết nối quá thời gian chờ. Vui lòng thử lại.', 0, 'REQUEST_TIMEOUT');
    }

    if (controller.signal.aborted) {
      throw new AdminApiError('Yêu cầu đã bị hủy.', 0, 'REQUEST_ABORTED');
    }

    throw new AdminApiError('Không thể kết nối tới Backend SurplusIQ.', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeoutId);

    signal?.removeEventListener('abort', handleExternalAbort);
  }
}

// =====================================================
// 7. TỰ ĐỘNG REFRESH ACCESS TOKEN
// =====================================================

/**
 * Chỉ cho phép một request refresh chạy tại một
 * thời điểm để tránh nhiều API đồng thời gửi
 * refresh token liên tục khi access token hết hạn.
 */
let refreshPromise: Promise<string> | null = null;

/**
 * Thông báo cho tầng Authentication rằng phiên
 * đăng nhập đã hết hạn.
 */
function emitSessionExpired(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ADMIN_SESSION_EXPIRED_EVENT));
  }
}

/**
 * Xóa phiên hiện tại nếu vẫn là phiên đã thất bại.
 */
function expireCurrentSession(expectedVersion: number): void {
  if (sessionVersion !== expectedVersion) {
    return;
  }

  clearTokens();
  emitSessionExpired();
}

/**
 * Thực hiện refresh bằng đúng endpoint Backend:
 *
 * POST /auth/refresh
 * Body: { refreshToken: string }
 * Response: { accessToken: string }
 *
 * Backend hiện tại không trả refresh token mới
 * khi refresh, vì vậy giữ nguyên refresh token cũ.
 */
async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const tokens = readTokens();

  if (!tokens) {
    throw new AdminApiError('Không tìm thấy phiên đăng nhập để làm mới.', 401, 'SESSION_NOT_FOUND');
  }

  const currentVersion = sessionVersion;

  const task = (async (): Promise<string> => {
    try {
      const result = await sendOnce<{
        accessToken: string;
      }>(
        '/auth/refresh',
        {
          method: 'POST',
          auth: false,
          retryOnUnauthorized: false,
          body: {
            refreshToken: tokens.refreshToken,
          },
        },
        null,
      );

      // Không cho request cũ ghi token đè lên
      // phiên mới sau khi đăng xuất/đăng nhập.
      if (sessionVersion !== currentVersion) {
        throw new AdminApiError('Phiên đăng nhập đã thay đổi.', 401, 'SESSION_CHANGED');
      }

      if (typeof result?.accessToken !== 'string' || !result.accessToken) {
        throw new AdminApiError(
          'Phản hồi refresh token không hợp lệ.',
          401,
          'INVALID_REFRESH_RESPONSE',
        );
      }

      updateAccessToken(result.accessToken);

      return result.accessToken;
    } catch (error) {
      // Chỉ kết thúc phiên khi máy chủ xác nhận
      // refresh token không còn hợp lệ.
      //
      // Không tự đăng xuất nếu chỉ mất mạng
      // hoặc máy chủ tạm thời trả lỗi 500.
      if (
        error instanceof AdminApiError &&
        ([400, 401, 403].includes(error.status) || error.code === 'INVALID_REFRESH_RESPONSE')
      ) {
        expireCurrentSession(currentVersion);
      }

      throw error;
    }
  })();

  refreshPromise = task;

  try {
    return await task;
  } finally {
    if (refreshPromise === task) {
      refreshPromise = null;
    }
  }
}

// =====================================================
// 8. REQUEST CHÍNH CÓ XỬ LÝ 401
// =====================================================

/**
 * Luồng request:
 *
 * 1. Gửi request với access token hiện tại.
 * 2. Nếu thành công, trả dữ liệu.
 * 3. Nếu HTTP 403, trả lỗi phân quyền.
 * 4. Nếu HTTP 401, thử refresh token một lần.
 * 5. Gửi lại request bằng access token mới.
 * 6. Nếu tiếp tục 401, kết thúc phiên.
 *
 * Không tự động retry các lỗi HTTP khác.
 */
export async function adminApiRequest<T>(
  path: string,
  options: AdminApiRequestOptions = {},
): Promise<T> {
  const requiresAuth = options.auth !== false;

  const allowsRefresh = options.retryOnUnauthorized !== false;

  const startingVersion = sessionVersion;

  const originalToken = requiresAuth ? (readTokens()?.accessToken ?? null) : null;

  try {
    return await sendOnce<T>(path, options, originalToken);
  } catch (error) {
    const isUnauthorized = error instanceof AdminApiError && error.status === 401;

    if (!isUnauthorized || !requiresAuth || !allowsRefresh || !originalToken) {
      throw error;
    }

    // Không tiếp tục request của phiên cũ
    // nếu người dùng đã thay đổi phiên đăng nhập.
    if (startingVersion !== sessionVersion) {
      throw new AdminApiError('Phiên đăng nhập đã thay đổi.', 401, 'SESSION_CHANGED');
    }

    let nextToken: string;

    // Nếu một request khác đã refresh thành công,
    // sử dụng token mới thay vì refresh lần nữa.
    const storedToken = readTokens()?.accessToken ?? null;

    if (storedToken && storedToken !== originalToken) {
      nextToken = storedToken;
    } else {
      nextToken = await refreshAccessToken();
    }

    // Kiểm tra một lần nữa trước khi gửi lại.
    if (startingVersion !== sessionVersion) {
      throw new AdminApiError('Phiên đăng nhập đã thay đổi.', 401, 'SESSION_CHANGED');
    }

    try {
      return await sendOnce<T>(
        path,
        {
          ...options,
          retryOnUnauthorized: false,
        },
        nextToken,
      );
    } catch (retryError) {
      if (
        retryError instanceof AdminApiError &&
        retryError.status === 401 &&
        startingVersion === sessionVersion
      ) {
        expireCurrentSession(startingVersion);
      }

      throw retryError;
    }
  }
}

// =====================================================
// 9. CÁC HÀM HTTP TIỆN DỤNG
// =====================================================

/**
 * Các trang có thể gọi trực tiếp:
 *
 * adminApi.get(...)
 * adminApi.post(...)
 * adminApi.put(...)
 * adminApi.patch(...)
 * adminApi.delete(...)
 *
 * Tất cả đều sử dụng chung logic xác thực,
 * timeout, chuẩn hóa lỗi và refresh token.
 */
export const adminApi = {
  request: adminApiRequest,

  get<T>(path: string, options: AdminApiRequestOptions = {}): Promise<T> {
    return adminApiRequest<T>(path, {
      ...options,
      method: 'GET',
    });
  },

  post<T>(path: string, body?: unknown, options: AdminApiRequestOptions = {}): Promise<T> {
    return adminApiRequest<T>(path, {
      ...options,
      method: 'POST',
      body,
    });
  },

  put<T>(path: string, body?: unknown, options: AdminApiRequestOptions = {}): Promise<T> {
    return adminApiRequest<T>(path, {
      ...options,
      method: 'PUT',
      body,
    });
  },

  patch<T>(path: string, body?: unknown, options: AdminApiRequestOptions = {}): Promise<T> {
    return adminApiRequest<T>(path, {
      ...options,
      method: 'PATCH',
      body,
    });
  },

  delete<T>(path: string, options: AdminApiRequestOptions = {}): Promise<T> {
    return adminApiRequest<T>(path, {
      ...options,
      method: 'DELETE',
    });
  },
};

export default adminApi;
