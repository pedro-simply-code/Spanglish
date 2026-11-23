"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconCalendarPlus,
  IconCreditCard,
  IconMessageCircle,
  IconMicrophone,
  IconReceipt,
  IconSparkles,
  IconTicket,
} from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { DateBlock } from "@/components/ui/date-block";
import { LinkButton } from "@/components/ui/link-button";
import { ListPagination } from "@/components/ui/list-pagination";
import { SectionCard } from "@/components/ui/section-card";
import { SummaryBanner } from "@/components/ui/summary-banner";
import { resumePaymentAction } from "@/features/credits/actions";
import { tokensLabel } from "@/lib/ai-credit-pricing";
import { useAppToast } from "@/lib/use-app-toast";
import type { ClassType } from "@/features/academy/data";
import { formatClassType } from "@/features/classes/format";

const PAGE_SIZE = 5;

type View = "movements" | "orders";
type Product = "classes" | "ai";

export type AiCreditMovementView = {
  id: string;
  delta: number;
  reason: "purchase" | "grant" | "use" | "refund" | "adjustment";
  note: string | null;
  createdAt: string;
};

export type AiCreditOrderView = {
  id: string;
  credits: number;
  /** Same pack again, ready to pay (set on the server). */
  buyAgainHref: string;
  totalCents: number;
  currency: string;
  status: string;
  createdAt: string;
};

export type AiCreditsView = {
  credits: number;
  freeVoice: number;
  freeChat: number;
  perClass: number;
  /** Token budget of one conversation (AI_CONVERSATION_TOKEN_LIMIT). */
  tokensPerConversation: number;
  history: AiCreditMovementView[];
  orders: AiCreditOrderView[];
};

export type CreditBalanceView = {
  classType: ClassType;
  durationMinutes: number;
  balance: number;
  shared: boolean;
};

export type CreditMovementView = {
  id: string;
  delta: number;
  reason: "purchase" | "grant" | "booking" | "refund" | "adjustment";
  classType: ClassType;
  durationMinutes: number;
  shared: boolean;
  note: string | null;
  sessionId: string | null;
  createdAt: string;
};

export type OrderView = {
  id: string;
  /** Same package again: straight to checkout, or the buy steps preselected if it is no longer on sale. */
  buyAgainHref: string;
  classType: ClassType;
  durationMinutes: number;
  credits: number;
  totalCents: number;
  currency: string;
  provider: string;
  status: string;
  createdAt: string;
};

type CreditsOverviewProps = {
  balances: CreditBalanceView[];
  history: CreditMovementView[];
  orders: OrderView[];
  timeZone: string;
  /** AI credits (Luna and the chat): balance, free conversations left and movements. */
  ai: AiCreditsView;
};

