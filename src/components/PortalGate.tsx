"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DatabaseZap, RefreshCw, UserX } from "lucide-react";
import type { Role } from "@/types";
import { useUrvara } from "@/components/providers/UrvaraProvider";
import { Button, EmptyState, Skeleton } from "@/components/ui/primitives";

/**
 * Loads data for a portal and enforces the role boundary in the UI. Real
 * enforcement lives in firestore.rules; this only routes people correctly.
 */
export function PortalGate({ role, children, fallback }: { role: Role; children: ReactNode; fallback: ReactNode }) {
  const { status, error, session, sessionReady, user, state, reload, reset, signOut, repo } = useUrvara();
  const router = useRouter();

  useEffect(() => {
    if (!sessionReady) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (status === "ready" && state && !user) {
      void signOut().then(() => router.replace("/login"));
      return;
    }
    if (user && user.role !== role) router.replace(user.role === "owner" ? "/owner" : "/farmer");
  }, [sessionReady, session, status, state, user, role, router, signOut]);

  if (status === "error") {
    return (
      <div className="mx-auto max-w-lg p-6 pt-24">
        <EmptyState icon={DatabaseZap} title="Farm data could not be loaded" action={<Button icon={RefreshCw} onClick={reload}>Try again</Button>}>
          {error ?? "Something went wrong while loading."} Nothing you entered has been lost.
        </EmptyState>
      </div>
    );
  }
  if (status === "empty") {
    return (
      <div className="mx-auto max-w-lg p-6 pt-24">
        <EmptyState
          icon={DatabaseZap}
          title="No data in Firestore yet"
          action={
            user?.role === "owner" || !user ? (
              <Button icon={RefreshCw} onClick={() => void reset()}>
                Load the demo scenario
              </Button>
            ) : undefined
          }
        >
          {error} Source: {repo.source === "live" ? "Firebase Firestore" : "browser demo store"}.
        </EmptyState>
      </div>
    );
  }
  if (!sessionReady || status === "loading" || !state || !user || user.role !== role) return <>{fallback}</>;
  if (user.status === "deactivated") {
    return (
      <div className="mx-auto max-w-lg p-6 pt-24">
        <EmptyState icon={UserX} title="This account is deactivated" action={<Button onClick={() => void signOut().then(() => router.replace("/login"))}>Back to sign in</Button>}>
          Contact the farm owner if you think this is a mistake.
        </EmptyState>
      </div>
    );
  }
  return <>{children}</>;
}

export function ContentSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
