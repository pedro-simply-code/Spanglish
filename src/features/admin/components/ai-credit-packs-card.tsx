"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { IconDeviceFloppy, IconPlus, IconTrash } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { SectionCard } from "@/components/ui/section-card";
import { deleteAiCreditPackAction, saveAiCreditPackAction } from "@/features/admin/actions/ai-credit-packs";
import { aiPackMath, tokensLabel, type AiPricingConfig } from "@/lib/ai-credit-pricing";
import { useAppToast } from "@/lib/use-app-toast";

export type AdminAiPack = { id: string; name: string; priceCents: number; marginPercent: number; active: boolean };

type Draft = { key: string; id?: string; name: string; price: string; margin: string; active: boolean };

const toDraft = (pack: AdminAiPack): Draft => ({
  key: pack.id,
  id: pack.id,
  name: pack.name,
  price: (pack.priceCents / 100).toFixed(2),
  margin: String(pack.marginPercent),
  active: pack.active,
});

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/**
 * Admin → packages: AI credit packs. The admin sets price and margin; the
 * conversations are calculated from env (tokens per conversation, model price,
 * multiplier, card fee), shown live as the fields change.
 */
export function AiCreditPacksCard({ packs, config }: { packs: AdminAiPack[]; config: AiPricingConfig }) {
  const t = useTranslations("admin.aiPacks");
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Draft[]>(() => packs.map(toDraft));
  const [confirming, setConfirming] = useState<string | null>(null);

  const patch = (key: string, change: Partial<Draft>) =>
    setDrafts((list) => list.map((item) => (item.key === key ? { ...item, ...change } : item)));

  const run = (action: () => Promise<{ ok: boolean; message: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        showSuccess({ message: result.message });
        router.refresh();
      } else showError({ message: result.message });
    });

  const perConversation = (config.tokensPerConversation * config.usdPerMillionTokens * config.costMultiplier) / 1_000_000;

  return (
    <SectionCard
      title={t("title")}
      subtitle={t("subtitle")}
      action={
        <Button
          variant="outlined"
          size="small"
          startIcon={<IconPlus size={16} />}
          sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
          onClick={() =>
            setDrafts((list) => [...list, { key: `new-${Date.now()}`, name: "", price: "5.00", margin: "15", active: true }])
          }
        >
          {t("add")}
        </Button>
      }
    >
      {/* The settings the math uses (all from env). */}
      <Stack direction="row" flexWrap="wrap" gap={1} mb={3}>
        <Chip size="small" variant="outlined" label={t("config.tokens", { tokens: tokensLabel(config.tokensPerConversation) })} />
        <Chip size="small" variant="outlined" label={t("config.rate", { rate: config.usdPerMillionTokens })} />
        <Chip size="small" variant="outlined" label={t("config.multiplier", { times: config.costMultiplier })} />
        <Chip
          size="small"
          variant="outlined"
          label={t("config.fee", { percent: config.stripePercent, fixed: usd(config.stripeFixedCents) })}
        />
        <Chip size="small" color="primary" label={t("config.perConversation", { amount: `$${perConversation.toFixed(4)}` })} />
      </Stack>

      {drafts.length ? (
        <Stack spacing={2} divider={<Divider flexItem />}>
          {drafts.map((draft) => {
            const priceCents = Math.round(Number(draft.price) * 100);
            const margin = Number(draft.margin);
            const math = Number.isFinite(priceCents) && Number.isFinite(margin) ? aiPackMath(priceCents, margin, config) : null;
            return (
              <Stack key={draft.key} spacing={1.5}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }}>
                  <TextField
                    size="small"
                    label={t("name")}
                    value={draft.name}
                    onChange={(event) => patch(draft.key, { name: event.target.value })}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label={t("price")}
                    value={draft.price}
                    onChange={(event) => patch(draft.key, { price: event.target.value })}
                    sx={{ width: { md: 130 } }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label={t("margin")}
                    value={draft.margin}
                    onChange={(event) => patch(draft.key, { margin: event.target.value })}
                    sx={{ width: { md: 110 } }}
                  />
                  <Stack direction="row" alignItems="center">
                    <Switch checked={draft.active} onChange={(event) => patch(draft.key, { active: event.target.checked })} />
                    <Typography variant="body2">{t("active")}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={pending}
                      startIcon={<IconDeviceFloppy size={16} />}
                      onClick={() =>
                        run(() =>
                          saveAiCreditPackAction({
                            id: draft.id,
                            name: draft.name,
                            priceUsd: Number(draft.price),
                            marginPercent: margin,
                            active: draft.active,
                          }),
                        )
                      }
                    >
                      {t("save")}
                    </Button>
                    {draft.id ? (
                      <Button
                        variant={confirming === draft.key ? "contained" : "outlined"}
                        color="error"
                        size="small"
                        disabled={pending}
                        startIcon={<IconTrash size={16} />}
                        onClick={() => {
                          if (confirming !== draft.key) {
                            setConfirming(draft.key);
                            return;
                          }
                          setConfirming(null);
                          const id = draft.id!;
                          run(async () => {
                            const result = await deleteAiCreditPackAction(id);
                            if (result.ok) setDrafts((list) => list.filter((item) => item.key !== draft.key));
                            return result;
                          });
                        }}
                      >
                        {confirming === draft.key ? t("confirmDelete") : t("delete")}
                      </Button>
                    ) : (
                      <Button size="small" onClick={() => setDrafts((list) => list.filter((item) => item.key !== draft.key))}>
                        {t("delete")}
                      </Button>
                    )}
                  </Stack>
                </Stack>

                {/* Where each dollar goes. */}
                {math ? (
                  <Stack direction="row" flexWrap="wrap" gap={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t("math.conversations")}
                      </Typography>
                      <Typography variant="subtitle1" fontWeight={700} color={math.credits < 1 ? "error.main" : "primary.main"}>
                        {math.credits}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t("math.fee")}
                      </Typography>
                      <Typography variant="subtitle2">{usd(math.stripeFeeCents)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t("math.margin")}
                      </Typography>
                      <Typography variant="subtitle2">{usd(math.marginCents)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t("math.ai")}
                      </Typography>
                      <Typography variant="subtitle2">{usd(math.aiCostCents)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t("math.perConversation")}
                      </Typography>
                      <Typography variant="subtitle2">
                        {math.credits ? `$${(priceCents / 100 / math.credits).toFixed(3)}` : "—"}
                      </Typography>
                    </Box>
                  </Stack>
                ) : null}
              </Stack>
            );
          })}
        </Stack>
      ) : (
        <Typography color="text.secondary">{t("empty")}</Typography>
      )}
    </SectionCard>
  );
}
