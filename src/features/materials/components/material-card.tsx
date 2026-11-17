import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  IconArrowRight,
  IconClock,
  IconFileText,
  IconMicrophone,
  IconPlayerPlay,
  IconVideo,
} from "@tabler/icons-react";
import { LinkButton } from "@/components/ui/link-button";
import { MaterialKindChip } from "@/features/materials/components/material-kind-chip";
import { formatMaterialDate } from "@/features/materials/format";
import type { Material } from "@/features/materials/types";

const kindIcons = {
  document: IconFileText,
  link: IconArrowRight,
  video: IconVideo,
  audio: IconMicrophone,
  form: IconFileText,
  recording: IconPlayerPlay,
} as const;

type MaterialCardProps = {
  material: Material;
  href: string;
  dueAt?: string;
  /** Show who can see it (teacher and staff views). */
  showVisibility?: boolean;
};

export function visibilityLabel(material: Material) {
  if (material.visibility === "global") {
    if (material.moderation === "pending") return { label: "Waiting for review", color: "warning" as const };
    if (material.moderation === "rejected") return { label: "Not approved", color: "error" as const };
    return { label: "Academy library", color: "success" as const };
  }
  if (material.visibility === "shared") return { label: "Shared with teachers", color: "info" as const };
  return { label: "Private", color: "default" as const };
}

export function MaterialCard({ material, href, dueAt, showVisibility = false }: MaterialCardProps) {
  const Icon = kindIcons[material.kind];

  return (
    <Card elevation={9} sx={{ height: "100%" }}>
      <CardContent sx={{ p: "24px", height: "100%" }}>
        <Stack spacing={2} sx={{ height: "100%" }}>
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            alignItems="center"
          >
            <MaterialKindChip kind={material.kind} />
            <Chip label={material.level} size="small" variant="outlined" />
            {showVisibility && material.visibility ? (
              <Chip size="small" color={visibilityLabel(material).color} label={visibilityLabel(material).label} />
            ) : null}
            {material.duration ? (
              <Chip
                label={material.duration}
                size="small"
                variant="outlined"
                icon={<IconClock size={13} />}
              />
            ) : null}
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box
              sx={{
                width: 42,
                height: 42,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "primary.light",
                color: "primary.main",
              }}
            >
              <Icon size={20} />
            </Box>
            <Box minWidth={0}>
              <Typography variant="h6">{material.title}</Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {material.description}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.5}>
            {material.tags.map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                sx={{ height: 22, fontSize: 11 }}
              />
            ))}
          </Stack>

          <Box flexGrow={1} />

          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">
              {material.ownerName} · Updated{" "}
              {formatMaterialDate(material.updatedAt)}
            </Typography>
            {dueAt ? (
              <Typography variant="caption" color="warning.main">
                Due {formatMaterialDate(dueAt)}
              </Typography>
            ) : null}
            {material.questionCount ? (
              <Typography variant="caption" color="text.secondary">
                {material.questionCount} questions ·{" "}
                {material.estimatedMinutes ?? 5} min
              </Typography>
            ) : null}
            <LinkButton
              href={href}
              size="small"
              variant="outlined"
              endIcon={<IconArrowRight size={14} />}
            >
              {material.kind === "form" ? "Open practice" : "Open material"}
            </LinkButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
