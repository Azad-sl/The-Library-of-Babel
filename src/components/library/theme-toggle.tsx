"use client";

import { useTheme } from "next-themes";
import { Moon, Sun, Flame } from "lucide-react";
import { useMounted } from "@/hooks/use-mounted";
import { Button } from "@/components/ui/button";
import { useCallback, useRef } from "react";

const THEME_CYCLE = ["dark", "candlelight", "light"] as const;

const THEME_META: Record<
  string,
  { icon: typeof Moon; label: string; nextLabel: string; colorClass: string; nextColor: string }
> = {
  dark: {
    icon: Moon,
    label: "墨水",
    nextLabel: "烛火",
    colorClass: "text-gold",
    nextColor: "oklch(0.35 0.06 60 / 0.9)",  /* candlelight bg preview */
  },
  candlelight: {
    icon: Flame,
    label: "烛火",
    nextLabel: "羊皮纸",
    colorClass: "text-gold",
    nextColor: "oklch(0.965 0.012 75 / 0.9)",  /* parchment bg preview */
  },
  light: {
    icon: Sun,
    label: "羊皮纸",
    nextLabel: "墨水",
    colorClass: "text-ink",
    nextColor: "oklch(0.16 0.012 55 / 0.9)",  /* ink bg preview */
  },
};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentTheme = (mounted ? resolvedTheme : undefined) ?? "dark";
  const meta = THEME_META[currentTheme] ?? THEME_META.dark;
  const Icon = meta.icon;

  const handleToggle = useCallback(() => {
    const currentIndex = THEME_CYCLE.indexOf(
      currentTheme as (typeof THEME_CYCLE)[number]
    );
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length;
    const nextTheme = THEME_CYCLE[nextIndex];
    const nextMeta = THEME_META[nextTheme];

          // ── Theme transition animation ──
      // Warm glow expanding from the toggle button — like lighting a candle
      if (buttonRef.current && typeof document !== "undefined") {
        const rect = buttonRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const maxR = Math.hypot(
          Math.max(cx, window.innerWidth - cx),
          Math.max(cy, window.innerHeight - cy)
        );
 
        const overlay = document.createElement("div");
        overlay.style.cssText = `
          position:fixed; inset:0; z-index:9999; pointer-events:none;
          background:radial-gradient(circle at ${cx}px ${cy}px,
            ${nextMeta.nextColor} 0%,
            ${nextMeta.nextColor.replace(/[\d.]+\)$/, '0.6)')} 30%,
            transparent 70%
          );
          clip-path:circle(0px at ${cx}px ${cy}px);
          transition:clip-path 0.7s cubic-bezier(0.22,1,0.36,1);
        `;
        document.documentElement.appendChild(overlay);
 
        requestAnimationFrame(() => {
          overlay.style.clipPath = `circle(${maxR * 1.1}px at ${cx}px ${cy}px)`;
        });
 
        setTimeout(() => {
          setTheme(nextTheme);
          overlay.style.transition = "opacity 0.4s ease";
          overlay.style.opacity = "0";
          setTimeout(() => overlay.remove(), 400);
        }, 650);
    } else {
      setTheme(nextTheme);
    }
  }, [currentTheme, setTheme]);

  return (
    <Button
      ref={buttonRef}
      variant="ghost"
      size="icon"
      aria-label={`当前：${meta.label}模式 · 点击切换至${meta.nextLabel}`}
      onClick={handleToggle}
      className="relative h-9 w-9 rounded-full hover:bg-accent/30 group"
      title={`${meta.label} · ${meta.nextLabel} →`}
    >
      {mounted ? (
        <span className="relative inline-flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <Icon
            className={`h-4 w-4 ${meta.colorClass} transition-all duration-300`}
          />
        </span>
      ) : (
        <Moon className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  );
}
