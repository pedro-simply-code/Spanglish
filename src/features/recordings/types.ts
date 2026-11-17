export type StoredClassRecording = {
  id: string;
  classId: string;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  classTopic: string | null;
  teacherName: string;
  source: "egress" | "browser";
  status: "recording" | "uploading" | "ready" | "failed";
  /** Null until the recording is ready. */
  downloadUrl: string | null;
};
