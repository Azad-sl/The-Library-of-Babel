"use client";
 
import { useRouter } from "next/navigation";
import { useLibrary } from "@/store/library-store";
import { Button } from "@/components/ui/button";
import { HexLogo } from "@/components/library/hex-logo";
import { ArrowLeft, BookOpen, Hexagon } from "lucide-react";
import type { View } from "@/lib/types";
 
export default function NotFound() {
  const { setView } = useLibrary();
  const router = useRouter();
 
  // 先设好目标视图，再导航回首页，page.tsx 会从 Zustand 读到状态并渲染
  const go = (view: View) => {
    setView(view);
    router.push("/");
  };
 
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center rise-in">
      {/* 缓缓旋转的六边形 */}
      <div className="mb-8 slow-spin">
        <HexLogo size={96} glow />
      </div>
 
      {/* 404 数字 */}
      <p className="mb-2 font-body-serif text-sm uppercase tracking-[0.3em] text-gold/70">
        回廊编号 · Hex 404
      </p>
      <h1 className="font-serif-display text-6xl font-semibold text-foreground sm:text-7xl">
        未编目之卷
      </h1>
 
      {/* 博尔赫斯风引文 */}
      <blockquote className="mt-6 max-w-md border-l-2 border-gold/40 pl-4 font-body-serif text-base italic leading-relaxed text-muted-foreground">
        "也许这座图书馆是无限的，而我也因此确信——在某一条尚未有人踏足的回廊里，
        存在着一本恰好是你正在寻找的书。"
        <br />
        <span className="mt-2 block not-italic text-gold/60">
          —— 某位迷失的图书管理员
        </span>
      </blockquote>
 
      <p className="mt-6 font-body-serif text-sm text-muted-foreground">
        你误入了一条尚未编目的回廊。这里没有书架，只有回声。
      </p>
 
      {/* 操作按钮 */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button
          onClick={() => go({ name: "home" })}
          className="group rounded-full bg-gold px-6 text-ink hover:bg-gold/90"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回大厅
        </Button>
        <Button
          onClick={() => go({ name: "hexagons" })}
          variant="outline"
          className="rounded-full border-gold/40 text-foreground hover:border-gold hover:text-gold"
        >
          <Hexagon className="mr-2 h-4 w-4" />
          浏览回廊
        </Button>
        <Button
          onClick={() => go({ name: "library" })}
          variant="outline"
          className="rounded-full border-gold/40 text-foreground hover:border-gold hover:text-gold"
        >
          <BookOpen className="mr-2 h-4 w-4" />
          进入书库
        </Button>
      </div>
 
      {/* 底部装饰分割 */}
      <div className="mt-12 gold-divider">❖</div>
    </div>
  );
}
