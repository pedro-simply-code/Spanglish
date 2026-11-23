"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { IconEye } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { reviewMaterialAction } from "@/features/materials/actions";
import {
  materialKindOptions,
  localizeMaterials,
} from "@/features/materials/data";
import { MaterialKindChip } from "@/features/materials/components/material-kind-chip";
import { formatMaterialDate, formatMaterialLevel } from "@/features/materials/format";
import type { Material, MaterialKind } from "@/features/materials/types";
import { DEFAULT_PAGE_SIZE, sliceForPage } from "@/lib/pagination";
import { useAppToast } from "@/lib/use-app-toast";

const moderationColor = {
  pending: "warning",
  approved: "success",
  rejected: "error",
  none: "default",
} as const;

const moderationKeys: Record<NonNullable<Material["moderation"]>, string> = {
  none: "moderation.none",
  pending: "moderation.pending",
  approved: "moderation.published",
  rejected: "moderation.rejected",
};

type StatusTab = "open" | "history";
type Translator = ReturnType<typeof useTranslations<"educator.materials">>;

function MaterialDetailDialog({
  open,
  item,
  t,
  locale,
  pending,
  note,
  onNoteChange,
  onClose,
  onApprove,
  onReject,
}: {
  open: boolean;
  item: Material | null;
  t: Translator;
  locale: string;
  pending: boolean;
  note: string;
  onNoteChange: (value: string) => void;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (!item) return null;
  const canReview = item.moderation === "pending";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{item.title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <MaterialKindChip kind={item.kind} />
            <Chip size="small" variant="outlined" label={formatMaterialLevel(item.level, t)} />
            {item.moderation && item.moderation !== "none" ? (
              <Chip
                size="small"
                color={moderationColor[item.moderation]}
                label={t(moderationKeys[item.moderation])}
              />
            ) : null}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {t("moderation.updatedBy", {
              name: item.ownerName,
              date: formatMaterialDate(item.updatedAt, locale),
            })}
            {item.reviewedAt
              ? t("moderation.reviewed", { date: formatMaterialDate(item.reviewedAt, locale) })
              : ""}
          </Typography>
          <Typography variant="body2" whiteSpace="pre-line">
            {item.description || t("moderation.noDescription")}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <LinkButton href={`/manager/materials/${item.id}`} size="small" variant="outlined">
              {t("moderation.fullPreview")}
            </LinkButton>
            {item.href ? (
              <LinkButton href={item.href} size="small" target="_blank" rel="noreferrer noopener">
                {t("moderation.openLink")}
              </LinkButton>
            ) : null}
          </Stack>
          {item.reviewNote ? (
            <Box>
              <Typography variant="subtitle2">{t("moderation.reviewerNote")}</Typography>
              <Typography variant="body2" color="text.secondary">
                {item.reviewNote}
              </Typography>
            </Box>
          ) : null}
          {canReview ? (
            <TextField
              size="small"
              fullWidth
              label={t("moderation.noteToAuthor")}
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} disabled={pending}>
          {t("moderation.close")}
        </Button>
        {canReview ? (
          <>
            <Button color="error" disabled={pending} onClick={onReject}>
              {t("moderation.reject")}
            </Button>
            <Button variant="contained" disabled={pending} onClick={onApprove}>
              {t("moderation.publish")}
            </Button>
          </>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}

export function MaterialsModeration({ materials }: { materials: Material[] }) {
  const t = useTranslations("educator.materials");
  const shellT = useTranslations("educator");
  const commonT = useTranslations("educator.common");
  const locale = useLocale();
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();
  const [statusTab, setStatusTab] = useState<StatusTab>("open");
  const [kindFilter, setKindFilter] = useState<"" | MaterialKind>("");
  const [listPage, setListPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const rows = useMemo(() => localizeMaterials(materials, t), [materials, t]);
  const openCount = rows.filter((item) => item.moderation === "pending").length;

  const filtered = useMemo(() => {
    let visible = rows;
    if (statusTab === "open") {
      visible = visible.filter((item) => item.moderation === "pending");
    } else {
      visible = visible.filter(
        (item) => item.moderation === "approved" || item.moderation === "rejected",
      );
    }
    if (kindFilter) visible = visible.filter((item) => item.kind === kindFilter);
    return [...visible].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [rows, statusTab, kindFilter]);

  const pageRows = sliceForPage(filtered, listPage, DEFAULT_PAGE_SIZE);
  const detail = detailId ? rows.find((item) => item.id === detailId) ?? null : null;

  const openDetail = (id: string, existingNote?: string | null) => {
    setDetailId(id);
    setNote(existingNote ?? "");
  };

  const review = (materialId: string, approve: boolean) =>
    startTransition(async () => {
      const result = await reviewMaterialAction({ materialId, approve, note });
      if (result.ok) {
        showSuccess({ message: result.message });
        setDetailId(null);
        setNote("");
        router.refresh();
      } else showError({ message: result.message });
    });

  return (
    <Box>
      <Breadcrumb
        title={t("moderation.title")}
        subtitle={t("moderation.subtitle")}
        items={[
          { title: shellT("shell.roles.manager"), to: "/manager" },
          { title: t("moderation.title") },
        ]}
      />

      <Tabs
        value={statusTab}
        onChange={(_, value: StatusTab) => {
          setStatusTab(value);
          setListPage(1);
        }}
        sx={{ mb: 2 }}
      >
        <Tab
          value="open"
          label={t("moderation.awaitingCount", { count: openCount })}
        />
        <Tab value="history" label={t("moderation.history")} />
      </Tabs>

      <SectionCard
        title={statusTab === "open" ? t("moderation.openMaterials") : t("moderation.reviewedMaterials")}
        subtitle={
          kindFilter
            ? t("moderation.filtered", { kind: t(`kind.${kindFilter}`) })
            : t("moderation.allKinds")
        }
        action={
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="materials-kind-filter">{t("library.type")}</InputLabel>
            <Select
              labelId="materials-kind-filter"
              label={t("library.type")}
              value={kindFilter}
              onChange={(event) => {
                setKindFilter(event.target.value as "" | MaterialKind);
                setListPage(1);
              }}
            >
              <MenuItem value="">{t("moderation.allKinds")}</MenuItem>
              {materialKindOptions.map((kind) => (
                <MenuItem key={kind} value={kind}>
                  {t(`kind.${kind}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        }
      >
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("moderation.author")}</TableCell>
                <TableCell>{t("library.type")}</TableCell>
                <TableCell>{commonT("level")}</TableCell>
                <TableCell>{t("composer.title")}</TableCell>
                <TableCell>
                  {statusTab === "open"
                    ? t("moderation.submitted")
                    : t("moderation.reviewedDate")}
                </TableCell>
                <TableCell>{t("moderation.view")}</TableCell>
                {statusTab === "history" ? <TableCell>{commonT("status")}</TableCell> : null}
                <TableCell align="right"> </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={statusTab === "history" ? 8 : 7}>
                    <Typography variant="body2" color="text.secondary">
                      {t("moderation.noMatches")}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
              {pageRows.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{item.ownerName}</Typography>
                  </TableCell>
                  <TableCell>
                    <MaterialKindChip kind={item.kind} />
                  </TableCell>
                  <TableCell>{formatMaterialLevel(item.level, t)}</TableCell>
                  <TableCell sx={{ maxWidth: 240 }}>
                    <Typography variant="body2" noWrap title={item.title}>
                      {item.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {formatMaterialDate(
                      statusTab === "history" && item.reviewedAt
                        ? item.reviewedAt
                        : item.updatedAt,
                      locale,
                    )}
                  </TableCell>
                  <TableCell>
                    <LinkButton href={`/manager/materials/${item.id}`} size="small">
                      {t("moderation.preview")}
                    </LinkButton>
                  </TableCell>
                  {statusTab === "history" && item.moderation ? (
                    <TableCell>
                      <Chip
                        size="small"
                        color={moderationColor[item.moderation]}
                        label={t(moderationKeys[item.moderation])}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell align="right">
                    <IconButton
                      aria-label={t("moderation.reviewMaterial", { title: item.title })}
                      size="small"
                      onClick={() => openDetail(item.id, item.reviewNote)}
                    >
                      <IconEye size={18} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        <ListPagination page={listPage} total={filtered.length} onPageChange={setListPage} />
      </SectionCard>

      <MaterialDetailDialog
        open={Boolean(detail)}
        item={detail}
        t={t}
        locale={locale}
        pending={pending}
        note={note}
        onNoteChange={setNote}
        onClose={() => setDetailId(null)}
        onApprove={() => detail && review(detail.id, true)}
        onReject={() => detail && review(detail.id, false)}
      />
    </Box>
  );
}
