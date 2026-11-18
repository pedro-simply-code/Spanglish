/**
 * Translate a browser media error into a message that is safe to show to the user.
 * The translator is injected so this helper stays usable from client hooks.
 */
export function friendlyMediaError(cause: unknown, t: (key: string) => string) {
  // Browsers only expose the camera and microphone on https:// or localhost.
  if (typeof window !== "undefined" && (!window.isSecureContext || !navigator.mediaDevices)) {
    return t("errors.mediaInsecure");
  }

  if (!(cause instanceof Error)) {
    return t("errors.mediaGeneric");
  }

  const dom = cause as DOMException;
  const text = cause.message.toLowerCase();

  if (
    dom.name === "NotFoundError" ||
    text.includes("requested device not found") ||
    text.includes("device not found")
  ) {
    return t("errors.mediaNotFound");
  }

  // Blocked by the page's Permissions-Policy (the browser never asked).
  if (text.includes("permissions policy") || text.includes("not allowed in this document")) {
    return t("errors.mediaPolicy");
  }

  if (dom.name === "NotAllowedError" || text.includes("permission")) {
    return t("errors.mediaDenied");
  }

  if (dom.name === "NotReadableError" || text.includes("in use")) {
    return t("errors.mediaInUse");
  }

  return cause.message;
}
