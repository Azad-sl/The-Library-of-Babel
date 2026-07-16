"use client";

/**
 * Reading Activity Heatmap — 阅读足迹热力图
 *
 * A GitHub-style contribution grid showing the reader's daily reading
 * activity over the last 18 weeks. Data is sourced entirely from
 * localStorage (`babel-read-progress:*` keys → SavedProgress.savedAt),
 * grouped by local calendar day, counting *distinct slugs* per day
 * (not raw progress writes).
 *
 * Layout: 18 week-columns × 7 day-rows (Mon→Sun), 12px cells, 2px gap.
 * Five intensity levels map to gold-tinted backgrounds. The grid is
 * wrapped in `overflow-x-auto` so narrow viewports scroll horizontally
 * instead of shrinking. `print:hidden` keeps it out of PDF exports.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BookOpen,
  Flame,
  CalendarDays,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getSavedProgressList,
  type SavedProgress,
} from "@/hooks/use-reading-memory";
import { useLibrary } from "@/store/library-store";

const WEEKS = 18;
const DAYS = 7; // Mon … Sun

const DAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];
const MONTH_LABELS = [
  "一月", "二月", "三月", "四月", "五月", "六月",
  "七月", "八月", "九月", "十月", "十一月", "十二月",
];

/** Tailwind class for each of the 5 intensity levels (0..4). */
const LEVEL_CLASSES: Record<number, string> = {
  0: "bg-muted/40",
  1: "bg-gold/25",
  2: "bg-gold/50",
  3: "bg-gold/75",
  4: "bg-gold",
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local-time `YYYY-MM-DD` key for bucketing reads by calendar day. */
function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Monday 00:00 local of the week containing `d`. */
function mondayOf(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const dow = (r.getDay() + 6) % 7; // 0 = Mon … 6 = Sun
  r.setDate(r.getDate() - dow);
  return r;
}

/** Map a per-day read count to one of 5 intensity levels. */
function levelFor(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

interface Cell {
  date: Date;
  key: string;
  count: number;
  level: number;
  future: boolean;
}

export function ReadingHeatmap() {
  const { setView } = useLibrary();
  // null = still loading from localStorage (SSR + first paint).
  const [entries, setEntries] = useState<SavedProgress[] | null>(null);

  useEffect(() => {
    try {
      setEntries(getSavedProgressList());
    } catch {
      setEntries([]);
    }
  }, []);

  const { cells, monthLabels, stats, hasHistory } = useMemo(() => {
    const list = entries ?? [];

    // Group distinct slugs per local calendar day.
    const slugsPerDay = new Map<string, Set<string>>();
    for (const e of list) {
      const k = formatDateKey(new Date(e.savedAt));
      let set = slugsPerDay.get(k);
      if (!set) {
        set = new Set();
        slugsPerDay.set(k, set);
      }
      set.add(e.slug);
    }
    const counts = new Map<string, number>();
    for (const [k, s] of slugsPerDay) counts.set(k, s.size);

    // Build the 18×7 grid. The last column is the week containing today;
    // the first column is 17 weeks before that Monday.
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const thisMonday = mondayOf(now);
    const start = new Date(thisMonday);
    start.setDate(start.getDate() - (WEEKS - 1) * 7);

    const cellsArr: Cell[] = [];
    const months: (string | null)[] = [];
    let lastMonth = -1;
    for (let w = 0; w < WEEKS; w++) {
      const firstDay = new Date(start);
      firstDay.setDate(start.getDate() + w * 7);
      const m = firstDay.getMonth();
      // Show the month label only when it differs from the previous column.
      if (m !== lastMonth) {
        months.push(MONTH_LABELS[m]);
        lastMonth = m;
      } else {
        months.push(null);
      }
      for (let d = 0; d < DAYS; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        const key = formatDateKey(date);
        const count = counts.get(key) ?? 0;
        cellsArr.push({
          date,
          key,
          count,
          level: levelFor(count),
          future: date.getTime() > now.getTime(),
        });
      }
    }

    // Active days + longest streak within the 18-week window (skip future).
    let activeDays = 0;
    let longest = 0;
    let running = 0;
    for (const c of cellsArr) {
      if (c.future) continue;
      if (c.count >= 1) {
        activeDays++;
        running++;
        if (running > longest) longest = running;
      } else {
        running = 0;
      }
    }

    // Current streak — walk back from today, or yesterday if today is empty.
    let current = 0;
    const todayKey = formatDateKey(now);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayKey = formatDateKey(yesterday);
    let cursor: Date | null =
      (counts.get(todayKey) ?? 0) >= 1
        ? new Date(now)
        : (counts.get(yesterdayKey) ?? 0) >= 1
          ? yesterday
          : null;
    while (cursor && (counts.get(formatDateKey(cursor)) ?? 0) >= 1) {
      current++;
      const prev = new Date(cursor);
      prev.setDate(cursor.getDate() - 1);
      cursor = prev;
    }

    return {
      cells: cellsArr,
      monthLabels: months,
      stats: {
        activeDays,
        longestStreak: longest,
        currentStreak: current,
      },
      hasHistory: list.length > 0,
    };
  }, [entries]);

  // ---- Loading skeleton (SSR + first paint) -----------------------------
  if (entries === null) {
    return (
      <section
        data-testid="reading-heatmap"
        className="heat-section mt-8 rounded-xl border border-border/50 bg-card/30 p-6 print:hidden"
      >
        <div className="mb-3 h-3 w-28 animate-pulse rounded bg-muted/40" />
        <div className="h-5 w-44 animate-pulse rounded bg-muted/30" />
        <div className="mt-4 h-24 w-full max-w-xs animate-pulse rounded bg-muted/20" />
      </section>
    );
  }

  // ---- Build grid items: row 0 = [corner, ...monthLabels], --------------
  //      rows 1..7 = [dayLabel, ...18 cells]  (column-major via grid flow)
  const gridItems: ReactNode[] = [];
  gridItems.push(<div key="corner" aria-hidden="true" />);
  monthLabels.forEach((m, i) => {
    gridItems.push(
      <div
        key={`m-${i}`}
        className="overflow-visible whitespace-nowrap font-body-serif text-[10px] leading-[18px] text-muted-foreground/70"
        aria-hidden="true"
      >
        {m ?? ""}
      </div>
    );
  });
  for (let d = 0; d < DAYS; d++) {
    const showLabel = d === 0 || d === 2 || d === 4; // 一 / 三 / 五
    gridItems.push(
      <div
        key={`d-${d}`}
        className="overflow-visible pr-1 text-right font-body-serif text-[10px] leading-[12px] text-muted-foreground/70"
        aria-hidden="true"
      >
        {showLabel ? DAY_LABELS[d] : ""}
      </div>
    );
    for (let w = 0; w < WEEKS; w++) {
      const cell = cells[w * DAYS + d];
      const title = cell.future
        ? cell.key
        : cell.count === 0
          ? `${cell.key} · 无阅读`
          : `${cell.key} · ${cell.count} 卷`;
      gridItems.push(
        <div
          key={`c-${w}-${d}`}
          data-heat-cell
          data-date={cell.key}
          data-level={cell.level}
          className={`heat-cell rounded-sm ${LEVEL_CLASSES[cell.level]}${
            cell.future ? " opacity-30" : ""
          }`}
          title={title}
        />
      );
    }
  }

  return (
    <section
      data-testid="reading-heatmap"
      aria-labelledby="reading-heatmap-heading"
      className="heat-section rise-in mt-8 rounded-xl border border-border/50 bg-card/30 p-6 print:hidden"
    >
      {/* Section header */}
      <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold/70">
        <Flame className="h-3.5 w-3.5" /> READING ACTIVITY
      </div>
      <h2
        id="reading-heatmap-heading"
        className="font-serif-display text-2xl font-semibold ink-reveal"
      >
        阅读足迹热力图
      </h2>
      <p className="mt-1 font-body-serif text-sm italic text-muted-foreground">
        过去 18 周，你与这座图书馆相遇的每一天
      </p>
      <div className="gold-divider !my-4 !opacity-30" aria-hidden="true">
        ❖
      </div>

      {/* Stats row — shown only when there is reading history */}
      {hasHistory ? (
        <div className="mb-5 grid grid-cols-3 gap-3">
          <HeatStat
            icon={<CalendarDays className="h-4 w-4" />}
            label="活跃天数"
            value={stats.activeDays}
            suffix="天"
          />
          <HeatStat
            icon={<TrendingUp className="h-4 w-4" />}
            label="最长连读"
            value={stats.longestStreak}
            suffix="天"
          />
          <HeatStat
            icon={<Flame className="h-4 w-4" />}
            label="当前连读"
            value={stats.currentStreak}
            suffix="天"
          />
        </div>
      ) : null}

      {/* Heatmap grid — horizontally scrollable on narrow viewports */}
      <div className="overflow-x-auto">
        <div
          className="heat-grid inline-grid gap-[2px]"
          style={{
            gridTemplateColumns: `24px repeat(${WEEKS}, 12px)`,
            gridTemplateRows: `18px repeat(${DAYS}, 12px)`,
          }}
          role="img"
          aria-label="过去 18 周的阅读活动热力图，每格代表一天"
        >
          {gridItems}
        </div>
      </div>

      {/* Below the heatmap */}
      {hasHistory ? (
        <div className="mt-5">
          {/* Legend — uses `heat-legend-swatch` (not `heat-cell`) so the
              grid-cell count stays exactly 18×7 = 126 for verification. */}
          <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs text-muted-foreground">
            <span className="font-body-serif">少</span>
            <span className="text-muted-foreground/40">─</span>
            <div className="heat-legend-swatch h-3 w-3 rounded-sm bg-muted/40" aria-hidden="true" />
            <div className="heat-legend-swatch h-3 w-3 rounded-sm bg-gold/25" aria-hidden="true" />
            <div className="heat-legend-swatch h-3 w-3 rounded-sm bg-gold/50" aria-hidden="true" />
            <div className="heat-legend-swatch h-3 w-3 rounded-sm bg-gold/75" aria-hidden="true" />
            <div className="heat-legend-swatch h-3 w-3 rounded-sm bg-gold" aria-hidden="true" />
            <span className="text-muted-foreground/40">─</span>
            <span className="font-body-serif">多</span>
          </div>
          {/* Subtle quote */}
          <p className="mt-3 text-center font-body-serif text-xs italic text-muted-foreground/60">
            每一天的翻阅，都在书架上留下一粒尘埃。
          </p>
        </div>
      ) : (
        /* Empty state — friendly message + CTA, replacing the 0-stats */
        <div className="mt-5 flex flex-col items-center gap-3 text-center">
          <p className="font-body-serif text-sm italic text-muted-foreground">
            你尚未在图书馆留下足迹——翻开任意一卷，你的阅读日历便会苏醒。
          </p>
          <Button
            onClick={() => setView({ name: "library" })}
            className="rounded-full bg-gold text-ink hover:bg-gold/90"
            size="sm"
          >
            <BookOpen className="mr-2 h-4 w-4" /> 去书库
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </section>
  );
}

/** Compact stat tile matching the `Stat` pattern used elsewhere in About. */
function HeatStat({
  icon,
  label,
  value,
  suffix,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  suffix: string;
}) {
  return (
    <div className="heat-stat rounded-lg border border-border/50 bg-background/40 p-3 text-center">
      <div className="flex items-center justify-center gap-1.5 text-gold/80">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 font-serif-display text-xl font-semibold tabular-nums">
        {value}
        <span className="ml-0.5 text-xs font-normal text-muted-foreground">
          {suffix}
        </span>
      </p>
    </div>
  );
}
