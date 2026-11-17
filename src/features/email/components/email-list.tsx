"use client";

import List from "@mui/material/List";
import { Scrollbar } from "@/components/custom-scroll/scrollbar";
import { EmailListItem } from "@/features/email/components/email-list-item";
import type { Email } from "@/features/email/types";

type EmailListProps = {
  emails: Email[];
  activeId: string | null;
  onSelect: (emailId: string) => void;
  onCheckedChange: (emailId: string, checked: boolean) => void;
};

export function EmailList({ emails, activeId, onSelect, onCheckedChange }: EmailListProps) {
  return (
    <List>
      <Scrollbar
        sx={{
          height: { lg: "calc(100vh - 100px)", md: "100vh" },
          maxHeight: "800px",
        }}
      >
        {emails.map((email) => (
          <EmailListItem
            key={email.id}
            email={email}
            isSelected={email.id === activeId}
            onSelect={() => onSelect(email.id)}
            onCheckedChange={(checked) => onCheckedChange(email.id, checked)}
          />
        ))}
      </Scrollbar>
    </List>
  );
}
