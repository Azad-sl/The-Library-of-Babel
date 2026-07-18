"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/lib/api";
import type { PostSummary } from "@/lib/types";
import { useLibrary } from "@/store/library-store";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Hexagon,
  Clock,
  Eye,
  Heart,
  Feather,
  Edit3,
  MessageSquare,
  Send,
  ChevronRight,
  List,
  BookmarkCheck,
  Share2,
  Check,
  Minus,
  Plus,
  Type,
  Shuffle,
  Printer,
  FileDown,
} from "lucide-react";
import { LiterarySiblings } from "@/components/library/literary-siblings";
import { CitationGenerator } from "@/components/library/citation-generator";
import { ReadingSessionTimer } from "@/components/library/reading-session-timer";
import { cn, headingId } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useReadingMemory } from "@/hooks/use-reading-memory";
import { useHighlights } from "@/hooks/use-highlights";
import { HighlightToolbar } from "@/components/library/highlight-toolbar";
import {
  HighlightRenderer,
  dispatchJumpToHighlight,
} from "@/components/library/highlight-renderer";
import {
  MarginNotes,
  MobileMarginNotes,
} from "@/components/library/margin-notes";

interface Heading {
  level: number;
  text: string;
  id: string;
}

// Module-level cache for the full volume list — the list rarely changes during
// a session, so we avoid refetching on every VolumeView remount (prev/next nav).
let _volumeListCache: PostSummary[] | null = null;
let _volumeListPromise: Promise<PostSummary[]> | null = null;
function loadVolumeList(): Promise<PostSummary[]> {
  if (_volumeListCache) return Promise.resolve(_volumeListCache);
  if (!_volumeListPromise) {
    _volumeListPromise = api.listPosts({ limit: 200 }).then((list) => {
      _volumeListCache = list;
      return list;
    });
  }

  return _volumeListPromise;
}
/** 删改文章后调用，让缓存过期 */
export function invalidateVolumeListCache() {
  _volumeListCache = null;
  _volumeListPromise = null;
}
 
