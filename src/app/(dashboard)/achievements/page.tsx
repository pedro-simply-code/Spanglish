import { redirect } from "next/navigation";

/** Moved into the student's "Mi progreso" section. */
export default function Page() {
  redirect("/progress?tab=achievements");
}
