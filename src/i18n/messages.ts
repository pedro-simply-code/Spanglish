import type { AppLocale } from "@/i18n/config";
import baseEn from "@/i18n/messages/en.json";
import baseEs from "@/i18n/messages/es.json";
import shellEn from "@/i18n/messages/shell.en.json";
import shellEs from "@/i18n/messages/shell.es.json";
import studentEn from "@/i18n/messages/student.en.json";
import studentEs from "@/i18n/messages/student.es.json";
import educatorEn from "@/i18n/messages/educator.en.json";
import educatorEs from "@/i18n/messages/educator.es.json";
import adminEn from "@/i18n/messages/admin.en.json";
import adminEs from "@/i18n/messages/admin.es.json";
import classroomEn from "@/i18n/messages/classroom.en.json";
import classroomEs from "@/i18n/messages/classroom.es.json";
import marketingEn from "@/i18n/messages/marketing.en.json";
import marketingEs from "@/i18n/messages/marketing.es.json";
import appsEn from "@/i18n/messages/apps.en.json";
import appsEs from "@/i18n/messages/apps.es.json";
import opsEn from "@/i18n/messages/ops.en.json";
import opsEs from "@/i18n/messages/ops.es.json";

const en = {
  ...baseEn,
  ...shellEn,
  ...studentEn,
  ...educatorEn,
  ...adminEn,
  ...classroomEn,
  ...marketingEn,
  ...appsEn,
  ...opsEn,
};

const es = {
  ...baseEs,
  ...shellEs,
  ...studentEs,
  ...educatorEs,
  ...adminEs,
  ...classroomEs,
  ...marketingEs,
  ...appsEs,
  ...opsEs,
};

export type Messages = typeof en;

const catalogs: Record<AppLocale, Messages> = { en, es };

export function getMessages(locale: AppLocale): Messages {
  return catalogs[locale];
}
