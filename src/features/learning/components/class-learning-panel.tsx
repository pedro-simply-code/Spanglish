"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  IconBook2,
  IconChecklist,
  IconExternalLink,
  IconFileText,
  IconLanguage,
  IconNotebook,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { LinkButton } from "@/components/ui/link-button";
import { SectionCard } from "@/components/ui/section-card";
import {
  addClassVocabularyAction,
  createAssignmentAction,
  deleteAssignmentAction,
  removeClassVocabularyAction,
  saveClassNotesAction,
  setClassMaterialsAction,
} from "@/features/learning/actions";
import { AssignmentStatusChip } from "@/features/learning/components/assignment-status-chip";
import type { AssignmentSummary, ClassLearning } from "@/lib/learning-types";
import { useAppToast } from "@/lib/use-app-toast";

export type LibraryOption = { id: string; title: string; kind: string };

type ClassLearningPanelProps = {
  sessionId: string;
  learning: ClassLearning;
  /** Teacher of the class (or staff): shows the editors. */
  canEdit: boolean;
  /** Student of the class: shows their own practice status. */
  isParticipant: boolean;
  notes: { recap: string; homework: string; teacherNote: string };
  /** Teacher's library, for attaching materials and assigning forms. */
  library: LibraryOption[];
  timeZone?: string;
};

function SubHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
      {icon}
      <Typography variant="subtitle1" fontWeight={600}>
        {children}
      </Typography>
    </Stack>
  );
}

/**
 * What the class leaves for its students: materials, vocabulary and practice.
 * The teacher edits it here (plus the recap and homework); students read it.
 */
