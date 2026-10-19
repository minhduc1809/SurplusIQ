import { AdminApiError, adminApi, adminTokenStorage } from './admin-api.client';

import type { AdminAuthTokens } from './admin-api.client';

// =====================================================
// 1. CẤU HÌNH AUTHENTICATION
// =====================================================

/**
 * Backend SurplusIQ hiện chưa có API đăng nhập
 * riêng cho Super Admin.
 *
 * Tạm thời sử dụng endpoint đăng nhập Web hiện có.
 */
const ADMIN_LOGIN_ENDPOINT = '/auth/store/login';

const ADMIN_LOGOUT_ENDPOINT = '/auth/logout';

/**
 * Khóa lưu thông tin tài khoản Admin trong phiên tab.
 *
 * Token được lưu riêng bởi admin-api.client.ts.
 *
 * Không lưu mật khẩu hoặc dữ liệu nhạy cảm khác.
 */
const ADMIN_SESSION_STORAGE_KEY = 'surplusiq.platform-admin.session.v1';

/**
 * Vai trò được phép truy cập giao diện Super Admin.
 */
export const REQUIRED_ADMIN_ROLE = 'ADMIN' as const;

// =====================================================
// 2. ĐỊNH NGHĨA KIỂU DỮ LIỆU
// =====================================================

/**
 * Dữ liệu cần thiết cho API đăng nhập.
 */
export interface AdminLoginInput {
  email: string;
  password: string;
  otpCode?: string;
  deviceId?: string;
}

/**
 * Yêu cầu xác thực 2 lớp (2FA OTP) từ Backend.
 */
export interface AdminTwoFactorChallenge {
  twoFactorRequired: true;
  target: string;
  message: string;
  otpPreview?: string;
  deviceId: string;
}

export class AdminTwoFactorRequiredError extends AdminApiError {
  readonly challenge: AdminTwoFactorChallenge;

  constructor(challenge: AdminTwoFactorChallenge) {
    super(challenge.message, 403, 'ADMIN_2FA_REQUIRED');
    this.name = 'AdminTwoFactorRequiredError';
    this.challenge = challenge;
  }
}

/**
 * Thông tin tài khoản sau khi xác thực.
 *
 * Backend hiện chưa trả về họ tên người dùng
 * trong response đăng nhập.
 */
export interface AdminUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: typeof REQUIRED_ADMIN_ROLE;
}

/**
 * Phiên đăng nhập được lưu ở Frontend.
 *
 * deviceId dùng để yêu cầu Backend thu hồi
 * refresh token khi đăng xuất.
 */
export interface AdminSession {
  user: AdminUser;
  deviceId: string;
}

/**
 * Kết quả đăng xuất.
 *
 * serverAcknowledged chỉ cho biết Backend đã
 * chấp nhận request đăng xuất.
 *
 * Nó không chứng minh refresh token chắc chắn
 * đã bị thu hồi do giới hạn của Backend hiện tại.
 */
export interface AdminLogoutResult {
  localSessionCleared: boolean;
  serverAcknowledged: boolean;
  warning?: string;
}

/**
 * Cấu trúc response đăng nhập của Backend.
 */
interface StoreLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    role: string;
    email: string | null;
    phone?: string | null;
    storeId?: string | null;
    permission?: string | null;
  };
}

/**
 * Một số thông tin được đọc từ JWT.
 *
 * Đây chỉ là bước kiểm tra tính nhất quán
 * của dữ liệu phía trình duyệt.
 *
 * Frontend không thể xác minh chữ ký JWT.
 */
interface JwtClaims {
  sub: string;
  role: string;
  deviceId?: string;
  exp?: number;
}

// =====================================================
// 3. HÀM KIỂM TRA DỮ LIỆU
// =====================================================

/**
 * Kiểm tra giá trị có phải object thông thường.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Kiểm tra chuỗi không rỗng.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Kiểm tra response đăng nhập có đúng
 * cấu trúc Backend hiện tại hay không.
 */
function isStoreLoginResponse(value: unknown): value is StoreLoginResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (!isRecord(value.user)) {
    return false;
  }

  const user = value.user;

  return (
    isNonEmptyString(value.accessToken) &&
    isNonEmptyString(value.refreshToken) &&
    isNonEmptyString(user.id) &&
    isNonEmptyString(user.role) &&
    (user.email === null || typeof user.email === 'string')
  );
}

