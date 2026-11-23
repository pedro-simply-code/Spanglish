import { redirect } from "next/navigation";

/** Moved into the student's "Mis clases" section. */
export default function Page() {
  redirect("/classes?tab=lessons");
}
