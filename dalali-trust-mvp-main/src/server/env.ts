import "server-only";
import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
    BETTER_AUTH_URL: z.url().optional(),
    APP_URL: z.url().default("http://localhost:3000"),
    AGENT_COMPANY_SECRET_CODE: z.string().min(1).max(128).default("estate123"),
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default("./storage"),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ENDPOINT: z.url().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("false"),
    EMAIL_PROVIDER: z.enum(["console", "resend", "none"]).default("none"),
    EMAIL_FROM: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    WHATSAPP_PROVIDER: z.enum(["none", "console", "cloud"]).default("none"),
    WHATSAPP_ACCESS_TOKEN: z.string().optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
    WHATSAPP_API_VERSION: z
      .string()
      .regex(/^v\d+\.\d+$/)
      .default("v21.0"),
    SMS_PROVIDER: z.enum(["none", "console", "africastalking"]).default("none"),
    /** Africa's Talking app username. "sandbox" uses the sandbox API and simulator. */
    AT_USERNAME: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || "sandbox"),
    AT_API_KEY: z.string().optional(),
    /** Registered alphanumeric sender ID or short code. Leave empty for the shared default. */
    AT_SENDER_ID: z.string().trim().max(11).optional(),
    USSD_ENABLED: z.enum(["true", "false"]).default("false"),
    /** Secret added to the USSD callback URL (?token=...) so only Africa's Talking can call it. */
    USSD_CALLBACK_TOKEN: z.string().optional(),
    /** USSD code shown to people, e.g. "*384*12345#". Display only. */
    USSD_SERVICE_CODE: z.string().trim().max(40).optional(),
    TRUST_PROXY_HEADERS: z.enum(["true", "false"]).default("false"),
    CLIENT_IP_HEADER: z
      .string()
      .regex(/^[A-Za-z0-9-]*$/, "CLIENT_IP_HEADER must be a header name")
      .optional(),
    SUPPORT_EMAIL: z.string().optional(),
    SUPPORT_PHONE: z.string().optional(),
    SUPPORT_WHATSAPP: z.string().optional(),
    VERIFICATION_VALIDITY_DAYS: z.coerce.number().int().min(30).max(1095).default(365),
    EVIDENCE_RETENTION_DAYS: z.coerce.number().int().min(7).max(3650).default(180),
    AVAILABILITY_STALE_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE_DRIVER === "s3") {
      for (const key of ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const) {
        if (!env[key])
          ctx.addIssue({ code: "custom", path: [key], message: `${key} is required for S3 storage` });
      }
    }
    if (env.EMAIL_PROVIDER === "resend" && (!env.RESEND_API_KEY || !env.EMAIL_FROM)) {
      ctx.addIssue({
        code: "custom",
        path: ["RESEND_API_KEY"],
        message: "RESEND_API_KEY and EMAIL_FROM are required",
      });
    }
    if (env.WHATSAPP_PROVIDER === "cloud" && (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID)) {
      ctx.addIssue({
        code: "custom",
        path: ["WHATSAPP_ACCESS_TOKEN"],
        message: "WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are required",
      });
    }
    if (env.NODE_ENV === "production" && env.WHATSAPP_PROVIDER === "console") {
      ctx.addIssue({
        code: "custom",
        path: ["WHATSAPP_PROVIDER"],
        message: "console WhatsApp is not allowed in production",
      });
    }
    if (env.SMS_PROVIDER === "africastalking" && !env.AT_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["AT_API_KEY"],
        message: "AT_API_KEY is required for Africa's Talking SMS",
      });
    }
    if (env.NODE_ENV === "production" && env.SMS_PROVIDER === "console") {
      ctx.addIssue({
        code: "custom",
        path: ["SMS_PROVIDER"],
        message: "console SMS is not allowed in production",
      });
    }
    if (env.USSD_ENABLED === "true" && (env.USSD_CALLBACK_TOKEN ?? "").length < 16) {
      ctx.addIssue({
        code: "custom",
        path: ["USSD_CALLBACK_TOKEN"],
        message: "USSD_CALLBACK_TOKEN (at least 16 characters) is required when USSD is enabled",
      });
    }
    if (env.NODE_ENV === "production" && env.EMAIL_PROVIDER === "console") {
      ctx.addIssue({
        code: "custom",
        path: ["EMAIL_PROVIDER"],
        message: "console email is not allowed in production",
      });
    }
  });

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Invalid environment configuration — ${details}`);
    }
    cached = parsed.data;
  }
  return cached;
}
