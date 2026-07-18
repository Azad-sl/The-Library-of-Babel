"use client";

import { useState } from "react";
import { ArrowUpRight, Highlighter as HighlighterIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Highlight } from "@/lib/types";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface MarginNotesProps {
  highlights: Highlight[];
  onJump: (id: string) => void;
}

/** Truncate text to a max length with an ellipsis. */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

/** Single list item — shared by the desktop sidebar and the mobile sheet. */
function MarginNoteItem({
  highlight,
  onJump,
}: {
  highlight: Highlight;
  onJump: (id: string) => void;
}) {
  return (
    <li className="group rounded-lg border border-border/40 bg-card/30 p-2 transition-colors hover:border-gold/40 hover:bg-card/60">
      <button
        type="button"
        onClick={() => onJump(highlight.id)}
        className="block w-full text-left"
        aria-label="跳转到该批注"
      >
        <p className="line-clamp-2 font-body-serif text-xs leading-relaxed text-foreground/80 group-hover:text-foreground">
          <span className="mr-1 text-gold/70">&ldquo;</span>
          {truncate(highlight.text, 50)}
          <span className="ml-0.5 text-gold/70">&rdquo;</span>
        </p>
        {highlight.note && (
          <p className="mt-1 line-clamp-2 border-l-2 border-gold/40 pl-1.5 font-body-serif text-[11px] italic leading-snug text-gold/85">
            {highlight.note}
          </p>
        )}
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {format(new Date(highlight.createdAt), "MM/dd HH:mm", {
              locale: zhCN,
            })}
          </span>
          <ArrowUpRight className="h-3 w-3 text-muted-foreground transition-colors group-hover:text-gold" />
        </div>
      </button>
    </li>
  );
}

/** Empty-state line shared by both layouts. */
function EmptyState() {
  return (
    <p className="font-body-serif text-xs italic text-muted-foreground">
      页边尚无批注 · 选中文字以添加
       <span className="block mt-1 text-[10px] text-muted-foreground/60">
        批注仅保存在本地浏览器，清除缓存后将丢失
      </span>
    </p>
  );
}

/**
 * Desktop marginalia sidebar — sticky right-side column listing every
 * highlight saved for the current volume. Width is controlled by the
 * parent grid (≈180px).
 */
export function MarginNotes({ highlights, onJump }: MarginNotesProps) {
  return (
    <div>
      <p className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-gold/60">
        <HighlighterIcon className="h-3 w-3" /> 页边批注 · {highlights.length}
      </p>
      {highlights.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="max-h-[calc(100vh-14rem)] space-y-2 overflow-y-auto scroll-leather pr-1">
          {highlights.map((h) => (
            <MarginNoteItem key={h.id} highlight={h} onJump={onJump} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Mobile / narrow-viewport marginalia. Renders a floating gold-bordered
 * badge in the bottom-right that opens a Sheet with the same list.
 * Renders nothing when there are no highlights yet.
 */
export function MobileMarginNotes({ highlights, onJump }: MarginNotesProps) {
  const [open, setOpen] = useState(false);
  if (highlights.length === 0) return null;
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={`查看 ${highlights.length} 条页边批注`}
          className="fixed bottom-20 right-6 z-40 flex items-center gap-1.5 rounded-full border border-gold/40 bg-background/85 px-3 py-2 text-xs text-gold backdrop-blur-md transition-all hover:border-gold hover:bg-gold/10 xl:hidden print:hidden"
        >
          <HighlighterIcon className="h-3.5 w-3.5" />
          {highlights.length} 批注
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] bg-background">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 font-serif-display">
            <HighlighterIcon className="h-4 w-4 text-gold" /> 页边批注 ·{" "}
            {highlights.length}
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6 scroll-leather">
          {highlights.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-2">
              {highlights.map((h) => (
                <MarginNoteItem
                  key={h.id}
                  highlight={h}
                  onJump={(id) => {
                    onJump(id);
                    setOpen(false);
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
