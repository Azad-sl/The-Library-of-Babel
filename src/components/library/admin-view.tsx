"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { api, setAdminToken, clearAdminToken, getAdminToken, ApiError } from "@/lib/api";
import { useLibrary } from "@/store/library-store";
import { invalidateVolumeListCache } from "./volume-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { PostSummary, LibraryStats } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Feather,
  Library,
  Search,
  Eye,
  Heart,
  Sparkles,
  Trash2,
  Edit3,
  ExternalLink,
  Filter,
  ArrowUpDown,
  Loader2,
  KeyRound,
  Hexagon,
  TrendingUp,
  FileText,
  Clock,
  MoreHorizontal,
  CheckCircle2,
  Circle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */
type SortKey = "createdAt" | "title" | "views" | "likes" | "readMinutes";
type SortDir = "asc" | "desc";

const SORT_LABELS: Record<SortKey, string> = {
  createdAt: "入库时间",
  title: "标题",
  views: "浏览",
  likes: "收藏",
  readMinutes: "篇幅",
};

/* ------------------------------------------------------------------ */
/*  Admin auth gate — talks to /api/auth for real backend validation   */
/*  The password lives in the ADMIN_PASSWORD env var, never in client  */
/*  code. A signed HMAC token is stored in localStorage after login.   */
/* ------------------------------------------------------------------ */
function useAdminGate() {
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // On mount: if a token exists in localStorage, verify it with the backend.
  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setChecked(true);
      return;
    }
    api
      .verifyToken()
      .then((r) => setUnlocked(r.valid))
      .catch(() => setUnlocked(false))
      .finally(() => setChecked(true));
  }, []);

  const submit = useCallback(async () => {
    if (!input.trim()) {
      toast.error("请输入口令");
      return;
    }
    setVerifying(true);
    setError(false);
    try {
      const { token } = await api.login(input.trim());
      setAdminToken(token);
      setUnlocked(true);
      toast.success("欢迎回到馆长办公室");
      setInput("");
    } catch (e: any) {
      setError(true);
      if (e instanceof ApiError && e.status === 401) {
        toast.error("口令不对");
      } else {
        toast.error("登录失败：" + (e?.message || ""));
      }
    } finally {
      setVerifying(false);
    }
  }, [input]);

  const lock = useCallback(() => {
    clearAdminToken();
    setUnlocked(false);
    toast.info("已锁上办公室的门");
  }, []);

  return { unlocked, checked, input, setInput, submit, error, lock, verifying };
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Eye;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 transition-colors",
        accent
          ? "border-gold/40 bg-gold/[0.06]"
          : "border-border/60 bg-card/40"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-body-serif text-xs uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 font-serif-display text-2xl font-semibold text-foreground">
            {value}
          </p>
          {sub && (
            <p className="mt-0.5 text-[0.7rem] text-muted-foreground">{sub}</p>
          )}
        </div>
        <Icon
          className={cn(
            "h-5 w-5",
            accent ? "text-gold" : "text-muted-foreground"
          )}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row in the management table                                        */
