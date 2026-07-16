"use client";

import { HexLogo } from "./hex-logo";
import { useLibrary } from "@/store/library-store";
import type { View } from "@/lib/types";
import { Rss } from "lucide-react";

export function Footer() {
  const { setView } = useLibrary();
  const go = (v: View) => setView(v);

  return (
    <footer className="mt-auto border-t border-gold/15 bg-background/60 print:hidden">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand & quote */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <HexLogo size={26} />
              <span className="font-serif-display text-base font-semibold">
                巴别图书馆
              </span>
            </div>
            <p className="font-body-serif text-sm italic leading-relaxed text-muted-foreground">
              "我曾在走廊里迷路，也曾在一行字里找到自己。
              <br />
              这座图书馆是无限的——而我也因此，得以永不结束。"
            </p>
            <p className="text-[0.7rem] uppercase tracking-[0.25em] text-gold/70">
              The Library of Babel · est. ∞
            </p>
          </div>

          {/* Nav */}
          <div className="space-y-3">
            <p className="font-body-serif text-xs uppercase tracking-[0.25em] text-gold/70">
              回廊 · Galleries
            </p>
            <ul className="space-y-1.5 font-body-serif text-sm">
              <li>
                <button
                  onClick={() => go({ name: "home" })}
                  className="text-foreground/70 transition-colors hover:text-gold"
                >
                  首页 · Home
                </button>
              </li>
              <li>
                <button
                  onClick={() => go({ name: "library" })}
                  className="text-foreground/70 transition-colors hover:text-gold"
                >
                  书库 · Library
                </button>
              </li>
              <li>
                <button
                  onClick={() => go({ name: "hexagons" })}
                  className="text-foreground/70 transition-colors hover:text-gold"
                >
                  回廊 · Hexagons
                </button>
              </li>
              <li>
                <button
                  onClick={() => go({ name: "search", query: "" })}
                  className="text-foreground/70 transition-colors hover:text-gold"
                >
                  检索 · Search
                </button>
              </li>
              <li>
                <button
                  onClick={() => go({ name: "about" })}
                  className="text-foreground/70 transition-colors hover:text-gold"
                >
                  关于 · About
                </button>
              </li>
            </ul>
          </div>

          {/* Colophon */}
          <div className="space-y-3">
            <p className="font-body-serif text-xs uppercase tracking-[0.25em] text-gold/70">
              版本说明 · Colophon
            </p>
            <p className="font-body-serif text-sm leading-relaxed text-muted-foreground">
              以博尔赫斯《巴别图书馆》为名，收录随笔、读书笔记与思辨。
              <br />
              所有卷册皆为确定性的——它们早已写好，我们只是在翻阅。
            </p>
            <p className="text-[0.7rem] text-muted-foreground">
              © {new Date().getFullYear()} · 由一位图书管理员手抄
            </p>
            <a
              href="/api/rss"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 px-3 py-1 text-xs text-gold/80 transition-colors hover:border-gold hover:bg-gold/10 hover:text-gold"
            >
              <Rss className="h-3 w-3" />
              <span className="font-body-serif">RSS · 订阅回廊之声</span>
            </a>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border/60 pt-5 text-center sm:flex-row sm:text-left">
          <p className="font-body-serif text-xs text-muted-foreground">
            建于 Next.js · 衬线字体 Cormorant & EB Garamond
          </p>
          <p className="flex items-center gap-2 font-body-serif text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold flicker" />
            烛火不灭 · The candle burns on
          </p>
        </div>
      </div>
    </footer>
  );
}
