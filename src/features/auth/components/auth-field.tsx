import type { ReactNode } from "react";

type AuthFieldProps = {
  id: string;
  label: string;
  type?: "email" | "password" | "text";
  placeholder?: string;
  autoComplete?: string;
  labelAside?: ReactNode;
};

export function AuthField({
  id,
  label,
  type = "text",
  placeholder,
  autoComplete,
  labelAside,
}: AuthFieldProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-[#2a3547]"
        >
          {label}
        </label>
        {labelAside}
      </div>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="block w-full rounded-lg border border-[#dfe5ef] bg-surface px-3 py-2.5 text-sm text-[#2a3547] shadow-modern-soft outline-none transition placeholder:text-[#7c8fac] focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
