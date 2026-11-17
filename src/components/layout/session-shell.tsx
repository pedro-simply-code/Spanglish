import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { LocaleProvider } from "@/i18n/locale-provider";
import { getDashboardOptions } from "@/lib/auth-roles";
import { getActorAllowIncompleteProfile } from "@/server/auth/session";
import { countUnreadInbox, listInboxNotificationFeed } from "@/server/messages/mailbox";

/**
 * Reads the signed-in account once and hands the serializable session data to
 * the client shell. This component must stay behind a `<Suspense>` boundary
 * because it reads cookies under Cache Components.
 */
export async function SessionShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await getActorAllowIncompleteProfile();
  if (!actor.profileComplete) {
    redirect("/onboarding");
  }

  const [inboxNotifications, unreadInboxCount] = await Promise.all([
    listInboxNotificationFeed(actor.userId),
    countUnreadInbox(actor.userId),
  ]);

  return (
    <LocaleProvider locale={actor.locale}>
      <AppShell
        actor={actor}
        dashboardOptions={getDashboardOptions(actor.roles)}
        inboxNotifications={inboxNotifications}
        unreadInboxCount={unreadInboxCount}
      >
        {children}
      </AppShell>
    </LocaleProvider>
  );
}
