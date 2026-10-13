/**
 * Application errors carry a safe, user-facing message. Anything else that is thrown
 * is treated as an internal error and its details are never shown to the user.
 */
export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INVALID_STATE";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthenticated = () => new AppError("UNAUTHENTICATED", "Please sign in to continue.");
export const forbidden = (msg = "You do not have permission to do that.") => new AppError("FORBIDDEN", msg);
export const notFound = (msg = "Not found.") => new AppError("NOT_FOUND", msg);
export const invalidState = (msg: string) => new AppError("INVALID_STATE", msg);
export const rateLimited = () =>
  new AppError("RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.");

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
