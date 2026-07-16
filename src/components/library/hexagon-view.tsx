"use client";

import { useAsync } from "@/hooks/use-async";
import { api } from "@/lib/api";
import { useLibrary } from "@/store/library-store";
import { VolumeCard } from "./volume-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Hexagon,
  BookOpen,
  Clock,
  Type,
  Library,
} from "lucide-react";

export function HexagonView({ hexagon }: { hexagon: string }) {
  const { setView, goBack, canGoBack } = useLibrary();
  const posts = useAsync(() => api.listPosts({ hexagon, limit: 100 }), [hexagon]);
  const hexagons = useAsync(() => api.listHexagons(), []);
  const statsDetail = useAsync(() => api.statsDetail(), []);

  const count =
    hexagons.data?.find((h) => h.name === hexagon)?.count ?? posts.data?.length ?? 0;

  // Find the hexagon distribution data for stats display
  const hexDist = statsDetail.data?.hexagonDistribution?.find(
    (h) => h.name === hexagon
  );
  const totalWords = hexDist?.totalWords ?? 0;
  const totalViews = hexDist?.totalViews ?? 0;
  const totalLikes = hexDist?.totalLikes ?? 0;
  const avgReadTime =
    count > 0
      ? Math.round(
          (posts.data?.reduce((sum, p) => sum + p.readMinutes, 0) ?? 0) / count
        )
      : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Back */}
      <button
        onClick={() => (canGoBack() ? goBack() : setView({ name: "library" }))}
        className="mb-6 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-gold rise-in"
      >
        <ArrowLeft className="h-4 w-4" /> 返回
      </button>

      {/* Header */}
      <div className="relative mb-10 overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-card/60 to-background/30 p-8 sm:p-12 rise-in hex-watermark grain">
        {/* Decorative hexagonal SVG watermark — layered rings like about view */}
        <div className="pointer-events-none absolute -right-16 -top-16 opacity-15">
          <svg width="320" height="320" viewBox="0 0 100 100" aria-hidden className="slow-spin">
            <path d="M50 4 L88 26 L88 74 L50 96 L12 74 L12 26 Z" fill="none" stroke="var(--gold)" strokeWidth="0.8" />
            <path d="M50 18 L76 33 L76 67 L50 82 L24 67 L24 33 Z" fill="none" stroke="var(--gold)" strokeWidth="0.5" />
            <path d="M50 30 L66 39 L66 61 L50 70 L34 61 L34 39 Z" fill="none" stroke="var(--gold)" strokeWidth="0.3" />
          </svg>
        </div>
        {/* Counter-rotating inner ring */}
        <div className="pointer-events-none absolute -left-8 -bottom-8 opacity-10">
          <svg width="200" height="200" viewBox="0 0 100 100" aria-hidden className="slow-spin-rev">
            <path d="M50 8 L84 28 L84 72 L50 92 L16 72 L16 28 Z" fill="none" stroke="var(--gold)" strokeWidth="1" />
          </svg>
        </div>

        {/* Subtle animated candle glow at the top center */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2">
          <div className="h-32 w-48 rounded-full bg-gold/15 blur-3xl candle-glow" />
        </div>

        <div className="relative">
          <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold/70">
            <Hexagon className="h-3.5 w-3.5" /> 六边形回廊 · Gallery
          </p>
          <h1 className="font-serif-display text-5xl font-semibold text-foreground sm:text-6xl ink-reveal">
            {hexagon}
          </h1>
          <p className="mt-3 font-body-serif text-base italic text-muted-foreground">
            共 {count} 卷 · 沿这条回廊漫步，每一面墙上都有书架
          </p>

          {/* Decorative stats */}
          {count > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              {totalWords > 0 && (
                <span className="flex items-center gap-1.5">
                  <Type className="h-3.5 w-3.5 text-gold/60" />
                  <span className="font-serif-display text-base font-semibold text-foreground">
                    {totalWords.toLocaleString()}
                  </span>
                  <span>字</span>
                </span>
              )}
              {avgReadTime > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-gold/60" />
                  <span className="font-serif-display text-base font-semibold text-foreground">
                    {avgReadTime}
                  </span>
                  <span>分钟/卷</span>
                </span>
              )}
              {totalViews > 0 && (
                <span className="flex items-center gap-1.5">
                  <Library className="h-3.5 w-3.5 text-gold/60" />
                  <span className="font-serif-display text-base font-semibold text-foreground">
                    {totalViews}
                  </span>
                  <span>次翻阅</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Other galleries quick switch */}
      {hexagons.data && hexagons.data.length > 1 && (
        <div className="mb-8 flex flex-wrap gap-2 rise-in">
          {hexagons.data
            .filter((h) => h.name !== hexagon)
            .map((h) => (
              <button
                key={h.name}
                onClick={() => setView({ name: "hexagon", hexagon: h.name })}
                className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold"
              >
                {h.name} · {h.count}
              </button>
            ))}
        </div>
      )}

      {/* Grid */}
      {posts.loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : posts.data && posts.data.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.data.map((p, i) => (
            <div
              key={p.id}
              className={`rise-in ${i % 2 === 0 ? "bg-card/20 rounded-xl" : ""}`}
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <VolumeCard post={p} variant="featured" index={i} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 p-16 text-center rise-in">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 font-serif-display text-2xl text-muted-foreground">
            这条回廊的书架是空的
          </p>
          <p className="mt-2 font-body-serif text-sm text-muted-foreground">
            也许它在等你来写下第一卷。
          </p>
          <Button
            onClick={() => setView({ name: "write" })}
            className="mt-4 rounded-full bg-gold text-ink"
          >
            执笔写下
          </Button>
        </div>
      )}

      {/* Return to all galleries button */}
      <div className="mt-12 flex justify-center rise-in">
        <Button
          onClick={() => setView({ name: "hexagons" })}
          variant="outline"
          className="rounded-full border-gold/30 hover:border-gold hover:text-gold gap-2"
        >
          <Hexagon className="h-4 w-4" />
          返回所有回廊
        </Button>
      </div>
    </div>
  );
}
