import type { ChangeEventHandler, ReactNode } from "react";

type AuthFieldProps = {
  id: string;
  label: string;
  type?: "email" | "password" | "text";
  placeholder?: string;
  autoComplete?: string;
  labelAside?: ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
  hint?: string;
  maxLength?: number;
  inputMode?: "email" | "numeric" | "text";
  autoFocus?: boolean;
};

export function AuthField({
  id,
  label,
  type = "text",
  placeholder,
  autoComplete,
  labelAside,
  value,
  defaultValue,
  onChange,
  required = true,
  disabled = false,
  error,
  hint,
  maxLength,
  inputMode,
  autoFocus,
}: AuthFieldProps) {
  const descriptionId = error
    ? `${id}-error`
    : hint
      ? `${id}-hint`
      : undefined;

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
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        inputMode={inputMode}
        autoFocus={autoFocus}
        aria-invalid={Boolean(error)}
        aria-describedby={descriptionId}
        className={`block w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-[#2a3547] shadow-modern-soft outline-none transition placeholder:text-[#7c8fac] focus:ring-2 disabled:cursor-not-allowed disabled:bg-[#f2f6fa] ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-200"
            : "border-[#dfe5ef] focus:border-primary focus:ring-primary/20"
        }`}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-[#7c8fac]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
