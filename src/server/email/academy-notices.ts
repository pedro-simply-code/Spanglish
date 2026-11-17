import { inArray, sql } from "drizzle-orm";
import { env } from "@/env";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { sendTransactionalEmail } from "@/server/email/send-transactional";
import { toEmailLocale, type EmailLocale } from "@/server/email/templates";
import { insertPlatformMessage } from "@/server/messages/mailbox";
import { getAcademySystemSenderUserId } from "@/server/messages/system-sender";

/*
 * Academy operation notices → Spanglish inbox (/apps/email).
 * Payout notices are dual: platform inbox + external SMTP/Postmark.
 * Login OTP codes use SMTP/Postmark only (no platform duplicate).
 */

export type AcademyNoticeType =
  | "application-received"
  | "application-approved"
  | "application-rejected"
  | "material-approved"
  | "material-rejected"
  | "payout-ready"
  | "payout-requested"
  | "payout-request-submitted"
  | "payout-approved"
  | "payout-paid";

type Vars = {
  name?: string;
  title?: string;
  note?: string;
  amount?: string;
  period?: string;
  /** Human phrase, e.g. "5 business days". */
  processingDays?: string;
};

const copy: Record<EmailLocale, Record<AcademyNoticeType, { subject: string; body: (v: Vars) => string; link: string }>> = {
  en: {
    "application-received": {
      subject: "New teacher application",
      body: (v) => `${v.name} applied to teach at Spanglish. Review the application.`,
      link: "/manager/applications",
    },
    "application-approved": {
      subject: "Welcome to the Spanglish teaching team",
      body: () =>
        "Your application was approved. Your account is now a teacher account: set your weekly availability so students can book you, and turn on two-step verification in Settings → Security.",
      link: "/teacher/availability",
    },
    "application-rejected": {
      subject: "About your Spanglish teacher application",
      body: (v) => `Thank you for applying. We cannot offer you a teaching place right now.${v.note ? `\n\n${v.note}` : ""}`,
      link: "/apply",
    },
    "material-approved": {
      subject: "Your material is now in the academy library",
      body: (v) => `"${v.title}" was approved and every student can now see it.`,
      link: "/teacher/materials",
    },
    "material-rejected": {
      subject: "Your material was not published",
      body: (v) => `"${v.title}" was not approved for the academy library.${v.note ? `\n\nReason: ${v.note}` : ""}`,
      link: "/teacher/materials",
    },
    "payout-ready": {
      subject: "A teacher payout needs your approval",
      body: (v) => `A payout of ${v.amount} for ${v.period} is waiting for approval.`,
      link: "/admin/finance/payouts",
    },
    "payout-requested": {
      subject: "A teacher requested a payout",
      body: (v) =>
        `${v.name ?? "A teacher"} requested an individual payout of ${v.amount}. Review and send it when ready. After payment, their bank may take up to ${v.processingDays ?? "a few business days"}.`,
      link: "/admin/finance/payouts",
    },
    "payout-request-submitted": {
      subject: "We received your payout request",
      body: (v) =>
        `You requested ${v.amount}. We will review it first, then send the payment. Once sent, funds usually reach your bank within ${v.processingDays ?? "a few business days"} (times vary by bank and Stripe).`,
      link: "/teacher/earnings",
    },
    "payout-approved": {
      subject: "Your payout was approved",
      body: (v) =>
        `Your payout of ${v.amount} for ${v.period} was approved. The academy will send it soon; after it is sent, funds usually arrive within ${v.processingDays ?? "a few business days"}.`,
      link: "/teacher/earnings",
    },
    "payout-paid": {
      subject: "Your Spanglish payout was sent",
      body: (v) =>
        `We sent ${v.amount} for ${v.period}. It may take up to ${v.processingDays ?? "a few business days"} to show up in your Stripe account and bank.`,
      link: "/teacher/earnings",
    },
  },
  es: {
    "application-received": {
      subject: "Nueva solicitud de maestro",
      body: (v) => `${v.name} quiere enseñar en Spanglish. Revisa la solicitud.`,
      link: "/manager/applications",
    },
    "application-approved": {
      subject: "Bienvenido al equipo de maestros de Spanglish",
      body: () =>
        "Tu solicitud fue aprobada. Tu cuenta ahora es de maestro: define tu disponibilidad semanal para que los estudiantes puedan reservar, y activa la verificación en dos pasos en Configuración → Seguridad.",
      link: "/teacher/availability",
    },
    "application-rejected": {
      subject: "Sobre tu solicitud para enseñar en Spanglish",
      body: (v) => `Gracias por postularte. Por ahora no podemos ofrecerte un lugar como maestro.${v.note ? `\n\n${v.note}` : ""}`,
      link: "/apply",
    },
    "material-approved": {
      subject: "Tu material ya está en la biblioteca de la academia",
      body: (v) => `"${v.title}" fue aprobado y ahora todos los estudiantes pueden verlo.`,
      link: "/teacher/materials",
    },
    "material-rejected": {
      subject: "Tu material no fue publicado",
      body: (v) => `"${v.title}" no fue aprobado para la biblioteca de la academia.${v.note ? `\n\nMotivo: ${v.note}` : ""}`,
      link: "/teacher/materials",
    },
    "payout-ready": {
      subject: "Un pago a maestros espera tu aprobación",
      body: (v) => `Un pago de ${v.amount} por ${v.period} espera tu aprobación.`,
      link: "/admin/finance/payouts",
    },
    "payout-requested": {
      subject: "Un maestro solicitó un pago",
      body: (v) =>
        `${v.name ?? "Un maestro"} solicitó un pago individual de ${v.amount}. Revísalo y envíalo cuando puedas. Después del pago, su banco puede tardar hasta ${v.processingDays ?? "varios días hábiles"}.`,
      link: "/manager/payouts",
    },
    "payout-request-submitted": {
      subject: "Recibimos tu solicitud de pago",
      body: (v) =>
        `Solicitaste ${v.amount}. La revisaremos y luego enviaremos el pago. Una vez enviado, el dinero suele llegar en ${v.processingDays ?? "varios días hábiles"} (depende del banco y Stripe).`,
      link: "/teacher/earnings",
    },
    "payout-approved": {
      subject: "Tu pago fue aprobado",
      body: (v) =>
        `Tu pago de ${v.amount} por ${v.period} fue aprobado. La academia lo enviará pronto; después del envío suele tardar ${v.processingDays ?? "varios días hábiles"} en llegar.`,
      link: "/teacher/earnings",
    },
    "payout-paid": {
      subject: "Enviamos tu pago de Spanglish",
      body: (v) =>
        `Enviamos ${v.amount} por ${v.period}. Puede tardar hasta ${v.processingDays ?? "varios días hábiles"} en verse en Stripe y en tu banco.`,
      link: "/teacher/earnings",
    },
  },
};

