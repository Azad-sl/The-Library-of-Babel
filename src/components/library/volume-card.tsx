"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLibrary } from "@/store/library-store";
import type { PostSummary } from "@/lib/types";
import { Hexagon, Clock, Eye, Heart, Feather } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { getSavedProgressFor } from "@/hooks/use-reading-memory";

interface VolumeCardProps {
  post: PostSummary;
  variant?: "default" | "featured" | "compact";
  index?: number;
  /** Optional search query — matched substrings in title/excerpt are highlighted. */
  highlight?: string;
}

// Deterministic ornament rotation per post — gives each spine a unique tilt
function spineAngle(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return (h % 7) - 3; // -3..3 degrees
}

/**
 * Highlight all case-insensitive occurrences of `q` in `text` using <mark>.
 * Returns a React fragment with gold-highlighted spans. If `q` is empty or
 * shorter than 1 char, returns the original text.
 */
function Highlight({ text, q }: { text: string; q?: string }): ReactNode {
  if (!q || q.trim().length < 1) return text;
  const query = q.trim();
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const idx = lower.indexOf(qLower, i);
    if (idx < 0) {
      out.push(text.slice(i));
      break;
    }
    if (idx > i) out.push(text.slice(i, idx));
    out.push(
      <mark
        key={key++}
        className="rounded-sm bg-gold/30 px-0.5 text-gold not-italic"
      >
        {text.slice(idx, idx + query.length)}
      </mark>
    );
    i = idx + query.length;
  }
  return <>{out}</>;
}

const HEX_COLORS = [
  "from-amber-700/40 to-amber-900/60",
  "from-rose-800/40 to-rose-950/60",
  "from-emerald-800/40 to-emerald-950/60",
  "from-violet-800/40 to-violet-950/60",
  "from-orange-800/40 to-orange-950/60",
  "from-teal-800/40 to-teal-950/60",
];