export function VolumeView({ slug }: { slug: string }) {
  const { setView, goBack, canGoBack } = useLibrary();
  const post = useAsync(() => api.getPost(slug), [slug]);
  const related = useAsync(
    async () => {
      const p = post.data;
      if (!p) return [];
      const all = await api.listPosts({ hexagon: p.hexagon, limit: 6 });
      return all.filter((x) => x.id !== p.id).slice(0, 4);
    },
    [post.data?.id]
  );
  const comments = useAsync(
    () => (post.data ? api.listComments(post.data.id) : Promise.resolve([])),
    [post.data?.id]
  );
  // Full volume list (cached at module level) — used for prev/next navigation
  const volumeList = useAsync(() => loadVolumeList(), []);

  const [progress, setProgress] = useState(0);
  const [liked, setLiked] = useState(false);
  const [activeHeading, setActiveHeading] = useState<string>("");
  const [showBackTop, setShowBackTop] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [fontPanelOpen, setFontPanelOpen] = useState(false);

  // Margin-notes (text highlights & annotations) persisted per slug
  const proseRef = useRef<HTMLDivElement>(null);
  const {
    highlights,
    addHighlight,
    removeHighlight,
  } = useHighlights(slug);

  // Restore font size from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("babel-font-size");
    if (saved) {
      const val = Number(saved);
      if (val === 90 || val === 100 || val === 115) {
        setFontSize(val);
      }
    }
  }, []);

  const adjustFontSize = (delta: number) => {
    setFontSize((prev) => {
      const levels = [90, 100, 115];
      const idx = levels.indexOf(prev);
      const next = Math.max(0, Math.min(levels.length - 1, idx + delta));
      const newVal = levels[next];
      localStorage.setItem("babel-font-size", String(newVal));
      return newVal;
    });
  };

  const fontSizeLabel = fontSize === 90 ? "小" : fontSize === 100 ? "中" : "大";

  const meta = post.data
    ? { title: post.data.title, hexagon: post.data.hexagon }
    : null;
  useReadingMemory(slug, meta);

  // Extract headings from markdown for TOC
  const headings = useMemo<Heading[]>(() => {
    if (!post.data) return [];
    const lines = post.data.content.split("\n");
    const result: Heading[] = [];
    for (const line of lines) {
      const m = line.match(/^(#{2,3})\s+(.+)$/);
      if (m) {
        const text = m[2].replace(/[*`_~]/g, "").trim();
        result.push({ level: m[1].length, text, id: headingId(text) });
      }
    }
    return result;
  }, [post.data]);

  // Reading progress + scroll spy + back-to-top visibility
  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById("volume-body");
      const scrollY = window.scrollY;
      setShowBackTop(scrollY > 600);

      if (el) {
        const rect = el.getBoundingClientRect();
        const total = el.offsetHeight - window.innerHeight;
        const scrolled = Math.min(Math.max(-rect.top, 0), total);
        setProgress(total > 0 ? (scrolled / total) * 100 : 0);
      }

      // scroll spy — find the heading closest to the top
      if (headings.length > 0) {
        let current = "";
        for (const h of headings) {
          const el2 = document.getElementById(h.id);
          if (el2) {
            const r = el2.getBoundingClientRect();
            if (r.top <= 120) current = h.id;
          }
        }
        setActiveHeading(current);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [post.data, headings]);

  const scrollToHeading = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
    setTocOpen(false);
  }, []);

  const handleLike = async () => {
    if (!post.data || liked) return;
    setLiked(true);
    try {
      const { likes } = await api.likePost(post.data.id);
      post.reload();
      toast.success(`你点亮了这卷书 · 共 ${likes} 次收藏`);
    } catch {
      setLiked(false);
      toast.error("收藏失败，烛火晃了一下");
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Compute prev/next volumes from the cached list (sorted by createdAt DESC:
  // index 0 = newest). Prev = index-1 (newer), Next = index+1 (older).
  const prevNext = useMemo(() => {
    const list = volumeList.data;
    if (!list || !post.data) return { prev: null, next: null };
    const idx = list.findIndex((x) => x.slug === post.data!.slug);
    if (idx === -1) return { prev: null, next: null };
    return {
      prev: idx > 0 ? list[idx - 1] : null,
      next: idx < list.length - 1 ? list[idx + 1] : null,
    };
  }, [volumeList.data, post.data]);

  const goVolume = useCallback(
    (targetSlug: string) => {
      setView({ name: "volume", slug: targetSlug });
      // store.setView already scrolls to top; reinforce after the view remounts
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [setView]
  );

  const handleShare = async () => {
    if (!post.data) return;
    const p = post.data;
    const quote = `「${p.title}」\n\n${p.excerpt ?? ""}\n\n—— ${p.authorName} · 巴别图书馆`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: p.title,
          text: quote,
          url: window.location.href,
        });
        setShared(true);
        toast.success("已分享这卷书");
      } else {
        await navigator.clipboard.writeText(quote + "\n\n" + window.location.href);
        setShared(true);
        toast.success("引文已抄至剪贴板 · 可粘贴给某位读者");
        setTimeout(() => setShared(false), 2400);
      }
    } catch {
      // user cancelled share — no toast
    }
  };

  const handleExportMarkdown = () => {
    if (!post.data) return;
    const p = post.data;
    const frontmatter = [
      '---',
      `title: "${p.title}"`,
      `hexagon: "${p.hexagon}"`,
      `author: "${p.authorName}"`,
      p.tags ? `tags: [${p.tags.split(/[,，、]/).map(t => `"${t.trim()}"`).join(', ')}]` : '',
      p.excerpt ? `excerpt: "${p.excerpt.replace(/"/g, '\\"')}"` : '',
      `date: ${new Date(p.createdAt).toISOString().slice(0, 10)}`,
      p.readMinutes ? `readingTime: ${p.readMinutes}` : '',
      '---',
    ].filter(Boolean).join('\n');

    const md = `${frontmatter}\n\n${p.content}`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.slug || 'volume'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Markdown 文件已下载');
  };

  const handlePrint = () => {
    // Trigger the browser's native print dialog so the reader can
    // "save as PDF" or send to a printer. The @media print stylesheet
    // hides chrome (header/footer/TOC/FABs/comments/related/CTA) and
    // reformats the article for paper — serif, black on white, etc.
    if (typeof window === "undefined") return;
    toast.info("正在准备印刷版……", {
      description: "在系统打印对话框中选择「另存为 PDF」即可导出此卷。",
    });
    // Allow the toast to paint before the print dialog grabs focus.
    setTimeout(() => window.print(), 250);
  };

  if (post.loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Skeleton className="mb-4 h-6 w-24 rounded" />
        <Skeleton className="mb-3 h-12 w-3/4 rounded" />
        <Skeleton className="mb-8 h-4 w-1/2 rounded" />
        <div className="space-y-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-4 rounded" style={{ width: `${80 + (i % 4) * 5}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (post.error || !post.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="font-serif-display text-3xl text-muted-foreground">
          这一卷似乎不存在。
        </p>
        <p className="mt-2 font-body-serif text-sm text-muted-foreground">
          也许它写在另一个回廊，也许它从未被写下。
        </p>
        <Button
          onClick={() => setView({ name: "library" })}
          className="mt-6 rounded-full bg-gold text-ink"
        >
          返回书库
        </Button>
      </div>
    );
  }

  const p = post.data;
  const date = new Date(p.createdAt);
  const dateStr = isNaN(date.getTime())
    ? ""
    : format(date, "yyyy年MM月dd日", { locale: zhCN });
  const tags = p.tags ? p.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];

  return (
    <div className="rise-in">
      {/* Reading progress bar */}
      <div className="fixed left-0 top-16 z-40 h-0.5 w-full bg-transparent print:hidden">
        <div
          className="h-full bg-gradient-to-r from-gold/40 via-gold to-gold/40 transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Back-to-top FAB */}
      {showBackTop && (
        <button
          onClick={scrollToTop}
          aria-label="回到顶部"
          className="fixed bottom-8 right-6 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 bg-background/80 text-gold backdrop-blur-md transition-all hover:border-gold hover:bg-gold/10 hover:shadow-[0_4px_20px_-4px_var(--gold)] rise-in print:hidden"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}

      {/* Mobile font-size floating control */}
      <div className="fixed bottom-8 left-6 z-40 lg:hidden print:hidden">
        {fontPanelOpen && (
          <div className="rise-in mb-2 flex items-center gap-1 rounded-full border border-gold/30 bg-background/90 px-2 py-1.5 backdrop-blur-md">
            <button
              onClick={() => adjustFontSize(-1)}
              disabled={fontSize === 90}
              aria-label="减小字号"
              className="flex h-8 w-8 items-center justify-center rounded-full text-gold transition-colors hover:bg-gold/10 disabled:opacity-30"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[1.5rem] text-center font-body-serif text-xs text-foreground/80">
              {fontSizeLabel}
            </span>
            <button
              onClick={() => adjustFontSize(1)}
              disabled={fontSize === 115}
              aria-label="增大字号"
              className="flex h-8 w-8 items-center justify-center rounded-full text-gold transition-colors hover:bg-gold/10 disabled:opacity-30"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <button
          onClick={() => setFontPanelOpen((v) => !v)}
          aria-label="字号设置"
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full border bg-background/80 text-gold backdrop-blur-md transition-all hover:border-gold hover:bg-gold/10",
            fontPanelOpen ? "border-gold" : "border-gold/30"
          )}
        >
          <Type className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile TOC trigger */}
      {headings.length > 0 && (
        <Sheet open={tocOpen} onOpenChange={setTocOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="打开目录"
              className="fixed bottom-8 left-20 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-gold/30 bg-background/80 text-gold backdrop-blur-md transition-all hover:border-gold hover:bg-gold/10 lg:hidden print:hidden"
            >
              <List className="h-4 w-4" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] bg-background">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 font-serif-display">
                <List className="h-4 w-4 text-gold" /> 本卷目录
              </SheetTitle>
            </SheetHeader>
            <TOC
              headings={headings}
              activeId={activeHeading}
              onJump={scrollToHeading}
            />
            {/* progress + reading-time ruler in mobile drawer */}
            <div className="mt-6 border-t border-border/40 pt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>阅读进度</span>
                <span className="text-gold">{Math.round(progress)}%</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-border/40">
                <div
                  className="h-full bg-gradient-to-r from-gold/40 to-gold transition-[width] duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <ReadingRuler percent={progress} readMinutes={p.readMinutes} />
            </div>
            {/* Reading session timer (mobile drawer) */}
            <ReadingSessionTimer slug={slug} />
          </SheetContent>
        </Sheet>
      )}

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_180px] lg:gap-12 xl:gap-8">
          {/* Desktop TOC sidebar (column reserved even when empty) */}
          <aside className="hidden lg:block print:hidden">
            {headings.length > 0 && (
              <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto scroll-leather">
                <p className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-gold/60">
                  <List className="h-3 w-3" /> 目录
                </p>
                <TOC
                  headings={headings}
                  activeId={activeHeading}
                  onJump={scrollToHeading}
                />
                {/* progress indicator in sidebar */}
                <div className="mt-6 border-t border-border/40 pt-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>阅读进度</span>
                    <span className="text-gold">{Math.round(progress)}%</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-border/40">
                    <div
                      className="h-full bg-gradient-to-r from-gold/40 to-gold transition-[width] duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {/* Reading-time ruler — minute-segment ticks */}
                  <ReadingRuler percent={progress} readMinutes={p.readMinutes} />
                  {/* Reading session timer (desktop sidebar) */}
                  <ReadingSessionTimer slug={slug} />
                </div>

                {/* Word count + reading time stats */}
                <div className="mt-4 border-t border-border/40 pt-4">
                  <p className="mb-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    卷册信息
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">字数</span>
                      <span className="font-body-serif text-gold">
                        {(() => {
                          const cjk = (p.content.match(/[\u4e00-\u9fa5]/g) || []).length;
                          const enWords = (p.content.match(/[a-zA-Z]+/g) || []).length;
                          return (cjk + enWords).toLocaleString();
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">阅读时长</span>
                      <span className="font-body-serif text-foreground/80">
                        约 {p.readMinutes} 分钟
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">阅读位置</span>
                      <span className="font-body-serif text-gold">
                        {Math.round(progress)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Font size controls in sidebar */}
                <div className="mt-4 border-t border-border/40 pt-4">
                  <p className="mb-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
                    字号
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => adjustFontSize(-1)}
                      disabled={fontSize === 90}
                      aria-label="减小字号"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 text-gold transition-colors hover:border-gold hover:bg-gold/10 disabled:opacity-30"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[2rem] text-center font-body-serif text-sm text-foreground/80">
                      {fontSizeLabel}
                    </span>
                    <button
                      onClick={() => adjustFontSize(1)}
                      disabled={fontSize === 115}
                      aria-label="增大字号"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 text-gold transition-colors hover:border-gold hover:bg-gold/10 disabled:opacity-30"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* Article */}
          <article className="mx-auto w-full max-w-3xl py-10">
            {/* Breadcrumb / back */}
            <div className="mb-6 flex items-center justify-between text-sm">
              <button
                onClick={() => (canGoBack() ? goBack() : setView({ name: "library" }))}
                className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-gold print:hidden"
              >
                <ArrowLeft className="h-4 w-4" /> 返回
              </button>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <button
                  onClick={() => setView({ name: "home" })}
                  className="hover:text-gold"
                >
                  首页
                </button>
                <ChevronRight className="h-3 w-3" />
                <button
                  onClick={() => setView({ name: "hexagon", hexagon: p.hexagon })}
                  className="hover:text-gold"
                >
                  {p.hexagon}
                </button>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground/80">本卷</span>
              </div>
            </div>

            {/* Title block */}
            <header className="mb-10 border-b border-border/60 pb-8 text-center">
              {/* marginalia decoration */}
              <div className="mx-auto mb-4 flex items-center justify-center gap-3 text-gold/40">
                <span className="h-px w-12 bg-gradient-to-r from-transparent to-gold/40" />
                <span className="font-serif-display text-xs tracking-[0.4em]">❖</span>
                <span className="h-px w-12 bg-gradient-to-l from-transparent to-gold/40" />
              </div>
              <div className="mb-3 flex items-center justify-center gap-2 text-sm text-gold/80">
                <Hexagon className="h-4 w-4" />
                <button
                  onClick={() => setView({ name: "hexagon", hexagon: p.hexagon })}
                  className="font-body-serif hover:text-gold"
                >
                  {p.hexagon}
                </button>
              </div>
              <h1 className="font-serif-display text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
                {p.title}
              </h1>
              {p.excerpt && (
                <p className="mx-auto mt-4 max-w-2xl font-body-serif text-lg italic leading-relaxed text-muted-foreground">
                  {p.excerpt}
                </p>
              )}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                  <Feather className="h-3.5 w-3.5 text-gold/70" />
                  {p.authorUrl ? (
                    <a
                      href={p.authorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold/80 underline decoration-gold/30 underline-offset-4 transition-colors hover:text-gold hover:decoration-gold"
                    >
                      {p.authorName}
                    </a>
                  ) : (
                    <span>{p.authorName}</span>
                  )}
                </span>
                <span>·</span>
                <span>{dateStr}</span>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-gold/70" /> {p.readMinutes} 分钟阅读
                </span>
                <span>·</span>
                <span className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-gold/70" /> {p.views} 次翻阅
                </span>
              </div>
            </header>

            {/* Body */}
            <div
              id="volume-body"
              ref={proseRef}
              className="prose-babel prose-ambiance view-fade-in"
              style={{ fontSize: `${fontSize}%` }}
            >
              <ReactMarkdown
                components={{
                  h2: ({ node, children, ...props }) => {
                    const text = String(children);
                    return <h2 id={headingId(text)} {...props}>{children}</h2>;
                  },
                  h3: ({ node, children, ...props }) => {
                    const text = String(children);
                    return <h3 id={headingId(text)} {...props}>{children}</h3>;
                  },
                }}
              >
                {p.content}
              </ReactMarkdown>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-border/60 pt-6">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  索引词
                </span>
                {tags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setView({ name: "library", tag: t })}
                    className="rounded-full border border-border/60 px-3 py-1 text-xs text-foreground/70 transition-colors hover:border-gold/50 hover:text-gold"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {/* Literary Siblings — recommended similar volumes */}
            <LiterarySiblings post={p} />

            {/* Like + Share + Export actions */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 print:hidden">
              <Button
                onClick={handleLike}
                disabled={liked}
                className={cn(
                  "rounded-full border px-6",
                  liked
                    ? "border-gold/40 bg-gold/10 text-gold"
                    : "border-gold/30 text-foreground hover:border-gold hover:text-gold"
                )}
                variant="outline"
              >
                <Heart className={cn("mr-2 h-4 w-4", liked && "fill-gold")} />
                {liked ? "已收藏" : "收藏这卷"} · {p.likes}
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                className={cn(
                  "rounded-full border px-5",
                  shared
                    ? "border-gold/40 bg-gold/10 text-gold"
                    : "border-border/50 text-foreground/80 hover:border-gold/50 hover:text-gold"
                )}
              >
                {shared ? (
                  <>
                    <Check className="mr-2 h-4 w-4" /> 已抄下
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" /> 抄录分享
                  </>
                )}
              </Button>
              <Button
                onClick={handleExportMarkdown}
                variant="outline"
                className="rounded-full border border-gold/30 px-5 text-foreground/80 transition-colors hover:border-gold hover:bg-gold/10 hover:text-gold"
                title="导出为 Markdown 文件"
              >
                <FileDown className="mr-2 h-4 w-4" /> 抄存 .md
              </Button>
              <CitationGenerator post={p} />
              <Button
                onClick={handlePrint}
                variant="outline"
                className="rounded-full border border-gold/30 px-5 text-foreground/80 transition-colors hover:border-gold hover:bg-gold/10 hover:text-gold"
                title="打印 / 另存为 PDF"
              >
                <Printer className="mr-2 h-4 w-4" /> 印刷版
              </Button>
              <Button
                onClick={() => setView({ name: "write", slug: p.slug })}
                variant="outline"
                className="rounded-full border border-gold/40 bg-gold/5 px-5 text-gold transition-colors hover:bg-gold/15"
                title="修订这一卷"
              >
                <Edit3 className="mr-2 h-4 w-4" /> 修订此卷
              </Button>
            </div>

            {/* Comments */}
            <section className="mt-14 print:hidden">
              <h2 className="mb-4 flex items-center gap-2 font-serif-display text-2xl font-semibold">
                <MessageSquare className="h-5 w-5 text-gold" /> 读者批注
                <span className="text-sm font-normal text-muted-foreground">
                  · {comments.data?.length || 0}
                </span>
              </h2>
              <CommentBox postId={p.id} onPosted={() => comments.reload()} />
              <div className="mt-6 space-y-4">
                {comments.data?.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-border/50 bg-card/40 p-4"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-serif-display text-sm font-medium text-gold">
                        {c.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(c.createdAt), "MM月dd日 HH:mm", { locale: zhCN })}
                      </span>
                    </div>
                    <p className="font-body-serif text-sm leading-relaxed text-foreground/85">
                      {c.content}
                    </p>
                  </div>
                ))}
                {comments.data && comments.data.length === 0 && (
                  <p className="font-body-serif text-sm italic text-muted-foreground">
                    尚无批注。在这卷书页边，留下你的笔迹吧。
                  </p>
                )}
              </div>
            </section>

            {/* Related */}
            {related.data && related.data.length > 0 && (
              <section className="mt-14 border-t border-border/60 pt-8 print:hidden">
                <h2 className="mb-4 font-serif-display text-2xl font-semibold">
                  同一回廊的其它卷册
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {related.data.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setView({ name: "volume", slug: r.slug })}
                      className="group flex items-start gap-3 rounded-lg border border-border/50 bg-card/30 p-3 text-left transition-all hover:border-gold/40 hover:bg-card/60"
                    >
                      <Hexagon className="mt-1 h-4 w-4 shrink-0 text-gold/60 group-hover:text-gold" />
                      <div>
                        <p className="font-serif-display text-base font-medium leading-snug group-hover:text-gold">
                          {r.title}
                        </p>
                        <p className="mt-0.5 font-body-serif text-xs text-muted-foreground line-clamp-1">
                          {r.excerpt}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Prev / Next volume navigation — continue the wander */}
            <nav
              data-testid="volume-prevnext-nav"
              aria-label="卷册导航"
              className="mt-12 mb-8 rise-in print:hidden"
            >
              <div className="mb-4 text-center">
                <span className="text-[0.7rem] uppercase tracking-[0.2em] text-gold/70">
                  Continue the Wander · 继续漫游
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* PREV (newer volume) */}
                {prevNext.prev ? (
                  <button
                    data-testid="volume-prev-btn"
                    onClick={() => goVolume(prevNext.prev!.slug)}
                    className="group rounded-2xl border border-border/50 bg-card/30 p-5 text-left transition-all hover:border-gold/40 hover:bg-card/50 cursor-pointer"
                  >
                    <div className="mb-2 flex items-center gap-1 text-[0.7rem] uppercase tracking-[0.2em] text-gold/70">
                      <ArrowLeft className="h-3 w-3" /> 上一篇 · Previous
                    </div>
                    <h3 className="mb-1 font-serif-display text-base font-semibold line-clamp-2 group-hover:text-gold transition-colors">
                      {prevNext.prev.title}
                    </h3>
                    <p className="font-body-serif text-xs text-muted-foreground line-clamp-1">
                      {prevNext.prev.excerpt || "暂无摘要"}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-[0.7rem] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full border border-gold/30 px-1.5 py-0.5 text-gold/80">
                        <Hexagon className="h-2.5 w-2.5" />
                        {prevNext.prev.hexagon}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {prevNext.prev.readMinutes} 分
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {prevNext.prev.views}
                      </span>
                    </div>
                  </button>
                ) : (
                  <div className="rounded-2xl border border-border/50 bg-card/30 p-5 opacity-40 cursor-default">
                    <div className="mb-2 flex items-center gap-1 text-[0.7rem] uppercase tracking-[0.2em] text-gold/70">
                      <ArrowLeft className="h-3 w-3" /> 上一篇 · Previous
                    </div>
                    <div className="flex items-center gap-2 font-body-serif text-sm italic text-muted-foreground">
                      <Hexagon className="h-4 w-4" /> 已是边界 · 此乃最新一卷
                    </div>
                  </div>
                )}
                {/* NEXT (older volume) */}
                {prevNext.next ? (
                  <button
                    data-testid="volume-next-btn"
                    onClick={() => goVolume(prevNext.next!.slug)}
                    className="group rounded-2xl border border-border/50 bg-card/30 p-5 text-left transition-all hover:border-gold/40 hover:bg-card/50 cursor-pointer sm:text-right"
                  >
                    <div className="mb-2 flex items-center gap-1 text-[0.7rem] uppercase tracking-[0.2em] text-gold/70 sm:justify-end">
                      下一篇 · Next <ArrowRight className="h-3 w-3" />
                    </div>
                    <h3 className="mb-1 font-serif-display text-base font-semibold line-clamp-2 group-hover:text-gold transition-colors">
                      {prevNext.next.title}
                    </h3>
                    <p className="font-body-serif text-xs text-muted-foreground line-clamp-1">
                      {prevNext.next.excerpt || "暂无摘要"}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-[0.7rem] text-muted-foreground sm:justify-end">
                      <span className="inline-flex items-center gap-1 rounded-full border border-gold/30 px-1.5 py-0.5 text-gold/80">
                        <Hexagon className="h-2.5 w-2.5" />
                        {prevNext.next.hexagon}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {prevNext.next.readMinutes} 分
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {prevNext.next.views}
                      </span>
                    </div>
                  </button>
                ) : (
                  <div className="rounded-2xl border border-border/50 bg-card/30 p-5 opacity-40 cursor-default sm:text-right">
                    <div className="mb-2 flex items-center gap-1 text-[0.7rem] uppercase tracking-[0.2em] text-gold/70 sm:justify-end">
                      下一篇 · Next <ArrowRight className="h-3 w-3" />
                    </div>
                    <div className="flex items-center gap-2 font-body-serif text-sm italic text-muted-foreground sm:justify-end">
                      <Hexagon className="h-4 w-4" /> 已是边界 · 此乃最古一卷
                    </div>
                  </div>
                )}
              </div>
              {/* Back to top */}
              <button
                data-testid="back-to-top-btn"
                onClick={scrollToTop}
                className="mx-auto mt-6 flex items-center gap-1.5 rounded-full border border-gold/30 px-4 py-1.5 font-body-serif text-xs text-foreground/70 hover:border-gold hover:text-gold transition-colors"
              >
                <ArrowUp className="h-3.5 w-3.5" /> 回到顶部 · Back to Top
              </button>
            </nav>

            {/* Continue exploring CTA */}
            <section className="mt-14 print:hidden">
              {/* gold divider */}
              <div className="flex items-center justify-center gap-4">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/30" />
                <span className="text-gold/40">❖</span>
                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/30" />
              </div>
              <div className="py-10 text-center">
                <h2 className="font-serif-display text-2xl font-semibold text-foreground">
                  继续漫游
                </h2>
                <p className="mt-2 mb-6 font-body-serif text-sm italic text-muted-foreground">
                  图书馆的回廊永无尽头。
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    onClick={() => setView({ name: "library" })}
                    className="rounded-full bg-gold text-ink hover:bg-gold/90"
                  >
                    <Hexagon className="mr-1.5 h-4 w-4" /> 返回书库
                  </Button>
                  <Button
                    onClick={async () => {
                      try {
                        const all = await api.listPosts({ limit: 100 });
                        if (all.length > 0) {
                          const others = all.filter((x) => x.id !== p.id);
                          const pool = others.length > 0 ? others : all;
                          const pick = pool[Math.floor(Math.random() * pool.length)];
                          setView({ name: "volume", slug: pick.slug });
                        }
                      } catch {
                        toast.error("翻阅失败");
                      }
                    }}
                    variant="outline"
                    className="rounded-full border-gold/30 text-gold hover:border-gold hover:bg-gold/10"
                  >
                    <Shuffle className="mr-1.5 h-4 w-4" /> 随机翻阅
                  </Button>
                </div>
              </div>
            </section>
          </article>

          {/* Desktop marginalia sidebar (xl+ only) */}
          <aside className="hidden xl:block print:hidden">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-hidden">
              <MarginNotes
                highlights={highlights}
                onJump={dispatchJumpToHighlight}
              />
            </div>
          </aside>
        </div>
      </div>

      {/* Floating selection toolbar — appears above any text selection in .prose-babel */}
      <HighlightToolbar
        onHighlight={(text, paragraph, offset) =>
          addHighlight(text, { paragraph, offset })
        }
        onAnnotate={(text, paragraph, offset, note) =>
          addHighlight(text, { paragraph, offset }, note)
        }
      />

      {/* Apply marks to the rendered prose + handle clicks on them */}
      <HighlightRenderer
        proseRef={proseRef}
        highlights={highlights}
        onRemove={removeHighlight}
      />

      {/* Mobile / narrow-viewport marginalia badge + Sheet */}
      <MobileMarginNotes
        highlights={highlights}
        onJump={dispatchJumpToHighlight}
      />
    </div>
  );
}

/** Table of contents — shared by desktop sidebar and mobile drawer. */
function TOC({
  headings,
  activeId,
  onJump,
}: {
  headings: Heading[];
  activeId: string;
  onJump: (id: string) => void;
}) {
  if (headings.length === 0) {
    return (
      <p className="font-body-serif text-xs italic text-muted-foreground">
        本卷无次级标题。
      </p>
    );
  }
  return (
    <nav className="space-y-0.5">
      {headings.map((h, i) => (
        <button
          key={h.id + i}
          onClick={() => onJump(h.id)}
          className={cn(
            "toc-link block w-full text-left font-body-serif text-sm leading-relaxed",
            h.level === 3 ? "pl-3 text-muted-foreground" : "text-foreground/80",
            activeId === h.id && "active"
          )}
        >
          {h.text}
        </button>
      ))}
    </nav>
  );
}

function CommentBox({
  postId,
  onPosted,
}: {
  postId: string;
  onPosted: () => void;
}) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!name.trim() || !content.trim()) {
      toast.error("请署名并写下批注");
      return;
    }
    setSubmitting(true);
    try {
      await api.addComment(postId, name.trim(), content.trim());
      setContent("");
      onPosted();
      toast.success("批注已留在书页边");
    } catch (e) {
      toast.error("提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/30 p-4">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="你的署名（笔名亦可）"
        className="mb-2 font-body-serif"
        maxLength={30}
      />
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="在这卷书页边，写下你的批注……"
        className="mb-3 min-h-[80px] font-body-serif"
        maxLength={500}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{content.length} / 500</span>
        <Button
          onClick={submit}
          disabled={submitting}
          size="sm"
          className="rounded-full bg-gold text-ink hover:bg-gold/90"
        >
          <Send className="mr-1.5 h-3.5 w-3.5" />
          {submitting ? "提交中…" : "留下批注"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Reading-time ruler — a horizontal bar of N gold tick marks (one per reading
 * minute, capped at 20 segments). Already-read segments are solid gold, the
 * segment the reader is currently in pulses with the candle-glow animation,
 * and the un-read segments are thin gold outlines. A small label below reads
 * "已读 X / Y 分钟" (X = current minute, Y = total). On hover, a tooltip
 * listing every minute marker appears.
 *
 * `percent` is 0–100 (matches the `progress` state used elsewhere in the view).
 */
function ReadingRuler({
  percent,
  readMinutes,
}: {
  percent: number;
  readMinutes: number;
}) {
  const MAX_SEGMENTS = 20;
  const totalMinutes = Math.max(1, readMinutes);
  const segments = Math.min(MAX_SEGMENTS, totalMinutes);
  const minutesPerSegment = totalMinutes / segments;

  // Clamp to [0, 1] for safety.
  const pct = Math.max(0, Math.min(100, percent)) / 100;

  // currentMinute follows the task formula: Math.floor(percent * readMinutes).
  // Capped at totalMinutes so the label never reads e.g. "11 / 10".
  const currentMinute = Math.min(totalMinutes, Math.floor(pct * totalMinutes));

  // Index of the segment the reader is currently inside.
  // At pct = 0 the current segment is the first one (but not "active" — see state).
  const currentSegmentIdx = Math.min(
    segments - 1,
    Math.floor(pct * segments)
  );

  // Build a comma-joined list of minute markers for the hover tooltip:
  // "1min · 2min · 3min · … · Ymin"
  const tooltipMarkers = Array.from({ length: segments }, (_, i) => {
    const m = Math.round((i + 1) * minutesPerSegment);
    return `${m}min`;
  }).join(" · ");

  return (
    <div
      className="reading-ruler mt-3"
      role="meter"
      aria-valuenow={currentMinute}
      aria-valuemin={0}
      aria-valuemax={totalMinutes}
      aria-label={`阅读时长刻度：已读 ${currentMinute} / ${totalMinutes} 分钟`}
    >
      <div className="flex items-center gap-[3px]" aria-hidden>
        {Array.from({ length: segments }, (_, i) => {
          // state: 'filled' (already read) | 'current' (pulsing) | 'empty'
          let state: "filled" | "current" | "empty";
          if (pct >= 0.999) {
            // finished — all filled
            state = "filled";
          } else if (pct === 0) {
            state = i === 0 ? "current" : "empty";
          } else if (i < currentSegmentIdx) {
            state = "filled";
          } else if (i === currentSegmentIdx) {
            state = "current";
          } else {
            state = "empty";
          }

          const minuteMarker = Math.round((i + 1) * minutesPerSegment);

          return (
            <span
              key={i}
              title={`${minuteMarker} 分钟`}
              className={cn(
                "reading-ruler-seg",
                `reading-ruler-seg-${state}`
              )}
            />
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="font-body-serif text-[0.7rem] italic text-muted-foreground">
          已读 <span className="text-gold">{currentMinute}</span> /{" "}
          {totalMinutes} 分钟
        </span>
        {segments < totalMinutes && (
          <span className="font-body-serif text-[0.65rem] text-muted-foreground/70">
            每格 ≈ {minutesPerSegment.toFixed(1)} 分
          </span>
        )}
      </div>

      {/* Hover tooltip — lists every minute marker */}
      <span className="reading-ruler-tooltip" aria-hidden>
        {tooltipMarkers}
      </span>
    </div>
  );
}
