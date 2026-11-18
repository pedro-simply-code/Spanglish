import { teachers } from "@/features/academy";
import { demoNow, liveClasses } from "@/features/classes/data";
import type { LiveClass } from "@/features/classes/types";

export type TeacherStudent = {
  id: string;
  name: string;
  level: string;
  goal: string;
  nextClass: string;
  /** ISO timestamp used to format the next class in the viewer's locale. */
  nextClassAt: string;
  progress: number;
};

export const teacherStudents: TeacherStudent[] = [
  {
    id: "stu-01",
    name: "Alex Rivera",
    level: "Intermediate",
    goal: "Travel conversations",
    nextClass: "Tue, Nov 17 · 18:00",
    nextClassAt: "2026-11-17T18:00:00-05:00",
    progress: 72,
  },
  {
    id: "stu-02",
    name: "Priya Shah",
    level: "Advanced",
    goal: "Business presentations",
    nextClass: "Wed, Nov 18 · 09:30",
    nextClassAt: "2026-11-18T09:30:00-05:00",
    progress: 88,
  },
  {
    id: "stu-03",
    name: "Mateo Silva",
    level: "Beginner",
    goal: "Everyday conversation",
    nextClass: "Thu, Nov 19 · 15:00",
    nextClassAt: "2026-11-19T15:00:00-05:00",
    progress: 34,
  },
  {
    id: "stu-04",
    name: "Hannah Kim",
    level: "Intermediate",
    goal: "Interview preparation",
    nextClass: "Fri, Nov 20 · 11:00",
    nextClassAt: "2026-11-20T11:00:00-05:00",
    progress: 61,
  },
];

type StudentFieldTranslator = (key: string) => string;

/** Localized copy of the demo roster for educator views. */
export function localizedTeacherStudents(t: StudentFieldTranslator): TeacherStudent[] {
  const levelKey: Record<string, string> = {
    Beginner: "beginner",
    Intermediate: "intermediate",
    Advanced: "advanced",
  };
  const goalKey: Record<string, string> = {
    "Travel conversations": "travel",
    "Business presentations": "business",
    "Everyday conversation": "everyday",
    "Interview preparation": "interview",
  };
  return teacherStudents.map((student) => ({
    ...student,
    level: t(`staff.student.level.${levelKey[student.level] ?? "beginner"}`),
    goal: t(`staff.student.goal.${goalKey[student.goal] ?? "travel"}`),
  }));
}

export const teacherFollowUps = [
  {
    id: "follow-01",
    student: "Mateo Silva",
    title: "Review past tense homework",
    due: "Today",
    priority: "high" as const,
  },
  {
    id: "follow-02",
    student: "Alex Rivera",
    title: "Share the travel phrases deck",
    due: "Tomorrow",
    priority: "normal" as const,
  },
  {
    id: "follow-03",
    student: "Hannah Kim",
    title: "Prepare mock interview questions",
    due: "Friday",
    priority: "normal" as const,
  },
];

export const managerStats = [
  { id: "students", label: "Active students", value: "214", helper: "+12 this month" },
  { id: "classes", label: "Classes this week", value: "86", helper: "94% attended" },
  { id: "revenue", label: "Monthly revenue", value: "$12,480", helper: "+8.4% vs. October" },
  { id: "utilization", label: "Teacher utilization", value: "78%", helper: "Target is 75%" },
];

export const managerEscalations = [
  {
    id: "esc-01",
    title: "Late cancellation appeal",
    owner: "Alex Rivera",
    severity: "high" as const,
    detail: "Student requests a refund outside the 24-hour window.",
  },
  {
    id: "esc-02",
    title: "Teacher availability change",
    owner: "Carlos Mendoza",
    severity: "normal" as const,
    detail: "Requests Friday afternoons off starting next month.",
  },
  {
    id: "esc-03",
    title: "Package renewal reminder",
    owner: "Priya Shah",
    severity: "low" as const,
    detail: "Two credits left and renewal is due in five days.",
  },
];

export const adminStats = [
  { id: "accounts", label: "Total accounts", value: "1,284", helper: "38 created this week" },
  { id: "sessions", label: "Active sessions", value: "96", helper: "Across web and mobile" },
  { id: "roles", label: "Role assignments", value: "1,410", helper: "126 accounts hold two or more" },
  { id: "uptime", label: "Platform uptime", value: "99.98%", helper: "Last 30 days" },
];

export const adminActivity = [
  {
    id: "act-01",
    actor: "Lucía Fernández",
    action: "Granted the Manager role to Diego Ramírez",
    at: "Today · 09:12",
  },
  {
    id: "act-02",
    actor: "Lucía Fernández",
    action: "Updated the 24-hour cancellation policy",
    at: "Yesterday · 16:40",
  },
  {
    id: "act-03",
    actor: "System",
    action: "Rotated the meeting provider signing key",
    at: "Nov 14 · 03:00",
  },
  {
    id: "act-04",
    actor: "Lucía Fernández",
    action: "Invited two teachers to the academy",
    at: "Nov 13 · 11:25",
  },
];

export function getTeacherByName(name: string) {
  return teachers.find((teacher) => teacher.name === name);
}

export function getTeacherClasses(name: string): LiveClass[] {
  const teacher = getTeacherByName(name);

  if (!teacher) {
    return liveClasses;
  }

  return liveClasses.filter((item) => item.teacherId === teacher.id);
}

export function countClassesToday(items: LiveClass[], nowIso: string = demoNow) {
  const day = nowIso.slice(0, 10);
  return items.filter((item) => item.startsAt.startsWith(day)).length;
}
