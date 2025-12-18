import { test, expect } from '@playwright/test';

test("user can register with Turnstile", async ({ page }) => {
  const uniqueEmail = `testuser+${Date.now()}@example.com`;

  await page.goto("/register");

  await page.getByLabel("Email*").fill(uniqueEmail);
  await page.locator('input[name="password"]').fill("Password123!");
  await page.locator('input[name="confirmPassword"]').fill("Password123!");
  await page.getByPlaceholder("Mobile Number without prefix(0)").fill("555555555");

  await page.locator('input[type="checkbox"]').first().click();
  await page.locator('input[type="checkbox"]').nth(1).click();
  await page.locator('input[type="checkbox"]').nth(2).click();

  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Continue" }).click({ force: true });

  await expect(page).toHaveURL(/localhost:5173\/home/);
  await expect(page.locator("body")).toContainText(uniqueEmail);
  await expect(page.getByText("Logout")).toBeVisible();
});