export function VolumeCard({
  post,
  variant = "default",
  index = 0,
  highlight,
}: VolumeCardProps) {
  const { setView } = useLibrary();
  const open = () => setView({ name: "volume", slug: post.slug });

  const tags = post.tags
    ? post.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const date = new Date(post.createdAt);
  const dateStr = isNaN(date.getTime())
    ? ""
    : format(date, "yyyy年MM月dd日", { locale: zhCN });

  if (variant === "compact") {
    return (
      <button
        onClick={open}
        className="group relative flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent/20"
      >
        <BookmarkRibbon slug={post.slug} />
        <span className="mt-1 h-2 w-2 shrink-0 rotate-45 bg-gold/60 transition-transform group-hover:rotate-[225deg] group-hover:bg-gold" />
        <div className="min-w-0 flex-1">
          <p className="font-serif-display text-base font-medium leading-snug text-foreground transition-colors group-hover:text-gold">
            <Highlight text={post.title} q={highlight} />
          </p>
          {post.excerpt && (
            <p className="mt-0.5 font-body-serif text-xs leading-relaxed text-muted-foreground line-clamp-1">
              <Highlight text={post.excerpt} q={highlight} />
            </p>
          )}
          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-body-serif">{post.hexagon}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {post.readMinutes} 分
            </span>
          </p>
        </div>
      </button>
    );
  }

  if (variant === "featured") {
    const angle = spineAngle(post.slug);
    const colorIdx = (post.slug.charCodeAt(0) || 0) % HEX_COLORS.length;
    return (
      <article
        className="group relative rise-in cursor-pointer overflow-hidden rounded-xl border border-gold/20 bg-card/60 backdrop-blur-sm transition-all duration-500 hover:border-gold/50 hover:shadow-[0_8px_40px_-12px_var(--gold)]/30"
        style={{ animationDelay: `${index * 70}ms` }}
        onClick={open}
      >
        {/* Spine / cover band */}
        <div className="relative h-44 overflow-hidden">
          {post.coverImage ? (
            <>
              <img
                src={post.coverImage}
                alt={post.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* dark gradient overlay for depth + title legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              {/* gold vignette on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-gold/0 to-gold/0 opacity-0 transition-opacity duration-500 group-hover:from-gold/10 group-hover:to-transparent group-hover:opacity-100" />
              {/* candle-lit warm glow at top center on hover */}
              <div className="pointer-events-none absolute -top-12 left-1/2 h-24 w-32 -translate-x-1/2 rounded-full bg-gold/0 blur-2xl transition-all duration-700 group-hover:bg-gold/25" />
              {/* hexagon watermark on cover */}
              <div className="absolute right-3 top-3 opacity-50 transition-opacity group-hover:opacity-80">
                <svg width="26" height="26" viewBox="0 0 100 100" aria-hidden>
                  <path
                    d="M50 4 L88 26 L88 74 L50 96 L12 74 L12 26 Z"
                    fill="none"
                    stroke="var(--gold)"
                    strokeWidth="3"
                  />
                </svg>
              </div>
            </>
          ) : (
            <div
              className={cn(
                "relative h-full w-full bg-gradient-to-br",
                HEX_COLORS[colorIdx]
              )}
            >
              {/* book spine motif */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="flex h-32 w-20 flex-col justify-between rounded-sm bg-black/30 p-2 shadow-lg ring-1 ring-gold/30 transition-transform duration-700 group-hover:rotate-0"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <div className="space-y-1">
                    <div className="h-px w-full bg-gold/50" />
                    <div className="h-px w-3/4 bg-gold/30" />
                  </div>
                  <p className="font-serif-display text-[0.6rem] leading-tight text-gold/90 [writing-mode:vertical-rl]">
                    {post.title.slice(0, 12)}
                  </p>
                  <div className="space-y-1">
                    <div className="h-px w-3/4 bg-gold/30" />
                    <div className="h-px w-full bg-gold/50" />
                  </div>
                </div>
              </div>
              {/* hexagon watermark */}
              <div className="absolute right-3 top-3 opacity-40">
                <svg width="28" height="28" viewBox="0 0 100 100" aria-hidden>
                  <path
                    d="M50 4 L88 26 L88 74 L50 96 L12 74 L12 26 Z"
                    fill="none"
                    stroke="var(--gold)"
                    strokeWidth="3"
                  />
                </svg>
              </div>
            </div>
          )}
          {post.featured && (
            <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-[0.65rem] font-medium text-gold backdrop-blur-sm">
              <Feather className="h-3 w-3" /> 推荐
            </span>
          )}
        </div>

        {/* Body */}
        <div className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Hexagon className="h-3 w-3 text-gold/70" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                useLibrary.getState().setView({ name: "hexagon", hexagon: post.hexagon });
              }}
              className="font-body-serif transition-colors hover:text-gold"
            >
              {post.hexagon}
            </button>
            <span>·</span>
            <span>{dateStr}</span>
          </div>

          <h3 className="font-serif-display text-xl font-semibold leading-tight text-foreground transition-colors group-hover:text-gold">
            {post.title}
          </h3>

          <p className="font-body-serif text-sm leading-relaxed text-muted-foreground line-clamp-3">
            {post.excerpt || "（这一卷尚未撰写提要。）"}
          </p>

          <div className="flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> {post.readMinutes} 分钟
            </span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> {post.views}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" /> {post.likes}
              </span>
            </span>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-accent/30 px-2 py-0.5 text-[0.65rem] text-foreground/70"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>
    );
  }

  // default — horizontal compact card
  return (
    <article
      className="group relative cursor-pointer rounded-lg border border-border/60 bg-card/50 p-4 backdrop-blur-sm transition-all duration-300 hover:border-gold/40 hover:bg-card/80"
      onClick={open}
    >
      <BookmarkRibbon slug={post.slug} />
      <div className="flex items-start gap-4">
        {/* mini hexagon badge */}
        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 100 100" aria-hidden>
            <path
              d="M50 6 L86 27 L86 73 L50 94 L14 73 L14 27 Z"
              fill="none"
              stroke="var(--gold)"
              strokeWidth="2"
              opacity="0.5"
              className="transition-opacity group-hover:opacity-100"
            />
            <text
              x="50"
              y="56"
              textAnchor="middle"
              className="fill-gold font-serif-display"
              fontSize="28"
            >
              {post.hexagon.slice(0, 1)}
            </text>
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-serif-display text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-gold">
            <Highlight text={post.title} q={highlight} />
          </h3>
          <p className="mt-1 font-body-serif text-sm leading-relaxed text-muted-foreground line-clamp-2">
            <Highlight text={post.excerpt || "（无提要）"} q={highlight} />
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-body-serif text-gold/80">{post.hexagon}</span>
            <span>·</span>
            <span>{dateStr}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {post.readMinutes}分
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Bookmark ribbon — a small gold ribbon in the top-right corner of volume
 * cards for volumes where the reader has saved reading progress in
 * localStorage. Shows the saved percent on hover (via a small tooltip that
 * appears below the ribbon) and gently sways. Renders nothing on the server
 * and on the first client render, then re-renders once mounted if this slug
 * has a saved-progress entry.
 *
 * `pointer-events-none` so it never intercepts the card's click handler.
 */
function BookmarkRibbon({ slug }: { slug: string }) {
  // useEffect only runs on the client after hydration, so we can read
  // localStorage directly. Initial render returns null (matches SSR).
  const [percent, setPercent] = useState<number | null>(null);

  useEffect(() => {
    const entry = getSavedProgressFor(slug);
    if (entry) setPercent(Math.round(entry.percent * 100));
  }, [slug]);

  if (percent === null || percent === undefined) return null;

  return (
    <span
      className="bookmark-ribbon pointer-events-none absolute right-2 top-0 z-10"
      aria-label={`读到 ${percent}%`}
      role="img"
    >
      <svg
        viewBox="0 0 24 36"
        width="18"
        height="27"
        aria-hidden="true"
        className="block"
      >
        {/* Ribbon body — rectangle with a V-notch at the bottom */}
        <path
          d="M3 2 L21 2 L21 31 L12 24 L3 31 Z"
          fill="var(--gold)"
          stroke="color-mix(in oklch, var(--gold) 45%, #2a1500)"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
        {/* Diagonal fold in the top-right corner — suggests the ribbon is
            folded over the page */}
        <path
          d="M21 2 L21 7 L16 2 Z"
          fill="color-mix(in oklch, var(--gold) 50%, #2a1500)"
          stroke="none"
        />
        {/* Subtle inner highlight to give the ribbon some depth */}
        <path
          d="M5 4 L5 28"
          stroke="color-mix(in oklch, white 25%, var(--gold))"
          strokeWidth="0.6"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <span
        className="bookmark-ribbon-tooltip opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        aria-hidden="true"
      >
        读到 {percent}%
      </span>
    </span>
  );
}