/* ------------------------------------------------------------------ */
function PostRow({
  post,
  onEdit,
  onView,
  onToggleFeatured,
  onDelete,
}: {
  post: PostSummary;
  onEdit: () => void;
  onView: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
}) {
  const created = useMemo(() => {
    try {
      return new Date(post.createdAt);
    } catch {
      return null;
    }
  }, [post.createdAt]);

  return (
    <tr className="group border-b border-border/40 transition-colors hover:bg-gold/[0.04]">
      <td className="px-3 py-3">
        <button
          onClick={onToggleFeatured}
          title={post.featured ? "取消馆长推荐" : "设为馆长推荐"}
          className="transition-transform hover:scale-110"
        >
          {post.featured ? (
            <Sparkles className="h-4 w-4 text-gold" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground/40" />
          )}
        </button>
      </td>
      <td className="px-3 py-3">
        <button
          onClick={onView}
          className="block max-w-[280px] truncate text-left font-serif-display text-sm font-medium text-foreground transition-colors hover:text-gold sm:max-w-[360px]"
          title={post.title}
        >
          {post.title}
        </button>
        {post.tags && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {post.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
              .slice(0, 3)
              .map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-muted/40 px-1.5 py-0 text-[0.6rem] text-muted-foreground"
                >
                  {t}
                </span>
              ))}
          </div>
        )}
      </td>
      <td className="hidden px-3 py-3 md:table-cell">
        <span className="inline-flex items-center gap-1 rounded-full border border-border/50 px-2 py-0.5 text-xs text-foreground/70">
          <Hexagon className="h-3 w-3 text-gold/60" />
          {post.hexagon}
        </span>
      </td>
      <td className="hidden px-3 py-3 text-right sm:table-cell">
        <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
          <Eye className="h-3 w-3" />
          {post.views}
        </span>
      </td>
      <td className="hidden px-3 py-3 text-right sm:table-cell">
        <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
          <Heart className="h-3 w-3" />
          {post.likes}
        </span>
      </td>
      <td className="hidden px-3 py-3 text-right lg:table-cell">
        <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {post.readMinutes}′
        </span>
      </td>
      <td className="hidden px-3 py-3 text-right lg:table-cell">
        <span className="font-body-serif text-xs text-muted-foreground">
          {created ? format(created, "MM-dd", { locale: zhCN }) : "—"}
        </span>
      </td>
      <td className="px-3 py-3 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-gold"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel className="font-body-serif text-xs text-muted-foreground">
              卷册操作
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onEdit}
              className="cursor-pointer font-body-serif text-sm"
            >
              <Edit3 className="mr-2 h-3.5 w-3.5" /> 修订
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onView}
              className="cursor-pointer font-body-serif text-sm"
            >
              <ExternalLink className="mr-2 h-3.5 w-3.5" /> 翻阅
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onToggleFeatured}
              className="cursor-pointer font-body-serif text-sm"
            >
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              {post.featured ? "取消推荐" : "设为推荐"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="cursor-pointer font-body-serif text-sm text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> 移出图书馆
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/*  Login gate                                                         */
/* ------------------------------------------------------------------ */
function AdminGate({
  input,
  setInput,
  submit,
  error,
  verifying,
}: {
  input: string;
  setInput: (v: string) => void;
  submit: () => void;
  error: boolean;
  verifying: boolean;
}) {
  const { setView } = useLibrary();
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-4 rise-in">
      <div className="w-full rounded-2xl border border-gold/30 bg-card/60 p-8 text-center backdrop-blur-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
          <KeyRound className="h-6 w-6 text-gold" />
        </div>
        <p className="mb-1 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-gold/70">
          <KeyRound className="h-3 w-3" /> Curator&apos;s Office
        </p>
        <h1 className="font-serif-display text-3xl font-semibold">馆长办公室</h1>
        <p className="mt-2 font-body-serif text-sm italic text-muted-foreground">
          非馆长授权不得入内。请输入开门口令。
        </p>
        <div className="mt-6 space-y-3">
          <Input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !verifying) submit();
            }}
            placeholder="口令……"
            disabled={verifying}
            className={cn(
              "text-center font-body-serif",
              error && "border-destructive/60 focus-visible:ring-destructive/30"
            )}
            autoFocus
          />
          <Button
            onClick={submit}
            disabled={verifying}
            className="w-full rounded-full bg-gold text-ink hover:bg-gold/90"
          >
            {verifying ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> 验证中…
              </>
            ) : (
              "开门"
            )}
          </Button>
        </div>
        <p className="mt-4 font-body-serif text-[0.7rem] leading-relaxed text-muted-foreground">
          联系馆长获取开门口令。
          <br />
          办公室邮箱：<code className="rounded bg-muted/50 px-1 text-gold">liushulin@azad.asia</code>
        </p>
        <button
          onClick={() => setView({ name: "home" })}
          className="mt-6 flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-gold"
        >
          <ArrowLeft className="h-3 w-3" /> 返回图书馆
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main admin view                                                    */
/* ------------------------------------------------------------------ */
export function AdminView() {
  const { setView, goBack, canGoBack } = useLibrary();
  const gate = useAdminGate();

  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [hexagonFilter, setHexagonFilter] = useState<string>("");
  const [hexagons, setHexagons] = useState<{ name: string; count: number }[]>(
    []
  );
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PostSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, s, h] = await Promise.all([
        api.listPosts({ limit: 500 }),
        api.stats(),
        api.listHexagons(),
      ]);
      setPosts(p);
      setStats(s);
      setHexagons(h);
    } catch (e: any) {
      toast.error("载入失败：" + (e?.message || ""));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (gate.unlocked) load();
  }, [gate.unlocked, load]);

  /* ---- Filtering + sorting ---- */
  const filtered = useMemo(() => {
    let out = [...posts];
    if (hexagonFilter) out = out.filter((p) => p.hexagon === hexagonFilter);
    if (featuredOnly) out = out.filter((p) => p.featured);
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.excerpt || "").toLowerCase().includes(q) ||
          (p.tags || "").toLowerCase().includes(q)
      );
    }
    out.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "createdAt":
          cmp =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "title":
          cmp = a.title.localeCompare(b.title, "zh");
          break;
        case "views":
          cmp = a.views - b.views;
          break;
        case "likes":
          cmp = a.likes - b.likes;
          break;
        case "readMinutes":
          cmp = a.readMinutes - b.readMinutes;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [posts, hexagonFilter, featuredOnly, query, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const handleToggleFeatured = async (post: PostSummary) => {
    setTogglingId(post.id);
    try {
      await api.updatePost(post.id, { featured: !post.featured });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, featured: !p.featured } : p
        )
      );
      toast.success(
        post.featured ? "已撤下馆长推荐" : "已设为馆长推荐",
        { description: post.title }
      );
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) {
        toast.error("会话已过期，请重新登录");
        gate.lock();
      } else {
        toast.error("操作失败：" + (e?.message || ""));
      }
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deletePost(deleteTarget.id);
      invalidateVolumeListCache();
      setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast.success("已移出图书馆", { description: deleteTarget.title });
      setDeleteTarget(null);
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) {
        toast.error("会话已过期，请重新登录");
        setDeleteTarget(null);
        gate.lock();
      } else {
        toast.error("删除失败：" + (e?.message || ""));
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  /* ---- Loading state ---- */
  if (!gate.checked) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!gate.unlocked) {
    return (
      <AdminGate
        input={gate.input}
        setInput={gate.setInput}
        submit={gate.submit}
        error={gate.error}
        verifying={gate.verifying}
      />
    );
  }

  /* ---- Main panel ---- */
  const featuredCount = posts.filter((p) => p.featured).length;
  const totalViews = posts.reduce((s, p) => s + p.views, 0);
  const totalLikes = posts.reduce((s, p) => s + p.likes, 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 rise-in">
      {/* Top bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => (canGoBack() ? goBack() : setView({ name: "home" }))}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" /> 返回
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-full border-border/60 text-foreground/70 hover:border-gold/40 hover:text-gold"
          >
            {refreshing ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            刷新
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={gate.lock}
            className="rounded-full text-muted-foreground hover:text-foreground"
          >
            <KeyRound className="mr-1.5 h-3.5 w-3.5" /> 锁门
          </Button>
          <Button
            onClick={() => setView({ name: "write" })}
            className="rounded-full bg-gold text-ink hover:bg-gold/90"
          >
            <Feather className="mr-1.5 h-4 w-4" /> 新卷
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="mb-6">
        <p className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-gold/70">
          <KeyRound className="h-3.5 w-3.5" /> Curator&apos;s Office
        </p>
        <h1 className="font-serif-display text-4xl font-semibold sm:text-5xl">
          馆长办公室
        </h1>
        <p className="mt-2 max-w-2xl font-body-serif text-base italic text-muted-foreground">
          管理图书馆的全部卷册——修订、推荐、移出，皆在此处。
        </p>
      </div>

      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={Library}
          label="卷册总数"
          value={posts.length}
          sub={`${hexagons.length} 条回廊`}
          accent
        />
        <StatCard
          icon={Sparkles}
          label="馆长推荐"
          value={featuredCount}
          sub={`${posts.length ? Math.round((featuredCount / posts.length) * 100) : 0}%`}
        />
        <StatCard icon={Eye} label="总浏览" value={totalViews} />
        <StatCard icon={Heart} label="总收藏" value={totalLikes} />
        <StatCard
          icon={TrendingUp}
          label="平均篇幅"
          value={
            posts.length
              ? Math.round(
                  posts.reduce((s, p) => s + p.readMinutes, 0) / posts.length
                ) + "′"
              : "—"
          }
        />
        <StatCard
          icon={FileText}
          label="回廊数"
          value={hexagons.length}
          sub={stats?.oldestDate ? `自 ${format(new Date(stats.oldestDate), "yyyy-MM")}` : ""}
        />
      </div>

      {/* Toolbar */}
      <div className="mb-4 space-y-3 rounded-xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="检索标题 / 提要 / 索引词……"
              className="rounded-full border-gold/20 bg-background/60 pl-10 font-body-serif"
            />
          </div>
          <Button
            variant={featuredOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFeaturedOnly((v) => !v)}
            className={cn(
              "rounded-full",
              featuredOnly
                ? "bg-gold text-ink hover:bg-gold/90"
                : "border-gold/30 text-foreground/70 hover:border-gold hover:text-gold"
            )}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {featuredOnly ? "仅看推荐" : "全部"}
          </Button>
        </div>

        {/* Hexagon filter + sort */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5 text-gold/70" /> 回廊：
          </span>
          <button
            onClick={() => setHexagonFilter("")}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
              !hexagonFilter
                ? "border-gold bg-gold/15 text-gold"
                : "border-border text-muted-foreground hover:border-gold/40 hover:text-foreground"
            )}
          >
            全部
          </button>
          {hexagons.map((h) => (
            <button
              key={h.name}
              onClick={() =>
                setHexagonFilter(hexagonFilter === h.name ? "" : h.name)
              }
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                hexagonFilter === h.name
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-border text-muted-foreground hover:border-gold/40 hover:text-foreground"
              )}
            >
              {h.name} · {h.count}
            </button>
          ))}
        </div>

        {/* Sort indicators */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowUpDown className="h-3.5 w-3.5 text-gold/70" /> 排序：
          </span>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => toggleSort(k)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                sortKey === k
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-border text-muted-foreground hover:border-gold/40 hover:text-foreground"
              )}
            >
              {SORT_LABELS[k]}
              {sortKey === k && (
                <span className="ml-1 text-[0.6rem]">
                  {sortDir === "asc" ? "↑" : "↓"}
                </span>
              )}
            </button>
          ))}
        </div>

        {filtered.length !== posts.length && (
          <p className="text-xs text-muted-foreground">
            显示 <span className="text-gold">{filtered.length}</span> /{" "}
            {posts.length} 卷
          </p>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 p-12 text-center">
          <p className="font-serif-display text-xl text-muted-foreground">
            {posts.length === 0
              ? "图书馆里还没有任何卷册。"
              : "没有匹配的卷册。"}
          </p>
          <p className="mt-2 font-body-serif text-sm text-muted-foreground">
            {posts.length === 0
              ? "点击右上角「新卷」开始写第一篇。"
              : "试试清除筛选条件。"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card/30">
          <div className="max-h-[60vh] overflow-y-auto custom-scroll">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
                <tr className="border-b border-border/60 text-left">
                  <th className="w-10 px-3 py-2.5">
                    <span className="sr-only">推荐</span>
                  </th>
                  <th className="px-3 py-2.5">
                    <button
                      onClick={() => toggleSort("title")}
                      className="flex items-center gap-1 font-body-serif text-[0.7rem] uppercase tracking-widest text-muted-foreground transition-colors hover:text-gold"
                    >
                      标题
                      {sortKey === "title" && (
                        <span className="text-gold">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="hidden px-3 py-2.5 md:table-cell">
                    <span className="font-body-serif text-[0.7rem] uppercase tracking-widest text-muted-foreground">
                      回廊
                    </span>
                  </th>
                  <th className="hidden px-3 py-2.5 text-right sm:table-cell">
                    <button
                      onClick={() => toggleSort("views")}
                      className="flex items-center gap-1 font-body-serif text-[0.7rem] uppercase tracking-widest text-muted-foreground transition-colors hover:text-gold"
                    >
                      浏览
                      {sortKey === "views" && (
                        <span className="text-gold">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="hidden px-3 py-2.5 text-right sm:table-cell">
                    <button
                      onClick={() => toggleSort("likes")}
                      className="flex items-center gap-1 font-body-serif text-[0.7rem] uppercase tracking-widest text-muted-foreground transition-colors hover:text-gold"
                    >
                      收藏
                      {sortKey === "likes" && (
                        <span className="text-gold">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="hidden px-3 py-2.5 text-right lg:table-cell">
                    <button
                      onClick={() => toggleSort("readMinutes")}
                      className="flex items-center gap-1 font-body-serif text-[0.7rem] uppercase tracking-widest text-muted-foreground transition-colors hover:text-gold"
                    >
                      篇幅
                      {sortKey === "readMinutes" && (
                        <span className="text-gold">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="hidden px-3 py-2.5 text-right lg:table-cell">
                    <button
                      onClick={() => toggleSort("createdAt")}
                      className="flex items-center gap-1 font-body-serif text-[0.7rem] uppercase tracking-widest text-muted-foreground transition-colors hover:text-gold"
                    >
                      入库
                      {sortKey === "createdAt" && (
                        <span className="text-gold">
                          {sortDir === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="w-12 px-3 py-2.5">
                    <span className="sr-only">操作</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    onEdit={() =>
                      setView({ name: "write", slug: post.slug })
                    }
                    onView={() => setView({ name: "volume", slug: post.slug })}
                    onToggleFeatured={() => handleToggleFeatured(post)}
                    onDelete={() => setDeleteTarget(post)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer hint */}
      <p className="mt-4 flex items-center gap-1.5 font-body-serif text-xs italic text-muted-foreground">
        <AlertTriangle className="h-3 w-3" />
        所有操作即刻生效。删除不可撤销。
        {togglingId && (
          <span className="ml-2 inline-flex items-center gap-1 text-gold">
            <Loader2 className="h-3 w-3 animate-spin" /> 处理中…
          </span>
        )}
      </p>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif-display">
              确定要将这一卷移出图书馆？
            </AlertDialogTitle>
            <AlertDialogDescription className="font-body-serif">
              「{deleteTarget?.title}」将被永久删除，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">
              留下
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  删除中…
                </>
              ) : (
                <>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  移出
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
