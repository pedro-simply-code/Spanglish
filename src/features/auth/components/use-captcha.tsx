"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { env } from "@/env";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      appearance?: "always" | "execute" | "interaction-only";
      size?: "normal" | "flexible" | "compact";
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<void> | null = null;

function loadTurnstile() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function TurnstileBox({
  siteKey,
  onToken,
  onWidget,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
  onWidget: (widgetId: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let widgetId: string | null = null;

    void loadTurnstile().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        size: "flexible",
        appearance: "interaction-only",
        callback: (value) => onToken(value),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
      });
      onWidget(widgetId);
    });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      onWidget(null);
    };
  }, [siteKey, onToken, onWidget]);

  return <div ref={containerRef} className="flex min-h-0 justify-center" />;
}

/**
 * Cloudflare Turnstile for sign-up, email codes and password reset. Disabled
 * (no widget, no header) when NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set.
 *
 * Render `captchaWidget` next to the submit button, pass `captchaHeaders()`
 * as `fetchOptions.headers` on the Better Auth call, then `resetCaptcha()`:
 * each token works once.
 */
export function useCaptcha() {
  const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const onWidget = useCallback((widgetId: string | null) => {
    widgetIdRef.current = widgetId;
  }, []);

  const captchaHeaders = useCallback((): Record<string, string> => {
    if (!siteKey) return {};
    return token ? { "x-captcha-response": token } : {};
  }, [siteKey, token]);

  const resetCaptcha = useCallback(() => {
    setToken(null);
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  const captchaWidget = siteKey ? (
    <TurnstileBox siteKey={siteKey} onToken={setToken} onWidget={onWidget} />
  ) : null;

  return {
    captchaEnabled: Boolean(siteKey),
    captchaReady: !siteKey || Boolean(token),
    captchaHeaders,
    resetCaptcha,
    captchaWidget,
  };
}
