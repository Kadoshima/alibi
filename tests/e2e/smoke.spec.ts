import { test, expect } from "@playwright/test";

test("homepage renders and shows brand", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Alibi/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("services page loads", async ({ page }) => {
  await page.goto("/services");
  await expect(page.getByRole("heading", { name: "サービス一覧" })).toBeVisible();
});

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "ログイン" })).toBeVisible();
});

test("pricing page shows plans", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByText("Free")).toBeVisible();
  await expect(page.getByText("Pro")).toBeVisible();
  await expect(page.getByText("Enterprise")).toBeVisible();
});
