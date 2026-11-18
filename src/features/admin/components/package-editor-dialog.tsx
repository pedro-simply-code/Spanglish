"use client";

import { useMemo, useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  deletePricingPackageAction,
  savePricingPackageAction,
} from "@/features/admin/actions/pricing-packages";
import type { AdminPackageDetail } from "@/features/admin/types";
import { suggestedPackageId } from "@/lib/pricing-package-schema";

type Translator = (key: string, values?: Record<string, string | number>) => string;

function emptyPackage(t: Translator): AdminPackageDetail {
  return {
    id: "individual-25-30",
    name: t("commerce.editor.newPackage"),
    classType: "Individual",
    classTypeCode: "one-on-one",
    duration: "25 min",
    durationMinutes: 25,
    credits: 30,
    priceUsd: 480,
    pricePerClassUsd: 16,
    totalUsd: 480,
    label: t("commerce.editor.newBadge"),
    description: t("commerce.editor.newDescription"),
    savingsPercent: 0,
    active: false,
    publishedAt: null,
    sortOrder: 0,
  };
}

type PackageEditorDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  initial?: AdminPackageDetail | null;
  onClose: () => void;
};

export function PackageEditorDialog({
  open,
  mode,
  initial,
  onClose,
}: PackageEditorDialogProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AdminPackageDetail>(() => initial ?? emptyPackage(t));

  const previousId = mode === "edit" ? initial?.id : undefined;

  const syncId = useMemo(
    () =>
      suggestedPackageId({
        classType: form.classTypeCode,
        durationMinutes: form.durationMinutes,
        credits: form.credits,
      }),
    [form.classTypeCode, form.durationMinutes, form.credits],
  );

  const updateTotalFromPerClass = (nextPerClass: number, credits: number) => {
    const totalUsd = Math.round(nextPerClass * credits);
    return { pricePerClassUsd: nextPerClass, totalUsd, priceUsd: totalUsd };
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const result = await savePricingPackageAction(
        {
          id: form.id.trim(),
          classType: form.classTypeCode,
          durationMinutes: form.durationMinutes,
          credits: form.credits,
          name: form.name,
          label: form.label,
          description: form.description,
          pricePerClassUsd: form.pricePerClassUsd,
          totalUsd: form.totalUsd,
          savingsPercent: form.savingsPercent,
          active: form.active,
        },
        previousId,
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onClose();
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!initial?.id || !window.confirm(t("commerce.editor.confirmDelete", { name: initial.name })))
      return;
    setError(null);
    startTransition(async () => {
      const result = await deletePricingPackageAction(initial.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onClose();
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {mode === "create" ? t("commerce.editor.addTitle") : t("commerce.editor.editTitle")}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error ? <Alert severity="error">{error}</Alert> : null}

          <TextField
            label={t("commerce.editor.field.id")}
            value={form.id}
            onChange={(event) => setForm({ ...form, id: event.target.value })}
            helperText={t("commerce.editor.field.suggested", { id: syncId })}
            fullWidth
          />
          <Button size="small" onClick={() => setForm({ ...form, id: syncId })} sx={{ alignSelf: "flex-start" }}>
            {t("commerce.editor.useSuggestedId")}
          </Button>

          <TextField
            label={t("commerce.editor.field.displayName")}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            fullWidth
          />
          <TextField
            label={t("commerce.editor.field.badge")}
            value={form.label}
            onChange={(event) => setForm({ ...form, label: event.target.value })}
            fullWidth
          />
          <TextField
            label={t("commerce.editor.field.description")}
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            multiline
            minRows={2}
            fullWidth
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="pkg-type-label">{t("common.classType.label")}</InputLabel>
              <Select
                labelId="pkg-type-label"
                label={t("common.classType.label")}
                value={form.classTypeCode}
                onChange={(event) => {
                  const classTypeCode = event.target.value as AdminPackageDetail["classTypeCode"];
                  setForm({
                    ...form,
                    classTypeCode,
                    classType: classTypeCode === "paired" ? "Paired" : "Individual",
                  });
                }}
              >
                <MenuItem value="one-on-one">{t("common.classType.individual")}</MenuItem>
                <MenuItem value="paired">{t("common.classType.paired")}</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="pkg-duration-label">{t("common.duration")}</InputLabel>
              <Select
                labelId="pkg-duration-label"
                label={t("common.duration")}
                value={form.durationMinutes}
                onChange={(event) => {
                  const durationMinutes = Number(event.target.value) as 25 | 50;
                  setForm({
                    ...form,
                    durationMinutes,
                    duration: durationMinutes === 25 ? "25 min" : "50 min",
                  });
                }}
              >
                <MenuItem value={25}>25 min</MenuItem>
                <MenuItem value={50}>50 min</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <TextField
            label={t("commerce.editor.field.credits")}
            type="number"
            value={form.credits}
            onChange={(event) => {
              const credits = Number(event.target.value);
              setForm({
                ...form,
                credits,
                ...updateTotalFromPerClass(form.pricePerClassUsd, credits),
              });
            }}
            fullWidth
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label={t("commerce.editor.field.pricePerClass")}
              type="number"
              value={form.pricePerClassUsd}
              onChange={(event) => {
                const pricePerClassUsd = Number(event.target.value);
                setForm({
                  ...form,
                  ...updateTotalFromPerClass(pricePerClassUsd, form.credits),
                });
              }}
              fullWidth
            />
            <TextField
              label={t("commerce.editor.field.packageTotal")}
              type="number"
              value={form.totalUsd}
              onChange={(event) => {
                const totalUsd = Number(event.target.value);
                setForm({ ...form, totalUsd, priceUsd: totalUsd });
              }}
              fullWidth
            />
          </Stack>

          <TextField
            label={t("commerce.editor.field.savings")}
            type="number"
            value={form.savingsPercent}
            onChange={(event) =>
              setForm({ ...form, savingsPercent: Number(event.target.value) })
            }
            fullWidth
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.active}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
              />
            }
            label={t("commerce.editor.field.liveOnPricing")}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
        <div>
          {mode === "edit" ? (
            <Button color="error" onClick={handleDelete} disabled={pending}>
              {t("common.delete")}
            </Button>
          ) : null}
        </div>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={pending}>
            {t("common.save")}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
