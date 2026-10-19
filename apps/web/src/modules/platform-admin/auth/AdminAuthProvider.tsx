import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { ReactNode } from 'react';

import {
  ADMIN_SESSION_EXPIRED_EVENT,
  AdminApiError,
  adminApi,
  adminTokenStorage,
} from '../api/admin-api.client';

import { adminAuthApi } from '../api/admin-auth.api';

import type {
  AdminLoginInput,
  AdminLogoutResult,
  AdminSession,
  AdminUser,
} from '../api/admin-auth.api';

// =====================================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU
// =====================================================

/**
 * Ba trạng thái chính của hệ thống xác thực.
 *
 * checking:
 *   Đang kiểm tra phiên với Backend.
 *
 * authenticated:
 *   Đã đăng nhập và có phiên Admin được chấp nhận.
 *
 * unauthenticated:
 *   Chưa đăng nhập hoặc phiên không hợp lệ.
 */
export type AdminAuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

/**
 * Dữ liệu được chia sẻ cho toàn bộ component
 * nằm bên trong AdminAuthProvider.
 */
export interface AdminAuthContextValue {
  status: AdminAuthStatus;

  session: AdminSession | null;

  user: AdminUser | null;

  isAuthenticated: boolean;

  isLoading: boolean;

  error: string | null;

  login: (input: AdminLoginInput) => Promise<AdminSession>;

  logout: () => Promise<AdminLogoutResult>;

  retryRestore: () => Promise<void>;

  clearError: () => void;
}

export interface AdminAuthProviderProps {
  children: ReactNode;
}

/**
 * Cấu trúc phản hồi của API refresh.
 */
interface RefreshResponse {
  accessToken: string;
}

// =====================================================
// 2. TẠO REACT CONTEXT
// =====================================================

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

// =====================================================
// 3. HÀM CHUYỂN LỖI THÀNH THÔNG BÁO
// =====================================================

/**
 * Chuẩn hóa thông báo lỗi để hiển thị
 * trong trang đăng nhập hoặc thông báo chung.
 */
function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AdminApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Đã xảy ra lỗi xác thực không xác định.';
}

// =====================================================
// 4. KHÔI PHỤC PHIÊN VỚI BACKEND
// =====================================================

/**
 * Backend hiện chưa có GET /auth/me dành riêng
 * cho Super Admin.
 *
 * Vì vậy, khi tải lại trang, chúng ta gọi:
 *
 * POST /auth/refresh
 *
 * để xác nhận refresh token còn được Backend
 * chấp nhận trước khi hiển thị giao diện Admin.
 *
 * Sau đó sử dụng adminAuthApi.getSession()
 * để đối chiếu user ID, role và device ID.
 *
 * Việc giải mã JWT tại Frontend không xác minh
 * chữ ký và không thay thế Backend Guards.
 */
