"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Hexagon, Keyboard, X } from "lucide-react";
import { subscribeShortcutsHelpOpen } from "@/lib/shortcuts-event";

/* ------------------------------------------------------------------ */
/*  Shortcut groups                                                    */
/* ------------------------------------------------------------------ */
type ShortcutItem = { keys: string; desc: string };
type ShortcutGroup = {
  eyebrow: string;
  sub: string;
  items: ShortcutItem[];
};

const GROUPS: ShortcutGroup[] = [
  {
    eyebrow: "NAVIGATION",
    sub: "导航",
    items: [
      { keys: "⌘1", desc: "首页" },
      { keys: "⌘2", desc: "书库" },
      { keys: "⌘3", desc: "回廊" },
      { keys: "⌘4", desc: "检索" },
      { keys: "⌘5", desc: "关于" },
      { keys: "⌘6", desc: "批注索引" },
      { keys: "⌘7", desc: "执笔" },
      { keys: "⌘8", desc: "馆长办公室" },
    ],
  },
  {
    eyebrow: "SYSTEM",
    sub: "系统",
    items: [
      { keys: "⌘K", desc: "命令面板" },
      { keys: "⌘T", desc: "切换主题" },
      { keys: "⌘R", desc: "随机卷册" },
      { keys: "?", desc: "显示此面板" },
    ],
  },
  {
    eyebrow: "READING",
    sub: "阅读",
    items: [
      { keys: "j / →", desc: "向下滚动" },
      { keys: "k / ←", desc: "向上滚动" },
      { keys: "Esc", desc: "关闭弹窗" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function isTypingTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  /* ---- Global "?" listener (Shift+/) ---- */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "?") return;
      // Skip when modifier keys are held (so we never hijack Cmd/Ctrl/Alt+?)
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Skip when typing in an input/textarea/select/contentEditable
      if (isTypingTarget(document.activeElement)) return;
      e.preventDefault();
      setOpen((prev) => !prev);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  /* ---- Subscribe to external open events (e.g. command palette) ---- */
  useEffect(() => {
    return subscribeShortcutsHelpOpen(() => setOpen(true));
  }, []);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0"
        />
        <DialogPrimitive.Content
          data-testid="shortcuts-help-dialog"
          className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] sm:max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-0 overflow-hidden rounded-2xl border border-gold/30 bg-popover/95 p-0 shadow-[0_20px_80px_-20px_oklch(0_0_0/0.6)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* ---- Header ---- */}
          <div className="relative overflow-hidden border-b border-gold/20 bg-gradient-to-b from-gold/[0.05] to-transparent px-6 pt-7 pb-5 sm:px-8">
            {/* decorative hexagon pattern */}
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute -right-4 -top-6 h-32 w-32 text-gold/[0.07]"
              viewBox="0 0 100 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
            >
              <polygon points="50,5 90,27 90,73 50,95 10,73 10,27" />
              <polygon points="50,20 75,33 75,67 50,80 25,67 25,33" />
              <polygon points="50,35 62,42 62,58 50,65 38,58 38,42" />
            </svg>

            <DialogPrimitive.Close
              aria-label="关闭快捷键面板"
              className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-gold/10 hover:text-gold focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>

            <div className="flex items-center gap-2 text-gold/80">
              <Keyboard className="h-3.5 w-3.5" />
              <span className="font-body-serif text-[0.65rem] uppercase tracking-[0.32em]">
                SHORTCUTS · 快捷键
              </span>
            </div>

            <DialogPrimitive.Title className="mt-2 font-serif-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              键盘索引
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-1 font-body-serif text-sm italic text-muted-foreground">
              所有翻阅图书馆的指法 · ALL THE WAYS TO TURN THE PAGES
            </DialogPrimitive.Description>
          </div>

          {/* ---- Body — 2-column grid of categories ---- */}
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 px-6 py-6 sm:grid-cols-2 sm:px-8">
            {GROUPS.map((g) => (
              <section key={g.eyebrow} aria-label={`${g.eyebrow} · ${g.sub}`}>
                <div className="mb-3 flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="block h-4 w-1 rounded-sm bg-gold"
                  />
                  <span className="font-body-serif text-[0.7rem] uppercase tracking-[0.25em] text-gold/90">
                    {g.eyebrow} · {g.sub}
                  </span>
                </div>
                <ul className="space-y-2">
                  {g.items.map((it) => (
                    <li
                      key={`${g.eyebrow}-${it.keys}`}
                      className="flex items-center gap-3"
                    >
                      <kbd className="min-w-[2.5rem] rounded-md border border-gold/30 bg-card/60 px-2 py-0.5 text-center font-mono text-[0.7rem] text-gold">
                        {it.keys}
                      </kbd>
                      <span className="font-body-serif text-sm text-foreground/80">
                        {it.desc}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/* ---- Footer ---- */}
          <div className="flex items-center justify-center gap-2 border-t border-gold/15 px-6 py-3 sm:px-8">
            <Hexagon className="h-3.5 w-3.5 shrink-0 text-gold/60" />
            <span className="font-body-serif text-[0.7rem] text-muted-foreground">
              按{" "}
              <kbd className="rounded border border-gold/30 bg-card/60 px-1.5 py-0.5 font-mono text-[0.6rem] text-gold">
                ?
              </kbd>{" "}
              随时唤出此面板 ·{" "}
              <kbd className="rounded border border-gold/30 bg-card/60 px-1.5 py-0.5 font-mono text-[0.6rem] text-gold">
                ESC
              </kbd>{" "}
              关闭
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
