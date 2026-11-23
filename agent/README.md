# Classroom agent (live transcription)

A LiveKit agent that joins every Spanglish class and transcribes each participant
live with **Deepgram Nova-3, multilingual** (Spanish and English mixed in one
sentence) through **LiveKit Inference**. It is billed to the LiveKit Cloud
project; no Deepgram key is needed.

How it fits with the app:

1. The app puts a dispatch for this agent (by name) in every class token
   (`src/server/classes/livekit.ts`), so LiveKit sends it into each class room.
2. The agent runs one transcriber per participant, so every line already knows
   who spoke. The app stores the role (teacher / student) from the class itself.
3. Lines appear live in the room's Transcript tab (`lk.transcription` text
   stream) and finished lines are posted to `/api/agent/transcript`, which saves
   them in `class_transcript_segments`.
4. When the room closes, the agent sends its last lines with `ended: true` and
   the app asks Claude for the class summary (`src/server/ai/lesson-summary.ts`).
   The LiveKit `room_finished` webhook is a fallback if the agent crashed.

## Settings

| Where | Variable | Value |
| --- | --- | --- |
| App `.env` | `CLASSROOM_AGENT_NAME` | `spanglish-classroom` (must match the agent) |
| App `.env` | `CLASSROOM_AGENT_SECRET` | 32+ random characters (`openssl rand -hex 32`) |
| App `.env` | `ANTHROPIC_API_KEY` | needed for the summaries |
| Agent secrets | `CLASSROOM_AGENT_NAME` | same as the app |
| Agent secrets | `CLASSROOM_AGENT_SECRET` | same as the app |
| Agent secrets | `SPANGLISH_APP_URL` | public URL of the app, e.g. `https://spanglish.academy` |
| Agent secrets (optional) | `STT_MODEL`, `STT_LANGUAGE` | defaults `deepgram/nova-3`, `multi` |

`LIVEKIT_URL`, `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are injected by
LiveKit Cloud; set them yourself only to run the agent locally.

Without `CLASSROOM_AGENT_NAME` + `CLASSROOM_AGENT_SECRET` in the app, no agent is
dispatched and classes have no transcript or summary.

## Deploy to LiveKit Cloud

Requires the [LiveKit CLI](https://docs.livekit.io/reference/developer-tools/livekit-cli/).

```bash
cd agent
lk cloud auth                     # once: link your LiveKit Cloud project
cp .env.example agent.secrets.env # fill CLASSROOM_AGENT_*, SPANGLISH_APP_URL (drop LIVEKIT_*)
lk agent create --secrets-file=agent.secrets.env
lk agent status                   # running replicas
lk agent logs                     # live logs
```

Later changes: `lk agent deploy`. Change a secret:
`lk agent update-secrets --secrets "SPANGLISH_APP_URL=https://…"`.
Delete `agent.secrets.env` after creating the agent (it holds the secret).

## Run locally

Node 24+ (runs the TypeScript file directly).

```bash
cd agent
pnpm install --ignore-workspace   # the agent is its own project, not part of the app
cp .env.example .env   # fill it; SPANGLISH_APP_URL=http://localhost:3000 works
pnpm dev
```

The app must be reachable from the agent at `SPANGLISH_APP_URL`. A local agent
still uses LiveKit Inference, so it needs a LiveKit Cloud project.

## Costs

- **Speech-to-text:** per minute of audio **per participant** (a 50-minute class with
  a teacher and a student is about 100 minutes). The free Build plan includes only
  a small monthly inference credit, so classes need a paid plan. See
  [LiveKit Inference pricing](https://livekit.com/pricing/inference).
- **Agent session minutes:** the time the agent is connected to rooms (the Build
  plan includes a monthly allowance).
- **Summary:** one Claude call per class, from text only; its cost is saved in
  `class_summaries.cost_micros`.
