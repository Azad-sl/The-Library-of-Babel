"use client";

import { useMemo } from "react";
import { Hexagon, ArrowRight } from "lucide-react";
import { useLibrary } from "@/store/library-store";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Post, PostSummary } from "@/lib/types";

/**
 * 文学亲缘 · Literary Siblings
 *
 * Recommends 2–3 most-similar volumes to the one currently being read.
 *
 * Scoring (against every OTHER volume in the library):
 *   +3  same hexagon (回廊)
 *   +2  per shared tag (case-insensitive)
 *   +1  same author
 *
 * Top 3 by score (ties broken by views desc) are shown.
 * If no other volume scores > 0, fall back to the 3 most-viewed volumes
 * from the same hexagon, then from any hexagon.
 */

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,，、]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

interface Scored {
  post: PostSummary;
  score: number;
  sharedTags: string[];
}

function computeSiblings(
  current: Post,
  all: PostSummary[]
): Scored[] {
  const curTags = new Set(parseTags(current.tags));
  const scored: Scored[] = [];

  for (const other of all) {
    if (other.slug === current.slug || other.id === current.id) continue;

    let score = 0;
    if (other.hexagon === current.hexagon) score += 3;
    if (other.authorName === current.authorName) score += 1;

    const otherTags = parseTags(other.tags);
    const shared = otherTags.filter((t) => curTags.has(t));
    score += shared.length * 2;

    // Preserve original-case tags from `other` for display, matched by lower.
    const sharedDisplay: string[] = [];
    if (shared.length > 0) {
      const sharedLower = new Set(shared);
      for (const tRaw of (other.tags || "").split(/[,，、]/)) {
        const t = tRaw.trim();
        if (t && sharedLower.has(t.toLowerCase())) sharedDisplay.push(t);
      }
    }

    scored.push({ post: other, score, sharedTags: sharedDisplay });
  }

  const withScore = scored.filter((s) => s.score > 0);
  if (withScore.length > 0) {
    withScore.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.post.views - a.post.views;
    });
    return withScore.slice(0, 3);
  }

  // Fallback 1: 3 most-viewed from the same hexagon
  const sameHex = all
    .filter((p) => p.slug !== current.slug && p.id !== current.id && p.hexagon === current.hexagon)
    .sort((a, b) => b.views - a.views)
    .slice(0, 3)
    .map((post) => ({ post, score: 0, sharedTags: [] as string[] }));
  if (sameHex.length > 0) return sameHex;

  // Fallback 2: 3 most-viewed from any hexagon
  return all
    .filter((p) => p.slug !== current.slug && p.id !== current.id)
    .sort((a, b) => b.views - a.views)
    .slice(0, 3)
    .map((post) => ({ post, score: 0, sharedTags: [] as string[] }));
}

export function LiterarySiblings({ post }: { post: Post }) {
  const { setView } = useLibrary();
  const all = useAsync(() => api.listPosts({ limit: 200 }), []);

  const siblings = useMemo(() => {
    if (!all.data || all.data.length === 0) return [];
    return computeSiblings(post, all.data);
  }, [all.data, post]);

  if (siblings.length === 0) return null;

  const gridCols =
    siblings.length >= 3
      ? "sm:grid-cols-2 lg:grid-cols-3"
      : "sm:grid-cols-2";

  return (
    <section
      data-testid="literary-siblings"
      className="literary-siblings mt-12 border-t border-border/60 pt-8 print:hidden"
      aria-label="文学亲缘 · Literary Siblings"
    >
      {/* Heading */}
      <div className="mb-5">
        <p className="text-[0.7rem] uppercase tracking-[0.3em] text-gold/60">
          Literary Siblings
        </p>
        <h2 className="mt-1 font-serif-display text-2xl font-semibold text-foreground">
          文学亲缘
        </h2>
        <p className="mt-1 font-body-serif text-sm italic text-muted-foreground">
          基于回廊、索引词与执笔人的近似，这三卷或许也值得你翻阅。
        </p>
      </div>

      {/* Cards */}
      <div className={cn("grid gap-3", gridCols)}>
        {siblings.map((s) => (
          <button
            key={s.post.id}
            onClick={() => setView({ name: "volume", slug: s.post.slug })}
            className="sibling-card group flex flex-col rounded-lg border border-border/50 bg-card/30 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/60 hover:bg-card/60 hover:shadow-[0_4px_24px_-8px_var(--gold)]"
          >
            <div className="flex items-start gap-2">
              <Hexagon className="mt-0.5 h-4 w-4 shrink-0 text-gold/60 transition-colors group-hover:text-gold" />
              <div className="min-w-0 flex-1">
                <p className="font-serif-display text-base font-medium leading-snug text-foreground transition-colors group-hover:text-gold line-clamp-2">
                  {s.post.title}
                </p>
                {s.post.excerpt && (
                  <p className="mt-1 font-body-serif text-xs text-muted-foreground line-clamp-1">
                    {s.post.excerpt}
                  </p>
                )}
              </div>
            </div>

            {/* Shared tags + hexagon label */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {s.sharedTags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[0.65rem] text-gold"
                >
                  {t}
                </span>
              ))}
              <span className="ml-auto inline-flex items-center gap-1 text-[0.65rem] text-muted-foreground">
                <Hexagon className="h-3 w-3 text-gold/50" />
                {s.post.hexagon}
              </span>
            </div>

            {/* Open link */}
            <div className="mt-3 flex items-center justify-end gap-1 font-body-serif text-xs text-gold/70 transition-colors group-hover:text-gold">
              <span>翻开此卷</span>
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
