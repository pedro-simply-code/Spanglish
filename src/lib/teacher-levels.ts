/*
 * Teacher levels from classes taught and student ratings. A higher level lowers
 * the platform take rate (teacher keeps more). Pure functions for server + UI.
 */

export type TeacherStats = {
  classesTaught: number;
  pairedTaught: number;
  ratingCount: number;
  /** Average stars (0 when there are no ratings). */
  ratingAverage: number;
  fiveStarCount: number;
};

export type TeacherLevel = {
  level: 1 | 2 | 3 | 4;
  name: string;
  /** Default platform take % at this level (overridable in payout settings). */
  defaultPlatformTakePercent: number;
  minClasses: number;
  minRating: number;
  minRatings: number;
};

export const teacherLevels: readonly TeacherLevel[] = [
  { level: 1, name: "New teacher", defaultPlatformTakePercent: 25, minClasses: 0, minRating: 0, minRatings: 0 },
  { level: 2, name: "Established", defaultPlatformTakePercent: 20, minClasses: 50, minRating: 4.5, minRatings: 5 },
  { level: 3, name: "Senior", defaultPlatformTakePercent: 15, minClasses: 200, minRating: 4.7, minRatings: 20 },
  { level: 4, name: "Top teacher", defaultPlatformTakePercent: 10, minClasses: 500, minRating: 4.8, minRatings: 50 },
];

export function teacherLevelFor(stats: TeacherStats): TeacherLevel {
  let current = teacherLevels[0]!;
  for (const level of teacherLevels) {
    if (
      stats.classesTaught >= level.minClasses &&
      stats.ratingCount >= level.minRatings &&
      (level.minRating === 0 || stats.ratingAverage >= level.minRating)
    ) {
      current = level;
    }
  }
  return current;
}

/** What is missing for the next level, or null at the top. */
export function nextLevelGap(stats: TeacherStats) {
  const current = teacherLevelFor(stats);
  const next = teacherLevels.find((level) => level.level === current.level + 1);
  if (!next) return null;
  return {
    level: next,
    classes: Math.max(0, next.minClasses - stats.classesTaught),
    ratings: Math.max(0, next.minRatings - stats.ratingCount),
    rating: next.minRating,
  };
}

export type TeacherBadge = { id: string; label: string; description: string };

export function teacherBadges(stats: TeacherStats): TeacherBadge[] {
  const badges: TeacherBadge[] = [];
  if (stats.classesTaught >= 1) badges.push({ id: "first-class", label: "First class", description: "Taught a first class." });
  if (stats.classesTaught >= 50) badges.push({ id: "fifty", label: "50 classes", description: "Taught 50 classes." });
  if (stats.classesTaught >= 200) badges.push({ id: "two-hundred", label: "200 classes", description: "Taught 200 classes." });
  if (stats.pairedTaught >= 20) badges.push({ id: "paired-pro", label: "Paired pro", description: "Taught 20 paired classes." });
  if (stats.ratingCount >= 10 && stats.ratingAverage >= 4.8) {
    badges.push({ id: "top-rated", label: "Top rated", description: "4.8★ or more from 10+ ratings." });
  }
  if (stats.fiveStarCount >= 10) {
    badges.push({ id: "student-favorite", label: "Student favorite", description: "Ten 5-star ratings." });
  }
  return badges;
}

export const emptyTeacherStats: TeacherStats = {
  classesTaught: 0,
  pairedTaught: 0,
  ratingCount: 0,
  ratingAverage: 0,
  fiveStarCount: 0,
};

/* Localized variants. Callers pass a translator scoped to the educator namespace. */

const levelNameKeys = ["new", "established", "senior", "top"] as const;

const badgeKeys: Record<string, string> = {
  "first-class": "firstClass",
  fifty: "fifty",
  "two-hundred": "twoHundred",
  "paired-pro": "pairedPro",
  "top-rated": "topRated",
  "student-favorite": "studentFavorite",
};

/** Level name from the educator catalog, keyed by numeric level. */
export function localizedTeacherLevelName(
  level: TeacherLevel["level"],
  t: (key: string) => string,
) {
  return t(`levels.${levelNameKeys[level - 1] ?? "new"}`);
}

/** Level name from a raw (English) level display name produced by the server. */
export function localizedTeacherLevelNameByName(
  name: string,
  t: (key: string) => string,
) {
  const match = teacherLevels.find((level) => level.name === name) ?? teacherLevels[0]!;
  return localizedTeacherLevelName(match.level, t);
}

/** Returns the level with its display name translated. */
export function localizedTeacherLevel(
  level: TeacherLevel,
  t: (key: string) => string,
): TeacherLevel {
  return { ...level, name: localizedTeacherLevelName(level.level, t) };
}

/** Translates a badge list that was computed on the server. */
export function localizedTeacherBadgeList(
  badges: TeacherBadge[],
  t: (key: string) => string,
): TeacherBadge[] {
  return badges.map((badge) => {
    const key = badgeKeys[badge.id];
    if (!key) return badge;
    return {
      ...badge,
      label: t(`levels.badge.${key}`),
      description: t(`levels.badge.${key}Description`),
    };
  });
}

/** Returns badges with their label and description translated. */
export function localizedTeacherBadges(
  stats: TeacherStats,
  t: (key: string) => string,
): TeacherBadge[] {
  return localizedTeacherBadgeList(teacherBadges(stats), t);
}