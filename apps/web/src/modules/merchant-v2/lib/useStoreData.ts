import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';

export interface StoreData<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/** GET có hủy kết quả cũ khi đổi path nhanh; path null = chưa tải. */
export function useStoreData<T>(path: string | null): StoreData<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);

  useEffect(() => {
    if (path === null) return;
    const mine = ++seq.current;
    setLoading(true);
    setError(null);
    api
      .get<T>(path)
      .then((r) => {
        if (mine === seq.current) setData(r);
      })
      .catch((e: Error) => {
        if (mine === seq.current) setError(e.message);
      })
      .finally(() => {
        if (mine === seq.current) setLoading(false);
      });
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}
