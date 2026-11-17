export type VocabWord = {
  id: string;
  term: string;
  translation: string;
  example: string;
  category: "Everyday" | "Work" | "Travel" | "Food";
};

export const words: VocabWord[] = [
  {
    id: "1",
    term: "¿Cómo estás?",
    translation: "How are you?",
    example: "¿Cómo estás? I haven't seen you in a while.",
    category: "Everyday",
  },
  {
    id: "2",
    term: "Te llamo luego",
    translation: "I'll call you later",
    example: "Te llamo luego after the meeting.",
    category: "Work",
  },
  {
    id: "3",
    term: "Vamos al lunch",
    translation: "Let's go to lunch",
    example: "Vamos al lunch at the new spot downtown.",
    category: "Food",
  },
  {
    id: "4",
    term: "El meeting",
    translation: "The meeting",
    example: "El meeting starts at 10, don't be late.",
    category: "Work",
  },
  {
    id: "5",
    term: "¿Dónde queda?",
    translation: "Where is it located?",
    example: "¿Dónde queda el hotel?",
    category: "Travel",
  },
  {
    id: "6",
    term: "Un break",
    translation: "A break",
    example: "Let's take un break and grab coffee.",
    category: "Everyday",
  },
  {
    id: "7",
    term: "La renta",
    translation: "The rent",
    example: "La renta is due at the end of the month.",
    category: "Everyday",
  },
  {
    id: "8",
    term: "Un coffee",
    translation: "A coffee",
    example: "Want un coffee before we start?",
    category: "Food",
  },
];
