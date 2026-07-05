import { useNavigate } from "react-router-dom";
import {
  Bot,
  Clapperboard,
  Clock,
  FileText,
  Lightbulb,
  LayoutDashboard,
  ListChecks,
  Settings,
  Swords,
  Tv,
  Video,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useSops, useVideos } from "@/hooks/queries";
import { getRecents } from "@/hooks/useRecents";

const PAGES = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
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

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { data: videos } = useVideos();
  const { data: sops } = useSops();

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  const recents = open ? getRecents() : [];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, videos, SOPs…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {recents.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recents.map((r) => (
                <CommandItem key={r.to} value={`recent ${r.label}`} onSelect={() => go(r.to)}>
                  <Clock />
                  {r.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}
        <CommandGroup heading="Go to">
          {PAGES.map(({ to, label, icon: Icon }) => (
            <CommandItem key={to} onSelect={() => go(to)}>
              <Icon />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Videos">
          {(videos ?? []).slice(0, 30).map((v) => (
            <CommandItem key={v.id} value={`video ${v.title}`} onSelect={() => go(`/videos/${v.id}`)}>
              <Video />
              {v.title}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="SOPs">
          {(sops ?? []).map((s) => (
            <CommandItem key={s.id} value={`sop ${s.title}`} onSelect={() => go(`/sops/${s.id}`)}>
              <ListChecks />
              {s.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
