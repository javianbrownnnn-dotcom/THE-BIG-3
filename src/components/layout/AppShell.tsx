import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { CommandPalette } from "./CommandPalette";

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navigate = useNavigate();

  // Global keyboard shortcuts: ⌘K palette, g-then-key navigation.
  useEffect(() => {
    let pendingG = false;
    let gTimer: number | undefined;

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      const target = e.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;

      if (pendingG) {
        pendingG = false;
        window.clearTimeout(gTimer);
        const routes: Record<string, string> = {
          d: "/", c: "/channels", v: "/videos", x: "/competitors",
          i: "/ideas", s: "/sops", r: "/reports", a: "/coach",
        };
        const to = routes[e.key.toLowerCase()];
        if (to) {
          e.preventDefault();
          navigate(to);
        }
        return;
      }
      if (e.key.toLowerCase() === "g") {
        pendingG = true;
        gTimer = window.setTimeout(() => (pendingG = false), 800);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="md:pl-56">
        <Topbar onOpenPalette={() => setPaletteOpen(true)} />
        <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
