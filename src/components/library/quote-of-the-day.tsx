"use client";

import { useEffect, useMemo, useState } from "react";
import { Quote, RefreshCw, Copy, Check } from "lucide-react";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/lib/api";
import { useLibrary } from "@/store/library-store";
import { hashSeed } from "@/lib/babel";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostSummary } from "@/lib/types";

/**
 * 今日一句 · Quote of the Day
 * ------------------------------------------------------------------
 * One curated literary quote per day, deterministic by date so the
 * same quote is shown all day for a given reader. A "换一句" button
 * lets them sample another randomly from the pool.
 *
 * The pool combines two sources:
 *   1. Real posts — first sentence of each `excerpt` (12–80 chars),
 *      attributed to the post title (clickable → opens the volume).
 *   2. Hardcoded Borges quotes — 10 hand-curated lines in Chinese.
 *
 * "Today's" quote is picked from the Borges pool via an FNV-1a hash
 * of `YYYY-MM-DD`, so it stays stable across reloads and survives the
 * posts fetch arriving later. The "换一句" button samples from the
 * full pool (Borges + posts) for variety.
 */

interface QuoteItem {
  /** The quote text (already validated to be 12–80 chars for posts). */
  text: string;
  /** Book/volume title — rendered inside 《》. */
  source: string;
  /** Post slug if the quote comes from a real volume (clickable), else null. */
  slug: string | null;
  /** Author name (post author or "博尔赫斯"). */
  author: string;
}

/** Fallback shown if the pool somehow ends up empty. */
const FALLBACK_QUOTE: QuoteItem = {
  text: "天堂应该是图书馆的模样。",
  source: "关于天赐的诗",
  slug: null,
  author: "博尔赫斯",
};

/** Hand-curated Borges quotes — always available, even before posts load. */
const BORGES_QUOTES: QuoteItem[] = [
  {
    text: "我心想，一个人可以是别人的仇敌，可以是别人某一时刻的仇敌，但不能是一个地区、萤火虫、字句、花园、水流和风的仇敌。",
    source: "小径分岔的花园",
    slug: null,
    author: "博尔赫斯",
  },
  {
    text: "我给你我的寂寞、我的黑暗、我心的饥渴；我试图用困惑、危险、失败来打动你。",
    source: "另一个",
    slug: null,
    author: "博尔赫斯",
  },
  {
    text: "天堂应该是图书馆的模样。",
    source: "关于天赐的诗",
    slug: null,
    author: "博尔赫斯",
  },
  {
    text: "时间永远分岔，通向无数的将来。",
    source: "小径分岔的花园",
    slug: null,
    author: "博尔赫斯",
  },
  {
    text: "在死亡之前，我已经失去了许许多多的东西。",
    source: "失明",
    slug: null,
    author: "博尔赫斯",
  },
  {
    text: "镜子和交媾都是可憎的，因为它们使人的数目倍增。",
    source: "特隆，乌克巴尔，奥尔比斯·特蒂乌斯",
    slug: null,
    author: "博尔赫斯",
  },
  {
    text: "我猜想，天堂里的图书馆应该是无限的，又是不完整的。",
    source: "巴别图书馆",
    slug: null,
    author: "博尔赫斯",
  },
  {
    text: "每个人都想知道自己死后会发生什么，但很少有人想真正地知道。",
    source: "永生",
    slug: null,
    author: "博尔赫斯",
  },
  {
    text: "时间是构成我的物质。",
    source: "时间的新驳斥",
    slug: null,
    author: "博尔赫斯",
  },
  {
    text: "在我的故事里，我想留下一种叮当的铃声。",
    source: "博尔赫斯自述",
    slug: null,
    author: "博尔赫斯",
  },
];

/**
 * Extract the first sentence of an excerpt string.
 * Splits on 。；or …… (the Chinese ellipsis pair), keeps the delimiter,
 * and returns the first sentence whose length is between 12 and 80 chars.
 * Returns null if no suitable sentence is found.
 */
