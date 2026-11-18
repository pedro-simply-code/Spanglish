"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconCheck, IconFileText, IconFileOff } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { LabeledToolbarTool } from "@/features/classes/components/classroom-toolbar-labeled-tool";
import type { CaptionLineView } from "@/features/classes/components/use-classroom-captions";
import type { CaptionLang, ClassCaptionsState } from "@/features/classes/classroom-protocol";

/** Same speaker within this gap shares one heading in the panel. */
const GROUP_GAP_MS = 60_000;

/**
 * Live transcript in the room sidebar, next to the chat (like Zoom):
 * everything said since the teacher turned transcription on, with the line
 * being spoken right now shown in italics.
 */
export function ClassroomTranscriptPanel({
  lines,
  state,
  canModerate,
}: {
  lines: CaptionLineView[];
  state: ClassCaptionsState;
  canModerate: boolean;
}) {
  const t = useTranslations("classroom");
  const format = useFormatter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <Stack sx={{ height: "100%", minHeight: 0, width: "100%" }}>
      <Box sx={{ px: 1.5, py: 1, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Typography variant="caption" color={state.enabled ? "primary.main" : "rgba(255,255,255,0.55)"}>
          {state.enabled
            ? t("captions.activeIn", {
                lang: state.lang === "en-US" ? t("captions.english") : t("captions.spanish"),
              })
            : canModerate
              ? t("captions.offHost")
              : t("captions.offStudent")}
        </Typography>
      </Box>
      <Box
        ref={scrollRef}
        onScroll={(event) => {
          const el = event.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        sx={{ flex: 1, minHeight: 0, overflow: "auto", px: 1.5, py: 1 }}
      >
        {lines.length ? (
          lines.map((line, index) => {
            const previous = lines[index - 1];
            const newSpeaker =
              !previous ||
              previous.identity !== line.identity ||
              line.at - previous.at > GROUP_GAP_MS;
            return (
              <Box key={line.id} sx={{ mt: newSpeaker && index ? 1.25 : 0.25 }}>
                {newSpeaker ? (
                  <Stack direction="row" spacing={0.75} alignItems="baseline">
                    <Typography variant="caption" fontWeight={700} color="rgba(255,255,255,0.8)">
                      {line.name}
                    </Typography>
                    <Typography variant="caption" color="rgba(255,255,255,0.45)">
                      {format.dateTime(new Date(line.at), { timeStyle: "short" })}
                    </Typography>
                  </Stack>
                ) : null}
                <Typography
                  variant="body2"
                  color={line.final ? "#fff" : "rgba(255,255,255,0.6)"}
                  sx={{ fontStyle: line.final ? "normal" : "italic" }}
                >
                  {line.text}
                </Typography>
              </Box>
            );
          })
        ) : (
          <Typography variant="body2" color="rgba(255,255,255,0.45)">
            {state.enabled ? t("captions.empty") : t("captions.emptyOff")}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

type ClassroomCaptionsButtonProps = {
  state: ClassCaptionsState;
  busy: boolean;
  onSetCaptions: (enabled: boolean, lang?: CaptionLang) => void;
};

/** Teacher: start transcription (choosing the spoken language) or stop it. */
export function ClassroomCaptionsButton({ state, busy, onSetCaptions }: ClassroomCaptionsButtonProps) {
  const t = useTranslations("classroom");
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const choose = (enabled: boolean, lang?: CaptionLang) => {
    setAnchor(null);
    onSetCaptions(enabled, lang);
  };
  const options: { lang: CaptionLang; label: string }[] = [
    { lang: "es-ES", label: t("captions.spanish") },
    { lang: "en-US", label: t("captions.english") },
  ];

  return (
    <>
      <LabeledToolbarTool
        label={state.enabled ? t("captions.on") : t("captions.label")}
        tooltip={t("captions.hostTooltip")}
      >
        <IconButton
          size="small"
          disabled={busy}
          onClick={(event) => setAnchor(event.currentTarget)}
          sx={{ color: state.enabled ? "primary.main" : "#fff" }}
        >
          <IconFileText size={20} />
        </IconButton>
      </LabeledToolbarTool>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { minWidth: 240 } } }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: "block" }}>
          {t("captions.menuHint")}
        </Typography>
        {options.map((option) => {
          const active = state.enabled && state.lang === option.lang;
          return (
            <MenuItem key={option.lang} selected={active} onClick={() => choose(true, option.lang)}>
              <ListItemIcon>{active ? <IconCheck size={16} /> : null}</ListItemIcon>
              <ListItemText>{option.label}</ListItemText>
            </MenuItem>
          );
        })}
        <MenuItem disabled={!state.enabled} onClick={() => choose(false)}>
          <ListItemIcon>
            <IconFileOff size={16} />
          </ListItemIcon>
          <ListItemText>{t("captions.turnOff")}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
