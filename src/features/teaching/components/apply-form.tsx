"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import FormLabel from "@mui/material/FormLabel";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useLocale, useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SectionCard } from "@/components/ui/section-card";
import {
  submitApplicationAction,
  withdrawApplicationAction,
} from "@/features/teaching/actions";
import {
  localizedCredentialTypes,
  localizedTeacherApplicationTracks,
  localizedTeacherFluencyLevels,
  type TeacherApplicationTrack,
  type TeacherFluencyLevel,
} from "@/lib/teacher-application";
import { useAppToast } from "@/lib/use-app-toast";

export type MyApplication = {
  status: "submitted" | "approved" | "rejected" | "withdrawn";
  headline: string;
  createdAt: string;
  reviewNote: string | null;
} | null;

const emptyCredential = {
  type: "celta",
  label: "",
  year: "",
  url: "",
};

export function ApplyForm({ application }: { application: MyApplication }) {
  const t = useTranslations("educator");
  const locale = useLocale();
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    track: "conversation" as TeacherApplicationTrack,
    fluency: "native" as TeacherFluencyLevel,
    fluencyNote: "",
    yearsTeaching: "0",
    taughtOnlineBefore: false,
    headline: "",
    bio: "",
    country: "",
    experience: "",
    videoUrl: "",
    spanish: false,
    english: false,
    credential: { ...emptyCredential },
  });

  const open = application?.status === "submitted";
  const certified = form.track === "certified";
  const dateFormat = new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const tracks = localizedTeacherApplicationTracks(t);
  const fluencyLevels = localizedTeacherFluencyLevels(t);
  const credentialOptions = localizedCredentialTypes(t);

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const credentials = certified
        ? [
            {
              type: form.credential.type,
              label: form.credential.label,
              year: form.credential.year ? Number(form.credential.year) : null,
              url: form.credential.url || null,
            },
          ]
        : [];
      const result = await submitApplicationAction({
        track: form.track,
        fluency: form.fluency,
        fluencyNote: form.fluencyNote,
        yearsTeaching: Number(form.yearsTeaching) || 0,
        taughtOnlineBefore: form.taughtOnlineBefore,
        credentials,
        headline: form.headline,
        bio: form.bio,
        country: form.country,
        experience: form.experience,
        videoUrl: form.videoUrl || undefined,
        teaches: [form.spanish ? "spanish" : "", form.english ? "english" : ""].filter(Boolean),
      });
      if (result.ok) {
        showSuccess({ message: result.message });
        router.refresh();
      } else {
        setError(result.message);
      }
    });
  };

  const withdraw = () =>
    startTransition(async () => {
      const result = await withdrawApplicationAction();
      if (result.ok) {
        showSuccess({ message: result.message });
        router.refresh();
      } else showError({ message: result.message });
    });

  return (
    <Box>
      <Breadcrumb
        title={t("teacher.apply.title")}
        subtitle={t("teacher.apply.subtitle")}
      />

      {application ? (
        <Alert
          severity={open ? "info" : application.status === "approved" ? "success" : "warning"}
          sx={{ mb: 3 }}
          action={
            open ? (
              <Button color="inherit" size="small" onClick={withdraw} disabled={pending}>
                {t("teacher.apply.withdraw")}
              </Button>
            ) : undefined
          }
        >
          {open
            ? t("teacher.apply.statusOpen", { date: dateFormat.format(new Date(application.createdAt)) })
            : application.status === "rejected"
              ? t("teacher.apply.statusRejected", {
                  note: application.reviewNote ? ` ${application.reviewNote}` : "",
                })
              : application.status === "withdrawn"
                ? t("teacher.apply.statusWithdrawn")
                : t("teacher.apply.statusApproved")}
        </Alert>
      ) : null}

      {!open ? (
        <SectionCard
          title={t("teacher.apply.cardTitle")}
          subtitle={t("teacher.apply.cardSubtitle")}
        >
          <Stack spacing={2.5} maxWidth={720}>
            {error ? <Alert severity="error">{error}</Alert> : null}

            <FormControl>
              <FormLabel>{t("applications.track")}</FormLabel>
              <RadioGroup
                value={form.track}
                onChange={(event) => setForm({ ...form, track: event.target.value as TeacherApplicationTrack })}
              >
                {tracks.map((item) => (
                  <FormControlLabel
                    key={item.id}
                    value={item.id}
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="subtitle2">{item.label}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.description}
                        </Typography>
                      </Box>
                    }
                  />
                ))}
              </RadioGroup>
            </FormControl>

            <Divider />

            <FormControl>
              <FormLabel>{t("teacher.apply.fluency")}</FormLabel>
              <RadioGroup
                value={form.fluency}
                onChange={(event) => setForm({ ...form, fluency: event.target.value as TeacherFluencyLevel })}
              >
                {fluencyLevels.map((item) => (
                  <FormControlLabel key={item.id} value={item.id} control={<Radio />} label={item.label} />
                ))}
              </RadioGroup>
            </FormControl>
            {form.fluency === "other" ? (
              <TextField
                label={t("teacher.apply.fluencyDetails")}
                multiline
                minRows={2}
                helperText={t("teacher.apply.fluencyDetailsHelper")}
                value={form.fluencyNote}
                onChange={(event) => setForm({ ...form, fluencyNote: event.target.value })}
                slotProps={{ htmlInput: { maxLength: 500 } }}
              />
            ) : null}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label={t("teacher.apply.yearsTeaching")}
                type="number"
                value={form.yearsTeaching}
                onChange={(event) => setForm({ ...form, yearsTeaching: event.target.value })}
                slotProps={{ htmlInput: { min: 0, max: 60 } }}
                sx={{ width: { sm: 220 } }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.taughtOnlineBefore}
                    onChange={(event) => setForm({ ...form, taughtOnlineBefore: event.target.checked })}
                  />
                }
                label={t("teacher.apply.taughtOnline")}
              />
            </Stack>

            <TextField
              label={t("applications.headline")}
              placeholder={t("teacher.apply.headlinePlaceholder")}
              value={form.headline}
              onChange={(event) => setForm({ ...form, headline: event.target.value })}
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            <Box>
              <Typography variant="subtitle2" mb={0.5}>
                {t("teacher.apply.iTeach")}
              </Typography>
              <FormGroup row>
                <FormControlLabel
                  control={<Checkbox checked={form.spanish} onChange={(event) => setForm({ ...form, spanish: event.target.checked })} />}
                  label={t("applications.language.spanish")}
                />
                <FormControlLabel
                  control={<Checkbox checked={form.english} onChange={(event) => setForm({ ...form, english: event.target.checked })} />}
                  label={t("applications.language.english")}
                />
              </FormGroup>
            </Box>
            <TextField
              label={t("teacher.apply.aboutYou")}
              multiline
              minRows={4}
              helperText={t("teacher.apply.aboutHelper")}
              value={form.bio}
              onChange={(event) => setForm({ ...form, bio: event.target.value })}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />
            <TextField
              label={t("teacher.apply.experience")}
              multiline
              minRows={3}
              helperText={t("teacher.apply.experienceHelper")}
              value={form.experience}
              onChange={(event) => setForm({ ...form, experience: event.target.value })}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />
            <TextField
              label={t("teacher.apply.location")}
              placeholder={t("teacher.apply.locationPlaceholder")}
              value={form.country}
              onChange={(event) => setForm({ ...form, country: event.target.value })}
            />
            <TextField
              label={certified ? t("teacher.apply.videoRecommended") : t("teacher.apply.videoRequired")}
              placeholder="https://"
              required={!certified}
              helperText={t("teacher.apply.videoHelper")}
              value={form.videoUrl}
              onChange={(event) => setForm({ ...form, videoUrl: event.target.value })}
            />

            {certified ? (
              <Box>
                <Typography variant="subtitle2" mb={1}>
                  {t("teacher.apply.credentialPrimary")}
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    select
                    label={t("common.type")}
                    value={form.credential.type}
                    onChange={(event) =>
                      setForm({ ...form, credential: { ...form.credential, type: event.target.value } })
                    }
                  >
                    {credentialOptions.map((item) => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label={t("teacher.apply.credentialName")}
                    placeholder={t("teacher.apply.credentialNamePlaceholder")}
                    value={form.credential.label}
                    onChange={(event) =>
                      setForm({ ...form, credential: { ...form.credential, label: event.target.value } })
                    }
                    slotProps={{ htmlInput: { maxLength: 200 } }}
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label={t("teacher.apply.yearOptional")}
                      type="number"
                      value={form.credential.year}
                      onChange={(event) =>
                        setForm({ ...form, credential: { ...form.credential, year: event.target.value } })
                      }
                      sx={{ width: { sm: 160 } }}
                    />
                    <TextField
                      label={t("teacher.apply.scanLink")}
                      placeholder="https://"
                      value={form.credential.url}
                      onChange={(event) =>
                        setForm({ ...form, credential: { ...form.credential, url: event.target.value } })
                      }
                      fullWidth
                    />
                  </Stack>
                </Stack>
              </Box>
            ) : null}

            <Typography variant="body2" color="text.secondary">
              {t("teacher.apply.approvalNote")}
            </Typography>
            <Box>
              <Button variant="contained" onClick={submit} disabled={pending}>
                {pending ? t("teacher.apply.sending") : t("teacher.apply.send")}
              </Button>
            </Box>
          </Stack>
        </SectionCard>
      ) : null}
    </Box>
  );
}
