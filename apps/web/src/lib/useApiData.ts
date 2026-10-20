import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from './api';

/** State model chuẩn theo rule 13.1 - tránh nhiều boolean mâu thuẫn. */
export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'empty'; message: string }
  | { status: 'error'; message: string; canRetry: boolean };

export function useApiData<T>(
  fetcher: () => Promise<T>,
  isEmpty: (data: T) => boolean = () => false,
  emptyMessage = 'Chưa có dữ liệu.',
  deps: unknown[] = [],
) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(() => {
    setState({ status: 'loading' });
    fetcherRef
      .current()
      .then((data) => {
        if (isEmpty(data)) {
          setState({ status: 'empty', message: emptyMessage });
        } else {
          setState({ status: 'success', data });
        }
      })
      .catch((err) => {
        const canRetry = !(err instanceof ApiError && err.status === 403);
        setState({
          status: 'error',
          message:
            err instanceof Error ? err.message : 'Không kết nối được. Kiểm tra mạng rồi thử lại.',
          canRetry,
        });
      });
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { state, reload: load };
}
