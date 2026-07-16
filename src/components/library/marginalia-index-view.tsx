"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useLibrary } from "@/store/library-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  getAllHighlights,
  clearAllHighlights,
} from "@/hooks/use-highlights";
import { getSavedProgressFor, type SavedProgress } from "@/hooks/use-reading-memory";
import type { Highlight } from "@/lib/types";
import {
  BookOpen,
  Hexagon,
  MessageSquareQuote,
  Search,
  ArrowRight,
  Trash2,
  Highlighter,
  StickyNote,
  Library,
  Clock,
  AlertTriangle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VolumeGroup {
  slug: string;
  title: string;
  hexagon: string;
  highlights: Highlight[];
  mostRecentAt: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTimeAgo(ts: number): string {
  const ageMin = Math.round((Date.now() - ts) / 60000);
  if (ageMin < 1) return "刚刚";
  if (ageMin < 60) return `${ageMin} 分钟前`;
  if (ageMin < 1440) return `${Math.round(ageMin / 60)} 小时前`;
  if (ageMin < 43200) return `${Math.round(ageMin / 1440)} 天前`;
  return new Date(ts).toLocaleDateString("zh-CN");
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MarginaliaIndexView() {
  const { setView } = useLibrary();
  const [volumeGroups, setVolumeGroups] = useState<VolumeGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "hasNote">("all");
  const [loaded, setLoaded] = useState(false);

  // Load all highlights from localStorage on mount
  const refreshData = useCallback(() => {
    const allData = getAllHighlights();
    const groups: VolumeGroup[] = allData
      .map(({ slug, highlights }) => {
        const progress: SavedProgress | null = getSavedProgressFor(slug);
        const sorted = [...highlights].sort((a, b) => b.createdAt - a.createdAt);
        return {
          slug,
          title: progress?.title ?? slug,
          hexagon: progress?.hexagon ?? "",
          highlights: sorted,
          mostRecentAt: sorted[0]?.createdAt ?? 0,
        };
      })
      .sort((a, b) => b.mostRecentAt - a.mostRecentAt);
    setVolumeGroups(groups);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Stats
  const stats = useMemo(() => {
    const allHighlights = volumeGroups.flatMap((g) => g.highlights);
    return {
      total: allHighlights.length,
      withNotes: allHighlights.filter((h) => h.note && h.note.trim()).length,
      volumeCount: volumeGroups.length,
    };
  }, [volumeGroups]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return volumeGroups
      .map((group) => {
        let filtered = group.highlights;

        // Text search across highlight text + notes
        if (q) {
          filtered = filtered.filter(
            (h) =>
              h.text.toLowerCase().includes(q) ||
              (h.note && h.note.toLowerCase().includes(q))
          );
        }

        // Filter by has note
        if (filterMode === "hasNote") {
          filtered = filtered.filter((h) => h.note && h.note.trim());
        }

        return { ...group, highlights: filtered };
      })
      .filter((g) => g.highlights.length > 0);
  }, [volumeGroups, searchQuery, filterMode]);

  // Clear all
  const handleClearAll = useCallback(() => {
    clearAllHighlights();
    setVolumeGroups([]);
  }, []);

  // Empty state
  if (loaded && stats.total === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 rise-in">
        {/* Heading (kept consistent with populated state) */}
        <div className="mb-10 text-center">
          <p className="mb-1 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-gold/70">
            <Highlighter className="h-3.5 w-3.5" /> Annotations Across Volumes
          </p>
          <h1 className="font-serif-display text-4xl font-semibold">
            <span className="shimmer-gold">批注索引</span>
          </h1>
          <p className="mt-1 font-body-serif text-sm italic text-muted-foreground">
            所有卷册中的高亮与批注，一处尽览
          </p>
        </div>

        {/* Gold divider */}
        <div className="gold-divider mx-auto mb-12 w-40" aria-hidden="true" />

        <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
          {/* Decorative hex */}
          <svg
            className="h-24 w-24 text-gold/25"
            viewBox="0 0 200 200"
            fill="none"
            aria-hidden="true"
          >
            <polygon
              points="100,10 178,55 178,145 100,190 22,145 22,55"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <polygon
              points="100,40 150,65 150,135 100,160 50,135 50,65"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <polygon
              points="100,70 124,84 124,116 100,130 76,116 76,84"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
            />
          </svg>
          <div>
            <h2 className="font-serif-display text-2xl font-semibold text-foreground/80">
              尚无批注
            </h2>
            <p className="mt-2 max-w-md font-body-serif text-sm leading-relaxed text-muted-foreground">
              在阅读卷册时选中文字，即可添加高亮与批注。
              <br />
              它们将在这里汇聚成你的索引——一座由你亲手标记的小型图书馆。
            </p>
          </div>
          <Button
            onClick={() => setView({ name: "library" })}
            variant="outline"
            className="rounded-full border-gold/30 hover:border-gold hover:text-gold"
          >
            <BookOpen className="mr-2 h-4 w-4" /> 去书库走走
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 rise-in">
      {/* ---- Sticky Header with Stats ---- */}
      <div className="sticky top-0 z-20 -mx-4 bg-background/80 px-4 pb-4 pt-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {/* Heading */}
        <div className="mb-6 text-center">
          <p className="mb-1 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-gold/70">
            <Highlighter className="h-3.5 w-3.5" /> Annotations Across Volumes
          </p>
          <h1 className="font-serif-display text-4xl font-semibold">
            <span className="shimmer-gold">批注索引</span>
          </h1>
          <p className="mt-1 font-body-serif text-sm italic text-muted-foreground">
            所有卷册中的高亮与批注，一处尽览
          </p>
        </div>

        {/* Stats Tiles */}
        <div className="grid grid-cols-3 gap-3">
          <StatTile
            icon={<Highlighter className="h-4 w-4" />}
            label="高亮"
            value={stats.total}
          />
          <StatTile
            icon={<StickyNote className="h-4 w-4" />}
            label="批注"
            value={stats.withNotes}
          />
          <StatTile
            icon={<Library className="h-4 w-4" />}
            label="卷册"
            value={stats.volumeCount}
          />
        </div>

        {/* Search + Filters */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索高亮文字或批注……"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 font-body-serif border-gold/20 focus-visible:border-gold/50 focus-visible:ring-gold/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={filterMode === "all" ? "default" : "outline"}
              onClick={() => setFilterMode("all")}
              className={
                filterMode === "all"
                  ? "rounded-full bg-gold text-ink hover:bg-gold/90"
                  : "rounded-full border-gold/30 hover:border-gold hover:text-gold"
              }
            >
              全部
            </Button>
            <Button
              size="sm"
              variant={filterMode === "hasNote" ? "default" : "outline"}
              onClick={() => setFilterMode("hasNote")}
              className={
                filterMode === "hasNote"
                  ? "rounded-full bg-gold text-ink hover:bg-gold/90"
                  : "rounded-full border-gold/30 hover:border-gold hover:text-gold"
              }
            >
              <StickyNote className="mr-1.5 h-3.5 w-3.5" /> 有批注
            </Button>
          </div>
        </div>
      </div>

      {/* ---- Gold Divider ---- */}
      <div className="gold-divider" aria-hidden="true">
        ❖
      </div>

      {/* ---- Volume Groups ---- */}
      {loaded && filteredGroups.length === 0 && (
        <div className="py-12 text-center">
          <p className="font-body-serif text-sm italic text-muted-foreground">
            {searchQuery ? "未找到匹配的批注" : "没有符合条件的批注"}
          </p>
        </div>
      )}

      <div className="stagger-in space-y-8">
        {filteredGroups.map((group) => (
          <VolumeGroupCard
            key={group.slug}
            group={group}
            onJumpToVolume={(slug) => setView({ name: "volume", slug })}
          />
        ))}
      </div>

      {/* ---- Footer Actions ---- */}
      {loaded && stats.total > 0 && (
        <div className="mt-10 flex items-center justify-between border-t border-gold/15 pt-6">
          <p className="font-body-serif text-xs text-muted-foreground">
            共 {stats.total} 条高亮 · {stats.withNotes} 条批注 ·{" "}
            {stats.volumeCount} 卷
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                清除全部
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-gold/20">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-serif-display flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  确认清除所有批注？
                </AlertDialogTitle>
                <AlertDialogDescription className="font-body-serif">
                  此操作将永久删除所有卷册中的全部高亮与批注，且无法恢复。
                  共 {stats.total} 条高亮将从 {stats.volumeCount}{" "}
                  卷中移除。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="font-body-serif rounded-full border-gold/30">
                  取消
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAll}
                  className="font-body-serif rounded-full bg-destructive text-white hover:bg-destructive/90"
                >
                  确认清除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-gold/15 bg-card/40 p-3 text-center">
      <div className="flex items-center justify-center gap-1.5 text-gold/80">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 font-serif-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

function VolumeGroupCard({
  group,
  onJumpToVolume,
}: {
  group: VolumeGroup;
  onJumpToVolume: (slug: string) => void;
}) {
  return (
    <section className="rounded-xl border border-border/50 bg-card/20 p-5">
      {/* Volume Header */}
      <div className="mb-4 flex items-center gap-3">
        {/* Hexagon badge */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold/25 bg-gold/10">
          <Hexagon className="h-4 w-4 text-gold" />
        </div>
        <div className="min-w-0 flex-1">
          <button
            onClick={() => onJumpToVolume(group.slug)}
            className="group flex items-center gap-2 text-left"
          >
            <h3 className="truncate font-serif-display text-lg font-semibold text-foreground transition-colors group-hover:text-gold">
              {group.title}
            </h3>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-gold" />
          </button>
          {group.hexagon && (
            <p className="text-xs text-muted-foreground">{group.hexagon}</p>
          )}
        </div>
        <Badge
          variant="outline"
          className="shrink-0 border-gold/25 text-gold/80 font-body-serif"
        >
          {group.highlights.length} 条
        </Badge>
      </div>

      {/* Highlights List */}
      <div className="space-y-3">
        {group.highlights.map((highlight) => (
          <HighlightCard
            key={highlight.id}
            highlight={highlight}
            onJump={() => onJumpToVolume(group.slug)}
          />
        ))}
      </div>
    </section>
  );
}

function HighlightCard({
  highlight,
  onJump,
}: {
  highlight: Highlight;
  onJump: () => void;
}) {
  const hasNote = highlight.note && highlight.note.trim();

  return (
    <div className="group rounded-lg border border-border/30 bg-background/30 p-3 transition-colors hover:border-gold/25 hover:bg-card/40">
      {/* Highlighted text */}
      <div className="flex items-start gap-2">
        <Highlighter className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/50" />
        <p className="font-body-serif text-sm leading-relaxed text-foreground/85">
          <span className="rounded bg-gold/10 px-0.5">
            {truncate(highlight.text, 80)}
          </span>
        </p>
      </div>

      {/* Note */}
      {hasNote && (
        <div className="mt-2 flex items-start gap-2 pl-0.5">
          <MessageSquareQuote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/60" />
          <p className="font-body-serif text-sm italic text-muted-foreground">
            {highlight.note}
          </p>
        </div>
      )}

      {/* Meta row */}
      <div className="mt-2 flex items-center justify-between">
        <span className="flex items-center gap-1 text-[0.7rem] text-muted-foreground/60">
          <Clock className="h-3 w-3" />
          {formatTimeAgo(highlight.createdAt)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onJump}
          className="h-7 rounded-full px-2.5 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-gold"
        >
          <BookOpen className="mr-1 h-3 w-3" /> 跳转
        </Button>
      </div>
    </div>
  );
}
