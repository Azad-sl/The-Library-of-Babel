import { NextResponse } from "next/server";
import { checkPassword, issueToken, verifyToken } from "@/lib/auth";

/**
 * POST /api/auth  — 登录，验证口令后签发 token
 *   body: { password: string }
 *   200: { token: string }
 *   401: { error: "口令不对" }
 *
 * GET /api/auth   — 验证当前 token 是否仍有效（前端用）
 *   header: Authorization: Bearer <token>
 *   200: { valid: true }
 *   401: { valid: false }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      password?: string;
    };
    const password = typeof body.password === "string" ? body.password : "";
    if (!checkPassword(password)) {
      return NextResponse.json(
        { error: "口令不对" },
        { status: 401 }
      );
    }
    const token = issueToken();
    return NextResponse.json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const token = auth && auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : null;
  const valid = verifyToken(token);
  return NextResponse.json({ valid }, { status: valid ? 200 : 401 });
}
