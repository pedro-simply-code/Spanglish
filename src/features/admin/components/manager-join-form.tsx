"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { acceptManagerInvitationAction } from "@/features/admin/actions/manager-access";
import { useAppToast } from "@/lib/use-app-toast";

type ManagerJoinFormProps = {
  token: string;
  inviteEmail: string;
  inviteNote: string;
  signedInEmail: string;
  emailMatches: boolean;
};

export function ManagerJoinForm({
  token,
  inviteEmail,
  inviteNote,
  signedInEmail,
  emailMatches,
}: ManagerJoinFormProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();
  const [experience, setExperience] = useState("");
  const [agreed, setAgreed] = useState(false);

  const submit = () =>
    startTransition(async () => {
      const result = await acceptManagerInvitationAction({ token, experienceNote: experience });
      if (result.ok) {
        showSuccess({ message: result.message });
        router.push("/manager");
        router.refresh();
      } else showError({ message: result.message });
    });

  if (!emailMatches) {
    return (
      <Alert severity="warning">
        {t("organization.managers.join.emailMismatchPrefix")} <strong>{inviteEmail}</strong>.{" "}
        {t("organization.managers.join.emailMismatchMiddle", { email: signedInEmail })}{" "}
        {t("organization.managers.join.emailMismatchSuffix")}
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {t("organization.managers.join.intro")}
      </Typography>
      {inviteNote ? (
        <Alert severity="info">
          <Typography variant="subtitle2">{t("organization.managers.join.noteTitle")}</Typography>
          <Typography variant="body2" whiteSpace="pre-line">
            {inviteNote}
          </Typography>
        </Alert>
      ) : null}
      <TextField
        label={t("organization.managers.join.experienceLabel")}
        value={experience}
        onChange={(event) => setExperience(event.target.value)}
        multiline
        minRows={4}
        fullWidth
        placeholder={t("organization.managers.join.experiencePlaceholder")}
      />
      <FormControlLabel
        control={<Checkbox checked={agreed} onChange={(_, value) => setAgreed(value)} />}
        label={t("organization.managers.join.confirmation")}
      />
      <Box>
        <Button
          variant="contained"
          disabled={pending || !agreed || experience.trim().length < 20}
          onClick={submit}
        >
          {t("organization.managers.join.accept")}
        </Button>
      </Box>
    </Stack>
  );
}
