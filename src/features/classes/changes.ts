import type { AuthSession } from "@/lib/auth-types";
import type { ClassRescheduleInput } from "@/features/classes/types";
import {
  bookClass,
  bookTrialClass,
  studentTrialLessonAvailable,
  cancelClass,
  rescheduleClass,
  respondToChangeRequest,
  type BookingErrorCode,
  type BookingResult,
} from "@/server/classes/booking";
import type { ClassKind } from "@/server/credits/credits";

/*
 * Booking, cancel and reschedule entry points shared by the web Server
 * Actions and the /api/v1 endpoints (Android app). Server-only; the rules
 * live in `src/server/classes/booking.ts`.
 */

export type ClassChangeErrorCode = BookingErrorCode;
export type ClassChangeResult = BookingResult;

export function bookClassForActor(
  actor: AuthSession,
  input: { teacherId: string; startsAt: string; kind: ClassKind; topic: string },
) {
  return bookClass(actor, input);
}

export function bookTrialClassForActor(
  actor: AuthSession,
  input: { teacherId: string; startsAt: string; durationMinutes: 25 | 50; topic: string },
) {
  return bookTrialClass(actor, input);
}

export { studentTrialLessonAvailable };

export function cancelClassForActor(
  actor: AuthSession,
  input: { classId: string; reason?: string },
) {
  return cancelClass(actor, input);
}

export function rescheduleClassForActor(actor: AuthSession, input: ClassRescheduleInput) {
  return rescheduleClass(actor, input);
}

export function respondToClassChangeForActor(
  actor: AuthSession,
  input: { classId: string; requestId: string; accept: boolean },
) {
  return respondToChangeRequest(actor, input);
}
