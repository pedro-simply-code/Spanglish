import type { ReactNode } from "react";
import Link from "next/link";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background px-4 py-12">
      <p className="mb-10 text-2xl font-bold tracking-tight text-primary">
        <Link href="/">Spanglish</Link>
      </p>
      <div className="w-full max-w-md rounded-xl bg-surface p-8 shadow-modern">
        <header className="mb-8 space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-[#2a3547]">{title}</h1>
          <p className="text-sm text-[#5a6a85]">{description}</p>
        </header>
        {children}
        {footer ? (
          <footer className="mt-8 border-t border-[#e5eaef] pt-6 text-center text-sm text-[#5a6a85]">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
