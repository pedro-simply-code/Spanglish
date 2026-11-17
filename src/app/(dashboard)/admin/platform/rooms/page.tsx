import type { Metadata } from "next";
import { env } from "@/env";
import { PlatformRoomsOverview } from "@/features/admin";

export const metadata: Metadata = {
  title: "Classroom defaults",
  description: "Live class policy from environment",
};

export default function AdminPlatformRoomsPage() {
  return (
    <PlatformRoomsOverview
      policy={{
        waitingRoom: env.CLASS_WAITING_ROOM,
        teacherStartsSession: env.CLASS_TEACHER_STARTS_SESSION,
        relaxJoinWindow: env.CLASS_RELAX_JOIN_WINDOW,
        meetingProvider: env.MEETING_PROVIDER,
      }}
    />
  );
}