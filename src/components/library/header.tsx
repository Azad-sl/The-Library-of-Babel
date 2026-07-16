"use client";

import { useState, useEffect } from "react";
import { HexLogo } from "./hex-logo";
import { ThemeToggle } from "./theme-toggle";
import { useLibrary } from "@/store/library-store";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Library,
  Hexagon,
  Search,
  Feather,
  Home,
  Menu,
  BookMarked,
  KeyRound,
} from "lucide-react";
import type { View } from "@/lib/types";

const NAV: { label: string; sub: string; view: View; icon: typeof Home }[] = [
  { label: "首页", sub: "Home", view: { name: "home" }, icon: Home },
  { label: "书库", sub: "Library", view: { name: "library" }, icon: Library },
  { label: "回廊", sub: "Hexagons", view: { name: "hexagons" }, icon: Hexagon },
  { label: "检索", sub: "Search", view: { name: "search", query: "" }, icon: Search },
  { label: "关于", sub: "About", view: { name: "about" }, icon: BookMarked },
];

export function Header() {
  const { view, setView } = useLibrary();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (v: View) => {
    setView(v);
    setMobileOpen(false);
  };

  const isActive = (label: string) => {
    if (label === "首页") return view.name === "home";
    if (label === "书库") return view.name === "library" || view.name === "volume";
    if (label === "回廊") return view.name === "hexagons" || view.name === "hexagon";
    if (label === "检索") return view.name === "search";
    if (label === "关于") return view.name === "about";
    return false;
  };

  return (
    <header
      className={cn(
        "print:hidden sticky top-0 z-50 w-full transition-all duration-500",
        scrolled
          ? "backdrop-blur-md bg-background/80 border-b border-gold/20 shadow-[0_1px_0_0_var(--gold)]/10"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <button
          onClick={() => go({ name: "home" })}
          className="group flex items-center gap-3"
          aria-label="返回首页"
        >
          <span className="relative transition-transform duration-500 group-hover:rotate-[30deg]">
            <HexLogo size={36} glow />
          </span>
          <span className="flex flex-col items-start leading-none">
            <span className="font-serif-display text-lg font-semibold tracking-wide text-foreground">
              巴别图书馆
            </span>
            <span className="font-body-serif text-[0.62rem] uppercase tracking-[0.32em] text-gold/80">
              The Library of Babel
            </span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.label);
            return (
              <button
                key={item.label}
                onClick={() => go(item.view)}
                className={cn(
                  "group relative flex items-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "text-gold"
                    : "text-foreground/70 hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100" />
                <span className="font-body-serif">{item.label}</span>
                {active && (
                  <span className="absolute -bottom-0.5 left-1/2 h-px w-6 -translate-x-1/2 bg-gold" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => go({ name: "write" })}
            className="hidden items-center gap-1.5 rounded-full border border-gold/30 px-3 text-foreground/80 hover:border-gold hover:text-gold sm:flex"
          >
            <Feather className="h-3.5 w-3.5" />
            <span className="font-body-serif text-sm">执笔</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => go({ name: "admin" })}
            className="h-9 w-9 text-muted-foreground/50 transition-colors hover:text-gold"
            aria-label="馆长办公室"
            title="馆长办公室 (⌘8)"
          >
            <KeyRound className="h-4 w-4" />
          </Button>
          <ThemeToggle />

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="打开菜单"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] bg-background">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <HexLogo size={28} />
                  <span className="font-serif-display">巴别图书馆</span>
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {NAV.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.label);
                  return (
                    <button
                      key={item.label}
                      onClick={() => go(item.view)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors",
                        active
                          ? "bg-accent/40 text-gold"
                          : "text-foreground/80 hover:bg-accent/20"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="font-body-serif text-base">{item.label}</span>
                        <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                          {item.sub}
                        </span>
                      </div>
                    </button>
                  );
                })}
                <button
                  onClick={() => go({ name: "write" })}
                  className="mt-2 flex items-center gap-3 rounded-lg border border-gold/30 px-4 py-3 text-left text-foreground/80 hover:border-gold hover:text-gold"
                >
                  <Feather className="h-4 w-4" />
                  <span className="font-body-serif text-base">执笔 · 写一卷</span>
                </button>
                <button
                  onClick={() => go({ name: "admin" })}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-left text-muted-foreground/70 transition-colors hover:bg-accent/20 hover:text-gold"
                >
                  <KeyRound className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-body-serif text-base">馆长办公室</span>
                    <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">
                      Curator · ⌘8
                    </span>
                  </div>
                </button>
              </nav>
              <p className="mt-8 px-4 font-body-serif text-xs italic leading-relaxed text-muted-foreground">
                "宇宙（别人管它叫图书馆）由一个数目不定的、也许是无限的六边形回廊组成……"
                <br />—— 博尔赫斯
              </p>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
