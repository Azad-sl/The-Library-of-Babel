import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// A Prisma cuid starts with 'c' and is ~24 base36 chars.
function isCuid(id: string): boolean {
  return /^c[a-z0-9]{20,30}$/i.test(id);
}

// GET /api/comments?postId=  — list comments for a post (id or slug), oldest first
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const postIdParam = searchParams.get("postId");

    if (!postIdParam) {
      return NextResponse.json({ error: "postId required" }, { status: 400 });
    }

    // Resolve slug → id if necessary so comments stored by real id are found.
    let postId = postIdParam;
    if (!isCuid(postIdParam)) {
      const post = await db.post.findUnique({
        where: { slug: postIdParam },
        select: { id: true },
      });
      if (!post) return NextResponse.json([]);
      postId = post.id;
    }

    const comments = await db.comment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/comments  — body { postId, name, content }
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const { postId: postIdParam, name, content } = body;

    if (!postIdParam || typeof postIdParam !== "string") {
      return NextResponse.json({ error: "postId required" }, { status: 400 });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "content required" }, { status: 400 });
    }

    // Resolve slug → id
    let postId = postIdParam;
    if (!isCuid(postIdParam)) {
      const post = await db.post.findUnique({
        where: { slug: postIdParam },
        select: { id: true },
      });
      if (!post) {
        return NextResponse.json({ error: "post not found" }, { status: 404 });
      }
      postId = post.id;
    } else {
      const exists = await db.post.findUnique({
        where: { id: postIdParam },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json({ error: "post not found" }, { status: 404 });
      }
    }

    const created = await db.comment.create({
      data: {
        postId,
        name: name.trim().slice(0, 64),
        content: content.trim(),
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
