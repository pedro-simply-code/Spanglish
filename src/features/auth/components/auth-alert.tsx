type AuthAlertProps = {
  tone: "error" | "success";
  children: React.ReactNode;
};

/** Inline error or success message under an auth form. */
export function AuthAlert({ tone, children }: AuthAlertProps) {
  return tone === "error" ? (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
    >
      {children}
    </p>
  ) : (
    <p
      role="status"
      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700"
    >
      {children}
    </p>
  );
}
