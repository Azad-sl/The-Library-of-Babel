"use client";

import { useEffect, useState } from "react";
import { Clock, Hexagon } from "lucide-react";
import {
  getAllReadingTimes,
  getSavedProgressList,
  minutesRoundedUp,
  type SavedProgress,
} from "@/hooks/use-reading-memory";

/* ----------------------------------------------------------------------------
 * Reading Time Ring — cumulative reading-time visualisation for the About page.
 * Joins `getAllReadingTimes()` (slug→seconds) with `getSavedProgressList()`
 * (slug→title+hexagon) so each sample can be grouped by hexagon. Renders:
 *   1. SVG donut (200×200, r=80) — top 3 hexagons + "其它", 4 gold segments
 *   2. Centre label — rounded-up minutes + "分钟 · MINUTES" + italic hours
 *   3. Legend column (desktop) — swatch + hexagon + minutes + percentage
 *   4. 7-day bar chart — distinct slugs visited per day, gold gradient bars
 * Empty state: gold/20 ring, "尚无记录", "翻开一卷开始阅读 · OPEN A VOLUME".
 * -------------------------------------------------------------------------- */

interface HexagonBucket {
  hexagon: string;
  seconds: number;
}

interface Segment extends HexagonBucket {
  fraction: number;       // 0..1 share of total
  gradient: string;       // gradient id ref (goldGrad1..4)
  swatchClass: string;    // tailwind swatch class matching the gradient
}

const GRADIENTS: { id: string; swatchClass: string }[] = [
  { id: "goldGrad1", swatchClass: "bg-gold" },
  { id: "goldGrad2", swatchClass: "bg-gold/70" },
  { id: "goldGrad3", swatchClass: "bg-gold/50" },
  { id: "goldGrad4", swatchClass: "bg-gold/30" },
];

const WEEKDAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

/** Group all reading-time samples by hexagon, sorted desc by seconds. */
function bucketByHexagon(
  times: Record<string, number>,
  progressBySlug: Map<string, SavedProgress>
): HexagonBucket[] {
  const map = new Map<string, number>();
  for (const [slug, sec] of Object.entries(times)) {
    const hex = progressBySlug.get(slug)?.hexagon || "未分类";
    map.set(hex, (map.get(hex) || 0) + sec);
  }
  return Array.from(map.entries())
    .map(([hexagon, seconds]) => ({ hexagon, seconds }))
    .sort((a, b) => b.seconds - a.seconds);
}

/** Top 3 hexagons + aggregated "其它" bucket (if more than 3 distinct). */
function toSegments(buckets: HexagonBucket[]): Segment[] {
  const total = buckets.reduce((s, b) => s + b.seconds, 0);
  if (total === 0) return [];
  const top = buckets.slice(0, 3);
  const rest = buckets.slice(3);
  const out: Segment[] = top.map((b, i) => ({
    ...b,
    fraction: b.seconds / total,
    gradient: GRADIENTS[i]!.id,
    swatchClass: GRADIENTS[i]!.swatchClass,
  }));
  if (rest.length > 0) {
    const restSeconds = rest.reduce((s, b) => s + b.seconds, 0);
    out.push({
      hexagon: "其它",
      seconds: restSeconds,
      fraction: restSeconds / total,
      gradient: GRADIENTS[3]!.id,
      swatchClass: GRADIENTS[3]!.swatchClass,
    });
  }
  return out;
}

/** 7-day histogram (oldest → newest) of distinct slugs visited. */
function sevenDayHistogram(progress: SavedProgress[]): number[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayBuckets: { date: number; slugs: Set<string> }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dayBuckets.push({ date: d.getTime(), slugs: new Set() });
  }
  for (const p of progress) {
    const pd = new Date(p.savedAt);
    pd.setHours(0, 0, 0, 0);
    const dayIdx = dayBuckets.findIndex((b) => b.date === pd.getTime());
    if (dayIdx >= 0) dayBuckets[dayIdx]!.slugs.add(p.slug);
  }
  return dayBuckets.map((b) => b.slugs.size);
}

interface RingState {
  totalSeconds: number;
  totalMinutes: number;
  segments: Segment[];
  histogram: number[];
  hasData: boolean;
}

