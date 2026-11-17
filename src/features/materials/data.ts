import { demoNow } from "@/lib/demo-clock";
import type {
  Assignment,
  AvailabilityDay,
  FormQuestion,
  Material,
  MaterialGrant,
  MaterialKind,
  StudentMaterial,
  Submission,
} from "@/features/materials/types";

export const materialKindLabels: Record<MaterialKind, string> = {
  document: "Document",
  link: "Link",
  video: "Video",
  audio: "Audio",
  form: "Form",
  recording: "Recording",
};

export const materialKindOptions: MaterialKind[] = [
  "document",
  "link",
  "video",
  "audio",
  "form",
  "recording",
];

/**
 * Teacher-authored library. Content is static for the demo, but the shape is
 * the one the storage-backed repository will use.
 */
export const materials: Material[] = [
  {
    id: "mat-travel-deck",
    title: "Travel phrases deck",
    description:
      "The 24 phrases we will use in the travel class, with a short pronunciation note for each one.",
    kind: "document",
    status: "published",
    level: "Beginner",
    tags: ["Travel", "Speaking"],
    ownerId: "maria",
    ownerName: "María González",
    createdAt: "2026-11-10T09:00:00-05:00",
    updatedAt: "2026-11-15T16:20:00-05:00",
    fileName: "travel-phrases.pdf",
    fileSize: "1.8 MB",
    classId: "class-1003",
  },
  {
    id: "mat-airport-drill",
    title: "Airport listening drill",
    description:
      "Five minutes of airport announcements and directions. Listen once without reading, then repeat with the transcript.",
    kind: "audio",
    status: "published",
    level: "Beginner",
    tags: ["Travel", "Listening"],
    ownerId: "maria",
    ownerName: "María González",
    createdAt: "2026-11-11T10:30:00-05:00",
    updatedAt: "2026-11-14T11:00:00-05:00",
    duration: "06:20",
    classId: "class-1003",
  },
  {
    id: "mat-past-tense-form",
    title: "Past tense check-in",
    description:
      "A short form to see which past tense endings still need work before the next class.",
    kind: "form",
    status: "published",
    level: "Intermediate",
    tags: ["Grammar", "Past tense"],
    ownerId: "maria",
    ownerName: "María González",
    createdAt: "2026-11-12T15:00:00-05:00",
    updatedAt: "2026-11-15T18:40:00-05:00",
    classId: "class-1002",
    questionCount: 6,
    estimatedMinutes: 8,
  },
  {
    id: "mat-business-intro",
    title: "Business introductions",
    description:
      "The frames and vocabulary from today's class. Use the three templates to introduce yourself in 60 seconds.",
    kind: "document",
    status: "published",
    level: "Intermediate",
    tags: ["Business", "Speaking"],
    ownerId: "lucia",
    ownerName: "Lucía Fernández",
    createdAt: "2026-11-16T08:30:00-05:00",
    updatedAt: "2026-11-16T09:40:00-05:00",
    fileName: "business-introductions.pdf",
    fileSize: "920 KB",
    classId: "class-1004",
  },
  {
    id: "mat-restaurant-recap",
    title: "Ordering food: class recording",
    description:
      "Full recording of the restaurant class, including the role-play and the correction round.",
    kind: "recording",
    status: "published",
    level: "Beginner",
    tags: ["Travel", "Speaking"],
    ownerId: "carlos",
    ownerName: "Carlos Mendoza",
    createdAt: "2026-11-12T18:30:00-05:00",
    updatedAt: "2026-11-12T19:10:00-05:00",
    duration: "24:10",
    classId: "class-0901",
    transcriptReady: true,
    views: 38,
  },
  {
    id: "mat-pronunciation-recap",
    title: "Pronunciation clinic: class recording",
    description:
      "Vowels, word stress, and the shadowing dialogue from the pronunciation clinic.",
    kind: "recording",
    status: "published",
    level: "All levels",
    tags: ["Pronunciation", "Listening"],
    ownerId: "maria",
    ownerName: "María González",
    createdAt: "2026-11-10T08:50:00-05:00",
    updatedAt: "2026-11-10T09:30:00-05:00",
    duration: "48:32",
    classId: "class-0902",
    transcriptReady: true,
    views: 52,
  },
  {
    id: "mat-restaurant-vocab",
    title: "Restaurant vocabulary",
    description:
      "Menu sections, polite requests, and the phrases that resolve a wrong order calmly.",
    kind: "document",
    status: "published",
    level: "Beginner",
    tags: ["Travel", "Vocabulary"],
    ownerId: "carlos",
    ownerName: "Carlos Mendoza",
    createdAt: "2026-11-12T17:00:00-05:00",
    updatedAt: "2026-11-12T17:20:00-05:00",
    fileName: "restaurant-vocabulary.pdf",
    fileSize: "1.2 MB",
    classId: "class-0901",
  },
  {
    id: "mat-travel-quiz",
    title: "Travel vocabulary quiz",
    description:
      "Six quick questions on airports, hotels, and restaurants. Your score tells us what to review first.",
    kind: "form",
    status: "published",
    level: "Beginner",
    tags: ["Travel", "Vocabulary"],
    ownerId: "maria",
    ownerName: "María González",
    createdAt: "2026-11-14T09:00:00-05:00",
    updatedAt: "2026-11-14T09:00:00-05:00",
    classId: "class-1003",
    questionCount: 6,
    estimatedMinutes: 6,
  },
  {
    id: "mat-interview-frames",
    title: "Interview answer frames",
    description:
      "Three answer structures for common interview questions, with a filler-phrase bank.",
    kind: "document",
    status: "draft",
    level: "Advanced",
    tags: ["Business", "Interview"],
    ownerId: "maria",
    ownerName: "María González",
    createdAt: "2026-11-15T14:00:00-05:00",
    updatedAt: "2026-11-16T08:10:00-05:00",
    fileName: "interview-frames.pdf",
    fileSize: "1.1 MB",
  },
  {
    id: "mat-pronunciation-notes",
    title: "Pronunciation clinic notes",
    description:
      "The sounds and drills from class, plus a five-minute shadowing routine.",
    kind: "document",
    status: "published",
    level: "All levels",
    tags: ["Pronunciation"],
    ownerId: "maria",
    ownerName: "María González",
    createdAt: "2026-11-10T08:40:00-05:00",
    updatedAt: "2026-11-10T09:20:00-05:00",
    fileName: "pronunciation-notes.pdf",
    fileSize: "640 KB",
    classId: "class-0902",
  },
];