/** Payout notices also go to the recipient's real email (SMTP/Postmark). */
const PAYOUT_DUAL_DELIVERY = new Set<AcademyNoticeType>([
  "payout-request-submitted",
  "payout-requested",
  "payout-ready",
  "payout-approved",
  "payout-paid",
]);

type RecipientRow = {
  id: string;
  locale: string | null;
  email: string;
  bounced: Date | null;
};

async function deliver(type: AcademyNoticeType, recipients: RecipientRow[], vars: Vars) {
  const senderUserId = await getAcademySystemSenderUserId();
  if (!senderUserId) {
    console.error("[academy] no admin user to send platform notices");
    return;
  }

  const appBase = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

  for (const recipient of recipients) {
    const template = copy[toEmailLocale(recipient.locale)][type];
    const body = `${template.body(vars)}\n\nOpen in Spanglish → Email, or go to: ${template.link}`;
    await insertPlatformMessage({
      senderUserId,
      recipientUserId: recipient.id,
      subject: template.subject,
      body,
    });

    if (PAYOUT_DUAL_DELIVERY.has(type) && !recipient.bounced) {
      const externalText = `${template.body(vars)}\n\n${appBase}${template.link}\n\nA copy is in your Spanglish inbox (Email in the app).`;
      const result = await sendTransactionalEmail({
        to: recipient.email,
        subject: template.subject,
        text: externalText,
      });
      if (!result.delivered && process.env.NODE_ENV !== "production") {
        console.info(`[academy] ${type} external notice for ${recipient.email}: ${result.devMessage ?? "ok"}`);
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.info(`[academy] ${type} platform notice for user ${recipient.id}`);
    }
  }
}

function runLater(task: Promise<unknown>) {
  const guarded = task.catch((error) => console.error("[academy] notice failed", error));
  void import("next/server")
    .then(({ after }) => after(() => guarded))
    .catch(() => undefined);
}

const recipientColumns = {
  id: users.id,
  locale: users.locale,
  email: users.email,
  bounced: users.emailBouncedAt,
};

export function notifyUsers(type: AcademyNoticeType, userIds: string[], vars: Vars = {}) {
  if (!userIds.length) return;
  runLater(
    db
      .select(recipientColumns)
      .from(users)
      .where(inArray(users.id, userIds))
      .then((rows) => deliver(type, rows, vars)),
  );
}

/** Everyone holding a role (e.g. all managers, or the admin). */
export function notifyRole(type: AcademyNoticeType, role: "manager" | "admin", vars: Vars = {}) {
  runLater(
    db
      .select(recipientColumns)
      .from(users)
      .where(sql`${role} = ANY(${users.roles})`)
      .then((rows) => deliver(type, rows, vars)),
  );
}