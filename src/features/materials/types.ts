export type MaterialKind =
  | "document"
  | "link"
  | "video"
  | "audio"
  | "form"
  | "recording";

export type MaterialStatus = "draft" | "published" | "archived";

export type MaterialLevel =
  | "All levels"
  | "Beginner"
  | "Intermediate"
  | "Advanced";

export type MaterialAudience = "class" | "student" | "cohort";

export type FormQuestionType =
  | "multiple-choice"
  | "short-answer"
  | "speaking"
  | "listening";

export type FormQuestion = {
  id: string;
  type: FormQuestionType;
  prompt: string;
  options?: string[];
  correctOption?: number;
  points: number;
};

export type Material = {
  id: string;
  title: string;
  description: string;
  kind: MaterialKind;
  status: MaterialStatus;
  level: MaterialLevel;
  tags: string[];
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  /** External link or in-app destination for documents and links. */
  href?: string;
  fileName?: string;
  fileSize?: string;
  /** Length for audio, video, and recordings. */
  duration?: string;
  classId?: string;
  transcriptReady?: boolean;
  views?: number;
  questionCount?: number;
  estimatedMinutes?: number;
  /** private (author), shared (teachers and staff), global (students too). */
  visibility?: "private" | "shared" | "global";
  /** Global materials need a manager's approval. */
  moderation?: "none" | "pending" | "approved" | "rejected";
  reviewNote?: string | null;
  reviewedAt?: string | null;
};

export type MaterialGrant = {
  id: string;
  materialId: string;
  audience: MaterialAudience;
  audienceLabel: string;
  classId?: string;
  studentId?: string;
  sharedBy: string;
  sharedAt: string;
  dueAt?: string;
};

export type AssignmentStatus = "open" | "grading" | "closed";

export type Assignment = {
  id: string;
  materialId: string;
  title: string;
  audienceLabel: string;
  classId?: string;
  assignedAt: string;
  dueAt?: string;
  totalStudents: number;
  submitted: number;
  graded: number;
  status: AssignmentStatus;
};

export type SubmissionStatus = "pending" | "submitted" | "graded";

export type Submission = {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  status: SubmissionStatus;
  submittedAt?: string;
  score?: number;
  feedback?: string;
};

export type AvailabilitySlot = {
  time: string;
  booked: boolean;
};

export type AvailabilityDay = {
  day: string;
  slots: AvailabilitySlot[];
  note?: string;
};

export type StudentMaterial = {
  material: Material;
  grant: MaterialGrant;
};

export type MaterialActionResult = {
  ok: boolean;
  title: string;
  message: string;
  materialId?: string;
};

export type PracticeResult = {
  ok: boolean;
  title: string;
  message: string;
  score?: number;
  total?: number;
};

export type CreateMaterialInput = {
  visibility?: "private" | "shared" | "global";
  kind: MaterialKind;
  title: string;
  description: string;
  level: MaterialLevel;
  audience: MaterialAudience;
  classId?: string;
  dueAt?: string;
  questions?: {
    prompt: string;
    type: FormQuestionType;
    options?: string[];
    correctOption?: number;
    points?: number;
  }[];
};

export type ShareMaterialInput = {
  materialId: string;
  audience: MaterialAudience;
  classId?: string;
  studentName?: string;
  dueAt?: string;
};

export type SubmitPracticeInput = {
  materialId: string;
  answers: string[];
};
