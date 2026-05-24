import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("home page loads successfully", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(/Wholesale|Market/i);
  });

  test("login page renders login form", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator("input[type='email']");
    const passwordInput = page.locator("input[type='password']");

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });

  test("signup page renders signup form", async ({ page }) => {
    await page.goto("/signup");
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator("input[type='email']");
    await expect(emailInput).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });

  test("login page has link to signup", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const signupLink = page.locator("a[href*='signup'], text=/sign up|create account/i");
    await expect(signupLink).toBeVisible();
  });

  test("failed login shows error message", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator("input[type='email']");
    const passwordInput = page.locator("input[type='password']");

    await emailInput.fill("nonexistent@example.com");
    await passwordInput.fill("wrongpassword1!");
    await page.click("button[type='submit']");

    await expect(page.locator("text=/invalid|error|failed|credentials/i")).toBeVisible({
      timeout: 10000,
    });
  });

  test("password field is masked", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const passwordInput = page.locator("input[type='password']");
    await expect(passwordInput).toHaveAttribute("type", "password");
  });
});
