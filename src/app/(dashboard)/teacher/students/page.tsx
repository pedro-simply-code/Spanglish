import type { Metadata } from "next";
import { TeacherStudents } from "@/features/materials";

export const metadata: Metadata = {
  title: "Students",
  description: "Teaching roster and learner goals",
};

export default function TeacherStudentsPage() {
  return <TeacherStudents />;
}