export function ClassLearningPanel({
  sessionId,
  learning,
  canEdit,
  isParticipant,
  notes,
  library,
  timeZone,
}: ClassLearningPanelProps) {
  const t = useTranslations("student.learn");
  const format = useFormatter();
  const router = useRouter();
  const { showError, showSuccess } = useAppToast();
  const [pending, startTransition] = useTransition();

  const [recap, setRecap] = useState(notes.recap);
  const [homework, setHomework] = useState(notes.homework);
  const [teacherNote, setTeacherNote] = useState(notes.teacherNote);
  const [word, setWord] = useState({ term: "", translation: "", example: "" });
  const [attached, setAttached] = useState<LibraryOption[]>(
    learning.materials.map((item) => ({ id: item.id, title: item.title, kind: item.kind })),
  );
  const [formId, setFormId] = useState("");
  const [dueAt, setDueAt] = useState("");

  const run = (action: () => Promise<{ ok: boolean; message: string }>, after?: () => void) => {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        showSuccess({ message: result.message });
        after?.();
        router.refresh();
      } else {
        showError({ message: result.message });
      }
    });
  };

  const forms = library.filter((item) => item.kind === "form");
  const nothingForStudents =
    !learning.materials.length && !learning.vocabulary.length && !learning.assignments.length;
  if (!canEdit && nothingForStudents) return null;

  const dueLabel = (assignment: AssignmentSummary) =>
    assignment.dueAt
      ? t("class.due", {
          date: format.dateTime(new Date(assignment.dueAt), {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone,
          }),
        })
      : t("class.noDue");

  return (
    <Box id="class-learning">
      <SectionCard
        title={canEdit ? t("class.editTitle") : t("class.title")}
        subtitle={canEdit ? t("class.editSubtitle") : t("class.subtitle")}
        action={<IconBook2 size={20} />}
      >
        <Stack spacing={3} divider={<Divider />}>
          {canEdit ? (
            <Box>
              <SubHeading icon={<IconNotebook size={18} />}>{t("class.notesTitle")}</SubHeading>
              <Stack spacing={2}>
                <TextField
                  label={t("class.recap")}
                  helperText={t("class.recapHelp")}
                  value={recap}
                  onChange={(event) => setRecap(event.target.value)}
                  multiline
                  minRows={3}
                />
                <TextField
                  label={t("class.homework")}
                  value={homework}
                  onChange={(event) => setHomework(event.target.value)}
                  multiline
                  minRows={2}
                />
                <TextField
                  label={t("class.teacherNote")}
                  helperText={t("class.teacherNoteHelp")}
                  value={teacherNote}
                  onChange={(event) => setTeacherNote(event.target.value)}
                  multiline
                  minRows={2}
                />
                <Button
                  variant="contained"
                  size="small"
                  sx={{ alignSelf: "flex-start" }}
                  disabled={pending}
                  onClick={() =>
                    run(() => saveClassNotesAction({ sessionId, recap, homework, teacherNote }))
                  }
                >
                  {t("class.saveNotes")}
                </Button>
              </Stack>
            </Box>
          ) : null}

          {canEdit || learning.materials.length ? (
            <Box>
              <SubHeading icon={<IconFileText size={18} />}>{t("class.materialsTitle")}</SubHeading>
              {canEdit ? (
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mb={2} alignItems={{ sm: "center" }}>
                  <Autocomplete
                    multiple
                    size="small"
                    options={library}
                    value={attached}
                    onChange={(_, value) => setAttached(value)}
                    getOptionLabel={(option) => option.title}
                    isOptionEqualToValue={(a, b) => a.id === b.id}
                    sx={{ flexGrow: 1 }}
                    renderInput={(params) => (
                      <TextField {...params} label={t("class.pickMaterials")} />
                    )}
                    noOptionsText={t("class.noLibrary")}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ flexShrink: 0 }}
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        setClassMaterialsAction({ sessionId, materialIds: attached.map((item) => item.id) }),
                      )
                    }
                  >
                    {t("class.saveMaterials")}
                  </Button>
                </Stack>
              ) : null}
              <Stack spacing={1}>
                {learning.materials.map((material) => (
                  <Stack key={material.id} direction="row" spacing={1.5} alignItems="center">
                    <Box flexGrow={1} minWidth={0}>
                      <Typography variant="body2" fontWeight={600}>
                        {material.title}
                      </Typography>
                      {material.description ? (
                        <Typography variant="caption" color="text.secondary">
                          {material.description}
                        </Typography>
                      ) : null}
                    </Box>
                    <LinkButton
                      href={`/materials/${material.id}`}
                      size="small"
                      variant="text"
                      endIcon={<IconExternalLink size={14} />}
                    >
                      {t("class.open")}
                    </LinkButton>
                  </Stack>
                ))}
              </Stack>
            </Box>
          ) : null}

          {canEdit || learning.vocabulary.length ? (
            <Box>
              <SubHeading icon={<IconLanguage size={18} />}>
                {t("class.vocabularyTitle", { count: learning.vocabulary.length })}
              </SubHeading>
              {canEdit ? (
                <Stack direction={{ xs: "column", md: "row" }} spacing={1} mb={2}>
                  <TextField
                    size="small"
                    label={t("class.term")}
                    value={word.term}
                    onChange={(event) => setWord({ ...word, term: event.target.value })}
                  />
                  <TextField
                    size="small"
                    label={t("class.translation")}
                    value={word.translation}
                    onChange={(event) => setWord({ ...word, translation: event.target.value })}
                  />
                  <TextField
                    size="small"
                    label={t("class.example")}
                    value={word.example}
                    onChange={(event) => setWord({ ...word, example: event.target.value })}
                    sx={{ flexGrow: 1 }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<IconPlus size={14} />}
                    sx={{ flexShrink: 0 }}
                    disabled={pending || !word.term.trim()}
                    onClick={() =>
                      run(
                        () => addClassVocabularyAction({ sessionId, items: [word] }),
                        () => setWord({ term: "", translation: "", example: "" }),
                      )
                    }
                  >
                    {t("class.addWord")}
                  </Button>
                </Stack>
              ) : null}
              {learning.vocabulary.length ? (
                <Table size="small">
                  <TableBody>
                    {learning.vocabulary.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell sx={{ fontWeight: 600, pl: 0 }}>{item.term}</TableCell>
                        <TableCell>{item.translation}</TableCell>
                        <TableCell sx={{ color: "text.secondary" }}>{item.example}</TableCell>
                        {canEdit ? (
                          <TableCell padding="checkbox">
                            <IconButton
                              size="small"
                              aria-label={t("class.removeWord")}
                              disabled={pending}
                              onClick={() => run(() => removeClassVocabularyAction(sessionId, item.id))}
                            >
                              <IconTrash size={16} />
                            </IconButton>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t("class.noWords")}
                </Typography>
              )}
              {isParticipant && learning.vocabulary.length ? (
                <LinkButton href="/vocabulary" size="small" variant="text" sx={{ mt: 1 }}>
                  {t("class.reviewWords")}
                </LinkButton>
              ) : null}
            </Box>
          ) : null}

          {canEdit || learning.assignments.length ? (
            <Box>
              <SubHeading icon={<IconChecklist size={18} />}>{t("class.practiceTitle")}</SubHeading>
              {canEdit ? (
                <Stack direction={{ xs: "column", md: "row" }} spacing={1} mb={2}>
                  <TextField
                    select
                    size="small"
                    label={t("class.pickForm")}
                    value={formId}
                    onChange={(event) => setFormId(event.target.value)}
                    sx={{ minWidth: 240, flexGrow: 1 }}
                    helperText={forms.length ? undefined : t("class.noForms")}
                  >
                    {forms.map((form) => (
                      <MenuItem key={form.id} value={form.id}>
                        {form.title}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    type="datetime-local"
                    size="small"
                    label={t("class.dueAt")}
                    value={dueAt}
                    onChange={(event) => setDueAt(event.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ flexShrink: 0 }}
                    disabled={pending || !formId}
                    onClick={() =>
                      run(
                        () =>
                          createAssignmentAction({
                            sessionId,
                            materialId: formId,
                            dueAt: dueAt ? new Date(dueAt).toISOString() : null,
                          }),
                        () => {
                          setFormId("");
                          setDueAt("");
                        },
                      )
                    }
                  >
                    {t("class.assign")}
                  </Button>
                </Stack>
              ) : null}
              <Stack spacing={1.25}>
                {learning.assignments.map((assignment) => (
                  <Stack
                    key={assignment.id}
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    sx={{ p: 1.5, bgcolor: "grey.100", borderRadius: 1 }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {assignment.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t("class.questions", { count: assignment.questionCount })} · {dueLabel(assignment)}
                        {canEdit
                          ? ` · ${t("class.submittedCount", {
                              submitted: assignment.submittedCount,
                              total: assignment.totalStudents,
                            })}`
                          : ""}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {isParticipant ? <AssignmentStatusChip assignment={assignment} /> : null}
                      {isParticipant ? (
                        <LinkButton href={`/practice/${assignment.id}`} size="small" variant="outlined">
                          {assignment.mySubmission ? t("class.view") : t("class.start")}
                        </LinkButton>
                      ) : null}
                      {canEdit ? (
                        <>
                          <LinkButton
                            href={`/teacher/assignments?id=${assignment.id}`}
                            size="small"
                            variant="outlined"
                          >
                            {t("class.review")}
                          </LinkButton>
                          <IconButton
                            size="small"
                            aria-label={t("class.removeAssignment")}
                            disabled={pending}
                            onClick={() => run(() => deleteAssignmentAction(sessionId, assignment.id))}
                          >
                            <IconTrash size={16} />
                          </IconButton>
                        </>
                      ) : null}
                    </Stack>
                  </Stack>
                ))}
                {!learning.assignments.length ? (
                  <Typography variant="body2" color="text.secondary">
                    {t("class.noPractice")}
                  </Typography>
                ) : null}
              </Stack>
            </Box>
          ) : null}
        </Stack>
      </SectionCard>
    </Box>
  );
}

