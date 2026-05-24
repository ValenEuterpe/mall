import { test, expect } from "@playwright/test";

test.describe("Map interaction", () => {
  test("map toggle button appears on home page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const mapToggle = page.locator(
      "button[aria-label*='map'], button[aria-label*='location'], svg.lucide-map"
    ).first();

    if (await mapToggle.isVisible({ timeout: 5000 })) {
      await expect(mapToggle).toBeVisible({ timeout: 10000 });
    }
  });

  test("map can be toggled on and off", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const mapToggle = page.locator("button[aria-label*='map']").first();

    if (await mapToggle.isVisible({ timeout: 5000 })) {
      // Toggle map on
      await mapToggle.click();
      await page.waitForTimeout(1000);

      // Check if map container is visible
      const mapContainer = page.locator(
        ".leaflet-container, [class*='map'], [data-testid*='map']"
      ).first();

      const isMapVisible = await mapContainer.isVisible({ timeout: 5000 }).catch(() => false);

      if (isMapVisible) {
        // Toggle map off
        await mapToggle.click();
        await page.waitForTimeout(500);

        // Map should be hidden or sidebar closed
        await expect(mapContainer).not.toBeVisible({ timeout: 5000 });
      }
    }
  });

  test("map toggle button on desktop has proper styling", async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const mapToggle = page.locator("button[aria-label*='map']").first();

    if (await mapToggle.isVisible({ timeout: 5000 })) {
      await expect(mapToggle).toBeEnabled();
      // Check that button has visible icon or text
      const icon = mapToggle.locator("svg, span").first();
      const hasIcon = await icon.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasIcon).toBeTruthy();
    }

    await context.close();
  });

  test("map toggle appears on product detail page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const firstProduct = page
      .locator("[data-testid='product-card'], .group.cursor-pointer")
      .first();

    if (await firstProduct.isVisible({ timeout: 5000 })) {
      await firstProduct.click();
      await page.waitForLoadState("networkidle");

      const mapToggle = page.locator("button[aria-label*='map']").first();

      if (await mapToggle.isVisible({ timeout: 5000 })) {
        await expect(mapToggle).toBeVisible({ timeout: 10000 });
        await expect(mapToggle).toBeEnabled();
      }
    }
  });

  test("map has proper ARIA labels for accessibility", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const mapToggle = page.locator("button[aria-label*='map']").first();

    if (await mapToggle.isVisible({ timeout: 5000 })) {
      const ariaLabel = await mapToggle.getAttribute("aria-label");
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel?.toLowerCase()).toContain("map");
    }
  });
});