const EMPTY: RingState = {
  totalSeconds: 0,
  totalMinutes: 0,
  segments: [],
  histogram: [0, 0, 0, 0, 0, 0, 0],
  hasData: false,
};

function computeState(
  times: Record<string, number>,
  progress: SavedProgress[]
): RingState {
  const totalSeconds = Object.values(times).reduce((s, n) => s + n, 0);
  if (totalSeconds === 0) return EMPTY;
  const progressBySlug = new Map(progress.map((p) => [p.slug, p]));
  return {
    totalSeconds,
    totalMinutes: minutesRoundedUp(totalSeconds),
    segments: toSegments(bucketByHexagon(times, progressBySlug)),
    histogram: sevenDayHistogram(progress),
    hasData: true,
  };
}

export function ReadingTimeRing() {
  const [state, setState] = useState<RingState>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const times = getAllReadingTimes();
    const progress = getSavedProgressList();
    setState(computeState(times, progress));
    setReady(true);
  }, []);

  return (
    <section
      data-testid="reading-time-ring"
      className="reading-time-ring rise-in mt-8 rounded-2xl border border-gold/20 bg-card/40 p-6 sm:p-8"
      aria-labelledby="reading-time-ring-heading"
    >
      <h2 id="reading-time-ring-heading" className="sr-only">
        阅读时长
      </h2>

      {/* Header — gold eyebrow + serif title + italic subtitle */}
      <header className="mb-6 text-center">
        <p className="mb-1 flex items-center justify-center gap-1.5 text-[0.7rem] uppercase tracking-[0.28em] text-gold/70">
          <Clock className="h-3.5 w-3.5" /> READING TIME · 阅读时长
        </p>
        <h3 className="font-serif-display text-2xl font-semibold text-foreground">
          你的烛下时光
        </h3>
        <p className="mt-1 font-body-serif text-sm italic text-muted-foreground">
          本机记录的累计阅读时长，按回廊分布
        </p>
      </header>

      {/* Ring + legend */}
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8 sm:items-center sm:justify-center">
        <RingChart state={state} ready={ready} />

        {/* Legend column */}
        <div className="w-full max-w-xs flex-1">
          {state.hasData ? (
            <ul className="space-y-2">
              {state.segments.map((seg) => {
                const pct = Math.round(seg.fraction * 100);
                const min = minutesRoundedUp(seg.seconds);
                return (
                  <li
                    key={seg.hexagon}
                    className="reading-time-legend-row flex items-center gap-3 rounded-md border border-border/40 bg-background/40 px-3 py-2"
                  >
                    <span
                      className={`h-3 w-3 shrink-0 rounded-sm ${seg.swatchClass}`}
                      aria-hidden="true"
                    />
                    <Hexagon className="h-3.5 w-3.5 shrink-0 text-gold/50" />
                    <span className="min-w-0 flex-1 truncate font-body-serif text-sm text-foreground/85">
                      {seg.hexagon}
                    </span>
                    <span className="font-body-serif text-sm text-foreground/70 tabular-nums">
                      {min} 分
                    </span>
                    <span className="w-10 text-right font-body-serif text-xs text-gold/80 tabular-nums">
                      {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-center font-body-serif text-sm italic text-muted-foreground">
              尚无记录
            </p>
          )}
        </div>
      </div>

      {/* 7-day bar chart */}
      <SevenDayChart state={state} />
    </section>
  );
}

function RingChart({ state, ready }: { state: RingState; ready: boolean }) {
  const r = 80;
  const c = 2 * Math.PI * r;
  const size = 200;

  // For the empty state we draw a full gold/20 ring as a single segment.
  const emptySegment: Segment = {
    hexagon: "", seconds: 0, fraction: 1,
    gradient: "goldGrad4", swatchClass: "bg-gold/20",
  };
  const segments = state.hasData ? state.segments : [emptySegment];

  // Compute stroke-dasharray / dashoffset for each segment using a pure
  // reduce (lint rule react-hooks/immutability forbids reassignment in
  // render — so we accumulate via reduce rather than mutating a closure var).
  const cumulativeOffsets = segments.reduce<number[]>((acc, seg) => {
    const prev = acc.length > 0 ? acc[acc.length - 1]! : 0;
    acc.push(prev + seg.fraction);
    return acc;
  }, []);
  const renderedSegments = segments.map((seg, i) => ({
    ...seg,
    dasharray: `${seg.fraction * c} ${c - seg.fraction * c}`,
    dashoffset: -((cumulativeOffsets[i - 1] ?? 0)) * c,
  }));

  const hoursLabel = state.totalSeconds >= 3600
    ? `约 ${Math.round(state.totalSeconds / 3600)} 小时`
    : null;
  const center = size / 2;

  return (
    <div className="relative h-[200px] w-[200px] shrink-0">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="reading-time-ring-svg h-full w-full"
        role="img"
        aria-label={state.hasData
          ? `累计阅读 ${state.totalMinutes} 分钟，分布在 ${segments.length} 个回廊`
          : "尚无阅读时长记录"}
      >
        <defs>
          {[["goldGrad1", 1, 0.7], ["goldGrad2", 0.8, 0.5],
            ["goldGrad3", 0.6, 0.4], ["goldGrad4", 0.4, 0.2]].map(([id, a, b]) => (
            <linearGradient key={id as string} id={id as string} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity={a as number} />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity={b as number} />
            </linearGradient>
          ))}
        </defs>
        <circle cx={center} cy={center} r={r} fill="none"
          stroke="var(--gold)" strokeOpacity={0.08} strokeWidth={22} />
        <g transform={`rotate(-90 ${center} ${center})`}>
          {renderedSegments.map((seg, i) => (
            <circle key={i} className="ring-segment"
              cx={center} cy={center} r={r} fill="none"
              stroke={state.hasData ? `url(#${seg.gradient})` : "var(--gold)"}
              strokeOpacity={state.hasData ? undefined : 0.2}
              strokeWidth={22}
              strokeDasharray={seg.dasharray}
              strokeDashoffset={seg.dashoffset}
              strokeLinecap="butt"
            />
          ))}
        </g>
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        {state.hasData ? (
          <>
            <span className="font-serif-display text-4xl font-semibold text-foreground tabular-nums">
              {ready ? state.totalMinutes : "—"}
            </span>
            <span className="mt-0.5 text-[0.6rem] uppercase tracking-[0.22em] text-gold/70">
              分钟 · MINUTES
            </span>
            {hoursLabel && (
              <span className="mt-0.5 font-body-serif text-[0.7rem] italic text-muted-foreground">
                {hoursLabel}
              </span>
            )}
          </>
        ) : (
          <span className="font-body-serif text-sm italic text-muted-foreground">
            尚无记录
          </span>
        )}
      </div>
    </div>
  );
}

function SevenDayChart({ state }: { state: RingState }) {
  const max = Math.max(1, ...state.histogram);
  return (
    <div className="mt-8 border-t border-gold/15 pt-6">
      <div className="mb-3 flex items-center justify-center gap-1.5 text-[0.7rem] uppercase tracking-[0.28em] text-gold/70">
        <Clock className="h-3.5 w-3.5" />
        <span>近 7 日 · LAST 7 DAYS</span>
      </div>
      {state.hasData ? (
        <div className="mx-auto flex max-w-md items-end justify-between gap-2">
          {state.histogram.map((count, i) => {
            const heightPct = max === 0 ? 0 : (count / max) * 100;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="relative flex h-20 w-full items-end justify-center">
                  <div
                    className="reading-time-bar w-full max-w-[28px] rounded-t-sm bg-gradient-to-t from-gold/40 to-gold"
                    style={{ height: `${Math.max(heightPct, count > 0 ? 8 : 0)}%` }}
                    title={`${count} 卷`}
                  />
                </div>
                <span className="font-body-serif text-[0.65rem] text-muted-foreground">
                  {WEEKDAY_LABELS[i]}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center font-body-serif text-sm italic text-muted-foreground">
          翻开一卷开始阅读 · OPEN A VOLUME TO BEGIN
        </p>
      )}
    </div>
  );
}