export const materialGrants: MaterialGrant[] = [
  {
    id: "grant-01",
    materialId: "mat-travel-deck",
    audience: "class",
    audienceLabel: "Travel Spanish warm-up",
    classId: "class-1003",
    sharedBy: "María González",
    sharedAt: "2026-11-15T16:30:00-05:00",
    dueAt: "2026-11-16T20:00:00-05:00",
  },
  {
    id: "grant-02",
    materialId: "mat-airport-drill",
    audience: "class",
    audienceLabel: "Travel Spanish warm-up",
    classId: "class-1003",
    sharedBy: "María González",
    sharedAt: "2026-11-15T16:31:00-05:00",
  },
  {
    id: "grant-03",
    materialId: "mat-past-tense-form",
    audience: "student",
    audienceLabel: "Alex Rivera",
    studentId: "alex",
    sharedBy: "María González",
    sharedAt: "2026-11-15T18:45:00-05:00",
    dueAt: "2026-11-18T09:00:00-05:00",
  },
  {
    id: "grant-04",
    materialId: "mat-business-intro",
    audience: "class",
    audienceLabel: "Business introductions",
    classId: "class-1004",
    sharedBy: "Lucía Fernández",
    sharedAt: "2026-11-16T09:45:00-05:00",
  },
  {
    id: "grant-05",
    materialId: "mat-restaurant-recap",
    audience: "class",
    audienceLabel: "Ordering food with confidence",
    classId: "class-0901",
    sharedBy: "Carlos Mendoza",
    sharedAt: "2026-11-12T19:15:00-05:00",
  },
  {
    id: "grant-06",
    materialId: "mat-pronunciation-recap",
    audience: "class",
    audienceLabel: "Pronunciation clinic",
    classId: "class-0902",
    sharedBy: "María González",
    sharedAt: "2026-11-10T09:35:00-05:00",
  },
  {
    id: "grant-07",
    materialId: "mat-restaurant-vocab",
    audience: "class",
    audienceLabel: "Ordering food with confidence",
    classId: "class-0901",
    sharedBy: "Carlos Mendoza",
    sharedAt: "2026-11-12T19:16:00-05:00",
  },
  {
    id: "grant-08",
    materialId: "mat-travel-quiz",
    audience: "class",
    audienceLabel: "Travel Spanish warm-up",
    classId: "class-1003",
    sharedBy: "María González",
    sharedAt: "2026-11-14T09:05:00-05:00",
    dueAt: "2026-11-17T20:00:00-05:00",
  },
  {
    id: "grant-09",
    materialId: "mat-pronunciation-notes",
    audience: "class",
    audienceLabel: "Pronunciation clinic",
    classId: "class-0902",
    sharedBy: "María González",
    sharedAt: "2026-11-10T09:36:00-05:00",
  },
];

