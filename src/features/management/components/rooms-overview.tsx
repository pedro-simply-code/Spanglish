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
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { DEFAULT_PAGE_SIZE, sliceForPage } from "@/lib/pagination";
import type { ClassroomSessionStatus, ManagerClassroomRow } from "@/features/management/data";

const sessionStatusLabel: Record<ClassroomSessionStatus, string> = {
  upcoming: "Scheduled",
  "in-progress": "In progress",
  completed: "Ended",
  canceled: "Canceled",
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

function studentSummary(students: ManagerClassroomRow["students"]) {
  if (!students.length) return "No students enrolled";
  if (students.length === 1) return students[0]!.name;
  return `${students.length} students`;
}

function enterBlockedReason(room: ManagerClassroomRow) {
  if (room.sessionStatus === "completed") return "This class has ended.";
  if (room.sessionStatus === "canceled") return "This class was canceled.";
  if (room.sessionStatus === "upcoming") return "You can enter only while the class is live.";
  if (isWaitingForTeacher(room)) return "Waiting for the teacher to start the live session.";
  return "You can enter only while the class is live.";
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
              label={sessionStatusLabel[room.sessionStatus]}
              color={sessionStatusColor[room.sessionStatus]}
              variant="outlined"
            />
            {room.isLive ? <Chip size="small" label="Live now" color="success" /> : null}
            {isWaitingForTeacher(room) ? (
              <Chip size="small" label="Waiting for teacher" color="warning" variant="outlined" />
            ) : null}
            {room.teacherSessionActive && !room.isLive ? (
              <Chip size="small" label="Teacher session open" color="info" variant="outlined" />
            ) : null}
          </Stack>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Schedule
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {room.scheduleLabel} · {room.timeRangeLabel} ({room.durationMinutes} min)
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Teacher
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {room.teacherName}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Students
            </Typography>
            {!room.students.length ? (
              <Typography variant="body2" color="text.secondary">
                No students enrolled yet.
              </Typography>
            ) : (
              <List dense disablePadding>
                {room.students.map((student) => (
                  <ListItem key={student.name} disableGutters sx={{ py: 0.25 }}>
                    <ListItemText
                      primary={student.name}
                      secondary={student.joined ? "Joined the classroom" : "Not joined yet"}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      color={student.joined ? "success" : "default"}
                      label={student.joined ? "In room" : "Absent"}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>

          <Box>
            <Typography variant="caption" color="text.secondary">
              Classroom
            </Typography>
            <Typography variant="body2">
              Provider: {room.provider} · Room id: {room.meetingRoom}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {room.joinMessage}
            </Typography>
            {room.teacherStartsRequired ? (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Teacher live session:{" "}
                {room.teacherSessionActive
                  ? "started — room is broadcasting."
                  : room.sessionStatus === "in-progress"
                    ? "not started yet — students wait for the teacher."
                    : "not started."}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Teacher start gate is off — the room follows the schedule window only.
              </Typography>
            )}
          </Box>

          {room.description ? (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body2">{room.description}</Typography>
            </Box>
          ) : null}

          {room.agenda.length ? (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Agenda
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
                Outcomes
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
        <Button onClick={onClose}>Close</Button>
        {room.isLive ? (
          <LinkButton href={room.roomHref} variant="contained" color="success">
            Enter room
          </LinkButton>
        ) : (
          <Tooltip title={enterBlockedReason(room)}>
            <span>
              <Button variant="outlined" disabled>
                Enter room
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
        sessionStatusLabel[room.sessionStatus],
        ...room.students.map((student) => student.name),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [rooms, search, sessionFilter, liveFilter, enterFilter]);

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
        title="Rooms"
        subtitle="Scheduled classes for the day — you can enter the classroom only while it is live."
        items={[
          { title: "Manager", to: "/manager" },
          { title: "Rooms" },
        ]}
      />

      <SectionCard
        title="Classrooms"
        subtitle={
          filtered.length === rooms.length
            ? `${rooms.length} class${rooms.length === 1 ? "" : "es"} on ${day}`
            : `${filtered.length} of ${rooms.length} match filters`
        }
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} mb={2} useFlexGap flexWrap="wrap">
          <TextField
            size="small"
            label="Day"
            type="date"
            value={day}
            onChange={(event) => pushDay(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            size="small"
            label="Search"
            placeholder="Topic, teacher, student…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
            sx={{ minWidth: { md: 200 }, flex: { md: 1 } }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="rooms-session-filter">Status</InputLabel>
            <Select
              labelId="rooms-session-filter"
              label="Status"
              value={sessionFilter}
              onChange={(event) => {
                setSessionFilter(event.target.value as SessionFilter);
                resetPage();
              }}
            >
              <MenuItem value="">Any</MenuItem>
              {(Object.keys(sessionStatusLabel) as ClassroomSessionStatus[]).map((status) => (
                <MenuItem key={status} value={status}>
                  {sessionStatusLabel[status]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="rooms-live-filter">Live</InputLabel>
            <Select
              labelId="rooms-live-filter"
              label="Live"
              value={liveFilter}
              onChange={(event) => {
                setLiveFilter(event.target.value as LiveFilter);
                resetPage();
              }}
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="live">Live now</MenuItem>
              <MenuItem value="not-live">Not live</MenuItem>
              <MenuItem value="waiting-teacher">Waiting for teacher</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="rooms-enter-filter">Can enter</InputLabel>
            <Select
              labelId="rooms-enter-filter"
              label="Can enter"
              value={enterFilter}
              onChange={(event) => {
                setEnterFilter(event.target.value as EnterFilter);
                resetPage();
              }}
            >
              <MenuItem value="">Any</MenuItem>
              <MenuItem value="open">Live only</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {!rooms.length ? (
          <Typography variant="body2" color="text.secondary">
            No classes scheduled on this day. Pick another date or check the academy calendar.
          </Typography>
        ) : !filtered.length ? (
          <Typography variant="body2" color="text.secondary">
            No classes match the current filters.
          </Typography>
        ) : (
          <>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell>Live</TableCell>
                    <TableCell>Teacher</TableCell>
                    <TableCell>Students</TableCell>
                    <TableCell align="right">Actions</TableCell>
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
                            label={sessionStatusLabel[room.sessionStatus]}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {room.isLive ? (
                          <Chip size="small" color="success" label="Live" />
                        ) : isWaitingForTeacher(room) ? (
                          <Chip size="small" color="warning" variant="outlined" label="Waiting" />
                        ) : room.sessionStatus === "in-progress" ? (
                          <Chip size="small" color="primary" variant="outlined" label="On schedule" />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{room.teacherName}</TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap title={studentSummary(room.students)}>
                          {studentSummary(room.students)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end" alignItems="center">
                          <Tooltip title="Class details">
                            <IconButton
                              size="small"
                              aria-label="View class details"
                              onClick={() => setDetailId(room.id)}
                            >
                              <IconEye size={18} />
                            </IconButton>
                          </Tooltip>
                          {room.isLive ? (
                            <LinkButton href={room.roomHref} size="small" variant="contained" color="success">
                              Enter
                            </LinkButton>
                          ) : (
                            <Tooltip title={enterBlockedReason(room)}>
                              <span>
                                <Button size="small" variant="outlined" disabled>
                                  Enter
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