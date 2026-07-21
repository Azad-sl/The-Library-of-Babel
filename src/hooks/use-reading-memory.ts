"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const PREFIX = "babel-read-progress:";

/** localStorage key prefix for accumulated reading-time (seconds) per slug. */
const TIME_PREFIX = "babel-reading-time-";

export interface SavedProgress {
  slug: string;
  title: string;
  hexagon: string;
  scrollY: number;
  percent: number;
  savedAt: number;
  finished?: boolean;
}

/**
 * Persist & restore reading position per slug.
 * Saves scrollY (debounced) to localStorage; restores on mount.
 * Shows a toast when restoring a meaningful position.
 * Marks entries as "finished" when percent > 0.95 (preserved across visits).
 */
export function useReadingMemory(
  slug: string,
  meta: { title: string; hexagon: string } | null
) {
  const restoredRef = useRef(false);

  // Restore on mount
  useEffect(() => {
    if (restoredRef.current || !meta) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(PREFIX + slug);
      if (!raw) return;
      const saved: SavedProgress = JSON.parse(raw);
      // only restore if meaningful scroll (>5% read) and not finished
      if (saved.scrollY > 200 && saved.percent > 0.05 && !saved.finished) {
        // delay to let content render
        setTimeout(() => {
          window.scrollTo({ top: saved.scrollY, behavior: "smooth" });
        }, 400);
        // inform the reader
        const pct = Math.round(saved.percent * 100);
        const ageMin = Math.round((Date.now() - saved.savedAt) / 60000);
        const ageStr =
          ageMin < 1
            ? "刚刚"
            : ageMin < 60
            ? `${ageMin} 分钟前`
            : ageMin < 1440
            ? `${Math.round(ageMin / 60)} 小时前`
            : `${Math.round(ageMin / 1440)} 天前`;
        toast.message(`已恢复至上次阅读位置 · ${pct}%`, {
          description: `${ageStr}你读到此处`,
          duration: 4000,
        });
      }
    } catch {}
  }, [slug, meta]);

  // Save on scroll (debounced) + save on unmount
  useEffect(() => {
    if (!meta) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const save = () => {
      const scrollY = window.scrollY;
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      const percent = docH > 0 ? Math.min(scrollY / docH, 1) : 0;
      // don't save if at very top (meaningless)
      if (scrollY < 50 && percent < 0.02) return;
      // carry over previous finished flag if it exists
      let finished = false;
      try {
        const prev = localStorage.getItem(PREFIX + slug);
        if (prev) {
          const p = JSON.parse(prev) as SavedProgress;
          if (p.finished) finished = true;
        }
      } catch {}
      // mark as finished if reached the end
      const justFinished = !finished && percent > 0.95;
      if (justFinished) {
        finished = true;
        toast.success("读完了。", {
          description: "你已读完这一卷——它将留在你的'已读完'册上。",
          duration: 5000,
        });
      }
      const entry: SavedProgress = {
        slug,
        title: meta.title,
        hexagon: meta.hexagon,
        scrollY,
        percent,
        savedAt: Date.now(),
        finished,
      };
      try {
        localStorage.setItem(PREFIX + slug, JSON.stringify(entry));
      } catch {}
    };
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(save, 500);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) clearTimeout(timer);
      // save immediately on unmount so the latest position is preserved
      save();
    };
  }, [slug, meta]);
}

/** Get the most recent in-progress volume (for "continue reading" card). */
export function getContinueReading(): SavedProgress | null {
  try {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(PREFIX)
    );
    if (keys.length === 0) return null;
    const entries = keys
      .map((k) => {
        try {
          return JSON.parse(localStorage.getItem(k) || "null") as SavedProgress | null;
        } catch {
          return null;
        }
      })
      .filter((e): e is SavedProgress => !!e && e.percent > 0.05 && e.percent < 0.95 && !e.finished)
      .sort((a, b) => b.savedAt - a.savedAt);
    return entries[0] || null;
  } catch {
    return null;
  }
}

