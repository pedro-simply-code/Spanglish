/**
 * Spanglish classroom agent: joins every class room and transcribes each
 * participant live with Deepgram Nova-3 in multilingual mode (Spanish and
 * English mixed in one sentence), through LiveKit Inference — billed to the
 * LiveKit Cloud project, no Deepgram key needed.
 *
 * - One transcriber per participant: every line already knows who said it, so
 *   nothing is guessed from voices.
 * - Lines are shown live in the room (text stream `lk.transcription`) and the
 *   finished ones are posted to the app (/api/agent/transcript), which stores
 *   them as the class transcript.
 * - When the room closes it sends the last lines with `ended: true`, and the
 *   app asks Claude for the class summary.
 *
 * The app dispatches it by name (CLASSROOM_AGENT_NAME) in every class token.
 * Run: `pnpm dev` here (local), or deploy to LiveKit Cloud (see README.md).
 */
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  AutoSubscribe,
  cli,
  defineAgent,
  inference,
  log,
  ServerOptions,
  stt,
  type JobContext,
} from "@livekit/agents";
import {
  AudioStream,
  ParticipantKind,
  RoomEvent,
  TrackKind,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type Room,
} from "@livekit/rtc-node";

const AGENT_NAME = process.env.CLASSROOM_AGENT_NAME || "spanglish-classroom";
const APP_URL = (process.env.SPANGLISH_APP_URL || "").replace(/\/+$/, "");
const AGENT_SECRET = process.env.CLASSROOM_AGENT_SECRET || "";
/** LiveKit Inference model; `deepgram/nova-3` + `multi` handles Spanish/English code-switching. */
const STT_MODEL = process.env.STT_MODEL || "deepgram/nova-3";
const STT_LANGUAGE = process.env.STT_LANGUAGE || "multi";

/** Topic and attributes the classroom page listens for (src/lib/class-captions.ts). */
const TRANSCRIPTION_TOPIC = "lk.transcription";
const ATTR_FINAL = "lk.transcription_final";
const ATTR_SEGMENT = "lk.segment_id";
const ATTR_TRACK = "lk.transcribed_track_id";
const ATTR_SPEAKER = "spanglish.speaker";
const ATTR_SPEAKER_NAME = "spanglish.speaker_name";

/** Interim captions are sent at most this often per speaker. */
const INTERIM_EVERY_MS = 300;
/** Finished lines are posted to the app in batches. */
const POST_EVERY_MS = 2000;
const POST_RETRIES = 3;

type TranscriptLine = { id: string; identity: string; name: string; text: string; lang: string; at: string };

/** Sends finished lines to the app, a batch every few seconds, with retries. */
class TranscriptUploader {
  private queue: TranscriptLine[] = [];
  private timer: NodeJS.Timeout | undefined;
  private sending: Promise<void> = Promise.resolve();
  private readonly room: string;

  constructor(room: string) {
    this.room = room;
  }

  add(line: TranscriptLine) {
    this.queue.push(line);
    this.timer ??= setTimeout(() => {
      this.timer = undefined;
      void this.flush(false);
    }, POST_EVERY_MS);
  }

  /** Sends what is queued; `ended` tells the app the class is over. */
  flush(ended: boolean) {
    clearTimeout(this.timer);
    this.timer = undefined;
    const lines = this.queue.splice(0);
    if (!lines.length && !ended) return this.sending;
    this.sending = this.sending.then(() => this.post({ room: this.room, lines, ended }));
    return this.sending;
  }

