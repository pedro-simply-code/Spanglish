import type { Metadata } from "next";
import { Suspense } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { SectionCard } from "@/components/ui/section-card";
import { ManagerJoinForm } from "@/features/admin/components/manager-join-form";
import { getManagerInvitationByToken } from "@/server/admin/manager-access";
import { getAuthState } from "@/server/auth/session";
import { LinkButton } from "@/components/ui/link-button";

export const metadata: Metadata = {
  title: "Manager invitation",
  description: "Accept an operations manager invitation",
};

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
  const query = await searchParams;
  const token = query.token?.trim() ?? "";
  const auth = await getAuthState();

  if (!token) {
    return (
      <Box mt={3}>
        <Alert severity="error">Missing invitation token. Open the link from your Spanglish inbox (Email in the app).</Alert>
      </Box>
    );
  }

  const invitation = await getManagerInvitationByToken(token);

  if (!invitation) {
    return (
      <Box mt={3}>
        <Alert severity="error">This invitation was not found.</Alert>
      </Box>
    );
  }

  if (!invitation.open) {
    return (
      <Box mt={3}>
        <Alert severity="warning">
          This invitation is no longer open (expired, revoked, or already accepted).
        </Alert>
      </Box>
    );
  }

  if (auth.status !== "signed-in") {
    const loginHref = `/login?next=${encodeURIComponent(`/join/manager?token=${encodeURIComponent(token)}`)}`;
    return (
      <Box mt={3}>
        <Breadcrumb
          title="Manager invitation"
          subtitle={`Invitation for ${invitation.email}`}
        />
        <SectionCard title="Sign in to continue">
          <Alert severity="info" sx={{ mb: 2 }}>
            Create an account or sign in with <strong>{invitation.email}</strong>, then return here to submit your
            experience and accept the role.
          </Alert>
          <LinkButton href={loginHref} variant="contained">
            Sign in
          </LinkButton>
        </SectionCard>
      </Box>
    );
  }

  const emailMatches =
    invitation.email.trim().toLowerCase() === auth.session.email.trim().toLowerCase();

  return (
    <Box mt={3}>
      <Breadcrumb
        title="Manager invitation"
        subtitle="Submit your experience and accept operations access"
      />
      <SectionCard title="Operations manager onboarding">
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