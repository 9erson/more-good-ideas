import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { randomUUID } from "node:crypto"
import { serve } from "bun"
import { getDatabase, initDatabase } from "./lib/db"

describe("DELETE /api/ideas/:id", () => {
  let server: ReturnType<typeof serve>
  let db: ReturnType<typeof getDatabase>
  let baseURL: string

  beforeAll(async () => {
    db = getDatabase()
    db.exec("DROP TABLE IF EXISTS feedback")
    db.exec("DROP TABLE IF EXISTS idea_tags")
    db.exec("DROP TABLE IF EXISTS topic_tags")
    db.exec("DROP TABLE IF EXISTS ideas")
    db.exec("DROP TABLE IF EXISTS tags")
    db.exec("DROP TABLE IF EXISTS topics")
    initDatabase(db)

    const topicId = randomUUID()
    const ideaId = randomUUID()
    const tagId = randomUUID()
    const feedbackId = randomUUID()
    const now = new Date().toISOString()

    db.query(
      "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(topicId, "Test Topic", "Description", 0, now, now)

    db.query(
      "INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(ideaId, topicId, "Test Idea", "Description", 0, now, now)

    db.query("INSERT INTO tags (id, name) VALUES (?, ?)").run(tagId, "test-tag")
    db.query("INSERT INTO idea_tags (ideaId, tagId) VALUES (?, ?)").run(ideaId, tagId)

    db.query(
      "INSERT INTO feedback (id, ideaId, rating, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(feedbackId, ideaId, 5, "Great idea!", now, now)

    server = serve({
      port: 0,
      routes: {
        "/api/ideas/:id": {
          async DELETE(req) {
            try {
              const ideaId = req.params.id

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

              if (!existingIdea) {
                return Response.json({ error: "Idea not found" }, { status: 404 })
              }

              if (existingIdea.isArchived === 1) {
                return Response.json({ error: "Idea is already archived" }, { status: 400 })
              }

              const now = new Date().toISOString()

              db.query(`
                UPDATE ideas
                SET isArchived = 1, updatedAt = ?
                WHERE id = ?
              `).run(now, ideaId)

              return Response.json({ success: true })
            } catch (error) {
              console.error("Error deleting idea:", error)
              return Response.json({ error: "Failed to delete idea" }, { status: 500 })
            }
          },
        },
      },
    })

    baseURL = `http://localhost:${server.port}`
  })

  afterAll(() => {
    server.stop()
  })

  test("soft deletes idea by setting isArchived = 1", async () => {
    const ideaId = db.query("SELECT id FROM ideas WHERE name = 'Test Idea'").get() as
      | { id: string }
      | undefined
    expect(ideaId).toBeDefined()

    const ideaBeforeDelete = db
      .query("SELECT isArchived, updatedAt FROM ideas WHERE id = ?")
      .get(ideaId!.id)
    expect((ideaBeforeDelete as { isArchived: number }).isArchived).toBe(0)

    const res = await fetch(`${baseURL}/api/ideas/${ideaId!.id}`, { method: "DELETE" })
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toEqual({ success: true })

    const ideaAfterDelete = db
      .query("SELECT isArchived, updatedAt FROM ideas WHERE id = ?")
      .get(ideaId!.id)
    expect((ideaAfterDelete as { isArchived: number }).isArchived).toBe(1)

    // Verify updatedAt was updated
    const beforeUpdatedAt = (ideaBeforeDelete as { updatedAt: string }).updatedAt
    const afterUpdatedAt = (ideaAfterDelete as { updatedAt: string }).updatedAt
    expect(afterUpdatedAt).not.toBe(beforeUpdatedAt)

    // Verify idea still exists in database (soft delete)
    const ideaStillExists = db.query("SELECT id FROM ideas WHERE id = ?").get(ideaId!.id)
    expect(ideaStillExists).toBeDefined()
  })

  test("returns 404 for non-existent idea", async () => {
    const res = await fetch(`${baseURL}/api/ideas/${randomUUID()}`, { method: "DELETE" })
    expect(res.status).toBe(404)

    const data = await res.json()
    expect(data).toEqual({ error: "Idea not found" })
  })

  test("returns 400 for already archived idea", async () => {
    const archivedIdeaId = randomUUID()
    const topicId = randomUUID()
    const now = new Date().toISOString()

    db.query(
      "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(topicId, "Another Topic", "Description", 0, now, now)

    db.query(
      "INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(archivedIdeaId, topicId, "Archived Idea", "Description", 1, now, now)

    const res = await fetch(`${baseURL}/api/ideas/${archivedIdeaId}`, { method: "DELETE" })
    expect(res.status).toBe(400)

    const data = await res.json()
    expect(data).toEqual({ error: "Idea is already archived" })
  })

  test("tags and feedback remain after idea is archived", async () => {
    const ideaId = db.query("SELECT id FROM ideas WHERE name = 'Test Idea'").get() as
      | { id: string }
      | undefined
    expect(ideaId).toBeDefined()

    // Verify tags and feedback exist before delete
    const tagsBefore = db
      .query("SELECT tagId FROM idea_tags WHERE ideaId = ?")
      .all(ideaId!.id) as Array<{ tagId: string }>
    expect(tagsBefore).toHaveLength(1)

    const feedbackBefore = db
      .query("SELECT id FROM feedback WHERE ideaId = ?")
      .get(ideaId!.id)
    expect(feedbackBefore).toBeDefined()

    // Delete the idea
    await fetch(`${baseURL}/api/ideas/${ideaId!.id}`, { method: "DELETE" })

    // Verify tags and feedback still exist (soft delete shouldn't affect them)
    const tagsAfter = db
      .query("SELECT tagId FROM idea_tags WHERE ideaId = ?")
      .all(ideaId!.id) as Array<{ tagId: string }>
    expect(tagsAfter).toHaveLength(1)

    const feedbackAfter = db
      .query("SELECT id FROM feedback WHERE ideaId = ?")
      .get(ideaId!.id)
    expect(feedbackAfter).toBeDefined()
  })
})
