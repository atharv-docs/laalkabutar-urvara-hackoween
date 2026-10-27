import { Suspense } from "react";
import type { Metadata } from "next";
import { ContentSkeleton } from "@/components/PortalGate";
import { PerformanceView } from "@/components/owner/PerformanceView";

export const metadata: Metadata = { title: "Performance & Rupee Score" };

export default function PerformancePage() {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <PerformanceView />
    </Suspense>
  );
}
