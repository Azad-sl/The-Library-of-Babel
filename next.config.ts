import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel 自带构建输出格式，不需要 standalone（standalone 是给自建服务器用的）。
  // 如果以后要部署到普通 VPS / Docker，再把 output: "standalone" 加回来。
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
