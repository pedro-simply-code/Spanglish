"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { MaterialCard } from "@/features/materials/components/material-card";
import { materialKindOptions } from "@/features/materials/data";
import type { Material } from "@/features/materials/types";

type LibraryEntry = {
  material: Material;
  dueAt?: string;
};

type MaterialsLibraryProps = {
  entries: LibraryEntry[];
  basePath: string;
  emptyMessage?: string;
  showVisibility?: boolean;
};

export function MaterialsLibrary({
  entries,
  basePath,
  emptyMessage,
  showVisibility = false,
}: MaterialsLibraryProps) {
  const t = useTranslations("educator.materials");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | Material["kind"]>("all");

  const query = search.trim().toLowerCase();
  const visible = entries.filter(({ material }) => {
    const matchesKind = kind === "all" || material.kind === kind;
    const matchesQuery =
      !query ||
      material.title.toLowerCase().includes(query) ||
      material.description.toLowerCase().includes(query) ||
      material.tags.some((tag) => tag.toLowerCase().includes(query));

    return matchesKind && matchesQuery;
  });

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "center" }}
      >
        <TextField
          size="small"
          label={t("library.search")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ minWidth: { sm: 280 } }}
        />
        <TextField
          select
          size="small"
          label={t("library.type")}
          value={kind}
          onChange={(event) =>
            setKind(event.target.value as "all" | Material["kind"])
          }
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">{t("library.allTypes")}</MenuItem>
          {materialKindOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {t(`kind.${option}`)}
            </MenuItem>
          ))}
        </TextField>
        <Box flexGrow={1} />
        <Typography variant="body2" color="text.secondary">
          {t("library.items", { shown: visible.length, total: entries.length })}
        </Typography>
      </Stack>

      {visible.length ? (
        <Grid container spacing={3}>
          {visible.map(({ material, dueAt }) => (
            <Grid key={material.id} size={{ xs: 12, md: 6, xl: 4 }}>
              <MaterialCard
                material={material}
                href={`${basePath}/${material.id}`}
                dueAt={dueAt}
                showVisibility={showVisibility}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Box sx={{ p: 4, bgcolor: "grey.100", textAlign: "center" }}>
          <Typography color="text.secondary">{emptyMessage ?? t("library.empty")}</Typography>
        </Box>
      )}
    </Stack>
  );
}
