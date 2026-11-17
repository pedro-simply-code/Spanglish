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
import { shareMaterialAction } from "@/features/materials/actions";
import { useAppToast } from "@/lib/use-app-toast";
import { liveClasses } from "@/features/classes/data";
import type {
  MaterialActionResult,
  MaterialAudience,
} from "@/features/materials/types";

type ShareMaterialDialogProps = {
  materialId: string;
  materialTitle: string;
};

export function ShareMaterialDialog({
  materialId,
  materialTitle,
}: ShareMaterialDialogProps) {
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
        Share
      </Button>

      <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
        <DialogTitle>Share “{materialTitle}”</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Choose who receives this material. The demo validates the audience;
            persistence is the next step.
          </DialogContentText>
          <Stack spacing={2}>
            <TextField
              select
              label="Audience"
              value={audience}
              onChange={(event) =>
                setAudience(event.target.value as MaterialAudience)
              }
              fullWidth
            >
              <MenuItem value="class">A class</MenuItem>
              <MenuItem value="student">One student</MenuItem>
              <MenuItem value="cohort">A cohort</MenuItem>
            </TextField>

            {audience === "class" ? (
              <TextField
                select
                label="Class"
                value={classId}
                onChange={(event) => setClassId(event.target.value)}
                fullWidth
              >
                {liveClasses.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.topic}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}

            {audience === "student" ? (
              <TextField
                label="Student name"
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                fullWidth
              />
            ) : null}

            <TextField
              label="Due date (optional)"
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
            Cancel
          </Button>
          <Button variant="contained" onClick={share} disabled={pending}>
            {pending ? "Sharing…" : "Share material"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
