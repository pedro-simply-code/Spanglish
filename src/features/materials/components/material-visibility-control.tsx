"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { SectionCard } from "@/components/ui/section-card";
import { setMaterialVisibilityAction } from "@/features/materials/actions";
import { visibilityLabel } from "@/features/materials/components/material-card";
import type { Material } from "@/features/materials/types";
import { useAppToast } from "@/lib/use-app-toast";

type Visibility = "private" | "shared" | "global";

/** Lets the author decide who sees a material. */
export function MaterialVisibilityControl({ material }: { material: Material }) {
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<Visibility>(material.visibility ?? "private");
  const state = visibilityLabel(material);

  const save = () =>
    startTransition(async () => {
      const result = await setMaterialVisibilityAction({ materialId: material.id, visibility: value });
      if (result.ok) {
        showSuccess({ message: result.message });
        router.refresh();
      } else showError({ message: result.message });
    });

  return (
    <SectionCard title="Who can see it" subtitle={`Now: ${state.label}`}>
      {material.moderation === "rejected" && material.reviewNote ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Manager note: {material.reviewNote}
        </Alert>
      ) : null}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
        <TextField
          select
          size="small"
          label="Visibility"
          value={value}
          onChange={(event) => setValue(event.target.value as Visibility)}
          sx={{ minWidth: 260 }}
        >
          <MenuItem value="private">Private</MenuItem>
          <MenuItem value="shared">Shared with teachers</MenuItem>
          <MenuItem value="global">Academy library (needs approval)</MenuItem>
        </TextField>
        <Button
          variant="contained"
          disabled={pending || (value === material.visibility && material.moderation !== "rejected")}
          onClick={save}
        >
          Save
        </Button>
      </Stack>
    </SectionCard>
  );
}
