import sharp from "sharp";
import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// One-off script: convert the 5 hex-cover PNGs (from z-ai) to JPG and
// copy them into both download/covers/ and public/covers/.
// Run with: bun run scripts/convert-hex-covers.ts

const SRC = "/tmp/hex-covers";
const DEST1 = "/home/z/my-project/download/covers";
const DEST2 = "/home/z/my-project/public/covers";

async function main() {
  const files = (await readdir(SRC)).filter((f) => f.endsWith(".png"));
  for (const f of files) {
    const src = join(SRC, f);
    const base = f.replace(/\.png$/, "");
    const jpg = `${base}.jpg`;
    const out1 = join(DEST1, jpg);
    const out2 = join(DEST2, jpg);
    const buf = await sharp(src)
      .resize(1344, 768, { fit: "cover" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    await writeFile(out1, buf);
    await writeFile(out2, buf);
    console.log(`converted ${f} -> ${jpg} (${buf.length} bytes)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
