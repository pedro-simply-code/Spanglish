import { eq, sql } from "drizzle-orm";
import { resolveTimeZone } from "@/lib/timezone";
import { db } from "@/server/db";
import { teacherAvailability, teacherProfiles, users } from "@/server/db/schema";

/** Teacher cards for booking and staff screens. */

export type TeacherCard = {
  id: string;
  name: string;
  image: string | null;
  headline: string;
  bio: string;
  country: string;
  tags: string[];
  timeZone: string;
  bookable: boolean;
  /** Has at least one weekly availability window. */
  hasAvailability: boolean;
};

export async function listTeachers(options: { bookableOnly?: boolean } = {}): Promise<TeacherCard[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      image: users.image,
      timezone: users.timezone,
      headline: teacherProfiles.headline,
      bio: teacherProfiles.bio,
      country: teacherProfiles.country,
      tags: teacherProfiles.tags,
      bookable: teacherProfiles.bookable,
      windows: sql<number>`(select count(*)::int from ${teacherAvailability} where ${teacherAvailability.teacherId} = ${users.id})`,
    })
    .from(users)
    .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
    .where(sql`'teacher' = ANY(${users.roles})`)
    .orderBy(users.name);

  return rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      image: row.image,
      headline: row.headline ?? "",
      bio: row.bio ?? "",
      country: row.country ?? "",
      tags: row.tags ?? [],
      timeZone: resolveTimeZone(row.timezone),
      bookable: row.bookable ?? true,
      hasAvailability: Number(row.windows) > 0,
    }))
    .filter((teacher) => !options.bookableOnly || (teacher.bookable && teacher.hasAvailability));
}

export type TeacherProfileInput = {
  headline: string;
  bio: string;
  country: string;
  tags: string[];
};

export async function getTeacherProfile(userId: string): Promise<TeacherProfileInput & { bookable: boolean }> {
  const [row] = await db
    .select()
    .from(teacherProfiles)
    .where(eq(teacherProfiles.userId, userId))
    .limit(1);
  return {
    headline: row?.headline ?? "",
    bio: row?.bio ?? "",
    country: row?.country ?? "",
    tags: row?.tags ?? [],
    bookable: row?.bookable ?? true,
  };
}

export async function saveTeacherProfile(userId: string, input: TeacherProfileInput) {
  const values = {
    headline: input.headline.trim().slice(0, 120),
    bio: input.bio.trim().slice(0, 1000),
    country: input.country.trim().slice(0, 80),
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 8),
    updatedAt: new Date(),
  };
  await db
    .insert(teacherProfiles)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: teacherProfiles.userId, set: values });
}

export async function setTeacherBookable(userId: string, bookable: boolean) {
  await db
    .insert(teacherProfiles)
    .values({ userId, bookable })
    .onConflictDoUpdate({ target: teacherProfiles.userId, set: { bookable, updatedAt: new Date() } });
}
