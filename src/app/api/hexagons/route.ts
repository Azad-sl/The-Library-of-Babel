import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/hexagons  — group published posts by hexagon, count, order by count desc then name asc
export async function GET() {
  try {
    const rows = await db.post.groupBy({
      by: ["hexagon"],
      where: { published: true },
      _count: { hexagon: true },
    });

    const stats = rows
      .map((r) => ({ name: r.hexagon, count: r._count.hexagon }))
      .sort(
        (a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-Hans-CN")
      );

    return NextResponse.json(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
