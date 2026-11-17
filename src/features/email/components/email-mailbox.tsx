"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import {
  markMessageReadAction,
  sendAcademyMessageAction,
  toggleMessageImportantAction,
  toggleMessageStarredAction,
  trashMessageAction,
} from "@/features/email/actions";
import { EmailContent } from "@/features/email/components/email-content";
import { EmailFilter } from "@/features/email/components/email-filter";
import { EmailList } from "@/features/email/components/email-list";
import { EmailSearch } from "@/features/email/components/email-search";
import { filterMailboxEmails } from "@/features/email/mailbox-filters";
import type { Email, EmailFilterId } from "@/features/email/types";
import type { MessageRecipient } from "@/server/messages/recipients";
import { useAppToast } from "@/lib/use-app-toast";

const drawerWidth = 240;
const secdrawerWidth = 340;

type EmailMailboxProps = {
  initialEmails: Email[];
};

export function EmailMailbox({ initialEmails }: EmailMailboxProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();

  const composeInitial = useMemo(() => {
    if (searchParams.get("compose") !== "1") return null;
    return {
      to: searchParams.get("to") ?? "",
      subject: searchParams.get("subject") ?? "",
      body: searchParams.get("body") ?? "",
    };
  }, [searchParams]);
  const composeOpen = searchParams.get("compose") === "1";

  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [filter, setFilter] = useState<EmailFilterId>("inbox");
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composeDraft, setComposeDraft] = useState<{ to?: string; subject?: string; body?: string } | null>(null);
  const [isLeftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(false);

  const lgUp = useMediaQuery((theme) => theme.breakpoints.up("lg"));
  const mdUp = useMediaQuery((theme) => theme.breakpoints.up("md"));

  const visibleEmails = filterMailboxEmails(emails, filter, search);
  const activeEmail = emails.find((email) => email.id === activeId);

  const refreshFromServer = () => router.refresh();

  const patchEmail = (messageId: string, patch: Partial<Email>) => {
    setEmails((current) => current.map((email) => (email.id === messageId ? { ...email, ...patch } : email)));
  };

  const handleSelect = (emailId: string) => {
    setActiveId(emailId);
    setRightSidebarOpen(true);
    const selected = emails.find((email) => email.id === emailId);
    if (selected?.inbox && selected.unread) {
      patchEmail(emailId, { unread: false });
      startTransition(() => {
        void markMessageReadAction(emailId);
      });
    }
  };

  /* Deep link from notifications: ?message= */
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync UI to ?message= navigation */
    const messageId = searchParams.get("message");
    if (!messageId) return;
    const found = emails.find((email) => email.id === messageId);
    if (!found || found.trash) return;
    setFilter("inbox");
    handleSelect(messageId);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open linked inbox row once on navigation
  }, [searchParams, emails]);

  const handleStar = (emailId: string) => {
    const current = emails.find((email) => email.id === emailId);
    if (!current?.inbox) return;
    patchEmail(emailId, { starred: !current.starred });
    startTransition(() => {
      void toggleMessageStarredAction(emailId);
    });
  };

  const handleImportant = (emailId: string) => {
    const current = emails.find((email) => email.id === emailId);
    if (!current?.inbox) return;
    patchEmail(emailId, { important: !current.important });
    startTransition(() => {
      void toggleMessageImportantAction(emailId);
    });
  };

  const handleDelete = (emailId: string) => {
    const current = emails.find((email) => email.id === emailId);
    if (!current) return;
    patchEmail(emailId, {
      trash: true,
      inbox: false,
      sent: false,
    });
    startTransition(async () => {
      await trashMessageAction(emailId);
      refreshFromServer();
    });
  };

  const handleCheckedChange = (emailId: string, checked: boolean) => {
    patchEmail(emailId, { checked });
  };

  const handleSend = (input: { toEmail: string; subject: string; body: string }) =>
    startTransition(async () => {
      const result = await sendAcademyMessageAction(input);
      if (result.ok) {
        showSuccess({ message: result.message });
        refreshFromServer();
      } else showError({ message: result.message });
    });

  const handlePickRecipient = (recipient: MessageRecipient) => {
    setComposeDraft({
      to: recipient.email,
      subject: `Spanglish — message for ${recipient.name}`,
      body: `Hi ${recipient.name},\n\n\n`,
    });
  };

  const handleReply = (email: Email) => {
    setComposeDraft({
      to: email.counterpartEmail,
      subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
      body: `\n\n---\nOn ${email.time.toLocaleString()}, ${email.from} wrote:\n${email.emailExcerpt}`,
    });
  };

  useEffect(() => {
    setEmails(initialEmails);
  }, [initialEmails]);

  const unreadInbox = emails.filter((email) => email.inbox && email.unread).length;

  return (
    <Box mt={3}>
      <Breadcrumb
        title="Academy email"
        subtitle={
          unreadInbox
            ? `${unreadInbox} unread in your inbox — messages also go to the recipient's real email when delivery is configured.`
            : "Send and read messages inside Spanglish only — each account's inbox in the app, not external Gmail."
        }
      />

      <Card elevation={9} sx={{ display: "flex", p: 0, overflow: "hidden" }}>
        <Drawer
          open={isLeftSidebarOpen}
          onClose={() => setLeftSidebarOpen(false)}
          variant={lgUp ? "permanent" : "temporary"}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            zIndex: lgUp ? 2 : 1,
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              position: lgUp ? "relative" : "fixed",
              borderColor: "divider",
            },
          }}
        >
          <EmailFilter
            active={filter}
            onFilterChange={setFilter}
            composeInitial={composeInitial}
            composeOpen={composeOpen}
            composeDraft={composeDraft}
            onSend={(input) => {
              handleSend(input);
              setComposeDraft(null);
            }}
            sendPending={pending}
          />
        </Drawer>

        <Box
          sx={{
            minWidth: secdrawerWidth,
            width: { xs: "100%", md: secdrawerWidth, lg: secdrawerWidth },
            flexShrink: 0,
          }}
        >
          <EmailSearch
            value={search}
            onChange={setSearch}
            onToggleSidebar={() => setLeftSidebarOpen(true)}
            onPickRecipient={handlePickRecipient}
          />

          {visibleEmails.length === 0 ? (
            <Box p={3}>
              <Typography variant="body2" color="text.secondary">
                No messages in this folder yet.
              </Typography>
            </Box>
          ) : (
            <EmailList
              emails={visibleEmails}
              activeId={activeId}
              onSelect={handleSelect}
              onCheckedChange={handleCheckedChange}
            />
          )}
        </Box>

        {mdUp ? (
          <Drawer
            anchor="right"
            variant="permanent"
            sx={{
              zIndex: 0,
              width: "200px",
              flex: "1 1 auto",
              "& .MuiDrawer-paper": { position: "relative", borderColor: "divider" },
            }}
          >
            <Box>
              <EmailContent
                email={activeEmail}
                onStar={handleStar}
                onImportant={handleImportant}
                onDelete={handleDelete}
                onReply={handleReply}
              />
            </Box>
          </Drawer>
        ) : (
          <Drawer
            anchor="right"
            open={isRightSidebarOpen}
            onClose={() => setRightSidebarOpen(false)}
            variant="temporary"
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              "& .MuiDrawer-paper": { width: "85%", borderColor: "divider" },
            }}
          >
            <Box p={3}>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={() => setRightSidebarOpen(false)}
                sx={{ mb: 3 }}
              >
                Back
              </Button>
              <EmailContent
                email={activeEmail}
                onStar={handleStar}
                onImportant={handleImportant}
                onDelete={handleDelete}
                onReply={handleReply}
              />
            </Box>
          </Drawer>
        )}
      </Card>
    </Box>
  );
}