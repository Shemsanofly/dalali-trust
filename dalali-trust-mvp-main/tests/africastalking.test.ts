// Real Africa's Talking provider against the sandbox, with the HTTP call mocked.
process.env.SMS_PROVIDER = "africastalking";
process.env.AT_USERNAME = "sandbox";
process.env.AT_API_KEY = "atsk_test_key";
process.env.AT_SENDER_ID = "";

import { afterEach, describe, expect, it, vi } from "vitest";
import { africasTalkingBaseUrl, sendSms } from "@/server/sms";

afterEach(() => vi.restoreAllMocks());

function mockFetch(status: number, body: unknown) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(JSON.stringify(body), { status }) as Response);
}

describe("Africa's Talking SMS", () => {
  it("uses the sandbox API for the sandbox username and the live API otherwise", () => {
    expect(africasTalkingBaseUrl("sandbox")).toBe("https://api.sandbox.africastalking.com");
    expect(africasTalkingBaseUrl("dalalitrust")).toBe("https://api.africastalking.com");
  });

  it("posts the message to the sandbox messaging API", async () => {
    const fetchMock = mockFetch(201, {
      SMSMessageData: {
        Message: "Sent to 1/1 Total Cost: TZS 0",
        Recipients: [{ statusCode: 101, number: "+255712345678", status: "Success", messageId: "ATXid_1" }],
      },
    });
    expect(await sendSms("+255712345678", "Habari")).toEqual({ ok: true, messageId: "ATXid_1" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.sandbox.africastalking.com/version1/messaging");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ apiKey: "atsk_test_key", Accept: "application/json" });
    const body = init?.body as URLSearchParams;
    expect(body.get("username")).toBe("sandbox");
    expect(body.get("to")).toBe("+255712345678");
    expect(body.get("message")).toBe("Habari");
    expect(body.has("from")).toBe(false);
  });

  it("reports rejected recipients and HTTP errors", async () => {
    mockFetch(201, {
      SMSMessageData: { Recipients: [{ statusCode: 403, status: "InvalidPhoneNumber", number: "+2551" }] },
    });
    expect(await sendSms("+2551", "x")).toEqual({ ok: false, error: "InvalidPhoneNumber (403)" });

    vi.restoreAllMocks();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("The supplied authentication is invalid", { status: 401 }),
    );
    expect(await sendSms("+255712345678", "x")).toEqual({
      ok: false,
      error: "HTTP 401: The supplied authentication is invalid",
    });
  });
});
