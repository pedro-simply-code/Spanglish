import type { Metadata } from "next";
import { Suspense } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { getTranslations } from "next-intl/server";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import { PracticeArea } from "@/features/materials";
import { MIN_PRACTICE_ITEMS, type PracticeItem } from "@/lib/practice-games";
import { requireDashboard } from "@/server/auth/session";
import { listStudentWords } from "@/server/learning/vocabulary";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("educator.materials.games");
  return { title: t("myWordsTitle") };
}

export default function Page() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <Content />
    </Suspense>
  );
}

/** Practice games built from the student's own vocabulary (browser voice). */
async function Content() {
  const actor = await requireDashboard("student");
  const t = await getTranslations("educator.materials.games");
  const words = await listStudentWords(actor.userId);
  const items: PracticeItem[] = words.map((word) => ({
    id: word.id,
    term: word.term,
    translation: word.translation || word.term,
    // Notes like "Luna · Travel" are not Spanish sentences.
    example: word.example && !word.example.startsWith("Luna ·") ? word.example : undefined,
  }));
  return (
    <Box>
      <Breadcrumb
        title={t("myWordsTitle")}
        subtitle={t("myWordsText", { count: items.length })}
        items={[{ title: t("materials"), to: "/study?tab=materials" }, { title: t("myWordsTitle") }]}
      />
      <SectionCard title={t("pickGame")}>
        {items.length < MIN_PRACTICE_ITEMS ? (
          <Alert
            severity="info"
            action={
              <LinkButton href="/study?tab=vocabulary" size="small">
                {t("addWords")}
              </LinkButton>
            }
          >
            {t("tooFew", { min: MIN_PRACTICE_ITEMS })}
          </Alert>
        ) : (
          <PracticeArea items={items} />
        )}
      </SectionCard>
    </Box>
  );
}
