import { lazy } from "react";
import { createBrowserRouter, createHashRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";

// Every page is its own chunk so first paint only ships the shell + the
// page being opened (recharts alone is ~390K and most pages never use it).
const page = <T extends Record<string, unknown>, K extends keyof T>(
  load: () => Promise<T>,
  name: K,
) => lazy(() => load().then((m) => ({ default: m[name] as React.ComponentType })));

const DashboardPage = page(() => import("@/features/dashboard/DashboardPage"), "DashboardPage");
const ChannelsPage = page(() => import("@/features/channels/ChannelsPage"), "ChannelsPage");
const ChannelDetailPage = page(() => import("@/features/channels/ChannelDetailPage"), "ChannelDetailPage");
const ProductionPage = page(() => import("@/features/production/ProductionPage"), "ProductionPage");
const ProductionDetailPage = page(() => import("@/features/production/ProductionDetailPage"), "ProductionDetailPage");
const StudioPage = page(() => import("@/features/studio/StudioPage"), "StudioPage");
const StudioProjectPage = page(() => import("@/features/studio/StudioProjectPage"), "StudioProjectPage");
const VaultPage = page(() => import("@/features/vault/VaultPage"), "VaultPage");
const VideoBuilderPage = page(() => import("@/features/builder/VideoBuilderPage"), "VideoBuilderPage");
const VideosPage = page(() => import("@/features/videos/VideosPage"), "VideosPage");
const VideoDetailPage = page(() => import("@/features/videos/VideoDetailPage"), "VideoDetailPage");
const CompetitorsPage = page(() => import("@/features/competitors/CompetitorsPage"), "CompetitorsPage");
const IdeasPage = page(() => import("@/features/ideas/IdeasPage"), "IdeasPage");
const SopsPage = page(() => import("@/features/sops/SopsPage"), "SopsPage");
const SopDetailPage = page(() => import("@/features/sops/SopDetailPage"), "SopDetailPage");
const TasksPage = page(() => import("@/features/tasks/TasksPage"), "TasksPage");
const CoachPage = page(() => import("@/features/coach/CoachPage"), "CoachPage");
const SettingsPage = page(() => import("@/features/settings/SettingsPage"), "SettingsPage");

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
      { path: "/production", element: <ProductionPage /> },
      { path: "/production/:id", element: <ProductionDetailPage /> },
      { path: "/production/:id/build", element: <VideoBuilderPage /> },
      { path: "/studio", element: <StudioPage /> },
      { path: "/studio/:id", element: <StudioProjectPage /> },
      { path: "/vault", element: <VaultPage /> },
      { path: "/videos", element: <VideosPage /> },
      { path: "/videos/:id", element: <VideoDetailPage /> },
      { path: "/competitors", element: <CompetitorsPage /> },
      { path: "/ideas", element: <IdeasPage /> },
      { path: "/sops", element: <SopsPage /> },
      { path: "/sops/:id", element: <SopDetailPage /> },
      { path: "/tasks", element: <TasksPage /> },
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
