# Live classes

Live classes are the core of the academy. Lessons, practice, vocabulary, and
achievements support the class schedule; they do not replace it.

## Routes

| Route | Purpose |
| --- | --- |
| `/classes` | Tabbed list: upcoming, in progress, completed, canceled |
| `/classes/[id]` | Agenda, outcomes, materials, teacher notes, cancel/reschedule |
| `/classes/[id]/room` | Classroom with join window, provider, and signed access |

`/classes` and its children are academy pages, not dashboards, so they stay
reachable from the student, teacher, manager, and admin dashboards.

## Data model (PostgreSQL)

| Table | What it holds |
| --- | --- |
| `class_sessions` | One class: teacher, type, duration, `starts_at`/`ends_at`, `status` (`scheduled`/`canceled`), topic, agenda, notes, cancellation, classroom state (`live_started_at`). |
| `class_participants` | Students in the class (both partners for paired) and attendance (`first_joined_at`, `seconds_present`). |
| `student_pairs` | Two students who share paired classes and one credit pool. |
| `credit_accounts` / `credit_transactions` | Credits per holder (`user:<id>` or `pair:<id>`) and class kind; every movement in the ledger. |
| `orders` | Package purchases (`provider = demo` until a payment provider is connected). |
| `teacher_profiles` / `teacher_availability` | Public teacher card and weekly windows in the teacher's time zone. |
| `class_change_requests` | Paired reschedule proposals (24 h to accept). |
| `classroom_waiting` | Waiting-room admissions. |
| `recordings` | Egress and browser recordings (status, storage key). |

`LiveClass` (`src/features/classes/types.ts`) stays the view model the UI uses;
`src/server/classes/class-repository.ts` builds it from these tables.

**No double booking.** Migration `0003_teacher_no_overlap` adds
`EXCLUDE USING gist (teacher_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
WHERE status = 'scheduled'` (needs `btree_gist`). Postgres rejects an
overlapping class for the same teacher even when two bookings arrive at once.
`db:push` cannot create it: use `db:migrate`.

## Booking and credits (`src/server/classes/booking.ts`)

- Free times = the teacher's weekly windows (every 30 minutes, at least 60
  minutes ahead, 21 days out) minus the teacher's and the students' scheduled
  classes (`availability.ts`).
- A booking is one SQL statement: spend one credit (`balance >= 1`), create the
  class, its participants and the ledger row. No credit → nothing is created.
- Cancel: students before the cutoff; the teacher or staff any time before the
  start. The credit returns to the account it came from. A paired class is
  canceled for both partners.
- Reschedule (students): a one-on-one class moves at once. A paired class
  creates a proposal; the partner accepts or declines in the class page; with
  no answer in 24 h it lapses and the class keeps its time.
- Emails (en/es) go to the teacher and the partner on booking, cancellation and
  reschedules (`src/server/email/class-notices.ts`).
- Checkout is a demo purchase (no payment): it creates an order and adds the
  package's credits. Paired packages need an active pair.
- Managers and the admin pair students and add or remove credits by hand at
  `/manager/students` or `/admin/organization/students`.

## Status

Status is derived from the clock and `status`: `canceled`, then `completed`
(end time passed), `in-progress` (started), otherwise `upcoming`.

## Policy

Rules live in `src/features/classes/policy.ts`; the environment wrapper is
`src/server/classes/class-policy.ts`.

| Rule | Default | Env variable |
| --- | --- | --- |
| Cancel cutoff | 24 hours | `CLASS_CANCEL_CUTOFF_HOURS` |
| Reschedule cutoff | 24 hours | `CLASS_RESCHEDULE_CUTOFF_HOURS` |
| Join window before | 15 minutes | `CLASS_JOIN_WINDOW_BEFORE_MINUTES` |
| Join window after | 15 minutes | `CLASS_JOIN_WINDOW_AFTER_MINUTES` |
| Meeting token TTL | 60 minutes | `MEETING_TOKEN_TTL_MINUTES` |
| Relax join window (testing only) | false | `CLASS_RELAX_JOIN_WINDOW` |

The UI uses `decideClassChange` to disable buttons early, but the server action
calls the same function again with the configured policy before accepting a
request. A client can never bypass the cutoff.

Cancellation and rescheduling are rejected when the class is already canceled,
completed, or in progress.

## Classroom access

`/classes/[id]/room`:

1. Looks up the class (404 if missing).
2. **Enrolled users and staff** need the `classes:join-own` permission (signed-in
   session).
3. **Guest viewers** can open a signed link:
   `/classes/[id]/room?join=<token>` (`buildGuestJoinUrl` / `verifyGuestJoinToken`).
   Guests receive LiveKit tokens with subscribe-only grants (no camera/mic publish).
