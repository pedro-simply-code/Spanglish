"use client";

import Chip from "@mui/material/Chip";
import { useTranslations } from "next-intl";
import type { AssignmentSummary } from "@/lib/learning-types";

/** Student's status for one practice form: to do, late, sent, or graded with score. */
export function AssignmentStatusChip({ assignment }: { assignment: AssignmentSummary }) {
  const t = useTranslations("student.learn.status");
  const submission = assignment.mySubmission;
  if (submission?.status === "graded") {
    return (
      <Chip
        size="small"
        color="success"
        label={t("graded", { score: submission.score ?? 0, total: submission.maxScore })}
      />
    );
  }
  if (submission) return <Chip size="small" color="info" variant="outlined" label={t("submitted")} />;
  const late = assignment.overdue;
  return (
    <Chip
      size="small"
      color={late ? "error" : "warning"}
      variant={late ? "filled" : "outlined"}
      label={late ? t("late") : t("todo")}
    />
  );
}
