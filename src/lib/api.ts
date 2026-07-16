"use client";

import type {
  Post,
  PostSummary,
  HexagonStat,
  LibraryStats,
  LibraryStatsDetail,
  Comment,
} from "@/lib/types";

async function jfetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${txt}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listPosts: (params?: {
    hexagon?: string;
    tag?: string;
    limit?: number;
    featured?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (params?.hexagon) q.set("hexagon", params.hexagon);
    if (params?.tag) q.set("tag", params.tag);
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.featured) q.set("featured", "1");
    return jfetch<PostSummary[]>(`/api/posts?${q.toString()}`);
  },

  getPost: (slug: string) => jfetch<Post>(`/api/posts/${slug}`),

  createPost: (data: Partial<Post> & { title: string; content: string }) =>
    jfetch<Post>(`/api/posts`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updatePost: (id: string, data: Partial<Post>) =>
    jfetch<Post>(`/api/posts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deletePost: (id: string) =>
    jfetch<{ ok: boolean }>(`/api/posts/${id}`, { method: "DELETE" }),

  likePost: (id: string) =>
    jfetch<{ likes: number }>(`/api/posts/${id}/like`, { method: "POST" }),

  listHexagons: () => jfetch<HexagonStat[]>(`/api/hexagons`),

  stats: () => jfetch<LibraryStats>(`/api/stats`),

  statsDetail: () => jfetch<LibraryStatsDetail>(`/api/stats/detail`),

  search: (query: string) =>
    jfetch<PostSummary[]>(`/api/search?q=${encodeURIComponent(query)}`),

  listComments: (postId: string) =>
    jfetch<Comment[]>(`/api/comments?postId=${postId}`),

  addComment: (postId: string, name: string, content: string) =>
    jfetch<Comment>(`/api/comments`, {
      method: "POST",
      body: JSON.stringify({ postId, name, content }),
    }),

  seed: () => jfetch<{ ok: boolean; count: number }>(`/api/seed`, { method: "POST" }),
};
