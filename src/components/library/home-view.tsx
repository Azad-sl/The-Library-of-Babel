"use client";

import { useEffect, useState } from "react";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/lib/api";
import { useLibrary } from "@/store/library-store";
import { VolumeCard } from "./volume-card";
import { HexRing } from "./hex-logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Library,
  Hexagon,
  Eye,
  Heart,
  ArrowRight,
  BookOpen,
  Scroll,
  Search,
  BookmarkCheck,
  BookCheck,
  Check,
} from "lucide-react";
import { libraryScale, hashSeed } from "@/lib/babel";
import { cn } from "@/lib/utils";
import { getContinueReading, getFinishedReading, type SavedProgress } from "@/hooks/use-reading-memory";
import type { PostSummary } from "@/lib/types";
import { QuoteOfTheDay } from "./quote-of-the-day";

export function HomeView() {
  const { setView } = useLibrary();
  const featured = useAsync(() => api.listPosts({ featured: true, limit: 6 }), []);
  const recent = useAsync(() => api.listPosts({ limit: 5 }), []);
  const hexagons = useAsync(() => api.listHexagons(), []);
  const stats = useAsync(() => api.stats(), []);

  return (
    <div className="page-enter">
      {/* ───────────── HERO ───────────── */}
      <section className="relative grain overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-28">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left: title */}
            <div className="relative z-10">
              <div className="mb-5 flex items-center gap-2 text-sm text-gold/80">
                <span className="inline-block h-px w-8 bg-gold/60" />
                <span className="font-body-serif uppercase tracking-[0.32em]">
                  est. infinitum · 自 ∞ 起
                </span>
              </div>
              <h1 className="ink-reveal font-serif-display text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                巴别
                <span className="shimmer-gold">图书馆</span>
              </h1>
              <p className="mt-2 font-body-serif text-lg italic text-muted-foreground sm:text-xl">
                The Library of Babel
              </p>

              <p className="mt-6 max-w-xl font-body-serif text-base leading-relaxed text-foreground/80 sm:text-lg">
                一座由六边形回廊构成的、近乎无限的个人图书馆。
                收录随笔、读书笔记与思辨——
                <span className="text-gold">每一卷都早已写好，我们只是在翻阅。</span>
              </p>

              <blockquote className="mt-6 max-w-xl border-l-2 border-gold/50 pl-4 font-body-serif text-sm italic leading-relaxed text-muted-foreground">
                "宇宙（别人管它叫图书馆）由一个数目不定的、也许是无限的六边形回廊组成，
                每个回廊各有四面书架，书架上有相同数目的书卷……"
                <br />
                <span className="mt-1 block not-italic text-gold/70">—— 豪·路·博尔赫斯</span>
              </blockquote>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  onClick={() => setView({ name: "library" })}
                  className="group rounded-full bg-gold px-6 text-ink hover:bg-gold/90"
                  size="lg"
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  进入书库
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  onClick={() => setView({ name: "search", query: "" })}
                  variant="outline"
                  size="lg"
                  className="rounded-full border-gold/40 text-foreground hover:border-gold hover:text-gold"
                >
                  <Search className="mr-2 h-4 w-4" />
                  检索目录
                </Button>
              </div>

              {/* Stats strip */}
              <div className="mt-10 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4">
                <StatChip
                  icon={<Library className="h-4 w-4" />}
                  label="卷册"
                  value={stats.data?.totalVolumes}
                  loading={stats.loading}
                />
                <StatChip
                  icon={<Hexagon className="h-4 w-4" />}
                  label="回廊"
                  value={stats.data?.totalHexagons}
                  loading={stats.loading}
                />
                <StatChip
                  icon={<Eye className="h-4 w-4" />}
                  label="翻阅"
                  value={stats.data?.totalViews}
                  loading={stats.loading}
                />
                <StatChip
                  icon={<Heart className="h-4 w-4" />}
                  label="收藏"
                  value={stats.data?.totalLikes}
                  loading={stats.loading}
                />
              </div>
            </div>

            {/* Right: hexagonal emblem */}
            <div className="relative hidden aspect-square items-center justify-center lg:flex">
              <HexEmblem />
            </div>
          </div>
        </div>
      </section>

      {/* ───────────── QUOTE OF THE DAY ───────────── */}
      <QuoteOfTheDay />

      {/* ───────────── CONTINUE READING ───────────── */}
      <ContinueReading />

      {/* ───────────── FINISHED READING ───────────── */}
      <FinishedReading />

      {/* ───────────── READING TIMELINE ───────────── */}
      <ReadingTimeline />

      {/* ───────────── TODAY'S READING ───────────── */}
      <TodaysReading />

      {/* ───────────── FEATURED ───────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold/70">
              <Scroll className="h-3.5 w-3.5" /> 馆长推荐
            </p>
            <h2 className="font-serif-display text-3xl font-semibold text-foreground sm:text-4xl">
              推荐卷册
            </h2>
          </div>
          <Button
            variant="ghost"
            onClick={() => setView({ name: "library" })}
            className="hidden items-center gap-1 text-muted-foreground hover:text-gold sm:flex"
          >
            全部卷册 <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {featured.loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-xl" />
            ))}
          </div>
        ) : featured.data && featured.data.length > 0 ? (
          <div className="stagger-in grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.data.map((p, i) => (
              <VolumeCard key={p.id} post={p} variant="featured" index={i} />
            ))}
          </div>
        ) : (
          <EmptyState
            onSeed={() => api.seed().then(() => featured.reload())}
            onBrowse={() => setView({ name: "library" })}
          />
        )}
      </section>

      {/* ───────────── HEXAGONS ───────────── */}
      <section className="hex-watermark border-y border-gold/10 bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <div className="flex items-center gap-2">
              <Hexagon className="h-5 w-5 text-gold" />
              <h2 className="font-serif-display text-3xl font-semibold">
                六边形回廊
              </h2>
              <span className="font-body-serif text-sm italic text-muted-foreground">
                · 按主题漫步
              </span>
            </div>
            <button
              onClick={() => setView({ name: "hexagons" })}
              className="group hidden items-center gap-1 text-xs text-gold/80 transition-colors hover:text-gold sm:flex"
            >
              <span className="font-body-serif uppercase tracking-[0.2em]">步入所有回廊</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
          {hexagons.loading ? (
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-32 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {hexagons.data?.map((h, i) => (
                <button
                  key={h.name}
                  onClick={() => setView({ name: "hexagon", hexagon: h.name })}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-lg border border-gold/20 bg-background/50 px-4 py-3 transition-all duration-300 hover:border-gold/60 hover:shadow-[0_4px_24px_-8px_var(--gold)]/40 rise-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span className="flex h-9 w-9 items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 100 100" aria-hidden>
                      <path
                        d="M50 6 L86 27 L86 73 L50 94 L14 73 L14 27 Z"
                        fill="none"
                        stroke="var(--gold)"
                        strokeWidth="2.5"
                        className="transition-all group-hover:fill-gold/10"
                      />
                      <text
                        x="50"
                        y="58"
                        textAnchor="middle"
                        className="fill-gold font-serif-display"
                        fontSize="26"
                      >
                        {h.name.slice(0, 1)}
                      </text>
                    </svg>
                  </span>
                  <span className="flex flex-col items-start leading-none">
                    <span className="font-serif-display text-base font-medium text-foreground group-hover:text-gold">
                      {h.name}
                    </span>
                    <span className="mt-1 font-body-serif text-xs text-muted-foreground">
                      {h.count} 卷
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ───────────── LIBRARY ATLAS (stats viz) ───────────── */}
      <LibraryAtlas />

      {/* ───────────── RECENT ───────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="mb-6 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-gold" />
              <h2 className="font-serif-display text-3xl font-semibold">
                新近入库
              </h2>
            </div>
            {recent.loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {recent.data?.map((p) => (
                  <VolumeCard key={p.id} post={p} variant="compact" />
                ))}
              </div>
            )}
          </div>

          {/* Side: search invite + scale */}
          <aside className="space-y-6">
            <div className="rounded-xl border border-border/60 bg-card/40 p-6">
              <Search className="h-5 w-5 text-gold/70" />
              <h3 className="mt-2 font-serif-display text-lg font-semibold">
                检索目录
              </h3>
              <p className="mt-1 font-body-serif text-sm text-muted-foreground">
                在所有卷册中寻找一个词——也许它会带你到意想不到的回廊。
              </p>
              <Button
                variant="outline"
                onClick={() => setView({ name: "search", query: "" })}
                className="mt-3 rounded-full border-gold/30 text-foreground hover:border-gold hover:text-gold"
              >
                <Search className="mr-2 h-4 w-4" /> 去检索
              </Button>
            </div>

            <div className="rounded-xl border border-border/40 bg-background/30 p-5 text-center">
              <p className="font-body-serif text-xs uppercase tracking-[0.25em] text-gold/60">
                图书馆之尺度
              </p>
              <p className="mt-2 font-serif-display text-sm leading-relaxed text-muted-foreground">
                {libraryScale()}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/30 px-3 py-2.5 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-gold/80">
        {icon}
        <span className="font-body-serif text-xs uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-1 font-serif-display text-2xl font-semibold text-foreground">
        {loading ? "—" : value ?? 0}
      </p>
    </div>
  );
}

function EmptyState({
  onSeed,
  onBrowse,
}: {
  onSeed: () => void;
  onBrowse: () => void;
}) {
  return (
    <div className="rounded-xl border border-dashed border-gold/30 bg-card/30 p-12 text-center">
      <HexRing count={6} radius={36} className="mx-auto h-24 w-24 opacity-40" />
      <h3 className="mt-4 font-serif-display text-2xl font-semibold">
        书架空空，烛火未点
      </h3>
      <p className="mx-auto mt-2 max-w-md font-body-serif text-sm text-muted-foreground">
        这座图书馆尚未入库任何卷册。让图书管理员先放进几本，好点亮回廊。
      </p>
      <div className="mt-5 flex justify-center gap-3">
        <Button onClick={onSeed} className="rounded-full bg-gold text-ink hover:bg-gold/90">
          <Sparkles className="mr-2 h-4 w-4" /> 入库样本卷册
        </Button>
        <Button variant="outline" onClick={onBrowse} className="rounded-full">
          去书库看看
        </Button>
      </div>
    </div>
  );
}

/** The big hexagonal emblem in the hero. */
function HexEmblem() {
  return (
    <div className="relative h-full w-full max-w-md">
      {/* outer rotating ring */}
      <div className="absolute inset-0">
        <HexRing count={12} radius={150} className="h-full w-full slow-spin opacity-30" />
      </div>
      {/* middle ring */}
      <div className="absolute inset-8">
        <HexRing count={6} radius={120} className="h-full w-full slow-spin-rev opacity-50" />
      </div>
      {/* central hexagon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 200 200" className="h-64 w-64 drop-shadow-[0_0_24px_var(--gold)]/40">
          <defs>
            <radialGradient id="centerGrad" cx="50%" cy="40%">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path
            d="M100 10 L172 50 L172 150 L100 190 L28 150 L28 50 Z"
            fill="url(#centerGrad)"
            stroke="var(--gold)"
            strokeWidth="1.5"
          />
          <path
            d="M100 30 L152 60 L152 140 L100 170 L48 140 L48 60 Z"
            fill="none"
            stroke="var(--gold)"
            strokeWidth="1"
            opacity="0.5"
          />
          {/* book spines in center */}
          <g transform="translate(100 100)">
            {[-18, -9, 0, 9, 18].map((x, i) => (
              <rect
                key={i}
                x={x - 3}
                y={-26 + (i % 2) * 4}
                width="6"
                height={52 - (i % 2) * 4}
                rx="1"
                fill="var(--gold)"
                opacity={0.5 + (i % 3) * 0.2}
              />
            ))}
          </g>
          {/* candle flame */}
          <g transform="translate(100 60)">
            <ellipse cx="0" cy="0" rx="3" ry="6" fill="var(--gold)" className="flicker" />
            <circle cx="0" cy="2" r="1.5" fill="var(--ink)" opacity="0.6" />
          </g>
        </svg>
      </div>
    </div>
  );
}

/** "Continue reading" banner — shows the last in-progress volume with a resume button. */
function ContinueReading() {
  const { setView } = useLibrary();
  const [entry, setEntry] = useState<
    { slug: string; title: string; hexagon: string; percent: number } | null
  >(null);

  useEffect(() => {
    const e = getContinueReading();
    if (e) setEntry(e);
  }, []);

  if (!entry) return null;

  const pct = Math.round(entry.percent * 100);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <button
        onClick={() => setView({ name: "volume", slug: entry.slug })}
        className="group flex w-full items-center gap-4 overflow-hidden rounded-xl border border-gold/25 bg-gradient-to-r from-card/60 via-card/40 to-background/30 p-4 backdrop-blur-sm transition-all hover:border-gold/50 hover:shadow-[0_4px_30px_-8px_var(--gold)]/30 sm:p-5 rise-in"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold transition-transform group-hover:scale-110">
          <BookmarkCheck className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 text-left">
          <p className="mb-0.5 flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-gold/70">
            <BookmarkCheck className="h-3 w-3" /> 继续阅读
          </p>
          <p className="truncate font-serif-display text-base font-medium text-foreground group-hover:text-gold sm:text-lg">
            {entry.title}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-border/40">
              <div
                className="h-full bg-gradient-to-r from-gold/50 to-gold transition-[width]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {pct}% · {entry.hexagon}
            </span>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-gold" />
      </button>
    </section>
  );
}

/**
 * Finished Reading — a horizontal scroll strip of volumes the reader has finished.
 * Each entry is a small "spine" with a gold checkmark seal.
 * Hidden when the reader hasn't finished any volumes yet.
 */
function FinishedReading() {
  const { setView } = useLibrary();
  const [entries, setEntries] = useState<
    { slug: string; title: string; hexagon: string; savedAt: number }[] | null
  >(null);

  useEffect(() => {
    const list = getFinishedReading();
    setEntries(list.slice(0, 12));
  }, []);

  if (!entries || entries.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-gold/15 bg-card/20 p-4 backdrop-blur-sm rise-in">
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold/70">
            <BookCheck className="h-3.5 w-3.5" /> 已读完 · {entries.length} 卷
          </p>
          <p className="font-body-serif text-xs italic text-muted-foreground">
            它们已在你的书架上留下书签
          </p>
        </div>
        <div className="flex items-stretch gap-3 overflow-x-auto pb-1 scroll-leather">
          {entries.map((e, idx) => (
            <div key={e.slug} className="flex items-center gap-3">
              <button
                onClick={() => setView({ name: "volume", slug: e.slug })}
                className="group relative flex h-32 w-20 shrink-0 flex-col items-center justify-between overflow-hidden rounded-md border border-gold/30 bg-gradient-to-b from-card/90 via-card/60 to-background/30 p-2 text-center shadow-md transition-all duration-500 hover:-translate-y-1.5 hover:border-gold hover:shadow-[0_10px_30px_-8px_var(--gold)]/60"
                title={e.title}
              >
                {/* gold checkmark seal */}
                <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-ink shadow-lg ring-2 ring-background">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                {/* spine gilding lines */}
                <div className="mt-1.5 space-y-0.5">
                  <div className="h-px w-8 bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
                  <div className="h-px w-6 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
                  <div className="h-px w-7 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                </div>
                <p className="flex-1 [writing-mode:vertical-rl] font-serif-display text-[0.7rem] leading-tight text-foreground/85 transition-colors group-hover:text-gold">
                  {e.title.length > 14 ? e.title.slice(0, 14) + "…" : e.title}
                </p>
                <div className="space-y-0.5">
                  <div className="h-px w-7 bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                  <div className="h-px w-6 bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
                  <div className="h-px w-8 bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
                </div>
                {/* spine label */}
                <span className="absolute bottom-1 right-1 font-mono text-[0.55rem] text-gold/40">
                  {String(idx + 1).padStart(2, "0")}
                </span>
              </button>
              {/* decorative separator ❖ */}
              {idx < entries.length - 1 && (
                <span className="text-gold/30 select-none">❖</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Reading Timeline — visual timeline of reading activity.
 * Shows a horizontal timeline with dots for each reading session,
 * grouped by day. Each dot represents a volume the reader has engaged with.
 */
function ReadingTimeline() {
  const { setView } = useLibrary();
  const [timeline, setTimeline] = useState<
    { date: string; entries: { slug: string; title: string; hexagon: string; percent: number; finished: boolean; savedAt: number }[] }[]
  >(null);

  useEffect(() => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith("babel-read-progress:"));
      if (keys.length === 0) { setTimeline([]); return; }

      const allEntries = keys.map(k => {
        try {
          return JSON.parse(localStorage.getItem(k) || "null") as SavedProgress | null;
        } catch { return null; }
      }).filter((e): e is SavedProgress => !!e && e.percent > 0.05)
        .sort((a, b) => b.savedAt - a.savedAt);

      // Group by date
      const groups: Record<string, SavedProgress[]> = {};
      for (const e of allEntries) {
        const date = new Date(e.savedAt).toLocaleDateString("zh-CN", {
          year: "numeric", month: "long", day: "numeric"
        });
        if (!groups[date]) groups[date] = [];
        groups[date].push(e);
      }

      const result = Object.entries(groups).map(([date, entries]) => ({
        date,
        entries: entries.map(e => ({
          slug: e.slug,
          title: e.title,
          hexagon: e.hexagon,
          percent: e.percent,
          finished: !!e.finished,
          savedAt: e.savedAt,
        })),
      }));

      setTimeline(result);
    } catch {
      setTimeline([]);
    }
  }, []);

  if (!timeline || timeline.length === 0) return null;

  const totalSessions = timeline.reduce((sum, g) => sum + g.entries.length, 0);
  const totalFinished = timeline.reduce((sum, g) => sum + g.entries.filter(e => e.finished).length, 0);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className="rounded-xl border border-gold/15 bg-card/20 p-5 backdrop-blur-sm rise-in">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold/70">
              <Scroll className="h-3.5 w-3.5" /> 阅读足迹 · Reading Footprints
            </p>
            <p className="mt-0.5 font-body-serif text-xs text-muted-foreground">
              {totalSessions} 次翻阅 · {totalFinished} 卷读完
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView({ name: "marginalia" })}
            className="text-xs text-gold/70 hover:text-gold"
          >
            查看批注 <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>

        {/* Timeline visualization */}
        <div className="relative space-y-0">
          {timeline.map((group, gi) => (
            <div key={group.date} className="relative flex gap-4 py-2 stagger-in" style={{ animationDelay: `${gi * 80}ms` }}>
              {/* Left: date label */}
              <div className="w-28 shrink-0 pt-0.5 text-right">
                <p className="font-serif-display text-sm font-medium text-foreground/80">
                  {gi === 0 ? "今天" : gi === 1 ? "昨天" : group.date}
                </p>
                <p className="font-body-serif text-[0.65rem] text-muted-foreground">
                  {group.entries.length} 卷
                </p>
              </div>

              {/* Center: timeline line + dot */}
              <div className="relative flex flex-col items-center">
                <div className="h-3 w-3 rounded-full border-2 border-gold bg-card shadow-sm" />
                {gi < timeline.length - 1 && (
                  <div className="w-px flex-1 bg-gradient-to-b from-gold/40 to-gold/10" />
                )}
              </div>

              {/* Right: volume entries */}
              <div className="flex-1 space-y-1.5 pb-2">
                {group.entries.map((entry) => (
                  <button
                    key={entry.slug}
                    onClick={() => setView({ name: "volume", slug: entry.slug })}
                    className="group flex w-full items-center gap-2.5 rounded-lg border border-transparent px-3 py-1.5 text-left transition-all hover:border-gold/20 hover:bg-gold/5"
                  >
                    {/* Progress dot */}
                    <span className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      entry.finished
                        ? "bg-gold shadow-sm shadow-gold/30"
                        : "bg-gold/40"
                    )} />
                    <span className="flex-1 truncate font-body-serif text-sm text-foreground/80 transition-colors group-hover:text-gold">
                      {entry.title}
                    </span>
                    <span className="shrink-0 font-mono text-[0.65rem] text-muted-foreground">
                      {entry.finished ? "✓" : `${Math.round(entry.percent * 100)}%`}
                    </span>
                    <span className="shrink-0 rounded-full bg-gold/10 px-1.5 py-0.5 font-body-serif text-[0.6rem] text-gold/70">
                      {entry.hexagon}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Library Atlas — a visual breakdown of the library's composition.
 * Left: horizontal hexagon bars (posts per hexagon).
 * Right: stat tiles + a small "reading activity" sparkline.
 */
function LibraryAtlas() {
  const { setView } = useLibrary();
  const hexagons = useAsync(() => api.listHexagons(), []);
  const stats = useAsync(() => api.stats(), []);
  const recent = useAsync(() => api.listPosts({ limit: 50 }), []);

  const maxCount = hexagons.data
    ? Math.max(...hexagons.data.map((h) => h.count), 1)
    : 1;

  // build a simple 30-day activity sparkline from recent posts' createdAt
  const sparkline = (() => {
    if (!recent.data || recent.data.length === 0) return [];
    const days = 30;
    const now = Date.now();
    const dayMs = 86400000;
    const buckets = new Array(days).fill(0);
    for (const p of recent.data) {
      const t = new Date(p.createdAt).getTime();
      const idx = Math.floor((now - t) / dayMs);
      if (idx >= 0 && idx < days) buckets[days - 1 - idx]++;
    }
    return buckets;
  })();

  return (
    <section className="border-y border-gold/10 bg-card/20">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center gap-2">
          <Hexagon className="h-5 w-5 text-gold" />
          <h2 className="font-serif-display text-3xl font-semibold">
            图书馆志
          </h2>
          <span className="font-body-serif text-sm italic text-muted-foreground">
            · Atlas of the Library
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          {/* Left: hexagon distribution bars */}
          <div className="rounded-xl border border-border/50 bg-background/40 p-6">
            <p className="mb-4 flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-gold/70">
              <Hexagon className="h-3 w-3" /> 馆藏分布 · by Hexagon
            </p>
            {hexagons.loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-2.5">
                {hexagons.data?.map((h, i) => {
                  const pct = (h.count / maxCount) * 100;
                  return (
                    <button
                      key={h.name}
                      onClick={() => setView({ name: "hexagon", hexagon: h.name })}
                      className="group flex w-full items-center gap-3 rise-in"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <span className="w-20 shrink-0 text-right font-body-serif text-sm text-foreground/80 group-hover:text-gold">
                        {h.name}
                      </span>
                      <div className="relative h-7 flex-1 overflow-hidden rounded bg-muted/40">
                        <div
                          className="h-full bg-gradient-to-r from-gold/30 via-gold/60 to-gold transition-all duration-700 group-hover:from-gold/50 group-hover:to-gold"
                          style={{ width: `${Math.max(pct, 8)}%` }}
                        />
                        <span className="absolute inset-y-0 right-2 flex items-center font-mono text-xs text-foreground/70">
                          {h.count}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: stat tiles + sparkline */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                icon={<BookOpen className="h-4 w-4" />}
                label="卷册"
                value={stats.data?.totalVolumes}
                sub="volumes"
                loading={stats.loading}
              />
              <StatTile
                icon={<Hexagon className="h-4 w-4" />}
                label="回廊"
                value={stats.data?.totalHexagons}
                sub="galleries"
                loading={stats.loading}
              />
              <StatTile
                icon={<Eye className="h-4 w-4" />}
                label="翻阅"
                value={stats.data?.totalViews}
                sub="readings"
                loading={stats.loading}
              />
              <StatTile
                icon={<Heart className="h-4 w-4" />}
                label="收藏"
                value={stats.data?.totalLikes}
                sub="bookmarks"
                loading={stats.loading}
              />
            </div>

            {/* 30-day activity sparkline */}
            <div className="rounded-xl border border-border/50 bg-background/40 p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-gold/70">
                  <Sparkles className="h-3 w-3" /> 近 30 日入库
                </p>
                <span className="font-mono text-xs text-muted-foreground">
                  {sparkline.reduce((a, b) => a + b, 0)} 卷
                </span>
              </div>
              {sparkline.length > 0 ? (
                <div className="flex h-16 items-end gap-px">
                  {sparkline.map((v, i) => {
                    const max = Math.max(...sparkline, 1);
                    const h = v > 0 ? Math.max((v / max) * 100, 8) : 2;
                    return (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-gold/20 to-gold/70 transition-all hover:from-gold/40 hover:to-gold"
                        style={{ height: `${h}%` }}
                        title={`${v} 卷`}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="font-body-serif text-xs italic text-muted-foreground">
                  尚无入库记录。
                </p>
              )}
              <div className="mt-2 flex justify-between text-[0.65rem] text-muted-foreground">
                <span>30 天前</span>
                <span>今日</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  sub: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-4">
      <div className="flex items-center gap-1.5 text-gold/70">
        {icon}
        <span className="text-[0.65rem] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 font-serif-display text-2xl font-semibold">
        {loading ? "—" : value ?? 0}
      </p>
      <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
        {sub}
      </p>
    </div>
  );
}

/**
 * Today's Reading — a deterministic daily recommendation.
 * Uses the current YYYY-MM-DD string + hashSeed to pick a stable post from
 * the catalogue. The same day always yields the same pick — fitting the
 * Borges metaphor: "every page is already written, we're just looking it up".
 *
 * Hidden if there are no posts.
 */
function TodaysReading() {
  const { setView } = useLibrary();
  const all = useAsync(() => api.listPosts({ limit: 200 }), []);

  if (all.loading || !all.data || all.data.length === 0) return null;

  // Build a YYYY-MM-DD string for "today" in local time
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Deterministic pick — same day → same post for all visitors
  const seed = hashSeed("todays-reading:" + todayKey);
  const idx = seed % all.data.length;
  const pick: PostSummary = all.data[idx];

  // Map day-of-year to a pseudo "page number" for atmosphere
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );

  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-card/70 via-card/40 to-background/30 p-6 backdrop-blur-sm sm:p-8 rise-in">
        {/* Decorative hex watermark */}
        <svg
          className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 text-gold/10"
          viewBox="0 0 100 100"
          aria-hidden
        >
          <path
            d="M50 4 L88 26 L88 74 L50 96 L12 74 L12 26 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M50 22 L70 33 L70 58 L50 69 L30 58 L30 33 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </svg>
        {/* Candle glow */}
        <div className="pointer-events-none absolute -top-16 left-1/2 h-32 w-48 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl" />

        <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold/70">
              <Sparkles className="h-3.5 w-3.5" /> 今日荐读 · Today&apos;s Reading
            </p>
            <p className="font-body-serif text-xs italic text-muted-foreground">
              {todayKey} · 第 {dayOfYear} 日 · 索书号{" "}
              <span className="font-mono text-gold/80">
                {pick.slug.slice(0, 6)}-{(seed % 4) + 1}-{(seed % 5) + 1}-{(seed % 32) + 1}-{(seed % 410) + 1}
              </span>
            </p>
            <button
              onClick={() => setView({ name: "volume", slug: pick.slug })}
              className="group mt-3 block text-left"
            >
              <h3 className="font-serif-display text-2xl font-semibold leading-tight text-foreground transition-colors group-hover:text-gold sm:text-3xl">
                {pick.title}
              </h3>
              <p className="mt-2 max-w-2xl font-body-serif text-sm italic leading-relaxed text-muted-foreground line-clamp-2">
                {pick.excerpt || "（这一卷尚未撰写提要。）"}
              </p>
            </button>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-body-serif text-gold/80">
                <Hexagon className="h-3 w-3" /> {pick.hexagon}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> {pick.readMinutes} 分钟
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> {pick.views} 翻阅
              </span>
            </div>
          </div>
          <Button
            onClick={() => setView({ name: "volume", slug: pick.slug })}
            className="group shrink-0 rounded-full bg-gold px-5 text-ink hover:bg-gold/90"
          >
            翻开此卷
            <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>

        <p className="relative mt-5 border-t border-border/40 pt-3 font-body-serif text-xs italic leading-relaxed text-muted-foreground">
          "在巴别图书馆里，今日所读之卷，本就写在那里——
          日期只是钥匙，让你今日翻开它。"
        </p>
      </div>
    </section>
  );
}
