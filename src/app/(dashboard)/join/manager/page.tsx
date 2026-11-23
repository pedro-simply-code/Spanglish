import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SectionCard } from "@/components/ui/section-card";
// eslint-disable-next-line no-restricted-imports -- ManagerJoinForm is not re-exported by the admin public API.
import { ManagerJoinForm } from "@/features/admin/components/manager-join-form";
import { getManagerInvitationByToken } from "@/server/admin/manager-access";
import { getAuthState } from "@/server/auth/session";
import { LinkButton } from "@/components/ui/link-button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("educator.metadata.joinManager");
  return { title: t("title"), description: t("description") };
}

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default function ManagerJoinPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: PageProps) {
  const t = await getTranslations("educator");
  const query = await searchParams;
  const token = query.token?.trim() ?? "";
  const auth = await getAuthState();

  if (!token) {
    return (
      <Box mt={3}>
        <Alert severity="error">{t("join.missingToken")}</Alert>
      </Box>
    );
  }

  const invitation = await getManagerInvitationByToken(token);

  if (!invitation) {
    return (
      <Box mt={3}>
        <Alert severity="error">{t("join.notFound")}</Alert>
      </Box>
    );
  }

  if (!invitation.open) {
    return (
      <Box mt={3}>
        <Alert severity="warning">{t("join.closed")}</Alert>
      </Box>
    );
  }

  if (auth.status !== "signed-in") {
    const loginHref = `/login?next=${encodeURIComponent(`/join/manager?token=${encodeURIComponent(token)}`)}`;
    return (
      <Box>
        <Breadcrumb
          title={t("join.title")}
          subtitle={t("join.signInSubtitle", { email: invitation.email })}
        />
        <SectionCard title={t("join.signInTitle")}>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t("join.signInHelp", { email: invitation.email })}
          </Alert>
          <LinkButton href={loginHref} variant="contained">
            {t("join.signIn")}
          </LinkButton>
        </SectionCard>
      </Box>
    );
  }

  const emailMatches =
    invitation.email.trim().toLowerCase() === auth.session.email.trim().toLowerCase();

  return (
    <Box>
      <Breadcrumb
        title={t("join.title")}
        subtitle={t("join.acceptSubtitle")}
      />
      <SectionCard title={t("join.onboardingTitle")}>
        <ManagerJoinForm
          token={token}
          inviteEmail={invitation.email}
          inviteNote={invitation.inviteNote}
          signedInEmail={auth.session.email}
          emailMatches={emailMatches}
        />
      </SectionCard>
    </Box>
  );
}
