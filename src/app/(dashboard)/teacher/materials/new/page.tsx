import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Box from "@mui/material/Box";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { MaterialComposer } from "@/features/materials";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("educator.metadata.newMaterial");
  return { title: t("title"), description: t("description") };
}

export default async function NewMaterialPage() {
  const t = await getTranslations("educator");
  return (
    <Box>
      <Breadcrumb
        title={t("metadata.newMaterial.title")}
        subtitle={t("teacher.dashboard.newMaterialSubtitle")}
        items={[
          { title: t("shell.roles.teacher"), to: "/teacher" },
          { title: t("common.materials"), to: "/teacher/materials" },
          { title: t("metadata.newMaterial.title") },
        ]}
      />
      <MaterialComposer />
    </Box>
  );
}
