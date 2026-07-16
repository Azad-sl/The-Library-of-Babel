import type { Metadata } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond, EB_Garamond } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/library/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-serif-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-body-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "巴别图书馆 · The Library of Babel",
  description:
    "一座由六边形回廊构成的无限图书馆——博尔赫斯式的个人博客，收录随笔、读书笔记与思辨。每一卷都是一次在书海中的漫游。",
  keywords: [
    "巴别图书馆",
    "博尔赫斯",
    "Library of Babel",
    "Borges",
    "个人博客",
    "随笔",
    "读书笔记",
    "文学",
  ],
  authors: [{ name: "图书管理员" }],
    icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "巴别图书馆 · The Library of Babel",
    description:
      "一座由六边形回廊构成的无限图书馆——博尔赫斯式的个人博客。",
    siteName: "巴别图书馆",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} ${ebGaramond.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          enableTransition
          themes={["dark", "light", "candlelight"]}
        >
          {children}
          <Toaster />
          <SonnerToaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
