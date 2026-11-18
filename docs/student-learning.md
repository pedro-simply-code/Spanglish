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
