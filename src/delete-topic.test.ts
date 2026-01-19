import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { randomUUID } from "node:crypto"
import { serve } from "bun"
import { getDatabase, initDatabase } from "./lib/db"

describe("DELETE /api/topics/:id", () => {
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
    const ideaId1 = randomUUID()
    const ideaId2 = randomUUID()
    const tagId = randomUUID()
    const feedbackId = randomUUID()
    const now = new Date().toISOString()

    db.query(
      "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(topicId, "Test Topic", "Description", 0, now, now)

    db.query(
      "INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(ideaId1, topicId, "Idea 1", "Description 1", 0, now, now)

    db.query(
      "INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(ideaId2, topicId, "Idea 2", "Description 2", 0, now, now)

    db.query("INSERT INTO tags (id, name) VALUES (?, ?)").run(tagId, "test-tag")
    db.query("INSERT INTO topic_tags (topicId, tagId) VALUES (?, ?)").run(topicId, tagId)
    db.query("INSERT INTO idea_tags (ideaId, tagId) VALUES (?, ?)").run(ideaId1, tagId)

    db.query(
      "INSERT INTO feedback (id, ideaId, rating, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(feedbackId, ideaId1, 5, "Great idea!", now, now)

    server = serve({
      port: 0,
      routes: {
        "/api/topics/:id": {
          async DELETE(req) {
            try {
              const topicId = req.params.id

              const existingTopic = db.query("SELECT * FROM topics WHERE id = ?").get(topicId) as
                | {
                    id: string
                    name: string
                    description: string | null
                    isArchived: number
                    createdAt: string
                    updatedAt: string
                  }
                | undefined

              if (!existingTopic || existingTopic.isArchived === 1) {
                return Response.json({ error: "Topic not found" }, { status: 404 })
              }

              const now = new Date().toISOString()

              db.query(`
                UPDATE topics
                SET isArchived = 1, updatedAt = ?
                WHERE id = ?
              `).run(now, topicId)

              db.query(`
                UPDATE ideas
                SET isArchived = 1, updatedAt = ?
                WHERE topicId = ?
              `).run(now, topicId)

              return Response.json({ success: true })
            } catch (error) {
              console.error("Error deleting topic:", error)
              return Response.json({ error: "Failed to delete topic" }, { status: 500 })
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

  test("deletes topic and cascades to ideas", async () => {
    const topicId = db.query("SELECT id FROM topics WHERE name = 'Test Topic'").get() as
      | { id: string }
      | undefined
    expect(topicId).toBeDefined()

    const topicBeforeDelete = db
      .query("SELECT isArchived FROM topics WHERE id = ?")
      .get(topicId!.id)
    expect((topicBeforeDelete as { isArchived: number }).isArchived).toBe(0)

    const ideasBeforeDelete = db
      .query("SELECT id, isArchived FROM ideas WHERE topicId = ?")
      .all(topicId!.id) as Array<{ id: string; isArchived: number }>
    expect(ideasBeforeDelete).toHaveLength(2)
    expect(ideasBeforeDelete.every((i) => i.isArchived === 0)).toBe(true)

    const res = await fetch(`${baseURL}/api/topics/${topicId!.id}`, { method: "DELETE" })
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data).toEqual({ success: true })

    const topicAfterDelete = db.query("SELECT isArchived FROM topics WHERE id = ?").get(topicId!.id)
    expect((topicAfterDelete as { isArchived: number }).isArchived).toBe(1)

    const ideasAfterDelete = db
      .query("SELECT id, isArchived FROM ideas WHERE topicId = ?")
      .all(topicId!.id) as Array<{ id: string; isArchived: number }>
    expect(ideasAfterDelete).toHaveLength(2)
    expect(ideasAfterDelete.every((i) => i.isArchived === 1)).toBe(true)

    const tags = db.query("SELECT * FROM tags").all()
    expect(tags).toHaveLength(1)
  })

  test("returns 404 for non-existent topic", async () => {
    const res = await fetch(`${baseURL}/api/topics/${randomUUID()}`, { method: "DELETE" })
    expect(res.status).toBe(404)

    const data = await res.json()
    expect(data).toEqual({ error: "Topic not found" })
  })

  test("returns 404 for already archived topic", async () => {
    const archivedTopicId = randomUUID()
    const now = new Date().toISOString()

    db.query(
      "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(archivedTopicId, "Archived Topic", "Description", 1, now, now)

    const res = await fetch(`${baseURL}/api/topics/${archivedTopicId}`, { method: "DELETE" })
    expect(res.status).toBe(404)

    const data = await res.json()
    expect(data).toEqual({ error: "Topic not found" })
  })
})
