"use client";

import { useTranslations } from "next-intl";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconCalendarEvent, IconCircleCheck, IconMicrophone } from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";

/** Page Stripe returns to after a package payment. */
export function CheckoutResult({
  state,
  credits,
  aiCredits = false,
}: {
  state: "paid" | "processing" | "failed";
  credits?: number;
  /** The payment was for an AI credit pack (Luna and the chat). */
  aiCredits?: boolean;
}) {
  const t = useTranslations("student");

  return (
    <Box>
      <Breadcrumb
        title={t(state === "paid" ? "checkout.result.titlePaid" : "checkout.result.titleDefault")}
        subtitle={
          state === "paid"
            ? t("checkout.result.subtitlePaid")
            : t("checkout.result.subtitleDefault")
        }
      />
      <Card elevation={9}>
        <CardContent sx={{ p: { xs: "30px", md: "50px" }, textAlign: "center" }}>
          {state === "paid" ? (
            <>
              <Avatar sx={{ width: 84, height: 84, mx: "auto", bgcolor: "success.light", color: "success.main" }}>
                <IconCircleCheck size={42} />
              </Avatar>
              <Typography variant="h3" fontWeight={700} mt={3}>
                {t("checkout.result.paymentReceived")}
              </Typography>
              <Typography color="text.secondary" mt={1} mx="auto" maxWidth={560}>
                {aiCredits
                  ? t("checkout.result.aiCreditsAdded", { count: credits ?? 0 })
                  : (
                    <>
                      {credits
                        ? t("checkout.result.creditsAddedCount", { count: credits })
                        : t("checkout.result.creditsAddedGeneric")}{" "}
                      {t("checkout.result.scheduleNext")}
                    </>
                  )}
              </Typography>
            </>
          ) : (
            <Alert severity={state === "processing" ? "info" : "error"} sx={{ textAlign: "left" }}>
              {state === "processing"
                ? t("checkout.result.processing")
                : t("checkout.result.failed")}
            </Alert>
          )}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center" mt={4}>
            {aiCredits ? (
              <LinkButton href="/speak" variant="contained" size="large" startIcon={<IconMicrophone size={18} />}>
                {t("checkout.result.talkWithLuna")}
              </LinkButton>
            ) : (
              <LinkButton href="/classes?tab=book" variant="contained" size="large" startIcon={<IconCalendarEvent size={18} />}>
                {t("actions.scheduleClass")}
              </LinkButton>
            )}
            <LinkButton href="/home" variant="outlined" size="large">
              {t("actions.backToOverview")}
            </LinkButton>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
