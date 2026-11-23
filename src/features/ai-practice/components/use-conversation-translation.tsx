"use client";

import { useEffect, useState, useTransition } from "react";
import Button from "@mui/material/Button";
import { IconLanguage } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { translateConversationAction } from "@/features/ai-practice/actions";
import type { AiChatMessage } from "@/lib/ai-practice";
import { useAppToast } from "@/lib/use-app-toast";

const HELP_TOKEN = "[AYUDA]";

/** Luna's 💡 tip (kept in Spanish: it shows the right way to say it). */
function tipOf(content: string) {
  const lines = content.split("\n");
  const index = lines.findIndex((line) => line.trim().startsWith("💡"));
  return index >= 0 ? lines.slice(index).join("\n").trim() : null;
}

/**
 * Spanish ↔ English for a conversation. Switching to English translates the
 * lines that have no translation yet (once, saved on the server) and keeps
 * doing it for new lines while English is on.
 */
export function useConversationTranslation(conversationId: string, messages: AiChatMessage[]) {
  const { showError } = useAppToast();
  const [english, setEnglish] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>(() =>
    Object.fromEntries(messages.filter((item) => item.translation).map((item) => [item.id, item.translation!])),
  );
  const [loading, startLoading] = useTransition();
  const missing = messages.filter(
    (item) => item.content !== HELP_TOKEN && !translations[item.id] && !item.translation,
  );

  const translate = () => {
    if (!missing.length || loading) return;
    startLoading(async () => {
      const result = await translateConversationAction(conversationId);
      if (result.ok && result.translations) setTranslations((current) => ({ ...current, ...result.translations }));
      else {
        // Back to Spanish so it doesn't keep retrying.
        setEnglish(false);
        showError({ message: result.message });
      }
    });
  };

  // New lines while English is on get translated too.
  const missingCount = missing.length;
  useEffect(() => {
    if (english && missingCount && !loading) translate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [english, missingCount]);

  /** What to show for a line in the chosen language. */
  const textOf = (message: Pick<AiChatMessage, "id" | "content" | "translation">) => {
    if (!english) return message.content;
    const translated = translations[message.id] ?? message.translation;
    if (!translated) return message.content;
    const tip = tipOf(message.content);
    return tip ? `${translated}\n${tip}` : translated;
  };

  return { english, setEnglish, loading, textOf };
}

/** "English" / "Español" button for the chat and the transcript headers. */
export function TranslateToggle({
  english,
  loading,
  onToggle,
}: {
  english: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations("student.ai.translate");
  return (
    <Button
      size="small"
      variant={english ? "contained" : "outlined"}
      startIcon={<IconLanguage size={16} />}
      disabled={loading}
      onClick={onToggle}
      sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
    >
      {loading ? t("loading") : english ? t("toSpanish") : t("toEnglish")}
    </Button>
  );
}
