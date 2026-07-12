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
