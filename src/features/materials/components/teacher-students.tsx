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
import { getLocale, getTranslations } from "next-intl/server";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";
import {
  localizeMaterialGrants,
  materialGrants,
} from "@/features/materials/data";
import { localizedTeacherStudents } from "@/features/staff";

export async function TeacherStudents() {
  const t = await getTranslations("educator");
  const locale = await getLocale();
  const students = localizedTeacherStudents(t);
  const grants = localizeMaterialGrants(materialGrants, (key) =>
    t(`materials.${key}`),
  );
  const dateFormat = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Box>
      <Breadcrumb
        title={t("teacher.students.title")}
        subtitle={t("teacher.students.subtitle")}
        items={[
          { title: t("shell.roles.teacher"), to: "/teacher" },
          { title: t("teacher.students.title") },
        ]}
      />

      <Grid container spacing={3}>
        {students.map((student) => {
          const shared = grants.filter(
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
                          {student.level} · {t("staff.teacherStudents.nextClass", { date: dateFormat.format(new Date(student.nextClassAt)) })}
                        </Typography>
                      </Box>
                      <LinkButton
                        href="/teacher/materials"
                        size="small"
                        variant="outlined"
                      >
                        {t("staff.teacherStudents.shareMaterial")}
                      </LinkButton>
                    </Stack>

                    <Divider />

                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <IconTargetArrow size={18} />
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {t("staff.teacherStudents.learningGoal")}
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
                          {t("staff.teacherStudents.courseProgress")}
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
                        label={t("staff.teacherStudents.personalMaterials", { count: shared.length })}
                        size="small"
                        variant="outlined"
                        icon={<IconUsers size={13} />}
                      />
                      <Chip
                        label={t("staff.teacherStudents.rosterActive")}
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
                        {t("teacher.assignments.title")}
                      </LinkButton>
                      <LinkButton
                        href="/apps/email"
                        size="small"
                        variant="text"
                        startIcon={<IconMail size={14} />}
                      >
                        {t("staff.teacherStudents.message")}
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
