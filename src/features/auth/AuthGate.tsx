import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { Skeleton } from "@/components/ui/skeleton";
import { getSupabaseClient } from "@/lib/data";
import { SignInPage } from "./SignInPage";
import { OnboardingPage } from "./OnboardingPage";

function CenteredLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-3 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

/**
 * Demo mode: renders the app directly.
 * Supabase mode: session → org membership → app; otherwise sign-in/onboarding.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const client = getSupabaseClient();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [hasOrg, setHasOrg] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!client) return;
    client.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = client.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setHasOrg(undefined); // re-check membership on any auth change
    });
    return () => sub.subscription.unsubscribe();
  }, [client]);

  useEffect(() => {
    if (!client || !session) return;
    let cancelled = false;
    client
      .from("organization_members")
      .select("organization_id", { count: "exact", head: true })
      .then(({ count }) => {
        if (!cancelled) setHasOrg((count ?? 0) > 0);
      });
    return () => {
      cancelled = true;
    };
  }, [client, session]);

  if (!client) return <>{children}</>; // demo mode

  if (session === undefined) return <CenteredLoading />;
  if (!session) return <SignInPage />;
  if (hasOrg === undefined) return <CenteredLoading />;
  if (!hasOrg) return <OnboardingPage onComplete={() => setHasOrg(true)} />;
  return <>{children}</>;
}
