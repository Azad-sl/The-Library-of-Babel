import { NextRequest } from "next/server";
import { db } from "@/lib/db";

// Atom 1.0 feed for the Babel Library.
// Spec: https://tools.ietf.org/html/rfc4287
//
// Returns the 20 most recently published volumes as an Atom <feed>.
// For posts with a coverImage, an <enclosure> (Atom) and a
// <media:content> (Media RSS) element are added so feed readers can
// render cover thumbnails. Relative cover paths (e.g. /covers/foo.jpg)
// are resolved against the request host.
// All dynamic text is escaped via escapeXml() to keep the document well-formed.

const FEED_ID = "urn:babel-library:home";
const FEED_TITLE = "巴别图书馆 · The Library of Babel";
const FEED_SUBTITLE =
  "宇宙（别人管它叫图书馆）由一个数目不定的、也许是无限的六边形回廊组成……";
const FEED_AUTHOR = { name: "图书管理员", uri: "https://babel.library/" };
const SELF_PATH = "/api/rss";
const ALT_PATH = "/";

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toIso(date: Date): string {
  return date.toISOString();
}

function entrySummary(post: {
  excerpt: string | null;
  content: string;
}): string {
  if (post.excerpt && post.excerpt.trim().length > 0) {
    return post.excerpt.trim();
  }
  const flat = post.content.replace(/\s+/g, " ").trim();
  return flat.length > 200 ? flat.slice(0, 200) + "…" : flat;
}

function entryCategories(post: {
  hexagon: string;
  tags: string;
}): { term: string }[] {
  const cats: { term: string }[] = [];
  if (post.hexagon && post.hexagon.trim()) {
    cats.push({ term: post.hexagon.trim() });
  }
  if (post.tags && post.tags.trim()) {
    for (const raw of post.tags.split(",")) {
      const term = raw.trim();
      if (term) cats.push({ term });
    }
  }
  return cats;
}

/**
 * Resolve a cover image URL (which may be a relative path like
 * `/covers/foo.jpg`) into an absolute URL using the request's host.
 * Already-absolute URLs (http(s)://, //) are returned unchanged.
 */
function resolveCoverUrl(cover: string, baseUrl: string): string {
  const trimmed = cover.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("//")) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return baseUrl.replace(/\/$/, "") + trimmed;
  }
  return baseUrl.replace(/\/$/, "") + "/" + trimmed;
}

/**
 * Infer a MIME type from the cover image extension. Defaults to
 * image/jpeg when unknown — most of the library's AI covers are JPGs.
 */
function inferMime(url: string): string {
  const m = url.toLowerCase().match(/\.(png|jpe?g|gif|webp|svg|avif)(?:\?|#|$)/);
  if (!m) return "image/jpeg";
  switch (m[1]) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "avif":
      return "image/avif";
    default:
      return "image/jpeg";
  }
}

export async function GET(req: NextRequest) {
  try {
    const posts = await db.post.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // Resolve the base URL from the request — fall back to a sane
    // default if the host header is missing (e.g. some proxies).
    const proto = req.nextUrl.protocol || "https:";
    const host = req.nextUrl.host || req.headers.get("host") || "babel.library";
    const baseUrl = `${proto}//${host}`;

    const updated =
      posts.length > 0
        ? posts.reduce<Date>(
            (latest, p) => (p.updatedAt > latest ? p.updatedAt : latest),
            posts[0]!.updatedAt
          )
        : new Date();

    const xmlDeclaration = '<?xml version="1.0" encoding="utf-8"?>';

    const head: string[] = [];
    // The media namespace lets us emit <media:content> for broader
    // reader compatibility (e.g. Feedly, Inoreader) alongside Atom's
    // native <enclosure>.
    head.push(
      `<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">`
    );
    head.push(`  <id>${escapeXml(FEED_ID)}</id>`);
    head.push(`  <title>${escapeXml(FEED_TITLE)}</title>`);
    head.push(`  <subtitle>${escapeXml(FEED_SUBTITLE)}</subtitle>`);
    head.push(`  <updated>${escapeXml(toIso(updated))}</updated>`);
    head.push(
      `  <author><name>${escapeXml(FEED_AUTHOR.name)}</name><uri>${escapeXml(FEED_AUTHOR.uri)}</uri></author>`
    );
    head.push(
      `  <link rel="self" type="application/atom+xml" href="${escapeXml(SELF_PATH)}"/>`
    );
    head.push(
      `  <link rel="alternate" type="text/html" href="${escapeXml(ALT_PATH)}"/>`
    );
    head.push(`  <generator uri="https://babel.library/">Babel Library</generator>`);

    const entries: string[] = posts.map((post) => {
      const summary = entrySummary(post);
      const cats = entryCategories(post);
      const lines: string[] = [];
      lines.push(`  <entry>`);
      lines.push(
        `    <id>${escapeXml(`urn:babel-library:post:${post.slug}`)}</id>`
      );
      lines.push(`    <title>${escapeXml(post.title)}</title>`);
      lines.push(`    <updated>${escapeXml(toIso(post.updatedAt))}</updated>`);
      lines.push(
        `    <published>${escapeXml(toIso(post.createdAt))}</published>`
      );
      lines.push(
        `    <link rel="alternate" type="text/html" href="${escapeXml(ALT_PATH)}"/>`
      );

      // Cover image — emit enclosure + media:content for readers that
      // support thumbnail previews. Length is unknown for remote
      // assets, so we send 0 (a legal value per RFC 4287 §3.4.1.1).
      const cover = post.coverImage?.trim();
      if (cover) {
        const abs = resolveCoverUrl(cover, baseUrl);
        const mime = inferMime(abs);
        lines.push(
          `    <link rel="enclosure" type="${escapeXml(mime)}" href="${escapeXml(abs)}" length="0"/>`
        );
        lines.push(
          `    <media:content url="${escapeXml(abs)}" type="${escapeXml(mime)}" medium="image"/>`
        );
      }

      for (const c of cats) {
        lines.push(`    <category term="${escapeXml(c.term)}"/>`);
      }
      if (post.authorName && post.authorName.trim()) {
        lines.push(
          `    <author><name>${escapeXml(post.authorName.trim())}</name></author>`
        );
      }
      lines.push(`    <summary type="html">${escapeXml(summary)}</summary>`);
      lines.push(`  </entry>`);
      return lines.join("\n");
    });

    const body = [...head, ...entries, "</feed>"].join("\n");
    const xml = `${xmlDeclaration}\n${body}\n`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/atom+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  }
}
