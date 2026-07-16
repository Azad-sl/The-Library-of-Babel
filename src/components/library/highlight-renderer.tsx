"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { Highlight } from "@/lib/types";

interface HighlightRendererProps {
  /** Ref to the `.prose-babel` container element. */
  proseRef: React.RefObject<HTMLDivElement | null>;
  /** Current list of saved highlights. */
  highlights: Highlight[];
  /** Remove a highlight by id (called from the popover's delete button). */
  onRemove: (id: string) => void;
}

interface PopoverState {
  id: string;
  text: string;
  note?: string;
  createdAt: number;
  top: number;
  left: number;
}

const JUMP_EVENT = "babel:jump-to-highlight";

/** Remove every existing `<mark class="babel-highlight">` and merge text nodes back. */
function unwrapAllMarks(container: HTMLElement) {
  const marks = Array.from(container.querySelectorAll("mark.babel-highlight"));
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  }
}

/**
 * Locate `text` inside `element`'s text nodes (skipping existing highlights)
 * and wrap it in a `<mark class="babel-highlight" data-highlight-id="...">`.
 * Handles both single-node and cross-node ranges by falling back to
 * `extractContents()` + `insertNode()` when `surroundContents()` fails.
 *
 * Returns true if a mark was successfully created.
 */
function wrapTextInElement(
  element: Element,
  text: string,
  highlightId: string
): boolean {
  if (!text) return false;

  // Collect all eligible text nodes (skip any inside an existing highlight mark)
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const parent = n.parentElement;
      if (parent && parent.closest("mark.babel-highlight")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) textNodes.push(node as Text);
  if (textNodes.length === 0) return false;

  // Build a combined string with start-offset mapping for each text node
  let combined = "";
  const map: { node: Text; start: number; len: number }[] = [];
  for (const tn of textNodes) {
    const len = tn.nodeValue?.length ?? 0;
    map.push({ node: tn, start: combined.length, len });
    combined += tn.nodeValue ?? "";
  }

  const startIdx = combined.indexOf(text);
  if (startIdx === -1) return false;
  const endIdx = startIdx + text.length;

  // Find the text node that contains the start of the match
  let startEntry = map.find(
    (m) => m.start <= startIdx && m.start + m.len > startIdx
  );
  if (!startEntry) {
    // Edge: startIdx falls exactly on a node boundary at the very end
    startEntry = map.find((m) => m.start + m.len === startIdx) || undefined;
    if (!startEntry) return false;
    // Advance to the next node if available — otherwise bail
    const idx = map.indexOf(startEntry);
    if (idx + 1 < map.length) {
      startEntry = map[idx + 1];
    } else {
      return false;
    }
  }

  // Find the text node that contains the end of the match
  let endEntry = map.find((m) => m.start < endIdx && m.start + m.len >= endIdx);
  if (!endEntry) {
    endEntry = map[map.length - 1];
  }
  if (!endEntry) return false;

  const startOffset = startIdx - startEntry.start;
  const endOffset = endIdx - endEntry.start;

  try {
    const range = document.createRange();
    range.setStart(startEntry.node, Math.max(0, Math.min(startOffset, startEntry.len)));
    range.setEnd(endEntry.node, Math.max(0, Math.min(endOffset, endEntry.len)));

    const mark = document.createElement("mark");
    mark.className = "babel-highlight";
    mark.setAttribute("data-highlight-id", highlightId);

    try {
      // Fast path — works only when the range doesn't cross element boundaries
      range.surroundContents(mark);
    } catch {
      // Fallback: extract + rebuild — preserves inline formatting inside the mark
      const contents = range.extractContents();
      mark.appendChild(contents);
      range.insertNode(mark);
    }

    // Attach the note as a data attribute so CSS can show it as a tooltip
    return true;
  } catch {
    return false;
  }
}

/** Dispatch a custom event to scroll to a highlight by id (used by the marginalia sidebar). */
export function dispatchJumpToHighlight(id: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(JUMP_EVENT, { detail: { id } }));
}