/** Get the list of finished volumes (for "finished reading" list on home). */
export function getFinishedReading(): SavedProgress[] {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
    if (keys.length === 0) return [];
    return keys
      .map((k) => {
        try {
          return JSON.parse(localStorage.getItem(k) || "null") as SavedProgress | null;
        } catch {
          return null;
        }
      })
      .filter((e): e is SavedProgress => !!e && e.finished)
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

/**
 * Get every volume with meaningful saved progress (in-progress + finished).
 * Used by volume cards to render a bookmark ribbon on volumes the reader
 * has already started. Returned list is sorted by most-recently-saved first.
 */
export function getSavedProgressList(): SavedProgress[] {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
    if (keys.length === 0) return [];
    return keys
      .map((k) => {
        try {
          return JSON.parse(localStorage.getItem(k) || "null") as SavedProgress | null;
        } catch {
          return null;
        }
      })
      .filter((e): e is SavedProgress => !!e && e.percent > 0.05)
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

/** Look up the saved-progress entry for a single slug (or null). */
export function getSavedProgressFor(slug: string): SavedProgress | null {
  try {
    const raw = localStorage.getItem(PREFIX + slug);
    if (!raw) return null;
    const entry = JSON.parse(raw) as SavedProgress | null;
    return entry && entry.percent > 0.05 ? entry : null;
  } catch {
    return null;
  }
}

/* ----------------------------------------------------------------------------
 * Reading-session time tracking
 *
 * Tracks wall-clock seconds the reader actually spends with the volume in view.
 * The timer pauses when the tab is hidden or the #volume-body element scrolls
 * out of the viewport, and accumulates additively in localStorage so re-visits
 * add to the same lifetime total.
 * -------------------------------------------------------------------------- */

/** Read the persisted total seconds spent on a slug (0 if none). */
export function getReadingTimeFor(slug: string): number {
  try {
    const raw = localStorage.getItem(TIME_PREFIX + slug);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

/** Read every slug's accumulated reading time as `{ slug: seconds }`. */
export function getAllReadingTimes(): Record<string, number> {
  const out: Record<string, number> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(TIME_PREFIX)) continue;
      const slug = key.slice(TIME_PREFIX.length);
      const n = Number(localStorage.getItem(key));
      if (Number.isFinite(n) && n > 0) out[slug] = Math.floor(n);
    }
  } catch {}
  return out;
}

/** Persist accumulated seconds for a slug (additive over previous total). */
function persistReadingTime(slug: string, deltaSeconds: number) {
  if (!slug || deltaSeconds <= 0) return;
  try {
    const prev = getReadingTimeFor(slug);
    const next = prev + Math.floor(deltaSeconds);
    localStorage.setItem(TIME_PREFIX + slug, String(next));
  } catch {}
}

/**
 * Live reading-session timer for the volume view.
 *
 * Returns:
 *  - `elapsed`    — seconds the reader has spent on THIS mount (resets per visit)
 *  - `running`    — whether the timer is currently ticking (visible + in view)
 *  - `totalSeconds` — lifetime total for this slug (persisted + current elapsed)
 *
 * Internally:
 *  - starts a 1s `setInterval` on mount
 *  - pauses when `document.visibilityState !== "visible"` or `#volume-body`
 *    is scrolled out of viewport (IntersectionObserver)
 *  - persists additively to localStorage on unmount / slug change
 */
export function useReadingSessionTimer(slug: string) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [persistedTotal, setPersistedTotal] = useState(0);

  // Keep latest elapsed/running in refs so the interval closure always sees
  // fresh values without re-subscribing every tick.
  const elapsedRef = useRef(0);
  const runningRef = useRef(false);
  const slugRef = useRef(slug);
  const lastFlushRef = useRef(Date.now());

  useEffect(() => {
    elapsedRef.current = 0;
    runningRef.current = false;
    lastFlushRef.current = Date.now();
    setElapsed(0);
    setRunning(false);
    setPersistedTotal(getReadingTimeFor(slug));
    slugRef.current = slug;
  }, [slug]);

  // Pause / resume on tab visibility change AND on scroll/resize.
  // Single combined listener so visibility regains also re-check viewport
  // position (otherwise tabbing back to an in-view article would stay paused
  // until the next scroll event).
  useEffect(() => {
    const check = () => {
      const el = document.getElementById("volume-body");
      const visible = document.visibilityState === "visible";
      if (!el) {
        // No body yet — pause to be safe.
        if (runningRef.current) {
          runningRef.current = false;
          setRunning(false);
        }
        return;
      }
      const r = el.getBoundingClientRect();
      // Task spec: rect.bottom > 100 && rect.top < window.innerHeight
      const inView = r.bottom > 100 && r.top < window.innerHeight;
      const shouldRun = inView && visible;
      if (shouldRun && !runningRef.current) {
        runningRef.current = true;
        setRunning(true);
      } else if (!shouldRun && runningRef.current) {
        runningRef.current = false;
        setRunning(false);
      }
    };
    check();
    document.addEventListener("visibilitychange", check);
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    return () => {
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [slug]);

  // 1s interval — only increments when running, and flushes to localStorage
  // periodically so a crash / refresh doesn't lose more than ~10s of progress.
  useEffect(() => {
    const id = setInterval(() => {
      if (runningRef.current) {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
        // Periodic flush every ~10 seconds
        const now = Date.now();
        if (now - lastFlushRef.current >= 10000) {
          const delta = Math.round((now - lastFlushRef.current) / 1000);
          persistReadingTime(slugRef.current, delta);
          lastFlushRef.current = now;
          setPersistedTotal(getReadingTimeFor(slugRef.current));
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Final flush on unmount or slug change — persist the entire elapsed time
  useEffect(() => {
    return () => {
      // Compute remaining unflushed seconds since last flush
      const now = Date.now();
      const unflushed = Math.max(
        0,
        Math.round((now - lastFlushRef.current) / 1000)
      );
      const toFlush = Math.min(unflushed, elapsedRef.current);
      if (toFlush > 0) {
        persistReadingTime(slugRef.current, toFlush);
      }
      elapsedRef.current = 0;
    };
  }, [slug]);

  return {
    elapsed,
    running,
    totalSeconds: persistedTotal + elapsed,
  };
}

/** Format a duration in seconds as `MM:SS` (or `HH:MM:SS` past an hour). */
export function formatSessionClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

/** Round a duration in seconds up to whole minutes for "累计 X 分钟" labels. */
export function minutesRoundedUp(totalSeconds: number): number {
  return Math.max(1, Math.ceil(totalSeconds / 60));
}

export function cleanStaleProgress(validSlugs: Set<string>) {
  try {
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(PREFIX)
    );
    for (const k of keys) {
      const slug = k.slice(PREFIX.length);
      if (!validSlugs.has(slug)) {
        localStorage.removeItem(k);
      }
    }
  } catch {}
}