function firstSentence(s: string): string | null {
  const clean = s.trim().replace(/\s+/g, " ");
  if (!clean) return null;
  // Split but keep delimiters — parts alternate text / delim / text / delim ...
  const parts = clean.split(/(。|；|……)/).filter((p) => p.length > 0);
  const sentences: string[] = [];
  for (let i = 0; i < parts.length; i += 2) {
    const text = parts[i] || "";
    const delim = parts[i + 1] || "";
    const sentence = (text + delim).trim();
    if (sentence) sentences.push(sentence);
  }
  // If no delimiter was found, treat the whole string as one sentence
  if (sentences.length === 0 && clean.length >= 12 && clean.length <= 80) {
    return clean;
  }
  for (const sentence of sentences) {
    if (sentence.length >= 12 && sentence.length <= 80) return sentence;
  }
  return null;
}

/** Build a list of quote items from loaded post summaries. */
function buildPostQuotes(posts: PostSummary[] | null): QuoteItem[] {
  if (!posts || posts.length === 0) return [];
  const out: QuoteItem[] = [];
  for (const p of posts) {
    if (!p.excerpt) continue;
    const text = firstSentence(p.excerpt);
    if (!text) continue;
    out.push({
      text,
      source: p.title,
      slug: p.slug,
      author: p.authorName || "佚名",
    });
  }
  return out;
}

