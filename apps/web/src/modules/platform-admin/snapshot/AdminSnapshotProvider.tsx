import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { parseSnapshot, type AdminSnapshot } from './model';
import { adminApi, AdminApiError, adminTokenStorage } from '../api/admin-api.client';

// =====================================================
// 1. ĐỊNH NGHĨA KIỂU DỮ LIỆU
// =====================================================

interface SnapshotState {
  data: AdminSnapshot | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  refreshFromBackend: () => Promise<void>;
}
const Context = createContext<SnapshotState | null>(null);

// =====================================================
// 2. SNAPSHOT PROVIDER
// =====================================================

export function AdminSnapshotProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AdminSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const refreshFromBackend = useCallback(async () => {
    const snapshot = parseSnapshot(await adminApi.get('/admin/snapshot'));
    setData(snapshot);
    setError(null);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      setError('Hết thời gian tải dữ liệu. Hãy thử tải lại.');
      setLoading(false);
      setData(null);
      controller.abort();
    }, 15000);
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        // Ưu tiên đọc từ API có xác thực để các thay đổi tồn tại qua reload.
        // File xuất tĩnh vẫn khả dụng khi backend cũ / offline không có route này.
        if (adminTokenStorage.get()) {
          try {
            const snapshot = parseSnapshot(
              await adminApi.get('/admin/snapshot', { signal: controller.signal }),
            );
            if (!controller.signal.aborted) setData(snapshot);
            return;
          } catch (cause) {
            if (controller.signal.aborted) return;
            if (cause instanceof AdminApiError && [401, 403].includes(cause.status)) throw cause;
          }
        }
        const url = new URL(
          `${import.meta.env.BASE_URL}admin-data/snapshot.json`,
          window.location.origin,
        );
        const response = await fetch(url.href, {
          cache: 'no-store',
          credentials: 'omit',
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? 'Chưa có bản xuất dữ liệu. Chạy npm run snapshot:export tại thư mục project, sau đó tải lại.'
              : `Không đọc được bản xuất dữ liệu (HTTP ${response.status}).`,
          );
        if (!response.headers.get('content-type')?.includes('application/json')) {
          throw new Error(
            'Chưa có tệp JSON hợp lệ. Chạy npm run snapshot:export tại thư mục project, sau đó tải lại.',
          );
        }
        const snapshot = parseSnapshot(await response.json());
        if (!controller.signal.aborted) setData(snapshot);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setData(null);
          setError(cause instanceof Error ? cause.message : 'Không đọc được dữ liệu.');
        }
      } finally {
        clearTimeout(timeout);
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [revision]);
  return (
    <Context.Provider value={{ data, loading, error, reload, refreshFromBackend }}>
      {children}
    </Context.Provider>
  );
}

// =====================================================
// 3. CUSTOM HOOK
// =====================================================

export function useAdminSnapshot() {
  const state = useContext(Context);
  if (!state) throw new Error('Thiếu AdminSnapshotProvider.');
  return state;
}
