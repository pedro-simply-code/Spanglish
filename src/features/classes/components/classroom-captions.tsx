"use client";

import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useFormatter, useTranslations } from "next-intl";
import type { CaptionLineView } from "@/features/classes/components/use-classroom-captions";

/** Same speaker within this gap shares one heading in the panel. */
const GROUP_GAP_MS = 60_000;

/**
 * Live transcript in the room sidebar, next to the chat (like Zoom): what
 * the classroom agent has heard so far, with the line being spoken right now
 * shown in italics. `active` = the agent is in the room.
 */
export function ClassroomTranscriptPanel({ lines, active }: { lines: CaptionLineView[]; active: boolean }) {
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
        <Typography variant="caption" color={active ? "primary.main" : "rgba(255,255,255,0.55)"}>
          {active ? t("captions.active") : t("captions.waitingAgent")}
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
            {active ? t("captions.empty") : t("captions.emptyWaiting")}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
