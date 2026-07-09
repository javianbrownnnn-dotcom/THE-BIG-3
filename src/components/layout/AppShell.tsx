import { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { BottomNav } from "./BottomNav";
import { CommandPalette } from "./CommandPalette";

export function AppShell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { pathname } = useLocation();

  // A new page starts at the top — otherwise the SPA keeps the previous
  // page's scroll position and detail pages open mid-scroll.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // Landing back from the Google consent flow: confirm loudly, then clean the URL.
  useEffect(() => {
    if (!window.location.href.includes("yt=connected")) return;
    toast.success("YouTube connected ✓", {
      description: "Live analytics and publishing are on for this channel.",
      duration: 8000,
    });
    queryClient.invalidateQueries({ queryKey: ["channels"] });
    const clean = window.location.href
      .replace(/[?&]yt=connected/, (m) => (m.startsWith("?") ? "?" : ""))
      .replace(/\?$/, "");
    window.history.replaceState(null, "", clean);
  }, [queryClient]);

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
          i: "/ideas", s: "/sops", t: "/tasks", a: "/coach",
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
        {/* pb clears the phone tab bar; md+ has the sidebar instead */}
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-5 md:px-8 md:py-8">
          <Suspense
            fallback={
              <div className="flex justify-center pt-24" aria-label="Loading page">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
      <BottomNav />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
