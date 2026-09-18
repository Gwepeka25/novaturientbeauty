import { describe, it, expect } from "vitest";
import { generateGiftCode, GiftCodeInvalidError } from "@/lib/gift-codes";

describe("generateGiftCode", () => {
  it("produces a code matching the GIFT-XXXX-XXXXXX shape from the no-ambiguous-chars alphabet", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateGiftCode()).toMatch(/^GIFT-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  it("is not deterministic", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateGiftCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe("GiftCodeInvalidError", () => {
  it("defaults to a generic message", () => {
    expect(new GiftCodeInvalidError().message).toBe("That gift code isn't valid.");
  });

  it("accepts a specific reason", () => {
    expect(new GiftCodeInvalidError("That gift code has expired.").message).toBe("That gift code has expired.");
  });
});
