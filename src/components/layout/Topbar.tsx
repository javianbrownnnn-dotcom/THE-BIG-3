import { useMemo } from "react";
import { Bell, LogOut, Moon, Search, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/useTheme";
import { useMarkNotificationRead, useMe, useNotifications } from "@/hooks/queries";
import { relativeTime } from "@/lib/format";
import { data, getSupabaseClient } from "@/lib/data";
import { cn } from "@/lib/utils";

export function Topbar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const { dark, toggle } = useTheme();
  const { data: me } = useMe();
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationRead();

  const unread = useMemo(
    () => (notifications ?? []).filter((n) => !n.readAt),
    [notifications],
  );

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <button
        onClick={onOpenPalette}
        className="flex h-9 w-full max-w-xs items-center gap-2 rounded-md border bg-card px-3 text-sm text-muted-foreground transition-colors hover:bg-accent/50"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search anything…</span>
        <kbd className="pointer-events-none rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        {data.isDemo && (
          <Badge variant="warning" className="mr-1 hidden sm:inline-flex">
            Demo data
          </Badge>
        )}

        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              {unread.length > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-96">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              {unread.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  {unread.length} unread
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(notifications ?? []).length === 0 && (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                Nothing yet. The learning loop will post here.
              </div>
            )}
            {(notifications ?? []).slice(0, 8).map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="flex-col items-start gap-0.5 py-2.5"
                onSelect={() => !n.readAt && markRead.mutate(n.id)}
              >
                <div className="flex w-full items-center gap-2">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 shrink-0 rounded-full",
                      n.readAt ? "bg-transparent" : "bg-primary",
                    )}
                  />
                  <span className={cn("flex-1 text-sm", !n.readAt && "font-medium")}>
                    {n.title}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {relativeTime(n.createdAt)}
                  </span>
                </div>
                {n.body && (
                  <div className="pl-3.5 text-xs text-muted-foreground">{n.body}</div>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {me?.displayName?.slice(0, 2).toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{me?.displayName ?? "You"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {data.isDemo ? (
              <DropdownMenuItem disabled>Demo user — no sign-in needed</DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => getSupabaseClient()?.auth.signOut()}>
                <LogOut /> Sign out
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
