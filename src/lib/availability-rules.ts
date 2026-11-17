/* Pure rules for a teacher's weekly availability (shared by server and tests). */

export type AvailabilityWindow = {
  weekday: number;
  startMinute: number;
  endMinute: number;
};

export type AvailabilityError = "WINDOW_INVALID" | "WINDOW_OVERLAP";

/** Validates and merges nothing: overlapping windows on a day are rejected. */
export function validateWindows(windows: AvailabilityWindow[]): AvailabilityError | null {
  for (const window of windows) {
    if (
      !Number.isInteger(window.weekday) ||
      window.weekday < 0 ||
      window.weekday > 6 ||
      !Number.isInteger(window.startMinute) ||
      !Number.isInteger(window.endMinute) ||
      window.startMinute < 0 ||
      window.endMinute > 1440 ||
      window.endMinute - window.startMinute < 25
    ) {
      return "WINDOW_INVALID";
    }
  }
  const sorted = [...windows].sort(
    (a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute,
  );
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]!;
    const current = sorted[index]!;
    if (previous.weekday === current.weekday && current.startMinute < previous.endMinute) {
      return "WINDOW_OVERLAP";
    }
  }
  return null;
}

