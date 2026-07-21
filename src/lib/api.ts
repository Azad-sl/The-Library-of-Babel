"use client";

import type {
  Post,
  PostSummary,
  HexagonStat,
  LibraryStats,
  LibraryStatsDetail,
  Comment,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Admin token storage (localStorage)                                 */
/* ------------------------------------------------------------------ */
const TOKEN_KEY = "babel-admin-token";

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearAdminToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Build headers, attaching the admin token for write requests. */
function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = getAdminToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  if (extra) Object.assign(h, extra as Record<string, string>);
  return h;
}

/** Error class carrying HTTP status, so callers can branch on 401. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function jfetch<T>(url: string, init?: RequestInit): Promise<T> {
  const isRead = !init?.method || init.method === "GET";
  const res = await fetch(url, {
    ...init,
    headers: isRead
      ? { "Content-Type": "application/json" }
      : authHeaders(init?.headers),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new ApiError(res.status, `${res.status} ${res.statusText} ${txt}`);
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

  seed: () => fetch(`/api/seed`, { method: "POST" }).then(r => {
  if (!r.ok) throw new ApiError(r.status, r.statusText);
  return r.json();
}),

  /* ---- Auth ---- */
  login: (password: string) =>
    jfetch<{ token: string }>(`/api/auth`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  verifyToken: () => jfetch<{ valid: boolean }>(`/api/auth`, { method: "GET" }),
};