async function restoreAdminSession(): Promise<AdminSession | null> {
  const savedSession = adminAuthApi.getSession();

  const savedTokens = adminTokenStorage.get();

  if (!savedSession || !savedTokens) {
    return null;
  }

  const refreshToken = savedTokens.refreshToken;

  try {
    const result = await adminApi.post<RefreshResponse>(
      '/auth/refresh',
      {
        refreshToken,
      },
      {
        auth: false,
        retryOnUnauthorized: false,
      },
    );

    if (!result || typeof result.accessToken !== 'string' || !result.accessToken) {
      throw new AdminApiError(
        'Backend trả về access token không hợp lệ.',
        502,
        'INVALID_REFRESH_RESPONSE',
      );
    }

    // Kiểm tra phiên có bị thay đổi trong lúc
    // request refresh đang chạy hay không.
    const currentTokens = adminTokenStorage.get();

    if (!currentTokens || currentTokens.refreshToken !== refreshToken) {
      throw new AdminApiError('Phiên đăng nhập đã thay đổi.', 401, 'SESSION_CHANGED');
    }

    // Cập nhật access token bằng token mới
    // được cấp từ Backend.
    adminTokenStorage.set({
      accessToken: result.accessToken,
      refreshToken,
    });

    // Kiểm tra lại vai trò và thông tin phiên.
    const restoredSession = adminAuthApi.getSession();

    if (!restoredSession) {
      throw new AdminApiError(
        'Phiên không còn đáp ứng điều kiện truy cập Admin.',
        403,
        'ADMIN_SESSION_INVALID',
      );
    }

    return restoredSession;
  } catch (error) {
    // Chỉ xóa phiên nếu Backend từ chối
    // refresh token hoặc role không còn hợp lệ.
    //
    // Không xóa token khi chỉ mất mạng,
    // timeout hoặc Backend tạm thời gặp lỗi 500.
    const shouldClear =
      error instanceof AdminApiError &&
      ([400, 401, 403].includes(error.status) || error.code === 'ADMIN_SESSION_INVALID');

    if (shouldClear) {
      const currentTokens = adminTokenStorage.get();

      // Không xóa phiên mới nếu người dùng đã
      // đăng nhập lại trong lúc request cũ chạy.
      if (currentTokens?.refreshToken === refreshToken) {
        adminAuthApi.clearSession();
      }
    }

    throw error;
  }
}

// =====================================================
// 5. NGĂN NHIỀU LẦN REFRESH ĐỒNG THỜI
// =====================================================

/**
 * Khi React StrictMode chạy effect hai lần
 * trong môi trường development, cùng một lần
 * kiểm tra phiên sẽ dùng chung một Promise.
 */
let restorePromise: Promise<AdminSession | null> | null = null;

function restoreSessionOnce(): Promise<AdminSession | null> {
  if (restorePromise) {
    return restorePromise;
  }

  const task = restoreAdminSession();

  const sharedTask = task.finally(() => {
    restorePromise = null;
  });

  restorePromise = sharedTask;

  return sharedTask;
}

