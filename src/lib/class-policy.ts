/** Runtime values that drive live-class policy on the client and server. */
export type ClassPolicy = {
  cancelCutoffHours: number;
  rescheduleCutoffHours: number;
  joinWindowBeforeMinutes: number;
  joinWindowAfterMinutes: number;
  meetingTokenTtlMinutes: number;
  /** When true, skip the "opens N minutes before start" gate (for call testing). */
  relaxJoinWindow: boolean;
};

/** Time zone used for class dates when the viewer's own zone is unknown. */
export const classTimeZone = "America/New_York";
export const classTimeZoneLabel = "EST (UTC-5)";
