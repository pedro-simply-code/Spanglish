import { redirect } from "next/navigation";

export default function AdminPeopleRedirectPage() {
  redirect("/admin/organization/users");
}