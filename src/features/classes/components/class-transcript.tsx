"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconSubtitles } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { SectionCard } from "@/components/ui/section-card";
import type { ClassTranscriptLine } from "@/lib/class-captions";

/** Lines closer than this from the same speaker read as one paragraph. */
const MERGE_GAP_MS = 45_000;
const COLLAPSED_BLOCKS = 12;

type TranscriptBlock = {
  id: string;
  speakerIdentity: string;
  speakerName: string;
  at: string;
  text: string;
};

function toBlocks(lines: ClassTranscriptLine[]): TranscriptBlock[] {
  const blocks: TranscriptBlock[] = [];
  let lastAt = 0;
  for (const line of lines) {
    const at = Date.parse(line.at);
    const previous = blocks[blocks.length - 1];
    if (previous && previous.speakerIdentity === line.speakerIdentity && at - lastAt < MERGE_GAP_MS) {
      previous.text = `${previous.text} ${line.text}`;
    } else {
      blocks.push({
        id: line.id,
        speakerIdentity: line.speakerIdentity,
        speakerName: line.speakerName,
        at: line.at,
        text: line.text,
      });
    }
    lastAt = at;
  }
  return blocks;
}

/** The live captions saved during the class, shown on the class page. */
export function ClassTranscript({
  lines,
  timeZone,
}: {
  lines: ClassTranscriptLine[];
  /** Viewer's time zone, as used for the rest of the class page. */
  timeZone?: string;
}) {
  const t = useTranslations("student");
  const format = useFormatter();
  const [expanded, setExpanded] = useState(false);
  const blocks = useMemo(() => toBlocks(lines), [lines]);
  if (!blocks.length) return null;

  const visible = expanded ? blocks : blocks.slice(0, COLLAPSED_BLOCKS);

  return (
    <Box id="class-transcript">
      <SectionCard
        title={t("classes.detail.transcriptTitle")}
        subtitle={t("classes.detail.transcriptSubtitle")}
        action={<IconSubtitles size={20} />}
      >
        <Stack spacing={1.5}>
          {visible.map((block) => (
            <Box key={block.id}>
              <Stack direction="row" spacing={1} alignItems="baseline">
                <Typography variant="subtitle2" fontWeight={700}>
                  {block.speakerName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {format.dateTime(new Date(block.at), { timeStyle: "short", timeZone })}
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {block.text}
              </Typography>
            </Box>
          ))}
          {blocks.length > COLLAPSED_BLOCKS ? (
            <Button size="small" sx={{ alignSelf: "flex-start" }} onClick={() => setExpanded((v) => !v)}>
              {expanded
                ? t("classes.detail.transcriptShowLess")
                : t("classes.detail.transcriptShowAll", { count: blocks.length })}
            </Button>
          ) : null}
        </Stack>
      </SectionCard>
    </Box>
  );
}
