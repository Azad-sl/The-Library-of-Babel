"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { useLibrary } from "@/store/library-store";
import { HexLogo } from "./hex-logo";
import type { View, HexagonStat, PostSummary } from "@/lib/types";
import {
  Home,
  Library,
  Hexagon,
  Search,
  BookMarked,
  Feather,
  ArrowRight,
  BookOpen,
  Sun,
  Shuffle,
  ArrowUp,
  Highlighter,
  Keyboard,
  KeyRound,
} from "lucide-react";
import { useTheme } from "next-themes";
import { emitShortcutsHelpOpen } from "@/lib/shortcuts-event";

/* ------------------------------------------------------------------ */
/*  Navigation items — mirrors header NAV                             */
/* ------------------------------------------------------------------ */
const NAV_ITEMS: {
  label: string;
  sub: string;
  view: View;
  icon: typeof Home;
  shortcut?: string;
}[] = [
  { label: "首页", sub: "Home", view: { name: "home" }, icon: Home, shortcut: "⌘1" },
  { label: "书库", sub: "Library", view: { name: "library" }, icon: Library, shortcut: "⌘2" },
  {
    label: "回廊",
    sub: "Hexagons",
    view: { name: "hexagons" },
    icon: Hexagon,
    shortcut: "⌘3",
  },
  {
    label: "检索",
    sub: "Search",
    view: { name: "search", query: "" },
    icon: Search,
    shortcut: "⌘4",
  },
  {
    label: "关于",
    sub: "About",
    view: { name: "about" },
    icon: BookMarked,
    shortcut: "⌘5",
  },
  {
    label: "批注索引",
    sub: "MARGINALIA",
    view: { name: "marginalia" },
    icon: Highlighter,
    shortcut: "⌘6",
  },
  {
    label: "执笔",
    sub: "Write",
    view: { name: "write" },
    icon: Feather,
    shortcut: "⌘7",
  },
  {
    label: "馆长办公室",
    sub: "Admin",
    view: { name: "admin" },
    icon: KeyRound,
    shortcut: "⌘8",
  },
];

/* ------------------------------------------------------------------ */
/*  Theme cycle constants                                              */
/* ------------------------------------------------------------------ */
const THEME_CYCLE = ["dark", "candlelight", "light"] as const;

