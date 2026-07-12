import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthGate } from "@/features/auth/AuthGate";
import { router } from "./router";
import "./index.css";

// After every deploy the hashed chunk filenames change and the old files are
// purged. A phone that cached the previous index.html then 404s on the lazy
// route imports and the page silently never renders. Vite fires
// vite:preloadError for exactly this — recover with one reload (which
// refetches the document and gets the new hashes). The timestamp guards
// against reload loops if the network itself is down.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  const KEY = "big3.chunkReloadAt";
  const last = Number(sessionStorage.getItem(KEY) ?? 0);
  if (Date.now() - last < 30_000) return;
  sessionStorage.setItem(KEY, String(Date.now()));
  window.location.reload();
});

// Self-healing updates: iOS Home-Screen web apps can freeze on an old cached
// snapshot of the site indefinitely. Even a frozen snapshot runs JS, so on
// boot and whenever the app returns to the foreground we ask the server which
// build is current (version.json, never cached) and force one cache-busting
// refresh if we're stale. The timestamp guard prevents reload loops when the
// network fetch itself serves a stale answer.
async function checkForNewBuild() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: "no-store" });
    if (!res.ok) return;
    const { build } = (await res.json()) as { build?: string };
    if (!build || build === __BUILD_STAMP__) return;
    const KEY = "big3.updateReloadAt";
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 120_000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
    const url = new URL(window.location.href);
    url.searchParams.set("u", Date.now().toString(36));
    window.location.replace(url.toString());
  } catch {
    // Offline or blocked — never break the app over an update check.
  }
}
checkForNewBuild();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") void checkForNewBuild();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <AuthGate>
          <RouterProvider router={router} />
        </AuthGate>
        <Toaster position="bottom-right" theme="system" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);

// Register the service worker for install + offline shell. Skipped in the
// single-file artifact build (no sw.js is served there) and in dev.
if (
  "serviceWorker" in navigator &&
  import.meta.env.PROD &&
  !import.meta.env.VITE_HASH_ROUTER
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {
        /* install/offline is a progressive enhancement — ignore failures */
      });
  });
}