export const assignments: Assignment[] = [
  {
    id: "asg-past-tense",
    materialId: "mat-past-tense-form",
    title: "Past tense check-in",
    audienceLabel: "Alex Rivera",
    assignedAt: "2026-11-15T18:45:00-05:00",
    dueAt: "2026-11-18T09:00:00-05:00",
    totalStudents: 1,
    submitted: 0,
    graded: 0,
    status: "open",
  },
  {
    id: "asg-travel-quiz",
    materialId: "mat-travel-quiz",
    title: "Travel vocabulary quiz",
    audienceLabel: "Travel Spanish warm-up · 4 students",
    classId: "class-1003",
    assignedAt: "2026-11-14T09:05:00-05:00",
    dueAt: "2026-11-17T20:00:00-05:00",
    totalStudents: 4,
    submitted: 3,
    graded: 2,
    status: "grading",
  },
];

export const submissions: Submission[] = [
  {
    id: "sub-01",
    assignmentId: "asg-travel-quiz",
    studentId: "alex",
    studentName: "Alex Rivera",
    status: "submitted",
    submittedAt: "2026-11-15T19:10:00-05:00",
    score: 83,
  },
  {
    id: "sub-02",
    assignmentId: "asg-travel-quiz",
    studentId: "priya",
    studentName: "Priya Shah",
    status: "graded",
    submittedAt: "2026-11-15T12:30:00-05:00",
    score: 100,
    feedback: "Clean pronunciation. Keep the hotel phrases active.",
  },
  {
    id: "sub-03",
    assignmentId: "asg-travel-quiz",
    studentId: "mateo",
    studentName: "Mateo Silva",
    status: "graded",
    submittedAt: "2026-11-15T16:05:00-05:00",
    score: 67,
    feedback: "Review the difference between llegar and ir.",
  },
  {
    id: "sub-04",
    assignmentId: "asg-travel-quiz",
    studentId: "hannah",
    studentName: "Hannah Kim",
    status: "pending",
  },
  {
    id: "sub-05",
    assignmentId: "asg-past-tense",
    studentId: "alex",
    studentName: "Alex Rivera",
    status: "pending",
  },
];

export const formQuestions: Record<string, FormQuestion[]> = {
  "mat-past-tense-form": [
    {
      id: "q1",
      type: "multiple-choice",
      prompt: "Yesterday I ___ to the market.",
      options: ["voy", "fui", "iba"],
      correctOption: 1,
      points: 1,
    },
    {
      id: "q2",
      type: "multiple-choice",
      prompt: "We ___ dinner when you called.",
      options: ["teníamos", "tuvimos", "estábamos teniendo"],
      correctOption: 2,
      points: 1,
    },
    {
      id: "q3",
      type: "short-answer",
      prompt: "Write one sentence about last weekend using an irregular verb.",
      points: 2,
    },
    {
      id: "q4",
      type: "speaking",
      prompt: "Tell a 30-second story about a trip you took last year.",
      points: 2,
    },
  ],
  "mat-travel-quiz": [
    {
      id: "q1",
      type: "multiple-choice",
      prompt: "How do you ask for the gate at an airport?",
      options: [
        "¿Dónde está la puerta?",
        "¿Cuánto cuesta la maleta?",
        "¿A qué hora sale el tren?",
      ],
      correctOption: 0,
      points: 1,
    },
    {
      id: "q2",
      type: "multiple-choice",
      prompt: "Which phrase asks for a room with two beds?",
      options: [
        "Una habitación con dos camas",
        "Una mesa para dos",
        "Un billete de ida",
      ],
      correctOption: 0,
      points: 1,
    },
    {
      id: "q3",
      type: "listening",
      prompt: "Listen to the announcement and write the gate number.",
      points: 2,
    },
    {
      id: "q4",
      type: "short-answer",
      prompt: "Order a coffee and ask for the bill in one sentence.",
      points: 2,
    },
  ],
};

