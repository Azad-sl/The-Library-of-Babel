import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

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

// GET /api/search?q=  — search published posts across title/excerpt/content/tags
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();

    if (!q) {
      return NextResponse.json([]);
    }

    const posts = await db.post.findMany({
      where: {
        published: true,
        OR: [
          { title: { contains: q } },
          { excerpt: { contains: q } },
          { content: { contains: q } },
          { tags: { contains: q } },
        ],
      },
      select: postSummarySelect,
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json(posts);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
