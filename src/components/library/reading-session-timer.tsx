"use client";

import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useReadingSessionTimer,
  formatSessionClock,
  minutesRoundedUp,
} from "@/hooks/use-reading-memory";

/**
 * 本次阅读 · THIS SESSION
 *
 * Small TOC card showing the live reading-session timer (MM:SS) and the
 * lifetime accumulated minutes for this volume. The clock icon pulses while
 * the timer is running (visible + in-view) and stays static when paused.
 */
export function ReadingSessionTimer({ slug }: { slug: string }) {
  const { elapsed, running, totalSeconds } = useReadingSessionTimer(slug);

  return (
    <div
      data-testid="reading-session-timer"
      className={cn(
        "reading-session-timer mt-4 rounded-lg border border-gold/20 bg-card/30 p-3",
        "transition-colors"
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[0.65rem] uppercase tracking-[0.2em] text-gold/60">
          This Session
        </p>
        <Timer
          className={cn(
            "h-3.5 w-3.5 text-gold/70",
            running && "reading-timer-pulse"
          )}
          aria-hidden
        />
      </div>

      <p className="mt-1 font-serif-display text-sm font-medium text-foreground">
        本次阅读
      </p>

      {/* Live clock */}
      <div
        className="mt-1.5 font-mono text-xl tabular-nums text-gold"
        aria-live="polite"
        aria-label={`本次阅读 ${formatSessionClock(elapsed)}`}
      >
        {formatSessionClock(elapsed)}
      </div>

      {/* Status line */}
      <p className="mt-0.5 font-body-serif text-[0.7rem] italic text-muted-foreground">
        {running ? "阅读中……" : "已暂停 · 滚动文章以继续"}
      </p>

      {/* Lifetime total */}
      <div className="mt-2 border-t border-gold/15 pt-2">
        <p className="font-body-serif text-[0.7rem] text-muted-foreground">
          累计{" "}
          <span className="text-gold">
            {minutesRoundedUp(totalSeconds)}
          </span>{" "}
          分钟
        </p>
      </div>
    </div>
  );
}
