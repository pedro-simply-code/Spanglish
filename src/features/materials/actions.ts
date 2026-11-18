"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { getMaterialById } from "@/features/materials/data";
import { getActorWithPermission } from "@/server/auth/session";
import {
  insertMaterial,
  reviewMaterial,
  setMaterialVisibility,
} from "@/server/materials/library";
import type {
  CreateMaterialInput,
  MaterialActionResult,
  ShareMaterialInput,
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

type Translator = Awaited<ReturnType<typeof getTranslations>>;

const failure = (t: Translator, title: string, message: string): MaterialActionResult => ({
  ok: false,
  title: t(title),
  message: t(message),
});

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
  const t = await getTranslations("educator.materials.actions");
  const actor = await getActorWithPermission("materials:write");

  if (!actor) {
    return failure(
      t,
      "notAllowedTitle",
      "notAllowedCreate",
    );
  }

  const title = input.title.trim();

  if (title.length < 3) {
    return failure(t, "missingTitleTitle", "missingTitle");
  }

  if (!allowedKinds.includes(input.kind)) {
    return failure(t, "unsupportedTypeTitle", "unsupportedType");
  }

  if (input.kind === "form") {
    const questions = (input.questions ?? []).filter((question) =>
      question.prompt.trim(),
    );

    if (!questions.length) {
      return failure(t, "addQuestionTitle", "addQuestion");
    }
  }

  // Keep only what each question type needs; multiple choice needs two options.
  const questions =
    input.kind === "form"
      ? (input.questions ?? [])
          .filter((question) => question.prompt.trim())
          .map((question, index) => {
            const raw = (question.options ?? []).map((option) => option.trim());
            const options = raw.filter(Boolean);
            const choice = question.type === "multiple-choice" && options.length >= 2;
            // The right answer is picked among the typed options; blanks are dropped.
            const correct = Math.max(0, options.indexOf(raw[Number(question.correctOption ?? 0)] ?? ""));
            return {
              id: `q${index + 1}`,
              prompt: question.prompt.trim(),
              type: choice ? question.type : question.type === "multiple-choice" ? "short-answer" : question.type,
              options: choice ? options : undefined,
              correctOption: choice ? correct : undefined,
              points: Math.max(1, Math.min(100, Math.round(Number(question.points) || 1))),
            };
          })
      : [];

  // The composer has no class picker: a new material goes to the library and
  // is attached to classes afterwards (share dialog).
  const materialId = `mat-${slugify(title)}-${Date.now().toString(36)}`;
  const visibility = input.visibility ?? "private";
  if (!["private", "shared", "global"].includes(visibility)) {
    return failure(t, "chooseVisibilityTitle", "chooseVisibility");
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
      questions,
      questionCount: input.kind === "form" ? questions.length : undefined,
    },
  });

  revalidatePath("/teacher/materials");
  revalidatePath("/manager/materials");

  return {
    ok: true,
    title: t("savedTitle"),
    message:
      moderation === "pending"
        ? t("savedPending", { title })
        : t("savedPrivate", { title }),
    materialId,
  };
}

/** The author (or staff) changes who can see a material. */
export async function setMaterialVisibilityAction(input: {
  materialId: string;
  visibility: "private" | "shared" | "global";
}): Promise<MaterialActionResult> {
  const t = await getTranslations("educator.materials.actions");
  const actor = await getActorWithPermission("materials:write");
  if (!actor) return failure(t, "notAllowedTitle", "notAllowedManage");
  const result = await setMaterialVisibility(actor, input.materialId, input.visibility);
  if (result.ok) {
    revalidatePath(`/teacher/materials/${input.materialId}`);
    revalidatePath("/teacher/materials");
    revalidatePath("/manager/materials");
  }
  return {
    ok: result.ok,
    title: result.ok ? t("saved") : t("notSaved"),
    message: result.message,
  };
}

/** A manager approves or rejects a material for the academy library. */
export async function reviewMaterialAction(input: {
  materialId: string;
  approve: boolean;
  note?: string;
}): Promise<MaterialActionResult> {
  const t = await getTranslations("educator.materials.actions");
  const actor = await getActorWithPermission("materials:moderate");
  if (!actor) return failure(t, "notAllowedTitle", "notAllowedReview");
  const result = await reviewMaterial(actor, { id: input.materialId, approve: input.approve, note: input.note });
  if (result.ok) {
    revalidatePath("/manager/materials");
    revalidatePath(`/manager/materials/${input.materialId}`);
    revalidatePath("/materials");
  }
  return {
    ok: result.ok,
    title: result.ok ? t("done") : t("notSaved"),
    message: result.message,
  };
}

export async function shareMaterialAction(
  input: ShareMaterialInput,
): Promise<MaterialActionResult> {
  const t = await getTranslations("educator.materials.actions");
  const actor = await getActorWithPermission("materials:share");

  if (!actor) {
    return failure(t, "notAllowedTitle", "notAllowedShare");
  }

  const material = getMaterialById(input.materialId);

  if (!material) {
    return failure(t, "notFoundTitle", "notFound");
  }

  if (input.audience === "class" && !input.classId) {
    return failure(t, "chooseClassTitle", "chooseClass");
  }

  if (input.audience === "student" && !input.studentName?.trim()) {
    return failure(t, "chooseStudentTitle", "chooseStudent");
  }

  const audienceLabel =
    input.audience === "class"
      ? input.classId
      : input.audience === "student"
        ? input.studentName
        : t("cohort");
  const audience = audienceLabel ?? "";

  revalidatePath("/teacher/materials");
  revalidatePath("/materials");

  return {
    ok: true,
    title: t("sharedTitle"),
    message: t("shared", { title: material.title, audience }),
  };
}
