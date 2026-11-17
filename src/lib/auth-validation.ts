export const authDemo = {
  code: "123456",
  minPasswordLength: 8,
  sessionDays: 7,
} as const;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function getEmailError(value: string) {
  if (!value.trim()) return "Enter your email address.";
  if (!isValidEmail(value)) return "Enter a valid email address.";
  return null;
}

export function getPasswordError(value: string) {
  if (!value) return "Enter your password.";
  if (value.length < authDemo.minPasswordLength) {
    return `Use at least ${authDemo.minPasswordLength} characters.`;
  }
  return null;
}

export function getCodeError(value: string) {
  if (!value.trim()) return "Enter the six-digit code.";
  if (!/^\d{6}$/.test(value.trim())) return "The code must be six digits.";
  return null;
}

export function getNameError(value: string) {
  if (!value.trim()) return "Enter your full name.";
  if (value.trim().length < 2) return "Use at least two characters.";
  return null;
}

/*
 * Code-returning variants for translated forms. Each returns a key under
 * `validation.*` in src/i18n/messages, or null when the value is valid.
 */

export function emailErrorCode(value: string) {
  if (!value.trim()) return "EMAIL_REQUIRED";
  if (!isValidEmail(value)) return "EMAIL_INVALID";
  return null;
}

export function passwordErrorCode(value: string) {
  if (!value) return "PASSWORD_REQUIRED";
  if (value.length < authDemo.minPasswordLength) return "PASSWORD_TOO_SHORT";
  return null;
}

export function codeErrorCode(value: string) {
  if (!value.trim()) return "CODE_REQUIRED";
  if (!/^\d{6}$/.test(value.trim())) return "CODE_INVALID";
  return null;
}

export function nameErrorCode(value: string) {
  if (!value.trim()) return "NAME_REQUIRED";
  if (value.trim().length < 2) return "NAME_TOO_SHORT";
  return null;
}
