import type { Metadata } from "next";
import adminEn from "@/i18n/messages/admin.en.json";
import educatorEn from "@/i18n/messages/educator.en.json";

type AdminMetaPage = keyof typeof adminEn.admin.meta;
type EducatorMetaPage = keyof typeof educatorEn.educator.metadata;

/**
 * Dashboard tab titles without request-time i18n so Cache Components can
 * prerender route shells (see admin/platform/security and similar pages).
 */
export function adminStaticMetadata(page: AdminMetaPage): Metadata {
  const { title, description } = adminEn.admin.meta[page];
  return { title, description };
}

export function educatorStaticMetadata(page: EducatorMetaPage): Metadata {
  const { title, description } = educatorEn.educator.metadata[page];
  return { title, description };
}