"use client";

import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IconCalendarEvent, IconCircleCheck } from "@tabler/icons-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { LinkButton } from "@/components/ui/link-button";

/** Page Stripe returns to after a package payment. */
export function CheckoutResult({
  state,
  credits,
}: {
  state: "paid" | "processing" | "failed";
  credits?: number;
}) {
  return (
    <Box mt={3}>
      <Breadcrumb
        title={state === "paid" ? "Enrollment confirmed" : "Payment"}
        subtitle={state === "paid" ? "Your class package is ready to use." : "Stripe checkout"}
      />
      <Card elevation={9}>
        <CardContent sx={{ p: { xs: "30px", md: "50px" }, textAlign: "center" }}>
          {state === "paid" ? (
            <>
              <Avatar sx={{ width: 84, height: 84, mx: "auto", bgcolor: "success.light", color: "success.main" }}>
                <IconCircleCheck size={42} />
              </Avatar>
              <Typography variant="h3" fontWeight={700} mt={3}>
                Payment received
              </Typography>
              <Typography color="text.secondary" mt={1} mx="auto" maxWidth={560}>
                {credits ? `${credits} credits were added to your account.` : "Your credits were added."} Schedule
                your next live class whenever you are ready.
              </Typography>
            </>
          ) : (
            <Alert severity={state === "processing" ? "info" : "error"} sx={{ textAlign: "left" }}>
              {state === "processing"
                ? "Stripe has not confirmed the payment yet. Your credits appear as soon as it does; refresh in a minute."
                : "We could not find this payment. If you were charged, contact the academy with your receipt."}
            </Alert>
          )}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center" mt={4}>
            <LinkButton href="/schedule" variant="contained" size="large" startIcon={<IconCalendarEvent size={18} />}>
              Schedule a class
            </LinkButton>
            <LinkButton href="/home" variant="outlined" size="large">
              Back to overview
            </LinkButton>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
