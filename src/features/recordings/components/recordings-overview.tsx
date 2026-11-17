"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  IconArrowRight,
  IconClock,
  IconDownload,
  IconEye,
  IconFileText,
  IconPlayerPlay,
  IconServer,
  IconVideo,
} from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { getClassById } from "@/features/classes/data";
import { getRecordings } from "@/features/materials/data";
import { formatMaterialDateTime } from "@/features/materials/format";
import { formatRecordingBytes } from "@/features/recordings/format";
import type { StoredClassRecording } from "@/features/recordings/types";

type RecordingsOverviewProps = {
  ownerName: string;
  storedRecordings: StoredClassRecording[];
};

export function RecordingsOverview({
  ownerName,
  storedRecordings,
}: RecordingsOverviewProps) {
  const libraryRecordings = getRecordings(ownerName);

  return (
    <Box mt={3}>
      <Breadcrumb
        title="Recordings"
        subtitle="Class captures from the classroom and your materials library."
        items={[
          { title: "Teacher", to: "/teacher" },
          { title: "Recordings" },
        ]}
      />

      {storedRecordings.length ? (
        <Box mb={3}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Saved on server
          </Typography>
          <Grid container spacing={3}>
            {storedRecordings.map((recording) => (
              <Grid key={recording.id} size={{ xs: 12, md: 6 }}>
                <StoredRecordingCard recording={recording} />
              </Grid>
            ))}
          </Grid>
        </Box>
      ) : null}

      <Typography variant="h6" fontWeight={600} mb={2}>
        Materials library
      </Typography>

      <Grid container spacing={3}>
        {libraryRecordings.map((recording) => {
          const liveClass = recording.classId
            ? getClassLabel(recording.classId)
            : null;

          return (
            <Grid key={recording.id} size={{ xs: 12, md: 6 }}>
              <Card elevation={9} sx={{ height: "100%" }}>
                <CardContent sx={{ p: "30px" }}>
                  <Stack spacing={2}>
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      alignItems="center"
                    >
                      <Chip
                        label="Recording"
                        color="primary"
                        size="small"
                        variant="outlined"
                      />
                      {recording.transcriptReady ? (
                        <Chip
                          label="Transcript ready"
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      ) : null}
                      {recording.duration ? (
                        <Chip
                          label={recording.duration}
                          size="small"
                          variant="outlined"
                          icon={<IconClock size={13} />}
                        />
                      ) : null}
                    </Stack>

                    <Stack direction="row" spacing={2} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 54,
                          height: 54,
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: "primary.main",
                          color: "#fff",
                          borderRadius: 1.5,
                        }}
                      >
                        <IconVideo size={26} />
                      </Box>
                      <Box minWidth={0}>
                        <Typography variant="h6">{recording.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {recording.description}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          mt={1}
                        >
                          {liveClass ?? "Standalone recording"} ·{" "}
                          {formatMaterialDateTime(recording.updatedAt)}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={2} alignItems="center">
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <IconEye size={15} />
                        <Typography variant="body2" color="text.secondary">
                          {recording.views ?? 0} views
                        </Typography>
                      </Stack>
                      <Box flexGrow={1} />
                      <LinkButton
                        href={`/teacher/materials/${recording.id}`}
                        size="small"
                        variant="outlined"
                        endIcon={<IconArrowRight size={14} />}
                      >
                        Details
                      </LinkButton>
                    </Stack>

                    <Stack direction="row" spacing={1}>
                      {recording.classId ? (
                        <LinkButton
                          href={`/classes/${recording.classId}`}
                          size="small"
                          variant="text"
                        >
                          Open class
                        </LinkButton>
                      ) : null}
                      <LinkButton
                        href={`/teacher/materials/${recording.id}`}
                        size="small"
                        variant="text"
                        startIcon={<IconPlayerPlay size={14} />}
                      >
                        Preview
                      </LinkButton>
                      <LinkButton
                        href="/teacher/assignments"
                        size="small"
                        variant="text"
                        startIcon={<IconFileText size={14} />}
                      >
                        Share
                      </LinkButton>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        {!libraryRecordings.length && !storedRecordings.length ? (
          <Grid size={12}>
            <Card elevation={9}>
              <CardContent sx={{ p: "30px" }}>
                <Typography color="text.secondary">
                  No recordings yet. Stop a recording in the classroom to save a
                  file under <code>storage/recordings/</code> (local mode), or
                  add materials in the library.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ) : null}
      </Grid>
    </Box>
  );
}

function StoredRecordingCard({
  recording,
}: {
  recording: StoredClassRecording;
}) {
  const title =
    recording.classTopic ?? recording.fileName.replace(/\.webm$/i, "");

  return (
    <Card elevation={9} sx={{ height: "100%" }}>
      <CardContent sx={{ p: "30px" }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <Chip
              label="On server disk"
              color="secondary"
              size="small"
              variant="outlined"
              icon={<IconServer size={13} />}
            />
            <Chip
              label={formatRecordingBytes(recording.sizeBytes)}
              size="small"
              variant="outlined"
            />
          </Stack>

          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box
              sx={{
                width: 54,
                height: 54,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "secondary.main",
                color: "#fff",
                borderRadius: 1.5,
              }}
            >
              <IconVideo size={26} />
            </Box>
            <Box minWidth={0}>
              <Typography variant="h6">{title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {recording.fileName}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mt={1}
              >
                {recording.classTopic ?? "Class"} ·{" "}
                {formatMaterialDateTime(recording.createdAt)}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            {recording.downloadUrl ? (
              <>
                <LinkButton
                  href={recording.downloadUrl}
                  size="small"
                  variant="contained"
                  startIcon={<IconPlayerPlay size={14} />}
                >
                  Play
                </LinkButton>
                <LinkButton
                  href={recording.downloadUrl}
                  size="small"
                  variant="outlined"
                  startIcon={<IconDownload size={14} />}
                >
                  Download
                </LinkButton>
              </>
            ) : (
              <Chip
                size="small"
                color={recording.status === "failed" ? "error" : "warning"}
                label={
                  recording.status === "failed"
                    ? "Failed"
                    : recording.status === "recording"
                      ? "Recording…"
                      : "Processing…"
                }
              />
            )}
            <LinkButton
              href={`/classes/${recording.classId}`}
              size="small"
              variant="text"
            >
              Open class
            </LinkButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function getClassLabel(classId: string) {
  return getClassById(classId)?.topic ?? "Class recording";
}