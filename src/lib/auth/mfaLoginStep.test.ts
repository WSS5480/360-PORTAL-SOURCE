import { describe, expect, it } from "vitest";
import { groupedTotpSecret, mfaStepAfterPassword, totpQrImageSrc } from "./mfaLoginStep";

describe("mfaStepAfterPassword", () => {
  it("continues when the session is already AAL2", () => {
    expect(mfaStepAfterPassword({ currentLevel: "aal2", nextLevel: "aal2" })).toBe("done");
  });

  it("challenges when a verified authenticator already exists", () => {
    expect(mfaStepAfterPassword({ currentLevel: "aal1", nextLevel: "aal2" })).toBe("challenge");
  });

  it("does not send an already-enrolled user into QR setup if factor listing is empty", () => {
    expect(mfaStepAfterPassword({ currentLevel: "aal1", nextLevel: "aal2" })).toBe("challenge");
  });

  it("enrolls when no authenticator is configured", () => {
    expect(mfaStepAfterPassword({ currentLevel: "aal1", nextLevel: "aal1" })).toBe("enroll");
    expect(mfaStepAfterPassword(null)).toBe("enroll");
  });
});

describe("totp display helpers", () => {
  it("groups the manual secret for easier phone entry", () => {
    expect(groupedTotpSecret("ABCD1234EFGH")).toBe("ABCD 1234 EFGH");
  });

  it("encodes SVG QR codes without using btoa", () => {
    const src = totpQrImageSrc("<svg xmlns='http://www.w3.org/2000/svg'></svg>");
    expect(src.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
  });
});
