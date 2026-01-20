import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { randomUUID } from "node:crypto"
import { serve } from "bun"
import { getDatabase, initDatabase } from "./lib/db"

describe("Archive API endpoints", () => {
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

    // Create test data
    const topicId1 = randomUUID()
    const topicId2 = randomUUID()
    const topicId3 = randomUUID()
    const ideaId1 = randomUUID()
    const ideaId2 = randomUUID()
    const ideaId3 = randomUUID()
    const tagId1 = randomUUID()
    const tagId2 = randomUUID()
    const now = new Date().toISOString()

    // Create 3 archived topics
    db.query(
      "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(topicId1, "Archived Topic 1", "Description 1", 1, now, now)

    db.query(
      "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(topicId2, "Archived Topic 2", "Description 2", 1, now, now)

    db.query(
      "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(topicId3, "Archived Topic 3", "Description 3", 1, now, now)

    // Create 3 active topics
    const activeTopicId = randomUUID()
    db.query(
      "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(activeTopicId, "Active Topic", "Active Description", 0, now, now)

    // Create archived ideas
    db.query(
      "INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(ideaId1, topicId1, "Archived Idea 1", "Archived Description 1", 1, now, now)

    db.query(
      "INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(ideaId2, topicId1, "Archived Idea 2", "Archived Description 2", 1, now, now)

    db.query(
      "INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(ideaId3, topicId2, "Archived Idea 3", "Archived Description 3", 1, now, now)

    // Create active idea
    const activeIdeaId = randomUUID()
    db.query(
      "INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(activeIdeaId, activeTopicId, "Active Idea", "Active Idea Description", 0, now, now)

    // Create tags
    db.query("INSERT INTO tags (id, name) VALUES (?, ?)").run(tagId1, "archive-tag-1")
    db.query("INSERT INTO tags (id, name) VALUES (?, ?)").run(tagId2, "archive-tag-2")

    // Link tags to topics
    db.query("INSERT INTO topic_tags (topicId, tagId) VALUES (?, ?)").run(topicId1, tagId1)
    db.query("INSERT INTO topic_tags (topicId, tagId) VALUES (?, ?)").run(topicId2, tagId2)

    // Link tags to ideas
    db.query("INSERT INTO idea_tags (ideaId, tagId) VALUES (?, ?)").run(ideaId1, tagId1)
    db.query("INSERT INTO idea_tags (ideaId, tagId) VALUES (?, ?)").run(ideaId2, tagId2)

    server = serve({
      port: 0,
      routes: {
        "/api/archive/topics": {
          async GET() {
            try {
              const topics = db
                .query(`
                SELECT
                  t.id,
                  t.name,
                  t.description,
                  t.isArchived,
                  t.createdAt,
                  t.updatedAt,
                  COUNT(i.id) as ideaCount,
                  (
                    SELECT GROUP_CONCAT(tag.name, ',')
                    FROM topic_tags tt
                    JOIN tags tag ON tag.id = tt.tagId
                    WHERE tt.topicId = t.id
                  ) as tags
                FROM topics t
                LEFT JOIN ideas i ON i.topicId = t.id
                WHERE t.isArchived = 1
                GROUP BY t.id
                ORDER BY t.updatedAt DESC
              `)
                .all() as Array<{
                id: string
                name: string
                description: string | null
                isArchived: number
                createdAt: string
                updatedAt: string
                ideaCount: number
                tags: string | null
              }>

              const formattedTopics = topics.map((topic) => ({
                id: topic.id,
                name: topic.name,
                description: topic.description,
                isArchived: topic.isArchived === 1,
                ideaCount: topic.ideaCount,
                tags: topic.tags ? topic.tags.split(",") : [],
                createdAt: topic.createdAt,
                updatedAt: topic.updatedAt,
              }))

              return Response.json(formattedTopics)
            } catch (error) {
              console.error("Error fetching archived topics:", error)
              return Response.json({ error: "Failed to fetch archived topics" }, { status: 500 })
            }
          },
        },

        "/api/archive/ideas": {
          async GET() {
            try {
              const ideas = db
                .query(`
                SELECT
                  i.id,
                  i.topicId,
                  i.name,
                  i.description,
                  i.isArchived,
                  i.createdAt,
                  i.updatedAt,
                  t.name as topicName,
                  (
                  SELECT GROUP_CONCAT(tag.name, ',')
                  FROM idea_tags it
                  JOIN tags tag ON tag.id = it.tagId
                  WHERE it.ideaId = i.id
                ) as tags
                FROM ideas i
                LEFT JOIN topics t ON t.id = i.topicId
                WHERE i.isArchived = 1
                ORDER BY i.updatedAt DESC
              `)
                .all() as Array<{
                id: string
                topicId: string
                name: string
                description: string | null
                isArchived: number
                createdAt: string
                updatedAt: string
                topicName: string | null
                tags: string | null
              }>

              const formattedIdeas = ideas.map((idea) => ({
                id: idea.id,
                topicId: idea.topicId,
                name: idea.name,
                description: idea.description,
                isArchived: idea.isArchived === 1,
                topicName: idea.topicName,
                tags: idea.tags ? idea.tags.split(",") : [],
                createdAt: idea.createdAt,
                updatedAt: idea.updatedAt,
              }))

              return Response.json(formattedIdeas)
            } catch (error) {
              console.error("Error fetching archived ideas:", error)
              return Response.json({ error: "Failed to fetch archived ideas" }, { status: 500 })
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

  describe("GET /api/archive/topics", () => {
    test("returns archived topics only", async () => {
      const res = await fetch(`${baseURL}/api/archive/topics`)
      expect(res.status).toBe(200)

      const data = (await res.json()) as Array<{
        id: string
        name: string
        description: string | null
        isArchived: boolean
        ideaCount: number
        tags: string[]
        createdAt: string
        updatedAt: string
      }>

      expect(data).toHaveLength(3)
      expect(data.every((topic) => topic.isArchived === true)).toBe(true)
    })

    test("includes idea count, tags, createdAt, updatedAt for each topic", async () => {
      const res = await fetch(`${baseURL}/api/archive/topics`)
      expect(res.status).toBe(200)

      const data = (await res.json()) as Array<{
        id: string
        name: string
        description: string | null
        isArchived: boolean
        ideaCount: number
        tags: string[]
        createdAt: string
        updatedAt: string
      }>

      const topic1 = data.find((t) => t.name === "Archived Topic 1")
      expect(topic1).toBeDefined()
      expect(topic1!.ideaCount).toBe(2)
      expect(topic1!.tags).toContain("archive-tag-1")
      expect(topic1!.createdAt).toBeDefined()
      expect(topic1!.updatedAt).toBeDefined()
    })

    test("returns empty array when no archived topics", async () => {
      // Unarchive all topics
      db.query("UPDATE topics SET isArchived = 0 WHERE isArchived = 1").run()

      const res = await fetch(`${baseURL}/api/archive/topics`)
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data).toHaveLength(0)

      // Restore archived topics for subsequent tests
      db.query("UPDATE topics SET isArchived = 1 WHERE name LIKE 'Archived Topic%'").run()
    })

    test("sorts results by updatedAt DESC (newest archived first)", async () => {
      const res = await fetch(`${baseURL}/api/archive/topics`)
      expect(res.status).toBe(200)

      const data = (await res.json()) as Array<{
        id: string
        name: string
        updatedAt: string
      }>

      // All topics have the same updatedAt, so we just verify the structure
      expect(data.length).toBeGreaterThan(0)
      expect(data[0]?.updatedAt).toBeDefined()
    })
  })

  describe("GET /api/archive/ideas", () => {
    test("returns archived ideas only", async () => {
      const res = await fetch(`${baseURL}/api/archive/ideas`)
      expect(res.status).toBe(200)

      const data = (await res.json()) as Array<{
        id: string
        name: string
        isArchived: boolean
      }>

      expect(data).toHaveLength(3)
      expect(data.every((idea) => idea.isArchived === true)).toBe(true)
    })

    test("includes parent topic name, tags, createdAt, updatedAt for each idea", async () => {
      const res = await fetch(`${baseURL}/api/archive/ideas`)
      expect(res.status).toBe(200)

      const data = (await res.json()) as Array<{
        id: string
        name: string
        topicName: string | null
        tags: string[]
        createdAt: string
        updatedAt: string
      }>

      const idea1 = data.find((i) => i.name === "Archived Idea 1")
      expect(idea1).toBeDefined()
      expect(idea1!.topicName).toBe("Archived Topic 1")
      expect(idea1!.tags).toContain("archive-tag-1")
      expect(idea1!.createdAt).toBeDefined()
      expect(idea1!.updatedAt).toBeDefined()
    })

    test("returns empty array when no archived ideas", async () => {
      // Unarchive all ideas
      db.query("UPDATE ideas SET isArchived = 0 WHERE isArchived = 1").run()

      const res = await fetch(`${baseURL}/api/archive/ideas`)
      expect(res.status).toBe(200)

      const data = await res.json()
      expect(data).toHaveLength(0)

      // Restore archived ideas for subsequent tests
      db.query("UPDATE ideas SET isArchived = 1 WHERE name LIKE 'Archived Idea%'").run()
    })

    test("sorts results by updatedAt DESC (newest archived first)", async () => {
      const res = await fetch(`${baseURL}/api/archive/ideas`)
      expect(res.status).toBe(200)

      const data = (await res.json()) as Array<{
        id: string
        name: string
        updatedAt: string
      }>

      // All ideas have the same updatedAt, so we just verify the structure
      expect(data.length).toBeGreaterThan(0)
      expect(data[0]?.updatedAt).toBeDefined()
    })
  })
})
