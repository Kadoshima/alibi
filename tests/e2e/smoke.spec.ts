import { test, expect } from "@playwright/test";

test("homepage renders with alibi maker branding", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Alibi/);
  await expect(page.getByText("つくれる")).toBeVisible();
});

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
});

test("pricing page shows plans and credit packs", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText("Free")).toBeVisible();
  await expect(page.getByText("Pro")).toBeVisible();
  await expect(page.getByText("Unlimited")).toBeVisible();
  await expect(page.getByText("5枚パック")).toBeVisible();
});
