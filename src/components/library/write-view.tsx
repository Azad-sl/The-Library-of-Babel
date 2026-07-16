"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError, clearAdminToken, getAdminToken } from "@/lib/api";
import { useLibrary } from "@/store/library-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Feather,
  Eye,
  Save,
  Sparkles,
  Hexagon,
  Trash2,
  Loader2,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Post } from "@/lib/types";
import { generateCoverDataUrl } from "@/lib/cover-generator";

const HEXAGON_PRESETS = ["随笔", "读书笔记", "思辨", "札记", "书信", "未分类"];

export function WriteView({ slug }: { slug?: string }) {
  const { setView, goBack, canGoBack } = useLibrary();
  const [editing, setEditing] = useState<Post | null>(null);
  const [loading, setLoading] = useState(!!slug);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [hexagon, setHexagon] = useState("随笔");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [featured, setFeatured] = useState(false);
  const [readMinutes, setReadMinutes] = useState(5);
  const [coverImage, setCoverImage] = useState("");
  const [generatingCover, setGeneratingCover] = useState(false);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.substring(start, end);
    const before = content.substring(0, start);
    const after = content.substring(end);
    const newText = before + prefix + selected + suffix + after;
    setContent(newText);
    setTimeout(() => {
      el.focus();
      if (selected) {
        el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      } else {
        el.setSelectionRange(start + prefix.length, start + prefix.length);
      }
    }, 0);
  };

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .getPost(slug)
      .then((p) => {
        setEditing(p);
        setTitle(p.title);
        setHexagon(p.hexagon);
        setExcerpt(p.excerpt || "");
        setContent(p.content);
        setTags(p.tags || "");
        setFeatured(p.featured);
        setReadMinutes(p.readMinutes);
        setCoverImage(p.coverImage || "");
      })
      .catch(() => toast.error("载入失败"))
      .finally(() => setLoading(false));
  }, [slug]);

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "") || `post-${Date.now()}`;

  const save = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("标题与正文不可为空");
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      slug: editing?.slug || slugify(title),
      hexagon,
      excerpt: excerpt.trim() || content.slice(0, 80).replace(/[#>*`]/g, "").trim(),
      content: content.trim(),
      tags: tags.trim(),
      featured,
      readMinutes: readMinutes,
      coverImage: coverImage.trim() || null,
      authorName: "图书管理员",
    };
    try {
      if (editing) {
        await api.updatePost(editing.id, payload);
        toast.success("卷册已更新");
      } else {
        const created = await api.createPost(payload);
        toast.success("新卷册已入库");
        setEditing(created);
      }
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) {
        toast.error("会话已过期，请重新登录", {
          description: "即将跳转到馆长办公室",
        });
        clearAdminToken();
        setTimeout(() => setView({ name: "admin" }), 1200);
      } else {
        toast.error("保存失败：" + (e?.message || ""));
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    if (!confirm("确定要将这一卷移出图书馆？此操作不可撤销。")) return;
    try {
      await api.deletePost(editing.id);
      toast.success("已移出图书馆");
      setView({ name: "library" });
    } catch (e: any) {
      if (e instanceof ApiError && e.status === 401) {
        toast.error("会话已过期，请重新登录");
        clearAdminToken();
        setView({ name: "admin" });
      } else {
        toast.error("删除失败");
      }
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Skeleton className="mb-4 h-6 w-24" />
        <Skeleton className="mb-3 h-10 w-full" />
        <Skeleton className="mb-6 h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 rise-in">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => (canGoBack() ? goBack() : setView({ name: "library" }))}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-gold"
        >
          <ArrowLeft className="h-4 w-4" /> 返回
        </button>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-border/60 p-0.5">
            <button
              onClick={() => setMode("write")}
              className={cn(
                "rounded-full px-3 py-1 text-xs transition-colors",
                mode === "write"
                  ? "bg-gold/15 text-gold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Feather className="mr-1 inline h-3 w-3" /> 撰写
            </button>
            <button
              onClick={() => setMode("preview")}
              className={cn(
                "rounded-full px-3 py-1 text-xs transition-colors",
                mode === "preview"
                  ? "bg-gold/15 text-gold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="mr-1 inline h-3 w-3" /> 预览
            </button>
          </div>
          <Button
            onClick={save}
            disabled={saving}
            className="rounded-full bg-gold text-ink hover:bg-gold/90"
          >
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            {saving ? "保存中…" : editing ? "更新" : "入库"}
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="mb-6 text-center">
        <p className="mb-1 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-gold/70">
          <Feather className="h-3.5 w-3.5 quill-write" /> Compose a Volume
        </p>
        <h1 className="font-serif-display text-4xl font-semibold">
          {editing ? "修订这一卷" : "执笔写一卷"}
        </h1>
        <p className="mt-2 font-body-serif text-sm italic text-muted-foreground">
          它早已写好——你只是替它落笔。
        </p>
      </div>

      {/* Form */}
      <div className="space-y-5">
        {/* Title */}
        <div>
          <Label className="mb-1.5 block font-body-serif text-sm">标题</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="为这一卷起个名字……"
            className="font-serif-display text-lg"
          />
        </div>

        {/* Excerpt + hexagon + tags */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block font-body-serif text-sm">回廊（分类）</Label>
            <div className="flex flex-wrap gap-1.5">
              {HEXAGON_PRESETS.map((h) => (
                <button
                  key={h}
                  onClick={() => setHexagon(h)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                    hexagon === h
                      ? "border-gold bg-gold/15 text-gold"
                      : "border-border/60 text-muted-foreground hover:border-gold/40"
                  )}
                >
                  {h}
                </button>
              ))}
              <Input
                value={hexagon}
                onChange={(e) => setHexagon(e.target.value)}
                className="h-7 w-24 border-border/60 px-2 text-xs"
              />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block font-body-serif text-sm">
              索引词（逗号分隔）
            </Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="博尔赫斯, 迷宫, 时间"
              className="font-body-serif text-sm"
            />
          </div>
        </div>

        <div>
          <Label className="mb-1.5 block font-body-serif text-sm">提要（可选）</Label>
          <Textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="一句话摘要，留空则取正文开头……"
            className="min-h-[60px] font-body-serif text-sm italic"
            maxLength={200}
          />
        </div>

        {/* Cover image URL + AI generation + live preview */}
        <div>
          <Label className="mb-1.5 block font-body-serif text-sm">封面图</Label>
          <div className="flex gap-2">
            <Input
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="/covers/your-image.jpg 或 https://..."
              className="font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={generatingCover || !title.trim()}
              onClick={async () => {
                setGeneratingCover(true);
                try {
                  // 纯前端 Canvas 生成封面 —— 不依赖任何 AI 服务或密钥，
                  // Vercel 上零配置可用。基于标题哈希确定性生成独一无二的设计。
                  await new Promise((r) => setTimeout(r, 300)); // 给 UI 一点动画时间
                  const dataUrl = generateCoverDataUrl({
                    title: title.trim(),
                    excerpt: excerpt.trim(),
                    hexagon,
                  });
                  setCoverImage(dataUrl);
                  toast.success("封面已生成", {
                    description: "根据标题与分类生成专属文学封面",
                  });
                } catch (err: any) {
                  toast.error("封面生成失败", {
                    description: err?.message || "请稍后重试",
                  });
                } finally {
                  setGeneratingCover(false);
                }
              }}
              className="shrink-0 gap-1.5 rounded-full border-gold/30 text-gold hover:border-gold hover:bg-gold/10"
            >
              {generatingCover ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              <span className="font-body-serif text-xs">
                {generatingCover ? "生成中…" : "生成封面"}
              </span>
            </Button>
          </div>
          {coverImage.trim() && (
            <div className="mt-2 flex items-center gap-3">
              <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded border border-border/60">
                <img
                  src={coverImage}
                  alt="封面预览"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                封面预览。留空则使用书脊渐变占位。
              </p>
            </div>
          )}
          {!coverImage.trim() && (
            <p className="mt-1 text-xs text-muted-foreground">
              点击「生成封面」根据标题与分类自动生成专属文学封面，或手动输入图片 URL。
            </p>
          )}
        </div>

        {/* Content / preview */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <Label className="font-body-serif text-sm">正文（Markdown）</Label>
            <span className="text-xs text-muted-foreground">
              支持 # 标题、&gt; 引用、- 列表、**粗体**、*斜体*、--- 分隔
            </span>
          </div>
          {mode === "write" ? (
            <>
              <div className="mb-1.5 flex flex-wrap items-center gap-1 border-b border-border/40 pb-2">
                <button
                  type="button"
                  onClick={() => insertMarkdown("**", "**")}
                  className="font-body-serif rounded-md border border-border/60 px-2 py-1 text-xs transition-colors hover:border-gold/50 hover:text-gold"
                  title="粗体"
                >
                  <strong>B</strong>
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("*", "*")}
                  className="font-body-serif rounded-md border border-border/60 px-2 py-1 text-xs transition-colors hover:border-gold/50 hover:text-gold"
                  title="斜体"
                >
                  <em>I</em>
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("## ")}
                  className="font-body-serif rounded-md border border-border/60 px-2 py-1 text-xs transition-colors hover:border-gold/50 hover:text-gold"
                  title="二级标题"
                >
                  H2
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("### ")}
                  className="font-body-serif rounded-md border border-border/60 px-2 py-1 text-xs transition-colors hover:border-gold/50 hover:text-gold"
                  title="三级标题"
                >
                  H3
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("> ")}
                  className="font-body-serif rounded-md border border-border/60 px-2 py-1 text-xs transition-colors hover:border-gold/50 hover:text-gold"
                  title="引用"
                >
                  &gt;
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("\n---\n")}
                  className="font-body-serif rounded-md border border-border/60 px-2 py-1 text-xs transition-colors hover:border-gold/50 hover:text-gold"
                  title="分隔线"
                >
                  —
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("- ")}
                  className="font-body-serif rounded-md border border-border/60 px-2 py-1 text-xs transition-colors hover:border-gold/50 hover:text-gold"
                  title="列表"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown("[", "](url)")}
                  className="font-body-serif rounded-md border border-border/60 px-2 py-1 text-xs transition-colors hover:border-gold/50 hover:text-gold"
                  title="链接"
                >
                  Link
                </button>
              </div>
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"# 起一个标题\n\n在这里开始写下你的字……\n\n> 也许它会成为某人的灯塔。\n\n---\n\n继续。"}
                className="min-h-[480px] resize-y font-mono text-sm leading-relaxed"
              />
            </>
          ) : (
            <div className="min-h-[480px] rounded-md border border-border/60 bg-card/40 p-6">
              {content.trim() ? (
                <div className="prose-babel">
                  <ReactMarkdown>{content}</ReactMarkdown>
                </div>
              ) : (
                <p className="font-body-serif text-sm italic text-muted-foreground">
                  （尚未落笔。）
                </p>
              )}
            </div>
          )}
        </div>

        {/* Options */}
        <div className="flex flex-wrap items-center gap-6 rounded-lg border border-border/50 bg-card/30 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold/70" />
            <Label htmlFor="feat" className="cursor-pointer font-body-serif text-sm">
              馆长推荐
            </Label>
            <Switch id="feat" checked={featured} onCheckedChange={setFeatured} />
          </div>
          <div className="flex items-center gap-2">
            <Hexagon className="h-4 w-4 text-gold/70" />
            <Label className="font-body-serif text-sm">阅读时长（分）</Label>
            <Input
              type="number"
              min={1}
              max={60}
              value={readMinutes}
              onChange={(e) => setReadMinutes(Number(e.target.value) || 5)}
              className="h-8 w-16 text-sm"
            />
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            字数：{content.length} · 约 {Math.max(1, Math.round(content.length / 400))} 分钟
          </div>
        </div>

        {/* Delete (only when editing) */}
        {editing && (
          <div className="flex justify-end">
            <Button
              onClick={remove}
              variant="ghost"
              size="sm"
              className="text-destructive/70 hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> 移出图书馆
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
