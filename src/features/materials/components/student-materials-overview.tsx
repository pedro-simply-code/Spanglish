import Box from "@mui/material/Box";
import { getTranslations } from "next-intl/server";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { StudentMaterialsBoard } from "@/features/materials/components/student-materials-board";
import type { Material } from "@/features/materials/types";

/** Due dates per material, when a teacher assigned one. */
type StudentMaterialsOverviewProps = {
  materials: Material[];
  dueDates?: Record<string, string>;
  /** Words in the student's vocabulary (for "practice your words" games). */
  vocabularyCount?: number;
};

export async function StudentMaterialsOverview({
  materials,
  dueDates = {},
  vocabularyCount = 0,
}: StudentMaterialsOverviewProps) {
  const t = await getTranslations("educator.materials");
  return (
    <Box>
      <Breadcrumb title={t("studentOverview.title")} subtitle={t("studentOverview.subtitle")} />
      <StudentMaterialsBoard
        entries={materials.map((material) => ({ material, dueAt: dueDates[material.id] }))}
        vocabularyCount={vocabularyCount}
      />
    </Box>
  );
}
