import { Suspense } from "react";
import type { Metadata } from "next";
import { ContentSkeleton } from "@/components/PortalGate";
import { CropHealthView } from "@/components/owner/CropHealthView";

export const metadata: Metadata = { title: "Crop Health" };

export default function CropHealthPage() {
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <CropHealthView />
    </Suspense>
  );
}
