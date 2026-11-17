import { asc, eq } from "drizzle-orm";
import type { ClassroomChatMessage } from "@/features/classes";
import { db } from "@/server/db";
import { classroomChatMessages } from "@/server/db/schema";

const DEFAULT_LIMIT = 250;

export async function listClassroomChatMessages(
  classId: string,
  limit = DEFAULT_LIMIT,
): Promise<ClassroomChatMessage[]> {
  const rows = await db
    .select()
    .from(classroomChatMessages)
    .where(eq(classroomChatMessages.classId, classId))
    .orderBy(asc(classroomChatMessages.sentAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    from: row.senderIdentity,
    name: row.senderName,
    text: row.body,
    at: row.sentAt.toISOString(),
  }));
}

export async function insertClassroomChatMessage(message: ClassroomChatMessage, classId: string) {
  const sentAt = new Date(message.at);
  if (Number.isNaN(sentAt.getTime())) {
    throw new Error("Invalid message timestamp.");
  }

  await db
    .insert(classroomChatMessages)
    .values({
      id: message.id,
      classId,
      senderIdentity: message.from,
      senderName: message.name,
      body: message.text.trim(),
      sentAt,
    })
    .onConflictDoNothing();
}