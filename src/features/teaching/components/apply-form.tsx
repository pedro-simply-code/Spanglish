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
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SectionCard } from "@/components/ui/section-card";
import {
  submitApplicationAction,
  withdrawApplicationAction,
} from "@/features/teaching/actions";
import {
  credentialTypes,
  teacherApplicationTracks,
  teacherFluencyLevels,
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

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" });

const emptyCredential = {
  type: "celta",
  label: "",
  year: "",
  url: "",
};

export function ApplyForm({ application }: { application: MyApplication }) {
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
    <Box mt={3}>
      <Breadcrumb
        title="Teach with us"
        subtitle="Choose conversation practice or certified teaching — managers review every application."
      />

      {application ? (
        <Alert
          severity={open ? "info" : application.status === "approved" ? "success" : "warning"}
          sx={{ mb: 3 }}
          action={
            open ? (
              <Button color="inherit" size="small" onClick={withdraw} disabled={pending}>
                Withdraw
              </Button>
            ) : undefined
          }
        >
          {open
            ? `Your application from ${dateFormat.format(new Date(application.createdAt))} is under review. We will email you.`
            : application.status === "rejected"
              ? `Your last application was not approved.${application.reviewNote ? ` ${application.reviewNote}` : ""} You can apply again.`
              : application.status === "withdrawn"
                ? "You withdrew your last application. You can apply again."
                : "Your application was approved."}
        </Alert>
      ) : null}

      {!open ? (
        <SectionCard title="Your application" subtitle="A manager reviews video, fluency, and credentials before approval.">
          <Stack spacing={2.5} maxWidth={720}>
            {error ? <Alert severity="error">{error}</Alert> : null}

            <FormControl>
              <FormLabel>Track</FormLabel>
              <RadioGroup
                value={form.track}
                onChange={(event) => setForm({ ...form, track: event.target.value as TeacherApplicationTrack })}
              >
                {teacherApplicationTracks.map((item) => (
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
              <FormLabel>Spanish / English fluency</FormLabel>
              <RadioGroup
                value={form.fluency}
                onChange={(event) => setForm({ ...form, fluency: event.target.value as TeacherFluencyLevel })}
              >
                {teacherFluencyLevels.map((item) => (
                  <FormControlLabel key={item.id} value={item.id} control={<Radio />} label={item.label} />
                ))}
              </RadioGroup>
            </FormControl>
            {form.fluency === "other" ? (
              <TextField
                label="Fluency details"
                multiline
                minRows={2}
                helperText="e.g. Bilingual since childhood, 10 years in a Spanish-speaking country."
                value={form.fluencyNote}
                onChange={(event) => setForm({ ...form, fluencyNote: event.target.value })}
                slotProps={{ htmlInput: { maxLength: 500 } }}
              />
            ) : null}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Years teaching (any context)"
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
                label="I have taught live online before"
              />
            </Stack>

            <TextField
              label="Headline"
              placeholder="e.g. Conversation and pronunciation for beginners"
              value={form.headline}
              onChange={(event) => setForm({ ...form, headline: event.target.value })}
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            <Box>
              <Typography variant="subtitle2" mb={0.5}>
                I teach
              </Typography>
              <FormGroup row>
                <FormControlLabel
                  control={<Checkbox checked={form.spanish} onChange={(event) => setForm({ ...form, spanish: event.target.checked })} />}
                  label="Spanish"
                />
                <FormControlLabel
                  control={<Checkbox checked={form.english} onChange={(event) => setForm({ ...form, english: event.target.checked })} />}
                  label="English"
                />
              </FormGroup>
            </Box>
            <TextField
              label="About you"
              multiline
              minRows={4}
              helperText="At least 40 characters: how you teach and who you help best."
              value={form.bio}
              onChange={(event) => setForm({ ...form, bio: event.target.value })}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />
            <TextField
              label="Teaching experience"
              multiline
              minRows={3}
              helperText="At least 20 characters: classrooms, tutoring, volunteer, etc."
              value={form.experience}
              onChange={(event) => setForm({ ...form, experience: event.target.value })}
              slotProps={{ htmlInput: { maxLength: 2000 } }}
            />
            <TextField
              label="Where you live"
              placeholder="City, country"
              value={form.country}
              onChange={(event) => setForm({ ...form, country: event.target.value })}
            />
            <TextField
              label={certified ? "Intro video (recommended)" : "Intro video (required)"}
              placeholder="https://"
              required={!certified}
              helperText="2–3 minute sample: introduce yourself and simulate a short lesson. YouTube, Vimeo, or Loom."
              value={form.videoUrl}
              onChange={(event) => setForm({ ...form, videoUrl: event.target.value })}
            />

            {certified ? (
              <Box>
                <Typography variant="subtitle2" mb={1}>
                  Primary credential
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    select
                    label="Type"
                    value={form.credential.type}
                    onChange={(event) =>
                      setForm({ ...form, credential: { ...form.credential, type: event.target.value } })
                    }
                  >
                    {credentialTypes.map((item) => (
                      <MenuItem key={item.id} value={item.id}>
                        {item.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Certificate or degree name"
                    placeholder="e.g. CELTA, DELE C2, BA in Education"
                    value={form.credential.label}
                    onChange={(event) =>
                      setForm({ ...form, credential: { ...form.credential, label: event.target.value } })
                    }
                    slotProps={{ htmlInput: { maxLength: 200 } }}
                  />
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      label="Year (optional)"
                      type="number"
                      value={form.credential.year}
                      onChange={(event) =>
                        setForm({ ...form, credential: { ...form.credential, year: event.target.value } })
                      }
                      sx={{ width: { sm: 160 } }}
                    />
                    <TextField
                      label="Link to scan or registry (optional)"
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
              If you are approved, this account becomes a teacher account: you will no longer book classes as a
              student.
            </Typography>
            <Box>
              <Button variant="contained" onClick={submit} disabled={pending}>
                {pending ? "Sending…" : "Send application"}
              </Button>
            </Box>
          </Stack>
        </SectionCard>
      ) : null}
    </Box>
  );
}