  private async post(body: { room: string; lines: TranscriptLine[]; ended: boolean }) {
    if (!APP_URL || !AGENT_SECRET) {
      log().warn("SPANGLISH_APP_URL or CLASSROOM_AGENT_SECRET missing: transcript not saved");
      return;
    }
    for (let attempt = 1; attempt <= POST_RETRIES; attempt++) {
      try {
        const response = await fetch(`${APP_URL}/api/agent/transcript`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${AGENT_SECRET}` },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15_000),
        });
        if (response.ok) return;
        // A 4xx will not get better by retrying (wrong room, bad secret).
        if (response.status < 500) {
          log().error({ status: response.status, room: body.room }, "transcript rejected by the app");
          return;
        }
      } catch (error) {
        log().warn({ error, attempt, room: body.room }, "transcript post failed");
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
    log().error({ room: body.room, lines: body.lines.length }, "transcript lines lost after retries");
  }
}

/** Transcribes one participant's microphone until it stops. */
function transcribe(
  room: Room,
  participant: RemoteParticipant,
  track: RemoteTrack,
  uploader: TranscriptUploader,
) {
  const recognizer = new inference.STT({
    model: STT_MODEL,
    language: STT_LANGUAGE,
    modelOptions: { punctuate: true, smart_format: true, interim_results: true },
  });
  const speech = recognizer.stream();
  const audio = new AudioStream(track, { sampleRate: 16000, numChannels: 1 });
  let stopped = false;
  let segmentId = randomUUID();
  let lastInterimAt = 0;

  const captionAttributes = (final: boolean) => ({
    [ATTR_FINAL]: String(final),
    [ATTR_SEGMENT]: segmentId,
    [ATTR_TRACK]: track.sid ?? "",
    [ATTR_SPEAKER]: participant.identity,
    [ATTR_SPEAKER_NAME]: participant.name || participant.identity,
  });
  const caption = (text: string, final: boolean) =>
    room.localParticipant
      ?.sendText(text, { topic: TRANSCRIPTION_TOPIC, attributes: captionAttributes(final) })
      .catch((error: unknown) => log().debug({ error }, "caption not sent"));

  // Microphone → speech-to-text.
  void (async () => {
    try {
      for await (const frame of audio) {
        if (stopped) break;
        speech.pushFrame(frame);
      }
    } catch (error) {
      if (!stopped) log().warn({ error, identity: participant.identity }, "audio stream ended");
    } finally {
      speech.endInput();
    }
  })();

  // Speech-to-text → captions in the room + transcript lines for the app.
  void (async () => {
    try {
      for await (const event of speech) {
        const alternative = event.alternatives?.[0];
        const text = alternative?.text?.trim();
        if (event.type === stt.SpeechEventType.INTERIM_TRANSCRIPT && text) {
          const now = Date.now();
          if (now - lastInterimAt < INTERIM_EVERY_MS) continue;
          lastInterimAt = now;
          await caption(text, false);
        } else if (event.type === stt.SpeechEventType.FINAL_TRANSCRIPT && text) {
          await caption(text, true);
          uploader.add({
            id: `${participant.identity}-${segmentId}`.slice(0, 160),
            identity: participant.identity,
            name: participant.name || participant.identity,
            text,
            lang: String(alternative?.language || STT_LANGUAGE),
            at: new Date(event.speechEndTime ?? Date.now()).toISOString(),
          });
          segmentId = randomUUID();
          lastInterimAt = 0;
        }
      }
    } catch (error) {
      if (!stopped) log().error({ error, identity: participant.identity }, "transcription stopped");
    }
  })();

  return async () => {
    stopped = true;
    speech.endInput();
    await audio.cancel().catch(() => undefined);
    speech.close();
  };
}

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect(undefined, AutoSubscribe.AUDIO_ONLY);
    const room = ctx.room;
    const roomName = room.name ?? "";
    const uploader = new TranscriptUploader(roomName);
    /** One transcriber per microphone track, keyed by track sid. */
    const active = new Map<string, () => Promise<void>>();

    const start = (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      if (track.kind !== TrackKind.KIND_AUDIO || participant.kind === ParticipantKind.AGENT) return;
      const key = publication.sid ?? `${participant.identity}-${track.sid}`;
      if (active.has(key)) return;
      log().info({ room: roomName, identity: participant.identity }, "transcribing participant");
      active.set(key, transcribe(room, participant, track, uploader));
    };
    const stop = async (key: string) => {
      const end = active.get(key);
      active.delete(key);
      await end?.();
    };

    room.on(RoomEvent.TrackSubscribed, start);
    room.on(RoomEvent.TrackUnsubscribed, (_track, publication) => void stop(publication.sid ?? ""));
    room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      for (const publication of participant.trackPublications.values()) void stop(publication.sid ?? "");
    });

    // People already in the room when the agent arrived.
    for (const participant of room.remoteParticipants.values()) {
      for (const publication of participant.trackPublications.values()) {
        if (publication.track) start(publication.track as RemoteTrack, publication as RemoteTrackPublication, participant);
      }
    }

    // Room closed (class ended) or the job is stopping: last lines + summary.
    ctx.addShutdownCallback(async () => {
      await Promise.all([...active.keys()].map((key) => stop(key)));
      await uploader.flush(true);
    });
  },
});

cli.runApp(new ServerOptions({ agent: fileURLToPath(import.meta.url), agentName: AGENT_NAME }));
