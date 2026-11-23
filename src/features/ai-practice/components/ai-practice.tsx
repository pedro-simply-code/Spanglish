"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { IconArrowLeft, IconBulb, IconSend } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  finishAiConversationAction,
  resumeAiConversationAction,
  sendAiMessageAction,
} from "@/features/ai-practice/actions";
import { ChatHome } from "@/features/ai-practice/components/chat-home";
import { LunaAvatar } from "@/features/ai-practice/components/luna-avatar";
import { LunaHome } from "@/features/ai-practice/components/luna-home";
import { LunaVoice } from "@/features/ai-practice/components/luna-voice";
import { SceneBubbles, bubbleText } from "@/features/ai-practice/components/scene-bubbles";
import { TranslateToggle, useConversationTranslation } from "@/features/ai-practice/components/use-conversation-translation";
import {
  type AiConversationDetail,
  type AiConversationSummary,
  type AiScenarioCard,
} from "@/lib/ai-practice";
import { sceneSpeakers } from "@/lib/ai-scene-speakers";
import { useAppToast } from "@/lib/use-app-toast";
import {
  CHAT_PATH,
  ChatBubble,
  UsageMeter,
} from "@/features/ai-practice/components/ai-practice-parts";

type AiPracticeProps = {
  /** "speak": voice practice with Luna (/speak) · "chat": written scenes (/chat). */
  kind: "speak" | "chat";
  configured: boolean;
  scenarios: AiScenarioCard[];
  /** Free conversations left for this practice (from attended classes). */
  freeLeft: number;
  /** Free conversations each attended class gives. */
  perClass: number;
  /** Bought AI credits left (shared by Luna and the chat). */
  credits: number;
  /** Token budget of one conversation (AI_CONVERSATION_TOKEN_LIMIT). */
  tokensPerConversation: number;
  conversations: AiConversationSummary[];
  selected: AiConversationDetail | null;
};

/** "Habla con la IA" (Luna, by voice) and "Chatea con la IA" (written scenes): start, history, and the open conversation. */
export function AiPractice(props: AiPracticeProps) {
  const t = useTranslations("student.ai");
  if (!props.configured) {
    return (
      <Box mt={3}>
        <Alert severity="info">{t("notConfigured")}</Alert>
      </Box>
    );
  }
  if (props.selected?.mode === "voice") return <LunaVoice conversation={props.selected} />;
  if (props.selected) return <AiChat conversation={props.selected} />;
  if (props.kind === "speak") {
    return (
      <LunaHome
        conversations={props.conversations}
        freeLeft={props.freeLeft}
        perClass={props.perClass}
        credits={props.credits}
        tokensPerConversation={props.tokensPerConversation}
      />
    );
  }
  return (
    <ChatHome
      scenarios={props.scenarios}
      conversations={props.conversations}
      freeLeft={props.freeLeft}
      perClass={props.perClass}
      credits={props.credits}
      tokensPerConversation={props.tokensPerConversation}
    />
  );
}