export const teacherAvailability: AvailabilityDay[] = [
  {
    day: "Monday",
    slots: [
      { time: "09:00", booked: true },
      { time: "11:00", booked: false },
      { time: "15:00", booked: true },
      { time: "18:00", booked: false },
    ],
  },
  {
    day: "Tuesday",
    slots: [
      { time: "09:00", booked: false },
      { time: "11:00", booked: true },
      { time: "15:00", booked: false },
      { time: "18:00", booked: true },
    ],
  },
  {
    day: "Wednesday",
    slots: [
      { time: "09:00", booked: true },
      { time: "11:00", booked: false },
      { time: "15:00", booked: false },
      { time: "18:00", booked: false },
    ],
  },
  {
    day: "Thursday",
    slots: [
      { time: "09:00", booked: false },
      { time: "11:00", booked: false },
      { time: "15:00", booked: true },
      { time: "18:00", booked: false },
    ],
  },
  {
    day: "Friday",
    slots: [
      { time: "09:00", booked: true },
      { time: "11:00", booked: true },
      { time: "15:00", booked: false },
      { time: "18:00", booked: false },
    ],
    note: "Requested time off after 17:00 starting next month.",
  },
  {
    day: "Saturday",
    slots: [{ time: "10:00", booked: false }],
    note: "Morning classes only.",
  },
];

export function getMaterialById(id: string): Material | undefined {
  return materials.find((material) => material.id === id);
}

export function getMaterialsByIds(ids: readonly string[]): Material[] {
  return ids
    .map((id) => getMaterialById(id))
    .filter((material): material is Material => Boolean(material));
}

export function getTeacherMaterials(ownerName: string): Material[] {
  return materials.filter((material) => material.ownerName === ownerName);
}

export function getRecordings(ownerName?: string): Material[] {
  return materials.filter(
    (material) =>
      material.kind === "recording" &&
      (ownerName ? material.ownerName === ownerName : true),
  );
}

export function getMaterialGrants(materialId: string): MaterialGrant[] {
  return materialGrants.filter((grant) => grant.materialId === materialId);
}

export function getAssignmentsForClass(classId: string): Assignment[] {
  return assignments.filter((assignment) => assignment.classId === classId).map(
    (assignment) => assignment,
  );
}

export function getAssignmentById(id: string): Assignment | undefined {
  return assignments.find((assignment) => assignment.id === id);
}

export function getAssignmentsByIds(ids: readonly string[]): Assignment[] {
  return ids
    .map((id) => getAssignmentById(id))
    .filter((assignment): assignment is Assignment => Boolean(assignment));
}

export function getAssignmentsForMaterial(materialId: string): Assignment[] {
  return assignments.filter((assignment) => assignment.materialId === materialId);
}

export function getSubmissions(assignmentId: string): Submission[] {
  return submissions.filter(
    (submission) => submission.assignmentId === assignmentId,
  );
}

export function getFormQuestions(materialId: string): FormQuestion[] {
  return formQuestions[materialId] ?? [];
}

/**
 * The demo student can see every grant that targets one of their classes or
 * their own account. A real repository filters by the signed-in user id.
 */
export function getStudentMaterials(): StudentMaterial[] {
  const visible = materialGrants.filter(
    (grant) => grant.audience !== "student" || grant.studentId === "alex",
  );

  return visible
    .map((grant) => {
      const material = getMaterialById(grant.materialId);
      return material ? { material, grant } : null;
    })
    .filter((entry): entry is StudentMaterial => Boolean(entry));
}

export function getStudentPracticeMaterials(): StudentMaterial[] {
  return getStudentMaterials().filter(
    (entry) => entry.material.kind === "form",
  );
}

/** Teacher dashboard helper: newest published material first. */
export function getRecentMaterials(ownerName: string, limit = 4): Material[] {
  return getTeacherMaterials(ownerName)
    .slice()
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
    .slice(0, limit);
}

export function getPendingSubmissions(ownerName: string): Submission[] {
  const teacherAssignments = assignments.filter((assignment) => {
    const material = getMaterialById(assignment.materialId);
    return material?.ownerName === ownerName;
  });

  return submissions.filter(
    (submission) =>
      submission.status === "submitted" &&
      teacherAssignments.some(
        (assignment) => assignment.id === submission.assignmentId,
      ),
  );
}

export const materialLibraryUpdatedAt = demoNow;
