import "server-only";
import { clientIpHeaders } from "@/lib/client-ip";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./db";
import { sendEmail } from "./email";
import { consumeRateLimit, hashIdentifier } from "./rate-limit";

const appUrl = process.env.BETTER_AUTH_URL ?? process.env.APP_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  appName: "Estate",
  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [appUrl],
  database: prismaAdapter(prisma, { provider: "postgresql", transaction: true }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 30,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Estate password",
        text:
          `Hello ${user.name},\n\nSomeone (hopefully you) asked to reset your Estate password. ` +
          `Open this link within 30 minutes to choose a new password:\n\n${url}\n\n` +
          `If you did not ask for this, you can ignore this email — your password will not change.`,
      });
    },
  },
  user: {
    additionalFields: {
      // `input: false` means these can never be set from a sign-up or update-user request.
      role: { type: "string", required: false, defaultValue: "TENANT", input: false },
      status: { type: "string", required: false, defaultValue: "ACTIVE", input: false },
      phoneNumber: { type: "string", required: false, input: false },
      locale: { type: "string", required: false, defaultValue: "en", input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14, // 14 days
    updateAge: 60 * 60 * 24, // refresh daily while active
    freshAge: 60 * 15,
  },
  rateLimit: {
    enabled: process.env.NODE_ENV !== "test" || process.env.AUTH_RATE_LIMIT_IN_TESTS === "true",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60 * 5, max: 8 },
      "/sign-up/email": { window: 60 * 60, max: 6 },
      "/request-password-reset": { window: 60 * 60, max: 5 },
      "/forget-password": { window: 60 * 60, max: 5 },
      "/reset-password": { window: 60 * 15, max: 10 },
      "/change-password": { window: 60 * 15, max: 8 },
    },
    customStorage: {
      consume: (key, rule) => consumeRateLimit(prisma, `auth:${hashIdentifier(key)}`, rule),
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    cookiePrefix: "dalali",
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
    ipAddress: {
      ipAddressHeaders: clientIpHeaders({
        trustProxy: process.env.TRUST_PROXY_HEADERS === "true",
        preferredHeader: process.env.CLIENT_IP_HEADER?.toLowerCase() || undefined,
      }),
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Suspended or deleted accounts cannot start new sessions.
        before: async (session) => {
          // During sign-up the user row is still inside Better Auth's uncommitted transaction,
          // so a missing row means a brand-new (ACTIVE by default) account.
          const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { status: true },
          });
          if (user && user.status !== "ACTIVE") return false;
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
