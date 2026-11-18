"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { IconChevronRight, IconSearch } from "@tabler/icons-react";
import { useLocale, useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SectionCard } from "@/components/ui/section-card";
import { localizeDemoClassTopic } from "@/features/materials/data";
import { formatMaterialDateTime } from "@/features/materials/format";
import { formatRecordingBytes } from "@/features/recordings/format";
import type { StoredClassRecording } from "@/features/recordings/types";

const PAGE_SIZE = 10;

type RecordingsOverviewProps = {
  storedRecordings: StoredClassRecording[];
};

type StatusFilter = "all" | "ready" | "processing" | "failed";

type SessionGroup = {
  classId: string;
  title: string;
  classStartsAt: string;
  teacherName: string;
  students: { id: string; name: string }[];
  /** Oldest first, matching the "Parte N" order on the class page. */
  recordings: StoredClassRecording[];
  ready: number;
  failed: StoredClassRecording[];
  inProgress: boolean;
  recordingNow: boolean;
  totalBytes: number;
  inCloud: boolean;
};

/** One entry per class session; newest class first. */
function groupBySession(
  items: StoredClassRecording[],
  titleFor: (recording: StoredClassRecording) => string,
): SessionGroup[] {
  const byClass = new Map<string, StoredClassRecording[]>();
  for (const recording of items) {
    const list = byClass.get(recording.classId) ?? [];
    list.push(recording);
    byClass.set(recording.classId, list);
  }
  return [...byClass.values()]
    .map((list) => {
      const recordings = [...list].sort(
        (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
      );
      const first = recordings[0]!;
      return {
        classId: first.classId,
        title: titleFor(first),
        classStartsAt: first.classStartsAt,
        teacherName: first.teacherName,
        students: first.students,
        recordings,
        ready: recordings.filter((r) => r.status === "ready").length,
        failed: recordings.filter((r) => r.status === "failed"),
        inProgress: recordings.some(
          (r) => r.status === "recording" || r.status === "uploading",
        ),
        recordingNow: recordings.some((r) => r.status === "recording"),
        totalBytes: recordings.reduce((sum, r) => sum + r.sizeBytes, 0),
        inCloud: recordings.some((r) => r.storage === "b2"),
      };
    })
    .sort((a, b) => Date.parse(b.classStartsAt) - Date.parse(a.classStartsAt));
}

/** yyyy-mm-dd in the viewer's timezone, to compare with date inputs. */
function localDay(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function RecordingsOverview({ storedRecordings }: RecordingsOverviewProps) {
  const t = useTranslations("educator");
  const materialsT = useTranslations("educator.materials");
  const locale = useLocale();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [studentId, setStudentId] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);

  const groups = useMemo(
    () =>
      groupBySession(storedRecordings, (recording) =>
        localizeDemoClassTopic(
          recording.classId,
          recording.classTopic ?? t("teacher.recordings.class"),
          materialsT,
        ),
      ),
    [storedRecordings, t, materialsT],
  );

  const studentOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const group of groups) {
      for (const student of group.students) names.set(student.id, student.name);
    }
    return [...names.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, locale));
  }, [groups, locale]);

  const showTeacher = new Set(groups.map((g) => g.teacherName)).size > 1;

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(locale);
    return groups.filter((group) => {
      if (studentId !== "all" && !group.students.some((s) => s.id === studentId)) {
        return false;
      }
      if (status === "ready" && !group.ready) return false;
      if (status === "processing" && !group.inProgress) return false;
      if (status === "failed" && !group.failed.length) return false;
      const day = localDay(group.classStartsAt);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (query) {
        const haystack = [
          group.title,
          group.teacherName,
          ...group.students.map((s) => s.name),
        ]
          .join(" ")
          .toLocaleLowerCase(locale);
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [groups, search, studentId, status, from, to, locale]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );
  const hasFilters =
    Boolean(search) || studentId !== "all" || status !== "all" || Boolean(from) || Boolean(to);

  // Every filter change goes back to the first page.
  const onFilter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(0);
    };

  const clearFilters = () => {
    setSearch("");
    setStudentId("all");
    setStatus("all");
    setFrom("");
    setTo("");
    setPage(0);
  };

  const classHref = (classId: string) => `/classes/${classId}#class-recording`;

  return (
    <Box mt={3}>
      <Breadcrumb
        title={t("teacher.recordings.title")}
        subtitle={t("teacher.recordings.subtitle")}
        items={[
          { title: t("shell.roles.teacher"), to: "/teacher" },
          { title: t("teacher.recordings.title") },
        ]}
      />

      <SectionCard title={t("teacher.recordings.classRecordings")}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          mb={3}
          alignItems={{ md: "center" }}
          flexWrap="wrap"
          useFlexGap
        >
          <TextField
            size="small"
            label={t("teacher.recordings.filters.search")}
            value={search}
            onChange={(event) => onFilter(setSearch)(event.target.value)}
            slotProps={{
              input: { startAdornment: <IconSearch size={16} style={{ marginRight: 8 }} /> },
            }}
            sx={{ flex: "1 1 200px", minWidth: 200 }}
          />
          <TextField
            select
            size="small"
            label={t("teacher.recordings.filters.student")}
            value={studentId}
            onChange={(event) => onFilter(setStudentId)(event.target.value)}
            sx={{ width: { md: 210 } }}
          >
            <MenuItem value="all">{t("teacher.recordings.filters.allStudents")}</MenuItem>
            {studentOptions.map((student) => (
              <MenuItem key={student.id} value={student.id}>
                {student.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label={t("teacher.recordings.filters.status")}
            value={status}
            onChange={(event) =>
              onFilter(setStatus)(event.target.value as StatusFilter)
            }
            sx={{ width: { md: 140 } }}
          >
            <MenuItem value="all">{t("teacher.recordings.filters.allStatuses")}</MenuItem>
            <MenuItem value="ready">{t("teacher.recordings.filters.ready")}</MenuItem>
            <MenuItem value="processing">{t("teacher.recordings.processing")}</MenuItem>
            <MenuItem value="failed">{t("teacher.recordings.failed")}</MenuItem>
          </TextField>
          <TextField
            type="date"
            size="small"
            label={t("teacher.recordings.filters.from")}
            value={from}
            onChange={(event) => onFilter(setFrom)(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: { md: 160 } }}
          />
          <TextField
            type="date"
            size="small"
            label={t("teacher.recordings.filters.to")}
            value={to}
            onChange={(event) => onFilter(setTo)(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: { md: 160 } }}
          />
          {hasFilters ? (
            <Button size="small" onClick={clearFilters}>
              {t("teacher.recordings.filters.clear")}
            </Button>
          ) : null}
        </Stack>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("teacher.recordings.columns.class")}</TableCell>
                {showTeacher ? (
                  <TableCell>{t("teacher.recordings.columns.teacher")}</TableCell>
                ) : null}
                <TableCell>{t("teacher.recordings.columns.students")}</TableCell>
                <TableCell>{t("teacher.recordings.columns.recordings")}</TableCell>
                <TableCell>{t("teacher.recordings.columns.storage")}</TableCell>
                <TableCell align="right">{t("teacher.recordings.size")}</TableCell>
                <TableCell>{t("teacher.recordings.status")}</TableCell>
                <TableCell padding="checkbox" />
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((group) => (
                <TableRow
                  key={group.classId}
                  hover
                  onClick={() => router.push(classHref(group.classId))}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell>
                    <Typography
                      component={Link}
                      href={classHref(group.classId)}
                      onClick={(event) => event.stopPropagation()}
                      variant="subtitle2"
                      color="text.primary"
                      sx={{ textDecoration: "none" }}
                    >
                      {group.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatMaterialDateTime(group.classStartsAt, locale)}
                    </Typography>
                  </TableCell>
                  {showTeacher ? <TableCell>{group.teacherName}</TableCell> : null}
                  <TableCell>
                    {group.students.length ? (
                      group.students.map((s) => s.name).join(", ")
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        {t("teacher.recordings.noStudents")}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {t("teacher.recordings.parts", { count: group.recordings.length })}
                    <Typography variant="caption" color="text.secondary" display="block">
                      {t("teacher.recordings.readyCount", { count: group.ready })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {group.inCloud
                      ? t("teacher.recordings.inCloud")
                      : t("teacher.recordings.onServerDisk")}
                  </TableCell>
                  <TableCell align="right">
                    {group.totalBytes ? formatRecordingBytes(group.totalBytes) : "—"}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {group.inProgress ? (
                        <Chip
                          size="small"
                          color="warning"
                          label={t(
                            group.recordingNow
                              ? "teacher.recordings.recordingNow"
                              : "teacher.recordings.processing",
                          )}
                        />
                      ) : null}
                      {group.failed.length ? (
                        <Chip
                          size="small"
                          color="error"
                          title={
                            group.failed
                              .map((r) => r.error)
                              .filter(Boolean)
                              .join("\n") || undefined
                          }
                          label={t("teacher.recordings.failedCount", {
                            count: group.failed.length,
                          })}
                        />
                      ) : null}
                      {!group.inProgress && !group.failed.length ? (
                        <Chip
                          size="small"
                          color="success"
                          variant="outlined"
                          label={t("teacher.recordings.filters.ready")}
                        />
                      ) : null}
                    </Stack>
                  </TableCell>
                  <TableCell padding="checkbox">
                    <IconChevronRight size={18} />
                  </TableCell>
                </TableRow>
              ))}

              {!pageRows.length ? (
                <TableRow>
                  <TableCell colSpan={showTeacher ? 8 : 7}>
                    <Typography color="text.secondary" py={2}>
                      {groups.length
                        ? t("teacher.recordings.noMatches")
                        : t("teacher.recordings.noRecordings")}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filtered.length}
          page={currentPage}
          onPageChange={(_, next) => setPage(next)}
          rowsPerPage={PAGE_SIZE}
          rowsPerPageOptions={[]}
          labelDisplayedRows={({ from: start, to: end, count }) =>
            t("teacher.recordings.pagination", { from: start, to: end, count })
          }
        />
      </SectionCard>
    </Box>
  );
}
