import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/stats  — aggregate library statistics from published posts
export async function GET() {
  try {
    const [total, agg, oldest, newest, hexagonRows] = await Promise.all([
      db.post.count({ where: { published: true } }),
      db.post.aggregate({
        where: { published: true },
        _sum: { views: true, likes: true },
      }),
      db.post.findFirst({
        where: { published: true },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      db.post.findFirst({
        where: { published: true },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      db.post.findMany({
        where: { published: true },
        distinct: ["hexagon"],
        select: { hexagon: true },
      }),
    ]);

    return NextResponse.json({
      totalVolumes: total,
      totalHexagons: hexagonRows.length,
      totalViews: agg._sum.views ?? 0,
      totalLikes: agg._sum.likes ?? 0,
      oldestDate: oldest?.createdAt ?? null,
      newestDate: newest?.createdAt ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