4. Checks the join window with `getJoinState`.
5. Only when the window is open, mints a short-lived meeting cookie token with
   `createMeetingToken` and a LiveKit JWT via `resolveClassroomVideo`.

The join token payload contains the room, class id, viewer id, issue time, and
expiry, signed with `AUTH_SECRET` (or the development secret outside
production). The client receives a URL, never a long-lived meeting secret.

Teachers (and managers/admins) can copy a **guest link** from the classroom UI
during the open window. Links expire with `MEETING_TOKEN_TTL_MINUTES`.

## Meeting provider (LiveKit)

Classroom video uses [LiveKit](https://livekit.com/) inside the app. Set
`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `NEXT_PUBLIC_LIVEKIT_URL` (see
`.env.example`). Without those keys, the room falls back to local camera preview
with browser screen share and recording.

### In-app layout (Zoom-style)

- **Main stage** — screen share, pinned speaker, or active speaker (speaker view); grid overlay in gallery view.
- **Filmstrip** — remote cameras in speaker view.
- **Self view** — local camera in a corner PiP; optional **account photo cover** (Settings → Preferences or classroom toolbar) when the camera is off.
- **Sidebar** — **People** (roster, pin/spotlight, raised-hand icons) and **Chat** (LiveKit data messages on topic `spanglish.chat`). Chat history is saved by `sendClassroomChatMessageAction`, which takes the sender, name, and time from the server session; link-only guests cannot write to it.
- **Host controls** (teacher / manager / admin) — speaker vs gallery broadcast, mute all (RoomService), waiting-room admit/deny, cloud composite egress to B2, optional RTMP (`LIVEKIT_RTMP_URL`), SIP note.

**Room per class** — the LiveKit room is `class-<session id>`; server actions derive it from the class, never from the client.

**Teacher starts the call** — with `CLASS_TEACHER_STARTS_SESSION=true` (default), only the assigned teacher can press **Start live class**; students (and guests) wait until then. The state is stored on the class (`live_started_at`), so it survives restarts and works with several servers.

**Waiting room** — set `CLASS_WAITING_ROOM=true`. Students request admission before a LiveKit token is issued; moderators bypass the lobby. Stored in `classroom_waiting`.

**Attendance** — LiveKit webhooks (`/api/webhooks/livekit`: participant joined/left, room finished, egress ended) record presence per student. Configure the URL in LiveKit Cloud → Settings → Webhooks; LiveKit signs calls with the API key. Without webhooks, receiving a join token counts as attending.

Implementation: `classroom-livekit-stage.tsx`, `classroom-protocol.ts`, `classroom-actions.ts`, and server helpers under `src/server/classes/livekit-*.ts`.

**Recordings** — only the class's teacher (permission `recordings:manage`) records.
Two ways, both listed in `recordings` and on the Recordings page:

- **Cloud composite (LiveKit egress)** straight to B2 at
  `recordings/<class id>/<recording id>.mp4`; the webhook marks it ready.
- **Browser recording**: with `RECORDING_STORAGE=cloud` the browser uploads the
  file straight to B2 with a signed PUT URL (up to 2 GB; the file never passes
  through the server). The bucket needs a CORS rule allowing `PUT` from the
  site's origin. With `RECORDING_STORAGE=local` the file is saved under
  `storage/recordings/` (up to 250 MB).

Viewing goes through `/api/class-recordings/download?id=<recording id>`, which
checks access (participants, the teacher, staff) and redirects to a 10-minute
signed B2 link.

## After the class (phase 3)

- Participants rate the class from its page (`class_ratings`, 1–5 stars, within
  14 days of the end).
- The first earnings screen that loads after the class records the teacher's
  earning (`teacher_earnings`, one row per delivered class, idempotent).

## Calendar (`/apps/calendar`)

- Student: their classes; clicking an empty time opens booking.
- Teacher: their classes over their weekly availability (green blocks).
- Manager: every class, with a teacher filter that also shows that
  teacher's availability.
- The admin has no calendar (the page redirects to payout approvals); its
  dates are the payout cycle on `/admin/finance/payouts` and the dashboard
  alerts.
- "Add to my calendar" creates a private iCalendar link
  (`/api/calendar/<token>.ics`, table `calendar_feeds`, only a hash of the
  token is stored) for Google Calendar, Outlook or Apple Calendar. Creating a
  new link turns the old one off.

## Next steps

- Connect a payment provider (Stripe) to replace the demo checkout.
- Reminders before a class starts (email/push).
