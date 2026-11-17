export type AchievementIcon =
  | "trophy"
  | "flame"
  | "star"
  | "bolt"
  | "target"
  | "medal";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: AchievementIcon;
  unlocked: boolean;
  unlockedOn?: string;
  progress: number;
};

export const achievements: Achievement[] = [
  {
    id: "1",
    title: "First Steps",
    description: "Complete your first lesson.",
    icon: "star",
    unlocked: true,
    unlockedOn: "Sep 04, 2026",
    progress: 100,
  },
  {
    id: "2",
    title: "On Fire",
    description: "Keep a 7-day learning streak.",
    icon: "flame",
    unlocked: true,
    unlockedOn: "Oct 18, 2026",
    progress: 100,
  },
  {
    id: "3",
    title: "Word Collector",
    description: "Learn 250 vocabulary words.",
    icon: "medal",
    unlocked: true,
    unlockedOn: "Nov 08, 2026",
    progress: 100,
  },
  {
    id: "4",
    title: "Fast Learner",
    description: "Finish three lessons in one day.",
    icon: "bolt",
    unlocked: false,
    progress: 66,
  },
  {
    id: "5",
    title: "Perfect Week",
    description: "Practice every day for two weeks.",
    icon: "target",
    unlocked: false,
    progress: 85,
  },
  {
    id: "6",
    title: "Spanglish Master",
    description: "Complete every advanced lesson.",
    icon: "trophy",
    unlocked: false,
    progress: 20,
  },
];
