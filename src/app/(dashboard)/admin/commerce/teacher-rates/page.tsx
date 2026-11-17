import { redirect } from "next/navigation";

/** Teacher pay lives under Finance; keep old URL working. */
export default function AdminCommerceTeacherRatesRedirect() {
  redirect("/admin/finance/teacher-rates");
}