/**
 * Đọc payload JWT mà không xác minh chữ ký.
 *
 * Chỉ sử dụng để kiểm tra các trường role,
 * sub và deviceId có khớp với response hay không.
 *
 * Tuyệt đối không sử dụng hàm này thay cho
 * xác thực và phân quyền phía Backend.
 */
function readJwtClaims(token: string): JwtClaims | null {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const encodedPayload = parts[1];

    if (!encodedPayload) {
      return null;
    }

    const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');

    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

    const decoded: unknown = JSON.parse(atob(padded));

    if (!isRecord(decoded)) {
      return null;
    }

    if (!isNonEmptyString(decoded.sub) || !isNonEmptyString(decoded.role)) {
      return null;
    }

    return {
      sub: decoded.sub,
      role: decoded.role,
      deviceId: typeof decoded.deviceId === 'string' ? decoded.deviceId : undefined,
      exp: typeof decoded.exp === 'number' ? decoded.exp : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Kiểm tra token có nhất quán với phiên
 * vừa được Backend trả về hay không.
 *
 * Khi đăng nhập mới, yêu cầu token chưa hết hạn.
 * Khi khôi phục phiên, cho phép token đã hết hạn
 * vì API Client có thể thực hiện refresh.
 */
function validateTokenClaims(
  token: string,
  userId: string,
  deviceId: string,
  requireNotExpired: boolean,
): boolean {
  const claims = readJwtClaims(token);

  if (!claims) {
    return false;
  }

  if (
    claims.sub !== userId ||
    claims.role !== REQUIRED_ADMIN_ROLE ||
    claims.deviceId !== deviceId
  ) {
    return false;
  }

  if (requireNotExpired) {
    if (typeof claims.exp !== 'number' || claims.exp <= Math.floor(Date.now() / 1000)) {
      return false;
    }
  }

  return true;
}

// =====================================================
// 4. TẠO ĐỊNH DANH THIẾT BỊ
// =====================================================

/**
 * Tạo deviceId bằng Web Crypto API.
 *
 * Mỗi lần đăng nhập tạo một định danh mới
 * để phân biệt các phiên.
 *
 * Không sử dụng Math.random() để sinh UUID
 * cho dữ liệu liên quan đến xác thực.
 */
function generateDeviceId(): string {
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw new AdminApiError(
      'Trình duyệt chưa hỗ trợ tạo định danh phiên an toàn.',
      0,
      'SECURE_RANDOM_UNAVAILABLE',
    );
  }

  return crypto.randomUUID();
}

// =====================================================
// 5. LƯU PHIÊN ĐĂNG NHẬP
// =====================================================

/**
 * Lưu thông tin tài khoản Admin.
 *
 * Không lưu toàn bộ response từ Backend
 * vì response có chứa token nhạy cảm.
 */
function writeAdminSession(session: AdminSession): void {
  if (typeof window === 'undefined') {
    throw new AdminApiError('Không thể lưu phiên ngoài trình duyệt.', 0, 'STORAGE_UNAVAILABLE');
  }

  try {
    window.sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    throw new AdminApiError('Không thể lưu thông tin phiên đăng nhập.', 0, 'STORAGE_UNAVAILABLE');
  }
}

/**
 * Đọc thông tin phiên đã lưu.
 *
 * Dữ liệu sessionStorage có thể bị thay đổi
 * nên bắt buộc kiểm tra kiểu dữ liệu trước
 * khi sử dụng.
 */
function readAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed) || !isRecord(parsed.user)) {
      return null;
    }

    if (
      !isNonEmptyString(parsed.deviceId) ||
      !isNonEmptyString(parsed.user.id) ||
      parsed.user.role !== REQUIRED_ADMIN_ROLE
    ) {
      return null;
    }

    if (parsed.user.email !== null && typeof parsed.user.email !== 'string') {
      return null;
    }

    return {
      deviceId: parsed.deviceId,
      user: {
        id: parsed.user.id,
        role: REQUIRED_ADMIN_ROLE,
        email: parsed.user.email,
        phone: typeof parsed.user.phone === 'string' ? parsed.user.phone : null,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Xóa thông tin phiên lưu trên trình duyệt.
 */
function removeAdminSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  } catch {
    // Không để lỗi lưu trữ chặn quá trình đăng xuất.
  }
}

// =====================================================
// 6. XÓA PHIÊN CỤC BỘ
// =====================================================

/**
 * Xóa token và dữ liệu tài khoản tại Frontend.
 *
 * Hàm này không gửi request tới Backend.
 */
