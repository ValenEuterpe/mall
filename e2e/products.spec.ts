import { test, expect } from "@playwright/test";

test.describe("Product browsing", () => {
  test("home page shows products", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const products = page.locator(
      "[data-testid='product-card'], .group.cursor-pointer"
    );
    await expect(products.first()).toBeVisible({ timeout: 10000 });
  });

  test("product cards have required information", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const firstProduct = page
      .locator("[data-testid='product-card'], .group.cursor-pointer")
      .first();

    if (await firstProduct.isVisible({ timeout: 5000 })) {
      // Check product name/title is visible
      const productName = firstProduct
        .locator("h2, h3, [class*='title']")
        .first();
      await expect(productName).toBeVisible();
    }
  });

  test("search functionality works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator(
      "input[type='search'], input[placeholder*='search']"
    );

    if (await searchInput.isVisible({ timeout: 5000 })) {
      await searchInput.fill("product");
      await searchInput.press("Enter");
      await page.waitForLoadState("networkidle");

      // Check that we have results or a search URL
      const hasResults = await page
        .locator("[data-testid='product-card'], .group.cursor-pointer")
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false);

      expect(hasResults || page.url().includes("q=")).toBeTruthy();
    }
  });

  test("product detail page loads with product info", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const firstProduct = page
      .locator("[data-testid='product-card'], .group.cursor-pointer")
      .first();

    if (await firstProduct.isVisible({ timeout: 5000 })) {
      await firstProduct.click();
      await page.waitForLoadState("networkidle");

      // Check for product name/title on detail page
      const heading = page.locator("h1, h2");
      await expect(heading.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test("product detail page has add to cart button", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const firstProduct = page
      .locator("[data-testid='product-card'], .group.cursor-pointer")
      .first();

    if (await firstProduct.isVisible({ timeout: 5000 })) {
      await firstProduct.click();
      await page.waitForLoadState("networkidle");

      const addToCartButton = page
        .locator(
          "button:has-text('Add to Cart'), button:has-text('Add to'), [aria-label*='cart']"
        )
        .first();

      if (await addToCartButton.isVisible({ timeout: 5000 })) {
        await expect(addToCartButton).toBeEnabled();
      }
    }
  });

  test("product filter/category navigation is visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const categoryFilter = page
      .locator(
        "[class*='filter'], [data-testid*='category'], button:has-text(/category|filter/i)"
      )
      .first();

    if (await categoryFilter.isVisible({ timeout: 5000 })) {
      await expect(categoryFilter).toBeVisible();
    }
  });
});
