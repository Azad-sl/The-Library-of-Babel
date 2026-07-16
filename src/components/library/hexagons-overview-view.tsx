"use client";

import { useMemo } from "react";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/lib/api";
import { useLibrary } from "@/store/library-store";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Hexagon, BookOpen, ArrowRight, Feather } from "lucide-react";

/** Atmospheric cover image per hexagon name. Falls back to a gradient. */
const HEX_COVERS: Record<string, string> = {
  随笔: "/covers/hex-essay.jpg",
  读书笔记: "/covers/hex-reading-notes.jpg",
  思辨: "/covers/hex-speculation.jpg",
  书信: "/covers/hex-letter.jpg",
  札记: "/covers/hex-notes.jpg",
};

/** Curated one-line description per hexagon name (atmospheric, literary). */
const HEX_DESCRIPTIONS: Record<string, string> = {
  随笔: "随手写下，无主题的散步——意识在纸上漂流的痕迹。",
  读书笔记: "借他人的灯，照自己的路——读过的书在脑中留下的回声。",
  思辨: "把一个念头反复折叠，直到它显出折痕里的光。",
  书信: "写给一个未曾谋面的人——也许正是未来的自己。",
  札记: "夜里读到的字，清晨想起的事，记在书页边的小字。",
};

/** Deterministic hex angle for spine rotation fallback. */
function spineAngle(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return (h % 7) - 3;
}

/** Color palette fallback when no cover image is available. */
const HEX_GRADIENTS = [
  "from-amber-700/40 to-amber-950/70",
  "from-rose-800/40 to-rose-950/70",
  "from-emerald-800/40 to-emerald-950/70",
  "from-violet-800/40 to-violet-950/70",
  "from-orange-800/40 to-orange-950/70",
  "from-teal-800/40 to-teal-950/70",
];

