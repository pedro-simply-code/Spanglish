import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { IconMessageLanguage } from "@tabler/icons-react";

const sizeMap = {
  sm: { box: 32, icon: 18, fontSize: 18, radius: "8px", gap: 1 },
  md: { box: 40, icon: 22, fontSize: 20, radius: "10px", gap: 1.25 },
  lg: { box: 48, icon: 26, fontSize: 24, radius: "12px", gap: 1.5 },
} as const;

export type SpanglishLogoProps = {
  href?: string;
  showWordmark?: boolean;
  size?: keyof typeof sizeMap;
  /** Sidebar collapsed: icon only, centered */
  iconOnly?: boolean;
};

function LogoMark({ size = "md" }: { size?: keyof typeof sizeMap }) {
  const dim = sizeMap[size];
  return (
    <Box
      aria-hidden
      sx={{
        width: dim.box,
        height: dim.box,
        flexShrink: 0,
        borderRadius: dim.radius,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        background: "linear-gradient(135deg, #FA896B 0%, #F48162 55%, #0074BA 100%)",
        boxShadow: "0 4px 14px rgba(250, 137, 107, 0.35)",
      }}
    >
      <IconMessageLanguage size={dim.icon} stroke={1.75} />
    </Box>
  );
}

function LogoWrap({ href, children }: { href?: string; children: ReactNode }) {
  if (!href) return <>{children}</>;
  return (
    <Box
      component="a"
      href={href}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {children}
    </Box>
  );
}

/** Conversation + language mark for marketing and dashboard chrome. */
export function SpanglishLogo({
  href = "/",
  showWordmark = true,
  size = "md",
  iconOnly = false,
}: SpanglishLogoProps) {
  const dim = sizeMap[size];
  const wordmark = !iconOnly && showWordmark;

  return (
    <LogoWrap href={href}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: iconOnly ? "center" : "flex-start",
          gap: wordmark ? dim.gap : 0,
          overflow: "hidden",
        }}
      >
        <LogoMark size={size} />
        {wordmark ? (
          <Typography
            component="span"
            fontWeight={800}
            letterSpacing="-0.02em"
            color="text.primary"
            sx={{ fontSize: dim.fontSize, whiteSpace: "nowrap" }}
          >
            Spanglish
          </Typography>
        ) : null}
      </Box>
    </LogoWrap>
  );
}