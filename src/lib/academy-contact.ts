/** Deep-link into the in-browser email compose UI (`/apps/email`). */

export type AcademyContactInput = {
  to: string;
  recipientName: string;
  fromName?: string;
  /** Short reason shown in the subject line. */
  topic?: string;
};

export function buildAcademyComposeUrl(input: AcademyContactInput): string {
  const subject = input.topic
    ? `Spanglish — ${input.topic}`
    : `Spanglish — message for ${input.recipientName}`;
  const signature = input.fromName ?? "Spanglish Academy";
  const body = `Hi ${input.recipientName},\n\n\n— ${signature}\n`;
  const params = new URLSearchParams({
    compose: "1",
    to: input.to,
    subject,
    body,
  });
  return `/apps/email?${params.toString()}`;
}