import { achievements, type Achievement } from "@/features/achievements";
import { activePackage, nextClass } from "@/features/academy";
import { lessons, type Lesson } from "@/features/lessons";
import { activities } from "@/features/practice";
import { progressStats } from "@/features/progress";
import { words, type VocabWord } from "@/features/vocabulary";

export type HomeStatIcon = "flame" | "target" | "cards" | "book";
export type HomeStatColor = "primary" | "secondary" | "warning" | "success";

export type HomeStat = {
  id: string;
  title: string;
  value: string;
  helper: string;
  icon: HomeStatIcon;
  color: HomeStatColor;
};

export const dailyGoal = { completed: 18, target: 20 };
export const wordsToReview = 14;
export const lessonsThisWeek = 4;

export const liveClass = nextClass;
export const livePackage = activePackage;

const streak = progressStats.find((stat) => stat.title === "Day streak");

export const homeStats: HomeStat[] = [
  {
    id: "streak",
    title: "Day streak",
    value: streak?.value ?? "0",
    helper: streak?.helper ?? "days in a row",
    icon: "flame",
    color: "primary",
  },
  {
    id: "goal",
    title: "Daily goal",
    value: `${dailyGoal.completed}/${dailyGoal.target}`,
    helper: "minutes today",
    icon: "target",
    color: "secondary",
  },
  {
    id: "review",
    title: "Words to review",
    value: `${wordsToReview}`,
    helper: "due today",
    icon: "cards",
    color: "warning",
  },
  {
    id: "lessons",
    title: "Lessons this week",
    value: `${lessonsThisWeek}`,
    helper: "keep the momentum",
    icon: "book",
    color: "success",
  },
];

export type PlanTaskIcon = "cards" | "book" | "headphones";

export type PlanTask = {
  id: string;
  title: string;
  description: string;
  minutes: number;
  href: string;
  icon: PlanTaskIcon;
  done: boolean;
};

const listeningDrill = activities.find((activity) => activity.type === "Listening");

export const todayPlan: PlanTask[] = [
  {
    id: "review",
    title: "Review 10 words",
    description: "Vocabulary due today",
    minutes: 10,
    href: "/vocabulary",
    icon: "cards",
    done: true,
  },
  {
    id: "lesson",
    title: "Everyday Spanglish Phrases",
    description: "Continue your current lesson",
    minutes: 15,
    href: "/lessons",
    icon: "book",
    done: false,
  },
  {
    id: "practice",
    title: listeningDrill?.title ?? "Quick listening drill",
    description: listeningDrill
      ? `${listeningDrill.questions} questions`
      : "A short warm-up",
    minutes: 5,
    href: "/practice",
    icon: "headphones",
    done: false,
  },
];

const fallbackLesson: Lesson = {
  id: "0",
  title: "Start your first lesson",
  level: "Beginner",
  duration: "15 min",
  progress: 0,
  status: "Not started",
};

export const featuredLesson: Lesson =
  lessons.find((lesson) => lesson.status === "In progress") ??
  lessons[0] ??
  fallbackLesson;

export const reviewWords: VocabWord[] = words.slice(0, 3);

const fallbackAchievement: Achievement = {
  id: "0",
  title: "Keep learning",
  description: "Your next badge is waiting.",
  icon: "trophy",
  unlocked: false,
  progress: 0,
};

export const latestAchievement: Achievement =
  [...achievements].reverse().find((achievement) => achievement.unlocked) ??
  fallbackAchievement;

export const nextAchievement: Achievement =
  [...achievements]
    .filter((achievement) => !achievement.unlocked)
    .sort((a, b) => b.progress - a.progress)[0] ?? fallbackAchievement;
