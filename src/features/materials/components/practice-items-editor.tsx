"use client";

import { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  IconClipboardText,
  IconMicrophone,
  IconPlayerStopFilled,
  IconPlus,
  IconTrash,
  IconVolume,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { MAX_PRACTICE_ITEMS, practiceAudioUrl, type PracticeItem } from "@/lib/practice-games";
import { speakSpanish } from "@/lib/spanish-tts";
import { useAppToast } from "@/lib/use-app-toast";

/** Longest clip a teacher can record for one word or phrase. */
const MAX_RECORDING_MS = 8000;

export type DraftPracticeItem = Omit<PracticeItem, "id"> & { key: string };

let nextKey = 0;
export const blankPracticeItem = (): DraftPracticeItem => ({
  key: `draft-${(nextKey += 1)}`,
  term: "",
  translation: "",
  example: "",
  exampleTranslation: "",
});

/** Best format the browser can record (Chrome/Firefox: webm, Safari: mp4). */
function recordingMimeType() {
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

/**
 * Words and phrases of a practice set. Each one can carry the teacher's own
 * recording; without it the games read it with the browser's Spanish voice.
 */
export function PracticeItemsEditor({
  items,
  onChange,
}: {
  items: DraftPracticeItem[];
  onChange: (items: DraftPracticeItem[]) => void;
}) {
  const t = useTranslations("educator.materials.practice");
  const { showError } = useAppToast();
  const [recordingKey, setRecordingKey] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasted, setPasted] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  const update = (key: string, patch: Partial<DraftPracticeItem>) =>
    onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const play = (item: DraftPracticeItem) => {
    if (item.audio) void new Audio(practiceAudioUrl(item.audio)).play();
    else speakSpanish(item.term);
  };

  const stopRecording = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    recorderRef.current?.stop();
  };

  const record = async (item: DraftPracticeItem) => {
    if (recordingKey) return stopRecording();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      showError({ message: t("micDenied") });
      return;
    }
    const mimeType = recordingMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      setRecordingKey(null);
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
      if (!blob.size) return;
      setUploadingKey(item.key);
      try {
        const form = new FormData();
        form.append("file", blob, "word");
        const response = await fetch("/api/practice-audio", { method: "POST", body: form });
        const body = (await response.json()) as { key?: string; error?: { message?: string } };
        if (!response.ok || !body.key) throw new Error(body.error?.message ?? String(response.status));
        update(item.key, { audio: body.key });
      } catch {
        showError({ message: t("uploadFailed") });
      } finally {
        setUploadingKey(null);
      }
    };
    recorderRef.current = recorder;
    setRecordingKey(item.key);
    recorder.start();
    timerRef.current = window.setTimeout(stopRecording, MAX_RECORDING_MS);
  };

  /** One item per line: "término | translation | ejemplo | example translation" (last two optional). */
  const addPasted = () => {
    const parsed = pasted
      .split("\n")
      .map((line) => line.split(/\s*[|\t]\s*|\s+=\s+/))
      .filter((parts) => parts[0]?.trim() && parts[1]?.trim())
      .map((parts) => ({
        ...blankPracticeItem(),
        term: parts[0]!.trim(),
        translation: parts[1]!.trim(),
        example: parts[2]?.trim() ?? "",
        exampleTranslation: parts[3]?.trim() ?? "",
      }));
    if (!parsed.length) {
      showError({ message: t("pasteEmpty") });
      return;
    }
    const kept = items.filter((item) => item.term.trim() || item.translation.trim());
    onChange([...kept, ...parsed].slice(0, MAX_PRACTICE_ITEMS));
    setPasted("");
    setShowPaste(false);
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h6">{t("title")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("help")}
        </Typography>
      </Box>

      {items.map((item, index) => (
        <Box key={item.key} sx={{ p: 1.5, bgcolor: "background.paper", borderRadius: 2, border: 1, borderColor: "divider" }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
            <Typography variant="body2" color="text.secondary" width={24} flexShrink={0}>
              {index + 1}.
            </Typography>
            <TextField
              size="small"
              label={t("term")}
              placeholder={t("termPlaceholder")}
              value={item.term}
              inputProps={{ maxLength: 120, lang: "es" }}
              onChange={(event) => update(item.key, { term: event.target.value })}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label={t("translation")}
              placeholder={t("translationPlaceholder")}
              value={item.translation}
              inputProps={{ maxLength: 160 }}
              onChange={(event) => update(item.key, { translation: event.target.value })}
              sx={{ flex: 1 }}
            />
            <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0}>
              <Tooltip title={recordingKey === item.key ? t("stopRecording") : item.audio ? t("recordAgain") : t("record")}>
                <span>
                  <IconButton
                    size="small"
                    color={recordingKey === item.key ? "error" : item.audio ? "success" : "default"}
                    disabled={(recordingKey !== null && recordingKey !== item.key) || uploadingKey === item.key}
                    onClick={() => void record(item)}
                    aria-label={t("record")}
                  >
                    {uploadingKey === item.key ? (
                      <CircularProgress size={16} />
                    ) : recordingKey === item.key ? (
                      <IconPlayerStopFilled size={18} />
                    ) : (
                      <IconMicrophone size={18} />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={item.audio ? t("playRecording") : t("playVoice")}>
                <span>
                  <IconButton size="small" disabled={!item.term.trim()} onClick={() => play(item)} aria-label={t("playVoice")}>
                    <IconVolume size={18} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={t("remove")}>
                <span>
                  <IconButton
                    size="small"
                    disabled={items.length <= 1}
                    onClick={() => onChange(items.filter((other) => other.key !== item.key))}
                    aria-label={t("remove")}
                  >
                    <IconTrash size={18} />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} mt={1.5} pl={{ md: "36px" }} pr={{ md: "116px" }}>
            <TextField
              size="small"
              label={t("example")}
              placeholder={t("examplePlaceholder")}
              value={item.example ?? ""}
              inputProps={{ maxLength: 240, lang: "es" }}
              onChange={(event) => update(item.key, { example: event.target.value })}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label={t("exampleTranslation")}
              placeholder={t("exampleTranslationPlaceholder")}
              value={item.exampleTranslation ?? ""}
              inputProps={{ maxLength: 240 }}
              onChange={(event) => update(item.key, { exampleTranslation: event.target.value })}
              sx={{ flex: 1 }}
            />
          </Stack>
        </Box>
      ))}

      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
        <Button
          variant="outlined"
          startIcon={<IconPlus size={16} />}
          disabled={items.length >= MAX_PRACTICE_ITEMS}
          onClick={() => onChange([...items, blankPracticeItem()])}
        >
          {t("add")}
        </Button>
        <Button variant="text" startIcon={<IconClipboardText size={16} />} onClick={() => setShowPaste((value) => !value)}>
          {t("paste")}
        </Button>
      </Stack>
      <Collapse in={showPaste}>
        <Stack spacing={1}>
          <TextField
            multiline
            minRows={4}
            label={t("pasteLabel")}
            placeholder={t("pastePlaceholder")}
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
          />
          <Box>
            <Button variant="contained" size="small" onClick={addPasted}>
              {t("pasteAdd")}
            </Button>
          </Box>
        </Stack>
      </Collapse>
    </Stack>
  );
}
