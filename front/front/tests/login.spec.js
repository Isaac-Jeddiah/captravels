import { test, expect } from '@playwright/test';

test("complete auth flow: register → login", async ({ page }) => {
  const testEmail = `testuser+${Date.now()}@example.com`;
  
  await page.goto("/register");
  await page.getByLabel("Email*").fill(testEmail);
  await page.locator('input[name="password"]').fill("Password123!");
  await page.locator('input[name="confirmPassword"]').fill("Password123!");
  await page.getByPlaceholder("Mobile Number without prefix(0)").fill("555555555");
  await page.locator('input[type="checkbox"]').first().click();
  await page.locator('input[type="checkbox"]').nth(1).click();
  await page.locator('input[type="checkbox"]').nth(2).click();
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: "Continue" }).click({ force: true });
  await expect(page).toHaveURL(/home/);

  
  await page.getByText("Logout").click({ force: true });
  await page.waitForTimeout(1000);

 
  await page.goto("/login");
  await page.waitForTimeout(2000);  
  
  await page.locator('input[name="email"]').fill(testEmail);
  await page.locator('input[name="password"]').fill("Password123!");
  
  await page.waitForTimeout(3000);  
  await page.locator('button[type="submit"]').click({ force: true });

  await expect(page).toHaveURL(/home/);
  await expect(page.locator("body")).toContainText(testEmail);
});
