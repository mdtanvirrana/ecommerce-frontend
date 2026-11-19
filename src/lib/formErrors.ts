import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/lib/apiClient";

/**
 * Maps Laravel 422 validation errors (`ApiError.errors`) onto React Hook Form fields
 * so clear error messages appear directly below every invalid field.
 * Returns true if at least one field error was applied.
 */
export function applyApiErrorsToForm<TFieldValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TFieldValues>,
  allowedFields?: readonly string[],
): boolean {
  if (!(error instanceof ApiError) || !error.errors) {
    return false;
  }

  let applied = false;
  for (const [rawKey, messages] of Object.entries(error.errors)) {
    const firstMessage = Array.isArray(messages) ? messages[0] : String(messages ?? "");
    if (!firstMessage) continue;

    // Normalize nested dot keys like "role_ids.0" -> "role_ids"
    const normalizedKey = rawKey.includes(".") ? rawKey.split(".")[0] : rawKey;

    if (allowedFields && !allowedFields.includes(normalizedKey)) {
      continue;
    }

    setError(normalizedKey as FieldPath<TFieldValues>, {
      type: "server",
      message: firstMessage,
    });
    applied = true;
  }

  return applied;
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof ApiError) {
    if (error.message) return error.message;
    const firstFieldErrors = Object.values(error.errors)[0];
    if (firstFieldErrors?.[0]) return firstFieldErrors[0];
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
