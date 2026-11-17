import type { ClassDuration, ClassType } from "@/features/academy/data";

export type LiveClassStatus =
  | "upcoming"
  | "in-progress"
  | "completed"
  | "canceled";

export type LiveClassCancellation = {
  by: "student" | "teacher" | "staff";
  reason: string;
  at: string;
  creditRefunded: boolean;
};

export type LiveClassMaterial = {
  title: string;
  description: string;
  href: string;
};

export type LiveClassParticipant = {
  userId: string;
  name: string;
  image: string | null;
  /** Joined the classroom at least once. */
  joined: boolean;
};

/** A paired-class reschedule waiting for the partner. */
export type LiveClassChangeRequest = {
  id: string;
  newStartsAt: string;
  requestedByUserId: string;
  requestedByName: string;
  expiresAt: string;
};

export type LiveClass = {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar: string;
  topic: string;
  description: string;
  type: ClassType;
  duration: ClassDuration;
  /** ISO date with an explicit offset. Dates are resolved against `demoNow`. */
  startsAt: string;
  timeZone: string;
  meetingRoom: string;
  creditCost: number;
  agenda: string[];
  outcomes: string[];
  materials: LiveClassMaterial[];
  /** Materials from the academy library attached to this class. */
  materialIds?: string[];
  /** Practice forms assigned from this class. */
  assignmentIds?: string[];
  /** Recording material produced by this class. */
  recordingId?: string;
  /** Teacher recap shown after the class. */
  recap?: string;
  teacherNote?: string;
  homework?: string;
  recordingUrl?: string;
  attended?: boolean;
  cancellation?: LiveClassCancellation;
  rescheduledFrom?: string;
  /**
   * Marks a class as canceled even when its start date is in the future.
   * Completed status is derived from the end time.
   */
  statusOverride?: "canceled";
  /** Students in the class (both partners for a paired class). */
  participants?: LiveClassParticipant[];
  pairId?: string | null;
  bookedByUserId?: string | null;
  pendingChange?: LiveClassChangeRequest | null;
};

export type JoinState = {
  status: "open" | "too-early" | "closed" | "unavailable";
  canJoin: boolean;
  opensAt: string;
  closesAt: string;
  message: string;
};

export type ClassChangeAction = "cancel" | "reschedule";

export type ClassChangeDecision = {
  allowed: boolean;
  cutoffHours: number;
  hoursUntilStart: number;
  cutoffAt: string;
  message: string;
};

export type ClassActionResult = {
  ok: boolean;
  title: string;
  message: string;
};

export type ClassroomVideoMode = "livekit" | "local";

export type LiveKitClassroomSession = {
  serverUrl: string;
  token: string;
  roomName: string;
};

export type RecordingClientConfig = {
  storage: "local" | "cloud";
  cloudReady: boolean;
  autoCloudUpload: boolean;
  serverRecordingAvailable: boolean;
};

export type ClassRescheduleInput = {
  classId: string;
  /** New start as an ISO instant (one of the free slots). */
  startsAt: string;
};
