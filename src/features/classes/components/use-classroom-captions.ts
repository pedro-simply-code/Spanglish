"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { RoomEvent, type Room } from "livekit-client";
import { getClassroomTranscriptAction } from "@/features/classes/classroom-actions";
import {
  CAPTION_ATTR_FINAL,
  CAPTION_ATTR_SEGMENT,
  CAPTION_ATTR_SPEAKER,
  CAPTION_ATTR_SPEAKER_NAME,
  TRANSCRIPTION_TOPIC,
} from "@/features/classes/classroom-protocol";

/*
 * Live captions from the classroom agent (agent/classroom-agent.ts). The agent
 * joins the room, transcribes each participant on its own (Deepgram Nova-3,
 * Spanish and English mixed) and publishes every line on the `lk.transcription`
 * text stream; it also saves the final lines as the class transcript, so the
 * browsers here only listen.
 */

export type CaptionLineView = {
  id: string;
  identity: string;
  name: string;
  text: string;
  final: boolean;
  /** When the line was first heard (ms). */
  at: number;
  updatedAt: number;
};

/** Lines kept in the room's transcript panel. */
const MAX_LINES = 2000;
const INTERIM_LINE_TTL_MS = 10000;

type UseClassroomCaptionsArgs = {
  room: Room | null;
  classId: string;
  guestJoinToken?: string | null;
};

/** Whether the classroom agent is in the room (transcribing). */
function agentPresent(room: Room | null) {
  if (!room) return false;
  return [...room.remoteParticipants.values()].some((participant) => participant.isAgent);
}

export function useClassroomCaptions({ room, classId, guestJoinToken }: UseClassroomCaptionsArgs) {
  const [lines, setLines] = useState<CaptionLineView[]>([]);
  // Is the agent in the room? (it joins a moment after the first person)
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!room) return () => undefined;
      room.on(RoomEvent.ParticipantConnected, onChange);
      room.on(RoomEvent.ParticipantDisconnected, onChange);
      room.on(RoomEvent.Connected, onChange);
      return () => {
        room.off(RoomEvent.ParticipantConnected, onChange);
        room.off(RoomEvent.ParticipantDisconnected, onChange);
        room.off(RoomEvent.Connected, onChange);
      };
    },
    [room],
  );
  const active = useSyncExternalStore(subscribe, () => agentPresent(room), () => false);

  /** Adds a line, or updates it in place while it is still being spoken. */
  const upsertLine = useCallback((line: Omit<CaptionLineView, "updatedAt" | "at">) => {
    setLines((prev) => {
      const now = Date.now();
      const index = prev.findIndex((item) => item.id === line.id);
      if (index >= 0) {
        const next = prev.slice();
        next[index] = { ...next[index]!, ...line, updatedAt: now };
        return next;
      }
      return [...prev, { ...line, at: now, updatedAt: now }].slice(-MAX_LINES);
    });
  }, []);

  // What was said before this person joined (or before a reload).
  useEffect(() => {
    if (!room) return;
    let cancelled = false;
    void getClassroomTranscriptAction(classId, guestJoinToken).then((saved) => {
      if (cancelled || !saved.length) return;
      setLines((prev) => {
        const live = new Set(prev.map((line) => line.id));
        const history = saved
          .filter((line) => !live.has(line.id))
          .map((line) => {
            const at = Date.parse(line.at);
            return {
              id: line.id,
              identity: line.speakerIdentity,
              name: line.speakerName,
              text: line.text,
              final: true,
              at,
              updatedAt: at,
            };
          });
        return [...history, ...prev].slice(-MAX_LINES);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [room, classId, guestJoinToken]);

  // Lines from the agent as they are spoken.
  useEffect(() => {
    if (!room) return;
    room.registerTextStreamHandler(TRANSCRIPTION_TOPIC, (reader) => {
      const attributes = reader.info.attributes ?? {};
      const identity = attributes[CAPTION_ATTR_SPEAKER];
      if (!identity) return;
      void reader
        .readAll()
        .then((text) => {
          const body = text.trim();
          if (!body) return;
          upsertLine({
            id: attributes[CAPTION_ATTR_SEGMENT] || reader.info.id,
            identity,
            name:
              room.getParticipantByIdentity(identity)?.name ||
              attributes[CAPTION_ATTR_SPEAKER_NAME] ||
              identity,
            text: body.slice(0, 2000),
            final: attributes[CAPTION_ATTR_FINAL] === "true",
          });
        })
        .catch(() => undefined);
    });
    return () => {
      room.unregisterTextStreamHandler(TRANSCRIPTION_TOPIC);
    };
  }, [room, upsertLine]);

  // Drop half-heard lines that never became final (speaker left, mic muted).
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setLines((prev) => {
        const next = prev.filter((line) => line.final || now - line.updatedAt < INTERIM_LINE_TTL_MS);
        return next.length === prev.length ? prev : next;
      });
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  return { lines, active };
}
