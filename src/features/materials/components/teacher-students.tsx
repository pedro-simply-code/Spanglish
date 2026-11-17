import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconMail, IconTargetArrow, IconUsers } from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import { materialGrants } from "@/features/materials/data";
import { teacherStudents } from "@/features/staff";

export function TeacherStudents() {
  return (
    <Box mt={3}>
      <Breadcrumb
        title="Students"
        subtitle="Your roster, their goals, and the materials they currently have."
        items={[{ title: "Teacher", to: "/teacher" }, { title: "Students" }]}
      />

      <Grid container spacing={3}>
        {teacherStudents.map((student) => {
          const shared = materialGrants.filter(
            (grant) =>
              grant.audience === "student" &&
              grant.audienceLabel === student.name,
          );

          return (
            <Grid key={student.id} size={{ xs: 12, md: 6 }}>
              <Card elevation={9} sx={{ height: "100%" }}>
                <CardContent sx={{ p: "30px" }}>
                  <Stack spacing={2.5}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ width: 52, height: 52 }}>
                        {student.name.charAt(0)}
                      </Avatar>
                      <Box flexGrow={1} minWidth={0}>
                        <Typography variant="h5">{student.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {student.level} · next class {student.nextClass}
                        </Typography>
                      </Box>
                      <LinkButton
                        href="/teacher/materials"
                        size="small"
                        variant="outlined"
                      >
                        Share material
                      </LinkButton>
                    </Stack>

                    <Divider />

                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <IconTargetArrow size={18} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Learning goal
                        </Typography>
                        <Typography variant="subtitle2" fontWeight={600}>
                          {student.goal}
                        </Typography>
                      </Box>
                    </Stack>

                    <Box>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        mb={0.75}
                      >
                        <Typography variant="caption" color="text.secondary">
                          Course progress
                        </Typography>
                        <Typography variant="caption" fontWeight={600}>
                          {student.progress}%
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={student.progress}
                        sx={{ height: 7, borderRadius: 4 }}
                      />
                    </Box>

                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={0.5}>
                      <Chip
                        label={`${shared.length} personal materials`}
                        size="small"
                        variant="outlined"
                        icon={<IconUsers size={13} />}
                      />
                      <Chip
                        label="Roster active"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </Stack>

                    <Stack direction="row" spacing={1}>
                      <LinkButton
                        href="/teacher/assignments"
                        size="small"
                        variant="text"
                      >
                        Assignments
                      </LinkButton>
                      <LinkButton
                        href="/apps/email"
                        size="small"
                        variant="text"
                        startIcon={<IconMail size={14} />}
                      >
                        Message
                      </LinkButton>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
