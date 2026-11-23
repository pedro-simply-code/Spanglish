"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { lessonSummariesEnabled, summarizeLesson } from "@/server/ai/lesson-summary";
import {
  cancelClassForActor,
  rescheduleClassForActor,
  respondToClassChangeForActor,
} from "@/features/classes/changes";
import { getClassRelation } from "@/features/classes/load";
import type {
  ClassActionResult,
  ClassRescheduleInput,
} from "@/features/classes/types";
import { getActorWithPermission } from "@/server/auth/session";
import { listFreeSlots } from "@/server/classes/availability";
import { getSessionAccess } from "@/server/classes/class-repository";
import {
  canRecordClass,
  finishBrowserUpload,
  registerLocalRecording,
  startBrowserUpload,
} from "@/server/classes/recordings";
import { saveLocalClassRecording } from "@/server/storage/local-recordings";
import { rateClass } from "@/server/teaching/ratings";
import { getRecordingStorageMode } from "@/server/storage/recordings";

export async function cancelClassAction(input: {
  classId: string;
  reason?: string;
}): Promise<ClassActionResult> {
  const actor = await getActorWithPermission("classes:cancel-own");
  if (!actor) {
    return {
      ok: false,
      title: "Not allowed",
      message: "Your account does not have permission to cancel classes.",
    };
  }

  const result = await cancelClassForActor(actor, input);
  if (result.ok) {
    revalidatePath("/classes");
    revalidatePath(`/classes/${input.classId}`);
  }
  return { ok: result.ok, title: result.title, message: result.message };
}

export async function rescheduleClassAction(
  input: ClassRescheduleInput,
): Promise<ClassActionResult> {
  const actor = await getActorWithPermission("classes:reschedule-own");
  if (!actor) {
    return {
      ok: false,
      title: "Not allowed",
      message: "Your account does not have permission to reschedule classes.",
    };
  }

  const result = await rescheduleClassForActor(actor, input);
  if (result.ok) {
    revalidatePath("/classes");
    revalidatePath(`/classes/${input.classId}`);
  }
  return { ok: result.ok, title: result.title, message: result.message };
}

export type RecordingUploadResult = {
  ok: boolean;
  title: string;
  message: string;
};

/** The partner accepts or declines a proposed paired-class time. */
export async function respondToClassChangeAction(input: {
  classId: string;
  requestId: string;
  accept: boolean;
}): Promise<ClassActionResult> {
  const actor = await getActorWithPermission("classes:reschedule-own");
  if (!actor) {
    return { ok: false, title: "Not allowed", message: "Sign in to answer this proposal." };
  }
  const result = await respondToClassChangeForActor(actor, input);
  if (result.ok) {
    revalidatePath("/classes");
    revalidatePath(`/classes/${input.classId}`);
  }
  return { ok: result.ok, title: result.title, message: result.message };
}

/** Free start times to move a class to (same teacher, both partners free). */
export async function listRescheduleSlotsAction(classId: string): Promise<string[]> {
  const actor = await getActorWithPermission("classes:reschedule-own");
  if (!actor) return [];
  const relation = await getClassRelation(classId, actor);
  const access = relation ? await getSessionAccess(classId) : null;
  if (!access || relation === "teacher") return [];
  return listFreeSlots({
    teacherId: access.row.teacherId,
    durationMinutes: access.row.durationMinutes,
    studentIds: access.participantIds,
    ignoreSessionId: classId,
  });
}

/** Local-disk recordings (RECORDING_STORAGE=local): the class teacher only. */
export async function saveClassRecordingLocalAction(
  formData: FormData,
): Promise<RecordingUploadResult> {
  const actor = await getActorWithPermission("recordings:manage");
  if (!actor) {
    return { ok: false, title: "Not allowed", message: "Only teachers can save class recordings." };
  }
  if (getRecordingStorageMode() !== "local") {
    return {
      ok: false,
      title: "Cloud mode active",
      message: "Set RECORDING_STORAGE=local to save files on the server disk.",
    };
  }

  const classId = String(formData.get("classId") ?? "").trim();
  const file = formData.get("file");
  if (!classId) return { ok: false, title: "Missing class", message: "Class id is required." };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, title: "Missing file", message: "Choose a recording file to save." };
  }
  if (file.size > 250 * 1024 * 1024) {
    return { ok: false, title: "File too large", message: "Local recordings must be 250 MB or smaller." };
  }
  if (!(await canRecordClass(actor, classId))) {
    return { ok: false, title: "Not allowed", message: "Only the class teacher can save recordings." };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  try {
    const saved = await saveLocalClassRecording({
      classId,
      userId: actor.userId,
      fileName: safeName,
      body: Buffer.from(await file.arrayBuffer()),
    });
    await registerLocalRecording({
      actor,
      classId,
      key: saved.key,
      fileName: safeName,
      sizeBytes: file.size,
      contentType: file.type || "video/webm",
    });
    revalidatePath("/teacher/recordings");
    return { ok: true, title: "Recording saved", message: "Saved on the server. It is listed in Recordings." };
  } catch {
    return { ok: false, title: "Save failed", message: "Could not write the recording to storage/recordings." };
  }
}

/** Step 1 of a B2 upload: a signed URL the browser PUTs the file to. */
export async function createRecordingUploadAction(input: {
  classId: string;
  fileName: string;
  sizeBytes: number;
  contentType: string;
}) {
  const actor = await getActorWithPermission("recordings:manage");
  if (!actor) return { ok: false as const, message: "Only teachers can save class recordings." };
  return startBrowserUpload(actor, input);
}

/** Step 2: confirm the file is in B2 and list it. */
export async function completeRecordingUploadAction(recordingId: string): Promise<RecordingUploadResult> {
  const actor = await getActorWithPermission("recordings:manage");
  if (!actor) return { ok: false, title: "Not allowed", message: "Only teachers can save class recordings." };
  const result = await finishBrowserUpload(actor, recordingId);
  if (result.ok) revalidatePath("/teacher/recordings");
  return { ok: result.ok, title: result.ok ? "Recording saved" : "Upload failed", message: result.message };
}

/** A student rates a class they took (1–5 stars, within 14 days). */
export async function rateClassAction(input: {
  classId: string;
  stars: number;
  comment?: string;
}): Promise<ClassActionResult> {
  const actor = await getActorWithPermission("classes:join-own");
  if (!actor) return { ok: false, title: "Not allowed", message: "Sign in to rate this class." };
  const result = await rateClass(actor, input);
  if (result.ok) revalidatePath(`/classes/${input.classId}`);
  return { ok: result.ok, title: result.ok ? "Rating saved" : "Could not rate", message: result.message };
}

/**
 * The teacher (or staff) asks Claude to write the class summary again, e.g.
 * when it failed or the class was too short when it ended.
 */
export async function regenerateLessonSummaryAction(classId: string): Promise<{ ok: boolean; message: string }> {
  const t = await getTranslations("student.classes.summary");
  const actor = await getActorWithPermission("classes:join-own");
  if (!actor) return { ok: false, message: t("forbidden") };
  const relation = await getClassRelation(classId, actor);
  if (relation !== "teacher" && relation !== "staff") return { ok: false, message: t("forbidden") };
  if (!lessonSummariesEnabled()) return { ok: false, message: t("notConfigured") };
  await summarizeLesson(classId, { again: true });
  revalidatePath(`/classes/${classId}`);
  return { ok: true, message: t("regenerated") };
}
