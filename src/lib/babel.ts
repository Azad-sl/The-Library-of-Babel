/**
 * 巴别图书馆 · 通用工具
 * --------------------------------
 * 这里只保留两个被其他组件复用的小工具：
 *   - hashSeed：把字符串散列为 32 位无符号整数（FNV-1a 变体）
 *   - libraryScale：估算图书馆总页数的展示用字符串
 *
 * 历史上这里曾实现过"巴别生成器"（确定性页面生成 / 索书号检索），
 * 现已移除——它只产生无意义的乱码，与"图书馆已写好一切"的隐喻
 * 在体验上反而是噪声。
 */

/**
 * 将字符串散列为一个 32 位无符号整数（FNV-1a 变体 + finalize）。
 * 用于把任意字符串变成稳定的伪随机种子。
 */
export function hashSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // 再来一轮，加强雪崩
  h ^= h >>> 17;
  h = Math.imul(h, 0xed5ad4bb);
  h ^= h >>> 11;
  h = Math.imul(h, 0xac4c1b51);
  h ^= h >>> 15;
  h = h >>> 0;
  return h;
}

/**
 * 估算"图书馆总页数"的可读字符串——一个近乎无限的数。
 * 仅用于展示，营造"无限"的氛围。
 */
export function libraryScale(): string {
  // 4 walls * 5 shelves * 32 volumes * 410 pages = 262,400 pages per hexagon
  // hexagons are "infinite" — we present it as 25^(40*80*410) which is astronomically large.
  return "≈ 25^(1,312,000) 页 · 一个超越可观测宇宙原子总数的数";
}
