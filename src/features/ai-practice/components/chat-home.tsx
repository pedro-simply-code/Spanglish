"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  IconArrowRight,
  IconCalendarEvent,
  IconMessageCircle,
  IconMessages,
  IconPlayerPause,
  IconSparkles,
} from "@tabler/icons-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { SummaryBanner } from "@/components/ui/summary-banner";
import { startAiConversationAction } from "@/features/ai-practice/actions";
import { CHAT_PATH, UsageMeter } from "@/features/ai-practice/components/ai-practice-parts";
import { tokensLabel } from "@/lib/ai-credit-pricing";
import { CUSTOM_SCENARIO, type AiConversationSummary, type AiScenarioCard } from "@/lib/ai-practice";
import { useAppToast } from "@/lib/use-app-toast";

const PAGE_SIZE = 5;
const BUY_HREF = "/credits?tab=buy&product=ai";

type Filter = "all" | "open" | "done";

type ChatHomeProps = {
  scenarios: AiScenarioCard[];
  conversations: AiConversationSummary[];
  freeLeft: number;
  perClass: number;
  credits: number;
  tokensPerConversation: number;
};

/** Chats out of tokens stay in the history but can't be opened again. */
const stateOf = (conversation: AiConversationSummary) =>
  !conversation.hasTokensLeft ? "spent" : conversation.status === "active" ? "active" : "paused";

