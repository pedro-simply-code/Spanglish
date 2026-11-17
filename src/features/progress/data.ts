export type ProgressStat = {
  title: string;
  value: string;
  helper: string;
  color: "primary" | "success" | "warning" | "info";
};

export const progressStats: ProgressStat[] = [
  { title: "Day streak", value: "12", helper: "days in a row", color: "primary" },
  { title: "Words learned", value: "248", helper: "this month", color: "success" },
  { title: "Lessons done", value: "36", helper: "all time", color: "warning" },
  { title: "Practice time", value: "18h", helper: "last 30 days", color: "info" },
];

export type WeeklyActivity = {
  categories: string[];
  minutes: number[];
};

export const weeklyActivity: WeeklyActivity = {
  categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  minutes: [32, 48, 21, 56, 40, 64, 38],
};

export type Skill = {
  name: string;
  value: number;
};

export const skills: Skill[] = [
  { name: "Listening", value: 78 },
  { name: "Speaking", value: 62 },
  { name: "Reading", value: 86 },
  { name: "Writing", value: 54 },
];

export type Milestone = {
  id: string;
  title: string;
  date: string;
  description: string;
};

export const milestones: Milestone[] = [
  {
    id: "1",
    title: "Finished Beginner path",
    date: "Nov 12, 2026",
    description: "Completed all six beginner lessons.",
  },
  {
    id: "2",
    title: "250 word streak",
    date: "Nov 08, 2026",
    description: "Learned more than 250 vocabulary words.",
  },
  {
    id: "3",
    title: "Perfect practice week",
    date: "Nov 01, 2026",
    description: "Practiced every day for seven days.",
  },
];
