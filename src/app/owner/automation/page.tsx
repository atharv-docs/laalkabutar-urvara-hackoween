import type { Metadata } from "next";
import { LiveWorkflowView } from "@/components/owner/LiveWorkflowView";

export const metadata: Metadata = { title: "Live n8n workflow" };

export default function AutomationPage() {
  return <LiveWorkflowView />;
}
