"use client";

import { useEffect } from "react";
import { useLibrary } from "@/store/library-store";
import { Header } from "@/components/library/header";
import { Footer } from "@/components/library/footer";
import { LibraryBackground } from "@/components/library/library-background";
import { HomeView } from "@/components/library/home-view";
import { LibraryView } from "@/components/library/library-view";
import { VolumeView } from "@/components/library/volume-view";
import { HexagonView } from "@/components/library/hexagon-view";
import { HexagonsOverviewView } from "@/components/library/hexagons-overview-view";
import { SearchView } from "@/components/library/search-view";
import { AboutView } from "@/components/library/about-view";
import { WriteView } from "@/components/library/write-view";
import { MarginaliaIndexView } from "@/components/library/marginalia-index-view";
import { CommandPalette } from "@/components/library/command-palette";
import { ShortcutsHelp } from "@/components/library/shortcuts-help";
import { api } from "@/lib/api";

export default function Home() {
  const { view, setView } = useLibrary();

  // Seed on first mount if library is empty (best-effort, silent)
  useEffect(() => {
    api
      .seed()
      .then(() => {})
      .catch(() => {});
  }, []);

  // Keyboard shortcuts: Cmd+6 / Ctrl+6 → Marginalia Index
  // (was Cmd+7; renumbered after removing the Babel generator view)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "6") {
        e.preventDefault();
        setView({ name: "marginalia" });
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setView]);

  return (
    <div className="relative flex min-h-screen flex-col">
      <LibraryBackground />
      <Header />
      <main className="flex-1">
        {view.name === "home" && <HomeView key="home" />}
        {view.name === "library" && <LibraryView key="library" />}
        {view.name === "volume" && <VolumeView key={`volume-${view.slug}`} slug={view.slug} />}
        {view.name === "hexagons" && <HexagonsOverviewView key="hexagons" />}
        {view.name === "hexagon" && <HexagonView key={`hexagon-${view.hexagon}`} hexagon={view.hexagon} />}
        {view.name === "search" && <SearchView key={`search-${view.query}`} initialQuery={view.query} />}
        {view.name === "about" && <AboutView key="about" />}
        {view.name === "write" && <WriteView key={`write-${view.slug || 'new'}`} slug={view.slug} />}
        {view.name === "marginalia" && <MarginaliaIndexView key="marginalia" />}
      </main>
      <Footer />
      <CommandPalette />
      <ShortcutsHelp />
    </div>
  );
}
