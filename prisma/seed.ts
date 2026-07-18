/**
 * 本地种子脚本 —— 一条命令给数据库灌入十篇示例文章。
 *
 * 用法：
 *   bun run prisma/seed.ts
 *   （或：npx tsx prisma/seed.ts）
 *
 * 前置条件：
 *   1. .env 里已配置好指向 PostgreSQL 的 DATABASE_URL
 *   2. 已执行过 prisma db push（表结构已建好）
 *
 * 这个脚本是幂等的：按 slug upsert，重复跑不会产生重复文章，
 * 也不会覆盖已有文章的 views / likes / createdAt。
 */
import { PrismaClient } from "@prisma/client";
import { SEED_POSTS } from "../src/lib/seed-data";

const db = new PrismaClient();

async function main() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  let upserted = 0;

  for (let i = 0; i < SEED_POSTS.length; i++) {
    const p = SEED_POSTS[i];
    const createdAt = new Date(now - (SEED_POSTS.length - i) * 5 * dayMs);

    await db.post.upsert({
      where: { slug: p.slug },
      create: {
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
      },
      update: {
        title: p.title,
        excerpt: p.excerpt,
        content: p.content,
        coverImage: p.coverImage,
        hexagon: p.hexagon,
        featured: p.featured,
        tags: p.tags,
      },
    });
    upserted++;
    console.log(`  ✓ ${upserted.toString().padStart(2, "0")}/${SEED_POSTS.length}  ${p.title}`);
  }

  console.log(`\n✅ 播种完成：共 ${upserted} 篇卷册已写入数据库。`);
}

main()
  .catch((e) => {
    console.error("❌ 播种失败：", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
