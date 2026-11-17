import type { ReactNode } from "react";
import Card from "@mui/material/Card";

/** Modernize-style flat card for marketing sections (border, optional shadow). */
export function MarketingBlankCard({
  children,
  sx,
  elevation = 9,
}: {
  children: ReactNode;
  sx?: object;
  elevation?: number;
}) {
  return (
    <Card
      elevation={elevation}
      sx={{
        p: 0,
        border: "1px solid",
        borderColor: "divider",
        position: "relative",
        overflow: "hidden",
        ...sx,
      }}
    >
      {children}
    </Card>
  );
}