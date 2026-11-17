import { inArray } from "drizzle-orm";
import { resolveTimeZone } from "@/lib/timezone";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { toEmailLocale, type EmailLocale } from "@/server/email/templates";
import { insertPlatformMessage } from "@/server/messages/mailbox";
import { getAcademySystemSenderUserId } from "@/server/messages/system-sender";

/*
 * Class notices → Spanglish inbox only. Login verification codes use SMTP/Postmark.
 */

export type ClassNoticeType =
  | "booked"
  | "canceled"
  | "rescheduled"
  | "reschedule-requested"
  | "reschedule-accepted"
  | "reschedule-declined";

type NoticeInput = {
  type: ClassNoticeType;
  recipientIds: string[];
  actorName: string;
  topic: string;
  startsAt: Date;
  /** For reschedules: the proposed or new time. */
  newStartsAt?: Date;
  durationMinutes: number;
  classId: string;
  reason?: string;
};

const copy: Record<
  EmailLocale,
  Record<ClassNoticeType, { subject: string; body: (input: NoticeInput, when: string, next: string) => string }>
> = {
  en: {
    booked: {
      subject: "New Spanglish class booked",
      body: (input, when) =>
        `${input.actorName} booked "${input.topic}" (${input.durationMinutes} min) on ${when}.`,
    },
    canceled: {
      subject: "A Spanglish class was canceled",
      body: (input, when) =>
        `${input.actorName} canceled "${input.topic}" on ${when}.${input.reason ? `\nReason: ${input.reason}` : ""}`,
    },
    rescheduled: {
      subject: "A Spanglish class was moved",
      body: (input, when, next) =>
        `${input.actorName} moved "${input.topic}" from ${when} to ${next}.`,
    },
    "reschedule-requested": {
      subject: "Your partner wants to move a paired class",
      body: (input, when, next) =>
        `${input.actorName} proposed moving "${input.topic}" from ${when} to ${next}. Accept or decline it on the class page within 24 hours; if you do nothing, the class keeps its current time.`,
    },
    "reschedule-accepted": {
      subject: "Paired class moved",
      body: (input, when, next) =>
        `${input.actorName} accepted moving "${input.topic}" from ${when} to ${next}.`,
    },
    "reschedule-declined": {
      subject: "Paired class keeps its time",
      body: (input, when) =>
        `${input.actorName} declined the new time for "${input.topic}". It stays on ${when}.`,
    },
  },
  es: {
    booked: {
      subject: "Nueva clase de Spanglish reservada",
      body: (input, when) =>
        `${input.actorName} reservó "${input.topic}" (${input.durationMinutes} min) el ${when}.`,
    },
    canceled: {
      subject: "Se canceló una clase de Spanglish",
      body: (input, when) =>
        `${input.actorName} canceló "${input.topic}" del ${when}.${input.reason ? `\nMotivo: ${input.reason}` : ""}`,
    },
    rescheduled: {
      subject: "Se movió una clase de Spanglish",
      body: (input, when, next) =>
        `${input.actorName} movió "${input.topic}" del ${when} al ${next}.`,
    },
    "reschedule-requested": {
      subject: "Tu pareja quiere mover una clase en pareja",
      body: (input, when, next) =>
        `${input.actorName} propone mover "${input.topic}" del ${when} al ${next}. Acéptalo o recházalo en la página de la clase dentro de 24 horas; si no respondes, la clase mantiene su horario.`,
    },
    "reschedule-accepted": {
      subject: "Clase en pareja movida",
      body: (input, when, next) =>
        `${input.actorName} aceptó mover "${input.topic}" del ${when} al ${next}.`,
    },
    "reschedule-declined": {
      subject: "La clase en pareja mantiene su horario",
      body: (input, when) =>
        `${input.actorName} rechazó el nuevo horario de "${input.topic}". Sigue el ${when}.`,
    },
  },
};

function formatWhen(date: Date, locale: EmailLocale, timeZone: string) {
  return new Intl.DateTimeFormat(locale === "es" ? "es" : "en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

async function deliver(input: NoticeInput) {
  const ids = [...new Set(input.recipientIds)];
  if (!ids.length) return;

  const senderUserId = await getAcademySystemSenderUserId();
  if (!senderUserId) {
    console.error("[class] no admin user to send platform notices");
    return;
  }

  const recipients = await db
    .select({
      id: users.id,
      locale: users.locale,
      timezone: users.timezone,
    })
    .from(users)
    .where(inArray(users.id, ids));

  for (const recipient of recipients) {
    const locale = toEmailLocale(recipient.locale);
    const timeZone = resolveTimeZone(recipient.timezone);
    const template = copy[locale][input.type];
    const when = formatWhen(input.startsAt, locale, timeZone);
    const next = input.newStartsAt ? formatWhen(input.newStartsAt, locale, timeZone) : "";
    const link = `/classes/${input.classId}`;
    const body = `${template.body(input, when, next)}\n\n${locale === "es" ? "Ver la clase" : "View the class"}: ${link}`;

    await insertPlatformMessage({
      senderUserId,
      recipientUserId: recipient.id,
      subject: template.subject,
      body,
    });

    if (process.env.NODE_ENV !== "production") {
      console.info(`[class] ${input.type} platform notice for user ${recipient.id}`);
    }
  }
}

/** Sends after the response when possible; errors are logged, never thrown. */
export function sendClassNotice(input: NoticeInput) {
  const task = deliver(input).catch((error) => {
    console.error("[class] notice failed", error);
  });
  void import("next/server")
    .then(({ after }) => after(() => task))
    .catch(() => undefined);
}