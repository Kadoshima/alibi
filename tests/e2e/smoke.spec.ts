import { test, expect } from "@playwright/test";

test("homepage renders with photo market branding", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Alibi/);
  await expect(page.getByText("Photo Market")).toBeVisible();
});

test("photos catalog loads", async ({ page }) => {
  await page.goto("/photos");
  await expect(page.getByRole("heading", { name: "写真カタログ" })).toBeVisible();
});

test("studio editor page loads", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "Studio" })).toBeVisible();
});

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
});

test("pricing page shows plans", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText("Free")).toBeVisible();
  await expect(page.getByText("Pro")).toBeVisible();
  await expect(page.getByText("Business")).toBeVisible();
});
