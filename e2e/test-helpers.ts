import type { Page } from "playwright"
import { cleanupDatabase } from "./utils/db-cleanup"

const BASE_URL = "http://localhost:3000"

export async function setupTest(options?: { cleanup?: boolean }): Promise<void> {
  if (options?.cleanup) {
    cleanupDatabase()
  }
}

export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(`${BASE_URL}${path}`)
}

export async function waitForElement(page: Page, selector: string): Promise<void> {
  await page.waitForSelector(selector, { state: "visible" })
}

export async function fillForm(
  page: Page,
  fields: Array<{ name: string; value: string }>
): Promise<void> {
  for (const field of fields) {
    const element = page.locator(
      `[name="${field.name}"], input[name="${field.name}"], textarea[name="${field.name}"]`
    )
    await element.fill(field.value)
  }
}
