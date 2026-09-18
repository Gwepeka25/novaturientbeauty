import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSessionsCreate = vi.fn();
const mockSessionsRetrieve = vi.fn();
const mockConstructEvent = vi.fn();

vi.mock("stripe", () => {
  // Arrow functions can't be used as constructors, so the mock needs a real
  // class here — Stripe's SDK is used as `new Stripe(secretKey)`.
  class MockStripe {
    checkout = { sessions: { create: mockSessionsCreate, retrieve: mockSessionsRetrieve } };
    webhooks = { constructEvent: mockConstructEvent };
  }
  return { default: MockStripe };
});

const { isStripeConfigured, createCheckoutSession, retrieveCheckoutSession, constructWebhookEvent } =
  await import("@/lib/stripe");

describe("isStripeConfigured", () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("is false with no secret key set", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(isStripeConfigured()).toBe(false);
  });

  it("is true once a secret key is set", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    expect(isStripeConfigured()).toBe(true);
  });
});

describe("createCheckoutSession", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mockSessionsCreate.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws when Stripe isn't configured", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    await expect(
      createCheckoutSession({
        amountCents: 7000,
        currency: "EUR",
        description: "Individual session",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        metadata: { kind: "appointment" },
      }),
    ).rejects.toThrow("Stripe is not configured.");
    expect(mockSessionsCreate).not.toHaveBeenCalled();
  });

  it("creates a checkout session with the given amount and metadata", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    mockSessionsCreate.mockResolvedValue({ id: "cs_123", url: "https://checkout.stripe.com/cs_123" });

    const result = await createCheckoutSession({
      amountCents: 7000,
      currency: "EUR",
      description: "Individual session",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
      customerEmail: "client@example.com",
      metadata: { kind: "appointment", appointmentId: "abc123" },
    });

    expect(result).toEqual({ id: "cs_123", url: "https://checkout.stripe.com/cs_123" });
    expect(mockSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        customer_email: "client@example.com",
        metadata: { kind: "appointment", appointmentId: "abc123" },
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ currency: "eur", unit_amount: 7000 }),
          }),
        ],
      }),
    );
  });

  it("throws if Stripe doesn't return a checkout URL", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    mockSessionsCreate.mockResolvedValue({ id: "cs_123", url: null });

    await expect(
      createCheckoutSession({
        amountCents: 7000,
        currency: "EUR",
        description: "Individual session",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
        metadata: {},
      }),
    ).rejects.toThrow("Stripe did not return a checkout URL.");
  });
});

describe("retrieveCheckoutSession", () => {
  const originalEnv = { ...process.env };
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("passes the session id through to Stripe", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    mockSessionsRetrieve.mockResolvedValue({ id: "cs_123", payment_status: "paid" });

    const session = await retrieveCheckoutSession("cs_123");

    expect(session).toEqual({ id: "cs_123", payment_status: "paid" });
    expect(mockSessionsRetrieve).toHaveBeenCalledWith("cs_123");
  });
});

describe("constructWebhookEvent", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws when the webhook secret isn't configured", () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(() => constructWebhookEvent("{}", "sig")).toThrow("Stripe webhook secret is not configured.");
  });

  it("delegates verification to Stripe once configured", () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_123";
    mockConstructEvent.mockReturnValue({ type: "checkout.session.completed" });

    const event = constructWebhookEvent("{}", "sig");

    expect(event).toEqual({ type: "checkout.session.completed" });
    expect(mockConstructEvent).toHaveBeenCalledWith("{}", "sig", "whsec_123");
  });
});
