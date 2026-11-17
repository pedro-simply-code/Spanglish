"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { IconCalendarPlus, IconLink } from "@tabler/icons-react";
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/features/calendar/calendar.css";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import {
  loadCalendarAction,
  resetCalendarFeedAction,
} from "@/features/calendar/actions";

const localizer = dateFnsLocalizer({
  format,
  getDay,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
  locales: {},
});

export type CalendarRole = "student" | "teacher" | "manager";

type ClassItem = {
  id: string;
  title: string;
  start: string;
  end: string;
  status: "upcoming" | "in-progress" | "completed" | "canceled";
  classType: "one-on-one" | "paired";
  teacherName: string;
  students: string[];
};

type Block = { start: string; end: string };

type Props = {
  role: CalendarRole;
  initialDate: string;
  initialClasses: ClassItem[];
  initialAvailability: Block[];
  teachers?: { id: string; name: string }[];
  hasFeed: boolean;
};

type Event = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  item: ClassItem;
};

const subtitles: Record<CalendarRole, string> = {
  student: "Your live classes. Click an empty time to book a class.",
  teacher: "Your classes over your weekly availability (green).",
  manager:
    "Every class in the academy. Pick a teacher to see their availability.",
};

/** Visible range for a view, padded to whole weeks (month view shows them). */
function rangeFor(date: Date, view: View) {
  if (view === "month") {
    return {
      from: startOfWeek(startOfMonth(date), { weekStartsOn: 1 }),
      to: addDays(endOfWeek(endOfMonth(date), { weekStartsOn: 1 }), 1),
    };
  }
  if (view === "day") {
    const from = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return { from, to: addDays(from, 1) };
  }
  if (view === "agenda") return { from: date, to: addDays(date, 30) };
  const from = startOfWeek(date, { weekStartsOn: 1 });
  return { from, to: addDays(from, 7) };
}

