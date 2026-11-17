import type { Metadata } from "next";
import { IntegrationsOverview } from "@/features/management";
import { buildIntegrationStatuses } from "@/server/admin/insights";

export const metadata: Metadata = {
  title: "Integrations",
  description: "Meeting, email, storage, and payment providers",
};

export default function AdminPlatformIntegrationsPage() {
  return <IntegrationsOverview integrations={buildIntegrationStatuses()} />;
}