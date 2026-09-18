/**
 * Gift vouchers — admin-issued after being paid in cash or by bank
 * transfer, same reasoning as src/lib/packages.ts (no online payment on
 * this site). A code is redeemed toward one booking at full value only;
 * there's no partial redemption or change given.
 */

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous chars, matches publicCode style

export function generateGiftCode(): string {
  let code = "";
  for (let i = 0; i < 10; i++) {
    if (i === 4) code += "-";
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `GIFT-${code}`;
}

export class GiftCodeInvalidError extends Error {
  constructor(message = "That gift code isn't valid.") {
    super(message);
  }
}
