export type PracticeActivity = {
  id: string;
  title: string;
  description: string;
  type: "Listening" | "Speaking" | "Reading" | "Writing";
  questions: number;
  difficulty: "Easy" | "Medium" | "Hard";
};

export const activities: PracticeActivity[] = [
  {
    id: "1",
    title: "Quick Listening Drill",
    description: "Identify common Spanglish phrases in short conversations.",
    type: "Listening",
    questions: 10,
    difficulty: "Easy",
  },
  {
    id: "2",
    title: "Pronunciation Practice",
    description: "Repeat and compare everyday expressions out loud.",
    type: "Speaking",
    questions: 8,
    difficulty: "Medium",
  },
  {
    id: "3",
    title: "Reading Comprehension",
    description: "Read short dialogues and answer context questions.",
    type: "Reading",
    questions: 12,
    difficulty: "Medium",
  },
  {
    id: "4",
    title: "Sentence Builder",
    description: "Write responses mixing English and Spanish naturally.",
    type: "Writing",
    questions: 6,
    difficulty: "Hard",
  },
];
