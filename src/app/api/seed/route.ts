import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { SEED_POSTS } from "@/lib/seed-data";

// POST /api/seed  — idempotent seed via upsert-by-slug.
// Bootstrap mode: if the library is empty, anyone may seed (first-run).
// Otherwise: admin only (prevents anonymous re-seeding / clobbering).
export async function POST(request: Request) {
  try {
    const existingCount = await db.post.count();
    const isEmpty = existingCount === 0;
    if (!isEmpty && !requireAdmin(request)) {
      return NextResponse.json(
        { error: "未授权：图书馆已有卷册，需要馆长口令才能重新播种" },
        { status: 401 }
      );
    }
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    let upserted = 0;
    for (let i = 0; i < SEED_POSTS.length; i++) {
      const p = SEED_POSTS[i];
      // Spread createdAt across ~50 days, oldest post first (i=0 → 50 days ago).
      const createdAt = new Date(now - (SEED_POSTS.length - i) * 5 * dayMs);

      const data: Prisma.PostCreateInput = {
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        content: p.content,
        coverImage: p.coverImage,
        hexagon: p.hexagon,
        published: true,
        featured: p.featured,
        readMinutes: p.readMinutes,
        tags: p.tags,
        authorId: "librarian",
        authorName: "图书管理员",
        createdAt,
      };

      // upsert by slug — update content + coverImage fields on existing,
      // never clobber views / likes / createdAt so partial re-seeds stay safe.
      await db.post.upsert({
        where: { slug: p.slug },
        create: data,
        update: {
          title: p.title,
          excerpt: p.excerpt,
          content: p.content,
          coverImage: p.coverImage,
          hexagon: p.hexagon,
          featured: p.featured,
          readMinutes: p.readMinutes,
          tags: p.tags,
          authorName: "图书管理员",
        },
      });
      upserted++;
    }

    return NextResponse.json({ ok: true, count: upserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
