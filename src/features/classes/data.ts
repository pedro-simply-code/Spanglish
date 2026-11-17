import { teachers } from "@/features/academy";
import type { Teacher } from "@/features/academy";
import type { LiveClass } from "@/features/classes/types";

/** Current time zone used by the academy schedule. */
export { classTimeZone, classTimeZoneLabel } from "@/lib/class-policy";

/**
 * The demo dataset is frozen at this instant so upcoming, in-progress,
 * completed, and canceled classes are all reproducible. Replace this with
 * the current time once classes come from the database.
 */
export { demoNow } from "@/lib/demo-clock";

export const liveClasses: LiveClass[] = [
  {
    id: "class-1003",
    teacherId: "maria",
    teacherName: "María González",
    teacherAvatar: "/images/profile/user-2.jpg",
    topic: "Travel Spanish warm-up",
    description:
      "A short, high-energy session to activate airport, hotel, and restaurant vocabulary before your trip.",
    type: "one-on-one",
    duration: 25,
    startsAt: "2026-11-16T20:00:00-05:00",
    timeZone: "America/New_York",
    meetingRoom: "spanglish-maria-alex",
    creditCost: 1,
    agenda: [
      "Warm-up: five travel questions",
      "Role-play: checking into a hotel",
      "Fix three pronunciation habits",
      "Mini quiz and next steps",
    ],
    outcomes: [
      "Ask for a room and clarify details",
      "Use polite requests at the airport",
      "React naturally when you do not understand",
    ],
    materials: [
      {
        title: "Travel phrases deck",
        description: "The 24 phrases we will use in class.",
        href: "/vocabulary",
      },
      {
        title: "Airport listening drill",
        description: "Five minutes of announcements and directions.",
        href: "/practice",
      },
    ],
    teacherNote:
      "Bring one real trip scenario you want to rehearse. We will use it as the final role-play.",
    materialIds: ["mat-travel-deck", "mat-airport-drill"],
    assignmentIds: ["asg-travel-quiz"],
  },
  {
    id: "class-1004",
    teacherId: "lucia",
    teacherName: "Lucía Fernández",
    teacherAvatar: "/images/profile/user-4.jpg",
    topic: "Business introductions",
    description:
      "Practice introducing yourself, your role, and your company in a professional setting.",
    type: "one-on-one",
    duration: 50,
    startsAt: "2026-11-16T09:50:00-05:00",
    timeZone: "America/New_York",
    meetingRoom: "spanglish-lucia-alex",
    creditCost: 1,
    agenda: [
      "Introduce yourself in 60 seconds",
      "Formal vs. informal register",
      "Meeting opening role-play",
      "Feedback and vocabulary recap",
    ],
    outcomes: [
      "Present your role with confidence",
      "Open a meeting and hand over the floor",
      "Use follow-up questions that sound natural",
    ],
    materials: [
      {
        title: "Business introductions",
        description: "The lesson that supports today's class.",
        href: "/lessons",
      },
      {
        title: "Professional vocabulary",
        description: "Twelve words to review after class.",
        href: "/vocabulary",
      },
    ],
    teacherNote:
      "Your class is in progress. The room stays open for a few minutes after the start.",
    materialIds: ["mat-business-intro"],
  },
  {
    id: "class-1001",
    teacherId: "maria",
    teacherName: "María González",
    teacherAvatar: "/images/profile/user-2.jpg",
    topic: "Everyday conversation",
    description:
      "A relaxed conversation class built around your week, with corrections only where they matter.",
    type: "one-on-one",
    duration: 25,
    startsAt: "2026-11-17T18:00:00-05:00",
    timeZone: "America/New_York",
    meetingRoom: "spanglish-maria-alex",
    creditCost: 1,
    agenda: [
      "Talk about your week",
      "Past tense in real stories",
      "Three corrections and a retry",
      "Set a goal for the next class",
    ],
    outcomes: [
      "Tell a short story in the past tense",
      "Use connectors to sound more natural",
      "Self-correct with a simple checklist",
    ],
    materials: [
      {
        title: "Everyday Spanglish Phrases",
        description: "The lesson connected to this class.",
        href: "/lessons",
      },
      {
        title: "Past tense practice",
        description: "A quick drill before we meet.",
        href: "/practice",
      },
    ],
    teacherNote:
      "We will spend the first five minutes on your week, then move into the past tense story.",
    assignmentIds: ["asg-past-tense"],
  },
  {
    id: "class-1002",
    teacherId: "carlos",
    teacherName: "Carlos Mendoza",
    teacherAvatar: "/images/profile/user-3.jpg",
    topic: "Past tense review",
    description:
      "A structured review of the past tense with short exercises and a guided conversation.",
    type: "one-on-one",
    duration: 25,
    startsAt: "2026-11-19T09:30:00-05:00",
    timeZone: "America/New_York",
    meetingRoom: "spanglish-carlos-alex",
    creditCost: 1,
    agenda: [
      "Check homework from the last class",
      "Regular vs. irregular past tense",
      "Guided story reconstruction",
      "Exit ticket: five sentences",
    ],
    outcomes: [
      "Choose the right past tense form",
      "Fix the three mistakes you repeat most",
      "Retell a short story without notes",
    ],
    materials: [
      {
        title: "Past tense cheat sheet",
        description: "One page with the patterns that matter.",
        href: "/lessons",
      },
    ],
    homework:
      "Write five sentences about last weekend and mark the verbs you had to think about.",
    materialIds: ["mat-past-tense-form"],
    assignmentIds: ["asg-past-tense"],
  },
  {
    id: "class-0901",
    teacherId: "carlos",
    teacherName: "Carlos Mendoza",
    teacherAvatar: "/images/profile/user-3.jpg",
    topic: "Ordering food with confidence",
    description:
      "A completed class on restaurant vocabulary, polite requests, and handling surprises on the menu.",
    type: "one-on-one",
    duration: 25,
    startsAt: "2026-11-12T18:00:00-05:00",
    timeZone: "America/New_York",
    meetingRoom: "spanglish-carlos-alex",
    creditCost: 1,
    agenda: [
      "Menu vocabulary warm-up",
      "Ordering role-play",
      "Handling allergies and changes",
      "Recap and homework",
    ],
    outcomes: [
      "Order a full meal politely",
      "Ask what a dish contains",
      "Resolve a wrong order calmly",
    ],
    materials: [
      {
        title: "Restaurant vocabulary",
        description: "Review the words from this class.",
        href: "/vocabulary",
      },
    ],
    teacherNote:
      "You improved a lot with polite requests. Keep practicing the difference between pedir and preguntar.",
    homework: "Record a 60-second restaurant order and listen back once.",
    materialIds: ["mat-restaurant-vocab", "mat-restaurant-recap"],
    recordingId: "mat-restaurant-recap",
    recap:
      "You handled the ordering role-play without switching to English. Keep the polite request frames active and rehearse the wrong-order fix once before the next class.",
    attended: true,
  },
  {
    id: "class-0902",
    teacherId: "maria",
    teacherName: "María González",
    teacherAvatar: "/images/profile/user-2.jpg",
    topic: "Pronunciation clinic",
    description:
      "A focused class on vowels, rhythm, and the sounds that make Spanish feel fast.",
    type: "one-on-one",
    duration: 50,
    startsAt: "2026-11-10T08:00:00-05:00",
    timeZone: "America/New_York",
    meetingRoom: "spanglish-maria-alex",
    creditCost: 1,
    agenda: [
      "Vowel warm-up",
      "Word stress patterns",
      "Shadowing a short dialogue",
      "Record and compare",
    ],
    outcomes: [
      "Hold cleaner vowels",
      "Stress the right syllable",
      "Speak with a steadier rhythm",
    ],
    materials: [
      {
        title: "Pronunciation clinic notes",
        description: "The sounds and drills from class.",
        href: "/lessons",
      },
    ],
    teacherNote:
      "Your rhythm is much better. Keep the shadowing routine for five minutes before each class.",
    homework: "Shadow the same dialogue three times this week.",
    recordingUrl: "https://recordings.spanglish.app/class-0902",
    materialIds: ["mat-pronunciation-notes", "mat-pronunciation-recap"],
    recordingId: "mat-pronunciation-recap",
    recap:
      "Vowels are cleaner and the rhythm is steadier. The next step is keeping the same pace when you improvise instead of reading.",
    attended: true,
  },
  {
    id: "class-0801",
    teacherId: "diego",
    teacherName: "Diego Ramírez",
    teacherAvatar: "/images/profile/user-5.jpg",
    topic: "Travel culture and slang",
    description:
      "A canceled class about regional expressions and travel culture in Argentina.",
    type: "one-on-one",
    duration: 25,
    startsAt: "2026-11-14T18:00:00-05:00",
    timeZone: "America/New_York",
    meetingRoom: "spanglish-diego-alex",
    creditCost: 1,
    agenda: [
      "Regional expressions warm-up",
      "Travel story",
      "Slang you can use safely",
      "Recap",
    ],
    outcomes: [
      "Recognize common rioplatense expressions",
      "Choose when slang is appropriate",
    ],
    materials: [
      {
        title: "Travel culture notes",
        description: "Optional reading to prepare for the new date.",
        href: "/lessons",
      },
    ],
    statusOverride: "canceled",
    cancellation: {
      by: "student",
      reason: "Schedule conflict",
      at: "2026-11-13T10:12:00-05:00",
      creditRefunded: true,
    },
  },
  {
    id: "class-0802",
    teacherId: "lucia",
    teacherName: "Lucía Fernández",
    teacherAvatar: "/images/profile/user-4.jpg",
    topic: "Interview practice",
    description:
      "A canceled class on answering behavioral interview questions in Spanish.",
    type: "one-on-one",
    duration: 50,
    startsAt: "2026-11-09T19:30:00-05:00",
    timeZone: "America/New_York",
    meetingRoom: "spanglish-lucia-alex",
    creditCost: 1,
    agenda: [
      "Interview warm-up",
      "STAR answers in Spanish",
      "Mock interview",
      "Feedback",
    ],
    outcomes: [
      "Structure an answer with STAR",
      "Describe experience precisely",
    ],
    materials: [
      {
        title: "Interview question bank",
        description: "Ten questions to prepare for the new date.",
        href: "/practice",
      },
    ],
    statusOverride: "canceled",
    cancellation: {
      by: "teacher",
      reason: "Teacher illness",
      at: "2026-11-09T12:05:00-05:00",
      creditRefunded: true,
    },
  },
];

export function getClassById(id: string | undefined) {
  if (!id) return undefined;
  return liveClasses.find((item) => item.id === id);
}

export function getTeacherForClass(item: LiveClass): Teacher | undefined {
  return teachers.find((teacher) => teacher.id === item.teacherId);
}

export const classListHref = "/classes";

export function classDetailHref(id: string) {
  return `/classes/${id}`;
}

export function classRoomHref(id: string) {
  return `/classes/${id}/room`;
}
