export type EmailLabel = "Academy" | "Promotional" | "Social" | "Health";

export type EmailAttachment = {
  id: string;
  image: string;
  title: string;
  fileSize: string;
};

export type Email = {
  id: string;
  from: string;
  thumbnail: string;
  subject: string;
  time: Date;
  To: string;
  emailExcerpt: string;
  emailContent: string;
  unread: boolean;
  attachment: boolean;
  starred: boolean;
  important: boolean;
  inbox: boolean;
  sent: boolean;
  draft: boolean;
  spam: boolean;
  trash: boolean;
  label: EmailLabel;
  attachments: EmailAttachment[];
  checked: boolean;
  mailbox: "inbox" | "sent";
  counterpartEmail: string;
  counterpartName: string;
};

export type EmailFilterId =
  | "inbox"
  | "sent"
  | "trash"
  | "starred"
  | "important"
  | "draft"
  | "spam"
  | EmailLabel;