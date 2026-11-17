"use client";

import Link from "next/link";
import Button from "@mui/material/Button";
import type { ButtonProps } from "@mui/material/Button";

type LinkButtonProps = Omit<ButtonProps<"a">, "component"> & {
  href: string;
};

/**
 * MUI Button wired to the Next.js Link component. This lives in a Client
 * Component so Server Components can use it without passing a component
 * reference across the server/client boundary.
 */
export function LinkButton({ href, ...props }: LinkButtonProps) {
  return <Button component={Link} href={href} {...props} />;
}
