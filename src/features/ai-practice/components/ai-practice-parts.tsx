"use client";

import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconRobot } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { AiConversationSummary } from "@/lib/ai-practice";

/* Pieces shared by the written chat and Luna's voice practice. */

/** "Habla con la IA" (Luna) and "Chatea con la IA" (written scenes). */
export const SPEAK_PATH = "/speak";
export const CHAT_PATH = "/chat";

/** Dollars with enough decimals for tiny amounts ($0.0012). */
export function formatCost(usd: number, format: ReturnType<typeof useFormatter>) {
  return format.number(usd, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: usd < 0.01 ? 4 : 2,
    maximumFractionDigits: usd < 0.01 ? 4 : 2,
  });
}

export function UsageMeter({ conversation }: { conversation: AiConversationSummary }) {
  const t = useTranslations("student.ai");
  const format = useFormatter();
  const percent = Math.min(100, (conversation.tokensUsed / conversation.tokenLimit) * 100);
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" mb={0.5}>
        <Typography variant="caption" color="text.secondary">
          {t("usage", {
            used: format.number(conversation.tokensUsed),
            limit: format.number(conversation.tokenLimit),
          })}
        </Typography>
        <Typography variant="caption" fontWeight={600}>
          {t("cost", { cost: formatCost(conversation.costUsd, format) })}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percent}
        color={percent > 85 ? "warning" : "primary"}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Box>
  );
}

export function ChatBubble({
  role,
  content,
  avatar,
  action,
}: {
  role: "user" | "assistant";
  content: string;
  /** Replaces the robot icon (Luna's face). */
  avatar?: ReactNode;
  /** Extra control under the bubble (e.g. replay audio). */
  action?: ReactNode;
}) {
  const mine = role === "user";
  // The model puts its correction on a last line starting with 💡.
  const lines = content.split("\n");
  const tipIndex = lines.findIndex((line) => line.trim().startsWith("💡"));
  const body = (tipIndex >= 0 ? lines.slice(0, tipIndex) : lines).join("\n").trim();
  const tip = tipIndex >= 0 ? lines.slice(tipIndex).join("\n").trim() : null;
  return (
    <Stack direction="row" spacing={1} justifyContent={mine ? "flex-end" : "flex-start"} alignItems="flex-end">
      {!mine
        ? (avatar ?? (
            <Avatar sx={{ width: 30, height: 30, bgcolor: "primary.light", color: "primary.main" }}>
              <IconRobot size={18} />
            </Avatar>
          ))
        : null}
      <Box
        sx={{
          maxWidth: "75%",
          px: 1.75,
          py: 1,
          borderRadius: 2,
          bgcolor: mine ? "primary.main" : "grey.100",
          color: mine ? "#fff" : "text.primary",
          whiteSpace: "pre-wrap",
        }}
      >
        <Typography variant="body2">{body}</Typography>
        {tip ? (
          <Typography variant="caption" display="block" mt={0.75} sx={{ color: "warning.dark", fontWeight: 600 }}>
            {tip}
          </Typography>
        ) : null}
      </Box>
      {action}
    </Stack>
  );
}
