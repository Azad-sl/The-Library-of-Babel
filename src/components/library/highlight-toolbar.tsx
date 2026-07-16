"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Highlighter, MessageSquarePlus, Copy, Check, X } from "lucide-react";
import { toast } from "sonner";

interface ComputedAnchor {
  text: string;
  paragraph: number;
  offset: number;
}

interface HighlightToolbarProps {
  /** CSS selector for the prose container whose text is highlightable. */
  proseSelector?: string;
  /** Called when the user picks the "Highlight" action. */
  onHighlight: (text: string, paragraph: number, offset: number) => void;
  /** Called when the user finishes writing a margin note. */
  onAnnotate: (text: string, paragraph: number, offset: number, note: string) => void;
}

/**
 * Floating pill-shaped toolbar that appears above a text selection inside the
 * article prose. Offers three actions: Highlighter (save highlight),
 * MessageSquarePlus (open inline textarea to add a note), Copy (clipboard).
 *
 * The toolbar is rendered with `position: fixed` so it stays attached to the
 * viewport. It auto-hides on scroll, click outside, or escape.
 */
export function HighlightToolbar({
  proseSelector = ".prose-babel",
  onHighlight,
  onAnnotate,
}: HighlightToolbarProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [selection, setSelection] = useState<ComputedAnchor | null>(null);
  const [annotateMode, setAnnotateMode] = useState(false);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const annotateModeRef = useRef(annotateMode);
  annotateModeRef.current = annotateMode;

  /** Walk up from the selection to find the paragraph index + char offset. */
  const computeAnchor = useCallback((): ComputedAnchor | null => {
    if (typeof window === "undefined") return null;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
    const text = sel.toString().trim();
    if (!text) return null;

    const range = sel.getRangeAt(0);
    const startNode = range.startContainer;
    const startEl =
      startNode.nodeType === Node.ELEMENT_NODE
        ? (startNode as Element)
        : startNode.parentElement;
    if (!startEl) return null;

    // Must be inside the prose container
    const proseEl = startEl.closest(proseSelector);
    if (!proseEl) return null;

    // Walk up to the nearest paragraph-like block
    const paraEl = startEl.closest("p, blockquote, li");
    if (!paraEl || !proseEl.contains(paraEl)) return null;

    // Index it among all such blocks inside the prose
    const allParas = Array.from(proseEl.querySelectorAll("p, blockquote, li"));
    const paragraphIndex = allParas.indexOf(paraEl);
    if (paragraphIndex === -1) return null;

    // Find the offset of the selected text within the paragraph's flat textContent
    const paraText = paraEl.textContent || "";
    const offset = paraText.indexOf(text);
    if (offset === -1) return null;

    return { text, paragraph: paragraphIndex, offset };
  }, [proseSelector]);

  const clearAll = useCallback(() => {
    setPosition(null);
    setSelection(null);
    setAnnotateMode(false);
    setNote("");
  }, []);

  const clearSelectionState = useCallback(() => {
    setPosition(null);
    setSelection(null);
  }, []);

  /** Recompute the toolbar position from the current selection. */
  const refreshPosition = useCallback(() => {
    if (annotateModeRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      clearSelectionState();
      return;
    }
    const anchor = computeAnchor();
    if (!anchor) {
      clearSelectionState();
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      clearSelectionState();
      return;
    }
    setSelection(anchor);
    // 8px gap above the selection; toolbar is ~36px tall in pill mode
    const top = rect.top - 8 - 40;
    const left = rect.left + rect.width / 2;
    setPosition({ top: Math.max(8, top), left });
  }, [computeAnchor, clearSelectionState]);

  // Show toolbar on mouseup (after the selection is finalized)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onMouseUp = (e: MouseEvent) => {
      // ignore clicks on the toolbar itself
      if (toolbarRef.current?.contains(e.target as Node)) return;
      timer = setTimeout(() => {
        refreshPosition();
      }, 10);
    };
    const onSelectionChange = () => {
      // If the selection collapses and we're not annotating, hide
      if (annotateModeRef.current) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        clearSelectionState();
      }
    };
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("selectionchange", onSelectionChange);
      if (timer) clearTimeout(timer);
    };
  }, [refreshPosition, clearSelectionState]);

  // Hide on scroll (capture so we catch all scroll containers)
  useEffect(() => {
    const onScroll = () => {
      if (annotateModeRef.current) return;
      clearSelectionState();
    };
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () =>
      window.removeEventListener("scroll", onScroll, { capture: true });
  }, [clearSelectionState]);

  // Click outside (when not annotating) hides the toolbar
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (annotateModeRef.current) return;
      if (toolbarRef.current?.contains(e.target as Node)) return;
      clearSelectionState();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [clearSelectionState]);

  // Focus the textarea when entering annotate mode
  useEffect(() => {
    if (annotateMode && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [annotateMode]);

  if (!position || !selection) return null;

  const handleHighlight = () => {
    onHighlight(selection.text, selection.paragraph, selection.offset);
    clearAll();
    window.getSelection()?.removeAllRanges();
  };

  const handleAnnotateOpen = () => {
    setAnnotateMode(true);
  };

  const handleAnnotateSave = () => {
    const trimmed = note.trim();
    if (!trimmed) {
      toast.error("批注不能为空");
      return;
    }
    onAnnotate(
      selection.text,
      selection.paragraph,
      selection.offset,
      trimmed.slice(0, 200)
    );
    clearAll();
    window.getSelection()?.removeAllRanges();
  };

  const handleAnnotateCancel = () => {
    setAnnotateMode(false);
    setNote("");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selection.text);
      setCopied(true);
      toast.success("已抄下选文");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("抄录失败");
    }
  };

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 -translate-x-1/2 rise-in"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      role="toolbar"
      aria-label="文本选区工具"
      // Prevent the toolbar from capturing text selection away from the article
      onMouseDown={(e) => {
        // Only prevent default for the pill buttons, not the textarea
        if (annotateMode && (e.target as HTMLElement).tagName === "TEXTAREA") return;
        e.preventDefault();
      }}
    >
      {!annotateMode ? (
        <div className="flex items-center gap-0.5 rounded-full border border-gold/40 bg-card/95 px-2 py-1 shadow-lg shadow-black/40 backdrop-blur-sm">
          <ToolbarButton label="高亮" onClick={handleHighlight}>
            <Highlighter className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton label="批注" onClick={handleAnnotateOpen}>
            <MessageSquarePlus className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton label="抄录" onClick={handleCopy}>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-gold" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </ToolbarButton>
        </div>
      ) : (
        <div className="w-72 rounded-xl border border-gold/40 bg-card/95 p-2 shadow-lg shadow-black/40 backdrop-blur-sm">
          <textarea
            ref={textareaRef}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 200))}
            placeholder="在此处写下页边批注……"
            maxLength={200}
            className="min-h-[64px] w-full resize-none rounded-lg border border-border/50 bg-background/60 px-2 py-1.5 font-body-serif text-sm leading-relaxed text-foreground outline-none focus:border-gold/60"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleAnnotateSave();
              } else if (e.key === "Escape") {
                e.preventDefault();
                handleAnnotateCancel();
              }
            }}
          />
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {note.length} / 200
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleAnnotateCancel}
                className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label="取消批注"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={handleAnnotateSave}
                className="rounded-full bg-gold px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-gold/90"
              >
                留下批注
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-full text-foreground/80 transition-colors hover:bg-gold/15 hover:text-gold"
    >
      {children}
    </button>
  );
}
