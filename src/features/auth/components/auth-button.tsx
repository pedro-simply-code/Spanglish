import type { ButtonHTMLAttributes, ReactNode } from "react";

type AuthButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
> & {
  children: ReactNode;
  variant?: "primary" | "secondary";
  loading?: boolean;
  className?: string;
};

const variantClasses = {
  primary: "bg-primary text-white shadow-modern-soft hover:bg-primary-hover",
  secondary:
    "border border-[#dfe5ef] bg-surface text-[#2a3547] shadow-modern-soft hover:bg-[#f6f9fc]",
} as const;

export function AuthButton({
  children,
  variant = "primary",
  loading = false,
  disabled,
  className,
  type = "submit",
  ...props
}: AuthButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      className={`flex h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${variantClasses[variant]} ${className ?? ""}`}
      {...props}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {children}
    </button>
  );
}