export function clearAdminSession(): void {
  adminTokenStorage.clear();
  removeAdminSession();
}

// =====================================================
// 7. YÊU CẦU BACKEND ĐĂNG XUẤT
// =====================================================

/**
 * Gọi endpoint đăng xuất hiện có.
 *
 * Backend hiện nhận x-user-id và x-device-id.
 *
 * Vì API chưa xác thực quyền sở hữu của các
 * header này, kết quả success chỉ được xem
 * là xác nhận đã xử lý request.
 *
 * Backend cần được sửa trước khi sử dụng
 * làm cơ chế thu hồi phiên production.
 */
async function requestServerLogout(userId: string, deviceId: string): Promise<boolean> {
  const response = await adminApi.post<{
    success: boolean;
  }>(ADMIN_LOGOUT_ENDPOINT, undefined, {
    auth: true,
    retryOnUnauthorized: false,
    timeoutMs: 5000,
    headers: {
      'x-user-id': userId,
      'x-device-id': deviceId,
    },
  });

  return response?.success === true;
}

// =====================================================
// 8. ĐĂNG NHẬP SUPER ADMIN
// =====================================================

/**
 * Đăng nhập bằng API thực tế của Backend.
 *
 * Quy trình:
 * 1. Kiểm tra dữ liệu nhập.
 * 2. Tạo deviceId.
 * 3. Gửi POST /auth/store/login.
 * 4. Kiểm tra response.
 * 5. Chỉ chấp nhận tài khoản ADMIN.
 * 6. Kiểm tra các trường JWT có nhất quán.
 * 7. Lưu phiên vào sessionStorage.
 *
 * Không lưu token trước khi xác nhận vai trò.
 */
export async function loginAdmin(input: AdminLoginInput): Promise<AdminSession> {
  const email = input.email.trim();
  const password = input.password;
  const otpCode = input.otpCode?.trim();

  if (!email || !password) {
    throw new AdminApiError('Vui lòng nhập đầy đủ email và mật khẩu.', 400, 'ADMIN_LOGIN_REQUIRED');
  }

  const deviceId =
    input.deviceId && isNonEmptyString(input.deviceId) ? input.deviceId.trim() : generateDeviceId();

  // Gửi request không kèm Bearer Token cũ.
  const rawResponse = await adminApi.post<unknown>(
    ADMIN_LOGIN_ENDPOINT,
    {
      email,
      password,
      deviceId,
      deviceName: 'SurplusIQ Admin Web',
      ...(otpCode ? { otpCode } : {}),
    },
    {
      auth: false,
      retryOnUnauthorized: false,
    },
  );

  // Không xử lý phiên nếu Backend chưa hoàn tất
  // quy trình xác thực hoặc trả response khác hợp đồng.
  if (!isStoreLoginResponse(rawResponse)) {
    if (isRecord(rawResponse) && rawResponse.twoFactorRequired === true) {
      throw new AdminTwoFactorRequiredError({
        twoFactorRequired: true,
        target: typeof rawResponse.target === 'string' ? rawResponse.target : email,
        message:
          typeof rawResponse.message === 'string'
            ? rawResponse.message
            : 'Vui lòng nhập mã xác thực 2FA (6 chữ số) để hoàn tất đăng nhập.',
        otpPreview: typeof rawResponse.otpPreview === 'string' ? rawResponse.otpPreview : undefined,
        deviceId,
      });
    }

    throw new AdminApiError(
      'Phản hồi đăng nhập từ Backend không hợp lệ.',
      502,
      'INVALID_LOGIN_RESPONSE',
    );
  }

  // Tuyệt đối không lưu phiên của tài khoản
  // STORE_USER hoặc CUSTOMER vào Admin Console.
  if (rawResponse.user.role !== REQUIRED_ADMIN_ROLE) {
    // Không tạo phiên Admin. Backend có thể đã
    // phát hành token cho lần đăng nhập này.
    //
    // Gửi yêu cầu hủy phiên vừa tạo nếu có thể.
    // Không phụ thuộc kết quả hủy để từ chối role.
    try {
      await requestServerLogout(rawResponse.user.id, deviceId);
    } catch {
      // Việc thu hồi thất bại không được cho phép
      // tài khoản sai vai trò truy cập Super Admin.
    }

    throw new AdminApiError(
      'Tài khoản này không có quyền truy cập Super Admin.',
      403,
      'ADMIN_ROLE_REQUIRED',
    );
  }

  // Kiểm tra token với thông tin tài khoản
  // và định danh thiết bị vừa đăng nhập.
  if (!validateTokenClaims(rawResponse.accessToken, rawResponse.user.id, deviceId, true)) {
    try {
      await requestServerLogout(rawResponse.user.id, deviceId);
    } catch {
      // Không làm thay đổi kết quả từ chối token lỗi.
    }

    throw new AdminApiError(
      'Thông tin access token không nhất quán với tài khoản.',
      401,
      'INVALID_ADMIN_TOKEN',
    );
  }

  const session: AdminSession = {
    deviceId,
    user: {
      id: rawResponse.user.id,
      email: rawResponse.user.email,
      phone: rawResponse.user.phone ?? null,
      role: REQUIRED_ADMIN_ROLE,
    },
  };

  const tokens: AdminAuthTokens = {
    accessToken: rawResponse.accessToken,
    refreshToken: rawResponse.refreshToken,
  };

  // Chỉ bắt đầu lưu phiên sau khi đã hoàn tất
  // tất cả bước kiểm tra ở phía Frontend.
  try {
    adminTokenStorage.set(tokens);
    writeAdminSession(session);
  } catch (error) {
    // Tránh tình trạng lưu một phần phiên:
    // có token nhưng không có thông tin tài khoản.
    clearAdminSession();
    throw error;
  }

  return session;
}

