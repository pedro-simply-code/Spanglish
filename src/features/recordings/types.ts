export type StoredClassRecording = {
  id: string;
  classId: string;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  classTopic: string | null;
  classStartsAt: string;
  teacherName: string;
  students: { id: string; name: string }[];
  source: "egress" | "browser";
  status: "recording" | "uploading" | "ready" | "failed";
  /** Where the file lives: Backblaze B2 or the server disk. */
  storage?: "b2" | "local";
  /** Why it failed (shown to the teacher). */
  error?: string | null;
  /** Null until the recording is ready. */
  downloadUrl: string | null;
};
