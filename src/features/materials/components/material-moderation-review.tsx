"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { IconArrowLeft, IconExternalLink } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { reviewMaterialAction } from "@/features/materials/actions";
import { MaterialKindChip } from "@/features/materials/components/material-kind-chip";
import {
  localizeFormQuestions,
  localizeMaterial,
} from "@/features/materials/data";
import type { FormQuestion, Material } from "@/features/materials/types";
import { formatMaterialDateTime, formatMaterialLevel } from "@/features/materials/format";
import { useAppToast } from "@/lib/use-app-toast";

type MaterialModerationReviewProps = {
  material: Material;
  questions?: FormQuestion[];
};

export function MaterialModerationReview({
  material: sourceMaterial,
  questions: sourceQuestions = [],
}: MaterialModerationReviewProps) {
  const t = useTranslations("educator");
  const materialsT = useTranslations("educator.materials");
  const locale = useLocale();
  const material = localizeMaterial(sourceMaterial, materialsT) ?? sourceMaterial;
  const questions = localizeFormQuestions(
    sourceQuestions,
    sourceMaterial.id,
    materialsT,
  );
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState(material.reviewNote ?? "");

  const canPublish = material.moderation === "pending";
  const isLive = material.moderation === "approved";

  const publish = (approve: boolean) =>
    startTransition(async () => {
      const result = await reviewMaterialAction({ materialId: material.id, approve, note });
      if (result.ok) {
        showSuccess({ message: result.message });
        router.push("/manager/materials");
        router.refresh();
      } else showError({ message: result.message });
    });

  return (
    <Box mt={3}>
      <Breadcrumb
        title={material.title}
        subtitle={t("materials.moderation.reviewSubtitle")}
        items={[
          { title: t("shell.roles.manager"), to: "/manager" },
          { title: t("materials.moderation.title"), to: "/manager/materials" },
          { title: material.title },
        ]}
      />

      {canPublish ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("materials.moderation.reviewHelp")}
        </Alert>
      ) : null}
      {isLive ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          {t("materials.moderation.alreadyPublished")}
        </Alert>
      ) : null}
      {material.moderation === "rejected" ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t("materials.moderation.rejectedNote")}
        </Alert>
      ) : null}

      <Card elevation={9} sx={{ mb: 3 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap>
              <MaterialKindChip kind={material.kind} />
              <Chip size="small" variant="outlined" label={formatMaterialLevel(material.level, materialsT)} />
              <Chip
                size="small"
                color={
                  material.moderation === "approved"
                    ? "success"
                    : material.moderation === "pending"
                      ? "warning"
                      : material.moderation === "rejected"
                        ? "error"
                        : "default"
                }
                label={material.moderation ?? t("common.none")}
              />
            </Stack>

            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>
                {material.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t("materials.moderation.detail.createdByUpdated", {
                  name: material.ownerName,
                  date: formatMaterialDateTime(material.updatedAt, locale),
                })}
              </Typography>
            </Box>

            <Typography variant="body1" whiteSpace="pre-line" sx={{ lineHeight: 1.7 }}>
              {material.description || t("materials.moderation.noDescription")}
            </Typography>

            {material.tags.length ? (
              <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {material.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Stack>
            ) : null}

            <Divider />

            {material.href ? (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                <Box flexGrow={1}>
                  <Typography variant="subtitle2">{t("materials.moderation.resourceLink")}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                    {material.href}
                  </Typography>
                </Box>
                <LinkButton
                  href={material.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  variant="contained"
                  endIcon={<IconExternalLink size={16} />}
                >
                  {t("materials.moderation.openReview")}
                </LinkButton>
              </Stack>
            ) : material.kind === "form" && questions.length > 0 ? (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  {t("materials.moderation.formPreview", { count: questions.length })}
                </Typography>
                <Stack spacing={1}>
                  {questions.slice(0, 5).map((question, index) => (
                    <Typography key={question.id} variant="body2" color="text.secondary">
                      {index + 1}. {question.prompt}
                    </Typography>
                  ))}
                  {questions.length > 5 ? (
                    <Typography variant="caption" color="text.secondary">
                      {t("materials.moderation.moreQuestions", { count: questions.length - 5 })}
                    </Typography>
                  ) : null}
                </Stack>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t("materials.moderation.textOnly")}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {canPublish ? (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="subtitle1" fontWeight={600}>
                {t("materials.moderation.publishTitle")}
              </Typography>
              <TextField
                size="small"
                fullWidth
                multiline
                minRows={2}
                label={t("materials.moderation.noteToAuthor")}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <Stack direction="row" spacing={1.5} flexWrap="wrap">
                <LinkButton
                  href="/manager/materials"
                  variant="outlined"
                  startIcon={<IconArrowLeft size={16} />}
                >
                  {t("materials.moderation.backQueue")}
                </LinkButton>
                <Button color="error" disabled={pending} onClick={() => publish(false)}>
                  {t("materials.moderation.reject")}
                </Button>
                <Button variant="contained" disabled={pending} onClick={() => publish(true)}>
                  {t("materials.moderation.publishStudents")}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <LinkButton href="/manager/materials" variant="outlined" startIcon={<IconArrowLeft size={16} />}>
          {t("materials.moderation.backReview")}
        </LinkButton>
      )}
    </Box>
  );
}
