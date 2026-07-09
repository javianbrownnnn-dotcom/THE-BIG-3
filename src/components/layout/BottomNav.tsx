import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Archive,
  Bot,
  Clapperboard,
  Film,
  ListTodo,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  MoreHorizontal,
  Settings,
  Swords,
  Tv,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/studio", label: "Studio", icon: Film },
  { to: "/production", label: "Production", icon: Clapperboard },
  { to: "/ideas", label: "Ideas", icon: Lightbulb },
] as const;

const MORE = [
  { to: "/videos", label: "Videos", icon: Video },
  { to: "/competitors", label: "Competitors", icon: Swords },
  { to: "/vault", label: "Vault", icon: Archive },
  { to: "/channels", label: "Channels", icon: Tv },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/sops", label: "SOPs", icon: ListChecks },
  { to: "/coach", label: "AI Coach", icon: Bot },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

/**
 * Native-feeling bottom tab bar for phones (hidden md+ where the sidebar
 * takes over). The four everyday sections are one thumb-tap away; everything
 * else lives in a More sheet. The active tab is tinted with the primary color.
 */
export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const moreActive = MORE.some((m) => pathname.startsWith(m.to));

  const tabClass = (active: boolean) =>
    cn(
      "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
      active ? "text-primary" : "text-muted-foreground",
    );

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch">
          {TABS.map(({ to, label, icon: Icon, ...rest }) => (
            <NavLink
              key={to}
              to={to}
              end={"end" in rest ? rest.end : false}
              className={({ isActive }) => tabClass(isActive)}
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              {label}
            </NavLink>
          ))}
          <button className={tabClass(moreActive)} onClick={() => setMoreOpen(true)}>
            <MoreHorizontal className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>

      {/* More sheet — the remaining sections in a thumb-friendly grid */}
      <DialogPrimitive.Root open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t bg-card p-4 pb-8 outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
          >
            <DialogPrimitive.Title className="sr-only">More sections</DialogPrimitive.Title>
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-muted" />
            <div className="grid grid-cols-4 gap-2">
              {MORE.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 text-[11px] font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </NavLink>
              ))}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
