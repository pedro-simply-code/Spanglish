import type { RoleCode } from "@/lib/auth-roles";
import type {
  learningLanguages,
  learningLevels,
  profileLocales,
} from "@/lib/profile-schema";

type ProfileLocale = (typeof profileLocales)[number];
type LearningLanguage = (typeof learningLanguages)[number];
type LearningLevel = (typeof learningLevels)[number];

export const demoAccountDomain = "spanglish.academy";

/** Default password for seeded demo accounts (also in `.env.example`). */
export const defaultDemoPassword = "Spanglish1!";

export type SeedAccount = {
  email: string;
  name: string;
  roles: RoleCode[];
  locale: ProfileLocale;
  learningLanguage: LearningLanguage;
  level: LearningLevel;
  goal?: string;
  /** Listed on the login page (one account per role). */
  featured?: boolean;
  /**
   * Paired students share classes and credits. Kept here until the pairs
   * table lands with paired classes (phase 2); the seed only reports them.
   */
  pairWith?: string;
};

const at = (local: string) => `${local}@${demoAccountDomain}`;

const studentProfiles: Omit<SeedAccount, "roles">[] = [
  {
    email: at("student"),
    name: "Alex Rivera",
    locale: "en",
    learningLanguage: "spanish",
    level: "intermediate",
    goal: "Hold a 30-minute conversation with my in-laws.",
    featured: true,
  },
  {
    email: at("student2"),
    name: "Sofía Morales",
    locale: "es",
    learningLanguage: "english",
    level: "beginner",
    goal: "Presentarme en entrevistas de trabajo en inglés.",
  },
  {
    email: at("student3"),
    name: "James Carter",
    locale: "en",
    learningLanguage: "spanish",
    level: "beginner",
    goal: "Get around on my trip to Mexico.",
  },
  {
    email: at("student4"),
    name: "Valentina Cruz",
    locale: "es",
    learningLanguage: "english",
    level: "advanced",
    goal: "Preparar el examen TOEFL.",
  },
  {
    email: at("student5"),
    name: "Emily Chen",
    locale: "en",
    learningLanguage: "spanish",
    level: "advanced",
    goal: "Read Latin American novels in Spanish.",
  },
  {
    email: at("student6"),
    name: "Mateo Herrera",
    locale: "es",
    learningLanguage: "english",
    level: "intermediate",
    goal: "Hablar con clientes en reuniones.",
  },
  // Pair 1: a couple learning Spanish together.
  {
    email: at("student7"),
    name: "Daniel Brooks",
    locale: "en",
    learningLanguage: "spanish",
    level: "beginner",
    goal: "Paired classes with Olivia.",
    pairWith: at("student8"),
  },
  {
    email: at("student8"),
    name: "Olivia Brooks",
    locale: "en",
    learningLanguage: "spanish",
    level: "beginner",
    goal: "Paired classes with Daniel.",
    pairWith: at("student7"),
  },
  // Pair 2: siblings learning English together.
  {
    email: at("student9"),
    name: "Lucas Paredes",
    locale: "es",
    learningLanguage: "english",
    level: "intermediate",
    goal: "Clases en pareja con Camila.",
    pairWith: at("student10"),
  },
  {
    email: at("student10"),
    name: "Camila Paredes",
    locale: "es",
    learningLanguage: "english",
    level: "intermediate",
    goal: "Clases en pareja con Lucas.",
    pairWith: at("student9"),
  },
];

const students: SeedAccount[] = studentProfiles.map((account) => ({
  ...account,
  roles: ["student"],
}));

type StaffProfile = {
  email: string;
  name: string;
  locale: ProfileLocale;
  featured?: boolean;
};

function staff(profiles: StaffProfile[], roles: RoleCode[]): SeedAccount[] {
  return profiles.map((account) => ({
    ...account,
    roles,
    learningLanguage: account.locale === "es" ? "english" : "spanish",
    level: "advanced",
  }));
}

const teachers = staff(
  [
    {
      email: at("teacher"),
      name: "María González",
      locale: "es",
      featured: true,
    },
    { email: at("teacher2"), name: "Andrés López", locale: "es" },
    { email: at("teacher3"), name: "Sarah Mitchell", locale: "en" },
    { email: at("teacher4"), name: "Gabriela Torres", locale: "es" },
    { email: at("teacher5"), name: "Michael Turner", locale: "en" },
  ],
  ["teacher"],
);

const managers = staff(
  [
    {
      email: at("manager"),
      name: "Diego Ramírez",
      locale: "es",
      featured: true,
    },
    { email: at("manager2"), name: "Laura Bennett", locale: "en" },
  ],
  ["manager"],
);

/**
 * Earlier seeds created this demo admin. The academy's admin is now a real
 * account (ADMIN_EMAIL or `npm run admin:promote`); the seed deletes it.
 */
export const retiredDemoAdminEmail = at("admin");

export const seedAccounts: SeedAccount[] = [...students, ...teachers, ...managers];

/** Student pairs as [email, email], each pair listed once. */
export const seedPairs: [string, string][] = students.flatMap((account, index) => {
  const partner = students.findIndex((other) => other.email === account.pairWith);
  return partner > index ? [[account.email, students[partner]!.email] as [string, string]] : [];
});
