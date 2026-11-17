import { redirect } from "next/navigation";

/** Packages go live when marked Live — no separate publish step. */
export default function AdminCommercePublishRedirect() {
  redirect("/admin/commerce/packages");
}