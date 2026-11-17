export function friendlyMediaError(cause: unknown) {
  if (!(cause instanceof Error)) {
    return "Could not access camera or microphone.";
  }

  const dom = cause as DOMException;
  const text = cause.message.toLowerCase();

  if (
    dom.name === "NotFoundError" ||
    text.includes("requested device not found") ||
    text.includes("device not found")
  ) {
    return "No camera or microphone was found. Connect a device, close other apps using it, or allow access under Windows Settings → Privacy → Camera / Microphone.";
  }

  if (dom.name === "NotAllowedError" || text.includes("permission")) {
    return "Camera or microphone permission was denied. Allow access in the browser prompt or system settings.";
  }

  if (dom.name === "NotReadableError" || text.includes("in use")) {
    return "The camera or microphone is in use by another application.";
  }

  return cause.message;
}