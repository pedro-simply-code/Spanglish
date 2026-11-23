"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconArrowRight, IconCheck, IconMessageCircle, IconMicrophone, IconSchool } from "@tabler/icons-react";
import { SectionCard } from "@/components/ui/section-card";
import { purchaseAiCreditPackAction } from "@/features/academy/actions";
import { formatMoney } from "@/features/academy/data";
import { tokensLabel } from "@/lib/ai-credit-pricing";
import { useAppToast } from "@/lib/use-app-toast";

/** A pack on sale; `credits` (conversations) is calculated on the server from env. */
export type AiPackOption = { id: string; name: string; credits: number; priceCents: number };

/** What the student has for AI practice (null when staff preview the page). */
export type AiAllowanceView = {
  credits: number;
  freeVoice: number;
  freeChat: number;
  perClass: number;
};

export const perConversationUsd = (pack: AiPackOption) => (pack.credits ? pack.priceCents / 100 / pack.credits : 0);

/** Price per conversation with enough decimals to compare packs ($0.014). */
export const conversationPrice = (pack: AiPackOption) => `$${perConversationUsd(pack).toFixed(3)}`;

/** AI credit packs as horizontal cards (same layout as the class packages). */
export function AiPackList({
  packs,
  selectedId,
  onSelect,
  tokensPerConversation,
}: {
  packs: AiPackOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  tokensPerConversation: number;
}) {
  const t = useTranslations("student.pricing.ai");
  if (!packs.length) {
    return (
      <Typography color="text.secondary" py={3} textAlign="center">
        {t("empty")}
      </Typography>
    );
  }
  const best = packs.reduce((low, pack) => (perConversationUsd(pack) < perConversationUsd(low) ? pack : low), packs[0]!);
  const highest = Math.max(...packs.map(perConversationUsd));

  return (
    <Stack spacing={2}>
      {packs.map((pack) => {
        const selected = pack.id === selectedId;
        const savings = highest > 0 ? Math.round(((highest - perConversationUsd(pack)) / highest) * 100) : 0;
        return (
          <ButtonBase
            key={pack.id}
            onClick={() => onSelect(pack.id)}
            aria-pressed={selected}
            sx={{ display: "block", width: "100%", textAlign: "left", borderRadius: 1 }}
          >
            <Box
              sx={{
                p: "15px",
                borderRadius: 1,
                border: "1px solid",
                borderColor: selected ? "primary.main" : "divider",
                bgcolor: selected ? "primary.light" : "background.paper",
                boxShadow: selected ? "0 0 0 2px rgba(250,137,107,0.18)" : "none",
              }}
            >
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2.5} alignItems={{ sm: "center" }}>
                <Box
                  sx={{
                    width: { xs: "100%", sm: 72 },
                    py: 1.25,
                    textAlign: "center",
                    bgcolor: selected ? "background.paper" : "grey.200",
                    color: selected ? "primary.main" : "text.secondary",
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="h3" fontWeight={700} lineHeight={1.1}>
                    {pack.credits}
                  </Typography>
                  <Typography variant="caption" display="block">
                    {t("creditsUnit", { count: pack.credits })}
                  </Typography>
                </Box>

                <Box flexGrow={1} minWidth={0}>
                  <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
                    {pack.id === best.id && packs.length > 1 ? (
                      <Chip size="small" color="primary" label={t("bestValue")} />
                    ) : null}
                    <Chip size="small" variant="outlined" icon={<IconMicrophone size={14} />} label={t("luna")} />
                    <Chip size="small" variant="outlined" icon={<IconMessageCircle size={14} />} label={t("chat")} />
                    {savings > 0 ? <Chip size="small" color="success" label={t("save", { percent: savings })} /> : null}
                  </Stack>
                  <Typography variant="h5" mt={1.25}>
                    {pack.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mt={0.5}>
                    {t("description", { count: pack.credits, tokens: tokensLabel(tokensPerConversation) })}
                  </Typography>
                </Box>

                <Box sx={{ flexShrink: 0, textAlign: { sm: "right" }, minWidth: 120 }}>
                  <Typography variant="h3" fontWeight={700} color="primary.main">
                    {formatMoney(pack.priceCents / 100)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("perConversation", { amount: conversationPrice(pack) })}
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center" justifyContent={{ sm: "flex-end" }} mt={0.75}>
                    {selected ? <IconCheck size={16} color="#FA896B" /> : null}
                    <Typography
                      variant="body2"
                      fontWeight={selected ? 600 : 400}
                      color={selected ? "primary.main" : "text.secondary"}
                    >
                      {selected ? t("selected") : t("select")}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </ButtonBase>
        );
      })}
    </Stack>
  );
}

/** Pays for the pack: Stripe Checkout when it is on, otherwise the demo adds the credits at once. */
export function AiBuyButton({ pack, disabled }: { pack: AiPackOption | null; disabled?: boolean }) {
  const t = useTranslations("student.pricing.ai");
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [buying, startBuying] = useTransition();

  const buy = () => {
    if (!pack) return;
    startBuying(async () => {
      const result = await purchaseAiCreditPackAction(pack.id);
      if (!result.ok) {
        showError({ message: result.message });
        return;
      }
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      showSuccess({ message: result.message });
      router.push("/credits?tab=credits&product=ai");
      router.refresh();
    });
  };

  return (
    <Button
      variant="contained"
      size="large"
      endIcon={<IconArrowRight size={18} />}
      disabled={!pack || buying || disabled}
      onClick={buy}
    >
      {buying ? t("buying") : t("buy")}
    </Button>
  );
}

/** How free conversations and AI credits work, with what the student has. */
export function AiHowItWorksCard({
  allowance,
  tokensPerConversation,
}: {
  allowance: AiAllowanceView | null;
  tokensPerConversation: number;
}) {
  const t = useTranslations("student.pricing.ai");
  const perClass = allowance?.perClass ?? 2;
  const row = (label: string, value: number) => (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Chip size="small" variant="outlined" label={value} />
    </Stack>
  );
  return (
    <SectionCard padding="15px" title={t("howTitle")} subtitle={t("howSubtitle")}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box sx={{ color: "primary.main", mt: "2px" }}>
            <IconSchool size={18} />
          </Box>
          <Typography variant="body2">{t("howFree", { perClass })}</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {t("howTokens", { tokens: tokensLabel(tokensPerConversation) })}
        </Typography>
        {allowance ? (
          <>
            {row(t("freeLuna"), allowance.freeVoice)}
            {row(t("freeChat"), allowance.freeChat)}
            {row(t("creditsLeft"), allowance.credits)}
          </>
        ) : null}
      </Stack>
    </SectionCard>
  );
}
