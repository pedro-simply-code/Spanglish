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
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { reviewMaterialAction } from "@/features/materials/actions";
import { materialKindLabels, materialKindOptions } from "@/features/materials/data";
import { MaterialKindChip } from "@/features/materials/components/material-kind-chip";
import type { Material, MaterialKind } from "@/features/materials/types";
import { DEFAULT_PAGE_SIZE, sliceForPage } from "@/lib/pagination";
import { useAppToast } from "@/lib/use-app-toast";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

const moderationColor = {
  pending: "warning",
  approved: "success",
  rejected: "error",
  none: "default",
} as const;

type StatusTab = "open" | "history";

function MaterialDetailDialog({
  open,
  item,
  pending,
  note,
  onNoteChange,
  onClose,
  onApprove,
  onReject,
}: {
  open: boolean;
  item: Material | null;
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
            <Chip size="small" variant="outlined" label={item.level} />
            {item.moderation && item.moderation !== "none" ? (
              <Chip size="small" color={moderationColor[item.moderation]} label={item.moderation} />
            ) : null}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {item.ownerName} · updated {dateFormat.format(new Date(item.updatedAt))}
            {item.reviewedAt ? ` · reviewed ${dateFormat.format(new Date(item.reviewedAt))}` : ""}
          </Typography>
          <Typography variant="body2" whiteSpace="pre-line">
            {item.description || "No description."}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <LinkButton href={`/manager/materials/${item.id}`} size="small" variant="outlined">
              Full preview
            </LinkButton>
            {item.href ? (
              <LinkButton href={item.href} size="small" target="_blank" rel="noreferrer noopener">
                Open link
              </LinkButton>
            ) : null}
          </Stack>
          {item.reviewNote ? (
            <Box>
              <Typography variant="subtitle2">Reviewer note</Typography>
              <Typography variant="body2" color="text.secondary">
                {item.reviewNote}
              </Typography>
            </Box>
          ) : null}
          {canReview ? (
            <TextField
              size="small"
              fullWidth
              label="Note to the author (optional)"
              value={note}
              onChange={(event) => onNoteChange(event.target.value)}
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} disabled={pending}>
          Close
        </Button>
        {canReview ? (
          <>
            <Button color="error" disabled={pending} onClick={onReject}>
              Reject
            </Button>
            <Button variant="contained" disabled={pending} onClick={onApprove}>
              Publish
            </Button>
          </>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}

export function MaterialsModeration({ materials }: { materials: Material[] }) {
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();
  const [statusTab, setStatusTab] = useState<StatusTab>("open");
  const [kindFilter, setKindFilter] = useState<"" | MaterialKind>("");
  const [listPage, setListPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const openCount = materials.filter((item) => item.moderation === "pending").length;

  const filtered = useMemo(() => {
    let rows = materials;
    if (statusTab === "open") {
      rows = rows.filter((item) => item.moderation === "pending");
    } else {
      rows = rows.filter((item) => item.moderation === "approved" || item.moderation === "rejected");
    }
    if (kindFilter) rows = rows.filter((item) => item.kind === kindFilter);
    return rows.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [materials, statusTab, kindFilter]);

  const pageRows = sliceForPage(filtered, listPage, DEFAULT_PAGE_SIZE);
  const detail = detailId ? materials.find((item) => item.id === detailId) ?? null : null;

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
    <Box mt={3}>
      <Breadcrumb
        title="Material review"
        subtitle="Blog-style posts for the student library — open each one to preview the link, then publish."
        items={[{ title: "Manager", to: "/manager" }, { title: "Material review" }]}
      />

      <Tabs
        value={statusTab}
        onChange={(_, value: StatusTab) => {
          setStatusTab(value);
          setListPage(1);
        }}
        sx={{ mb: 2 }}
      >
        <Tab value="open" label={`Waiting for review (${openCount})`} />
        <Tab value="history" label="History" />
      </Tabs>

      <SectionCard
        title={statusTab === "open" ? "Open materials" : "Reviewed materials"}
        subtitle={
          kindFilter ? `Filtered: ${materialKindLabels[kindFilter] ?? kindFilter}` : "All kinds"
        }
        action={
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="materials-kind-filter">Kind</InputLabel>
            <Select
              labelId="materials-kind-filter"
              label="Kind"
              value={kindFilter}
              onChange={(event) => {
                setKindFilter(event.target.value as "" | MaterialKind);
                setListPage(1);
              }}
            >
              <MenuItem value="">All kinds</MenuItem>
              {materialKindOptions.map((kind) => (
                <MenuItem key={kind} value={kind}>
                  {materialKindLabels[kind]}
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
                <TableCell>Author</TableCell>
                <TableCell>Kind</TableCell>
                <TableCell>Level</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>{statusTab === "open" ? "Submitted" : "Reviewed"}</TableCell>
                <TableCell>View</TableCell>
                {statusTab === "history" ? <TableCell>Status</TableCell> : null}
                <TableCell align="right"> </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={statusTab === "history" ? 8 : 7}>
                    <Typography variant="body2" color="text.secondary">
                      No materials match this view.
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
                  <TableCell>{item.level}</TableCell>
                  <TableCell sx={{ maxWidth: 240 }}>
                    <Typography variant="body2" noWrap title={item.title}>
                      {item.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {dateFormat.format(
                      new Date(
                        statusTab === "history" && item.reviewedAt ? item.reviewedAt : item.updatedAt,
                      ),
                    )}
                  </TableCell>
                  <TableCell>
                    <LinkButton href={`/manager/materials/${item.id}`} size="small">
                      Preview
                    </LinkButton>
                  </TableCell>
                  {statusTab === "history" && item.moderation ? (
                    <TableCell>
                      <Chip
                        size="small"
                        color={moderationColor[item.moderation]}
                        label={item.moderation}
                      />
                    </TableCell>
                  ) : null}
                  <TableCell align="right">
                    <IconButton
                      aria-label={`Review ${item.title}`}
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