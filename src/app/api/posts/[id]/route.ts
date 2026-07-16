import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

// A Prisma cuid starts with 'c' and is ~24 base36 chars.
function isCuid(id: string): boolean {
  return /^c[a-z0-9]{20,30}$/i.test(id);
}

type FindUniqueArgs =
  | { id: string }
  | { slug: string };

function whereByIdOrSlug(id: string): FindUniqueArgs {
  return isCuid(id) ? { id } : { slug: id };
}

// GET /api/posts/[id]  — fetch single post by id or slug, increment views
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const post = await db.post.findUnique({ where: whereByIdOrSlug(id) });
    if (!post) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    // increment views
    const updated = await db.post.update({
      where: { id: post.id },
      data: { views: { increment: 1 } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/posts/[id]  — partial update
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const existing = await db.post.findUnique({
      where: whereByIdOrSlug(id),
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const data: Prisma.PostUpdateInput = {};
    const stringFields = [
      "title",
      "slug",
      "excerpt",
      "content",
      "coverImage",
      "hexagon",
      "tags",
      "authorName",
    ] as const;
    for (const f of stringFields) {
      if (typeof body[f] === "string") data[f] = body[f] as string;
    }
    if (typeof body.excerpt === "string" && (body.excerpt as string) === "") {
      data.excerpt = null;
    }
    if (typeof body.featured === "boolean") data.featured = body.featured;
    if (typeof body.published === "boolean") data.published = body.published;
    if (typeof body.readMinutes === "number") data.readMinutes = body.readMinutes;

    const updated = await db.post.update({
      where: { id: existing.id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/posts/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.post.findUnique({
      where: whereByIdOrSlug(id),
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    await db.post.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
