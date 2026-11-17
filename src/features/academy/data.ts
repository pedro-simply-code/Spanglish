import { suggestedPackageId } from "@/lib/pricing-package-schema";

export type ClassDuration = 25 | 50;
export type ClassType = "one-on-one" | "paired";
export type PackageSize = 30 | 60 | 90;

export type AcademyPlan = {
  id: string;
  type: ClassType;
  duration: ClassDuration;
  classes: PackageSize;
  name: string;
  label: string;
  description: string;
  pricePerClass: number;
  total: number;
  perStudentTotal: number | null;
  perStudentPerClass: number | null;
  savings: number;
};

const packageSizes: PackageSize[] = [30, 60, 90];
const classTypes: ClassType[] = ["one-on-one", "paired"];
const classDurations: ClassDuration[] = [25, 50];

const prices: Record<
  ClassType,
  Record<ClassDuration, Record<PackageSize, number>>
> = {
  "one-on-one": {
    25: { 30: 16, 60: 12, 90: 11 },
    50: { 30: 23, 60: 17, 90: 16 },
  },
  paired: {
    25: { 30: 24, 60: 18, 90: 16 },
    50: { 30: 34, 60: 26, 90: 23 },
  },
};

function getPlanName(type: ClassType, classes: PackageSize) {
  if (type === "paired") {
    if (classes === 30) return "Paired starter";
    if (classes === 60) return "Paired progress";
    return "Paired fluency";
  }

  if (classes === 30) return "Starter support";
  if (classes === 60) return "Steady progress";
  return "Fluency builder";
}

function getPlanLabel(classes: PackageSize) {
  if (classes === 30) return "Starter";
  if (classes === 60) return "Most popular";
  return "Best value";
}

function getPlanDescription(type: ClassType, classes: PackageSize) {
  const audience = type === "paired" ? "each student" : "you";

  if (classes === 30) {
    return `Try live classes or get focused help in one area, with ${audience} keeping a light schedule.`;
  }

  if (classes === 60) {
    return `Two classes a week so ${audience} can build steady, lasting progress.`;
  }

  return `Three classes a week for faster fluency gains and stronger long-term retention.`;
}

function createPlan(
  type: ClassType,
  duration: ClassDuration,
  classes: PackageSize,
): AcademyPlan {
  const pricePerClass = prices[type][duration][classes];
  const starterPrice = prices[type][duration][30];
  const total = pricePerClass * classes;

  return {
    id: suggestedPackageId({ classType: type, durationMinutes: duration, credits: classes }),
    type,
    duration,
    classes,
    name: getPlanName(type, classes),
    label: getPlanLabel(classes),
    description: getPlanDescription(type, classes),
    pricePerClass,
    total,
    perStudentTotal: type === "paired" ? total / 2 : null,
    perStudentPerClass: type === "paired" ? pricePerClass / 2 : null,
    savings: Math.round(((starterPrice - pricePerClass) / starterPrice) * 100),
  };
}

export const academyPlans: AcademyPlan[] = classTypes.flatMap((type) =>
  classDurations.flatMap((duration) =>
    packageSizes.map((classes) => createPlan(type, duration, classes)),
  ),
);

export const defaultPlan = createPlan("one-on-one", 25, 60);

export function findPlanById(plans: AcademyPlan[], id: string | null | undefined) {
  if (!id) return undefined;
  const normalized = id.replace(/^one-on-one-/, "individual-");
  return plans.find((plan) => plan.id === id || plan.id === normalized);
}

/** @deprecated Prefer DB-backed plans passed into client components. */
export function getPlanById(id: string | null | undefined) {
  return findPlanById(academyPlans, id);
}

export function selectPlanByChoice(
  plans: AcademyPlan[],
  type: ClassType,
  duration: ClassDuration,
  classes: PackageSize,
): AcademyPlan {
  return (
    findPlanById(plans, `${type}-${duration}-${classes}`) ??
    plans[0] ??
    defaultPlan
  );
}

export function getPlanBySelection(
  type: ClassType,
  duration: ClassDuration,
  classes: PackageSize,
): AcademyPlan {
  return selectPlanByChoice(academyPlans, type, duration, classes);
}

