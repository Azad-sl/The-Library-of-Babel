/**
 * 纯前端封面生成器 —— 用 Canvas API 在浏览器里画一张文学感封面。
 *
 * 优势：
 * - 不依赖任何 AI 服务或密钥（Vercel 上零配置可用）
 * - 不写文件系统（Vercel 只读文件系统也 OK）
 * - 每篇文章的封面都独一无二：基于标题哈希决定配色、六边形位置、星点分布
 * - 立即生成（无需等待 AI 推理）
 * - 输出 base64 data URL，直接存进数据库当 coverImage 字段
 *
 * 设计语言：
 * - 深色"墨水/午夜"底
 * - 烛火金/琥珀色光晕（呼应图书馆烛火）
 * - 六边形母题（博尔赫斯图书馆的标志）
 * - 衬线字体呈现标题
 */

interface CoverParams {
  title: string;
  excerpt?: string;
  hexagon?: string;
}

/** 简单字符串哈希，用于确定性生成（同标题 → 同封面） */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 基于哈希生成 [0,1) 区间的伪随机数序列 */
function makeRng(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

/** 五套配色方案，全部符合"墨水深色 + 烛火金"基调 */
const PALETTES = [
  { bg: "#0d1117", glow: "#d4a574", accent: "#8b6f47", text: "#e8d5b7" }, // 烛火金
  { bg: "#1a0f0a", glow: "#c97b3e", accent: "#7a4a28", text: "#f0d9b5" }, // 琥珀
  { bg: "#0f1419", glow: "#a8845c", accent: "#5c4530", text: "#d4c4a8" }, // 古铜
  { bg: "#131a1f", glow: "#b8956a", accent: "#6a5238", text: "#e0d2b6" }, // 羊皮纸
  { bg: "#1c1410", glow: "#d97757", accent: "#8a3a1f", text: "#f5d4b0" }, // 落日铜
];

function drawHexagon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  rotation: number = 0
) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = rotation + (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/**
 * 主生成函数 —— 在 canvas 上绘制封面，返回 base64 data URL。
 */
export function generateCoverDataUrl({ title, excerpt, hexagon }: CoverParams): string {
  const W = 1200;
  const H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("无法创建画布上下文");
  }

  const seed = hashString(title + "|" + (hexagon || ""));
  const rng = makeRng(seed);
  const palette = PALETTES[seed % PALETTES.length];

  // === 1. 深色背景渐变 ===
  const bgGrad = ctx.createRadialGradient(
    W * (0.3 + rng() * 0.4),
    H * (0.3 + rng() * 0.4),
    0,
    W / 2,
    H / 2,
    Math.max(W, H)
  );
  bgGrad.addColorStop(0, palette.bg);
  bgGrad.addColorStop(1, "#000000");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // === 2. 远景六边形网格（淡淡的母题） ===
  ctx.strokeStyle = `${palette.accent}22`;
  ctx.lineWidth = 1;
  const hexSize = 40;
  const hexW = hexSize * Math.sqrt(3);
  const hexH = hexSize * 1.5;
  for (let row = -1; row * hexH < H + hexSize; row++) {
    for (let col = -1; col * hexW < W + hexSize; col++) {
      const x = col * hexW + (row % 2 ? hexW / 2 : 0);
      const y = row * hexH;
      drawHexagon(ctx, x, y, hexSize, 0);
      ctx.stroke();
    }
  }

  // === 3. 烛火光晕（中心偏上） ===
  const glowX = W * (0.5 + (rng() - 0.5) * 0.3);
  const glowY = H * (0.35 + (rng() - 0.5) * 0.2);
  const glowR = 280 + rng() * 120;
  const glowGrad = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowR);
  glowGrad.addColorStop(0, `${palette.glow}55`);
  glowGrad.addColorStop(0.3, `${palette.glow}22`);
  glowGrad.addColorStop(1, `${palette.glow}00`);
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);

  // === 4. 几个浮动的金色六边形（前景装饰） ===
  const fgHexCount = 3 + Math.floor(rng() * 3); // 3-5 个
  for (let i = 0; i < fgHexCount; i++) {
    const x = W * (0.1 + rng() * 0.8);
    const y = H * (0.1 + rng() * 0.8);
    const r = 30 + rng() * 50;
    const rot = rng() * Math.PI;
    const alpha = 0.15 + rng() * 0.25;
    ctx.strokeStyle = `${palette.glow}${Math.floor(alpha * 255)
      .toString(16)
      .padStart(2, "0")}`;
    ctx.lineWidth = 1.5 + rng() * 1.5;
    drawHexagon(ctx, x, y, r, rot);
    ctx.stroke();
  }

  // === 5. 星点/尘埃（呼吸感） ===
  const starCount = 80;
  for (let i = 0; i < starCount; i++) {
    const x = rng() * W;
    const y = rng() * H;
    const r = rng() * 1.2;
    const alpha = 0.1 + rng() * 0.4;
    ctx.fillStyle = `rgba(255, 240, 200, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // === 6. 顶部装饰线 + 分类标签 ===
  if (hexagon) {
    ctx.fillStyle = `${palette.glow}cc`;
    ctx.font = "500 18px 'EB Garamond', Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText(`◇  ${hexagon}  ◇`, W / 2, 60);
  }

  // === 7. 标题（自动换行，衬线字体） ===
  ctx.fillStyle = palette.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // 根据标题长度自适应字号
  const titleLen = title.length;
  let fontSize = 64;
  if (titleLen > 20) fontSize = 52;
  if (titleLen > 30) fontSize = 44;
  if (titleLen > 40) fontSize = 36;
  ctx.font = `500 ${fontSize}px 'Cormorant Garamond', 'EB Garamond', Georgia, serif`;

  // 手动换行
  const maxWidth = W * 0.8;
  const lines: string[] = [];
  let currentLine = "";
  for (const ch of title) {
    const testLine = currentLine + ch;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = ch;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  const maxLines = 3;
  const displayLines = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    const last = displayLines[maxLines - 1];
    displayLines[maxLines - 1] = last.slice(0, Math.max(0, last.length - 1)) + "…";
  }

  const lineHeight = fontSize * 1.3;
  const totalH = displayLines.length * lineHeight;
  const startY = H / 2 - totalH / 2 + lineHeight / 2;
  displayLines.forEach((line, i) => {
    // 轻微阴影增加可读性
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillText(line, W / 2, startY + i * lineHeight);
  });
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // === 8. 底部装饰线 + 摘要 ===
  if (excerpt && excerpt.trim()) {
    const ex = excerpt.trim();
    ctx.fillStyle = `${palette.text}99`;
    ctx.font = "italic 18px 'EB Garamond', Georgia, serif";
    ctx.textAlign = "center";
    const exMaxWidth = W * 0.7;
    let exDisplay = ex;
    if (ctx.measureText(exDisplay).width > exMaxWidth) {
      while (
        exDisplay.length > 0 &&
        ctx.measureText(exDisplay + "…").width > exMaxWidth
      ) {
        exDisplay = exDisplay.slice(0, -1);
      }
      exDisplay += "…";
    }
    ctx.fillText(exDisplay, W / 2, H - 60);
  }

  // 底部细线
  ctx.strokeStyle = `${palette.glow}55`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W * 0.35, H - 30);
  ctx.lineTo(W * 0.65, H - 30);
  ctx.stroke();

  // === 9. 边角微暗（vignette） ===
  const vignette = ctx.createRadialGradient(
    W / 2,
    H / 2,
    Math.min(W, H) * 0.3,
    W / 2,
    H / 2,
    Math.max(W, H) * 0.7
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.5)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  return canvas.toDataURL("image/png");
}
