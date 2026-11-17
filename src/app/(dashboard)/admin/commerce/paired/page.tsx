import { redirect } from "next/navigation";

/** Paired catalog lives on Packages with the Paired filter. */
export default function AdminCommercePairedRedirect() {
  redirect("/admin/commerce/packages?type=paired");
}