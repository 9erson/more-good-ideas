import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { randomUUID } from "node:crypto"
import { serve } from "bun"
import { getDatabase, initDatabase } from "./lib/db"
import { validateApiKey } from "./lib/auth"
import { updateIdeaSchema, createIdeaSchema, formatZodError } from "./lib/schemas"
import { syncIdeaTags } from "./lib/tags"
import { ZodError } from "zod"

describe("PUT /api/ideas/:id", () => {
  let server: ReturnType<typeof serve>
  let db: ReturnType<typeof getDatabase>
  let baseURL: string
  const testApiKey = "test-api-key"

  beforeAll(async () => {
    // Set API key for testing
    process.env.API_KEY = testApiKey

    db = getDatabase()
    db.exec("DROP TABLE IF EXISTS feedback")
    db.exec("DROP TABLE IF EXISTS idea_tags")
    db.exec("DROP TABLE IF EXISTS topic_tags")
    db.exec("DROP TABLE IF EXISTS ideas")
    db.exec("DROP TABLE IF EXISTS tags")
    db.exec("DROP TABLE IF EXISTS topics")
    initDatabase(db)

    const topicId = randomUUID()
    const topic2Id = randomUUID()
    const ideaId = randomUUID()
    const tag1Id = randomUUID()
    const tag2Id = randomUUID()
    const now = new Date().toISOString()

    // Create two topics
    db.query(
      "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(topicId, "Test Topic", "Description", 0, now, now)

    db.query(
      "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(topic2Id, "Another Topic", "Description", 0, now, now)

    // Create an idea
    db.query(
      "INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(ideaId, topicId, "Original Idea", "Original description", 0, now, now)

    // Create tags
    db.query("INSERT INTO tags (id, name) VALUES (?, ?)").run(tag1Id, "tag1")
    db.query("INSERT INTO tags (id, name) VALUES (?, ?)").run(tag2Id, "tag2")

    // Link tag1 to idea
    db.query("INSERT INTO idea_tags (ideaId, tagId) VALUES (?, ?)").run(ideaId, tag1Id)

    server = serve({
      port: 0,
      routes: {
        "/api/ideas/:id": {
          async PUT(req) {
            const authError = validateApiKey(req)
            if (authError) return authError

            try {
              const ideaId = req.params.id!
              const body = await req.json()

              // Validate request body with zod schema
              const validationResult = updateIdeaSchema.safeParse(body)
              if (!validationResult.success) {
                return Response.json({ error: formatZodError(validationResult.error) }, { status: 400 })
              }

              const { topicId, name, description, tags } = validationResult.data

              const existingIdea = db.query("SELECT * FROM ideas WHERE id = ?").get(ideaId) as
                | {
                    id: string
                    topicId: string
                    name: string
                    description: string | null
                    isArchived: number
                    createdAt: string
                    updatedAt: string
                  }
                | undefined

              if (!existingIdea || existingIdea.isArchived === 1) {
                return Response.json({ error: "Idea not found" }, { status: 404 })
              }

              const newTopic = db.query("SELECT * FROM topics WHERE id = ? AND isArchived = 0").get(topicId) as
                | {
                    id: string
                    name: string
                    description: string | null
                    isArchived: number
                    createdAt: string
                    updatedAt: string
                  }
                | undefined

              if (!newTopic) {
                return Response.json({ error: "Topic not found" }, { status: 400 })
              }

              const now = new Date().toISOString()

              db.query(`
                UPDATE ideas
                SET name = ?, description = ?, topicId = ?, updatedAt = ?
                WHERE id = ?
              `).run(name, description || null, topicId, now, ideaId)

              // Sync tags using shared helper
              syncIdeaTags(db, ideaId, tags)

              const idea = db.query("SELECT * FROM ideas WHERE id = ?").get(ideaId) as {
                id: string
                topicId: string
                name: string
                description: string | null
                isArchived: number
                createdAt: string
                updatedAt: string
              }

              return Response.json({
                id: idea.id,
                topicId: idea.topicId,
                name: idea.name,
                description: idea.description,
                isArchived: idea.isArchived === 1,
                createdAt: idea.createdAt,
                updatedAt: idea.updatedAt,
              })
            } catch (error) {
              if (error instanceof ZodError) {
                return Response.json({ error: formatZodError(error) }, { status: 400 })
              }
              console.error("Error updating idea:", error)
              return Response.json({ error: "Failed to update idea" }, { status: 500 })
            }
          },
        },
      },
    })

    baseURL = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop()
    delete process.env.API_KEY
  })

  test("updates idea with new name, description, and topic", async () => {
    const topicId = db.query("SELECT id FROM topics WHERE name = 'Another Topic'").get() as
      | { id: string }
      | undefined
    const ideaId = db.query("SELECT id FROM ideas WHERE name = 'Original Idea'").get() as
      | { id: string }
      | undefined

    expect(topicId).toBeDefined()
    expect(ideaId).toBeDefined()

    const updateData = {
      topicId: topicId!.id,
      name: "Updated Idea",
      description: "Updated description",
      tags: [],
    }

    const res = await fetch(`${baseURL}/api/ideas/${ideaId!.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": testApiKey,
      },
      body: JSON.stringify(updateData),
    })

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.name).toBe("Updated Idea")
    expect(data.description).toBe("Updated description")
    expect(data.topicId).toBe(topicId!.id)

    // Verify database was updated
    const idea = db.query("SELECT * FROM ideas WHERE id = ?").get(ideaId!.id) as {
      name: string
      description: string | null
      topicId: string
    }
    expect(idea.name).toBe("Updated Idea")
    expect(idea.description).toBe("Updated description")
    expect(idea.topicId).toBe(topicId!.id)
  })

  test("syncs tags - removes old tags and adds new ones", async () => {
    // Create a fresh idea with tag3 for this test (tag1, tag2 already exist)
    const topicId = db.query("SELECT id FROM topics WHERE name = 'Test Topic'").get() as
      | { id: string }
      | undefined
    const ideaId = randomUUID()
    const tag3Id = randomUUID()
    const now = new Date().toISOString()

    expect(topicId).toBeDefined()

    db.query(
      "INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(ideaId, topicId!.id, "Tag Sync Test Idea", "Description", 0, now, now)

    // Use tag3 which doesn't exist yet
    db.query("INSERT INTO tags (id, name) VALUES (?, ?)").run(tag3Id, "tag3")
    db.query("INSERT INTO idea_tags (ideaId, tagId) VALUES (?, ?)").run(ideaId, tag3Id)

    // Verify idea has tag3 linked
    const tagsBefore = db
      .query("SELECT tag.name FROM idea_tags it JOIN tags tag ON tag.id = it.tagId WHERE it.ideaId = ?")
      .all(ideaId) as Array<{ name: string }>
    expect(tagsBefore).toHaveLength(1)
    expect(tagsBefore[0]?.name).toBe("tag3")

    // Update to have tag2 only (replacing tag3)
    const updateData = {
      topicId: topicId!.id,
      name: "Tag Sync Test Idea",
      description: "Description",
      tags: ["tag2"],
    }

    const res = await fetch(`${baseURL}/api/ideas/${ideaId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": testApiKey,
      },
      body: JSON.stringify(updateData),
    })

    expect(res.status).toBe(200)

    // Verify tag sync - should have only tag2 now
    const tagsAfter = db
      .query("SELECT tag.name FROM idea_tags it JOIN tags tag ON tag.id = it.tagId WHERE it.ideaId = ?")
      .all(ideaId) as Array<{ name: string }>
    expect(tagsAfter).toHaveLength(1)
    expect(tagsAfter[0]?.name).toBe("tag2")
  })

  test("returns 400 for invalid topicId", async () => {
    const topicId = db.query("SELECT id FROM topics WHERE name = 'Test Topic'").get() as
      | { id: string }
      | undefined

    expect(topicId).toBeDefined()

    // Create a test idea
    const ideaId = randomUUID()
    const now = new Date().toISOString()
    db.query(
      "INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(ideaId, topicId!.id, "Invalid Topic Test Idea", "Description", 0, now, now)

    const updateData = {
      topicId: randomUUID(), // Non-existent topic
      name: "Invalid Topic Test Idea",
      description: "Updated description",
      tags: [],
    }

    const res = await fetch(`${baseURL}/api/ideas/${ideaId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": testApiKey,
      },
      body: JSON.stringify(updateData),
    })

    expect(res.status).toBe(400)

    const data = await res.json()
    expect(data.error).toBe("Topic not found")
  })

  test("returns 404 for archived idea", async () => {
    const archivedIdeaId = randomUUID()
    const topicId = db.query("SELECT id FROM topics WHERE name = 'Test Topic'").get() as
      | { id: string }
      | undefined
    const now = new Date().toISOString()

    expect(topicId).toBeDefined()

    // Create archived idea
    db.query(
      "INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(archivedIdeaId, topicId!.id, "Archived Idea", "Description", 1, now, now)

    const updateData = {
      topicId: topicId!.id,
      name: "Updated Name",
      description: "Updated description",
      tags: [],
    }

    const res = await fetch(`${baseURL}/api/ideas/${archivedIdeaId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": testApiKey,
      },
      body: JSON.stringify(updateData),
    })

    expect(res.status).toBe(404)

    const data = await res.json()
    expect(data.error).toBe("Idea not found")
  })

  test("validates request body with zod schema", async () => {
    const topicId = db.query("SELECT id FROM topics WHERE name = 'Test Topic'").get() as
      | { id: string }
      | undefined

    expect(topicId).toBeDefined()

    // Create a test idea
    const ideaId = randomUUID()
    const now = new Date().toISOString()
    db.query(
      "INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(ideaId, topicId!.id, "Validation Test Idea", "Description", 0, now, now)

    // Test missing required field
    const updateData1 = {
      topicId: randomUUID(),
      // name is missing
    }

    const res1 = await fetch(`${baseURL}/api/ideas/${ideaId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": testApiKey,
      },
      body: JSON.stringify(updateData1),
    })

    expect(res1.status).toBe(400)

    const data1 = await res1.json()
    expect(data1.error).toContain("name")

    // Test name too long (> 200 chars)
    const updateData2 = {
      topicId: topicId!.id,
      name: "a".repeat(201),
    }

    const res2 = await fetch(`${baseURL}/api/ideas/${ideaId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": testApiKey,
      },
      body: JSON.stringify(updateData2),
    })

    expect(res2.status).toBe(400)

    const data2 = await res2.json()
    expect(data2.error).toContain("200")

    // Test description too long (> 5000 chars)
    const updateData3 = {
      topicId: topicId!.id,
      name: "Valid Name",
      description: "a".repeat(5001),
    }

    const res3 = await fetch(`${baseURL}/api/ideas/${ideaId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": testApiKey,
      },
      body: JSON.stringify(updateData3),
    })

    expect(res3.status).toBe(400)

    const data3 = await res3.json()
    expect(data3.error).toContain("5000")
  })

  test("trims whitespace from name and description", async () => {
    const topicId = db.query("SELECT id FROM topics WHERE name = 'Test Topic'").get() as
      | { id: string }
      | undefined

    expect(topicId).toBeDefined()

    // Create a test idea
    const ideaId = randomUUID()
    const now = new Date().toISOString()
    db.query(
      "INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(ideaId, topicId!.id, "Trim Test Idea", "Description", 0, now, now)

    const updateData = {
      topicId: topicId!.id,
      name: "  Trimmed Name  ",
      description: "  Trimmed Description  ",
      tags: [],
    }

    const res = await fetch(`${baseURL}/api/ideas/${ideaId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": testApiKey,
      },
      body: JSON.stringify(updateData),
    })

    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.name).toBe("Trimmed Name")
    expect(data.description).toBe("Trimmed Description")
  })
})

describe("zod validation schemas", () => {
  test("updateIdeaSchema validates correctly", () => {
    // Valid data
    const validData = {
      topicId: "some-uuid",
      name: "Test Idea",
      description: "Test description",
      tags: ["tag1", "tag2"],
    }
    expect(() => updateIdeaSchema.parse(validData)).not.toThrow()

    // Missing required fields
    expect(() => updateIdeaSchema.parse({ topicId: "test" })).toThrow()
    expect(() => updateIdeaSchema.parse({ name: "test" })).toThrow()

    // Invalid tag length
    expect(() =>
      updateIdeaSchema.parse({
        topicId: "test",
        name: "test",
        tags: ["a".repeat(51)],
      })
    ).toThrow()
  })

  test("createIdeaSchema validates correctly", () => {
    // Valid data
    const validData = {
      topicId: "some-uuid",
      name: "Test Idea",
      description: "Test description",
      tags: ["tag1", "tag2"],
    }
    expect(() => createIdeaSchema.parse(validData)).not.toThrow()

    // Missing required fields
    expect(() => createIdeaSchema.parse({ topicId: "test" })).toThrow()
    expect(() => createIdeaSchema.parse({ name: "test" })).toThrow()
  })
})
