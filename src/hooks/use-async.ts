"use client";
 
import { useCallback, useEffect, useRef, useState } from "react";
 
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}
 
// 全局缓存：同一个 key 共享一份快照
const cache = new Map<string, { data: unknown; ts: number }>();
 
/**
 * Minimal async data hook — 支持全局缓存 + stale-while-revalidate
 *
 * - cacheKey: 相同 cacheKey 共享缓存，避免重复请求
 * - staleMs: 缓存新鲜期（ms），期内直接返回，不发请求。默认 30 秒
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[] = [],
  opts: { immediate?: boolean; cacheKey?: string; staleMs?: number } = {}
): AsyncState<T> {
  const { immediate = true, cacheKey, staleMs = 30_000 } = opts;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);
  const fnRef = useRef(fn);
 
  useEffect(() => {
    fnRef.current = fn;
  });
 
  const key = JSON.stringify(deps);
  const [tick, setTick] = useState(0);
 
  useEffect(() => {
    if (!immediate) return;
    let cancelled = false;
 
    // ① 如果有缓存且未过期，直接用，不发请求
    if (cacheKey) {
      const hit = cache.get(cacheKey);
      if (hit && Date.now() - hit.ts < staleMs) {
        setData(hit.data as T);
        setLoading(false);
        setError(null);
        return;
      }
      // ② 缓存过期但有旧数据：先立即展示旧数据（秒开），后台再刷新
      if (hit) {
        setData(hit.data as T);
        setLoading(false);
      }
    }
 
    // ③ 发起请求（刷新或首次）
    setLoading(true);
    setError(null);
    fnRef
      .current()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
          // 写入缓存
          if (cacheKey) cache.set(cacheKey, { data: d, ts: Date.now() });
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
  }, [key, tick, immediate, cacheKey, staleMs]);
 
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, loading, error, reload };
}
