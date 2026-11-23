"use client";

import { type ReactNode, useMemo, useState } from "react";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  IconArrowRight,
  IconBooks,
  IconCalendarEvent,
  IconCards,
  IconClipboardList,
  IconClock,
  IconDeviceGamepad2,
  IconFilterOff,
  IconHeadphones,
  IconSearch,
  IconUser,
} from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { SummaryBanner } from "@/components/ui/summary-banner";
import { kindIcons } from "@/features/materials/components/material-card";
import { MaterialKindChip } from "@/features/materials/components/material-kind-chip";
import { materialKindOptions } from "@/features/materials/data";
import { formatMaterialDate, formatMaterialLevel } from "@/features/materials/format";
import type { Material, MaterialKind } from "@/features/materials/types";

const PAGE_SIZE = 5;
const LISTEN_KINDS: MaterialKind[] = ["audio", "video", "recording"];

type Entry = { material: Material; dueAt?: string };

type StudentMaterialsBoardProps = {
  entries: Entry[];
  vocabularyCount: number;
};

/** The student's materials with the My classes layout: summary, filters + list, side panels. */
export function StudentMaterialsBoard({ entries, vocabularyCount }: StudentMaterialsBoardProps) {
  const t = useTranslations("educator.materials");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"all" | MaterialKind>("all");
  const [teacher, setTeacher] = useState("all");
  const [page, setPage] = useState(1);

  const teachers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { material } of entries) counts.set(material.ownerName, (counts.get(material.ownerName) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [entries]);
  const kindCounts = useMemo(
    () =>
      materialKindOptions
        .map((option) => ({ kind: option, count: entries.filter(({ material }) => material.kind === option).length }))
        .filter((item) => item.count > 0),
    [entries],
  );

  const query = search.trim().toLowerCase();
  const filtered = entries.filter(({ material }) => {
    if (kind !== "all" && material.kind !== kind) return false;
    if (teacher !== "all" && material.ownerName !== teacher) return false;
    if (!query) return true;
    return [material.title, material.description, material.ownerName, ...material.tags]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const filtering = Boolean(query) || kind !== "all" || teacher !== "all";

  const update =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };
  const clearFilters = () => {
    setSearch("");
    setKind("all");
    setTeacher("all");
    setPage(1);
  };

  const count = (kinds: MaterialKind[]) => entries.filter(({ material }) => kinds.includes(material.kind)).length;
  const withDue = entries
    .filter((entry) => entry.dueAt)
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""));

  return (
    <Box>
      <SummaryBanner
        items={[
          { key: "all", icon: IconBooks, color: "primary", value: entries.length, label: t("board.summary.all") },
          { key: "forms", icon: IconClipboardList, color: "warning", value: count(["form"]), label: t("board.summary.forms") },
          { key: "listen", icon: IconHeadphones, color: "secondary", value: count(LISTEN_KINDS), label: t("board.summary.listen") },
          { key: "games", icon: IconCards, color: "success", value: count(["practice"]), label: t("board.summary.games") },
        ]}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            <Card elevation={9}>
              <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
                  <TextField
                    size="small"
                    fullWidth
                    label={t("library.search")}
                    value={search}
                    onChange={(event) => update(setSearch)(event.target.value)}
                    slotProps={{ input: { startAdornment: <IconSearch size={16} style={{ marginRight: 8 }} /> } }}
                    sx={{ flex: { md: "1 1 auto" }, minWidth: { md: 140 } }}
                  />
                  <TextField
                    select
                    size="small"
                    label={t("library.type")}
                    value={kind}
                    onChange={(event) => update(setKind)(event.target.value as "all" | MaterialKind)}
                    sx={{ flex: { md: "0 0 160px" }, minWidth: 0 }}
                  >
                    <MenuItem value="all">{t("library.allTypes")}</MenuItem>
                    {materialKindOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {t(`kind.${option}`)}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label={t("board.teacher")}
                    value={teacher}
                    onChange={(event) => update(setTeacher)(event.target.value)}
                    sx={{ flex: { md: "0 0 160px" }, minWidth: 0 }}
                  >
                    <MenuItem value="all">{t("board.allTeachers")}</MenuItem>
                    {teachers.map(([name]) => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))}
                  </TextField>
                  {filtering ? (
                    <Tooltip title={t("board.clear")}>
                      <IconButton
                        size="small"
                        color="primary"
                        aria-label={t("board.clear")}
                        onClick={clearFilters}
                        sx={{ flexShrink: 0, alignSelf: { xs: "flex-end", md: "center" } }}
                      >
                        <IconFilterOff size={18} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>

            {visible.length ? (
              <Stack spacing={2}>
                {visible.map(({ material, dueAt }) => {
                  const Icon = kindIcons[material.kind];
                  return (
                    <Card key={material.id} elevation={9}>
                      <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={2.5}
                          alignItems={{ xs: "stretch", sm: "flex-start" }}
                        >
                          {/* Kind block, in the place of the date block of the class cards. */}
                          <Box
                            sx={{
                              width: { xs: "100%", sm: 72 },
                              height: { sm: 72 },
                              py: { xs: 1.25, sm: 0 },
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              bgcolor: "primary.light",
                              color: "primary.main",
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={28} />
                          </Box>

                          <Box flexGrow={1} minWidth={0}>
                            <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
                              <MaterialKindChip kind={material.kind} />
                              <Chip size="small" variant="outlined" label={formatMaterialLevel(material.level, t)} />
                              {material.duration ? (
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  icon={<IconClock size={13} />}
                                  label={material.duration}
                                />
                              ) : null}
                              {material.questionCount ? (
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={t("card.questions", {
                                    count: material.questionCount,
                                    minutes: material.estimatedMinutes ?? 5,
                                  })}
                                />
                              ) : null}
                            </Stack>

                            <Typography variant="h5" mt={1.25}>
                              {material.title}
                            </Typography>
                            {material.description ? (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                mt={0.5}
                                sx={{
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {material.description}
                              </Typography>
                            ) : null}

                            <Stack
                              direction="row"
                              flexWrap="wrap"
                              useFlexGap
                              columnGap={2}
                              rowGap={0.5}
                              mt={1}
                              alignItems="center"
                              sx={{ "& .MuiTypography-root": { whiteSpace: "nowrap" } }}
                            >
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <IconUser size={14} />
                                <Typography variant="body2" color="text.secondary">
                                  {material.ownerName}
                                </Typography>
                              </Stack>
                              <Stack direction="row" spacing={0.5} alignItems="center">
                                <IconCalendarEvent size={14} />
                                <Typography variant="body2" color="text.secondary">
                                  {t("card.updated", { date: formatMaterialDate(material.updatedAt, locale) })}
                                </Typography>
                              </Stack>
                              {dueAt ? (
                                <Typography variant="body2" color="warning.main">
                                  {t("card.due", { date: formatMaterialDate(dueAt, locale) })}
                                </Typography>
                              ) : null}
                              {material.tags.map((tag) => (
                                <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
                              ))}
                            </Stack>
                          </Box>

                          <LinkButton
                            href={`/materials/${material.id}`}
                            variant="contained"
                            endIcon={<IconArrowRight size={16} />}
                            sx={{ flexShrink: 0, alignSelf: "flex-start" }}
                          >
                            {material.kind === "form"
                              ? t("card.openPractice")
                              : material.kind === "practice"
                                ? t("card.openGames")
                                : t("card.openMaterial")}
                          </LinkButton>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            ) : (
              <Card elevation={9}>
                <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" }, textAlign: "center" }}>
                  <Typography color="text.secondary" py={3}>
                    {entries.length ? t("library.empty") : t("studentOverview.empty")}
                  </Typography>
                </CardContent>
              </Card>
            )}

            <ListPagination
              page={current}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={(next) => {
                setPage(next);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <SectionCard
              padding="15px"
              title={t("games.myWordsTitle")}
              subtitle={t("games.myWordsText", { count: vocabularyCount })}
            >
              <LinkButton
                href="/materials/my-words"
                variant="contained"
                size="small"
                startIcon={<IconDeviceGamepad2 size={16} />}
              >
                {t("games.myWordsStart")}
              </LinkButton>
            </SectionCard>

            {withDue.length ? (
              <SectionCard padding="15px" title={t("studentOverview.upcomingDeadlines")}>
                <Stack spacing={1}>
                  {withDue.map(({ material, dueAt }) => (
                    <Typography key={material.id} variant="body2">
                      {t("studentOverview.dueItem", { title: material.title, date: formatMaterialDate(dueAt!, locale) })}
                    </Typography>
                  ))}
                </Stack>
              </SectionCard>
            ) : null}

            {kindCounts.length ? (
              <SectionCard padding="15px" title={t("board.byType")} subtitle={t("studentOverview.runnerNote")}>
                <Stack spacing={0.5}>
                  {kindCounts.map((item) => {
                    const Icon = kindIcons[item.kind];
                    const selected = kind === item.kind;
                    return (
                      <PanelRow
                        key={item.kind}
                        selected={selected}
                        onClick={() => update(setKind)(selected ? "all" : item.kind)}
                        avatar={
                          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.light", color: "primary.main" }}>
                            <Icon size={16} />
                          </Avatar>
                        }
                        label={t(`kind.${item.kind}`)}
                        count={item.count}
                      />
                    );
                  })}
                </Stack>
              </SectionCard>
            ) : null}

            {teachers.length ? (
              <SectionCard padding="15px" title={t("board.byTeacher")} subtitle={t("board.byTeacherHint")}>
                <Stack spacing={0.5}>
                  {teachers.map(([name, total]) => {
                    const selected = teacher === name;
                    return (
                      <PanelRow
                        key={name}
                        selected={selected}
                        onClick={() => update(setTeacher)(selected ? "all" : name)}
                        avatar={<Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>{name.charAt(0)}</Avatar>}
                        label={name}
                        count={total}
                      />
                    );
                  })}
                </Stack>
              </SectionCard>
            ) : null}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

/** Clickable row of the side panels: toggles a filter. */
function PanelRow({
  selected,
  onClick,
  avatar,
  label,
  count,
}: {
  selected: boolean;
  onClick: () => void;
  avatar: ReactNode;
  label: string;
  count: number;
}) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      alignItems="center"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter") onClick();
      }}
      sx={{
        p: 1,
        borderRadius: 1,
        cursor: "pointer",
        bgcolor: selected ? "primary.light" : "transparent",
        "&:hover": { bgcolor: selected ? "primary.light" : "grey.100" },
      }}
    >
      {avatar}
      <Typography variant="subtitle2" flexGrow={1} noWrap>
        {label}
      </Typography>
      <Chip
        size="small"
        label={count}
        color={selected ? "primary" : "default"}
        variant={selected ? "filled" : "outlined"}
      />
    </Stack>
  );
}
