"use client";
 
import { create } from "zustand";
import type { View } from "@/lib/types";
 
interface LibraryState {
  view: View;
  history: View[];
  refreshKey: number;       // ← 新增
  setView: (v: View) => void;
  goBack: () => void;
  canGoBack: () => boolean;
  bumpRefresh: () => void;  // ← 新增
}
 
export const useLibrary = create<LibraryState>((set, get) => ({
  view: { name: "home" },
  history: [],
  refreshKey: 0,
  setView: (v) => {
    const cur = get().view;
    set({
      view: v,
      history: [...get().history, cur].slice(-30),
      refreshKey: get().refreshKey + 1,  // ← 切视图时递增
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },
  goBack: () => {
    const h = [...get().history];
    if (h.length === 0) return;
    const prev = h.pop()!;
    set({
      view: prev,
      history: h,
      refreshKey: get().refreshKey + 1,  // ← 返回时也递增
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  },
  canGoBack: () => get().history.length > 0,
  bumpRefresh: () => set({ refreshKey: get().refreshKey + 1 }),  // ← 新增
}));
