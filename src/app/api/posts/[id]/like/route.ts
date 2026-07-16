import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// A Prisma cuid starts with 'c' and is ~24 base36 chars.
function isCuid(id: string): boolean {
  return /^c[a-z0-9]{20,30}$/i.test(id);
}

// POST /api/posts/[id]/like  — increment likes by 1
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.post.findUnique({
      where: isCuid(id) ? { id } : { slug: id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const updated = await db.post.update({
      where: { id: existing.id },
      data: { likes: { increment: 1 } },
    });

    return NextResponse.json({ likes: updated.likes });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
