"use client";

import { useMemo, useState } from "react";
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
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { IconEye } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { DEFAULT_PAGE_SIZE, sliceForPage } from "@/lib/pagination";
import type { ClassroomSessionStatus, ManagerClassroomRow } from "@/features/management/data";

const sessionStatusKeys: Record<ClassroomSessionStatus, string> = {
  upcoming: "management.rooms.sessionStatus.scheduled",
  "in-progress": "management.rooms.sessionStatus.inProgress",
  completed: "management.rooms.sessionStatus.ended",
  canceled: "management.rooms.sessionStatus.canceled",
};

const sessionStatusColor: Record<
  ClassroomSessionStatus,
  "default" | "primary" | "success" | "warning" | "error"
> = {
  upcoming: "primary",
  "in-progress": "success",
  completed: "default",
  canceled: "error",
};

type SessionFilter = "" | ClassroomSessionStatus;
type LiveFilter = "" | "live" | "not-live" | "waiting-teacher";

function isWaitingForTeacher(room: ManagerClassroomRow) {
  return (
    room.teacherStartsRequired &&
    room.sessionStatus === "in-progress" &&
    !room.teacherSessionActive
  );
}
type EnterFilter = "" | "open";

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

type RoomTranslator = (key: string, values?: Record<string, string | number>) => string;

function studentSummary(students: ManagerClassroomRow["students"], t: RoomTranslator) {
  if (!students.length) return t("management.rooms.noStudentsEnrolled");
  if (students.length === 1) return students[0]!.name;
  return t("management.rooms.studentsCount", { count: students.length });
}

function enterBlockedReason(room: ManagerClassroomRow, t: RoomTranslator) {
  if (room.sessionStatus === "completed") return t("management.rooms.enterBlocked.ended");
  if (room.sessionStatus === "canceled") return t("management.rooms.enterBlocked.canceled");
  if (isWaitingForTeacher(room)) return t("management.rooms.enterBlocked.waitingTeacher");
  return t("management.rooms.enterBlocked.onlyLive");
}

