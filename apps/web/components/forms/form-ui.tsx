import type { ReactNode } from "react";

export function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {error ? <small className="form-error">{error}</small> : null}
    </label>
  );
}

export function FormStatusMessage({
  tone,
  message,
}: {
  tone: "loading" | "success" | "error";
  message: string;
}) {
  return <div className={`form-status form-status--${tone}`}>{message}</div>;
}
