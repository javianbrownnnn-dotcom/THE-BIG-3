import { createBrowserRouter, createHashRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ChannelsPage } from "@/features/channels/ChannelsPage";
import { ChannelDetailPage } from "@/features/channels/ChannelDetailPage";
import { VideosPage } from "@/features/videos/VideosPage";
import { VideoDetailPage } from "@/features/videos/VideoDetailPage";
import { CompetitorsPage } from "@/features/competitors/CompetitorsPage";
import { IdeasPage } from "@/features/ideas/IdeasPage";
import { SopsPage } from "@/features/sops/SopsPage";
import { SopDetailPage } from "@/features/sops/SopDetailPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { CoachPage } from "@/features/coach/CoachPage";
import { SettingsPage } from "@/features/settings/SettingsPage";

// Hash routing for hosts without SPA fallback (single-file builds).
const createRouter = import.meta.env.VITE_HASH_ROUTER
  ? createHashRouter
  : createBrowserRouter;

export const router = createRouter(
  [
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <DashboardPage /> },
      { path: "/channels", element: <ChannelsPage /> },
      { path: "/channels/:id", element: <ChannelDetailPage /> },
      { path: "/videos", element: <VideosPage /> },
      { path: "/videos/:id", element: <VideoDetailPage /> },
      { path: "/competitors", element: <CompetitorsPage /> },
      { path: "/ideas", element: <IdeasPage /> },
      { path: "/sops", element: <SopsPage /> },
      { path: "/sops/:id", element: <SopDetailPage /> },
      { path: "/reports", element: <ReportsPage /> },
      { path: "/reports/:id", element: <ReportsPage /> },
      { path: "/coach", element: <CoachPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
  ],
  // Supports subpath hosting (GitHub Pages serves from /<repo>/).
  import.meta.env.VITE_HASH_ROUTER
    ? undefined
    : { basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/" },
);
