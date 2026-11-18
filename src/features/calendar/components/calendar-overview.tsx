"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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
import enUS from "date-fns/locale/en-US";
import es from "date-fns/locale/es";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/features/calendar/calendar.css";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import {
  loadCalendarAction,
  resetCalendarFeedAction,
} from "@/features/calendar/actions";

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
  const locale = useLocale();
  const t = useTranslations("apps");
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

  const localizer = useMemo(
    () =>
      dateFnsLocalizer({
        format,
        getDay,
        startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
        locales: { en: enUS, es },
      }),
    [],
  );

  const calendarMessages = useMemo(
    () => ({
      date: t("calendar.rbc.date"),
      time: t("calendar.rbc.time"),
      event: t("calendar.rbc.event"),
      allDay: t("calendar.rbc.allDay"),
      week: t("calendar.rbc.week"),
      work_week: t("calendar.rbc.workWeek"),
      day: t("calendar.rbc.day"),
      month: t("calendar.rbc.month"),
      previous: t("calendar.rbc.previous"),
      next: t("calendar.rbc.next"),
      yesterday: t("calendar.rbc.yesterday"),
      tomorrow: t("calendar.rbc.tomorrow"),
      today: t("calendar.rbc.today"),
      agenda: t("calendar.rbc.agenda"),
      showMore: (count: number) => t("calendar.rbc.showMore", { count }),
      noEventsInRange: t("calendar.rbc.noEventsInRange"),
    }),
    [t],
  );

  const subtitles: Record<CalendarRole, string> = {
    student: t("calendar.subtitle.student"),
    teacher: t("calendar.subtitle.teacher"),
    manager: t("calendar.subtitle.manager"),
  };

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
        title: t("calendar.legend.available"),
        start: new Date(block.start),
        end: new Date(block.end),
      })),
    [availability, t],
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
      <Breadcrumb title={t("calendar.breadcrumb")} subtitle={subtitles[role]} />

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
                label={t("calendar.legend.individual")}
              />
              <Chip
                size="small"
                sx={{ bgcolor: "#1a97f5", color: "#fff" }}
                label={t("calendar.legend.paired")}
              />
              <Chip
                size="small"
                sx={{ bgcolor: "#b6bcc4", color: "#fff" }}
                label={t("calendar.legend.finished")}
              />
              <Chip
                size="small"
                variant="outlined"
                label={t("calendar.legend.canceled")}
                sx={{ textDecoration: "line-through" }}
              />
              {role !== "student" ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={t("calendar.legend.available")}
                  sx={{ borderStyle: "dashed", color: "#39b69a" }}
                />
              ) : null}
              <Typography variant="caption" color="text.secondary" ml={1}>
                {t("calendar.timezone", { timeZone })}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {role === "manager" ? (
                <TextField
                  select
                  size="small"
                  label={t("calendar.toolbar.teacher")}
                  value={teacherId}
                  onChange={(event) => {
                    setTeacherId(event.target.value);
                    reload(date, view, event.target.value);
                  }}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="">{t("calendar.toolbar.allTeachers")}</MenuItem>
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
                  {t("calendar.toolbar.bookClass")}
                </LinkButton>
              ) : null}
              {role === "teacher" ? (
                <LinkButton
                  href="/teacher/availability"
                  variant="outlined"
                  size="small"
                >
                  {t("calendar.toolbar.editAvailability")}
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
                {t("calendar.toolbar.addToCalendar")}
              </Button>
            </Stack>
          </Stack>

          <Box sx={{ height: 4 }}>{loading ? <LinearProgress /> : null}</Box>

          <Calendar<Event | (typeof background)[number]>
            localizer={localizer}
            culture={locale}
            messages={calendarMessages}
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
                ? `${event.item.title}${
                    event.item.status === "canceled"
                      ? t("calendar.event.canceledSuffix")
                      : ""
                  }`
                : t("calendar.legend.available")
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
        <DialogTitle>{t("calendar.feed.title")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {t("calendar.feed.description")}
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
                <Alert severity="info">{t("calendar.feed.instructions")}</Alert>
              </>
            ) : hasFeed ? (
              <Alert severity="warning">
                {t("calendar.feed.existingWarning")}
              </Alert>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setFeedOpen(false)}>{t("common.close")}</Button>
          {feedUrl ? (
            <Button
              variant="contained"
              onClick={() => void navigator.clipboard?.writeText(feedUrl)}
            >
              {t("calendar.feed.copyLink")}
            </Button>
          ) : (
            <Button
              variant="contained"
              disabled={feedPending}
              onClick={createFeed}
            >
              {hasFeed
                ? t("calendar.feed.createNewLink")
                : t("calendar.feed.createLink")}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
