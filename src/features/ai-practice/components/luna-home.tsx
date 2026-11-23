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
  IconFileText,
  IconMicrophone,
  IconSparkles,
  IconTarget,
} from "@tabler/icons-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { SummaryBanner } from "@/components/ui/summary-banner";
import { startVoicePracticeAction } from "@/features/ai-practice/actions";
import { SPEAK_PATH, UsageMeter } from "@/features/ai-practice/components/ai-practice-parts";
import { LunaAvatar } from "@/features/ai-practice/components/luna-avatar";
import { tokensLabel } from "@/lib/ai-credit-pricing";
import { CUSTOM_SCENARIO, VOICE_TOPICS, type AiConversationSummary } from "@/lib/ai-practice";
import { useAppToast } from "@/lib/use-app-toast";

const PAGE_SIZE = 5;
const BUY_HREF = "/credits?tab=buy&product=ai";

type Filter = "all" | "reports" | "active";

type LunaHomeProps = {
  conversations: AiConversationSummary[];
  freeLeft: number;
  perClass: number;
  credits: number;
  tokensPerConversation: number;
};

const stateOf = (conversation: AiConversationSummary) =>
  conversation.status === "active" ? "active" : conversation.hasFeedback ? "reportReady" : "reportPending";

/** "Habla con Luna": pick a topic (left), past practices with their reports, and what you have left (right). */
export function LunaHome({ conversations, freeLeft, perClass, credits, tokensPerConversation }: LunaHomeProps) {
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
  const reports = conversations.filter((item) => item.hasFeedback);
  const active = conversations.filter((item) => item.status === "active");
  const lists: Record<Filter, AiConversationSummary[]> = { all: conversations, reports, active };
  const list = lists[filter];
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const visible = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const start = (input: { topicKey?: string; topic?: string }) => {
    setStarting(input.topicKey ?? CUSTOM_SCENARIO);
    startTransition(async () => {
      const result = await startVoicePracticeAction(input);
      if (result.ok && result.id) router.push(`${SPEAK_PATH}?c=${result.id}`);
      else showError({ message: result.message });
      setStarting(null);
    });
  };

  return (
    <Box mt={3}>
      <SummaryBanner
        items={[
          { key: "free", icon: IconMicrophone, color: "primary", value: freeLeft, label: t("lunaHome.summary.free") },
          { key: "credits", icon: IconSparkles, color: "secondary", value: credits, label: t("lunaHome.summary.credits") },
          { key: "done", icon: IconTarget, color: "success", value: conversations.length, label: t("lunaHome.summary.done") },
          { key: "reports", icon: IconFileText, color: "warning", value: reports.length, label: t("lunaHome.summary.reports") },
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
            {/* Pick a topic or type your own. */}
            <Card elevation={9}>
              <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                <Typography variant="h5">{t("lunaHome.pickTitle")}</Typography>
                <Typography variant="subtitle2" color="text.secondary" mb={2}>
                  {t("lunaHome.pickSubtitle", { tokens })}
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
                    {t("allowance.none.speak", { perClass })}
                  </Alert>
                ) : null}

                <Grid container spacing={1.5}>
                  {VOICE_TOPICS.map((item) => (
                    <Grid key={item.key} size={{ xs: 6, sm: 4 }}>
                      <ButtonBase
                        disabled={pending || !canStart}
                        onClick={() => start({ topicKey: item.key })}
                        sx={{ display: "block", width: "100%", height: "100%", borderRadius: 1, textAlign: "left" }}
                      >
                        <Stack
                          direction="row"
                          spacing={1.5}
                          alignItems="center"
                          sx={{
                            p: 1.5,
                            height: "100%",
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: starting === item.key ? "primary.main" : "divider",
                            bgcolor: starting === item.key ? "primary.light" : "background.paper",
                            opacity: !canStart ? 0.55 : 1,
                            transition: "border-color 120ms ease, background-color 120ms ease",
                            "&:hover": { borderColor: "primary.main", bgcolor: "primary.light" },
                          }}
                        >
                          <Box
                            sx={{
                              width: 44,
                              height: 44,
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 1,
                              bgcolor: "grey.100",
                              fontSize: 24,
                            }}
                          >
                            {item.emoji}
                          </Box>
                          <Box minWidth={0} flexGrow={1}>
                            <Typography variant="subtitle2" fontWeight={600} lineHeight={1.25}>
                              {item.title[locale]}
                            </Typography>
                            {starting === item.key ? (
                              <LinearProgress sx={{ mt: 0.75, height: 4, borderRadius: 2 }} />
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                {t("lunaHome.tapToStart")}
                              </Typography>
                            )}
                          </Box>
                        </Stack>
                      </ButtonBase>
                    </Grid>
                  ))}
                </Grid>

                <Divider sx={{ my: 2.5 }} />
                <Typography variant="subtitle1" fontWeight={600}>
                  {t("luna.customTitle")}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1.5}>
                  {t("luna.customSubtitle")}
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <TextField
                    size="small"
                    fullWidth
                    label={t("luna.customLabel")}
                    placeholder={t("luna.customPlaceholder")}
                    value={topic}
                    slotProps={{ htmlInput: { maxLength: 80 } }}
                    onChange={(event) => setTopic(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && topic.trim().length >= 3 && canStart && !pending) start({ topic });
                    }}
                  />
                  <Button
                    variant="contained"
                    disabled={pending || !canStart || topic.trim().length < 3}
                    onClick={() => start({ topic })}
                    startIcon={<IconMicrophone size={18} />}
                    sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
                  >
                    {starting === CUSTOM_SCENARIO ? t("starting") : t("luna.start")}
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* Past practices, like the lists in My classes. */}
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
                      <Tab value="all" label={t("lunaHome.tabs.all", { count: conversations.length })} />
                      <Tab value="reports" label={t("lunaHome.tabs.reports", { count: reports.length })} />
                      <Tab value="active" label={t("lunaHome.tabs.active", { count: active.length })} />
                    </Tabs>
                  </Box>
                </Card>

                {visible.length ? (
                  <Stack spacing={2}>
                    {visible.map((conversation) => {
                      const state = stateOf(conversation);
                      const created = new Date(conversation.createdAt);
                      return (
                        <Card key={conversation.id} elevation={9}>
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
                                  bgcolor: state === "reportReady" ? "primary.light" : "grey.200",
                                  fontSize: 32,
                                  flexShrink: 0,
                                }}
                              >
                                {conversation.emoji}
                              </Box>

                              <Box flexGrow={1} minWidth={0}>
                                <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
                                  <Chip
                                    size="small"
                                    color={state === "active" ? "success" : state === "reportReady" ? "primary" : "warning"}
                                    label={t(state)}
                                  />
                                  {conversation.goalsTotal ? (
                                    <Chip
                                      size="small"
                                      variant="outlined"
                                      icon={<IconTarget size={14} />}
                                      label={t("lunaHome.goals", { done: conversation.goalsDone, total: conversation.goalsTotal })}
                                    />
                                  ) : null}
                                </Stack>
                                <Typography variant="h5" mt={1.25} noWrap>
                                  {conversation.title}
                                </Typography>
                                <Stack direction="row" spacing={0.5} alignItems="center" mt={0.5}>
                                  <IconCalendarEvent size={14} />
                                  <Typography variant="body2" color="text.secondary">
                                    {format.dateTime(created, { dateStyle: "medium", timeStyle: "short" })}
                                  </Typography>
                                </Stack>
                                <Box mt={1} maxWidth={360}>
                                  <UsageMeter conversation={conversation} />
                                </Box>
                              </Box>

                              <LinkButton
                                href={`${SPEAK_PATH}?c=${conversation.id}`}
                                variant={state === "active" ? "contained" : "outlined"}
                                endIcon={<IconArrowRight size={16} />}
                                sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
                              >
                                {state === "active" ? t("lunaHome.continue") : t("lunaHome.seeReport")}
                              </LinkButton>
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
                        {t(`lunaHome.empty.${filter}`)}
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
            {/* Who Luna is and how a practice goes. */}
            <Card elevation={9} sx={{ background: "linear-gradient(160deg, #FFFFFF 0%, #FBF2EF 100%)" }}>
              <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                <Stack alignItems="center" textAlign="center" spacing={1}>
                  <LunaAvatar size={110} />
                  <Typography variant="h5">{t("luna.cardTitle")}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("lunaHome.tagline")}
                  </Typography>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1.5}>
                  {(["pick", "talk", "report"] as const).map((step, index) => (
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
                        <Typography variant="subtitle2">{t(`lunaHome.how.${step}.title`)}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t(`lunaHome.how.${step}.text`)}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            <SectionCard padding="15px" title={t("lunaHome.balance.title")} subtitle={t("lunaHome.balance.subtitle", { perClass })}>
              <Stack spacing={1.25}>
                {[
                  { label: t("lunaHome.balance.free"), value: freeLeft },
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
                    {t("lunaHome.balance.tokens")}
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
