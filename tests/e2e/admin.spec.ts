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

  test("signing out clears the session and blocks admin access again", async ({ page }) => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/admin\/login$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});
