import type { Metadata } from "next";
import { BillingOverview } from "@/features/management";
import { educatorStaticMetadata } from "@/i18n/static-page-metadata";

export const metadata: Metadata = educatorStaticMetadata("managerBilling");

export default function ManagerBillingPage() {
  return <BillingOverview />;
}
