"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { MaterialCard } from "@/features/materials/components/material-card";
import {
  materialKindLabels,
  materialKindOptions,
} from "@/features/materials/data";
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
  emptyMessage = "No materials match these filters yet.",
  showVisibility = false,
}: MaterialsLibraryProps) {
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
          label="Search materials"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ minWidth: { sm: 280 } }}
        />
        <TextField
          select
          size="small"
          label="Type"
          value={kind}
          onChange={(event) =>
            setKind(event.target.value as "all" | Material["kind"])
          }
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">All types</MenuItem>
          {materialKindOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {materialKindLabels[option]}
            </MenuItem>
          ))}
        </TextField>
        <Box flexGrow={1} />
        <Typography variant="body2" color="text.secondary">
          {visible.length} of {entries.length} items
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
          <Typography color="text.secondary">{emptyMessage}</Typography>
        </Box>
      )}
    </Stack>
  );
}
