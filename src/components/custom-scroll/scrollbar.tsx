"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";

type ScrollbarProps = {
  children: ReactNode;
  sx?: SxProps<Theme>;
};

/** Scroll container for sidebar and menus (native overflow; SimpleBar breaks RSC). */
export function Scrollbar({ children, sx }: ScrollbarProps) {
  return <Box sx={{ overflow: "auto", ...sx }}>{children}</Box>;
}