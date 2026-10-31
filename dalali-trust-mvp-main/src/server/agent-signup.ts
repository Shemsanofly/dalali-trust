import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "./env";
import { AppError } from "./errors";

/** Agent self-registration is reserved for Estate company members. */
export function assertAgentCompanyCode(role: string, code?: string): void {
  if (role !== "AGENT") return;
  const submitted = code?.trim();
  const message = !submitted ? "Enter the company secret code." : "The company secret code is incorrect.";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!submitted || !timingSafeEqual(digest(submitted), digest(env().AGENT_COMPANY_SECRET_CODE))) {
    throw new AppError("VALIDATION", message, { companySecretCode: [message] });
  }
}
