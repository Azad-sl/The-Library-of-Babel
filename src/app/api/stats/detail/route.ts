import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type {
  HexagonDistribution,
  MonthlyTrendPoint,
  TagCount,
  TopPost,
  LongestPost,
} from "@/lib/types";

// GET /api/stats/detail — rich aggregate stats for the About page "ledger" visualization
export async function GET() {
  try {
    const posts = await db.post.findMany({
      where: { published: true },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        hexagon: true,
        readMinutes: true,
        views: true,
        likes: true,
        tags: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 1. Word counts — for Chinese we count characters via content.length
    const totalWords = posts.reduce((sum, p) => sum + p.content.length, 0);
    const totalReadingMinutes = posts.reduce(
      (sum, p) => sum + (p.readMinutes || 0),
      0
    );
    const avgReadingMinutes =
      posts.length > 0
        ? Math.round((totalReadingMinutes / posts.length) * 10) / 10
        : 0;

    // 2. Longest post (by character count)
    let longestPost: LongestPost | null = null;
    if (posts.length > 0) {
      const longest = [...posts].sort(
        (a, b) => b.content.length - a.content.length
      )[0];
      longestPost = {
        title: longest.title,
        slug: longest.slug,
        readMinutes: longest.readMinutes,
        wordCount: longest.content.length,
      };
    }

    // 3. Hexagon distribution
    const hexMap = new Map<string, HexagonDistribution>();
    for (const p of posts) {
      const existing = hexMap.get(p.hexagon) ?? {
        name: p.hexagon,
        count: 0,
        totalWords: 0,
        totalViews: 0,
        totalLikes: 0,
      };
      existing.count += 1;
      existing.totalWords += p.content.length;
      existing.totalViews += p.views;
      existing.totalLikes += p.likes;
      hexMap.set(p.hexagon, existing);
    }
    const hexagonDistribution = Array.from(hexMap.values()).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-Hans-CN")
    );

    // 4. Monthly trend — last 12 months (including current), even if 0 posts
    const now = new Date();
    const months: MonthlyTrendPoint[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ month, count: 0 });
    }
    const monthIndex = new Map(months.map((m, i) => [m.month, i]));
    for (const p of posts) {
      const d = new Date(p.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const idx = monthIndex.get(key);
      if (idx !== undefined) months[idx].count += 1;
    }
    const monthlyTrend = months;

    // 5. Top tags — split comma-separated, count, take top 8
    const tagMap = new Map<string, number>();
    for (const p of posts) {
      if (!p.tags) continue;
      const parts = p.tags
        .split(/[，,、]/)
        .map((t) => t.trim())
        .filter(Boolean);
      for (const t of parts) {
        tagMap.set(t, (tagMap.get(t) ?? 0) + 1);
      }
    }
    const topTags: TagCount[] = Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "zh-Hans-CN"))
      .slice(0, 8);

    // 6. Top 5 viewed & liked
    const topViewed: TopPost[] = [...posts]
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
      .map((p) => ({
        title: p.title,
        slug: p.slug,
        views: p.views,
        hexagon: p.hexagon,
      }));

    const topLiked: TopPost[] = [...posts]
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 5)
      .map((p) => ({
        title: p.title,
        slug: p.slug,
        likes: p.likes,
        hexagon: p.hexagon,
      }));

    return NextResponse.json({
      totalWords,
      totalReadingMinutes,
      avgReadingMinutes,
      longestPost,
      hexagonDistribution,
      monthlyTrend,
      topTags,
      topViewed,
      topLiked,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
