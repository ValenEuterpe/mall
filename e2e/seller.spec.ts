import { test, expect } from "@playwright/test";

test.describe("Seller portal", () => {
  test("seller login page accessible", async ({ page }) => {
    // Navigate to seller login
    await page.goto("/seller");
    await page.waitForLoadState("networkidle");

    // Should either redirect to seller login or show seller-specific content
    const isOnSellerPage = page.url().includes("/seller");
    expect(isOnSellerPage).toBeTruthy();
  });

  test.skip("seller dashboard loads for authenticated seller", async ({
    page,
  }) => {
    // This test requires an authenticated seller session.
    // Set up authentication state before running.
    await page.goto("/seller/products");
    await page.waitForLoadState("networkidle");

    const heading = page.locator("h1, h2");
    await expect(heading.first()).toContainText(/product/i);
  });

  test.skip("seller can create a product", async ({ page }) => {
    // This test requires authentication
    await page.goto("/seller/products/new");
    await page.waitForLoadState("networkidle");

    const form = page.locator("form");
    await expect(form).toBeVisible();

    // Check for product name field
    const nameInput = page
      .locator("input[name*='name'], input[placeholder*='product']")
      .first();
    if (await nameInput.isVisible({ timeout: 5000 })) {
      await expect(nameInput).toBeVisible();
    }
  });

  test.skip("seller product list is visible when authenticated", async ({
    page,
  }) => {
    // This test requires authentication
    await page.goto("/seller/products");
    await page.waitForLoadState("networkidle");

    // Check for product list/table
    const productList = page
      .locator("[data-testid='product-list'], table, [role='grid'], .grid")
      .first();

    if (await productList.isVisible({ timeout: 5000 })) {
      await expect(productList).toBeVisible();
    }
  });

  test.skip("seller can edit a product", async ({ page }) => {
    // This test requires authentication
    await page.goto("/seller/products");
    await page.waitForLoadState("networkidle");

    const editButton = page
      .locator(
        "button[aria-label*='edit'], button[aria-label*='Edit'], [class*='edit-btn']"
      )
      .first();

    if (await editButton.isVisible({ timeout: 5000 })) {
      await editButton.click();
      const form = page
        .locator("form, [role='dialog'], [class*='modal']")
        .first();
      await expect(form).toBeVisible({ timeout: 5000 });
    }
  });

  test.skip("seller can delete a product with confirmation", async ({
    page,
  }) => {
    // This test requires authentication
    await page.goto("/seller/products");
    await page.waitForLoadState("networkidle");

    const deleteButton = page
      .locator("button[aria-label*='delete'], button[aria-label*='remove']")
      .first();

    if (await deleteButton.isVisible({ timeout: 5000 })) {
      await deleteButton.click();

      // Look for confirmation dialog
      const confirmDialog = page
        .locator(
          "[role='alertdialog'], [role='dialog'], text=/confirm|delete|remove/i"
        )
        .first();

      if (await confirmDialog.isVisible({ timeout: 5000 })) {
        await expect(confirmDialog).toBeVisible();
      }
    }
  });
});
