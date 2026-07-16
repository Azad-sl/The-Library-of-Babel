"use client";

import { useEffect, useState } from "react";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/lib/api";
import { useLibrary } from "@/store/library-store";
import { VolumeCard } from "./volume-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, Clock, RotateCcw } from "lucide-react";

const RECENT_KEY = "babel-recent-searches";
const MAX_RECENT = 8;

export function SearchView({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [debounced, setDebounced] = useState(initialQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const results = useAsync(
    () => (debounced.trim() ? api.search(debounced) : Promise.resolve([])),
    [debounced]
  );

  // Load recent searches on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecentSearches(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 280);
    return () => clearTimeout(t);
  }, [query]);

  // Save to recent searches when debounced query is non-empty
  useEffect(() => {
    const q = debounced.trim();
    if (!q) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== q);
      const next = [q, ...filtered].slice(0, MAX_RECENT);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [debounced]);

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try { localStorage.removeItem(RECENT_KEY); } catch {}
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 rise-in">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="mb-1 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-gold/70">
          <Search className="h-3.5 w-3.5" /> Catalogue Search
        </p>
        <h1 className="font-serif-display text-4xl font-semibold sm:text-5xl">
          检索目录
        </h1>
        <p className="mt-2 font-body-serif text-base italic text-muted-foreground">
          在所有卷册中寻找一个词——也许它会带你到意想不到的回廊。
        </p>
      </div>

      {/* Search box */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gold/70" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入一个词或一句话……"
          className="h-14 rounded-full border-gold/30 bg-card/60 pl-12 pr-12 font-body-serif text-lg"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Results */}
      {debounced.trim() === "" ? (
        <div>
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div className="mb-6 rounded-xl border border-border/50 bg-card/30 p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-serif-display text-sm font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> 最近检索
                </span>
                <button
                  onClick={clearRecentSearches}
                  className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-gold"
                >
                  <RotateCcw className="h-3 w-3" /> 清除历史
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="rounded-full border border-border/50 bg-background/50 px-3 py-1 font-body-serif text-sm text-foreground/70 transition-colors hover:border-gold/50 hover:text-gold"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-xl border border-dashed border-border/60 p-16 text-center">
            <Search className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 font-serif-display text-2xl text-muted-foreground">
              输入一个词，开始检索
            </p>
            <p className="mt-2 font-body-serif text-sm text-muted-foreground">
              例如：博尔赫斯、迷宫、时间、回廊……
            </p>
          </div>
        </div>
      ) : results.loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : results.data && results.data.length > 0 ? (
        <div>
          <p className="mb-4 text-sm text-muted-foreground">
            在卷册中找到 <span className="text-gold">{results.data.length}</span> 处：
          </p>
          <div className="space-y-3">
            {results.data.map((p) => (
              <VolumeCard
                key={p.id}
                post={p}
                variant="compact"
                highlight={debounced.trim()}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/60 p-12 text-center">
          <p className="font-serif-display text-2xl text-muted-foreground">
            卷册中未见此词。
          </p>
          <p className="mt-2 font-body-serif text-sm text-muted-foreground">
            也许它在某一座尚未写就的回廊里。
          </p>
        </div>
      )}
    </div>
  );
}