// =====================================================
// 6. AUTH PROVIDER
// =====================================================

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  // ---------------------------------------------------
  // Trạng thái phiên đăng nhập
  // ---------------------------------------------------

  const [session, setSession] = useState<AdminSession | null>(null);

  const [status, setStatus] = useState<AdminAuthStatus>('checking');

  // ---------------------------------------------------
  // Trạng thái thao tác và lỗi
  // ---------------------------------------------------

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------
  // Kiểm soát các thao tác bất đồng bộ
  // ---------------------------------------------------

  /**
   * Số phiên bản thao tác giúp request cũ
   * không ghi đè trạng thái React mới.
   */
  const operationVersion = useRef(0);

  /**
   * Ngăn thực hiện đồng thời nhiều thao tác
   * đăng nhập hoặc đăng xuất.
   */
  const processingRef = useRef(false);

  // ===================================================
  // 7. KIỂM TRA PHIÊN BAN ĐẦU
  // ===================================================

  const retryRestore = useCallback(async (): Promise<void> => {
    const version = ++operationVersion.current;

    setStatus('checking');
    setSession(null);
    setError(null);

    try {
      const restored = await restoreSessionOnce();

      if (version !== operationVersion.current) {
        return;
      }

      setSession(restored);

      setStatus(restored ? 'authenticated' : 'unauthenticated');
    } catch (caughtError) {
      if (version !== operationVersion.current) {
        return;
      }

      setSession(null);
      setStatus('unauthenticated');

      setError(getAuthErrorMessage(caughtError));
    }
  }, []);

  /**
   * Khi Provider được khởi tạo:
   * - Không tin tưởng ngay vào sessionStorage.
   * - Gọi Backend để kiểm tra phiên.
   * - Chỉ sau đó mới cập nhật trạng thái.
   */
  useEffect(() => {
    void retryRestore();
  }, [retryRestore]);

  // ===================================================
  // 8. LẮNG NGHE SỰ KIỆN HẾT PHIÊN
  // ===================================================

  useEffect(() => {
    /**
     * API Client sẽ phát sự kiện này khi
     * refresh token bị Backend từ chối.
     */
    const handleSessionExpired = () => {
      // Hủy hiệu lực cập nhật từ request cũ.
      operationVersion.current += 1;

      adminAuthApi.clearSession();

      setSession(null);
      setStatus('unauthenticated');
      setBusy(false);

      setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    };

    window.addEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      window.removeEventListener(ADMIN_SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, []);

  // ===================================================
  // 9. ĐĂNG NHẬP ADMIN
  // ===================================================

  const login = useCallback(async (input: AdminLoginInput): Promise<AdminSession> => {
    if (processingRef.current) {
      throw new AdminApiError(
        'Một thao tác xác thực đang được thực hiện.',
        409,
        'AUTH_OPERATION_IN_PROGRESS',
      );
    }

    processingRef.current = true;

    const version = ++operationVersion.current;

    setBusy(true);
    setError(null);

    try {
      // adminAuthApi.login() đã kiểm tra
      // Backend response và role ADMIN
      // trước khi lưu token.
      const result = await adminAuthApi.login(input);

      if (version === operationVersion.current) {
        setSession(result);
        setStatus('authenticated');
      }

      return result;
    } catch (caughtError) {
      if (version === operationVersion.current) {
        setSession(null);
        setStatus('unauthenticated');

        setError(getAuthErrorMessage(caughtError));
      }

      throw caughtError;
    } finally {
      processingRef.current = false;

      if (version === operationVersion.current) {
        setBusy(false);
      }
    }
  }, []);

  // ===================================================
  // 10. ĐĂNG XUẤT ADMIN
  // ===================================================

  const logout = useCallback(async (): Promise<AdminLogoutResult> => {
    if (processingRef.current) {
      throw new AdminApiError(
        'Một thao tác xác thực đang được thực hiện.',
        409,
        'AUTH_OPERATION_IN_PROGRESS',
      );
    }

    processingRef.current = true;

    const version = ++operationVersion.current;

    // Bắt đầu yêu cầu đăng xuất trước khi
    // cập nhật trạng thái giao diện.
    const logoutTask = adminAuthApi.logout();

    // Ẩn nội dung Admin ngay lập tức.
    setSession(null);
    setStatus('unauthenticated');
    setBusy(true);
    setError(null);

    try {
      const result = await logoutTask;

      if (version === operationVersion.current && result.warning) {
        setError(result.warning);
      }

      return result;
    } finally {
      processingRef.current = false;

      if (version === operationVersion.current) {
        setBusy(false);
      }
    }
  }, []);

  // ===================================================
  // 11. XÓA THÔNG BÁO LỖI
  // ===================================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ===================================================
  // 12. TẠO GIÁ TRỊ CHIA SẺ QUA CONTEXT
  // ===================================================

  const contextValue = useMemo<AdminAuthContextValue>(() => {
    const isAuthenticated = status === 'authenticated' && session !== null;

    return {
      status,
      session,
      user: session?.user ?? null,
      isAuthenticated,
      isLoading: status === 'checking' || busy,
      error,
      login,
      logout,
      retryRestore,
      clearError,
    };
  }, [status, session, busy, error, login, logout, retryRestore, clearError]);

  // ===================================================
  // 13. CUNG CẤP CONTEXT CHO ỨNG DỤNG
  // ===================================================

  return <AdminAuthContext.Provider value={contextValue}>{children}</AdminAuthContext.Provider>;
}

// =====================================================
// 14. CUSTOM HOOK
// =====================================================

/**
 * Hook giúp các component sử dụng Authentication.
 *
 * Bắt buộc component phải nằm trong
 * AdminAuthProvider để tránh truy cập context rỗng.
 */
export function useAdminAuth(): AdminAuthContextValue {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error('useAdminAuth phải được sử dụng bên trong AdminAuthProvider.');
  }

  return context;
}

export default AdminAuthProvider;
