"use client";

import { create } from "zustand";
import type { View } from "@/lib/types";

interface LibraryState {
  view: View;
  // simple history for "back" behavior
  history: View[];
  setView: (v: View) => void;
  goBack: () => void;
  canGoBack: () => boolean;
}

export const useLibrary = create<LibraryState>((set, get) => ({
  view: { name: "home" },
  history: [],
  setView: (v) => {
    const cur = get().view;
    set({ view: v, history: [...get().history, cur].slice(-30) });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },
  goBack: () => {
    const h = [...get().history];
    if (h.length === 0) return;
    const prev = h.pop()!;
    set({ view: prev, history: h });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },
  canGoBack: () => get().history.length > 0,
}));
