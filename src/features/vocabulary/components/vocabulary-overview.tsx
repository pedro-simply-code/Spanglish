"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { words } from "@/features/vocabulary/data";

const categories = ["All", "Everyday", "Work", "Travel", "Food"] as const;

export function VocabularyOverview() {
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [search, setSearch] = useState("");

  const filteredWords = words.filter((word) => {
    const matchesCategory = category === "All" || word.category === category;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      word.term.toLowerCase().includes(query) ||
      word.translation.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  return (
    <Box mt={3}>
      <Breadcrumb title="Vocabulary" subtitle="Words you will actually use" />

      <Card elevation={9} sx={{ mb: 3 }}>
        <CardContent sx={{ p: "30px" }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {categories.map((item) => (
                <Chip
                  key={item}
                  label={item}
                  onClick={() => setCategory(item)}
                  color={category === item ? "primary" : "default"}
                  variant={category === item ? "filled" : "outlined"}
                />
              ))}
            </Stack>

            <TextField
              size="small"
              placeholder="Search words"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ minWidth: { md: 260 } }}
            />
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {filteredWords.map((word) => (
          <Grid key={word.id} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Card elevation={9} sx={{ height: "100%" }}>
              <CardContent sx={{ p: "30px" }}>
                <Stack spacing={1.5}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={1}
                  >
                    <Typography variant="h5">{word.term}</Typography>
                    <Chip label={word.category} size="small" variant="outlined" />
                  </Stack>
                  <Typography color="primary.main" fontWeight={600}>
                    {word.translation}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    &ldquo;{word.example}&rdquo;
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredWords.length === 0 ? (
        <Card elevation={9}>
          <CardContent sx={{ p: "30px", textAlign: "center" }}>
            <Typography color="text.secondary">
              No words match your filters.
            </Typography>
          </CardContent>
        </Card>
      ) : null}
    </Box>
  );
}
