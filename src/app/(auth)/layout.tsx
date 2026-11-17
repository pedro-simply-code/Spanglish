import type { ReactNode } from "react";
import { Suspense } from "react";
import { AuthShellFallback } from "@/components/layout/auth-shell-fallback";
import { LocaleProvider } from "@/i18n/locale-provider";

/**
 * Auth screens are translated from the language cookie or the browser, so
 * they render behind Suspense (they read the request).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Suspense fallback={<AuthShellFallback />}>
        <LocaleProvider>{children}</LocaleProvider>
      </Suspense>
    </div>
  );
}