function AiChat({ conversation }: { conversation: AiConversationDetail }) {
  const t = useTranslations("student.ai");
  const router = useRouter();
  const { showError, showInfo } = useAppToast();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  // What was just sent (and Luna's answer) until the refreshed conversation has it,
  // so the line never blinks away while the page reloads its data.
  const [outbox, setOutbox] = useState<{ text: string; reply: string | null; base: number } | null>(null);
  const waiting = outbox && conversation.messages.length <= outbox.base ? outbox : null;
  const sentText = waiting?.text ?? null;
  const sentReply = waiting?.reply ?? null;
  // Last exchange when the tokens ran out: shown here, the chat can't be reopened.
  const [ended, setEnded] = useState<{ text: string; reply: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const translation = useConversationTranslation(conversation.id, conversation.messages);
  const finished = conversation.status === "finished" || ended !== null;
  const sceneSrc = conversation.sceneDataUrl;
  const speakers = sceneSpeakers(conversation.scenario);
  // Bubbles over the picture: who said the last thing, in the chosen language.
  const lastLuna = [...conversation.messages].reverse().find((message) => message.role === "assistant");
  const lastStudent = [...conversation.messages].reverse().find((message) => message.role === "user");
  const lastIsStudent = conversation.messages.at(-1)?.role === "user";
  const studentBubble = sentText ?? ended?.text ?? (lastStudent ? bubbleText(translation.textOf(lastStudent)) : "");
  const lunaBubble = sentReply
    ? bubbleText(sentReply)
    : sentText
    ? null
    : ended?.reply
      ? bubbleText(ended.reply)
      : lastLuna && !lastIsStudent
        ? bubbleText(translation.textOf(lastLuna))
        : undefined;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conversation.messages.length, sentText, sentReply, ended]);

  const send = () => {
    const text = draft.trim();
    if (!text || pending) return;
    setDraft("");
    const base = conversation.messages.length;
    setOutbox({ text, reply: null, base });
    startTransition(async () => {
      const result = await sendAiMessageAction({ conversationId: conversation.id, text });
      if (!result.ok) {
        showError({ message: result.message });
        // Nothing was saved: the text goes back to the box to send again.
        setOutbox(null);
        if (!result.finished) setDraft(text);
        else router.refresh();
        return;
      }
      if (result.finished) {
        showInfo({ message: t("budgetReached") });
        setEnded({ text, reply: result.reply ?? "" });
        setOutbox(null);
        return;
      }
      setOutbox({ text, reply: result.reply ?? null, base });
      router.refresh();
    });
  };

  const finish = () =>
    startTransition(async () => {
      await finishAiConversationAction(conversation.id);
      router.refresh();
    });

  const resume = () =>
    startTransition(async () => {
      const result = await resumeAiConversationAction(conversation.id);
      if (!result.ok) showError({ message: result.message });
      router.refresh();
    });

  return (
    <Stack spacing={2} mt={3}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
        <Button component={Link} href={CHAT_PATH} startIcon={<IconArrowLeft size={16} />} size="small">
          {t("back")}
        </Button>
        {!finished ? (
          <Button size="small" color="inherit" disabled={pending} onClick={finish}>
            {t("finish")}
          </Button>
        ) : null}
      </Stack>

      {/* Two columns like My classes (8 / 4): the scene on the left, the conversation on the right. */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card elevation={9} sx={{ height: "100%" }}>
            <Box sx={{ position: "relative", overflow: "hidden" }}>
              {sceneSrc ? (
                <Box
                  component="img"
                  src={sceneSrc}
                  alt={t("sceneAlt", { title: conversation.title })}
                  sx={{ display: "block", width: "100%", aspectRatio: "5 / 3", objectFit: "cover", bgcolor: "grey.100" }}
                />
              ) : (
                <Box
                  sx={{
                    aspectRatio: "5 / 3",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 72,
                    bgcolor: "primary.light",
                  }}
                >
                  {conversation.emoji}
                </Box>
              )}
              <SceneBubbles
                luna={speakers.luna}
                student={speakers.student}
                lunaText={lunaBubble}
                studentText={studentBubble}
              />
            </Box>
            <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Typography variant="h5">
                  {conversation.emoji} {conversation.title}
                </Typography>
                <Chip
                  size="small"
                  color={ended ? "default" : finished ? "warning" : "success"}
                  label={ended ? t("spent") : finished ? t("paused") : t("active")}
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" mt={1}>
                {t("intro")}
              </Typography>
              <Box mt={2}>
                <UsageMeter conversation={conversation} />
              </Box>
              <Stack spacing={1} mt={2}>
                {(["tip1", "tip2", "tip3"] as const).map((tip) => (
                  <Stack key={tip} direction="row" spacing={1} alignItems="flex-start">
                    <Box sx={{ color: "primary.main", mt: "2px", display: "flex" }}>
                      <IconBulb size={16} />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {t(`chatRoom.${tip}`)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          {/* Same height as the scene: the messages fill what is left and scroll. */}
          <Card elevation={9} sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2.5, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
              <LunaAvatar size={40} />
              <Box flexGrow={1}>
                <Typography variant="subtitle1" fontWeight={600} lineHeight={1.2}>
                  Luna
                </Typography>
                <Typography variant="caption" color={pending ? "primary.main" : "text.secondary"}>
                  {pending ? t("typing") : t("chatRoom.role", { title: conversation.title })}
                </Typography>
              </Box>
              <TranslateToggle
                english={translation.english}
                loading={translation.loading}
                onToggle={() => translation.setEnglish((value) => !value)}
              />
            </Stack>
            <Box
              ref={scrollRef}
              sx={{ height: { xs: 420, lg: 0 }, flex: { lg: "1 1 0" }, minHeight: { lg: 320 }, overflow: "auto", p: 2.5, bgcolor: "grey.50" }}
            >
              <Stack spacing={1.5}>
                {conversation.messages.map((message) => (
                  <ChatBubble
                    key={message.id}
                    role={message.role}
                    content={translation.textOf(message)}
                    avatar={message.role === "assistant" ? <LunaAvatar size={30} /> : undefined}
                  />
                ))}
                {ended ? <ChatBubble role="user" content={ended.text} /> : null}
                {ended?.reply ? <ChatBubble role="assistant" content={ended.reply} avatar={<LunaAvatar size={30} />} /> : null}
                {sentText ? <ChatBubble role="user" content={sentText} /> : null}
                {sentReply ? (
                  <ChatBubble role="assistant" content={sentReply} avatar={<LunaAvatar size={30} />} />
                ) : sentText ? (
                  <Typography variant="caption" color="text.secondary">
                    {t("typing")}
                  </Typography>
                ) : null}
              </Stack>
            </Box>
            <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
              {ended ? (
                <Alert severity="success">{t("spentNote")}</Alert>
              ) : finished ? (
                <Alert
                  severity="info"
                  action={
                    <Button color="inherit" size="small" variant="outlined" disabled={pending} onClick={resume}>
                      {t("resume")}
                    </Button>
                  }
                >
                  {t("pausedNote")}
                </Alert>
              ) : (
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    fullWidth
                    autoFocus
                    placeholder={t("placeholder")}
                    value={draft}
                    disabled={pending}
                    inputProps={{ maxLength: 500 }}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        send();
                      }
                    }}
                  />
                  <Button variant="contained" disabled={pending || !draft.trim()} onClick={send} sx={{ minWidth: 0, px: 2 }}>
                    <IconSend size={18} />
                  </Button>
                </Stack>
              )}
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