// =====================================================
// 9. KHÔI PHỤC PHIÊN SAU KHI TẢI LẠI TRANG
// =====================================================

/**
 * Kiểm tra phiên Admin đã lưu trong tab.
 *
 * Đây chỉ là khôi phục trạng thái Frontend.
 * Nó không phải bước xác thực token bằng Backend.
 *
 * Access token hết hạn vẫn có thể được refresh
 * khi request tiếp theo nhận HTTP 401.
 */
export function getAdminSession(): AdminSession | null {
  const session = readAdminSession();
  const tokens = adminTokenStorage.get();

  if (!session || !tokens) {
    clearAdminSession();
    return null;
  }

  const claimsValid = validateTokenClaims(
    tokens.accessToken,
    session.user.id,
    session.deviceId,
    false,
  );

  if (!claimsValid) {
    clearAdminSession();
    return null;
  }

  return session;
}

// =====================================================
// 10. ĐĂNG XUẤT SUPER ADMIN
// =====================================================

/**
 * Đăng xuất tại Frontend và yêu cầu Backend
 * thu hồi refresh token tương ứng.
 *
 * Luôn xóa phiên cục bộ trong khối finally,
 * kể cả khi Backend không phản hồi.
 *
 * Không tuyên bố refresh token đã bị thu hồi
 * chỉ dựa vào response success của endpoint cũ.
 */
export async function logoutAdmin(): Promise<AdminLogoutResult> {
  const session = readAdminSession();

  let serverAcknowledged = false;
  let warning: string | undefined;

  try {
    if (session) {
      serverAcknowledged = await requestServerLogout(session.user.id, session.deviceId);

      if (!serverAcknowledged) {
        warning = 'Backend chưa xác nhận yêu cầu đăng xuất.';
      }
    } else {
      warning = 'Không có thông tin phiên để yêu cầu Backend thu hồi token.';
    }
  } catch {
    warning = 'Không thể xác nhận đăng xuất trên máy chủ. Phiên cục bộ vẫn được xóa.';
  } finally {
    clearAdminSession();
  }

  return {
    localSessionCleared: true,
    serverAcknowledged,
    warning,
  };
}

/**
 * Bật / tắt xác thực 2 bước (2FA OTP) cho tài khoản hiện tại.
 */
export async function toggleAdminTwoFactor(
  enable: boolean,
): Promise<{ twoFactorEnabled: boolean }> {
  return adminApi.post<{ twoFactorEnabled: boolean }>('/me/2fa/toggle', {
    enabled: enable,
    enable: enable,
  });
}

// =====================================================
// 11. EXPORT API AUTHENTICATION
// =====================================================

/**
 * Đối tượng dùng chung cho tầng Authentication.
 *
 * File AdminAuthProvider.tsx ở bước tiếp theo
 * sẽ sử dụng các hàm này để quản lý trạng thái
 * đăng nhập và đăng xuất trong React.
 */
export const adminAuthApi = {
  login: loginAdmin,
  logout: logoutAdmin,
  getSession: getAdminSession,
  clearSession: clearAdminSession,
  toggleTwoFactor: toggleAdminTwoFactor,
};

export default adminAuthApi;
