"use client";

import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { IconShare } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { liveClasses } from "@/features/classes/data";
import { shareMaterialAction } from "@/features/materials/actions";
import { localizeDemoClassTopic } from "@/features/materials/data";
import type {
  MaterialActionResult,
  MaterialAudience,
} from "@/features/materials/types";
import { useAppToast } from "@/lib/use-app-toast";

type ShareMaterialDialogProps = {
  materialId: string;
  materialTitle: string;
};

export function ShareMaterialDialog({
  materialId,
  materialTitle,
}: ShareMaterialDialogProps) {
  const t = useTranslations("educator.materials");
  const commonT = useTranslations("educator.common");
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<MaterialAudience>("class");
  const [classId, setClassId] = useState(liveClasses[0]?.id ?? "");
  const [studentName, setStudentName] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [result, setResult] = useState<MaterialActionResult | null>(null);
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();

  const close = () => {
    if (pending) return;
    setOpen(false);
  };

  const share = () => {
    startTransition(async () => {
      const response = await shareMaterialAction({
        materialId,
        audience,
        classId: audience === "class" ? classId : undefined,
        studentName: audience === "student" ? studentName : undefined,
        dueAt: dueAt || undefined,
      });

      setResult(response);

      if (response.ok) {
        showSuccess({ title: response.title, message: response.message });
        setOpen(false);
      } else {
        showError({ title: response.title, message: response.message });
      }
    });
  };

  return (
    <>
      <Button
        variant="contained"
        size="small"
        startIcon={<IconShare size={15} />}
        onClick={() => setOpen(true)}
      >
        {t("share.button")}
      </Button>

      <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
        <DialogTitle>{t("share.title", { title: materialTitle })}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {t("share.help")}
          </DialogContentText>
          <Stack spacing={2}>
            <TextField
              select
              label={t("composer.audience")}
              value={audience}
              onChange={(event) =>
                setAudience(event.target.value as MaterialAudience)
              }
              fullWidth
            >
              <MenuItem value="class">{t("audience.class")}</MenuItem>
              <MenuItem value="student">{t("audience.student")}</MenuItem>
              <MenuItem value="cohort">{t("audience.cohort")}</MenuItem>
            </TextField>

            {audience === "class" ? (
              <TextField
                select
                label={t("share.class")}
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                fullWidth
              >
                {liveClasses.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {localizeDemoClassTopic(item.id, item.topic, t)}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}

            {audience === "student" ? (
              <TextField
                label={t("share.studentName")}
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                fullWidth
              />
            ) : null}

            <TextField
              label={t("composer.dueDate")}
              type="date"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />

            {result && !result.ok ? (
              <Alert severity="error">{result.message}</Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={pending}>
            {commonT("cancel")}
          </Button>
          <Button variant="contained" onClick={share} disabled={pending}>
            {pending ? t("share.sharing") : t("share.shareMaterial")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