export function CalendarOverview({
  role,
  initialDate,
  initialClasses,
  initialAvailability,
  teachers = [],
  hasFeed,
}: Props) {
  const router = useRouter();
  const [classes, setClasses] = useState(initialClasses);
  const [availability, setAvailability] = useState(initialAvailability);
  const [date, setDate] = useState(() => new Date(initialDate));
  const [view, setView] = useState<View>("month");
  const [teacherId, setTeacherId] = useState("");
  const [loading, startLoading] = useTransition();
  const [feedOpen, setFeedOpen] = useState(false);
  const [feedUrl, setFeedUrl] = useState<string | null>(null);
  const [feedPending, startFeed] = useTransition();
  const request = useRef(0);

  const timeZone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );

  const reload = (nextDate: Date, nextView: View, nextTeacher: string) => {
    const { from, to } = rangeFor(nextDate, nextView);
    const id = ++request.current;
    startLoading(async () => {
      const data = await loadCalendarAction({
        from: from.toISOString(),
        to: to.toISOString(),
        teacherId: nextTeacher || undefined,
      });
      if (id !== request.current) return; // a newer request replaced this one
      setClasses(data.classes);
      setAvailability(data.availability);
    });
  };

  const events: Event[] = useMemo(
    () =>
      classes.map((item) => ({
        id: item.id,
        title: item.title,
        start: new Date(item.start),
        end: new Date(item.end),
        item,
      })),
    [classes],
  );
  const background = useMemo(
    () =>
      availability.map((block, index) => ({
        id: `a${index}`,
        title: "Available",
        start: new Date(block.start),
        end: new Date(block.end),
      })),
    [availability],
  );

  const eventClass = (event: { item?: ClassItem }) => {
    if (!event.item) return { className: "event-available" };
    const { status, classType } = event.item;
    if (status === "canceled") return { className: "event-canceled" };
    if (status === "completed") return { className: "event-muted" };
    return {
      className: classType === "paired" ? "event-azure" : "event-default",
    };
  };

  const createFeed = () =>
    startFeed(async () => {
      const result = await resetCalendarFeedAction();
      setFeedUrl(result.url ?? null);
    });

  return (
    <Box mt={3}>
      <Breadcrumb title="Calendar" subtitle={subtitles[role]} />

      <Card variant="outlined" sx={{ p: 0 }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ md: "center" }}
            justifyContent="space-between"
            mb={2}
          >
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              alignItems="center"
            >
              <Chip
                size="small"
                sx={{ bgcolor: "#fa896b", color: "#fff" }}
                label="Individual"
              />
              <Chip
                size="small"
                sx={{ bgcolor: "#1a97f5", color: "#fff" }}
                label="Paired"
              />
              <Chip
                size="small"
                sx={{ bgcolor: "#b6bcc4", color: "#fff" }}
                label="Finished"
              />
              <Chip
                size="small"
                variant="outlined"
                label="Canceled"
                sx={{ textDecoration: "line-through" }}
              />
              {role !== "student" ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label="Available"
                  sx={{ borderStyle: "dashed", color: "#39b69a" }}
                />
              ) : null}
              <Typography variant="caption" color="text.secondary" ml={1}>
                Times in {timeZone}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {role === "manager" ? (
                <TextField
                  select
                  size="small"
                  label="Teacher"
                  value={teacherId}
                  onChange={(event) => {
                    setTeacherId(event.target.value);
                    reload(date, view, event.target.value);
                  }}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="">All teachers</MenuItem>
                  {teachers.map((teacher) => (
                    <MenuItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </MenuItem>
                  ))}
                </TextField>
              ) : null}
              {role === "student" ? (
                <LinkButton
                  href="/schedule"
                  variant="contained"
                  size="small"
                  startIcon={<IconCalendarPlus size={16} />}
                >
                  Book a class
                </LinkButton>
              ) : null}
              {role === "teacher" ? (
                <LinkButton
                  href="/teacher/availability"
                  variant="outlined"
                  size="small"
                >
                  Edit availability
                </LinkButton>
              ) : null}
              <Button
                size="small"
                variant="outlined"
                startIcon={<IconLink size={16} />}
                onClick={() => {
                  setFeedUrl(null);
                  setFeedOpen(true);
                }}
              >
                Add to my calendar
              </Button>
            </Stack>
          </Stack>

          <Box sx={{ height: 4 }}>{loading ? <LinearProgress /> : null}</Box>

          <Calendar<Event | (typeof background)[number]>
            localizer={localizer}
            events={events}
            backgroundEvents={background}
            date={date}
            view={view}
            views={["month", "week", "day", "agenda"]}
            onNavigate={(next) => {
              setDate(next);
              reload(next, view, teacherId);
            }}
            onView={(next) => {
              setView(next);
              reload(date, next, teacherId);
            }}
            selectable={role === "student"}
            onSelectSlot={() => router.push("/schedule")}
            onSelectEvent={(event) => {
              if ("item" in event) router.push(`/classes/${event.id}`);
            }}
            tooltipAccessor={(event) =>
              "item" in event
                ? `${event.item.title}${event.item.status === "canceled" ? " (canceled)" : ""}`
                : "Available"
            }
            eventPropGetter={(event) =>
              eventClass(event as { item?: ClassItem })
            }
            scrollToTime={new Date(1970, 0, 1, 7)}
            style={{ height: "calc(100vh - 340px)" }}
          />
        </CardContent>
      </Card>

      <Dialog
        open={feedOpen}
        onClose={() => setFeedOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          Add your classes to Google Calendar or Outlook
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              A private link your calendar app checks every hour. Anyone with
              the link can see your class times, so do not share it. Creating a
              new link turns the old one off.
            </Typography>
            {feedUrl ? (
              <>
                <TextField
                  value={feedUrl}
                  fullWidth
                  size="small"
                  slotProps={{
                    htmlInput: { readOnly: true },
                    input: { sx: { fontFamily: "monospace", fontSize: 12 } },
                  }}
                  onFocus={(event) => event.target.select()}
                />
                <Alert severity="info">
                  Google Calendar: Other calendars → + → From URL. Outlook: Add
                  calendar → Subscribe from web. Copy it now: for your security
                  it is shown only once.
                </Alert>
              </>
            ) : hasFeed ? (
              <Alert severity="warning">
                You already have a link. Create a new one only if you lost it or
                think someone else has it.
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setFeedOpen(false)}>Close</Button>
          {feedUrl ? (
            <Button
              variant="contained"
              onClick={() => void navigator.clipboard?.writeText(feedUrl)}
            >
              Copy link
            </Button>
          ) : (
            <Button
              variant="contained"
              disabled={feedPending}
              onClick={createFeed}
            >
              {hasFeed ? "Create a new link" : "Create my link"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
