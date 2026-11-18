"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

/** Keeps the document language in sync with the active next-intl locale. */
export function HtmlLangSync() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
