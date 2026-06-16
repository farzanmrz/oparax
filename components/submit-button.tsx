"use client";

import { useFormStatus } from "react-dom";

/**
 * Design-system submit button wired to the enclosing form's pending state.
 * Shows the in-button spinner while the Server Action runs.
 */
export function SubmitButton({
  children,
  className = "",
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={`btn btn-primary${pending ? " loading" : ""}${className ? ` ${className}` : ""}`}
      disabled={pending || disabled}
    >
      <span className="ld" />
      {children}
    </button>
  );
}
