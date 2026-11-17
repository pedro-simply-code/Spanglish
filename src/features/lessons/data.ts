export type Lesson = {
  id: string;
  title: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  progress: number;
  status: "Completed" | "In progress" | "Not started";
};

export const lessons: Lesson[] = [
  {
    id: "1",
    title: "Greetings and Introductions",
    level: "Beginner",
    duration: "15 min",
    progress: 100,
    status: "Completed",
  },
  {
    id: "2",
    title: "Everyday Spanglish Phrases",
    level: "Beginner",
    duration: "20 min",
    progress: 65,
    status: "In progress",
  },
  {
    id: "3",
    title: "At the Store",
    level: "Beginner",
    duration: "18 min",
    progress: 0,
    status: "Not started",
  },
  {
    id: "4",
    title: "Talking About Work",
    level: "Intermediate",
    duration: "25 min",
    progress: 30,
    status: "In progress",
  },
  {
    id: "5",
    title: "Family and Celebrations",
    level: "Intermediate",
    duration: "22 min",
    progress: 0,
    status: "Not started",
  },
  {
    id: "6",
    title: "Slang and Expressions",
    level: "Advanced",
    duration: "30 min",
    progress: 0,
    status: "Not started",
  },
];
