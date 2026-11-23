/** Learning data shared by server repositories and dashboard components. */

export type QuestionType = "multiple-choice" | "short-answer" | "speaking" | "listening";

export type LearningQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctOption?: number;
  points: number;
};

export type ClassVocabItem = {
  id: string;
  term: string;
  translation: string;
  example: string;
};

export type StudentWord = {
  id: string;
  term: string;
  translation: string;
  example: string;
  sourceSessionId: string | null;
  sourceTopic: string | null;
  /** Leitner box 0-5; 3+ counts as learned. */
  box: number;
  dueAt: string;
  reviewCount: number;
  correctCount: number;
  createdAt: string;
};

export type SubmissionView = {
  id: string;
  studentId: string;
  studentName: string;
  status: "submitted" | "graded";
  score: number | null;
  maxScore: number;
  feedback: string | null;
  submittedAt: string;
  gradedAt: string | null;
  answers: { questionId: string; answer: string; points?: number | null }[];
};

export type AssignmentSummary = {
  id: string;
  sessionId: string;
  classTopic: string;
  classStartsAt: string;
  materialId: string;
  title: string;
  instructions: string;
  questionCount: number;
  maxScore: number;
  dueAt: string | null;
  createdAt: string;
  teacherName: string;
  /** Teacher view: how many students were assigned / submitted / graded. */
  totalStudents: number;
  submittedCount: number;
  gradedCount: number;
  /** Student view: their own submission. */
  mySubmission: SubmissionView | null;
  /** Past its due date (decided on the server). */
  overdue: boolean;
};

export type AssignmentDetail = AssignmentSummary & {
  questions: LearningQuestion[];
  submissions: SubmissionView[];
};

export type ClassLearning = {
  vocabulary: ClassVocabItem[];
  assignments: AssignmentSummary[];
  /** Library materials attached to the class (id, title, kind, description). */
  materials: { id: string; title: string; kind: string; description: string }[];
};

/** One past class in the student's lesson history. */
export type LessonEntry = {
  id: string;
  topic: string;
  teacherName: string;
  teacherAvatar: string | null;
  startsAt: string;
  durationMinutes: number;
  classType: string;
  attended: boolean;
  minutesPresent: number;
  recap: string | null;
  homework: string | null;
  hasRecording: boolean;
  hasTranscript: boolean;
  /** Overview from Claude's class summary, in the viewer's language. */
  summary: string | null;
  vocabularyCount: number;
  assignmentCount: number;
  pendingAssignments: number;
};

export type StudentAchievement = {
  id: string;
  icon: "star" | "flame" | "medal" | "bolt" | "target" | "trophy";
  /** 0-100 */
  progress: number;
  current: number;
  goal: number;
  unlocked: boolean;
  unlockedAt: string | null;
};

export type StudentInsights = {
  classesCompleted: number;
  minutesInClass: number;
  /** Consecutive weeks (ending this week or last) with at least one class. */
  weekStreak: number;
  wordsTotal: number;
  wordsLearned: number;
  wordsDue: number;
  assignmentsPending: number;
  assignmentsSubmitted: number;
  /** Average % across graded submissions, or null. */
  averageScore: number | null;
  /** Minutes in class per day, last 7 days (oldest first), with ISO dates. */
  weeklyMinutes: { date: string; minutes: number }[];
  /** Classes per week, last 8 weeks (oldest first). */
  weeklyClasses: { weekStart: string; classes: number }[];
  achievements: StudentAchievement[];
};
