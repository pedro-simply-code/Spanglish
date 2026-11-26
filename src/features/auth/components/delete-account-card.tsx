"use client";

import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { SectionCard } from "@/components/ui/section-card";
import { deleteAccountAction } from "@/features/auth/actions";

/** Settings → Security: a student deletes their account and personal data. */
export function DeleteAccountCard({ email }: { email: string }) {
  const t = useTranslations("shell.settings.deleteAccount");
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const matches = typed.trim().toLowerCase() === email.trim().toLowerCase();

  const confirm = () =>
    startTransition(async () => {
      setError(null);
      // On success the action signs out and redirects; only errors come back.
      const result = await deleteAccountAction(typed);
      if (result && !result.ok) setError(result.message);
    });

  return (
    <SectionCard title={t("title")} subtitle={t("subtitle")}>
      <Stack spacing={2} alignItems="flex-start">
        <Typography variant="body2" color="text.secondary">
          {t("explain")}
        </Typography>
        <Button color="error" variant="outlined" startIcon={<IconTrash size={16} />} onClick={() => setOpen(true)}>
          {t("button")}
        </Button>
      </Stack>
      <Dialog open={open} onClose={() => (pending ? undefined : setOpen(false))} maxWidth="sm" fullWidth>
        <DialogTitle>{t("dialogTitle")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={0.5}>
            <Alert severity="warning">{t("warning")}</Alert>
            <Typography variant="body2" color="text.secondary">
              {t("deleted")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("kept")}
            </Typography>
            <TextField
              label={t("typeEmail", { email })}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              fullWidth
            />
            {error ? <Alert severity="error">{error}</Alert> : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button color="inherit" disabled={pending} onClick={() => setOpen(false)}>
            {t("cancel")}
          </Button>
          <Button color="error" variant="contained" disabled={!matches || pending} onClick={confirm}>
            {pending ? t("deleting") : t("confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </SectionCard>
  );
}
