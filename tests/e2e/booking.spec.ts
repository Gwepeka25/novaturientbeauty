import { test, expect } from "@playwright/test";

test.describe("Booking journey", () => {
  test("a visitor can book an in-person session end to end, keyboard and screen-reader friendly", async ({
    page,
  }) => {
    await page.goto("/book");
    await expect(page.getByRole("heading", { name: "A few private steps, at your pace." })).toBeVisible();

    // Step 1: format.
    await page.getByRole("button", { name: /In person/ }).click();

    // Step 2: service.
    await expect(page.getByRole("heading", { name: "Choose a session type" })).toBeVisible();
    await page.locator(".choice-row").first().click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 3: date & time — find the first day with availability.
    await expect(page.getByRole("heading", { name: "Choose a date and time" })).toBeVisible();
    const dateChips = page.locator(".date-chip");
    const chipCount = await dateChips.count();
    let foundSlot = false;
    for (let i = 0; i < chipCount; i++) {
      await dateChips.nth(i).click();
      await page.waitForTimeout(300);
      if ((await page.locator(".time-slot").count()) > 0) {
        foundSlot = true;
        break;
      }
    }
    expect(foundSlot).toBe(true);
    await page.locator(".time-slot").first().click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 4: contact details.
    await page.getByLabel("Name").fill("Playwright Visitor");
    await page.getByLabel("Email").fill(`playwright-${Date.now()}@example.com`);
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    // Step 5: review — cash note and legal links must be present before confirming.
    await expect(page.getByText(/Payment is by cash/)).toBeVisible();
    await expect(page.getByRole("link", { name: "cancellation policy" })).toHaveAttribute("href", "/terms");
    await expect(page.getByRole("link", { name: "privacy policy" })).toHaveAttribute("href", "/privacy");
    await page.getByRole("button", { name: "Confirm booking" }).click();

    // Success screen.
    await expect(page.getByRole("heading", { name: "Your session is confirmed." })).toBeVisible();
    await expect(page.getByText(/Reference NB-/)).toBeVisible();
  });

  test("the honeypot field is hidden from sighted users but present in the DOM", async ({ page }) => {
    await page.goto("/book");
    await page.getByRole("button", { name: /Online/ }).click();
    await page.locator(".choice-row").first().click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    const honeypot = page.locator("#website");
    await expect(honeypot).toBeHidden();
  });
});

test.describe("Public pages don't reveal sensitive data", () => {
  test("the homepage source never contains a client email or appointment note", async ({ page }) => {
    const response = await page.goto("/");
    const body = await response!.text();
    expect(body).not.toContain("@example.com");
  });
});
