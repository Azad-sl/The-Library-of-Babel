import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Select shape matching PostSummary (excludes full content)
const postSummarySelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  hexagon: true,
  featured: true,
  readMinutes: true,
  views: true,
  likes: true,
  authorName: true,
  tags: true,
  createdAt: true,
} satisfies Prisma.PostSelect;

// GET /api/posts?hexagon=&tag=&limit=&featured=
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const hexagon = searchParams.get("hexagon");
    const tag = searchParams.get("tag");
    const limitRaw = searchParams.get("limit");
    const featured = searchParams.get("featured");

    const limit = limitRaw
      ? Math.max(1, Math.min(500, parseInt(limitRaw, 10) || 100))
      : 100;

    const where: Prisma.PostWhereInput = { published: true };
    if (hexagon) where.hexagon = hexagon;
    if (tag) where.tags = { contains: tag };
    if (featured === "1") where.featured = true;

    const posts = await db.post.findMany({
      where,
      select: postSummarySelect,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(posts, {
  headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
});
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/posts  — create a post (admin only)
export async function POST(request: Request) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json(
        { error: "未授权：需要馆长口令" },
        { status: 401 }
      );
    }
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      hexagon,
      featured,
      readMinutes,
      tags,
      authorName,
      authorUrl,
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const finalSlug =
      typeof slug === "string" && slug.trim() ? slug.trim() : `post-${Date.now()}`;

    const created = await db.post.create({
      data: {
        title: title.trim(),
        slug: finalSlug,
        excerpt: typeof excerpt === "string" ? excerpt : null,
        content,
        coverImage: typeof coverImage === "string" ? coverImage : null,
        hexagon:
          typeof hexagon === "string" && hexagon.trim() ? hexagon.trim() : "未分类",
        featured: typeof featured === "boolean" ? featured : false,
        readMinutes: typeof readMinutes === "number" ? readMinutes : 5,
        tags: typeof tags === "string" ? tags : "",
        authorName:
          typeof authorName === "string" && authorName.trim()
            ? authorName.trim()
            : "图书管理员",
        authorUrl:
          typeof authorUrl === "string" && authorUrl.trim()
            ? authorUrl.trim()
            : null,
        published: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