/** Floating dust motes for the background atmosphere */
function DustMotes() {
  const motes = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 2 + Math.random() * 3,
        dur: 10 + Math.random() * 16,
        delay: Math.random() * 8,
        dx: (Math.random() - 0.5) * 80,
        dy: -30 - Math.random() * 60,
        opacity: 0.2 + Math.random() * 0.4,
      })),
    []
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {motes.map((m) => (
        <span
          key={m.id}
          className="mote absolute rounded-full bg-gold"
          style={{
            left: m.left,
            top: m.top,
            width: m.size,
            height: m.size,
            opacity: m.opacity,
            ["--dur" as string]: `${m.dur}s`,
            ["--dx" as string]: `${m.dx}px`,
            ["--dy" as string]: `${m.dy}px`,
            animationDelay: `${m.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export function HexagonsOverviewView() {
  const { setView, goBack, canGoBack } = useLibrary();
  const hexagons = useAsync(() => api.listHexagons(), []);
  const stats = useAsync(() => api.stats(), []);

  const totalVolumes = stats.data?.totalVolumes ?? 0;
  const totalHexagons = stats.data?.totalHexagons ?? hexagons.data?.length ?? 0;

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Floating dust motes background */}
      <DustMotes />

      {/* Back */}
      <button
        onClick={() => (canGoBack() ? goBack() : setView({ name: "home" }))}
        className="relative mb-6 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-gold rise-in"
      >
        <ArrowLeft className="h-4 w-4" /> 返回
      </button>

      {/* Hero header */}
      <div className="relative mb-12 overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-card/70 via-background/40 to-background/20 p-8 sm:p-12 rise-in hex-watermark grain">
        {/* rotating decorative hex ring */}
        <div className="pointer-events-none absolute -right-20 -top-20 opacity-25">
          <svg width="380" height="380" viewBox="0 0 100 100" aria-hidden className="slow-spin">
            <path d="M50 4 L88 26 L88 74 L50 96 L12 74 L12 26 Z" fill="none" stroke="var(--gold)" strokeWidth="0.6" />
            <path d="M50 16 L78 32 L78 68 L50 84 L22 68 L22 32 Z" fill="none" stroke="var(--gold)" strokeWidth="0.5" />
            <path d="M50 28 L68 38 L68 62 L50 72 L32 62 L32 38 Z" fill="none" stroke="var(--gold)" strokeWidth="0.4" />
          </svg>
        </div>
        {/* counter-rotating inner ring */}
        <div className="pointer-events-none absolute -right-12 -bottom-12 opacity-15">
          <svg width="220" height="220" viewBox="0 0 100 100" aria-hidden className="slow-spin-rev">
            <path d="M50 8 L84 28 L84 72 L50 92 L16 72 L16 28 Z" fill="none" stroke="var(--gold)" strokeWidth="0.8" />
          </svg>
        </div>

        {/* Candle glow at top */}
        <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2">
          <div className="h-28 w-44 rounded-full bg-gold/10 blur-3xl candle-glow" />
        </div>

        <div className="relative">
          <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold/80">
            <Hexagon className="h-3.5 w-3.5" /> The Hexagonal Galleries
          </p>
          <h1 className="font-serif-display text-5xl font-semibold leading-tight text-foreground sm:text-6xl ink-reveal">
            六边形回廊
          </h1>
          <p className="mt-4 max-w-2xl font-body-serif text-lg italic leading-relaxed text-muted-foreground">
            "每一个回廊都极相似——六面墙壁，每面五个书架，每个书架三十二卷，
            <br className="hidden sm:block" />
            每卷四百一十页，每页四十行，每行约八十个字符。"
          </p>
          <p className="mt-2 font-body-serif text-xs text-gold/60">
            ——博尔赫斯《巴别图书馆》
          </p>

          {/* Quick stats */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Hexagon className="h-3.5 w-3.5 text-gold/70" />
              <span className="font-serif-display text-base font-semibold text-foreground">
                {totalHexagons}
              </span>
              <span>条回廊</span>
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-gold/70" />
              <span className="font-serif-display text-base font-semibold text-foreground">
                {totalVolumes}
              </span>
              <span>卷已入库</span>
            </span>
            <span className="text-[0.7rem] italic text-muted-foreground/70">
              点选任一回廊，步入其中漫步
            </span>
          </div>
        </div>
      </div>

      {/* Summary line */}
      {hexagons.data && hexagons.data.length > 0 && (
        <div className="mb-8 flex items-center justify-center gap-3 text-sm text-muted-foreground rise-in">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/20" />
          <span className="font-body-serif text-muted-foreground/80">
            共 <span className="font-serif-display text-base font-semibold text-foreground">{totalHexagons}</span> 条回廊 ·{" "}
            <span className="font-serif-display text-base font-semibold text-foreground">{totalVolumes}</span> 卷藏书
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/20" />
        </div>
      )}

      {/* Hexagonal-tile gallery grid */}
      {hexagons.loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : hexagons.data && hexagons.data.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 stagger-in">
          {hexagons.data.map((hex, i) => {
            const cover = HEX_COVERS[hex.name];
            const desc = HEX_DESCRIPTIONS[hex.name] || "这条回廊尚无简介，等一位图书管理员为它写下注脚。";
            const gradientIdx = (hex.name.charCodeAt(0) || 0) % HEX_GRADIENTS.length;
            const angle = spineAngle(hex.name);
            return (
              <article
                key={hex.name}
                onClick={() => setView({ name: "hexagon", hexagon: hex.name })}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-gold/20 bg-card/60 backdrop-blur-sm transition-all duration-500 hover:border-gold/50 hover:shadow-[0_12px_60px_-16px_var(--gold)]/40"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                {/* Cover band */}
                <div className="relative h-44 overflow-hidden">
                  {cover ? (
                    <>
                      <img
                        src={cover}
                        alt={hex.name}
                        className="h-full w-full object-cover transition-transform duration-[1.2s] group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      {/* gold vignette on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-gold/0 to-gold/0 opacity-0 transition-opacity duration-500 group-hover:from-gold/15 group-hover:to-transparent group-hover:opacity-100" />
                    </>
                  ) : (
                    <div
                      className={`relative h-full w-full bg-gradient-to-br ${HEX_GRADIENTS[gradientIdx]}`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className="flex h-32 w-20 flex-col items-center justify-between rounded-sm bg-black/30 p-2 shadow-lg ring-1 ring-gold/30 transition-transform duration-700 group-hover:rotate-0"
                          style={{ transform: `rotate(${angle}deg)` }}
                        >
                          <div className="space-y-1">
                            <div className="h-px w-full bg-gold/50" />
                            <div className="h-px w-3/4 bg-gold/30" />
                          </div>
                          <p className="font-serif-display text-[0.7rem] leading-tight text-gold/90 [writing-mode:vertical-rl]">
                            {hex.name}
                          </p>
                          <div className="space-y-1">
                            <div className="h-px w-3/4 bg-gold/30" />
                            <div className="h-px w-full bg-gold/50" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Large hexagonal icon with first character */}
                  <div className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-xl border border-gold/30 bg-background/50 backdrop-blur-sm transition-all duration-500 group-hover:rotate-[15deg] group-hover:scale-110 group-hover:border-gold/60">
                    <svg width="44" height="44" viewBox="0 0 100 100" aria-hidden>
                      <path
                        d="M50 4 L88 26 L88 74 L50 96 L12 74 L12 26 Z"
                        fill="none"
                        stroke="var(--gold)"
                        strokeWidth="2.5"
                        className="transition-all duration-500"
                      />
                      <text
                        x="50"
                        y="58"
                        textAnchor="middle"
                        className="fill-gold font-serif-display"
                        fontSize="36"
                        fontWeight="600"
                      >
                        {hex.name.slice(0, 1)}
                      </text>
                    </svg>
                  </div>

                  {/* gallery number badge (index) */}
                  <span className="absolute left-4 top-4 rounded-full border border-gold/30 bg-background/70 px-2.5 py-0.5 font-mono text-[0.65rem] text-gold/90 backdrop-blur-sm">
                    Gallery {String(i + 1).padStart(2, "0")}
                  </span>

                  {/* title at bottom of cover */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h2 className="font-serif-display text-3xl font-semibold text-parchment drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition-transform duration-500 group-hover:-translate-y-1">
                      {hex.name}
                    </h2>
                  </div>
                </div>

                {/* Body */}
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-body-serif text-gold/80">
                      <BookOpen className="h-3.5 w-3.5" />
                      共 <span className="font-serif-display text-base font-semibold text-foreground">{hex.count}</span> 卷
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground transition-colors group-hover:text-gold">
                      步入回廊 <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>

                  <p className="font-body-serif text-sm leading-relaxed text-muted-foreground line-clamp-3">
                    {desc}
                  </p>

                  {/* decorative bottom border */}
                  <div className="flex items-center gap-2 pt-2">
                    <div className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
                    <Hexagon className="h-2.5 w-2.5 text-gold/50" />
                    <div className="h-px flex-1 bg-gradient-to-l from-gold/40 to-transparent" />
                  </div>
                </div>
              </article>
            );
          })}

          {/* "Unwritten gallery" invite tile */}
          <article
            onClick={() => setView({ name: "write" })}
            className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gold/30 bg-card/20 p-8 text-center transition-all duration-500 hover:border-gold/60 hover:bg-card/40"
            style={{ animationDelay: `${(hexagons.data?.length || 0) * 90}ms` }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-background/50 text-gold transition-all duration-500 group-hover:scale-110 group-hover:rotate-[30deg]">
              <Feather className="h-6 w-6" />
            </div>
            <h3 className="font-serif-display text-xl font-semibold text-foreground">
              开辟新回廊
            </h3>
            <p className="font-body-serif text-sm leading-relaxed text-muted-foreground">
              每写下一卷新主题的卷册，<br />
              便是为图书馆添一条新的回廊。
            </p>
            <span className="mt-1 flex items-center gap-1 text-xs text-gold/80 transition-colors group-hover:text-gold">
              执笔写下 <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </span>
          </article>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 p-16 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 font-serif-display text-2xl text-muted-foreground">
            图书馆尚无回廊
          </p>
          <p className="mt-2 font-body-serif text-sm text-muted-foreground">
            也许它在等你来写下第一卷。
          </p>
        </div>
      )}

      {/* Borges quote footer */}
      <div className="relative mt-12 rounded-xl border border-border/40 bg-background/30 p-6 text-center rise-in">
        <p className="font-body-serif text-base italic leading-relaxed text-muted-foreground">
          "也许有大秘密的目录catalog；那位馆员相信，有一位图书管理员
          <br className="hidden sm:block" />
          曾读过一本书，那本书是其它所有书的目录或目录的目录——
          <br className="hidden sm:block" />
          此刻，他在寻找自己的名字。"
        </p>
        <p className="mt-2 font-body-serif text-xs text-gold/60">
          ——博尔赫斯《巴别图书馆》
        </p>
      </div>
    </div>
  );
}
