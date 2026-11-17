/**
 * Classroom UI (LiveKit, lobby, room shell). Import from here in app routes — not from
 * `@/features/classes`, so server pages do not pull the LiveKit client bundle.
 */
export { ClassDetail } from "@/features/classes/components/class-detail";
export { ClassListCard } from "@/features/classes/components/class-list-card";
export { ClassRoom } from "@/features/classes/components/class-room";
export { ClassStatusChip } from "@/features/classes/components/class-status-chip";
export { ClassesOverview } from "@/features/classes/components/classes-overview";