/** "Chatea con Luna": pick a scene (left), past chats, and what you have left (right). Same layout as Talk with Luna. */
export function ChatHome({ scenarios, conversations, freeLeft, perClass, credits, tokensPerConversation }: ChatHomeProps) {
  const t = useTranslations("student.ai");
  const locale = useLocale() === "es" ? "es" : "en";
  const format = useFormatter();
  const router = useRouter();
  const { showError } = useAppToast();
  const [pending, startTransition] = useTransition();
  const [topic, setTopic] = useState("");
  const [starting, setStarting] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  const canStart = freeLeft + credits > 0;
  const tokens = tokensLabel(tokensPerConversation);
  const open = conversations.filter((item) => item.hasTokensLeft);
  const done = conversations.filter((item) => !item.hasTokensLeft);
  const lists: Record<Filter, AiConversationSummary[]> = { all: conversations, open, done };
  const list = lists[filter];
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const start = (scenario: string) => {
    setStarting(scenario);
    startTransition(async () => {
      const result = await startAiConversationAction({ scenario, topic });
      if (result.ok && result.id) router.push(`${CHAT_PATH}?c=${result.id}`);
      else showError({ message: result.message });
      setStarting(null);
    });
  };

  return (
    <Box mt={3}>
      <SummaryBanner
        items={[
          { key: "free", icon: IconMessageCircle, color: "primary", value: freeLeft, label: t("chatHome.summary.free") },
          { key: "credits", icon: IconSparkles, color: "secondary", value: credits, label: t("chatHome.summary.credits") },
          { key: "done", icon: IconMessages, color: "success", value: conversations.length, label: t("chatHome.summary.done") },
          { key: "open", icon: IconPlayerPause, color: "warning", value: open.length, label: t("chatHome.summary.open") },
        ]}
        action={
          <LinkButton href={BUY_HREF} variant={canStart ? "outlined" : "contained"} startIcon={<IconSparkles size={18} />}>
            {t("allowance.buy")}
          </LinkButton>
        }
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            {/* Pick a scene or type your own. */}
            <Card elevation={9}>
              <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                <Typography variant="h5">{t("chatHome.pickTitle")}</Typography>
                <Typography variant="subtitle2" color="text.secondary" mb={2}>
                  {t("chatHome.pickSubtitle", { tokens })}
                </Typography>

                {!canStart ? (
                  <Alert
                    severity="warning"
                    sx={{ mb: 2 }}
                    action={
                      <LinkButton href={BUY_HREF} color="inherit" size="small" sx={{ whiteSpace: "nowrap" }}>
                        {t("allowance.buy")}
                      </LinkButton>
                    }
                  >
                    {t("allowance.none.chat", { perClass })}
                  </Alert>
                ) : null}

                <Grid container spacing={1.5}>
                  {scenarios.map((scenario) => (
                    <Grid key={scenario.key} size={{ xs: 12, sm: 6, md: 4 }}>
                      <ButtonBase
                        disabled={pending || !canStart}
                        onClick={() => start(scenario.key)}
                        sx={{ display: "block", width: "100%", height: "100%", borderRadius: 1, textAlign: "left" }}
                      >
                        <Box
                          sx={{
                            p: 1.25,
                            height: "100%",
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: starting === scenario.key ? "primary.main" : "divider",
                            bgcolor: starting === scenario.key ? "primary.light" : "background.paper",
                            opacity: !canStart ? 0.55 : 1,
                            transition: "border-color 120ms ease, background-color 120ms ease",
                            "&:hover": { borderColor: "primary.main", bgcolor: "primary.light" },
                          }}
                        >
                          {scenario.sceneDataUrl ? (
                            <Box
                              component="img"
                              src={scenario.sceneDataUrl}
                              alt=""
                              sx={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 1, display: "block", mb: 1 }}
                            />
                          ) : null}
                          <Typography variant="subtitle2" fontWeight={600}>
                            {scenario.emoji} {scenario.title[locale]}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {scenario.description[locale]}
                          </Typography>
                          {starting === scenario.key ? <LinearProgress sx={{ mt: 0.75, height: 4, borderRadius: 2 }} /> : null}
                        </Box>
                      </ButtonBase>
                    </Grid>
                  ))}
                </Grid>

                <Divider sx={{ my: 2.5 }} />
                <Typography variant="subtitle1" fontWeight={600}>
                  {t("customTitle")}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1.5}>
                  {t("customSubtitle")}
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField
                    size="small"
                    fullWidth
                    label={t("customLabel")}
                    placeholder={t("customPlaceholder")}
                    value={topic}
                    slotProps={{ htmlInput: { maxLength: 200 } }}
                    onChange={(event) => setTopic(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && topic.trim().length >= 3 && canStart && !pending) start(CUSTOM_SCENARIO);
                    }}
                  />
                  <Button
                    variant="contained"
                    disabled={pending || !canStart || topic.trim().length < 3}
                    onClick={() => start(CUSTOM_SCENARIO)}
                    startIcon={<IconMessageCircle size={18} />}
                    sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
                  >
                    {starting === CUSTOM_SCENARIO ? t("starting") : t("startCustom")}
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* Past chats, like the lists in My classes. */}
            {conversations.length ? (
              <>
                <Card elevation={9}>
                  <Box sx={{ px: 2 }}>
                    <Tabs
                      value={filter}
                      onChange={(_, value: Filter) => {
                        setFilter(value);
                        setPage(1);
                      }}
                      variant="scrollable"
                      allowScrollButtonsMobile
                    >
                      <Tab value="all" label={t("chatHome.tabs.all", { count: conversations.length })} />
                      <Tab value="open" label={t("chatHome.tabs.open", { count: open.length })} />
                      <Tab value="done" label={t("chatHome.tabs.done", { count: done.length })} />
                    </Tabs>
                  </Box>
                </Card>

                {visible.length ? (
                  <Stack spacing={2}>
                    {visible.map((conversation) => {
                      const state = stateOf(conversation);
                      return (
                        <Card key={conversation.id} elevation={9} sx={{ opacity: state === "spent" ? 0.85 : 1 }}>
                          <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                            <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ sm: "center" }}>
                              <Box
                                sx={{
                                  width: { xs: "100%", sm: 72 },
                                  height: { sm: 72 },
                                  py: { xs: 1, sm: 0 },
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  bgcolor: state === "spent" ? "grey.200" : "primary.light",
                                  fontSize: 32,
                                  flexShrink: 0,
                                }}
                              >
                                {conversation.emoji}
                              </Box>

                              <Box flexGrow={1} minWidth={0}>
                                <Chip
                                  size="small"
                                  color={state === "active" ? "success" : state === "paused" ? "warning" : "default"}
                                  label={t(state)}
                                />
                                <Typography variant="h5" mt={1.25} noWrap>
                                  {conversation.title}
                                </Typography>
                                <Stack direction="row" spacing={0.5} alignItems="center" mt={0.5}>
                                  <IconCalendarEvent size={14} />
                                  <Typography variant="body2" color="text.secondary">
                                    {format.dateTime(new Date(conversation.createdAt), { dateStyle: "medium", timeStyle: "short" })}
                                  </Typography>
                                </Stack>
                                <Box mt={1} maxWidth={360}>
                                  <UsageMeter conversation={conversation} />
                                </Box>
                              </Box>

                              {state === "spent" ? (
                                <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, maxWidth: 160 }}>
                                  {t("chatHome.spentNote")}
                                </Typography>
                              ) : (
                                <LinkButton
                                  href={`${CHAT_PATH}?c=${conversation.id}`}
                                  variant={state === "active" ? "contained" : "outlined"}
                                  endIcon={<IconArrowRight size={16} />}
                                  sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
                                >
                                  {state === "active" ? t("chatHome.continue") : t("chatHome.resume")}
                                </LinkButton>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                ) : (
                  <Card elevation={9}>
                    <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" }, textAlign: "center" }}>
                      <Typography color="text.secondary" py={3}>
                        {t(`chatHome.empty.${filter}`)}
                      </Typography>
                    </CardContent>
                  </Card>
                )}

                <ListPagination
                  page={current}
                  total={list.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={(value) => {
                    setPage(value);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              </>
            ) : null}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            {/* How a chat goes. */}
            <Card elevation={9} sx={{ background: "linear-gradient(160deg, #FFFFFF 0%, #FBF2EF 100%)" }}>
              <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                <Stack alignItems="center" textAlign="center" spacing={1}>
                  <Box
                    sx={{
                      width: 84,
                      height: 84,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "primary.light",
                      color: "primary.main",
                    }}
                  >
                    <IconMessages size={40} />
                  </Box>
                  <Typography variant="h5">{t("chatHome.cardTitle")}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("intro")}
                  </Typography>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1.5}>
                  {(["pick", "write", "learn"] as const).map((step, index) => (
                    <Stack key={step} direction="row" spacing={1.5} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 26,
                          height: 26,
                          flexShrink: 0,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {index + 1}
                      </Box>
                      <Box>
                        <Typography variant="subtitle2">{t(`chatHome.how.${step}.title`)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t(`chatHome.how.${step}.text`)}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            <SectionCard padding="15px" title={t("lunaHome.balance.title")} subtitle={t("chatHome.balance.subtitle", { perClass })}>
              <Stack spacing={1.25}>
                {[
                  { label: t("chatHome.balance.free"), value: freeLeft },
                  { label: t("lunaHome.balance.credits"), value: credits },
                ].map((row) => (
                  <Stack key={row.label} direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      {row.label}
                    </Typography>
                    <Chip size="small" color={row.value ? "primary" : "default"} variant={row.value ? "filled" : "outlined"} label={row.value} />
                  </Stack>
                ))}
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {t("chatHome.balance.tokens")}
                  </Typography>
                  <Chip size="small" variant="outlined" label={tokens} />
                </Stack>
                <LinkButton href={BUY_HREF} variant="outlined" size="small" startIcon={<IconSparkles size={16} />} sx={{ alignSelf: "flex-start", mt: 0.5 }}>
                  {t("allowance.buy")}
                </LinkButton>
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
