import type { ProfileLocale } from "@/server/db/schema";

/**
 * Email copy in English and Spanish. Kept in code (not the UI catalogs) so
 * emails can be rendered anywhere on the server without a request context.
 */

export type EmailLocale = ProfileLocale;

export type AuthCodeEmailType =
  | "sign-in"
  | "email-verification"
  | "forget-password"
  | "change-email";

export type SecurityNoticeType =
  | "new-sign-in"
  | "password-changed"
  | "password-reset"
  | "password-created"
  | "two-factor-enabled"
  | "two-factor-disabled"
  | "existing-account"
  | "admin-granted";

type Template = { subject: string; body: string };

const codeTemplates: Record<EmailLocale, Record<AuthCodeEmailType, Template>> = {
  en: {
    "sign-in": {
      subject: "Your Spanglish sign-in code",
      body: "Use this code to sign in to Spanglish:",
    },
    "email-verification": {
      subject: "Verify your Spanglish email",
      body: "Use this code to verify your email and activate your account:",
    },
    "forget-password": {
      subject: "Reset your Spanglish password",
      body: "Use this code to choose a new password:",
    },
    "change-email": {
      subject: "Confirm your new Spanglish email",
      body: "Use this code to confirm your new email address:",
    },
  },
  es: {
    "sign-in": {
      subject: "Tu código para entrar a Spanglish",
      body: "Usa este código para iniciar sesión en Spanglish:",
    },
    "email-verification": {
      subject: "Verifica tu correo de Spanglish",
      body: "Usa este código para verificar tu correo y activar tu cuenta:",
    },
    "forget-password": {
      subject: "Restablece tu contraseña de Spanglish",
      body: "Usa este código para elegir una contraseña nueva:",
    },
    "change-email": {
      subject: "Confirma tu nuevo correo de Spanglish",
      body: "Usa este código para confirmar tu nueva dirección de correo:",
    },
  },
};

export function renderAuthCodeEmail(input: {
  locale: EmailLocale;
  type: AuthCodeEmailType;
  code: string;
  minutes: number;
}) {
  const template = codeTemplates[input.locale][input.type];
  const footer =
    input.locale === "es"
      ? `El código vence en ${input.minutes} minutos. Si no lo pediste, puedes ignorar este correo.`
      : `The code expires in ${input.minutes} minutes. If you did not request it, you can ignore this email.`;

  return {
    subject: template.subject,
    text: `${template.body}\n\n${input.code}\n\n${footer}`,
  };
}

const notices: Record<EmailLocale, Record<SecurityNoticeType, Template>> = {
  en: {
    "new-sign-in": {
      subject: "New sign-in to your Spanglish account",
      body: "Your account was just used to sign in from a device we have not seen before:",
    },
    "password-changed": {
      subject: "Your Spanglish password was changed",
      body: "The password of your account was just changed.",
    },
    "password-reset": {
      subject: "Your Spanglish password was reset",
      body: "The password of your account was reset with an email code. Your other devices were signed out.",
    },
    "password-created": {
      subject: "A password was added to your Spanglish account",
      body: "A password was added to your account. You can now also sign in with email and password.",
    },
    "two-factor-enabled": {
      subject: "Two-factor authentication is on",
      body: "Two-factor authentication was turned on for your account.",
    },
    "two-factor-disabled": {
      subject: "Two-factor authentication was turned off",
      body: "Two-factor authentication was turned off for your account.",
    },
    "existing-account": {
      subject: "You already have a Spanglish account",
      body: "Someone (probably you) tried to create a Spanglish account with this email, but one already exists. Sign in with your password, an email code, or Google. If you forgot your password, use \"Forgot password?\" on the sign-in page.",
    },
    "admin-granted": {
      subject: "Your Spanglish account is now the admin",
      body: "Your account now holds the admin role: full access to the academy, including roles and platform settings. Protect it with two-factor authentication in Settings → Security.",
    },
  },
  es: {
    "new-sign-in": {
      subject: "Nuevo inicio de sesión en tu cuenta de Spanglish",
      body: "Tu cuenta acaba de iniciar sesión desde un dispositivo que no habíamos visto:",
    },
    "password-changed": {
      subject: "Se cambió tu contraseña de Spanglish",
      body: "La contraseña de tu cuenta acaba de cambiar.",
    },
    "password-reset": {
      subject: "Se restableció tu contraseña de Spanglish",
      body: "La contraseña de tu cuenta se restableció con un código por correo. Se cerró la sesión en tus otros dispositivos.",
    },
    "password-created": {
      subject: "Se agregó una contraseña a tu cuenta de Spanglish",
      body: "Se agregó una contraseña a tu cuenta. Ahora también puedes entrar con correo y contraseña.",
    },
    "two-factor-enabled": {
      subject: "La verificación en dos pasos está activa",
      body: "Se activó la verificación en dos pasos en tu cuenta.",
    },
    "two-factor-disabled": {
      subject: "Se desactivó la verificación en dos pasos",
      body: "Se desactivó la verificación en dos pasos en tu cuenta.",
    },
    "existing-account": {
      subject: "Ya tienes una cuenta de Spanglish",
      body: "Alguien (probablemente tú) intentó crear una cuenta de Spanglish con este correo, pero ya existe una. Entra con tu contraseña, un código por correo o Google. Si olvidaste tu contraseña, usa \"¿Olvidaste tu contraseña?\" en la página de inicio de sesión.",
    },
    "admin-granted": {
      subject: "Tu cuenta de Spanglish ahora es la administradora",
      body: "Tu cuenta ahora tiene el rol de administrador: acceso total a la academia, incluidos los roles y la configuración de la plataforma. Protégela con la verificación en dos pasos en Configuración → Seguridad.",
    },
  },
};

export function renderSecurityNotice(input: {
  locale: EmailLocale;
  type: SecurityNoticeType;
  /** Device and time lines, e.g. for a new sign-in. */
  details?: string[];
}) {
  const template = notices[input.locale][input.type];
  const footer =
    input.type === "existing-account"
      ? input.locale === "es"
        ? "Si no fuiste tú, puedes ignorar este correo."
        : "If this was not you, you can ignore this email."
      : input.locale === "es"
        ? "Si no fuiste tú, cambia tu contraseña y revisa tus dispositivos en Configuración → Seguridad."
        : "If this was not you, change your password and review your devices in Settings → Security.";

  const details = input.details?.length ? `\n\n${input.details.join("\n")}` : "";

  return {
    subject: template.subject,
    text: `${template.body}${details}\n\n${footer}`,
  };
}

export function toEmailLocale(value: string | null | undefined): EmailLocale {
  return value === "es" ? "es" : "en";
}
