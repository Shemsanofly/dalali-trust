import { describe, expect, it } from "vitest";
import { parseEatLocalDateTime } from "@/lib/dates";
import { translateServerMessage } from "@/i18n/server-messages";
import { coordinatesFromForm } from "@/lib/coordinates";
import { formatTZS, moveInCost, parseTZS } from "@/lib/money";
import { normalizeTzPhone } from "@/lib/phone";
import { makeListingSlug } from "@/lib/slug";
import { sanitizeMetadata } from "@/server/audit";
import { detectFileType } from "@/server/uploads";
import { assertSafeKey } from "@/server/storage/types";

describe("money", () => {
  it("formats integer shillings and refuses floats", () => {
    expect(formatTZS(350000)).toBe("TSh 350,000");
    expect(() => formatTZS(1.5)).toThrow();
  });
  it("parses user input", () => {
    expect(parseTZS("350,000")).toBe(350000);
    expect(parseTZS("12.5")).toBeNull();
    expect(parseTZS("-3")).toBeNull();
  });
  it("computes the move-in cost with integer arithmetic", () => {
    expect(
      moveInCost({
        rentAmount: 150000,
        advanceMonths: 6,
        depositAmount: 150000,
        agentFeeAmount: 150000,
        charges: [
          { amount: 20000, frequency: "ONE_TIME" },
          { amount: 10000, frequency: "MONTHLY" },
        ],
      }),
    ).toEqual({ advanceRent: 900000, oneTimeCharges: 20000, monthlyCharges: 10000, total: 1220000 });
  });
});

describe("phone numbers", () => {
  it.each([
    ["0712 345 678", "+255712345678"],
    ["+255 754-111-222", "+255754111222"],
    ["255688000111", "+255688000111"],
  ])("normalizes %s", (input, expected) => expect(normalizeTzPhone(input)).toBe(expected));
  it.each(["12345", "0212345678", "+254712345678", "abc"])("rejects %s", (input) =>
    expect(normalizeTzPhone(input)).toBeNull(),
  );
});

describe("dates", () => {
  it("interprets datetime-local values as East Africa Time", () => {
    expect(parseEatLocalDateTime("2026-11-01T10:30")!.toISOString()).toBe("2026-11-01T07:30:00.000Z");
    expect(parseEatLocalDateTime("not a date")).toBeNull();
  });
});

describe("security helpers", () => {
  it("redacts sensitive keys from audit metadata", () => {
    expect(sanitizeMetadata({ password: "x", token: "y", nidaNumber: "z", ok: 1 })).toEqual({
      password: "[redacted]",
      token: "[redacted]",
      nidaNumber: "[redacted]",
      ok: 1,
    });
  });
  it("detects file types from content, not names", () => {
    expect(detectFileType(Buffer.from("%PDF-1.7 ..."))).toBe("application/pdf");
    expect(detectFileType(Buffer.from("<svg onload=alert(1)>"))).toBeNull();
  });
  it("rejects path traversal in storage keys", () => {
    expect(() => assertSafeKey("../etc/passwd")).toThrow();
    expect(() => assertSafeKey("/abs/path")).toThrow();
    expect(() => assertSafeKey("evidence/2026/10/abc.pdf")).not.toThrow();
  });
  it("builds URL-safe slugs", () => {
    expect(makeListingSlug("Nyumba nzuri <script>", "Mbezi Beach")).toMatch(
      /^nyumba-nzuri-script-mbezi-beach-[a-z0-9]{6}$/,
    );
  });
});

describe("map coordinates pasted by advertisers", () => {
  it("splits a pasted pair or a Google Maps link into latitude and longitude", () => {
    expect(coordinatesFromForm("-6.7735, 39.2195", "")).toEqual(["-6.7735", "39.2195"]);
    expect(coordinatesFromForm("-6.7735 39.2195", undefined)).toEqual(["-6.7735", "39.2195"]);
    expect(coordinatesFromForm("https://www.google.com/maps/place/Sinza/@-6.7809,39.2276,15z", "")).toEqual([
      "-6.7809",
      "39.2276",
    ]);
    expect(coordinatesFromForm("https://maps.google.com/?q=-6.8,39.28", "")).toEqual(["-6.8", "39.28"]);
  });
  it("leaves separate or unrecognised values alone", () => {
    expect(coordinatesFromForm("-6.77", "39.22")).toEqual(["-6.77", "39.22"]);
    expect(coordinatesFromForm("near the market", "")).toEqual(["near the market", ""]);
    expect(coordinatesFromForm(undefined, undefined)).toEqual([undefined, undefined]);
  });
});

describe("server messages in Swahili", () => {
  it("translates known messages and templated field errors", () => {
    expect(translateServerMessage("Photos uploaded.", "sw")).toBe("Picha zimepakiwa.");
    expect(translateServerMessage("Title must be at least 8 characters", "sw")).toBe(
      "Kichwa lazima iwe na angalau herufi 8",
    );
    expect(translateServerMessage("Monthly rent must be greater than zero", "sw")).toBe(
      "Kodi ya mwezi lazima iwe zaidi ya sifuri",
    );
    expect(translateServerMessage("District is required", "sw")).toBe("Wilaya inahitajika");
    expect(translateServerMessage("A listing can have at most 12 photos.", "sw")).toBe(
      "Tangazo linaweza kuwa na picha zisizozidi 12.",
    );
  });
  it("keeps English as is and falls back to English for unknown messages", () => {
    expect(translateServerMessage("Photos uploaded.", "en")).toBe("Photos uploaded.");
    expect(translateServerMessage("Decision recorded.", "sw")).toBe("Decision recorded.");
  });
});