export function QuoteOfTheDay() {
  const { setView } = useLibrary();
  // Fetch all posts so we can mine their excerpts for the quote pool.
  // limit=100 is plenty — most installs have far fewer volumes.
  const posts = useAsync(() => api.listPosts({ limit: 100 }), []);

  const [currentQuote, setCurrentQuote] = useState<QuoteItem | null>(null);
  // Bumped on every quote change to retrigger the fade-in animation via `key`.
  const [animKey, setAnimKey] = useState(0);
  const [copied, setCopied] = useState(false);

  // Build the post-derived pool (reactive to posts.data).
  const postQuotes = useMemo(() => buildPostQuotes(posts.data), [posts.data]);
  // Full pool: Borges quotes first (stable indices) + post quotes.
  const pool = useMemo<QuoteItem[]>(
    () => [...BORGES_QUOTES, ...postQuotes],
    [postQuotes]
  );

  // Pick today's quote on mount using a deterministic FNV-1a hash of
  // YYYY-MM-DD over the Borges pool. This keeps it stable across reloads
  // and avoids hydration mismatches (date is computed in the client only).
  useEffect(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const idx = hashSeed("quote-of-the-day:" + todayStr) % BORGES_QUOTES.length;
    setCurrentQuote(BORGES_QUOTES[idx]);
    setAnimKey((k) => k + 1);
  }, []);

  /** Date label like "2026 年 7 月 14 日" — computed once. */
  const dateLabel = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日`;
  }, []);

  /** Pick a different random quote from the full pool. */
  const handleRefresh = () => {
    if (pool.length === 0) {
      setCurrentQuote(FALLBACK_QUOTE);
      setAnimKey((k) => k + 1);
      return;
    }
    if (pool.length === 1) {
      setCurrentQuote(pool[0]);
      setAnimKey((k) => k + 1);
      return;
    }
    let next: QuoteItem;
    let attempts = 0;
    do {
      next = pool[Math.floor(Math.random() * pool.length)];
      attempts++;
    } while (
      currentQuote &&
      next.text === currentQuote.text &&
      attempts < 8
    );
    setCurrentQuote(next);
    setAnimKey((k) => k + 1);
  };

  /** Copy the quote + attribution to the clipboard. */
  const handleCopy = async () => {
    if (!currentQuote) return;
    const text = `${currentQuote.text}\n——${currentQuote.author}，《${currentQuote.source}》`;
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // Fallback for browsers / insecure contexts without clipboard API.
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "50%";
        ta.style.left = "50%";
        ta.style.opacity = "0";
        ta.style.pointerEvents = "none";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <section
      data-testid="quote-of-the-day"
      aria-labelledby="quote-of-the-day-heading"
      className="mx-auto max-w-7xl px-4 pb-2 pt-6 sm:px-6 lg:px-8"
    >
      <h2 id="quote-of-the-day-heading" className="sr-only">
        今日一句 · Quote of the Day
      </h2>
      <div className="quote-of-the-day-card quote-of-the-day-bg relative overflow-hidden rounded-2xl border border-gold/20 py-10 px-6 transition-colors duration-300 hover:border-gold/40 sm:px-10 rise-in">
        {/* Faint gold radial glow at top-right corner */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklch, var(--gold) 22%, transparent) 0%, transparent 70%)",
          }}
        />

        {/* Oversized decorative quotation marks — behind the text */}
        <span
          aria-hidden
          className="quote-mark pointer-events-none absolute left-1 top-0 select-none font-serif-display leading-none text-gold/15 sm:left-3"
          style={{ fontSize: "120px" }}
        >
          「
        </span>
        <span
          aria-hidden
          className="quote-mark pointer-events-none absolute bottom-0 right-1 select-none font-serif-display leading-none text-gold/15 sm:right-3"
          style={{ fontSize: "120px" }}
        >
          」
        </span>

        {/* Header row — small uppercase gold label + date */}
        <div className="relative z-10 mb-6 flex items-center justify-between gap-4">
          <p className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.3em] text-gold/80 sm:text-xs">
            <Quote className="h-3.5 w-3.5" />
            Quote of the Day · 今日一句
          </p>
          <p className="font-body-serif text-xs italic text-muted-foreground">
            {dateLabel}
          </p>
        </div>

        {/* Main quote body — skeleton until mounted, then fade-in on change */}
        {currentQuote ? (
          <div key={animKey} className="quote-fade-in relative z-10">
            <blockquote className="mx-auto max-w-3xl text-center">
              <p className="font-serif-display text-2xl italic leading-[1.7] text-foreground sm:text-[1.75rem]">
                {currentQuote.text}
              </p>
              <footer className="mt-6 flex flex-wrap items-center justify-center gap-2 font-body-serif text-sm">
                <span className="text-gold" aria-hidden>
                  ——
                </span>
                <span className="italic text-foreground/80">
                  {currentQuote.author}
                </span>
                <span className="text-muted-foreground/40" aria-hidden>
                  ·
                </span>
                {currentQuote.slug ? (
                  <button
                    type="button"
                    onClick={() =>
                      setView({ name: "volume", slug: currentQuote.slug! })
                    }
                    className="font-serif-display italic text-foreground underline-offset-4 transition-colors hover:text-gold hover:underline"
                    title={`前往《${currentQuote.source}》`}
                  >
                    《{currentQuote.source}》
                  </button>
                ) : (
                  <span className="font-serif-display italic text-foreground">
                    《{currentQuote.source}》
                  </span>
                )}
              </footer>
            </blockquote>

            {/* Actions — 换一句 / 抄录 */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleRefresh}
                className="quote-action-btn group inline-flex items-center gap-2 rounded-full border border-gold/30 bg-background/50 px-4 py-2 font-body-serif text-xs text-foreground transition-colors hover:border-gold hover:text-gold"
                data-testid="quote-refresh-btn"
              >
                <RefreshCw className="quote-refresh-icon h-3.5 w-3.5" />
                换一句
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="quote-action-btn group inline-flex items-center gap-2 rounded-full border border-gold/30 bg-background/50 px-4 py-2 font-body-serif text-xs text-foreground transition-colors hover:border-gold hover:text-gold"
                data-testid="quote-copy-btn"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-gold" />
                    <span className="text-gold">已抄录</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    抄录
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative z-10 mx-auto max-w-3xl space-y-4 text-center">
            <Skeleton className="mx-auto h-8 w-3/4" />
            <Skeleton className="mx-auto h-8 w-1/2" />
            <Skeleton className="mx-auto h-4 w-32" />
          </div>
        )}
      </div>
    </section>
  );
}
