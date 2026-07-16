import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";

// Lazy-init ZAI singleton
let zaiInstance: Awaited<ZAI> | null = null;
async function getZAI() {
  if (!zaiInstance) zaiInstance = await ZAI.create();
  return zaiInstance;
}

// Ensure output dirs exist
const PUBLIC_COVERS = path.join(process.cwd(), "public", "covers");
const DOWNLOAD_COVERS = path.join(process.cwd(), "download", "covers");

function ensureDirs() {
  if (!fs.existsSync(PUBLIC_COVERS)) fs.mkdirSync(PUBLIC_COVERS, { recursive: true });
  if (!fs.existsSync(DOWNLOAD_COVERS)) fs.mkdirSync(DOWNLOAD_COVERS, { recursive: true });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, excerpt, hexagon } = body as {
      title?: string;
      excerpt?: string;
      hexagon?: string;
    };

    if (!title?.trim()) {
      return NextResponse.json({ error: "标题不可为空" }, { status: 400 });
    }

    // Build a literary atmospheric prompt
    const subject = title.trim();
    const context = excerpt ? ` ${excerpt.slice(0, 100)}` : "";
    const gallery = hexagon ? ` in the "${hexagon}" gallery` : "";

    const prompt = [
      `Atmospheric book cover illustration for "${subject}"${gallery}.`,
      context ? `Theme: ${context}.` : "",
      "Dark moody library interior, hexagonal gallery, warm candlelight glow,",
      "golden amber light, floating dust motes, ancient leather-bound books,",
      "ink and parchment texture, Borges Library of Babel aesthetic,",
      "rich deep shadows, candle flame reflections, mysterious literary atmosphere,",
      "high quality, detailed, no text, no letters",
    ]
      .filter(Boolean)
      .join(" ");

    const zai = await getZAI();

    const response = await zai.images.generations.create({
      prompt,
      size: "1344x768",
    });

    const imageBase64 = response.data[0].base64;
    if (!imageBase64) {
      return NextResponse.json({ error: "生成失败：无图像数据" }, { status: 500 });
    }

    const buffer = Buffer.from(imageBase64, "base64");

    // Generate filename from title slug
    const slug = subject
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
    const filename = `cover-${slug}-${Date.now()}.png`;

    ensureDirs();

    // Save to both locations
    fs.writeFileSync(path.join(PUBLIC_COVERS, filename), buffer);
    fs.writeFileSync(path.join(DOWNLOAD_COVERS, filename), buffer);

    const imageUrl = `/covers/${filename}`;

    return NextResponse.json({
      success: true,
      imageUrl,
      filename,
      prompt,
      size: buffer.length,
    });
  } catch (error: any) {
    console.error("Cover generation error:", error);
    return NextResponse.json(
      { error: error?.message || "封面生成失败" },
      { status: 500 }
    );
  }
}
