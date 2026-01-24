import { expect, test } from "playwright/test"
import { createTopic, fetchIdea, fetchTags } from "./utils/api-helpers"
import { cleanupDatabase } from "./utils/db-cleanup"
import { createTopicData } from "./utils/test-data-factory"

test.describe.configure({ mode: "serial" })

test.beforeEach(async () => {
  await cleanupDatabase()
})

test.describe("Create Idea", () => {
  test("successfully creates an idea with topic, name, description, and tags", async ({ page }) => {
    // Create a test topic
    const topicData = createTopicData({ name: "Startup Ideas" })
    const topic = await createTopic(topicData)

    await page.goto("http://localhost:3000/ideas/new")

    // Select topic from dropdown - use data-slot attribute for Radix UI Select
    await page.locator('[data-slot="select-trigger"]').first().click()
    // Wait for the dropdown content to appear
    await page.locator('[data-slot="select-content"]').waitFor({ state: "visible" })
    await page.getByRole("option", { name: topic.name }).click()

    // Fill in name
    await page.getByLabel("Name *").fill("AI Assistant")

    // Fill in description
    await page.getByLabel("Description").fill("An AI-powered personal assistant for productivity")

    // Add tags
    const tagInput = page.getByLabel("Tags")
    await tagInput.fill("technology")
    await tagInput.press("Enter")
    await expect(
      page.locator(".inline-flex.items-center").filter({ hasText: "technology" })
    ).toBeVisible()

    await tagInput.fill("innovation")
    await tagInput.press("Enter")
    await expect(
      page.locator(".inline-flex.items-center").filter({ hasText: "innovation" })
    ).toBeVisible()

    // Submit the form - wait for navigation
    const createButton = page.getByRole("button", { name: /create idea/i })
    await createButton.click()

    // Wait for URL to change (with longer timeout)
    await page.waitForURL(/\/ideas\/[a-f0-9-]+$/, { timeout: 10000 })

    // Verify navigation to idea detail page
    await expect(page).toHaveURL(/\/ideas\/[a-f0-9-]+$/)

    // Extract idea ID from URL
    const url = page.url()
    const ideaId = url.split("/").pop()

    // Verify via API that the idea was created
    const idea = await fetchIdea(ideaId!)
    expect(idea.name).toBe("AI Assistant")
    expect(idea.description).toBe("An AI-powered personal assistant for productivity")
    expect(idea.topicId).toBe(topic.id)
    expect(idea.tags).toContain("technology")
    expect(idea.tags).toContain("innovation")

    // Verify idea details are displayed on the page - wait for h1 to be visible
    await expect(page.locator("h1")).toBeVisible()
    await expect(page.locator("h1")).toContainText("AI Assistant")
  })

  test("shows validation error when submitting without topic", async ({ page }) => {
    await page.goto("http://localhost:3000/ideas/new")

    // Fill in name but leave topic empty
    await page.getByLabel("Name *").fill("Test Idea")

    // Submit the form
    await page.getByRole("button", { name: /create idea/i }).click()

    // Verify error message is displayed
    await expect(page.locator(".bg-destructive\\/10")).toContainText("Topic is required")

    // Verify the URL hasn't changed (no navigation)
    await expect(page).toHaveURL("http://localhost:3000/ideas/new")

    // Verify the topic select has destructive styling
    const trigger = page.locator('[data-slot="select-trigger"]')
    await expect(trigger).toHaveClass(/border-destructive/)
  })

  test("shows validation error when submitting without name", async ({ page }) => {
    // Create a test topic
    const topicData = createTopicData()
    const topic = await createTopic(topicData)

    await page.goto("http://localhost:3000/ideas/new")

    // Select topic but leave name empty
    await page.locator('[data-slot="select-trigger"]').first().click()
    // Wait for the dropdown content to appear
    await page.locator('[data-slot="select-content"]').waitFor({ state: "visible" })
    await page.getByRole("option", { name: topic.name }).click()

    // Submit the form
    await page.getByRole("button", { name: /create idea/i }).click()

    // Verify error message is displayed
    await expect(page.locator(".bg-destructive\\/10")).toContainText("Name is required")

    // Verify the URL hasn't changed (no navigation)
    await expect(page).toHaveURL("http://localhost:3000/ideas/new")

    // Verify the name input has destructive styling
    const nameInput = page.getByLabel("Name *")
    await expect(nameInput).toHaveClass(/border-destructive/)
  })

  test("displays tag autocomplete dropdown with matching tags", async ({ page }) => {
    // Create a topic with existing tags
    const topicData = createTopicData({
      name: "Tech Topics",
      tags: ["javascript", "typescript", "python", "java"],
    })
    await createTopic(topicData)

    await page.goto("http://localhost:3000/ideas/new")

    // Select a topic - use data-slot attribute
    await page.locator('[data-slot="select-trigger"]').first().click()
    // Wait for the dropdown content to appear
    await page.locator('[data-slot="select-content"]').waitFor({ state: "visible" })
    await page.getByRole("option", { name: topicData.name }).click()

    // Focus on tag input and type partial match
    const tagInput = page.getByLabel("Tags")
    await tagInput.fill("script")

    // Verify autocomplete dropdown appears with matching tags
    const autocompleteList = page.locator("ul.absolute.z-10")
    await expect(autocompleteList).toBeVisible()

    // Verify matching tags are shown
    await expect(
      autocompleteList.getByRole("button").filter({ hasText: "javascript" })
    ).toBeVisible()
    await expect(
      autocompleteList.getByRole("button").filter({ hasText: "typescript" })
    ).toBeVisible()

    // Click on a suggestion
    await autocompleteList.getByRole("button").filter({ hasText: "javascript" }).click()

    // Verify the tag is added to the tag list
    await expect(
      page.locator(".inline-flex.items-center").filter({ hasText: "javascript" })
    ).toBeVisible()

    // Verify the input is cleared
    await expect(tagInput).toHaveValue("")
  })

  test("creates new tag on-the-fly", async ({ page }) => {
    const topicData = createTopicData()
    const topic = await createTopic(topicData)

    await page.goto("http://localhost:3000/ideas/new")

    // Select topic - use data-slot attribute and wait for options
    await page.locator('[data-slot="select-trigger"]').first().click()
    // Wait for the dropdown content to appear
    await page.locator('[data-slot="select-content"]').waitFor({ state: "visible" })
    await page.getByRole("option", { name: topic.name }).click()

    // Type a new tag that doesn't exist
    const newTag = "brandnewtag"
    const tagInput = page.getByLabel("Tags")
    await tagInput.fill(newTag)
    await tagInput.press("Enter")

    // Verify the new tag appears in the tag list
    await expect(
      page.locator(".inline-flex.items-center").filter({ hasText: newTag })
    ).toBeVisible()

    // Fill in required fields and submit
    await page.getByLabel("Name *").fill("Idea with New Tag")
    await page.getByRole("button", { name: /create idea/i }).click()

    // Wait for navigation
    await page.waitForURL(/\/ideas\/[a-f0-9-]+$/, { timeout: 10000 })

    // Verify via API that the new tag exists in the database
    const allTags = await fetchTags()
    expect(allTags).toContain(newTag)
  })

  test("handles tags case-insensitively", async ({ page }) => {
    // Create an initial tag with specific casing
    const existingTag = "JavaScript"
    const topicData = createTopicData({ tags: [existingTag] })
    await createTopic(topicData)

    await page.goto("http://localhost:3000/ideas/new")

    // Select topic
    await page.locator('[data-slot="select-trigger"]').first().click()
    await page.locator('[data-slot="select-content"]').waitFor({ state: "visible" })
    await page.getByRole("option", { name: topicData.name }).click()

    // Type tag in lowercase
    const tagInput = page.getByLabel("Tags")
    await tagInput.fill("javascript")
    await tagInput.press("Enter")

    // Verify the tag is added (should match existing "JavaScript" tag)
    await expect(
      page.locator(".inline-flex.items-center").filter({ hasText: "javascript" })
    ).toBeVisible()

    // Submit the first idea
    await page.getByLabel("Name *").fill("First Idea")
    await page.getByRole("button", { name: /create idea/i }).click()
    await page.waitForURL(/\/ideas\/[a-f0-9-]+$/)

    // Create a second idea with uppercase tag
    const firstIdeaUrl = page.url()
    const firstIdeaId = firstIdeaUrl.split("/").pop()!

    await page.goto("http://localhost:3000/ideas/new")
    await page.locator('[data-slot="select-trigger"]').first().click()
    await page.getByRole("option", { name: topicData.name }).click()

    await page.getByLabel("Tags").fill("JAVASCRIPT")
    await page.getByLabel("Tags").press("Enter")
    await page.getByLabel("Name *").fill("Second Idea")
    await page.getByRole("button", { name: /create idea/i }).click()
    await page.waitForURL(/\/ideas\/[a-f0-9-]+$/)

    const secondIdeaUrl = page.url()
    const secondIdeaId = secondIdeaUrl.split("/").pop()!

    // Verify via API that only one "JavaScript" tag exists in the database
    const allTags = await fetchTags()
    const javascriptTags = allTags.filter((tag) => tag.toLowerCase() === "javascript")
    expect(javascriptTags.length).toBe(1)

    // Verify both ideas are associated with the same tag
    const firstIdea = await fetchIdea(firstIdeaId)
    const secondIdea = await fetchIdea(secondIdeaId)

    expect(firstIdea.tags.some((tag) => tag.toLowerCase() === "javascript")).toBe(true)
    expect(secondIdea.tags.some((tag) => tag.toLowerCase() === "javascript")).toBe(true)
  })
})
