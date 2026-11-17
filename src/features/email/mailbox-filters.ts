import type { Email, EmailFilterId } from "@/features/email/types";

export function filterMailboxEmails(
  emails: Email[],
  filter: EmailFilterId,
  search: string,
): Email[] {
  const term = search.trim().toLowerCase();
  const matches = (email: Email) =>
    !term ||
    email.subject.toLowerCase().includes(term) ||
    email.from.toLowerCase().includes(term) ||
    email.counterpartEmail.toLowerCase().includes(term) ||
    email.emailExcerpt.toLowerCase().includes(term);

  return emails.filter((email) => {
    if (!matches(email)) return false;
    switch (filter) {
      case "inbox":
        return email.inbox;
      case "sent":
        return email.sent;
      case "trash":
        return email.trash;
      case "starred":
        return email.starred && email.inbox;
      case "important":
        return email.important && email.inbox;
      default:
        return email.inbox;
    }
  });
}