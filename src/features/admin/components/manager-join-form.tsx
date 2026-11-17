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
        This invitation was sent to <strong>{inviteEmail}</strong>. You are signed in as {signedInEmail}. Sign out
        and sign in with the invited email to continue.
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Tell us about your operations experience (scheduling, billing, teacher support). The admin approved inviting
        you to prepare payouts and run day-to-day academy work.
      </Typography>
      {inviteNote ? (
        <Alert severity="info">
          <Typography variant="subtitle2">Note from the admin</Typography>
          <Typography variant="body2" whiteSpace="pre-line">
            {inviteNote}
          </Typography>
        </Alert>
      ) : null}
      <TextField
        label="Operations experience"
        value={experience}
        onChange={(event) => setExperience(event.target.value)}
        multiline
        minRows={4}
        fullWidth
        placeholder="Example: 3 years coordinating ESL teachers, monthly payroll, student support…"
      />
      <FormControlLabel
        control={<Checkbox checked={agreed} onChange={(_, value) => setAgreed(value)} />}
        label="I understand managers prepare payout batches and oversee teachers; only the admin approves transfers."
      />
      <Box>
        <Button
          variant="contained"
          disabled={pending || !agreed || experience.trim().length < 20}
          onClick={submit}
        >
          Accept and open manager dashboard
        </Button>
      </Box>
    </Stack>
  );
}