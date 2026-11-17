"use server";

import { revalidatePath } from "next/cache";
import { getMaterialById, getFormQuestions } from "@/features/materials/data";
import { getActorWithPermission } from "@/server/auth/session";
import {
  insertMaterial,
  reviewMaterial,
  setMaterialVisibility,
} from "@/server/materials/library";
import type {
  CreateMaterialInput,
  MaterialActionResult,
  PracticeResult,
  ShareMaterialInput,
  SubmitPracticeInput,
} from "@/features/materials/types";
import type { MaterialKind } from "@/features/materials/types";

const allowedKinds: readonly MaterialKind[] = [
  "document",
  "link",
  "video",
  "audio",
  "form",
  "recording",
];

function failure(title: string, message: string): MaterialActionResult {
  return { ok: false, title, message };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function createMaterialAction(
  input: CreateMaterialInput,
): Promise<MaterialActionResult> {
  const actor = await getActorWithPermission("materials:write");

  if (!actor) {
    return failure(
      "Not allowed",
      "Only teachers and managers can add material to the academy library.",
    );
  }

  const title = input.title.trim();

  if (title.length < 3) {
    return failure("Missing title", "Give the material a title of at least 3 characters.");
  }

  if (!allowedKinds.includes(input.kind)) {
    return failure("Unsupported type", "Choose a supported material type.");
  }

  if (input.kind === "form") {
    const questions = (input.questions ?? []).filter((question) =>
      question.prompt.trim(),
    );

    if (!questions.length) {
      return failure(
        "Add a question",
        "A form needs at least one question before it can be shared.",
      );
    }
  }

  // The composer has no class picker: a new material goes to the library and
  // is attached to classes afterwards (share dialog).
  const materialId = `mat-${slugify(title)}-${Date.now().toString(36)}`;
  const visibility = input.visibility ?? "private";
  if (!["private", "shared", "global"].includes(visibility)) {
    return failure("Choose who sees it", "Pick private, shared with teachers, or academy library.");
  }

  const moderation = await insertMaterial(actor, {
    id: materialId,
    title,
    kind: input.kind,
    description: input.description.trim(),
    level: input.level,
    visibility,
    payload: {
      audience: input.audience,
      classId: input.classId,
      questions: input.questions ?? [],
      questionCount: input.kind === "form" ? (input.questions ?? []).length : undefined,
    },
  });

  revalidatePath("/teacher/materials");
  revalidatePath("/manager/materials");

  return {
    ok: true,
    title: "Material saved",
    message:
      moderation === "pending"
        ? `“${title}” was saved and sent to a manager for the academy library.`
        : `“${title}” was saved to your library.`,
    materialId,
  };
}

/** The author (or staff) changes who can see a material. */
export async function setMaterialVisibilityAction(input: {
  materialId: string;
  visibility: "private" | "shared" | "global";
}): Promise<MaterialActionResult> {
  const actor = await getActorWithPermission("materials:write");
  if (!actor) return failure("Not allowed", "Only teachers and staff manage materials.");
  const result = await setMaterialVisibility(actor, input.materialId, input.visibility);
  if (result.ok) {
    revalidatePath(`/teacher/materials/${input.materialId}`);
    revalidatePath("/teacher/materials");
    revalidatePath("/manager/materials");
  }
  return { ok: result.ok, title: result.ok ? "Saved" : "Not saved", message: result.message };
}

/** A manager approves or rejects a material for the academy library. */
export async function reviewMaterialAction(input: {
  materialId: string;
  approve: boolean;
  note?: string;
}): Promise<MaterialActionResult> {
  const actor = await getActorWithPermission("materials:moderate");
  if (!actor) return failure("Not allowed", "Only managers review materials.");
  const result = await reviewMaterial(actor, { id: input.materialId, approve: input.approve, note: input.note });
  if (result.ok) {
    revalidatePath("/manager/materials");
    revalidatePath(`/manager/materials/${input.materialId}`);
    revalidatePath("/materials");
  }
  return { ok: result.ok, title: result.ok ? "Done" : "Not saved", message: result.message };
}

export async function shareMaterialAction(
  input: ShareMaterialInput,
): Promise<MaterialActionResult> {
  const actor = await getActorWithPermission("materials:share");

  if (!actor) {
    return failure(
      "Not allowed",
      "Only teachers and managers can share material with students.",
    );
  }

  const material = getMaterialById(input.materialId);

  if (!material) {
    return failure("Material not found", "Reload the library and try again.");
  }

  if (input.audience === "class" && !input.classId) {
    return failure("Choose a class", "Select the class that should receive it.");
  }

  if (input.audience === "student" && !input.studentName?.trim()) {
    return failure("Choose a student", "Select the student that should receive it.");
  }

  const audienceLabel =
    input.audience === "class"
      ? input.classId
      : input.audience === "student"
        ? input.studentName
        : "Cohort";

  revalidatePath("/teacher/materials");
  revalidatePath("/materials");

  return {
    ok: true,
    title: "Material shared",
    message: `“${material.title}” is queued for ${audienceLabel}.`,
  };
}

export async function submitPracticeAction(
  input: SubmitPracticeInput,
): Promise<PracticeResult> {
  const actor = await getActorWithPermission("materials:read");

  if (!actor) {
    return {
      ok: false,
      title: "Not allowed",
      message: "Sign in as a student to start this practice.",
    };
  }

  const material = getMaterialById(input.materialId);
  const questions = getFormQuestions(input.materialId);

  if (!material || material.kind !== "form") {
    return {
      ok: false,
      title: "Practice not found",
      message: "This activity is no longer available.",
    };
  }

  if (!questions.length) {
    return {
      ok: false,
      title: "No questions yet",
      message: "Your teacher has not added questions to this form.",
    };
  }

  const answered = input.answers.filter((answer) => answer.trim()).length;

  if (answered < questions.length) {
    return {
      ok: false,
      title: "Finish every question",
      message: `You answered ${answered} of ${questions.length} questions.`,
    };
  }

  const total = questions.reduce((sum, question) => sum + question.points, 0);

  return {
    ok: true,
    title: "Practice saved",
    message: `Answers for “${material.title}” were saved (${total}/${total} points).`,
    score: total,
    total,
  };
}
