"use client";

import { useMemo, useState } from "react";
import { Quote, Copy, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Post } from "@/lib/types";

type FormatKey = "bibtex" | "apa" | "chicago" | "mla" | "gbt7714";

const FORMAT_LABELS: { key: FormatKey; label: string }[] = [
  { key: "bibtex", label: "BibTeX" },
  { key: "apa", label: "APA" },
  { key: "chicago", label: "Chicago" },
  { key: "mla", label: "MLA" },
  { key: "gbt7714", label: "GB/T 7714" },
];

/** Months indexed for citation format needs (English long form). */
const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_EN_SHORT = [
  "Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.",
  "Jul.", "Aug.", "Sept.", "Oct.", "Nov.", "Dec.",
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

interface CitationCtx {
  title: string;
  author: string;
  slug: string;
  year: string;
  monthEn: string;     // "July"
  monthEnShort: string; // "Jul."
  month2: string;       // "07"
  day2: string;         // "09"
  publishIso: string;   // "2026-07-09"
  accessYear: string;
  accessMonthEnShort: string; // "Jul."
  accessDay2: string;
  accessIso: string;          // "2026-07-14"
}

function buildCtx(post: Post): CitationCtx {
  // Prefer publishedAt-style fields if present (none in current schema), then
  // fall back to createdAt. Tolerate invalid dates by using today's date.
  let d = new Date(post.createdAt);
  if (isNaN(d.getTime())) d = new Date();
  const now = new Date();
  return {
    title: post.title,
    author: post.authorName || "佚名",
    slug: post.slug,
    year: String(d.getFullYear()),
    monthEn: MONTHS_EN[d.getMonth()],
    monthEnShort: MONTHS_EN_SHORT[d.getMonth()],
    month2: pad2(d.getMonth() + 1),
    day2: pad2(d.getDate()),
    publishIso: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    accessYear: String(now.getFullYear()),
    accessMonthEnShort: MONTHS_EN_SHORT[now.getMonth()],
    accessDay2: pad2(now.getDate()),
    accessIso: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`,
  };
}

function buildCitation(fmt: FormatKey, c: CitationCtx): string {
  switch (fmt) {
    case "bibtex": {
      // key: first word of author (lowercased) + year
      const authorFirst = (c.author.split(/\s+/)[0] || "anon").toLowerCase();
      const key = `${authorFirst}${c.year}`;
      const url = `/#${c.slug}`;
      return [
        `@article{${key},`,
        `  title     = {${c.title}},`,
        `  author    = {${c.author}},`,
        `  year      = {${c.year}},`,
        `  month     = ${c.monthEn.toLowerCase()},`,
        `  howpublished = {\\url{${url}}},`,
        `  note      = {巴别图书馆}`,
        `}`,
      ].join("\n");
    }
    case "apa": {
      // Author. (YYYY, Month DD). *Title*. Babel Library.
      return `${c.author}. (${c.year}, ${c.monthEn} ${c.day2}). *${c.title}*. 巴别图书馆.`;
    }
    case "chicago": {
      // Author. "Title." Babel Library. Accessed YYYY-MM-DD.
      return `${c.author}. "${c.title}." 巴别图书馆. Accessed ${c.accessIso}. /#${c.slug}.`;
    }
    case "mla": {
      // Author. "Title." *Babel Library*, DD Mon. YYYY, /#slug.
      return `${c.author}. "${c.title}." *巴别图书馆*, ${c.accessDay2} ${c.accessMonthEnShort} ${c.accessYear}, /#${c.slug}.`;
    }
    case "gbt7714": {
      // GB/T 7714-2015 — Chinese national standard for online articles.
      // 作者. 题名[EB/OL]. 巴别图书馆. YYYY-MM-DD[引用日期]. 可访问URL.
      return `${c.author}. ${c.title}[EB/OL]. 巴别图书馆. ${c.publishIso}[${c.accessIso}]. /#${c.slug}.`;
    }
  }
}

export function CitationGenerator({ post }: { post: Post }) {
  const [open, setOpen] = useState(false);
  const [fmt, setFmt] = useState<FormatKey>("bibtex");
  const [copied, setCopied] = useState(false);

  const ctx = useMemo(() => buildCtx(post), [post]);
  const text = useMemo(() => buildCitation(fmt, ctx), [fmt, ctx]);

  const copy = async (e?: React.MouseEvent) => {
    // Stop the click from bubbling up — Radix Popover can otherwise interpret
    // a click on a child button as an outside interaction in some edge cases.
    e?.stopPropagation();
    e?.preventDefault();
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // Fallback: use a hidden textarea WITHOUT appending it to <body> so
      // focus stays inside the popover content. We append it inside the
      // popover container itself (the nearest positioned ancestor).
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "50%";
        ta.style.left = "50%";
        ta.style.opacity = "0";
        ta.style.pointerEvents = "none";
        // Append to the popover content if present, else body.
        const host =
          document.querySelector(".citation-popover") || document.body;
        host.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        host.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="citation-trigger rounded-full border border-gold/30 px-5 text-foreground/80 transition-colors hover:border-gold hover:bg-gold/10 hover:text-gold"
          title="生成 BibTeX / APA / Chicago / MLA / GB/T 7714 引文"
        >
          <Quote className="mr-2 h-4 w-4" /> 引文格式
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        sideOffset={6}
        className="citation-popover w-[min(92vw,480px)] max-w-md rounded-lg border border-gold/30 bg-popover/95 p-4 shadow-[0_8px_40px_-12px_oklch(0_0_0/0.5)] backdrop-blur-md"
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Quote className="h-4 w-4 text-gold" />
            <span className="font-serif-display text-base font-medium text-foreground">
              引文格式
            </span>
            <span className="text-[0.65rem] uppercase tracking-[0.2em] text-gold/60">
              Citation
            </span>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="格式选用说明"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-gold/30 text-gold/70 transition-colors hover:border-gold hover:text-gold"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[220px] border border-gold/30 bg-background text-foreground">
              请按你所在学科惯例选用格式。
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Format selector — 3 cols on mobile, 5 cols on desktop so all
            formats fit in a single row. */}
        <div className="mb-3 grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {FORMAT_LABELS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFmt(f.key)}
              className={cn(
                "rounded-md border px-3 py-1.5 font-body-serif text-xs transition-all",
                fmt === f.key
                  ? "border-gold bg-gold/10 text-gold"
                  : "border-border/60 text-foreground/70 hover:border-gold/40 hover:text-gold"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Citation preview */}
        <pre
          className="citation-pre paper-texture max-h-56 overflow-auto rounded-md border border-gold/30 bg-card/60 p-3 font-mono text-[0.72rem] leading-relaxed text-foreground/90 scroll-leather"
          aria-live="polite"
        >
          {text}
        </pre>

        {/* Copy button */}
        <Button
          type="button"
          onClick={copy}
          size="sm"
          className={cn(
            "mt-3 w-full rounded-full border",
            copied
              ? "border-gold/40 bg-gold/10 text-gold"
              : "border-gold/30 text-foreground/80 hover:border-gold hover:bg-gold/10 hover:text-gold"
          )}
          variant="outline"
        >
          {copied ? (
            <>
              <Check className="mr-1.5 h-3.5 w-3.5" /> 已复制
            </>
          ) : (
            <>
              <Copy className="mr-1.5 h-3.5 w-3.5" /> 复制到剪贴板
            </>
          )}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
