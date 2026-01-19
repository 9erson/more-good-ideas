import { expect, test } from "playwright/test"

test("has title", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveTitle(/More Good Ideas/)
})

test("basic navigation", async ({ page }) => {
  await page.goto("/")
  await expect(page.locator("body")).toBeVisible()
})
