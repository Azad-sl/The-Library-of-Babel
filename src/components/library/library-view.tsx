"use client";

import { useMemo, useState } from "react";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/lib/api";
import { useLibrary } from "@/store/library-store";
import { VolumeCard } from "./volume-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Library as LibraryIcon, Search, Hexagon, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function LibraryView() {
  const { view, setView } = useLibrary();
  const initialHexagon = view.name === "library" ? view.hexagon : undefined;
  const initialTag = view.name === "library" ? view.tag : undefined;

  const [hexagon, setHexagon] = useState<string | undefined>(initialHexagon);
  const [tag, setTag] = useState<string | undefined>(initialTag);
  const [query, setQuery] = useState("");

  const posts = useAsync(
    () => api.listPosts({ hexagon, tag, limit: 200 }),
    [hexagon, tag]
  );
  const hexagons = useAsync(() => api.listHexagons(), []);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    posts.data?.forEach((p) => {
      p.tags
        ?.split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [posts.data]);

  const filtered = useMemo(() => {
    if (!posts.data) return [];
    if (!query.trim()) return posts.data;
    const q = query.toLowerCase();
    return posts.data.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.excerpt || "").toLowerCase().includes(q)
    );
  }, [posts.data, query]);

  const clearFilters = () => {
    setHexagon(undefined);
    setTag(undefined);
    setQuery("");
    setView({ name: "library" });
  };

  const hasFilter = hexagon || tag || query;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 rise-in">
      {/* Header */}
      <div className="mb-8">
        <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold/70">
          <LibraryIcon className="h-3.5 w-3.5" /> The Library
        </p>
        <h1 className="font-serif-display text-4xl font-semibold sm:text-5xl">
          书库
        </h1>
        <p className="mt-2 max-w-2xl font-body-serif text-base italic text-muted-foreground">
          漫游所有卷册。你可以按回廊（主题）漫步，或按索引词寻找。
        </p>
      </div>

      {/* Toolbar */}
      <div className="mb-6 space-y-4 rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="在当前卷册中检索一个词……"
            className="rounded-full border-gold/20 bg-background/60 pl-10 pr-10 font-body-serif"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Hexagon filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Hexagon className="h-3.5 w-3.5 text-gold/70" /> 回廊：
          </span>
          <button
            onClick={() => setHexagon(undefined)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              !hexagon
                ? "border-gold bg-gold/15 text-gold"
                : "border-border text-muted-foreground hover:border-gold/40 hover:text-foreground"
            )}
          >
            全部
          </button>
          {hexagons.data?.map((h) => (
            <button
              key={h.name}
              onClick={() => setHexagon(hexagon === h.name ? undefined : h.name)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                hexagon === h.name
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-border text-muted-foreground hover:border-gold/40 hover:text-foreground"
              )}
            >
              {h.name} · {h.count}
            </button>
          ))}
        </div>

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5 text-gold/70" /> 索引词：
            </span>
            {allTags.slice(0, 16).map((t) => (
              <button
                key={t}
                onClick={() => setTag(tag === t ? undefined : t)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[0.7rem] transition-colors",
                  tag === t
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-border/60 text-muted-foreground hover:border-gold/40 hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {hasFilter && (
          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-muted-foreground">
              显示 <span className="text-gold">{filtered.length}</span> 卷
              {hexagon && ` · 回廊「${hexagon}」`}
              {tag && ` · 含「${tag}」`}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 text-xs text-muted-foreground hover:text-gold"
            >
              <X className="mr-1 h-3 w-3" /> 清除筛选
            </Button>
          </div>
        )}
      </div>

      {/* Grid */}
      {posts.loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-16 text-center">
          <p className="font-serif-display text-2xl text-muted-foreground">
            这条回廊里，尚无卷册。
          </p>
          <p className="mt-2 font-body-serif text-sm text-muted-foreground">
            也许你该换一个方向继续走。
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, i) => (
            <VolumeCard key={p.id} post={p} variant="featured" index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