export function formatMoney(value: number) {
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

export type Teacher = {
  id: string;
  name: string;
  country: string;
  specialty: string;
  rating: number;
  reviews: number;
  classesTaught: number;
  bio: string;
  avatar: string;
  tags: string[];
};

export const teachers: Teacher[] = [
  {
    id: "maria",
    name: "María González",
    country: "Madrid, Spain",
    specialty: "Conversation and pronunciation",
    rating: 4.9,
    reviews: 312,
    classesTaught: 1840,
    bio: "Friendly, patient and focused on getting you talking from the first minute.",
    avatar: "/images/profile/user-2.jpg",
    tags: ["Conversation", "Pronunciation", "Beginner friendly"],
  },
  {
    id: "carlos",
    name: "Carlos Mendoza",
    country: "Mexico City, Mexico",
    specialty: "Grammar and exam preparation",
    rating: 4.8,
    reviews: 246,
    classesTaught: 1520,
    bio: "Clear explanations and practical exercises that make grammar finally click.",
    avatar: "/images/profile/user-3.jpg",
    tags: ["Grammar", "Exam prep", "Structured"],
  },
  {
    id: "lucia",
    name: "Lucía Fernández",
    country: "Bogotá, Colombia",
    specialty: "Business and professional Spanish",
    rating: 5,
    reviews: 198,
    classesTaught: 1210,
    bio: "Helps professionals present, negotiate and network confidently in Spanish.",
    avatar: "/images/profile/user-4.jpg",
    tags: ["Business", "Interviews", "Presentations"],
  },
  {
    id: "diego",
    name: "Diego Ramírez",
    country: "Buenos Aires, Argentina",
    specialty: "Travel, culture and slang",
    rating: 4.9,
    reviews: 174,
    classesTaught: 980,
    bio: "Travel stories, local expressions and a relaxed pace for real-life practice.",
    avatar: "/images/profile/user-5.jpg",
    tags: ["Travel", "Culture", "Slang"],
  },
];

export type ScheduledClass = {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar: string;
  date: string;
  shortDate: string;
  time: string;
  duration: ClassDuration;
  type: ClassType;
  topic: string;
};

export const nextClass: ScheduledClass = {
  id: "class-1001",
  teacherId: "maria",
  teacherName: "María González",
  teacherAvatar: "/images/profile/user-2.jpg",
  date: "Tuesday, November 17",
  shortDate: "Tue, Nov 17",
  time: "18:00",
  duration: 25,
  type: "one-on-one",
  topic: "Everyday conversation",
};

export const upcomingClasses: ScheduledClass[] = [
  nextClass,
  {
    id: "class-1002",
    teacherId: "carlos",
    teacherName: "Carlos Mendoza",
    teacherAvatar: "/images/profile/user-3.jpg",
    date: "Thursday, November 19",
    shortDate: "Thu, Nov 19",
    time: "09:30",
    duration: 25,
    type: "one-on-one",
    topic: "Past tense review",
  },
];

export const activePackage = {
  plan: defaultPlan,
  classesUsed: 2,
  classesRemaining: 58,
  renewalDate: "December 16, 2026",
};

export type ScheduleSlot = {
  time: string;
  available: boolean;
};

export type ScheduleDay = {
  id: string;
  weekday: string;
  day: string;
  month: string;
  fullDate: string;
  slots: ScheduleSlot[];
};

const baseTimes = [
  "08:00",
  "09:30",
  "11:00",
  "13:30",
  "15:00",
  "16:30",
  "18:00",
  "19:30",
];

function createSlots(booked: string[] = []): ScheduleSlot[] {
  return baseTimes.map((time) => ({
    time,
    available: !booked.includes(time),
  }));
}

export const scheduleDays: ScheduleDay[] = [
  {
    id: "2026-11-17",
    weekday: "Tue",
    day: "17",
    month: "Nov",
    fullDate: "Tuesday, November 17",
    slots: createSlots(["11:00", "18:00"]),
  },
  {
    id: "2026-11-18",
    weekday: "Wed",
    day: "18",
    month: "Nov",
    fullDate: "Wednesday, November 18",
    slots: createSlots(["09:30"]),
  },
  {
    id: "2026-11-19",
    weekday: "Thu",
    day: "19",
    month: "Nov",
    fullDate: "Thursday, November 19",
    slots: createSlots(["15:00"]),
  },
  {
    id: "2026-11-20",
    weekday: "Fri",
    day: "20",
    month: "Nov",
    fullDate: "Friday, November 20",
    slots: createSlots(),
  },
  {
    id: "2026-11-21",
    weekday: "Sat",
    day: "21",
    month: "Nov",
    fullDate: "Saturday, November 21",
    slots: createSlots(["08:00", "09:30"]),
  },
  {
    id: "2026-11-22",
    weekday: "Sun",
    day: "22",
    month: "Nov",
    fullDate: "Sunday, November 22",
    slots: createSlots(),
  },
  {
    id: "2026-11-23",
    weekday: "Mon",
    day: "23",
    month: "Nov",
    fullDate: "Monday, November 23",
    slots: createSlots(["16:30"]),
  },
];

export const timeZone = "EST (UTC-5)";

export const lessonFocusOptions = [
  "Conversation practice",
  "Grammar review",
  "Travel Spanish",
  "Business Spanish",
  "Exam preparation",
];
