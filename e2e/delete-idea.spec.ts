import { expect, test } from "playwright/test"
import { cleanupDatabase } from "./utils/db-cleanup"
import { createIdea, createTopic, fetchIdea, fetchTopic } from "./utils/api-helpers"
import { createTopicData, createIdeaData } from "./utils/test-data-factory"

const TEST_API_KEY = process.env.API_KEY || "test-api-key-for-e2e"

// Run tests serially with single worker to avoid shared counter conflicts
test.describe.configure({ mode: "serial", timeout: 60000 })

test.beforeEach(async () => {
  await cleanupDatabase()
})

test.describe("Delete Idea", () => {
  test("successfully deletes an idea and navigates to parent topic page", async ({ page }) => {
    // Create a test topic and idea with unique names
    const topicData = createTopicData()
    const topic = await createTopic(topicData)

    const ideaData = createIdeaData(topic.id)
    const idea = await createIdea(ideaData)

    // Navigate to idea detail page
    await page.goto(`http://localhost:3000/ideas/${idea.id}`)

    // Verify idea is displayed
    await expect(page.locator("h1")).toContainText(idea.name)

    // Click the Delete Idea button
    await page.getByRole("button", { name: /delete idea/i }).click()

    // Verify confirmation dialog appears
    await expect(page.locator('[data-state="open"]')).toBeVisible()
    await expect(page.locator("text=/Are you sure you want to delete/")).toBeVisible()
    await expect(page.locator(`text=/${idea.name}/`)).toBeVisible()

    // Click Confirm button
    await page.getByRole("button", { name: "Confirm" }).click()

    // Wait for navigation to parent topic page
    await page.waitForURL(`http://localhost:3000/topics/${topic.id}`)

    // Verify we're on the topic page
    await expect(page).toHaveURL(`http://localhost:3000/topics/${topic.id}`)

    // Verify idea is no longer visible on topic page (soft deleted)
    await expect(page.locator(`text=/${idea.name}/`)).not.toBeVisible()

    // Verify via API that idea is archived
    const fetchedIdea = await fetchIdea(idea.id)
    expect(fetchedIdea.isArchived).toBe(true)
  })

  test("cancels delete when Cancel button is clicked", async ({ page }) => {
    // Create a test topic and idea
    const topicData = createTopicData()
    const topic = await createTopic(topicData)

    const ideaData = createIdeaData(topic.id)
    const idea = await createIdea(ideaData)

    // Navigate to idea detail page
    await page.goto(`http://localhost:3000/ideas/${idea.id}`)

    // Click the Delete Idea button
    await page.getByRole("button", { name: /delete idea/i }).click()

    // Verify confirmation dialog appears
    await expect(page.locator('[data-state="open"]')).toBeVisible()

    // Click Cancel button
    await page.getByRole("button", { name: "Cancel" }).click()

    // Verify dialog is closed
    await expect(page.locator('[data-state="open"]')).not.toBeVisible()

    // Verify we're still on the idea detail page
    await expect(page).toHaveURL(`http://localhost:3000/ideas/${idea.id}`)

    // Verify idea is still displayed
    await expect(page.locator("h1")).toContainText(idea.name)

    // Verify via API that idea is NOT archived
    const fetchedIdea = await fetchIdea(idea.id)
    expect(fetchedIdea.isArchived).toBe(false)
  })

  test("shows loading state during delete", async ({ page }) => {
    // Create a test topic and idea
    const topicData = createTopicData()
    const topic = await createTopic(topicData)

    const ideaData = createIdeaData(topic.id)
    const idea = await createIdea(ideaData)

    // Navigate to idea detail page
    await page.goto(`http://localhost:3000/ideas/${idea.id}`)

    // Click the Delete Idea button
    await page.getByRole("button", { name: /delete idea/i }).click()

    // Click Confirm button
    const confirmButton = page.getByRole("button", { name: "Confirm" })
    await confirmButton.click()

    // Verify button shows "Deleting..." state (button should be disabled)
    await expect(page.getByRole("button", { name: "Deleting..." })).toBeVisible()
    await expect(page.getByRole("button", { name: "Deleting..." })).toBeDisabled()
  })

  test("returns 404 when trying to view deleted idea", async ({ page }) => {
    // Create a test topic and idea
    const topicData = createTopicData()
    const topic = await createTopic(topicData)

    const ideaData = createIdeaData(topic.id)
    const idea = await createIdea(ideaData)

    // Delete the idea via API
    await fetch(`http://localhost:3000/api/ideas/${idea.id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": TEST_API_KEY,
      },
    })

    // Try to navigate to the deleted idea
    await page.goto(`http://localhost:3000/ideas/${idea.id}`)

    // Verify "Idea not found" message is displayed
    await expect(page.locator("text=/Idea not found/")).toBeVisible()
  })

  test("shows error message when delete fails", async ({ page }) => {
    // Create a test topic and idea
    const topicData = createTopicData()
    const topic = await createTopic(topicData)

    const ideaData = createIdeaData(topic.id)
    const idea = await createIdea(ideaData)

    // Navigate to idea detail page
    await page.goto(`http://localhost:3000/ideas/${idea.id}`)

    // Intercept the DELETE request and return an error
    await page.route("*/api/ideas/*", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Failed to delete idea" }),
        })
      } else {
        route.continue()
      }
    })

    // Click the Delete Idea button
    await page.getByRole("button", { name: /delete idea/i }).click()

    // Click Confirm button
    await page.getByRole("button", { name: "Confirm" }).click()

    // Verify error message is displayed
    await expect(page.locator(".bg-destructive\\/10")).toContainText("Failed to delete idea")

    // Verify modal stays open
    await expect(page.locator('[data-state="open"]')).toBeVisible()

    // Verify buttons are re-enabled (not in deleting state)
    await expect(page.getByRole("button", { name: "Confirm" })).toBeEnabled()
  })
})
