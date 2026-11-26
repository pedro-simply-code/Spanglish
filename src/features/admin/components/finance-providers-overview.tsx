"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { useTranslations } from "next-intl";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { adminBreadcrumb } from "@/features/admin/components/admin-breadcrumb-items";
import { savePaymentProviderSettingsAction } from "@/features/admin/actions/payment-providers";
import type { PaymentProvider } from "@/features/admin/types";
import type { PaymentProviderSettings } from "@/server/payments/provider-settings";
import { useAppToast } from "@/lib/use-app-toast";

const statusColor = {
  connected: "success" as const,
  "setup-needed": "warning" as const,
  "not-configured": "default" as const,
  disabled: "default" as const,
};

type Props = {
  providers: PaymentProvider[];
  settings: PaymentProviderSettings;
};

export function FinanceProvidersOverview({ providers, settings }: Props) {
  const t = useTranslations("admin");
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [draft, setDraft] = useState(settings);
  const [savedSettings, setSavedSettings] = useState(settings);
  const [pending, startTransition] = useTransition();

  // New settings from the server (after saving): start the draft from them.
  if (savedSettings !== settings) {
    setSavedSettings(settings);
    setDraft(settings);
  }
  const dirty =
    draft.stripeCheckoutEnabled !== settings.stripeCheckoutEnabled ||
    draft.stripePayoutEnabled !== settings.stripePayoutEnabled ||
    draft.manualPayoutEnabled !== settings.manualPayoutEnabled;

  const toggle = (key: keyof PaymentProviderSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((prev) => ({ ...prev, [key]: event.target.checked }));
  };

  const save = () =>
    startTransition(async () => {
      const result = await savePaymentProviderSettingsAction(draft);
      if (result.ok) {
        showSuccess({ message: result.message });
        router.refresh();
      } else showError({ message: result.message });
    });

  const settingKeyFor = (id: string): keyof PaymentProviderSettings | null => {
    if (id === "stripe-checkout") return "stripeCheckoutEnabled";
    if (id === "stripe-connect") return "stripePayoutEnabled";
    if (id === "manual-transfer") return "manualPayoutEnabled";
    return null;
  };

  return (
    <Box>
      <Breadcrumb
        title={t("common.page.providers")}
        subtitle={t("finance.providers.subtitle")}
        items={adminBreadcrumb(t, t("common.section.finance"), t("common.page.providersShort"), "/admin/finance/providers")}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        {t("finance.providers.notice")}
      </Alert>

      <Grid container spacing={3}>
        {providers.map((provider) => {
          const key = settingKeyFor(provider.id);
          const switchDisabled = !provider.canToggle;
          return (
            <Grid key={provider.id} size={{ xs: 12, md: 6 }}>
              <Card elevation={9} sx={{ height: "100%" }}>
                <CardContent sx={{ p: "30px" }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                      <Box>
                        <Typography variant="h6" fontWeight={700}>
                          {provider.name}
                        </Typography>
                        <Chip
                          label={provider.role}
                          size="small"
                          variant="outlined"
                          sx={{ mt: 1 }}
                        />
                      </Box>
                      <Chip
                        size="small"
                        color={statusColor[provider.status]}
                        label={t(`finance.providers.status.${provider.status}`)}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {provider.revenueLabel}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {provider.note}
                    </Typography>
                    {key ? (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={draft[key]}
                            disabled={switchDisabled || pending}
                            onChange={toggle(key)}
                          />
                        }
                        label={t(draft[key] ? "finance.providers.enabledForAcademy" : "common.disabled")}
                      />
                    ) : null}
                    {key && !provider.envReady && key !== "manualPayoutEnabled" ? (
                      <Typography variant="caption" color="text.secondary">
                        {t("finance.providers.configureStripe")}
                      </Typography>
                    ) : null}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Stack direction="row" justifyContent="flex-end" mt={3}>
        <Button variant="contained" disabled={!dirty || pending} onClick={save}>
          {t("finance.providers.saveSettings")}
        </Button>
      </Stack>
    </Box>
  );
}
