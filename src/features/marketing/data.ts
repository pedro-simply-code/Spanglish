import type { AcademyPlan } from "@/features/academy";

export type MarketingLandingSnapshot = {
  teacherCount: number;
  bookableTeacherCount: number;
  sessionsTotal: number;
  startingPricePerClass: number | null;
  /** Active packages from `pricing_packages`, same catalog as /pricing. */
  publishedPlans: AcademyPlan[];
};

/** Public-facing schedule label (teachers are based in Guatemala). */
export const marketingAcademyTimezoneLabel = "Guatemala (CST, UTC−6)";

export const marketingAcademyTimezoneShort = "Guatemala · CST (UTC−6)";

/** Hero — live online class (Pexels, free license). */
export const marketingHeroImageSrc = "/images/landingpage/hero-student-online.jpg";
export const marketingHeroImageAlt =
  "Student taking notes during a live online language class";

/** Live booking window for public pages (local academy time). */
export const marketingAcademyHours = [
  { days: "Monday – Thursday", hours: "6:00 AM – 10:00 PM" },
  { days: "Friday", hours: "6:00 AM – 8:00 PM" },
  { days: "Saturday", hours: "8:00 AM – 12:00 PM" },
  { days: "Sunday", hours: "Closed" },
] as const;

export type MarketingTrack = {
  id: string;
  title: string;
  sessionLength: string;
  audience: string;
  summary: string;
};

export const marketingTracks: MarketingTrack[] = [
  {
    id: "spanish",
    title: "Live Spanish",
    sessionLength: "25 or 50 min",
    audience: "Teens & adults",
    summary:
      "Every class is in Spanish with a native teacher from Guatemala — real conversation, pronunciation, and grammar you can use the same day.",
  },
  {
    id: "natives",
    title: "Guatemalan teachers",
    sessionLength: "25 or 50 min",
    audience: "All levels",
    summary:
      "Learn from native speakers rooted in Guatemala: natural rhythm, local expressions, and cultural context you cannot get from recorded lessons.",
  },
  {
    id: "beginners",
    title: "First steps",
    sessionLength: "25 min suggested",
    audience: "New learners",
    summary:
      "Greetings, core verbs, and guided speaking from class one — friendly pace, instruction entirely in Spanish with support when you need it.",
  },
  {
    id: "conversation",
    title: "Conversation focus",
    sessionLength: "50 min suggested",
    audience: "Intermediate+",
    summary:
      "Less drill, more dialogue: storytelling, situational role-play, and corrections in context with your Guatemalan teacher.",
  },
  {
    id: "paired",
    title: "Paired classes",
    sessionLength: "25 or 50 min",
    audience: "Friends & families",
    summary:
      "Share a native teacher with a partner, split the package, and keep each other accountable — still 100% Spanish, still live.",
  },
  {
    id: "teachers",
    title: "Teach with us",
    sessionLength: "Flexible",
    audience: "Educators in Guatemala",
    summary:
      "Native Spanish educators join the roster, set weekly availability, and teach 1:1 or paired live classes on our classroom platform.",
  },
];

export const marketingTestimonials = [
  {
    quote:
      "I book 25-minute classes between meetings. My teacher from Guatemala catches my mistakes every week — it finally feels natural when I speak.",
    name: "Alex R.",
    role: "Spanish learner",
  },
  {
    quote:
      "The paired option let my sister and I practice Spanish together with one native teacher. We split the cost and still get personal feedback.",
    name: "Priya S.",
    role: "Spanish learner",
  },
  {
    quote:
      "As a teacher based in Guatemala, the schedule tools and payout visibility are straightforward — I focus on conversation, not admin.",
    name: "María G.",
    role: "Academy teacher · Guatemala",
  },
] as const;

export const marketingFooterExplore = [
  { label: "Programs", href: "#programs" },
  { label: "Why Spanglish", href: "#features" },
  { label: "Learner stories", href: "#testimonials" },
  { label: "Pricing", href: "/packages" },
] as const;

export const marketingFooterAcademy = [
  { label: "Create account", href: "/register" },
  { label: "Sign in", href: "/login" },
  { label: "Teacher application", href: "/login?next=%2Fapply" },
  { label: "Book a class", href: "/login?next=%2Fschedule" },
] as const;

export const marketingPillars = [
  {
    title: "Spanish only",
    description: "All live instruction is in Spanish — built for learners who want immersion, not translation drills.",
  },
  {
    title: "Native teachers",
    description: "Teachers on the roster are native speakers from Guatemala, with real classroom experience.",
  },
  {
    title: "Individual or paired",
    description: "Study solo or bring a partner and split the package.",
  },
  {
    title: "Flexible scheduling",
    description: "Book, move, or cancel within academy policy from your dashboard.",
  },
  {
    title: "Classroom recordings",
    description: "Review sessions afterward and keep momentum between lessons.",
  },
  {
    title: "Secure & private",
    description: "Signed join links, role-based access, and platform-managed classrooms.",
  },
] as const;