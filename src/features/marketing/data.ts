import type { AcademyPlan } from "@/features/academy";

export type MarketingLandingSnapshot = {
  teacherCount: number;
  bookableTeacherCount: number;
  sessionsTotal: number;
  startingPricePerClass: number | null;
  /** Active packages from `pricing_packages`, same catalog as /pricing. */
  publishedPlans: AcademyPlan[];
};

/** Translator callback accepted by the pure marketing data builders. */
export type MarketingTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

/** Public-facing schedule label (teachers are based in Guatemala). */
export function getMarketingAcademyTimezoneLabel(t: MarketingTranslator) {
  return t("landing.timezoneLabel");
}

export function getMarketingAcademyTimezoneShort(t: MarketingTranslator) {
  return t("landing.timezoneShort");
}

/** Hero — live online class (Pexels, free license). */
export const marketingHeroImageSrc = "/images/landingpage/hero-student-online.jpg";

export function getMarketingHeroImageAlt(t: MarketingTranslator) {
  return t("landing.hero.imageAlt");
}

export type MarketingAcademyHour = {
  days: string;
  hours: string;
  closed: boolean;
};

/** Live booking window for public pages (local academy time). */
export function getMarketingAcademyHours(t: MarketingTranslator): MarketingAcademyHour[] {
  return [
    {
      days: t("landing.hours.monThu"),
      hours: t("landing.hours.monThuTime"),
      closed: false,
    },
    {
      days: t("landing.hours.friday"),
      hours: t("landing.hours.fridayTime"),
      closed: false,
    },
    {
      days: t("landing.hours.saturday"),
      hours: t("landing.hours.saturdayTime"),
      closed: false,
    },
    {
      days: t("landing.hours.sunday"),
      hours: t("landing.hours.closed"),
      closed: true,
    },
  ];
}

export function getMarketingHeaderNav(t: MarketingTranslator) {
  return [
    { label: t("header.programs"), href: "#programs" },
    { label: t("header.whySpanglish"), href: "#features" },
    { label: t("header.stories"), href: "#testimonials" },
    { label: t("header.pricing"), href: "/packages" },
  ];
}

export type MarketingTrack = {
  id: string;
  title: string;
  sessionLength: string;
  audience: string;
  summary: string;
};

export function getMarketingTracks(t: MarketingTranslator): MarketingTrack[] {
  return [
    {
      id: "spanish",
      title: t("landing.programs.tracks.spanish.title"),
      sessionLength: t("landing.programs.tracks.spanish.length"),
      audience: t("landing.programs.tracks.spanish.audience"),
      summary: t("landing.programs.tracks.spanish.summary"),
    },
    {
      id: "natives",
      title: t("landing.programs.tracks.natives.title"),
      sessionLength: t("landing.programs.tracks.natives.length"),
      audience: t("landing.programs.tracks.natives.audience"),
      summary: t("landing.programs.tracks.natives.summary"),
    },
    {
      id: "beginners",
      title: t("landing.programs.tracks.beginners.title"),
      sessionLength: t("landing.programs.tracks.beginners.length"),
      audience: t("landing.programs.tracks.beginners.audience"),
      summary: t("landing.programs.tracks.beginners.summary"),
    },
    {
      id: "conversation",
      title: t("landing.programs.tracks.conversation.title"),
      sessionLength: t("landing.programs.tracks.conversation.length"),
      audience: t("landing.programs.tracks.conversation.audience"),
      summary: t("landing.programs.tracks.conversation.summary"),
    },
    {
      id: "paired",
      title: t("landing.programs.tracks.paired.title"),
      sessionLength: t("landing.programs.tracks.paired.length"),
      audience: t("landing.programs.tracks.paired.audience"),
      summary: t("landing.programs.tracks.paired.summary"),
    },
    {
      id: "teachers",
      title: t("landing.programs.tracks.teachers.title"),
      sessionLength: t("landing.programs.tracks.teachers.length"),
      audience: t("landing.programs.tracks.teachers.audience"),
      summary: t("landing.programs.tracks.teachers.summary"),
    },
  ];
}

export type MarketingTestimonial = {
  quote: string;
  name: string;
  role: string;
};

export function getMarketingTestimonials(t: MarketingTranslator): MarketingTestimonial[] {
  return [
    {
      quote: t("landing.testimonials.items.alex"),
      name: "Alex R.",
      role: t("landing.testimonials.roleLearner"),
    },
    {
      quote: t("landing.testimonials.items.priya"),
      name: "Priya S.",
      role: t("landing.testimonials.roleLearner"),
    },
    {
      quote: t("landing.testimonials.items.maria"),
      name: "María G.",
      role: t("landing.testimonials.roleTeacher"),
    },
  ];
}

export function getMarketingFooterExplore(t: MarketingTranslator) {
  return [
    { label: t("footer.explore.programs"), href: "#programs" },
    { label: t("footer.explore.whySpanglish"), href: "#features" },
    { label: t("footer.explore.learnerStories"), href: "#testimonials" },
    { label: t("footer.explore.pricing"), href: "/packages" },
  ];
}

export function getMarketingFooterAcademy(t: MarketingTranslator) {
  return [
    { label: t("footer.academy.createAccount"), href: "/register" },
    { label: t("footer.academy.signIn"), href: "/login" },
    { label: t("footer.academy.teacherApplication"), href: "/login?next=%2Fapply" },
    { label: t("footer.academy.bookAClass"), href: "/login?next=%2Fschedule" },
  ];
}

export type MarketingPillar = {
  title: string;
  description: string;
};

export function getMarketingPillars(t: MarketingTranslator): MarketingPillar[] {
  return [
    {
      title: t("landing.features.pillars.spanishOnly.title"),
      description: t("landing.features.pillars.spanishOnly.description"),
    },
    {
      title: t("landing.features.pillars.nativeTeachers.title"),
      description: t("landing.features.pillars.nativeTeachers.description"),
    },
    {
      title: t("landing.features.pillars.individualOrPaired.title"),
      description: t("landing.features.pillars.individualOrPaired.description"),
    },
    {
      title: t("landing.features.pillars.flexibleScheduling.title"),
      description: t("landing.features.pillars.flexibleScheduling.description"),
    },
    {
      title: t("landing.features.pillars.recordings.title"),
      description: t("landing.features.pillars.recordings.description"),
    },
    {
      title: t("landing.features.pillars.secure.title"),
      description: t("landing.features.pillars.secure.description"),
    },
  ];
}
