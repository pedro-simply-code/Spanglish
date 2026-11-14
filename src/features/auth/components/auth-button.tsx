import type { ReactNode } from "react";

type AuthButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary";
};

const variantClasses = {
  primary:
    "bg-primary text-white shadow-modern-soft hover:bg-[#4570ea]",
  secondary:
    "border border-[#dfe5ef] bg-surface text-[#2a3547] shadow-modern-soft hover:bg-[#f6f9fc]",
} as const;

export function AuthButton({ children, variant = "primary" }: AuthButtonProps) {
  return (
    <button
      type="button"
      className={`flex h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors ${variantClasses[variant]}`}
    >
      {children}
    </button>
  );
}
