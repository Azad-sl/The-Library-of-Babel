"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Minimal async data hook — no provider needed.
 * Re-runs when `key` changes (stringified).
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  opts: { immediate?: boolean } = {}
): AsyncState<T> {
  const { immediate = true } = opts;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);

  // keep the latest fn in the ref (in an effect, not during render)
  useEffect(() => {
    fnRef.current = fn;
  });

  const key = JSON.stringify(deps);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!immediate) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || String(e));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key, tick, immediate]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}
