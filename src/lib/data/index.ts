import { DemoProvider } from "./demo";
import { SupabaseProvider } from "./supabase";
import type { DataProvider } from "./provider";

// Provider selection happens exactly once, at startup:
// with Supabase credentials configured the app runs against the real backend;
// without them it runs the fully seeded demo so the product is explorable
// with zero setup.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const data: DataProvider =
  url && anonKey ? new SupabaseProvider(url, anonKey) : new DemoProvider();

/** The raw Supabase client when running against the real backend; null in demo mode. */
export function getSupabaseClient() {
  return data instanceof SupabaseProvider ? data.client : null;
}

export type { DataProvider } from "./provider";
