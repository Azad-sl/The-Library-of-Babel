"use client";

import { useState, useEffect } from "react";
import { useLibrary } from "@/store/library-store";
import { Button } from "@/components/ui/button";
import { HexRing, HexLogo } from "./hex-logo";
import { LibraryLedger } from "./library-charts";
import { ReadingHeatmap } from "./reading-heatmap";
import { ReadingTimeRing } from "./reading-time-ring";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/lib/api";
import { getContinueReading, getFinishedReading, type SavedProgress } from "@/hooks/use-reading-memory";
import { Feather, Hexagon, BookOpen, Sparkles, Mail, Github, Library, Clock, Check, ArrowRight, BookCheck, Highlighter } from "lucide-react";

export function AboutView() {
  const { setView } = useLibrary();
  const stats = useAsync(() => api.stats(), []);
  const hexagons = useAsync(() => api.listHexagons(), []);

  // Reading footprints — client-side only from localStorage
  const [readingHistory, setReadingHistory] = useState<SavedProgress[]>([]);
  useEffect(() => {
    const inProgress = getContinueReading();
    const finished = getFinishedReading();
    const all: SavedProgress[] = [];
    if (inProgress) all.push(inProgress);
    all.push(...finished);
    all.sort((a, b) => b.savedAt - a.savedAt);
    setReadingHistory(all);
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 rise-in">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">
          <HexLogo size={72} glow className="candle-glow" />
        </div>
        <p className="mb-1 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-gold/70">
          <Feather className="h-3.5 w-3.5" /> A Note from the Librarian
        </p>
        <h1 className="font-serif-display text-5xl font-semibold ink-reveal">关于</h1>
        <p className="mt-2 font-body-serif text-lg italic text-muted-foreground">
          致每一位推开这扇门的读者
        </p>
      </div>

      {/* Letter body */}
      <article className="prose-babel">
        <p className="drop-cap">
          你好，陌生人。欢迎来到这座由六边形回廊构成的小小图书馆。
          它不收百科全书，也不藏孤本秘籍——这里只有一些随笔、读书笔记，
          和一些在夜里写下、未必有人会读的字。
        </p>

        <h2>为什么叫"巴别"</h2>
        <p>
          博尔赫斯在《巴别图书馆》里写：宇宙是一座无限的图书馆，
          由六边形回廊组成，每一个回廊有四面墙，每面墙五个书架，
          每个书架三十二卷，每卷四百一十页，每页四十行，每行八十个字符。
          字符集只有二十五个符号——却足以穷尽一切可能的书。
        </p>
        <blockquote>
          那座图书馆里有一切：你将来的生平、你的墓志铭、
          一千个并不存在的你、以及这本书本身。
        </blockquote>
        <p>
          我借这个名字，是因为我相信写作本就是一种"在无限可能性中拾取"。
          每一篇文字都早已存在于可能性的海洋里，
          写作者只是替读者把它从噪声里捞出来，印在纸上。
        </p>

        <h2>这里有什么</h2>
        <ul>
          <li>
            <strong>随笔</strong>——一些散漫的、关于生活与思辨的字。
          </li>
          <li>
            <strong>读书笔记</strong>——读过的书留下的痕迹，与那些书本身一样重要。
          </li>
          <li>
            <strong>思辨</strong>——偶尔想得太多，便写下来安放它们。
          </li>
          <li>
            <strong>札记与书信</strong>——给某个具体的人，或某个想象中的你。
          </li>
          <li>
            <strong>抄录</strong>——从别人的书页里，摘下那一行照亮自己的句子。
          </li>
        </ul>

        <div className="gold-divider" aria-hidden="true">❖</div>
        <h2>关于"确定性"</h2>
        <p>
          这座图书馆没有终点，也不打算有。
          我会继续往书架上放卷册——也许你也会，
          在"执笔"那一栏里，留下你自己的字。
        </p>

        <hr />

        <p>
          每一篇文字都早已存在于可能性的海洋里，
          写作者只是替读者把它从噪声里捞出来，印在纸上。
        </p>
        <p className="text-right italic">—— 图书管理员 · 于烛火下</p>
      </article>

      {/* Stats card */}
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<BookOpen className="h-4 w-4" />} label="卷册" value={stats.data?.totalVolumes} />
        <Stat icon={<Hexagon className="h-4 w-4" />} label="回廊" value={stats.data?.totalHexagons} />
        <Stat icon={<Library className="h-4 w-4" />} label="翻阅" value={stats.data?.totalViews} />
        <Stat icon={<Sparkles className="h-4 w-4" />} label="收藏" value={stats.data?.totalLikes} />
      </div>

      {/* 阅读足迹 — Reading Footprints */}
      <div className="mt-8 rounded-xl border border-border/50 bg-card/30 p-6">
        <p className="mb-4 flex items-center gap-2 font-serif-display text-lg font-semibold">
          <BookCheck className="h-4 w-4 text-gold" /> 阅读足迹
        </p>
        {readingHistory.length === 0 ? (
          <p className="font-body-serif text-sm italic text-muted-foreground">
            你尚未在回廊中留下足迹
          </p>
        ) : (
          <div className="space-y-3">
            {readingHistory.map((entry) => {
              const pct = Math.round(entry.percent * 100);
              const ageMin = Math.round((Date.now() - entry.savedAt) / 60000);
              const timeAgo =
                ageMin < 1
                  ? "刚刚"
                  : ageMin < 60
                    ? `${ageMin} 分钟前`
                    : ageMin < 1440
                      ? `${Math.round(ageMin / 60)} 小时前`
                      : `${Math.round(ageMin / 1440)} 天前`;
              return (
                <button
                  key={entry.slug}
                  onClick={() => setView({ name: "volume", slug: entry.slug })}
                  className="group flex w-full items-center gap-3 rounded-lg border border-border/40 bg-background/40 p-3 text-left transition-colors hover:border-gold/40 hover:bg-card/60"
                >
                  <Hexagon className="h-5 w-5 shrink-0 text-gold/60" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif-display text-sm font-medium group-hover:text-gold">
                      {entry.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      {entry.finished ? (
                        <span className="flex items-center gap-1 text-xs text-gold">
                          <Check className="h-3 w-3" /> 已读完
                        </span>
                      ) : (
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full progress-warm"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      {!entry.finished && (
                        <span className="text-xs text-muted-foreground">{pct}%</span>
                      )}
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> {timeAgo}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-gold" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Marginalia Index Link */}
      <div className="mt-6">
        <button
          onClick={() => setView({ name: "marginalia" })}
          className="group flex w-full items-center gap-4 rounded-xl border border-border/50 bg-card/30 p-5 text-left transition-colors hover:border-gold/30 hover:bg-card/50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gold/25 bg-gold/10">
            <Highlighter className="h-5 w-5 text-gold" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-serif-display text-base font-semibold group-hover:text-gold transition-colors">
              批注索引 · Marginalia Index
            </p>
            <p className="font-body-serif text-sm text-muted-foreground">
              所有卷册中的高亮与批注，一处尽览
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-gold" />
        </button>
      </div>

      {/* Reading data visualization — the Library's Ledger */}
      <LibraryLedger />

      {/* Reading Time Ring — cumulative time spent reading, by gallery */}
      <ReadingTimeRing />

      {/* Reading Activity Heatmap — GitHub-style contribution grid */}
      <ReadingHeatmap />

      {/* Galleries */}
      {hexagons.data && hexagons.data.length > 0 && (
        <div className="mt-8 rounded-xl border border-border/50 bg-card/30 p-6">
          <p className="mb-3 flex items-center gap-2 font-serif-display text-lg font-semibold">
            <Hexagon className="h-4 w-4 text-gold" /> 全部回廊
          </p>
          <div className="flex flex-wrap gap-2">
            {hexagons.data.map((h) => (
              <button
                key={h.name}
                onClick={() => setView({ name: "hexagon", hexagon: h.name })}
                className="elegant-underline rounded-full border border-border/60 px-3 py-1 text-sm text-foreground/70 transition-colors hover:border-gold/50 hover:text-gold"
              >
                {h.name} · {h.count}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contact + CTA */}
      <div className="hex-watermark mt-10 flex flex-col items-center gap-4 rounded-xl border border-gold/20 bg-gradient-to-br from-card/60 to-background/30 p-8 text-center relative overflow-hidden">
        {/* Ornamental hex watermark SVG */}
        <svg className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 opacity-[0.04]" viewBox="0 0 200 200" fill="none" aria-hidden="true">
          <polygon points="100,10 178,55 178,145 100,190 22,145 22,55" stroke="currentColor" strokeWidth="1.5" className="text-gold" />
          <polygon points="100,35 155,62 155,138 100,165 45,138 45,62" stroke="currentColor" strokeWidth="1" className="text-gold" />
          <polygon points="100,60 132,77 132,123 100,140 68,123 68,77" stroke="currentColor" strokeWidth="0.8" className="text-gold" />
        </svg>
        <HexRing count={6} radius={32} className="h-16 w-16 opacity-50" />
        <h2 className="font-serif-display text-2xl font-semibold">
          想留下你的字吗？
        </h2>
        <p className="max-w-md font-body-serif text-sm text-muted-foreground">
          书架上还有空位。打开"执笔"，写一卷属于你的字。
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            onClick={() => setView({ name: "write" })}
            className="rounded-full bg-gold text-ink hover:bg-gold/90"
          >
            <Feather className="mr-2 h-4 w-4" /> 执笔写一卷
          </Button>
          <Button
            onClick={() => setView({ name: "library" })}
            variant="outline"
            className="rounded-full border-gold/30 hover:border-gold hover:text-gold"
          >
            <BookOpen className="mr-2 h-4 w-4" /> 继续漫游
          </Button>
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" /> liushulin@azad.asia
          </span>
          <span className="flex items-center gap-1">
            <Github className="h-3.5 w-3.5" /> Azad-sl/The-Library-of-Babel
          </span>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/40 p-4 text-center">
      <div className="flex items-center justify-center gap-1.5 text-gold/80">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 font-serif-display text-2xl font-semibold">
        {value ?? "—"}
      </p>
    </div>
  );
}
