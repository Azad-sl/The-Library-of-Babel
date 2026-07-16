"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

interface HexLogoProps {
  className?: string;
  size?: number;
  glow?: boolean;
}

/**
 * 巴别图书馆的六边形徽标——一个内嵌书脊的六边形回廊符号。
 * Uses React useId() to generate unique gradient IDs, avoiding
 * duplicate-id issues when multiple HexLogo instances coexist on the page.
 */
export function HexLogo({ className, size = 36, glow = false }: HexLogoProps) {
  const uid = useId();
  const gradId = `hexgrad-${uid}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={cn(glow && "drop-shadow-[0_0_8px_var(--gold)]", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--gold)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      {/* outer hexagon */}
      <path
        d="M50 4 L88 26 L88 74 L50 96 L12 74 L12 26 Z"
        stroke={`url(#${gradId})`}
        strokeWidth="2.5"
        fill="none"
      />
      {/* inner hexagon */}
      <path
        d="M50 18 L76 33 L76 67 L50 82 L24 67 L24 33 Z"
        stroke="var(--gold)"
        strokeWidth="1"
        fill="none"
        opacity="0.45"
      />
      {/* book spines */}
      <rect x="34" y="44" width="4" height="22" rx="1" fill={`url(#${gradId})`} opacity="0.9" />
      <rect x="40" y="40" width="4" height="26" rx="1" fill={`url(#${gradId})`} opacity="0.75" />
      <rect x="46" y="46" width="4" height="20" rx="1" fill={`url(#${gradId})`} opacity="0.9" />
      <rect x="52" y="38" width="4" height="28" rx="1" fill={`url(#${gradId})`} opacity="0.7" />
      <rect x="58" y="43" width="4" height="23" rx="1" fill={`url(#${gradId})`} opacity="0.85" />
      {/* candle flame dot */}
      <circle cx="50" cy="30" r="2" fill="var(--gold)" className="flicker" />
    </svg>
  );
}

/** A ring of small hexagons — used as ornament. */
export function HexRing({
  className,
  count = 6,
  radius = 40,
}: {
  className?: string;
  count?: number;
  radius?: number;
}) {
  const items = Array.from({ length: count });
  return (
    <svg
      viewBox="-60 -60 120 120"
      className={cn("slow-spin", className)}
      aria-hidden
    >
      {items.map((_, i) => {
        const a = (i / count) * Math.PI * 2;
        const x = Math.cos(a) * radius;
        const y = Math.sin(a) * radius;
        return (
          <g key={i} transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI})`}>
            <path
              d="M0 -8 L7 -4 L7 4 L0 8 L-7 4 L-7 -4 Z"
              fill="none"
              stroke="var(--gold)"
              strokeWidth="1"
              opacity="0.5"
            />
          </g>
        );
      })}
    </svg>
  );
}
