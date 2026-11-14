import type { ComponentProps } from "react";
import Link from "next/link";

type AuthLinkProps = ComponentProps<typeof Link> & {
  variant?: "primary" | "secondary";
};

const variantClasses = {
  primary:
    "bg-primary text-white shadow-modern-soft hover:bg-[#4570ea]",
  secondary:
    "border border-[#dfe5ef] bg-surface text-[#2a3547] shadow-modern-soft hover:bg-[#f6f9fc]",
} as const;

export function AuthLink({
  children,
  className,
  variant = "primary",
  ...props
}: AuthLinkProps) {
  return (
    <Link
      className={`flex h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors ${variantClasses[variant]} ${className ?? ""}`}
      {...props}
    >
      {children}
    </Link>
  );
}
