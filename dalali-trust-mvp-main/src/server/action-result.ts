import "server-only";
import { unstable_rethrow } from "next/navigation";
import { translateServerMessage } from "@/i18n/server-messages";
import { getLocale } from "@/i18n/server";
import { isAppError } from "./errors";

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  /** Echo of submitted values so forms can be re-populated after a validation error. */
  values?: Record<string, string>;
};

export const initialActionState: ActionState = { ok: false };

/**
 * Runs a server action body and converts failures into a safe ActionState. Known
 * application errors keep their user-facing message; anything else is logged on the
 * server and replaced with a generic message, so stack traces never reach the browser.
 */
export async function runAction(
  fn: () => Promise<ActionState | void>,
  successMessage?: string,
): Promise<ActionState> {
  let state: ActionState;
  try {
    const result = await fn();
    state = result ?? { ok: true, message: successMessage };
  } catch (e) {
    unstable_rethrow(e); // let Next.js redirects / notFound propagate
    if (isAppError(e)) state = { ok: false, message: e.message, fieldErrors: e.fieldErrors };
    else {
      console.error("[action] unexpected error", e instanceof Error ? e.message : e);
      state = { ok: false, message: "Something went wrong. Please try again." };
    }
  }
  return localize(state);
}

/** Shows server messages in the visitor's language (English messages are the fallback). */
async function localize(state: ActionState): Promise<ActionState> {
  const locale = await getLocale().catch(() => "en" as const);
  if (locale === "en") return state;
  const tr = (m: string) => translateServerMessage(m, locale);
  return {
    ...state,
    message: state.message ? tr(state.message) : state.message,
    fieldErrors: state.fieldErrors
      ? Object.fromEntries(Object.entries(state.fieldErrors).map(([k, v]) => [k, v.map(tr)]))
      : state.fieldErrors,
  };
}

export function str(form: FormData, key: string): string | undefined {
  const v = form.get(key);
  return typeof v === "string" ? v : undefined;
}

export function files(form: FormData, key: string): File[] {
  return form.getAll(key).filter((v): v is File => v instanceof File && v.size > 0);
}
