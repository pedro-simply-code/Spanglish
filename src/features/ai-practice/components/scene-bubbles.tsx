"use client";

import Box from "@mui/material/Box";
import { keyframes } from "@mui/material/styles";
import type { SceneSpeaker } from "@/lib/ai-scene-speakers";

export { bubbleText } from "@/lib/ai-scene-speakers";

const pop = keyframes`
  from { opacity: 0; transform: var(--bubble-from) scale(0.85); }
  to { opacity: 1; transform: var(--bubble-from) scale(1); }
`;

const dots = keyframes`
  0%, 80%, 100% { opacity: 0.25; }
  40% { opacity: 1; }
`;

type BubbleProps = {
  /** Where the speaker's mouth is (percent of the picture). */
  at: SceneSpeaker;
  /** Text to show, or null for "…" (still thinking). */
  text: string | null;
  tone: "luna" | "student";
  /** Hidden on phones (only the latest line fits there). */
  hideOnPhone?: boolean;
};

/**
 * A speech bubble over the scene picture. It sits above the speaker's mouth,
 * opening towards `side`, with a tail pointing down at the mouth.
 */
function SceneBubble({ at, text, tone, hideOnPhone = false }: BubbleProps) {
  const toLeft = at.side === "left";
  const luna = tone === "luna";
  return (
    <Box
      aria-hidden
      sx={{
        display: hideOnPhone ? { xs: "none", sm: "block" } : "block",
        position: "absolute",
        left: `${at.x}%`,
        top: `${at.y}%`,
        // Bottom corner of the bubble on the mouth, a little above it.
        "--bubble-from": toLeft ? "translate(-100%, calc(-100% - 14px))" : "translate(0, calc(-100% - 14px))",
        transform: "var(--bubble-from)",
        animation: `${pop} 220ms ease-out`,
        transformOrigin: toLeft ? "bottom right" : "bottom left",
        width: "max-content",
        maxWidth: { xs: "62%", sm: "42%" },
        px: 1.25,
        py: 0.75,
        borderRadius: 2,
        borderBottomRightRadius: toLeft ? 2 : undefined,
        borderBottomLeftRadius: toLeft ? undefined : 2,
        bgcolor: luna ? "background.paper" : "primary.main",
        color: luna ? "text.primary" : "primary.contrastText",
        border: "1px solid",
        borderColor: luna ? "divider" : "primary.main",
        boxShadow: 3,
        fontSize: { xs: 10, sm: 13 },
        lineHeight: 1.35,
        pointerEvents: "none",
        zIndex: luna ? 2 : 1,
        // Tail: a small rotated square at the corner closest to the mouth.
        "&::after": {
          content: '""',
          position: "absolute",
          bottom: -6,
          [toLeft ? "right" : "left"]: 6,
          width: 10,
          height: 10,
          bgcolor: "inherit",
          borderRight: "1px solid",
          borderBottom: "1px solid",
          borderColor: "inherit",
          transform: "rotate(45deg)",
        },
      }}
    >
      {text ?? (
        <Box component="span" sx={{ display: "inline-flex", gap: "3px", letterSpacing: 1, fontWeight: 700 }}>
          {[0, 1, 2].map((dot) => (
            <Box key={dot} component="span" sx={{ animation: `${dots} 1.2s ${dot * 0.2}s infinite` }}>
              •
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

type SceneBubblesProps = {
  luna: SceneSpeaker;
  student: SceneSpeaker;
  /** Luna's last line, or null while she is answering ("…"). Undefined hides it. */
  lunaText?: string | null;
  /** The student's last line. Empty hides it. */
  studentText?: string;
};

/** Who is talking in the picture: Luna's and the student's last lines as bubbles. */
export function SceneBubbles({ luna, student, lunaText, studentText }: SceneBubblesProps) {
  return (
    <>
      {studentText ? <SceneBubble
          key={`s-${studentText}`}
          at={student}
          text={studentText}
          tone="student"
          // Luna already answered: on phones only her bubble is shown.
          hideOnPhone={Boolean(lunaText)}
        /> : null}
      {lunaText !== undefined ? (
        <SceneBubble key={`l-${lunaText ?? "…"}`} at={luna} text={lunaText} tone="luna" />
      ) : null}
    </>
  );
}