/** The student's class credits, with the My classes layout: summary, movements/purchases + side panels. */
export function CreditsOverview({ balances, history, orders, timeZone, ai }: CreditsOverviewProps) {
  const t = useTranslations("student.learn.credits");
  const tStudent = useTranslations("student");
  const format = useFormatter();
  const searchParams = useSearchParams();
  const [product, setProduct] = useState<Product>(searchParams.get("product") === "ai" ? "ai" : "classes");
  const [view, setView] = useState<View>("movements");
  const [page, setPage] = useState(1);
  const time = (iso: string) => format.dateTime(new Date(iso), { hour: "numeric", minute: "2-digit", timeZone });
  const kind = (item: { classType: ClassType; durationMinutes: number }) =>
    `${formatClassType(item.classType, tStudent)} · ${tStudent("common.minutes", { count: item.durationMinutes })}`;
  const money = (cents: number, currency: string) => format.number(cents / 100, { style: "currency", currency });

  const total = balances.reduce((sum, item) => sum + item.balance, 0);
  const added = history.filter((item) => item.delta > 0 && item.reason !== "refund").reduce((sum, item) => sum + item.delta, 0);
  const booked =
    history.filter((item) => item.reason === "booking").reduce((sum, item) => sum - item.delta, 0) -
    history.filter((item) => item.reason === "refund").reduce((sum, item) => sum + item.delta, 0);
  const paid = orders.filter((order) => order.status === "paid");
  const currency = paid[0]?.currency ?? "USD";
  const spent = paid.filter((order) => order.currency === currency).reduce((sum, order) => sum + order.totalCents, 0);
  const lastPurchase = paid[0] ?? null;

  const aiPaid = ai.orders.filter((order) => order.status === "paid");
  const aiCurrency = aiPaid[0]?.currency ?? "USD";
  const aiSpent = aiPaid.filter((order) => order.currency === aiCurrency).reduce((sum, order) => sum + order.totalCents, 0);
  const aiUsed = ai.history.filter((item) => item.reason === "use").length;
  const tokens = tokensLabel(ai.tokensPerConversation);

  const lists = {
    classes: { movements: history.length, orders: orders.length },
    ai: { movements: ai.history.length, orders: ai.orders.length },
  };
  const count = lists[product][view];
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const current = Math.min(page, pages);
  const from = (current - 1) * PAGE_SIZE;

  return (
    <Box>
      <Breadcrumb title={t("title")} subtitle={t("subtitle")} />

      {product === "classes" ? (
        <SummaryBanner
          items={[
            { key: "available", icon: IconTicket, color: "primary", value: total, label: t("available") },
            { key: "added", icon: IconArrowUpRight, color: "success", value: added, label: t("summary.added") },
            { key: "booked", icon: IconArrowDownRight, color: "secondary", value: Math.max(0, booked), label: t("summary.booked") },
          ]}
          action={
            <>
              <LinkButton href="/credits?tab=buy" variant="contained" startIcon={<IconCreditCard size={18} />}>
                {t("buy")}
              </LinkButton>
              <LinkButton href="/classes?tab=book" variant="outlined" startIcon={<IconCalendarPlus size={18} />}>
                {t("book")}
              </LinkButton>
            </>
          }
        />
      ) : (
        <SummaryBanner
          items={[
            { key: "credits", icon: IconSparkles, color: "primary", value: ai.credits, label: t("aiSummary.credits") },
            { key: "luna", icon: IconMicrophone, color: "secondary", value: ai.freeVoice, label: t("aiSummary.freeLuna") },
            { key: "chat", icon: IconMessageCircle, color: "success", value: ai.freeChat, label: t("aiSummary.freeChat") },
          ]}
          action={
            <>
              <LinkButton href="/credits?tab=buy&product=ai" variant="contained" startIcon={<IconSparkles size={18} />}>
                {t("aiPanel.buy")}
              </LinkButton>
              <LinkButton href="/speak" variant="outlined" startIcon={<IconMicrophone size={18} />}>
                {t("aiPanel.talk")}
              </LinkButton>
            </>
          }
        />
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            {/* Classes or AI credits, then their movements or purchases. */}
            <Card elevation={9}>
              <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} spacing={1.5} sx={{ px: 2, pt: { xs: 2, sm: 0 } }}>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  color="primary"
                  value={product}
                  onChange={(_event, value: Product | null) => {
                    if (!value) return;
                    setProduct(value);
                    setPage(1);
                  }}
                >
                  <ToggleButton value="classes" sx={{ px: 2, whiteSpace: "nowrap" }}>
                    {t("product.classes")}
                  </ToggleButton>
                  <ToggleButton value="ai" sx={{ px: 2, whiteSpace: "nowrap" }}>
                    {t("product.ai")}
                  </ToggleButton>
                </ToggleButtonGroup>
                <Tabs
                  value={view}
                  onChange={(_, value: View) => {
                    setView(value);
                    setPage(1);
                  }}
                  variant="scrollable"
                  allowScrollButtonsMobile
                >
                  <Tab value="movements" label={t("tabs.movements", { count: lists[product].movements })} />
                  <Tab value="orders" label={t("tabs.orders", { count: lists[product].orders })} />
                </Tabs>
              </Stack>
            </Card>

            {product === "classes" && view === "movements" ? (
              history.length ? (
                <Stack spacing={2}>
                  {history.slice(from, from + PAGE_SIZE).map((item) => (
                    <Card key={item.id} elevation={9}>
                      <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ sm: "center" }}>
                          <DateBlock date={new Date(item.createdAt)} timeZone={timeZone} highlight={item.delta > 0} />
                          <Box flexGrow={1} minWidth={0}>
                            <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
                              <Chip
                                size="small"
                                color={item.delta > 0 ? "success" : "default"}
                                label={t(`reason.${item.reason}`)}
                              />
                              {item.shared ? <Chip size="small" variant="outlined" label={t("shared")} /> : null}
                            </Stack>
                            <Typography variant="h5" mt={1.25}>
                              {kind(item)}
                            </Typography>
                            <Stack direction="row" spacing={2} mt={0.5} alignItems="center">
                              <Typography variant="body2" color="text.secondary">
                                {time(item.createdAt)}
                                {item.note ? ` · ${item.note}` : ""}
                              </Typography>
                              {item.sessionId ? (
                                <Typography
                                  component={Link}
                                  href={`/classes/${item.sessionId}`}
                                  variant="body2"
                                  color="primary"
                                  sx={{ textDecoration: "none" }}
                                >
                                  {t("seeClass")}
                                </Typography>
                              ) : null}
                            </Stack>
                          </Box>
                          <Typography
                            variant="h4"
                            fontWeight={700}
                            color={item.delta > 0 ? "success.main" : "error.main"}
                            sx={{ flexShrink: 0, minWidth: 48, textAlign: { sm: "right" } }}
                          >
                            {item.delta > 0 ? `+${item.delta}` : item.delta}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <EmptyCard text={t("noHistory")} />
              )
            ) : product === "ai" && view === "movements" ? (
              ai.history.length ? (
                <Stack spacing={2}>
                  {ai.history.slice(from, from + PAGE_SIZE).map((item) => (
                    <Card key={item.id} elevation={9}>
                      <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ sm: "center" }}>
                          <DateBlock date={new Date(item.createdAt)} timeZone={timeZone} highlight={item.delta > 0} />
                          <Box flexGrow={1} minWidth={0}>
                            <Chip
                              size="small"
                              color={item.delta > 0 ? "success" : "default"}
                              label={t(`aiReason.${item.reason}`)}
                            />
                            <Typography variant="h5" mt={1.25}>
                              {item.reason === "use"
                                ? t(item.note === "voice" ? "aiUse.voice" : "aiUse.chat")
                                : (item.note ?? t(`aiReason.${item.reason}`))}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mt={0.5}>
                              {time(item.createdAt)}
                            </Typography>
                          </Box>
                          <Typography
                            variant="h4"
                            fontWeight={700}
                            color={item.delta > 0 ? "success.main" : "error.main"}
                            sx={{ flexShrink: 0, minWidth: 48, textAlign: { sm: "right" } }}
                          >
                            {item.delta > 0 ? `+${item.delta}` : item.delta}
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <EmptyCard text={t("noAiHistory")} />
              )
            ) : product === "ai" ? (
              ai.orders.length ? (
                <Stack spacing={2}>
                  {ai.orders.slice(from, from + PAGE_SIZE).map((order) => (
                    <Card key={order.id} elevation={9}>
                      <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ sm: "center" }}>
                          <DateBlock date={new Date(order.createdAt)} timeZone={timeZone} highlight={order.status === "paid"} />
                          <Box flexGrow={1} minWidth={0}>
                            <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
                              <Chip
                                size="small"
                                color={order.status === "paid" ? "success" : order.status === "pending" ? "warning" : "default"}
                                label={t(`orderStatus.${order.status}`)}
                              />
                              <Chip size="small" variant="outlined" label={t("aiOrderKind", { tokens })} />
                            </Stack>
                            <Typography variant="h5" mt={1.25}>
                              {t("aiConversations", { count: order.credits })}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mt={0.5}>
                              {time(order.createdAt)}
                            </Typography>
                          </Box>
                          <Stack spacing={1} alignItems={{ sm: "flex-end" }} sx={{ flexShrink: 0 }}>
                            <Typography variant="h4" fontWeight={700}>
                              {money(order.totalCents, order.currency)}
                            </Typography>
                            <OrderActions kind="ai" orderId={order.id} status={order.status} buyAgainHref={order.buyAgainHref} />
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <EmptyCard text={t("noAiOrders")} />
              )
            ) : orders.length ? (
              <Stack spacing={2}>
                {orders.slice(from, from + PAGE_SIZE).map((order) => (
                  <Card key={order.id} elevation={9}>
                    <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" } }}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ sm: "center" }}>
                        <DateBlock date={new Date(order.createdAt)} timeZone={timeZone} highlight={order.status === "paid"} />
                        <Box flexGrow={1} minWidth={0}>
                          <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
                            <Chip
                              size="small"
                              color={order.status === "paid" ? "success" : order.status === "pending" ? "warning" : "default"}
                              label={t(`orderStatus.${order.status}`)}
                            />
                            <Chip size="small" variant="outlined" label={kind(order)} />
                          </Stack>
                          <Typography variant="h5" mt={1.25}>
                            {t("credits", { count: order.credits })}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" mt={0.5}>
                            {time(order.createdAt)}
                          </Typography>
                        </Box>
                        <Stack spacing={1} alignItems={{ sm: "flex-end" }} sx={{ flexShrink: 0 }}>
                          <Typography variant="h4" fontWeight={700}>
                            {money(order.totalCents, order.currency)}
                          </Typography>
                          <OrderActions kind="classes" orderId={order.id} status={order.status} buyAgainHref={order.buyAgainHref} />
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <EmptyCard text={t("noOrders")} />
            )}

            <ListPagination
              page={current}
              total={count}
              pageSize={PAGE_SIZE}
              onPageChange={(value) => {
                setPage(value);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            {product === "classes" ? (
              <>
                <SectionCard padding="15px" title={t("byKind")} subtitle={t("byKindSubtitle")}>
                  {balances.length ? (
                    <Stack spacing={1.25}>
                      {balances.map((item) => (
                        <Stack
                          key={`${item.classType}-${item.durationMinutes}-${item.shared}`}
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          spacing={1}
                        >
                          <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
                            <Typography variant="body2">{kind(item)}</Typography>
                            {item.shared ? <Chip size="small" variant="outlined" label={t("shared")} /> : null}
                          </Stack>
                          <Chip size="small" color="primary" label={t("credits", { count: item.balance })} />
                        </Stack>
                      ))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">{t("noBalances")}</Typography>
                  )}
                </SectionCard>

                <SectionCard padding="15px" title={t("spending.title")} subtitle={t("spending.subtitle")}>
                  <Stack spacing={1.25}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        {t("spending.total")}
                      </Typography>
                      <Typography variant="subtitle2">{money(spent, currency)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        {t("spending.packages")}
                      </Typography>
                      <Typography variant="subtitle2">{paid.length}</Typography>
                    </Stack>
                    {lastPurchase ? (
                      <Stack direction="row" spacing={1.5} alignItems="center" pt={1}>
                        <IconReceipt size={18} />
                        <Box minWidth={0}>
                          <Typography variant="caption" color="text.secondary">
                            {t("spending.last")}
                          </Typography>
                          <Typography variant="subtitle2">
                            {t("credits", { count: lastPurchase.credits })} · {kind(lastPurchase)}
                          </Typography>
                        </Box>
                      </Stack>
                    ) : null}
                  </Stack>
                </SectionCard>
              </>
            ) : (
              <>
                <SectionCard
                  padding="15px"
                  title={t("aiPanel.title")}
                  subtitle={t("aiPanel.subtitle", { perClass: ai.perClass })}
                >
                  <Stack spacing={1.25}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {t("aiPanel.credits")}
                      </Typography>
                      <Chip size="small" color="primary" label={ai.credits} />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {t("aiPanel.freeLuna")}
                      </Typography>
                      <Chip size="small" variant="outlined" label={ai.freeVoice} />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {t("aiPanel.freeChat")}
                      </Typography>
                      <Chip size="small" variant="outlined" label={ai.freeChat} />
                    </Stack>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="text.secondary">
                        {t("aiPanel.used")}
                      </Typography>
                      <Chip size="small" variant="outlined" label={aiUsed} />
                    </Stack>
                  </Stack>
                </SectionCard>

                <SectionCard padding="15px" title={t("aiMath.title")} subtitle={t("aiMath.subtitle")}>
                  <Stack spacing={1.25}>
                    <Typography variant="body2">{t("aiMath.tokens", { tokens })}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t("aiMath.free", { perClass: ai.perClass })}
                    </Typography>
                    <Divider flexItem />
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        {t("spending.total")}
                      </Typography>
                      <Typography variant="subtitle2">{money(aiSpent, aiCurrency)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        {t("aiMath.packs")}
                      </Typography>
                      <Typography variant="subtitle2">{aiPaid.length}</Typography>
                    </Stack>
                  </Stack>
                </SectionCard>
              </>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <Card elevation={9}>
      <CardContent sx={{ p: "15px", "&:last-child": { pb: "15px" }, textAlign: "center" }}>
        <Typography color="text.secondary" py={3}>
          {text}
        </Typography>
      </CardContent>
    </Card>
  );
}

/**
 * Pending: "Finish payment" asks Stripe (open → back to the Stripe page, paid →
 * credits now, expired → canceled). Canceled: "Buy again" with the same package or pack preselected.
 */
function OrderActions({
  kind,
  orderId,
  status,
  buyAgainHref,
}: {
  kind: "classes" | "ai";
  orderId: string;
  status: string;
  buyAgainHref: string;
}) {
  const t = useTranslations("student.learn.credits.pending");
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [checking, startChecking] = useTransition();

  if (status === "canceled") {
    return (
      <LinkButton href={buyAgainHref} size="small" variant="outlined">
        {t("buyAgain")}
      </LinkButton>
    );
  }
  if (status !== "pending") return null;
  return (
    <Button
      size="small"
      variant="contained"
      disabled={checking}
      onClick={() =>
        startChecking(async () => {
          const result = await resumePaymentAction(kind, orderId);
          if (result.redirectUrl) {
            window.location.href = result.redirectUrl;
            return;
          }
          if (result.ok) showSuccess({ message: result.message });
          else showError({ message: result.message });
          router.refresh();
        })
      }
    >
      {checking ? t("checking") : t("finish")}
    </Button>
  );
}
