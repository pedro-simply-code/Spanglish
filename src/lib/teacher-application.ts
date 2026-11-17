/** Teacher apply form + review (conversation vs certified tracks). */

export type TeacherApplicationTrack = "conversation" | "certified";
export type TeacherFluencyLevel = "native" | "c2" | "other";

export type TeacherApplicationCredential = {
  type: string;
  label: string;
  year?: number | null;
  url?: string | null;
};

export const teacherApplicationTracks: { id: TeacherApplicationTrack; label: string; description: string }[] = [
  {
    id: "conversation",
    label: "Conversation & practice",
    description: "Live speaking classes. Video sample required; formal teaching credentials optional.",
  },
  {
    id: "certified",
    label: "Certified / structured teaching",
    description: "Exam prep, grammar-heavy, or school-style lessons. At least one credential required.",
  },
];

export const teacherFluencyLevels: { id: TeacherFluencyLevel; label: string }[] = [
  { id: "native", label: "Native speaker" },
  { id: "c2", label: "C2 / near-native" },
  { id: "other", label: "Other (explain below)" },
];

export const credentialTypes = [
  { id: "celta", label: "CELTA / TEFL" },
  { id: "dele", label: "DELE / language diploma" },
  { id: "degree", label: "University degree (education or language)" },
  { id: "license", label: "Teaching license" },
  { id: "other", label: "Other certificate" },
] as const;

export function trackLabel(track: TeacherApplicationTrack) {
  return teacherApplicationTracks.find((item) => item.id === track)?.label ?? track;
}

export function fluencyLabel(fluency: TeacherFluencyLevel) {
  return teacherFluencyLevels.find((item) => item.id === fluency)?.label ?? fluency;
}