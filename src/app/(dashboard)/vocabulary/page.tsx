import { redirect } from "next/navigation";

/** Moved into the student's "Estudiar" section. */
export default function Page() {
  redirect("/study?tab=vocabulary");
}
