import { describe, expect, it } from "vitest";
import { isLocalHost, publicOrigin } from "./origin";

describe("publicOrigin", () => {
  it("prefers APP_URL, without a trailing slash", () => {
    expect(publicOrigin(new Headers({ host: "internal:3000" }), { APP_URL: "https://sci.example.com/" })).toBe(
      "https://sci.example.com",
    );
  });

  it("uses forwarded host and protocol behind a proxy", () => {
    const headers = new Headers({ host: "10.0.0.5:3000", "x-forwarded-host": "sci.example.com", "x-forwarded-proto": "https" });
    expect(publicOrigin(headers, {})).toBe("https://sci.example.com");
  });

  it("guesses http for local hosts and https otherwise", () => {
    expect(publicOrigin(new Headers({ host: "localhost:3000" }), {})).toBe("http://localhost:3000");
    expect(publicOrigin(new Headers({ host: "sci.example.com" }), {})).toBe("https://sci.example.com");
  });
});

describe("isLocalHost", () => {
  it("spots addresses only this computer can reach", () => {
    expect(isLocalHost("http://localhost:3000")).toBe(true);
    expect(isLocalHost("127.0.0.1:3100")).toBe(true);
    expect(isLocalHost("http://[::1]:3000")).toBe(true);
    expect(isLocalHost("https://sci.example.com")).toBe(false);
    expect(isLocalHost("https://localhost.example.com")).toBe(false);
  });
});
