import { classifyApiErrorResponse } from "../../src/utils/http-error";
import fs from "node:fs";
import path from "node:path";

function response(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(
    typeof body === "string" ? body : JSON.stringify(body),
    { status, headers },
  );
}

describe("shared API HTTP recovery classifier", () => {
  it("parses a bounded error body exactly once", async () => {
    const text = jest.fn().mockResolvedValue(
      JSON.stringify({
        error: {
          code: "FORBIDDEN",
          upgrade_url: "https://www.oilpriceapi.com/pricing",
        },
      }),
    );
    const json = jest.fn();
    const fixture = {
      status: 403,
      headers: new Headers(),
      text,
      json,
    } as unknown as Response;

    await classifyApiErrorResponse(fixture);
    expect(text).toHaveBeenCalledTimes(1);
    expect(json).not.toHaveBeenCalled();
  });

  it.each([
    [
      "API_ACCESS_SUSPENDED",
      {
        error: {
          code: "API_ACCESS_SUSPENDED",
          upgrade_url: "https://www.oilpriceapi.com/pricing?suspended=1",
        },
      },
      "Access suspended",
      "API_ACCESS_SUSPENDED",
      "https://www.oilpriceapi.com/support",
    ],
    [
      "EMAIL_CONFIRMATION_REQUIRED",
      {
        error: {
          code: "EMAIL_CONFIRMATION_REQUIRED",
          recovery_url:
            "https://www.oilpriceapi.com/auth/resend-confirmation",
        },
      },
      "Confirm email",
      "EMAIL_CONFIRMATION_REQUIRED",
      "https://www.oilpriceapi.com/auth/resend-confirmation",
    ],
    [
      "FORBIDDEN",
      {
        error: {
          code: "FORBIDDEN",
          upgrade_url:
            "https://www.oilpriceapi.com/pricing?feature=drilling",
        },
      },
      "Upgrade required",
      "UPGRADE_REQUIRED",
      "https://www.oilpriceapi.com/pricing?feature=drilling",
    ],
  ])(
    "maps %s for both worksheet and Test Key consumers",
    async (_name, body, label, code, recovery) => {
      const result = await classifyApiErrorResponse(response(403, body));
      expect(result.label).toBe(label);
      expect(result.code).toBe(code);
      expect(result.message).toContain(recovery);
    },
  );

  it.each([
    ["bare", {}],
    ["malformed", "{not-json"],
    [
      "untrusted recovery URL",
      {
        error: {
          code: "EMAIL_CONFIRMATION_REQUIRED",
          recovery_url: "https://attacker.invalid/confirm",
        },
      },
    ],
  ])("fails a %s 403 safely", async (_name, body) => {
    const result = await classifyApiErrorResponse(response(403, body));
    expect(result.label).toBe(
      _name === "untrusted recovery URL" ? "Confirm email" : "Access denied",
    );
    expect(result.message).not.toContain("attacker.invalid");
    expect(result.message).toContain("oilpriceapi.com");
  });

  it("turns Retry-After into an actionable 429 recovery", async () => {
    const result = await classifyApiErrorResponse(
      response(429, {}, { "Retry-After": "120" }),
    );
    expect(result.code).toBe("RATE_LIMITED");
    expect(result.message).toMatch(/retry after about 2 minutes/i);
  });

  it("keeps custom functions and Test Key on the same classifier", () => {
    const root = path.join(__dirname, "..", "..");
    for (const file of [
      "src/functions/functions.ts",
      "src/taskpane/taskpane.ts",
    ]) {
      const source = fs.readFileSync(path.join(root, file), "utf8");
      expect(source).toMatch(/import \{ classifyApiErrorResponse \}/);
      expect(source).toMatch(/await classifyApiErrorResponse\(response\)/);
      expect(source).not.toMatch(/status === 403/);
    }
  });
});
