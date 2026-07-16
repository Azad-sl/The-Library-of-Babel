"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Heart, Hexagon, TrendingUp, BookText } from "lucide-react";
import type {
  HexagonDistribution,
  MonthlyTrendPoint,
  TagCount,
  TopPost,
  LongestPost,
} from "@/lib/types";
import { useLibrary } from "@/store/library-store";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

const HEX_PATH =
  "M50 6 L86 27 L86 73 L50 94 L14 73 L14 27 Z";

/** Decorative small hexagon (for inline use). */
function MiniHex({
  className,
  filled = false,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("h-3 w-3", className)}
      aria-hidden
    >
      <path
        d={HEX_PATH}
        fill={filled ? "var(--gold)" : "none"}
        stroke="var(--gold)"
        strokeWidth="4"
        opacity={filled ? 0.9 : 0.6}
      />
    </svg>
  );
}

/** Card wrapper with the ledger's subtle gold border. */
function LedgerCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-gold/25 bg-card/40 p-5 sm:p-6 rise-in",
        "hex-watermark",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Section header — small gold hexagon icon + label. */
export function LedgerHeader() {
  return (
    <div className="mb-6 flex items-center gap-3 rise-in">
      <svg viewBox="0 0 100 100" className="h-5 w-5 text-gold" aria-hidden>
        <path
          d={HEX_PATH}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
        />
        <path d={HEX_PATH} fill="var(--gold)" opacity={0.18} />
      </svg>
      <div className="flex flex-col">
        <h2 className="font-serif-display text-xl font-semibold tracking-wide sm:text-2xl">
          图书馆志
        </h2>
        <p className="font-body-serif text-xs uppercase tracking-[0.25em] text-muted-foreground italic">
          The Library&apos;s Ledger
        </p>
      </div>
      <div className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground/70 sm:flex">
        <span className="font-body-serif italic">数据更新于每次访问</span>
        <MiniHex />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Hexagonal Bar Chart — distribution across hexagons              */
/* ------------------------------------------------------------------ */

export function HexagonBarChart({
  data,
}: {
  data: HexagonDistribution[];
}) {
  const max = useMemo(
    () => Math.max(1, ...data.map((d) => d.count)),
    [data]
  );
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  if (data.length === 0) {
    return (
      <LedgerCard>
        <ChartTitle icon={<Hexagon className="h-4 w-4" />} title="六边形回廊 · 卷册分布" />
        <p className="font-body-serif text-sm italic text-muted-foreground">
          尚无卷册入册。
        </p>
      </LedgerCard>
    );
  }

  return (
    <LedgerCard>
      <ChartTitle
        icon={<Hexagon className="h-4 w-4" />}
        title="六边形回廊 · 卷册分布"
        subtitle="每条以六边形为端，示回廊中所藏卷册之数"
      />
      <ul className="mt-5 space-y-3.5 stagger-in">
        {data.map((d) => {
          const pct = (d.count / max) * 100;
          const widthStyle = mounted ? `${pct}%` : "0%";
          return (
            <li key={d.name} className="group">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    useLibrary.getState().setView({
                      name: "hexagon",
                      hexagon: d.name,
                    });
                  }}
                  className="font-body-serif text-sm text-foreground/80 transition-colors hover:text-gold elegant-underline"
                >
                  {d.name}
                </button>
                <span className="font-serif-display text-sm tabular-nums text-gold">
                  {d.count}
                  <span className="ml-1 text-[0.7rem] text-muted-foreground">
                    卷
                  </span>
                </span>
              </div>
              <div className="relative h-5 overflow-hidden rounded-sm bg-muted/40">
                <div
                  className="hex-bar-fill relative h-full"
                  style={{
                    width: widthStyle,
                    transition: "width 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                />
              </div>
              {/* meta line */}
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[0.7rem] text-muted-foreground/80">
                <span className="font-body-serif italic">
                  {d.totalWords.toLocaleString()} 字
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <Eye className="h-2.5 w-2.5" /> {d.totalViews}
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <Heart className="h-2.5 w-2.5" /> {d.totalLikes}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </LedgerCard>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Monthly Trend Sparkline — SVG area chart                        */
/* ------------------------------------------------------------------ */

export function MonthlySparkline({
  data,
}: {
  data: MonthlyTrendPoint[];
}) {
  const W = 320;
  const H = 96;
  const padX = 6;
  const padY = 14;

  const { path, areaPath, dots, minLabel, maxLabel, hasData } = useMemo(() => {
    if (data.length === 0 || data.every((d) => d.count === 0)) {
      return {
        path: "",
        areaPath: "",
        dots: [] as { x: number; y: number; count: number; month: string }[],
        minLabel: null,
        maxLabel: null,
        hasData: false,
      };
    }
    const counts = data.map((d) => d.count);
    const max = Math.max(...counts, 1);
    const min = Math.min(...counts);
    const innerW = W - padX * 2;
    const innerH = H - padY * 2;
    const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

    const points = data.map((d, i) => {
      const x = padX + i * stepX;
      const range = max - min || 1;
      const y = padY + innerH - ((d.count - min) / range) * innerH;
      return { x, y, count: d.count, month: d.month };
    });

    const pathStr = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(" ");
    const areaStr = `${pathStr} L${points[points.length - 1].x.toFixed(2)} ${(
      H - padY
    ).toFixed(2)} L${points[0].x.toFixed(2)} ${(H - padY).toFixed(2)} Z`;

    let ml: { month: string; count: number; x: number } | null = null;
    let mxl: { month: string; count: number; x: number } | null = null;
    for (const p of points) {
      if (p.count === min && !ml) ml = { month: p.month, count: p.count, x: p.x };
      if (p.count === max && !mxl)
        mxl = { month: p.month, count: p.count, x: p.x };
    }

    return {
      path: pathStr,
      areaPath: areaStr,
      dots: points,
      minLabel: ml,
      maxLabel: mxl,
      hasData: true,
    };
  }, [data]);

  return (
    <LedgerCard>
      <ChartTitle
        icon={<TrendingUp className="h-4 w-4" />}
        title="近十二个月 · 新册趋势"
        subtitle="每月入册之卷册数"
      />
      <div className="mt-4">
        {!hasData ? (
          <p className="font-body-serif text-sm italic text-muted-foreground py-6 text-center">
            近一年内尚无新册入册。
          </p>
        ) : (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-auto"
            role="img"
            aria-label="近十二个月新册趋势图"
          >
            <defs>
              <linearGradient id="spark-area" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--gold)"
                  stopOpacity="0.32"
                />
                <stop
                  offset="100%"
                  stopColor="var(--gold)"
                  stopOpacity="0"
                />
              </linearGradient>
              <linearGradient id="spark-stroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.7" />
                <stop offset="50%" stopColor="var(--gold)" />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* baseline */}
            <line
              x1={padX}
              y1={H - padY}
              x2={W - padX}
              y2={H - padY}
              stroke="var(--border)"
              strokeWidth="0.5"
              strokeDasharray="2 3"
            />

            {/* area fill */}
            <path
              d={areaPath}
              fill="url(#spark-area)"
              className="spark-area-draw"
            />

            {/* stroke line */}
            <path
              d={path}
              fill="none"
              stroke="url(#spark-stroke)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="spark-line-draw"
            />

            {/* dots */}
            {dots.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={p.count > 0 ? 1.8 : 1.1}
                fill="var(--gold)"
                opacity={p.count > 0 ? 0.95 : 0.4}
                className="spark-dot"
                style={{ animationDelay: `${0.4 + i * 0.05}s` }}
              >
                <title>{`${p.month} · ${p.count} 卷`}</title>
              </circle>
            ))}

            {/* min / max labels */}
            {maxLabel && (
              <text
                x={Math.min(W - 32, Math.max(4, maxLabel.x - 12))}
                y={padY - 3}
                fill="var(--gold)"
                fontSize="9"
                fontFamily="var(--font-body-serif), Georgia, serif"
                fontStyle="italic"
              >
                峰 · {maxLabel.count}
              </text>
            )}
            {minLabel && minLabel.count !== maxLabel?.count && (
              <text
                x={Math.min(W - 32, Math.max(4, minLabel.x - 8))}
                y={H - 3}
                fill="var(--muted-foreground)"
                fontSize="9"
                fontFamily="var(--font-body-serif), Georgia, serif"
                fontStyle="italic"
              >
                谷 · {minLabel.count}
              </text>
            )}
          </svg>
        )}
        {/* month axis */}
        {hasData && data.length > 0 && (
          <div className="mt-1 flex justify-between font-body-serif text-[0.65rem] text-muted-foreground/70 italic">
            <span>{data[0]?.month.slice(5)}月</span>
            <span>{data[Math.floor(data.length / 2)]?.month.slice(5)}月</span>
            <span>{data[data.length - 1]?.month.slice(5)}月</span>
          </div>
        )}
      </div>
    </LedgerCard>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Word Count Hero Number                                          */
/* ------------------------------------------------------------------ */

export function WordHero({
  totalWords,
  longestPost,
}: {
  totalWords: number;
  longestPost: LongestPost | null;
}) {
  const books = totalWords / 80000;
  const booksLabel =
    books >= 1
      ? books.toFixed(1)
      : books.toFixed(2);
  return (
    <LedgerCard className="text-center">
      <div className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2">
        <svg viewBox="0 0 100 100" className="h-6 w-6 opacity-60" aria-hidden>
          <path d={HEX_PATH} fill="var(--gold)" opacity={0.22} />
          <path
            d={HEX_PATH}
            fill="none"
            stroke="var(--gold)"
            strokeWidth="4"
          />
        </svg>
      </div>
      <ChartTitle
        icon={<BookText className="h-4 w-4" />}
        title="字数 · 累计已写下"
        center
      />
      <p className="mt-4 font-serif-display text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
        <span className="shimmer-gold">{totalWords.toLocaleString()}</span>
      </p>
      <p className="mt-1 font-body-serif text-sm italic text-muted-foreground">
        字 · 已写下
      </p>
      <div className="gold-divider !my-4 !opacity-30" />
      <p className="font-body-serif text-sm text-muted-foreground">
        ≈ <span className="font-serif-display text-base text-gold">{booksLabel}</span>{" "}
        本中等厚度的书
      </p>
      {longestPost && (
        <button
          type="button"
          onClick={() =>
            useLibrary.getState().setView({ name: "volume", slug: longestPost.slug })
          }
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-background/30 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-gold/60 hover:text-gold elegant-underline"
        >
          <BookText className="h-3 w-3" />
          最长卷册：《{truncate(longestPost.title, 16)}》·{" "}
          {longestPost.wordCount.toLocaleString()} 字 · {longestPost.readMinutes} 分钟
        </button>
      )}
    </LedgerCard>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Top Tags Cloud                                                  */
/* ------------------------------------------------------------------ */

export function TagCloud({ data }: { data: TagCount[] }) {
  if (data.length === 0) {
    return (
      <LedgerCard>
        <ChartTitle icon={<Hexagon className="h-4 w-4" />} title="标签云 · Tag Cloud" />
        <p className="font-body-serif text-sm italic text-muted-foreground">
          尚无标签入册。
        </p>
      </LedgerCard>
    );
  }
  const max = Math.max(...data.map((t) => t.count));
  const min = Math.min(...data.map((t) => t.count));
  return (
    <LedgerCard>
      <ChartTitle
        icon={<Hexagon className="h-4 w-4" />}
        title="标签云 · Tag Cloud"
        subtitle="字号随卷册数增减"
      />
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 stagger-in">
        {data.map((t) => {
          const ratio =
            max === min ? 0.6 : (t.count - min) / (max - min);
          const fontSize = `${(0.8 + ratio * 0.8).toFixed(2)}rem`;
          const opacity = 0.55 + ratio * 0.45;
          return (
            <button
              key={t.tag}
              type="button"
              onClick={() =>
                useLibrary.getState().setView({
                  name: "library",
                  tag: t.tag,
                })
              }
              className="font-body-serif italic transition-all duration-300 hover:scale-[1.05] hover:text-gold"
              style={{
                fontSize,
                color: "var(--gold)",
                opacity,
                lineHeight: 1.4,
              }}
              title={`${t.count} 卷`}
            >
              {t.tag}
              <sup className="ml-0.5 text-[0.65em] opacity-70 not-italic">
                {t.count}
              </sup>
            </button>
          );
        })}
      </div>
    </LedgerCard>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Top Viewed / Liked Dual List                                    */
/* ------------------------------------------------------------------ */

export function TopDualList({
  viewed,
  liked,
}: {
  viewed: TopPost[];
  liked: TopPost[];
}) {
  return (
    <LedgerCard>
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        <TopColumn
          icon={<Eye className="h-4 w-4" />}
          title="翻阅最多 · Most Viewed"
          items={viewed}
          valueKey="views"
        />
        <TopColumn
          icon={<Heart className="h-4 w-4" />}
          title="珍藏最多 · Most Liked"
          items={liked}
          valueKey="likes"
        />
      </div>
    </LedgerCard>
  );
}

function TopColumn({
  icon,
  title,
  items,
  valueKey,
}: {
  icon: React.ReactNode;
  title: string;
  items: TopPost[];
  valueKey: "views" | "likes";
}) {
  const empty = items.length === 0;
  return (
    <div>
      <p className="mb-3 flex items-center gap-2 font-serif-display text-sm font-semibold tracking-wide text-gold">
        {icon}
        {title}
      </p>
      {empty ? (
        <p className="font-body-serif text-sm italic text-muted-foreground">
          暂无数据。
        </p>
      ) : (
        <ol className="space-y-2.5 stagger-in">
          {items.map((p, i) => {
            const value = p[valueKey] ?? 0;
            return (
              <li key={p.slug + i} className="group flex items-start gap-3">
                <span className="mt-0.5 w-6 shrink-0 text-right font-serif-display text-xl font-semibold leading-none text-gold/70 transition-colors group-hover:text-gold">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() =>
                      useLibrary.getState().setView({ name: "volume", slug: p.slug })
                    }
                    className="block w-full text-left font-body-serif text-sm text-foreground/85 transition-colors hover:text-gold elegant-underline"
                  >
                    <span className="line-clamp-1">{p.title}</span>
                  </button>
                  <div className="mt-0.5 flex items-center gap-2 text-[0.7rem] text-muted-foreground/80">
                    <span className="inline-flex items-center gap-0.5">
                      {icon}
                      {value.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="font-body-serif italic truncate">
                      {p.hexagon}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small shared helpers                                               */
/* ------------------------------------------------------------------ */

function ChartTitle({
  icon,
  title,
  subtitle,
  center,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={cn(center && "text-center")}>
      <p
        className={cn(
          "flex items-center gap-2 font-serif-display text-sm font-semibold tracking-wide text-gold",
          center && "justify-center"
        )}
      >
        {icon}
        {title}
      </p>
      {subtitle && (
        <p
          className={cn(
            "mt-1 font-body-serif text-xs italic text-muted-foreground/80",
            center && "justify-center"
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

/* ------------------------------------------------------------------ */
/* Loading skeleton — used by the parent while data is fetching       */
/* ------------------------------------------------------------------ */

export function LedgerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-7 w-56 animate-pulse rounded bg-muted/60" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-xl border border-gold/15 bg-card/30"
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Container — fetches detail stats and lays out the whole ledger     */
/* ------------------------------------------------------------------ */

export function LibraryLedger() {
  const detail = useAsync(() => api.statsDetail(), []);
  const { data, loading, error } = detail;

  if (loading) {
    return (
      <section className="mt-12">
        <LedgerHeader />
        <LedgerSkeleton />
      </section>
    );
  }
  if (error || !data) {
    return (
      <section className="mt-12">
        <LedgerHeader />
        <LedgerCard>
          <p className="font-body-serif text-sm italic text-muted-foreground">
            馆志暂未能翻开。{error ? `（${error}）` : ""}
          </p>
        </LedgerCard>
      </section>
    );
  }

  return (
    <section className="mt-12">
      <LedgerHeader />

      {/* Row 1 — word hero spans 1 col, bar chart 1 col, sparkline full width below on mobile */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <WordHero
          totalWords={data.totalWords}
          longestPost={data.longestPost}
        />
        <HexagonBarChart data={data.hexagonDistribution} />
      </div>

      {/* Row 2 — sparkline + tag cloud */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <MonthlySparkline data={data.monthlyTrend} />
        <TagCloud data={data.topTags} />
      </div>

      {/* Row 3 — top viewed / liked dual list (full width) */}
      <div className="mt-4">
        <TopDualList viewed={data.topViewed} liked={data.topLiked} />
      </div>

      {/* Footer note */}
      <div className="mt-6 flex items-center justify-center gap-2 text-center font-body-serif text-xs italic text-muted-foreground/60">
        <MiniHex />
        <span>
          累计阅读时长约 {data.totalReadingMinutes.toLocaleString()} 分钟 · 平均每卷{" "}
          {data.avgReadingMinutes} 分钟
        </span>
        <MiniHex />
      </div>
    </section>
  );
}
