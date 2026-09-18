import { describe, it, expect } from "vitest";
import {
  renderEmailTemplate,
  EMAIL_TEMPLATE_DEFAULTS,
  EMAIL_TEMPLATE_DEFAULTS_FR,
  EMAIL_TEMPLATE_DEFAULTS_NL,
  EMAIL_TEMPLATE_KEYS,
  TRANSLATABLE_EMAIL_KEYS,
} from "@/lib/email-template-defaults";

describe("renderEmailTemplate", () => {
  it("substitutes every matching {{variable}} in the subject and body", () => {
    const result = renderEmailTemplate(
      { subject: "Hi {{name}}", bodyHtml: "<p>Hello {{name}}, ref {{ref}}</p>" },
      { name: "Alex", ref: "NB-1234567" },
    );
    expect(result.subject).toBe("Hi Alex");
    expect(result.bodyHtml).toBe("<p>Hello Alex, ref NB-1234567</p>");
  });

  it("leaves a placeholder with no matching variable untouched, rather than blanking it", () => {
    const result = renderEmailTemplate(
      { subject: "Hi {{name}}", bodyHtml: "<p>{{typoedVar}}</p>" },
      { name: "Alex" },
    );
    expect(result.bodyHtml).toBe("<p>{{typoedVar}}</p>");
  });

  it("substitutes the same variable wherever it repeats", () => {
    const result = renderEmailTemplate(
      { subject: "{{name}}", bodyHtml: "<p>{{name}} and {{name}} again</p>" },
      { name: "Alex" },
    );
    expect(result.bodyHtml).toBe("<p>Alex and Alex again</p>");
  });

  it("supports an empty-string variable value (not the same as missing)", () => {
    const result = renderEmailTemplate({ subject: "s", bodyHtml: "<p>note: {{note}}</p>" }, { note: "" });
    expect(result.bodyHtml).toBe("<p>note: </p>");
  });
});

describe("EMAIL_TEMPLATE_DEFAULTS", () => {
  it("has a default for every declared template key", () => {
    for (const key of EMAIL_TEMPLATE_KEYS) {
      expect(EMAIL_TEMPLATE_DEFAULTS[key]).toBeDefined();
    }
  });

  it("every declared variable actually appears in the subject or body", () => {
    for (const key of EMAIL_TEMPLATE_KEYS) {
      const def = EMAIL_TEMPLATE_DEFAULTS[key];
      for (const variable of def.variables) {
        const token = `{{${variable}}}`;
        expect(def.subject.includes(token) || def.bodyHtml.includes(token)).toBe(true);
      }
    }
  });
});

describe("EMAIL_TEMPLATE_DEFAULTS_FR / _NL", () => {
  it("excludes admin_booking_notification — that email lands in Michelle's own inbox, never a client's", () => {
    expect(EMAIL_TEMPLATE_DEFAULTS_FR.admin_booking_notification).toBeUndefined();
    expect(EMAIL_TEMPLATE_DEFAULTS_NL.admin_booking_notification).toBeUndefined();
    expect(TRANSLATABLE_EMAIL_KEYS).not.toContain("admin_booking_notification");
  });

  it("every translated template still uses the same {{variables}} as the English default", () => {
    for (const key of TRANSLATABLE_EMAIL_KEYS) {
      const en = EMAIL_TEMPLATE_DEFAULTS[key];
      for (const dict of [EMAIL_TEMPLATE_DEFAULTS_FR, EMAIL_TEMPLATE_DEFAULTS_NL]) {
        const translated = dict[key];
        if (!translated) continue;
        for (const variable of en.variables) {
          const token = `{{${variable}}}`;
          expect(translated.subject.includes(token) || translated.bodyHtml.includes(token)).toBe(true);
        }
      }
    }
  });
});
