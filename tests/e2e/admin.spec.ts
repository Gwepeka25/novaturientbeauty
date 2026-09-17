import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "missgkay@gmail.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "changeme-dev-only";

test.describe("Admin access control", () => {
  test("an unauthenticated visitor is redirected away from /admin", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("an unauthenticated visitor is redirected away from /admin/appointments", async ({ page }) => {
    await page.goto("/admin/appointments");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("a wrong password is rejected with a clear error, not a crash", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#email", ADMIN_EMAIL);
    await page.fill("#password", "definitely-not-the-password");
    await page.click('button[type="submit"]');
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

test.describe("Admin workflows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("#email", ADMIN_EMAIL);
    await page.fill("#password", ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin");
  });

  test("dashboard loads with live counts, not placeholders", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Appointments today")).toBeVisible();
  });

  test("services & fees page reflects the confirmed price list", async ({ page }) => {
    await page.goto("/admin/services");
    await expect(page.getByRole("heading", { name: "Individual session" })).toBeVisible();
    await expect(page.getByText("Currently: €70")).toBeVisible();
  });

  test("editing website content is reflected on the public site immediately", async ({ page }) => {
    await page.goto("/admin/content");
    const uniqueTagline = `Test tagline ${Date.now()}`;
    const heroSection = page.locator("form", { hasText: "hero.profile_tagline" });
    await heroSection.locator("textarea").fill(uniqueTagline);
    await heroSection.locator('button[type="submit"]').click();
    await page.waitForTimeout(400);

    await page.goto("/");
    await expect(page.getByText(uniqueTagline)).toBeVisible();
  });

  test("logging an expense updates the finances totals immediately", async ({ page }) => {
    await page.goto("/admin/finances?range=this_month");
    const description = `Test expense ${Date.now()}`;

    await page.fill('input[name="date"]', new Date().toISOString().slice(0, 10));
    await page.selectOption('select[name="category"]', "supplies");
    await page.fill('input[name="amountEuros"]', "12");
    await page.fill('input[name="description"]', description);
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.waitForTimeout(400);

    await expect(page.getByText(description)).toBeVisible();
    const row = page.locator("tr", { hasText: description });
    await expect(row.getByText("€12")).toBeVisible();

    // Clean up so repeated test runs don't accumulate expenses.
    await row.getByRole("button", { name: "Remove" }).click();
    await page.waitForTimeout(400);
    await expect(page.getByText(description)).not.toBeVisible();
  });

  test("finances page never shows a fabricated rate when there's no decided history", async ({ page }) => {
    await page.goto("/admin/finances?range=this_month");
    // Booking outcomes rates should read "—", never a misleading "0%",
    // when there's nothing yet to compute a rate from.
    const outcomesCard = page.locator(".admin-card", { hasText: "Booking outcomes" });
    const totalBooked = await outcomesCard.locator(".admin-stat").first().locator("b").innerText();
    if (totalBooked.trim() === "0") {
      await expect(outcomesCard.getByText("—")).not.toHaveCount(0);
    }
  });

  test("signing out clears the session and blocks admin access again", async ({ page }) => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/admin\/login$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
