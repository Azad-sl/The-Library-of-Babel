"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Highlight, HighlightAnchor } from "@/lib/types";

const PREFIX = "babel-highlights-";

function loadFromStorage(slug: string): Highlight[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PREFIX + slug);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is Highlight =>
        x &&
        typeof x === "object" &&
        typeof x.id === "string" &&
        typeof x.text === "string" &&
        typeof x.createdAt === "number" &&
        x.anchor &&
        typeof x.anchor.paragraph === "number" &&
        typeof x.anchor.offset === "number"
    );
  } catch {
    return [];
  }
}

function saveToStorage(slug: string, items: Highlight[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + slug, JSON.stringify(items));
  } catch {
    /* quota / private mode — silently ignore */
  }
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Persist & restore text highlights with optional margin notes per volume slug.
 * Each volume gets its own localStorage entry under `babel-highlights-${slug}`.
 *
 * Exposes:
 * - `highlights`: current list (sorted by createdAt asc for stable ordering)
 * - `addHighlight(text, anchor, note?)`: appends and returns the new id
 * - `removeHighlight(id)`: removes by id
 * - `updateNote(id, note)`: replaces the note (empty string clears it)
 * - `isHighlighted(text)`: true if any saved highlight shares this exact text
 * - `loaded`: false during the very first hydration, true once localStorage is read
 */
export function useHighlights(slug: string) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loaded, setLoaded] = useState(false);
  const slugRef = useRef(slug);
  slugRef.current = slug;

  // Hydrate from localStorage on mount / slug change
  useEffect(() => {
    setHighlights(loadFromStorage(slug));
    setLoaded(true);
  }, [slug]);

  // Persist on every change (only after the initial hydrate to avoid wiping)
  useEffect(() => {
    if (!loaded) return;
    saveToStorage(slugRef.current, highlights);
  }, [highlights, loaded]);

  const addHighlight = useCallback(
    (text: string, anchor: HighlightAnchor, note?: string): string => {
      const id = makeId();
      const item: Highlight = {
        id,
        text,
        createdAt: Date.now(),
        anchor,
        ...(note && note.trim() ? { note: note.trim().slice(0, 200) } : {}),
      };
      setHighlights((prev) =>
        [...prev, item].sort((a, b) => a.createdAt - b.createdAt)
      );
      return id;
    },
    []
  );

  const removeHighlight = useCallback((id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const updateNote = useCallback((id: string, note: string) => {
    const trimmed = note.trim().slice(0, 200);
    setHighlights((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, note: trimmed || undefined } : h
      )
    );
  }, []);

  const isHighlighted = useCallback(
    (text: string) => highlights.some((h) => h.text === text),
    [highlights]
  );

  return {
    highlights,
    addHighlight,
    removeHighlight,
    updateNote,
    isHighlighted,
    loaded,
  };
}

/**
 * Read all highlights across every volume from localStorage.
 * Returns an array of { slug, highlights } grouped by volume slug.
 * Used by the Marginalia Index view to show cross-volume annotations.
 */
export function getAllHighlights(): { slug: string; highlights: Highlight[] }[] {
  if (typeof window === "undefined") return [];
  try {
    const results: { slug: string; highlights: Highlight[] }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      const slug = key.slice(PREFIX.length);
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) continue;
        const valid = parsed.filter(
          (x): x is Highlight =>
            x &&
            typeof x === "object" &&
            typeof x.id === "string" &&
            typeof x.text === "string" &&
            typeof x.createdAt === "number" &&
            x.anchor &&
            typeof x.anchor.paragraph === "number" &&
            typeof x.anchor.offset === "number"
        );
        if (valid.length > 0) {
          results.push({ slug, highlights: valid });
        }
      } catch {
        continue;
      }
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Remove all highlights from localStorage across every volume.
 * Returns the number of keys removed.
 */
export function clearAllHighlights(): number {
  if (typeof window === "undefined") return 0;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    return keysToRemove.length;
  } catch {
    return 0;
  }
}
