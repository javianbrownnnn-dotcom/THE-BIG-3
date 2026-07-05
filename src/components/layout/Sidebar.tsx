import { NavLink } from "react-router-dom";
import {
  Bot,
  Clapperboard,
  FileText,
  Lightbulb,
  LayoutDashboard,
  ListChecks,
  Settings,
  Swords,
  Tv,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrg } from "@/hooks/queries";

export const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/production", label: "Production", icon: Clapperboard },
  { to: "/channels", label: "Channels", icon: Tv },
  { to: "/videos", label: "Videos", icon: Video },
  { to: "/competitors", label: "Competitors", icon: Swords },
  { to: "/ideas", label: "Ideas", icon: Lightbulb },
  { to: "/sops", label: "SOPs", icon: ListChecks },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/coach", label: "AI Coach", icon: Bot },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { data: org } = useOrg();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r bg-card/50 md:flex">
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          B3
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-tight">
            {org?.name ?? "The Big 3"}
          </div>
          <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Operating System
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t px-5 py-3 text-[11px] leading-relaxed text-muted-foreground">
        Collect → Analyze → Learn → Update SOPs → Repeat
      </div>
    </aside>
  );
}