function RoomDetailDialog({
  open,
  room,
  onClose,
}: {
  open: boolean;
  room: ManagerClassroomRow | null;
  onClose: () => void;
}) {
  const t = useTranslations("admin");
  if (!room) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{room.topic}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={room.classTypeLabel} variant="outlined" />
            <Chip
              size="small"
              label={t(sessionStatusKeys[room.sessionStatus])}
              color={sessionStatusColor[room.sessionStatus]}
              variant="outlined"
            />
            {room.isLive ? (
              <Chip size="small" label={t("management.rooms.liveNow")} color="success" />
            ) : null}
            {isWaitingForTeacher(room) ? (
              <Chip
                size="small"
                label={t("management.rooms.waitingForTeacher")}
                color="warning"
                variant="outlined"
              />
            ) : null}
            {room.teacherSessionActive && !room.isLive ? (
              <Chip
                size="small"
                label={t("management.rooms.teacherSessionOpen")}
                color="info"
                variant="outlined"
              />
            ) : null}
          </Stack>

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("management.rooms.detail.schedule")}
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {room.scheduleLabel} · {room.timeRangeLabel} ({room.durationMinutes} min)
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("management.rooms.detail.teacher")}
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {room.teacherName}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("management.rooms.detail.students")}
            </Typography>
            {!room.students.length ? (
              <Typography variant="body2" color="text.secondary">
                {t("management.rooms.noStudentsEnrolledYet")}
              </Typography>
            ) : (
              <List dense disablePadding>
                {room.students.map((student) => (
                  <ListItem key={student.name} disableGutters sx={{ py: 0.25 }}>
                    <ListItemText
                      primary={student.name}
                      secondary={student.joined
                        ? t("management.rooms.detail.joined")
                        : t("management.rooms.detail.notJoined")}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      color={student.joined ? "success" : "default"}
                      label={student.joined
                        ? t("management.rooms.detail.inRoom")
                        : t("management.rooms.detail.absent")}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("management.rooms.detail.classroom")}
            </Typography>
            <Typography variant="body2">
              {t("management.rooms.detail.provider", {
                provider: room.provider,
                roomId: room.meetingRoom,
              })}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {room.joinMessage}
            </Typography>
            {room.teacherStartsRequired ? (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {t("management.rooms.detail.teacherLiveSession")}{" "}
                {room.teacherSessionActive
                  ? t("management.rooms.detail.sessionStarted")
                  : room.sessionStatus === "in-progress"
                    ? t("management.rooms.detail.sessionNotStartedWaiting")
                    : t("management.rooms.detail.sessionNotStarted")}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t("management.rooms.detail.startGateOff")}
              </Typography>
            )}
          </Box>

          {room.description ? (
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t("management.rooms.detail.description")}
              </Typography>
              <Typography variant="body2">{room.description}</Typography>
            </Box>
          ) : null}

          {room.agenda.length ? (
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t("management.rooms.detail.agenda")}
              </Typography>
              <List dense disablePadding sx={{ listStyleType: "disc", pl: 2 }}>
                {room.agenda.map((line) => (
                  <ListItem key={line} disableGutters sx={{ display: "list-item", py: 0 }}>
                    <ListItemText primary={line} primaryTypographyProps={{ variant: "body2" }} />
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : null}

          {room.outcomes.length ? (
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t("management.rooms.detail.outcomes")}
              </Typography>
              <List dense disablePadding sx={{ listStyleType: "disc", pl: 2 }}>
                {room.outcomes.map((line) => (
                  <ListItem key={line} disableGutters sx={{ display: "list-item", py: 0 }}>
                    <ListItemText primary={line} primaryTypographyProps={{ variant: "body2" }} />
                  </ListItem>
                ))}
              </List>
            </Box>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose}>{t("management.rooms.close")}</Button>
        {room.isLive ? (
          <LinkButton href={room.roomHref} variant="contained" color="success">
            {t("management.rooms.enterRoom")}
          </LinkButton>
        ) : (
          <Tooltip title={enterBlockedReason(room, t)}>
            <span>
              <Button variant="outlined" disabled>
                {t("management.rooms.enterRoom")}
              </Button>
            </span>
          </Tooltip>
        )}
      </DialogActions>
    </Dialog>
  );
}

export function RoomsOverview({ rooms, day }: { rooms: ManagerClassroomRow[]; day: string }) {
  const router = useRouter();
  const t = useTranslations("admin");
  const [search, setSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>("");
  const [liveFilter, setLiveFilter] = useState<LiveFilter>("");
  const [enterFilter, setEnterFilter] = useState<EnterFilter>("");
  const [listPage, setListPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = normalizeSearch(search);
    return rooms.filter((room) => {
      if (sessionFilter && room.sessionStatus !== sessionFilter) return false;
      if (liveFilter === "live" && !room.isLive) return false;
      if (liveFilter === "not-live" && (room.isLive || isWaitingForTeacher(room))) return false;
      if (liveFilter === "waiting-teacher" && !isWaitingForTeacher(room)) return false;
      if (enterFilter === "open" && !room.isLive) return false;
      if (!query) return true;
      const haystack = [
        room.topic,
        room.teacherName,
        room.classTypeLabel,
        t(sessionStatusKeys[room.sessionStatus]),
        ...room.students.map((student) => student.name),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [rooms, search, sessionFilter, liveFilter, enterFilter, t]);

  const pageRows = sliceForPage(filtered, listPage, DEFAULT_PAGE_SIZE);
  const detail = detailId ? rooms.find((room) => room.id === detailId) ?? null : null;
  const resetPage = () => setListPage(1);

  const pushDay = (value: string) => {
    resetPage();
    if (value === day) return;
    router.push(value ? `/manager/rooms?date=${value}` : "/manager/rooms");
  };

  return (
    <Box mt={3}>
      <Breadcrumb
        title={t("management.rooms.title")}
        subtitle={t("management.rooms.subtitle")}
        items={[
          { title: t("management.breadcrumb.manager"), to: "/manager" },
          { title: t("management.rooms.title") },
        ]}
      />

      <SectionCard
        title={t("management.rooms.classrooms")}
        subtitle={
          filtered.length === rooms.length
            ? rooms.length === 1
              ? t("management.rooms.subtitleOne", { day })
              : t("management.rooms.subtitleMany", { count: rooms.length, day })
            : t("management.rooms.subtitleFiltered", {
                shown: filtered.length,
                total: rooms.length,
              })
        }
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={2} useFlexGap flexWrap="wrap">
          <TextField
            size="small"
            label={t("management.rooms.filter.day")}
            type="date"
            value={day}
            onChange={(event) => pushDay(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            size="small"
            label={t("management.rooms.filter.search")}
            placeholder={t("management.rooms.filter.searchPlaceholder")}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
            sx={{ minWidth: { md: 200 }, flex: { md: 1 } }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="rooms-session-filter">{t("management.rooms.filter.status")}</InputLabel>
            <Select
              labelId="rooms-session-filter"
              label={t("management.rooms.filter.status")}
              value={sessionFilter}
              onChange={(event) => {
                setSessionFilter(event.target.value as SessionFilter);
                resetPage();
              }}
            >
              <MenuItem value="">{t("management.rooms.filter.any")}</MenuItem>
              {(Object.keys(sessionStatusKeys) as ClassroomSessionStatus[]).map((status) => (
                <MenuItem key={status} value={status}>
                  {t(sessionStatusKeys[status])}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="rooms-live-filter">{t("management.rooms.filter.live")}</InputLabel>
            <Select
              labelId="rooms-live-filter"
              label={t("management.rooms.filter.live")}
              value={liveFilter}
              onChange={(event) => {
                setLiveFilter(event.target.value as LiveFilter);
                resetPage();
              }}
            >
              <MenuItem value="">{t("management.rooms.filter.any")}</MenuItem>
              <MenuItem value="live">{t("management.rooms.liveNow")}</MenuItem>
              <MenuItem value="not-live">{t("management.rooms.notLive")}</MenuItem>
              <MenuItem value="waiting-teacher">{t("management.rooms.waitingForTeacher")}</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="rooms-enter-filter">{t("management.rooms.filter.canEnter")}</InputLabel>
            <Select
              labelId="rooms-enter-filter"
              label={t("management.rooms.filter.canEnter")}
              value={enterFilter}
              onChange={(event) => {
                setEnterFilter(event.target.value as EnterFilter);
                resetPage();
              }}
            >
              <MenuItem value="">{t("management.rooms.filter.any")}</MenuItem>
              <MenuItem value="open">{t("management.rooms.liveOnly")}</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {!rooms.length ? (
          <Typography variant="body2" color="text.secondary">
            {t("management.rooms.empty.noClasses")}
          </Typography>
        ) : !filtered.length ? (
          <Typography variant="body2" color="text.secondary">
            {t("management.rooms.empty.filtered")}
          </Typography>
        ) : (
          <>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t("management.rooms.column.time")}</TableCell>
                    <TableCell>{t("management.rooms.column.class")}</TableCell>
                    <TableCell>{t("management.rooms.filter.live")}</TableCell>
                    <TableCell>{t("management.rooms.detail.teacher")}</TableCell>
                    <TableCell>{t("management.rooms.detail.students")}</TableCell>
                    <TableCell align="right">{t("management.rooms.column.actions")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pageRows.map((room) => (
                    <TableRow key={room.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {room.timeLabel}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {room.durationMinutes} min
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {room.topic}
                        </Typography>
                        <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap" useFlexGap>
                          <Chip size="small" variant="outlined" label={room.classTypeLabel} />
                          <Chip
                            size="small"
                            variant="outlined"
                            color={sessionStatusColor[room.sessionStatus]}
                            label={t(sessionStatusKeys[room.sessionStatus])}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {room.isLive ? (
                          <Chip size="small" color="success" label={t("management.rooms.live")} />
                        ) : isWaitingForTeacher(room) ? (
                          <Chip size="small" color="warning" variant="outlined" label={t("management.rooms.waiting")} />
                        ) : room.sessionStatus === "in-progress" ? (
                          <Chip size="small" color="primary" variant="outlined" label={t("management.rooms.onSchedule")} />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{room.teacherName}</TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap title={studentSummary(room.students, t)}>
                          {studentSummary(room.students, t)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                          <Tooltip title={t("management.rooms.classDetails")}>
                            <IconButton
                              size="small"
                              aria-label={t("management.rooms.viewClassDetails")}
                              onClick={() => setDetailId(room.id)}
                            >
                              <IconEye size={18} />
                            </IconButton>
                          </Tooltip>
                          {room.isLive ? (
                            <LinkButton href={room.roomHref} size="small" variant="contained" color="success">
                              {t("management.rooms.enter")}
                            </LinkButton>
                          ) : (
                            <Tooltip title={enterBlockedReason(room, t)}>
                              <span>
                                <Button size="small" variant="outlined" disabled>
                                  {t("management.rooms.enter")}
                                </Button>
                              </span>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <ListPagination page={listPage} total={filtered.length} onPageChange={setListPage} />
          </>
        )}
      </SectionCard>

      <RoomDetailDialog open={Boolean(detail)} room={detail} onClose={() => setDetailId(null)} />
    </Box>
  );
}