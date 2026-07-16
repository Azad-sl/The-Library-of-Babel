import { createHmac } from "crypto";

/**
 * 后端认证工具 —— 馆长口令验证 + HMAC 签名 token
 *
 * 安全模型：
 * - 密码存在环境变量 ADMIN_PASSWORD（前端不可见）
 * - 登录成功后签发一个带过期时间的 token (HMAC-SHA256)
 * - 所有写操作 API 必须携带有效 token
 * - token 有效期 7 天，过期需重新登录
 *
 * 这不是 OAuth/JWT 级别的方案，但对个人博客足够：
 * 即使别人知道前端口令页，没有真实密码就无法获取 token，
 * 也就无法调用受保护的 API。
 */

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) {
    // Fall back to a deterministic value in dev — NEVER rely on this in prod
    return "dev-only-insecure-secret";
  }
  return s;
}

function getPassword(): string {
  return process.env.ADMIN_PASSWORD || "babel";
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** 签发一个新 token：base64url(payload).base64url(signature) */
export function issueToken(): string {
  const payload = JSON.stringify({ exp: Date.now() + TOKEN_TTL_MS });
  const enc = b64url(payload);
  return `${enc}.${sign(enc)}`;
}

/**
 * 验证 token 是否有效（签名正确 + 未过期）。
 * 返回 true 表示有效。
 */
export function verifyToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [enc, sig] = parts;
  // Constant-time-ish comparison
  const expected = sign(enc);
  if (sig.length !== expected.length) return false;
  if (sig !== expected) return false;
  try {
    const payload = JSON.parse(
      Buffer.from(enc, "base64url").toString("utf8")
    ) as { exp?: number };
    if (typeof payload.exp !== "number") return false;
    if (Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

/** 校验明文口令是否正确 */
export function checkPassword(input: string): boolean {
  const expected = getPassword();
  if (!input) return false;
  if (input.length !== expected.length) return false;
  // Simple constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * 从 Request 中提取并验证管理员 token。
 * - 先看 Authorization: Bearer <token>
 * - 再看 x-admin-token cookie / header
 * 返回 true 表示通过。
 */
export function requireAdmin(request: Request): boolean {
  let token: string | null = null;
  const auth = request.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    token = auth.slice(7).trim();
  }
  if (!token) {
    token = request.headers.get("x-admin-token");
  }
  return verifyToken(token);
}