/* ------------------------------------------------------------------ */
/*  Command Palette                                                    */
/* ------------------------------------------------------------------ */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hexagons, setHexagons] = useState<HexagonStat[]>([]);
  const [searchResults, setSearchResults] = useState<PostSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [allPosts, setAllPosts] = useState<PostSummary[]>([]);
  const { setView } = useLibrary();
  const { resolvedTheme, setTheme } = useTheme();

  // Ref to track if hexagons have been fetched (cache across opens)
  const hexagonsFetched = useRef(false);
  const postsFetched = useRef(false);

  /* ---- Fetch hexagons on first mount (cached) ---- */
  useEffect(() => {
    if (hexagonsFetched.current) return;
    hexagonsFetched.current = true;
    fetch("/api/hexagons")
      .then((r) => r.json())
      .then((data: HexagonStat[]) => setHexagons(data))
      .catch(() => {});
  }, []);

  /* ---- Fetch all posts on first mount (for random volume) ---- */
  useEffect(() => {
    if (postsFetched.current) return;
    postsFetched.current = true;
    fetch("/api/posts?limit=200")
      .then((r) => r.json())
      .then((data: PostSummary[]) => setAllPosts(data))
      .catch(() => {});
  }, []);

  /* ---- Global keyboard shortcut: Cmd+K / Ctrl+K ---- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* ---- Debounced search ---- */
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleValueChange = useCallback((value: string) => {
    setQuery(value);

    // Clear previous timer
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (value.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceTimer.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(value.trim())}`)
        .then((r) => r.json())
        .then((data: PostSummary[]) => {
          setSearchResults(data);
          setSearching(false);
        })
        .catch(() => setSearching(false));
    }, 300);
  }, []);

  /* ---- Cleanup debounce on unmount ---- */
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  /* ---- Navigate & close ---- */
  const navigate = useCallback(
    (view: View) => {
      setView(view);
      setOpen(false);
      setQuery("");
      setSearchResults([]);
    },
    [setView]
  );

  /* ---- Reset query when dialog closes ---- */
  useEffect(() => {
    if (!open) {
      setQuery("");
      setSearchResults([]);
    }
  }, [open]);

  /* ---- Cycle theme ---- */
  const cycleTheme = useCallback(() => {
    const currentTheme = resolvedTheme ?? "dark";
    const currentIndex = THEME_CYCLE.indexOf(
      currentTheme as (typeof THEME_CYCLE)[number]
    );
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
    setTheme(THEME_CYCLE[nextIndex]);
    setOpen(false);
    setQuery("");
    setSearchResults([]);
  }, [resolvedTheme, setTheme]);

  /* ---- Navigate to random volume ---- */
  const goRandomVolume = useCallback(() => {
    if (allPosts.length === 0) return;
    const randomPost = allPosts[Math.floor(Math.random() * allPosts.length)];
    navigate({ name: "volume", slug: randomPost.slug });
  }, [allPosts, navigate]);

  /* ---- Scroll to top ---- */
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setOpen(false);
    setQuery("");
    setSearchResults([]);
  }, []);

  const showVolumes = query.trim().length >= 2;

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="巴别图书馆 · 命令面板"
      description="搜索回廊、卷册或命令……"
      showCloseButton={false}
      className="sm:max-w-xl border-gold/30 bg-background shadow-[0_0_60px_-12px_var(--gold)]"
    >
      {/* ---- Custom header ---- */}
      <div className="flex items-center gap-3 border-b border-gold/15 px-4 py-3">
        <HexLogo size={28} glow />
        <div className="flex flex-col leading-none">
          <span className="font-serif-display text-base font-semibold tracking-wide text-foreground">
            巴别图书馆
          </span>
          <span className="font-body-serif text-[0.6rem] uppercase tracking-[0.25em] text-gold/70">
            Command Palette
          </span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[0.6rem] text-muted-foreground font-body-serif">
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[0.55rem]">
            ↑↓
          </kbd>
          <span>导航</span>
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[0.55rem]">
            ↵
          </kbd>
          <span>选择</span>
          <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[0.55rem]">
            esc
          </kbd>
          <span>关闭</span>
        </div>
      </div>

      {/* ---- Search input ---- */}
      <CommandInput
        placeholder="搜索回廊、卷册或命令……"
        value={query}
        onValueChange={handleValueChange}
        className="font-body-serif"
      />

      {/* ---- Results list ---- */}
      <CommandList className="max-h-[360px]">
        {/* Empty state — only when searching volumes and no results */}
        {showVolumes && !searching && searchResults.length === 0 && (
          <CommandEmpty className="font-body-serif py-6 text-center text-sm text-muted-foreground">
            未找到相关卷册
          </CommandEmpty>
        )}
        {showVolumes && searching && (
          <CommandEmpty className="font-body-serif py-6 text-center text-sm text-muted-foreground">
            检索中……
          </CommandEmpty>
        )}

        {/* ---- Group: Navigate ---- */}
        {!showVolumes && (
          <CommandGroup
            heading={
              <span className="font-serif-display text-xs tracking-widest text-gold/80">
                导航 · Navigate
              </span>
            }
          >
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.label}
                  value={`${item.label} ${item.sub}`}
                  onSelect={() => navigate(item.view)}
                  className="group flex items-center gap-3 rounded-md px-3 py-2.5 font-body-serif text-sm text-foreground/90 data-[selected=true]:bg-gold/15 data-[selected=true]:text-gold cursor-pointer"
                >
                  <Icon className="h-4 w-4 text-gold/60 group-data-[selected=true]:text-gold transition-colors" />
                  <span>{item.label}</span>
                  <span className="ml-1 text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                    {item.sub}
                  </span>
                  {item.shortcut && (
                    <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 text-[0.55rem] text-muted-foreground">
                      {item.shortcut}
                    </kbd>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* ---- Group: Commands ---- */}
        {!showVolumes && (
          <>
            <CommandSeparator className="bg-gold/10" />
            <CommandGroup
              heading={
                <span className="font-serif-display text-xs tracking-widest text-gold/80">
                  命令 · Commands
                </span>
              }
            >
              {/* Toggle Theme */}
              <CommandItem
                value="切换主题 toggle theme"
                onSelect={cycleTheme}
                className="group flex items-center gap-3 rounded-md px-3 py-2.5 font-body-serif text-sm text-foreground/90 data-[selected=true]:bg-gold/15 data-[selected=true]:text-gold cursor-pointer"
              >
                <Sun className="h-4 w-4 text-gold/60 group-data-[selected=true]:text-gold transition-colors" />
                <span>切换主题</span>
                <span className="ml-1 text-[0.65rem] text-muted-foreground">
                  {resolvedTheme === "dark"
                    ? "墨水 → 烛火"
                    : resolvedTheme === "candlelight"
                      ? "烛火 → 羊皮纸"
                      : "羊皮纸 → 墨水"}
                </span>
                <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 text-[0.55rem] text-muted-foreground">
                  ⌘T
                </kbd>
              </CommandItem>

              {/* Random Volume */}
              <CommandItem
                value="随机卷册 random volume"
                onSelect={goRandomVolume}
                className="group flex items-center gap-3 rounded-md px-3 py-2.5 font-body-serif text-sm text-foreground/90 data-[selected=true]:bg-gold/15 data-[selected=true]:text-gold cursor-pointer"
              >
                <Shuffle className="h-4 w-4 text-gold/60 group-data-[selected=true]:text-gold transition-colors" />
                <span>随机卷册</span>
                <span className="ml-1 text-[0.65rem] text-muted-foreground">
                  从书架上随手抽一卷
                </span>
                <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 text-[0.55rem] text-muted-foreground">
                  ⌘R
                </kbd>
              </CommandItem>

              {/* Back to Top */}
              <CommandItem
                value="回到顶部 back to top scroll"
                onSelect={scrollToTop}
                className="group flex items-center gap-3 rounded-md px-3 py-2.5 font-body-serif text-sm text-foreground/90 data-[selected=true]:bg-gold/15 data-[selected=true]:text-gold cursor-pointer"
              >
                <ArrowUp className="h-4 w-4 text-gold/60 group-data-[selected=true]:text-gold transition-colors" />
                <span>回到顶部</span>
                <span className="ml-1 text-[0.65rem] text-muted-foreground">
                  滚动至页面顶端
                </span>
              </CommandItem>

              {/* Shortcuts Help */}
              <CommandItem
                value="快捷键索引 shortcuts help keyboard keys ?"
                onSelect={() => {
                  emitShortcutsHelpOpen();
                  setOpen(false);
                  setQuery("");
                  setSearchResults([]);
                }}
                className="group flex items-center gap-3 rounded-md px-3 py-2.5 font-body-serif text-sm text-foreground/90 data-[selected=true]:bg-gold/15 data-[selected=true]:text-gold cursor-pointer"
              >
                <Keyboard className="h-4 w-4 text-gold/60 group-data-[selected=true]:text-gold transition-colors" />
                <span>快捷键索引</span>
                <span className="ml-1 text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                  SHORTCUTS
                </span>
                <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 text-[0.55rem] text-muted-foreground">
                  ?
                </kbd>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {/* ---- Group: Hexagons / Galleries ---- */}
        {!showVolumes && hexagons.length > 0 && (
          <>
            <CommandSeparator className="bg-gold/10" />
            <CommandGroup
              heading={
                <span className="font-serif-display text-xs tracking-widest text-gold/80">
                  回廊 · Galleries
                </span>
              }
            >
              {hexagons.map((hex) => (
                <CommandItem
                  key={hex.name}
                  value={hex.name}
                  onSelect={() => navigate({ name: "hexagon", hexagon: hex.name })}
                  className="group flex items-center gap-3 rounded-md px-3 py-2.5 font-body-serif text-sm text-foreground/90 data-[selected=true]:bg-gold/15 data-[selected=true]:text-gold cursor-pointer"
                >
                  <Hexagon className="h-4 w-4 text-gold/60 group-data-[selected=true]:text-gold transition-colors" />
                  <span>{hex.name}</span>
                  <span className="ml-auto text-[0.65rem] text-muted-foreground">
                    {hex.count} 卷
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* ---- Group: Search results / Volumes ---- */}
        {showVolumes && searchResults.length > 0 && (
          <>
            <CommandGroup
              heading={
                <span className="font-serif-display text-xs tracking-widest text-gold/80">
                  卷册 · Volumes
                </span>
              }
            >
              {searchResults.map((post) => (
                <CommandItem
                  key={post.id}
                  value={`${post.title} ${post.hexagon} ${post.authorName}`}
                  onSelect={() => navigate({ name: "volume", slug: post.slug })}
                  className="group flex items-center gap-3 rounded-md px-3 py-2.5 font-body-serif text-sm text-foreground/90 data-[selected=true]:bg-gold/15 data-[selected=true]:text-gold cursor-pointer"
                >
                  <BookOpen className="h-4 w-4 shrink-0 text-gold/60 group-data-[selected=true]:text-gold transition-colors" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{post.title}</span>
                    <span className="text-[0.6rem] text-muted-foreground truncate">
                      {post.hexagon} · {post.authorName}
                      {post.readMinutes > 0 && ` · ${post.readMinutes} 分钟`}
                    </span>
                  </div>
                  <ArrowRight className="ml-auto h-3 w-3 shrink-0 text-gold/0 group-data-[selected=true]:text-gold transition-colors" />
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* ---- Footer hint ---- */}
        <div className="border-t border-gold/10 px-4 py-2 text-center">
          <span className="font-body-serif text-[0.6rem] tracking-wider text-muted-foreground/60">
            按 <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[0.5rem]">⌘K</kbd> 随时唤出 ·{" "}
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[0.5rem]">↑↓</kbd> 导航 ·{" "}
            <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[0.5rem]">↵</kbd> 选择
          </span>
        </div>
      </CommandList>
    </CommandDialog>
  );
}
