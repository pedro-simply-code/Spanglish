import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  IconArrowRight,
  IconCalendarEvent,
  IconClock,
  IconVideo,
} from "@tabler/icons-react";
import { LinkButton } from "@/components/ui/link-button";
import { ClassStatusChip } from "@/features/classes/components/class-status-chip";
import { classDetailHref, classRoomHref } from "@/features/classes/data";
import {
  formatClassDateShort,
  formatClassTimeRange,
  formatClassType,
  formatRelativeStart,
  getClassDateParts,
} from "@/features/classes/format";
import {
  decideClassChange,
  getClassStatus,
  getJoinState,
  type ClassPolicy,
} from "@/features/classes/policy";
import type { LiveClass } from "@/features/classes/types";

type ClassListCardProps = {
  item: LiveClass;
  now: string;
  policy: ClassPolicy;
};

export function ClassListCard({ item, now, policy }: ClassListCardProps) {
  const status = getClassStatus(item, now);
  const join = getJoinState(item, now, policy);
  const date = getClassDateParts(item.startsAt);
  const changesOpen =
    status === "upcoming" &&
    decideClassChange(item, "cancel", now, policy).allowed;
  const muted = status === "canceled";

  return (
    <Card elevation={9}>
      <CardContent sx={{ p: { xs: "20px", md: "24px" } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2.5}
          alignItems={{ xs: "stretch", sm: "flex-start" }}
        >
          <Box
            sx={{
              width: { xs: "100%", sm: 72 },
              py: 1.25,
              px: { xs: 2, sm: 1 },
              textAlign: "center",
              bgcolor: muted ? "grey.200" : "primary.light",
              color: muted ? "text.secondary" : "primary.main",
              flexShrink: 0,
            }}
          >
            <Typography
              variant="caption"
              display="block"
              fontWeight={600}
              sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}
            >
              {date.weekday}
            </Typography>
            <Typography variant="h3" fontWeight={700} lineHeight={1.1}>
              {date.day}
            </Typography>
            <Typography variant="caption" display="block">
              {date.month} {date.year}
            </Typography>
          </Box>

          <Box flexGrow={1} minWidth={0}>
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              gap={0.75}
              alignItems="center"
            >
              <ClassStatusChip status={status} />
              <Chip
                label={formatClassType(item.type)}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`${item.duration} min`}
                size="small"
                variant="outlined"
              />
              {status === "upcoming" && !changesOpen ? (
                <Chip
                  label="Changes closed"
                  color="warning"
                  size="small"
                  variant="outlined"
                />
              ) : null}
              {join.canJoin ? (
                <Chip label="Room open" color="success" size="small" />
              ) : null}
            </Stack>

            <Typography
              variant="h5"
              mt={1.25}
              color={muted ? "text.secondary" : "text.primary"}
            >
              {item.topic}
            </Typography>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={{ xs: 0.5, sm: 2 }}
              mt={1}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar
                  src={item.teacherAvatar}
                  alt={item.teacherName}
                  sx={{ width: 24, height: 24 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {item.teacherName}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <IconCalendarEvent size={14} />
                <Typography variant="body2" color="text.secondary">
                  {formatClassDateShort(item.startsAt)}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <IconClock size={14} />
                <Typography variant="body2" color="text.secondary">
                  {formatClassTimeRange(item)}
                </Typography>
              </Stack>
            </Stack>

            <Typography variant="body2" color="text.secondary" mt={1.25}>
              {item.description}
            </Typography>

            {status === "canceled" && item.cancellation ? (
              <Typography variant="body2" color="error.main" mt={1}>
                Canceled by {item.cancellation.by} ·{" "}
                {item.cancellation.reason} ·{" "}
                {item.cancellation.creditRefunded
                  ? "credit returned"
                  : "credit not returned"}
              </Typography>
            ) : null}

            <Typography
              variant="body2"
              mt={1}
              fontWeight={600}
              color={join.canJoin ? "success.main" : "text.secondary"}
            >
              {formatRelativeStart(item, now)}
            </Typography>
          </Box>

          <Stack
            direction={{ xs: "row", sm: "column" }}
            spacing={1.5}
            width={{ xs: "100%", sm: "auto" }}
            flexShrink={0}
          >
            {join.canJoin ? (
              <LinkButton
                href={classRoomHref(item.id)}
                variant="contained"
                color="success"
                startIcon={<IconVideo size={16} />}
              >
                Join
              </LinkButton>
            ) : null}
            <LinkButton
              href={classDetailHref(item.id)}
              variant={join.canJoin ? "outlined" : "contained"}
              endIcon={<IconArrowRight size={16} />}
            >
              Details
            </LinkButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
