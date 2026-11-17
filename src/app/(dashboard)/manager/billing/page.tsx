import type { Metadata } from "next";
import { BillingOverview } from "@/features/management";

export const metadata: Metadata = {
  title: "Billing",
  description: "Academy invoices, plans, and refunds",
};

export default function ManagerBillingPage() {
  return <BillingOverview />;
}
