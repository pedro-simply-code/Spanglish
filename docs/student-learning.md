# Student learning (lessons, practice, vocabulary, progress)

Everything on the student dashboard comes from real data. Nothing is a fixture.

## What the teacher adds after a class (class page, "Class content")

- **Recap, homework, note**: stored on `class_sessions.recap / homework / teacher_note`.
- **Materials**: library materials attached to the class (`class_sessions.material_ids`). Students of the class can open them even when they are private.
- **Vocabulary**: `class_vocabulary` rows. Each word is copied into every student's list (`student_words`, unique per student and source word).
- **Practice**: a form material assigned to the class (`assignments`). Its questions are frozen when assigned. Students submit once and can resubmit until graded (`assignment_submissions`).
  - Multiple choice with a correct option is graded on submit.
  - Other question types wait for the teacher.
  - The teacher grades at `/teacher/assignments`, giving points and feedback.

Forms are created in the material composer. Multiple-choice questions take options, the correct one, and points.

## Student dashboard layout

The sidebar has five sections and no headings. Each section groups related pages as tabs (`?tab=`), defined in `src/app/(dashboard)/_student/hub.tsx`:

| Section | Route | Tabs |
|---|---|---|
| Inicio | `/home` | — |
| Mis clases | `/classes` | Mis clases · Lo que he aprendido (`lessons`) · Reservar (`book`) |
| Estudiar | `/study` | Tareas (`practice`) · Vocabulario · Materiales |
| Mi progreso | `/progress` | Cómo voy · Logros (`achievements`) |
| Mis créditos | `/credits` | Mis créditos · Comprar clases (`buy`) |

Settings and "Enseña con nosotros" live in the profile menu.

The old routes redirect to their tab: `/lessons`, `/schedule`, `/practice`, `/vocabulary`, `/materials`, `/achievements`, and `/pricing` for students. Detail pages keep their URLs: `/classes/[id]`, `/practice/[id]`, `/materials/[id]`. Each tab's content lives in `src/app/(dashboard)/_student/*-section.tsx`, and its own breadcrumb is hidden (`HideBreadcrumb`).

## Student pages

| Page | Source |
|---|---|
| `/home` | Next class (with join state), credit balances, a to-do list (pending practice, words due, last homework), last 7 days of minutes in class, last lesson, next achievement |
| `/lessons` | Past classes the student booked (`listLessonHistory`): attendance and minutes present, recap, homework, recording, transcript, vocabulary count, pending practice |
| `/practice`, `/practice/[assignmentId]` | `listAssignmentsForStudent` / `getAssignmentForStudent`. Correct answers stay hidden until graded |
| `/vocabulary` | `student_words` with Leitner review: boxes 0-5 with waits of 0/1/3/7/14/30 days. Box 3 or higher counts as learned |
| `/progress`, `/achievements` | `getStudentInsights`: classes, minutes present (`class_participants.seconds_present`), week streak, words, practice average, and computed achievements |
| `/credits` | Balances, `credit_transactions` history, the student's `orders` |

Server code lives in `src/server/learning/`, shared types in `src/lib/learning-types.ts`, and actions in `src/features/learning/actions.ts`.

## Demo accounts for testing

`pnpm db:seed` creates them, all with the password **`Spanglish1!`** (`defaultDemoPassword` in `src/lib/demo-accounts.ts`). The seed refuses to run in production.

| Email (`@spanglish.academy`) | Role | Notes |
|---|---|---|
| `student@` (Alex Rivera) | Student | English UI, learning Spanish |
| `student2@` … `student10@` | Student | Pairs: `student7` + `student8`, `student9` + `student10` |
| `teacher@`, `teacher2@` … `teacher5@` | Teacher | `teacher2` (Andrés López) teaches `student@` in the demo classes |
| `manager@`, `manager2@` | Manager | |

There is no demo admin. The admin is the account in `ADMIN_EMAIL`, or one promoted with `pnpm admin:promote -- you@example.com`. See `docs/roles-and-permissions.md`.

To test this flow, sign in as `teacher2@` and open a past class, then add a recap, words and practice. Then sign in as `student@` and check Lessons, Practice, Vocabulary and Progress.

## AI conversation practice (Study → Talk with AI)

Students role-play a scene (store, restaurant, airport, doctor, job interview, small talk, or their own topic) with Claude, in the language they are learning and at their level. The model answers in 1–3 short sentences and adds a "💡" line with the corrected sentence when the student makes a mistake.

- **Model:** `ANTHROPIC_MODEL`, by default the cheapest current Claude model (`claude-haiku-5-5`). It is called with plain `fetch` (`src/server/ai/anthropic.ts`), with no SDK.
- **Scene picture:** Claude draws a simple SVG when the conversation starts. It is sanitized (no scripts, links or external images) and shown through an `<img>` data URL, so it cannot run code.
- **Budget:** each conversation may use `AI_CONVERSATION_TOKEN_LIMIT` tokens, 10,000 by default. That counts input and output, scene included. The conversation ends before a turn would go over. Replies are capped at 300 tokens and student messages at 500 characters.
- **Cost:** stored per conversation in `ai_conversations.cost_micros`, priced at `AI_PRICE_INPUT_PER_MTOK` / `AI_PRICE_OUTPUT_PER_MTOK` when each call is made, and shown next to the tokens used. This is the hook for selling AI credits later.
- **Daily limit:** `AI_CONVERSATIONS_PER_DAY`, 1 by default while testing.
- **Without `ANTHROPIC_API_KEY`:** the tab says AI practice is off.
- **Troubleshooting:** `pnpm check:ai` checks the key and lists the model ids it can use, then sends one tiny message with `ANTHROPIC_MODEL`. Failed calls are logged on the server as `[ai-practice] Claude API <status> <type>: …`. The student sees the reason: bad key, unknown model, no balance or rate limit.

Tables: `ai_conversations` and `ai_messages` (migration 0016). Server code lives in `src/server/ai/conversations.ts`, the UI in `src/features/ai-practice`.
