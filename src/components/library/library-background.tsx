"use client";

import { useMemo } from "react";
import { HexRing } from "./hex-logo";

/**
 * The ambient background of the library — drifting dust motes
 * and slowly rotating hexagonal ornaments. Pure decoration.
 */
export function LibraryBackground() {
  const motes = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 2.5,
        dur: 10 + Math.random() * 18,
        delay: -Math.random() * 20,
        dx: (Math.random() - 0.5) * 80,
        dy: -40 - Math.random() * 80,
        opacity: 0.2 + Math.random() * 0.5,
      })),
    []
  );

  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden"
      aria-hidden
    >
      {/* paper / ink texture */}
      <div className="absolute inset-0 paper-texture dark:ink-texture" />

      {/* drifting motes */}
      {motes.map((m) => (
        <span
          key={m.id}
          className="mote absolute rounded-full bg-gold"
          style={
            {
              left: `${m.left}%`,
              top: `${m.top}%`,
              width: `${m.size}px`,
              height: `${m.size}px`,
              opacity: m.opacity,
              animationDuration: `${m.dur}s`,
              animationDelay: `${m.delay}s`,
              "--dx": `${m.dx}px`,
              "--dy": `${m.dy}px`,
              boxShadow: "0 0 4px var(--gold)",
            } as React.CSSProperties
          }
        />
      ))}

      {/* ornamental hexagon rings — large, faint */}
      <div className="absolute -right-24 -top-24 opacity-[0.12]">
        <HexRing count={8} radius={48} className="h-[260px] w-[260px]" />
      </div>
      <div className="absolute -bottom-32 -left-32 opacity-[0.10]">
        <HexRing count={10} radius={52} className="h-[320px] w-[320px] slow-spin-rev" />
      </div>
      <div className="absolute right-1/3 top-1/2 opacity-[0.06]">
        <HexRing count={6} radius={40} className="h-[200px] w-[200px] slow-spin-rev" />
      </div>
    </div>
  );
}