export function HighlightRenderer({
  proseRef,
  highlights,
  onRemove,
}: HighlightRendererProps) {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Re-apply marks whenever the highlights list changes (or the prose re-renders).
  // useEffect runs after ReactMarkdown has committed DOM, so the marks won't be wiped.
  useEffect(() => {
    const container = proseRef.current;
    if (!container) return;

    // First, unwrap any existing marks (clean slate)
    unwrapAllMarks(container);

    // Then re-wrap each highlight
    const allParas = Array.from(
      container.querySelectorAll("p, blockquote, li")
    );
    for (const h of highlights) {
      const para = allParas[h.anchor.paragraph];
      if (!para) continue;
      wrapTextInElement(para, h.text, h.id);
    }
  }, [proseRef, highlights]);

  // Listen for clicks on marks (event delegation) to open the popover
  useEffect(() => {
    const container = proseRef.current;
    if (!container) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      const mark = target.closest("mark.babel-highlight") as HTMLElement | null;

      // Close popover if clicking elsewhere inside the prose
      if (!mark) {
        if (popoverRef.current && !popoverRef.current.contains(target)) {
          setPopover(null);
        }
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const id = mark.getAttribute("data-highlight-id");
      if (!id) return;
      const h = highlights.find((x) => x.id === id);
      if (!h) return;

      const rect = mark.getBoundingClientRect();
      setPopover({
        id: h.id,
        text: h.text,
        note: h.note,
        createdAt: h.createdAt,
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
      });
    };

    container.addEventListener("click", onClick);
    return () => container.removeEventListener("click", onClick);
  }, [proseRef, highlights]);

  // Close popover on scroll/escape/click-outside
  useEffect(() => {
    if (!popover) return;
    const onScroll = () => setPopover(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopover(null);
    };
    const onDown = (e: MouseEvent) => {
      if (popoverRef.current?.contains(e.target as Node)) return;
      setPopover(null);
    };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [popover]);

  // Register a global jump handler so the sidebar can scroll to a highlight
  useEffect(() => {
    const jumpTo = (id: string) => {
      const container = proseRef.current;
      if (!container) return;
      const mark = container.querySelector(
        `mark.babel-highlight[data-highlight-id="${CSS.escape(id)}"]`
      ) as HTMLElement | null;
      if (!mark) return;
      const rect = mark.getBoundingClientRect();
      const top = rect.top + window.scrollY - 100;
      window.scrollTo({ top, behavior: "smooth" });
      mark.classList.add("babel-highlight-flash");
      window.setTimeout(() => {
        mark.classList.remove("babel-highlight-flash");
      }, 1200);
    };
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ id: string }>;
      if (ce.detail && ce.detail.id) jumpTo(ce.detail.id);
    };
    window.addEventListener(JUMP_EVENT, handler as EventListener);
    return () => window.removeEventListener(JUMP_EVENT, handler as EventListener);
  }, [proseRef]);

  const handleRemove = useCallback(() => {
    if (!popover) return;
    onRemove(popover.id);
    setPopover(null);
  }, [popover, onRemove]);

  // Keep marks' data-note attributes fresh so CSS tooltips can render notes
  useEffect(() => {
    const container = proseRef.current;
    if (!container) return;
    for (const h of highlights) {
      const mark = container.querySelector(
        `mark.babel-highlight[data-highlight-id="${CSS.escape(h.id)}"]`
      );
      if (!mark) continue;
      if (h.note) {
        mark.setAttribute("data-note", h.note);
      } else {
        mark.removeAttribute("data-note");
      }
    }
  }, [proseRef, highlights]);

  return (
    <>
      {popover && (
        <div
          ref={popoverRef}
          className="fixed z-50 w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 rise-in"
          style={{ top: `${popover.top}px`, left: `${popover.left}px` }}
          role="dialog"
          aria-label="高亮批注详情"
        >
          <div className="rounded-xl border border-gold/40 bg-card/95 p-3 shadow-lg shadow-black/40 backdrop-blur-sm">
            <div className="mb-2 flex items-start justify-between gap-2">
              <span className="text-[10px] uppercase tracking-wider text-gold/70">
                {format(new Date(popover.createdAt), "yyyy.MM.dd HH:mm", {
                  locale: zhCN,
                })}
              </span>
              <button
                type="button"
                onClick={() => setPopover(null)}
                aria-label="关闭"
                className="-mt-1 -mr-1 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <p className="mb-2 max-h-32 overflow-y-auto font-body-serif text-sm italic leading-relaxed text-foreground/80 scroll-leather">
              &ldquo;{popover.text}&rdquo;
            </p>
            {popover.note && (
              <p className="mb-2 border-l-2 border-gold/50 pl-2 font-body-serif text-xs leading-relaxed text-gold/90">
                {popover.note}
              </p>
            )}
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1.5 rounded-full border border-destructive/40 px-2.5 py-1 text-[11px] text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3" /> 删除
            </button>
          </div>
        </div>
      )}
    </>
  );
}
