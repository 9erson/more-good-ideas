import { serve } from "bun"
import index from "./index.html"
import { getDatabase } from "./lib/db"

const db = getDatabase()

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(_req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        })
      },
      async PUT(_req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        })
      },
    },

    "/api/hello/:name": async (req) => {
      const name = req.params.name
      return Response.json({
        message: `Hello, ${name}!`,
      })
    },

    "/api/topics": {
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
            LEFT JOIN ideas i ON i.topicId = t.id AND i.isArchived = 0
            WHERE t.isArchived = 0
            GROUP BY t.id
            ORDER BY t.createdAt DESC
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
          console.error("Error fetching topics:", error)
          return Response.json({ error: "Failed to fetch topics" }, { status: 500 })
        }
      },

      async POST(req) {
        try {
          const body = await req.json()
          const { name, description, tags } = body

          if (!name || typeof name !== "string" || name.trim() === "") {
            return Response.json({ error: "Name is required" }, { status: 400 })
          }

          const topicId = crypto.randomUUID()
          const now = new Date().toISOString()

          db.query(`
            INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt)
            VALUES (?, ?, ?, 0, ?, ?)
          `).run(topicId, name.trim(), description || null, now, now)

          const tagIds: string[] = []

          if (tags && Array.isArray(tags) && tags.length > 0) {
            const insertTag = db.query("INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)")
            const getTagId = db.query("SELECT id FROM tags WHERE LOWER(name) = LOWER(?)")

            for (const tag of tags) {
              const tagName = tag.trim()
              if (!tagName) continue

              const existingTag = getTagId.get(tagName) as { id: string } | undefined

              if (existingTag) {
                tagIds.push(existingTag.id)
              } else {
                const tagId = crypto.randomUUID()
                insertTag.run(tagId, tagName)
                tagIds.push(tagId)
              }
            }

            const linkTag = db.query(
              "INSERT OR IGNORE INTO topic_tags (topicId, tagId) VALUES (?, ?)"
            )
            for (const tagId of tagIds) {
              linkTag.run(topicId, tagId)
            }
          }

          const topic = db.query("SELECT * FROM topics WHERE id = ?").get(topicId) as {
            id: string
            name: string
            description: string | null
            isArchived: number
            createdAt: string
            updatedAt: string
          }

          return Response.json({
            id: topic.id,
            name: topic.name,
            description: topic.description,
            isArchived: topic.isArchived === 1,
            createdAt: topic.createdAt,
            updatedAt: topic.updatedAt,
          })
        } catch (error) {
          console.error("Error creating topic:", error)
          return Response.json({ error: "Failed to create topic" }, { status: 500 })
        }
      },
    },

    "/api/tags": {
      async GET() {
        try {
          const tags = db.query("SELECT name FROM tags ORDER BY LOWER(name)").all() as Array<{
            name: string
          }>
          return Response.json(tags.map((t) => t.name))
        } catch (error) {
          console.error("Error fetching tags:", error)
          return Response.json({ error: "Failed to fetch tags" }, { status: 500 })
        }
      },
    },

    "/api/ideas": {
      async POST(req) {
        try {
          const body = await req.json()
          const { topicId, name, description, tags } = body

          if (!topicId || typeof topicId !== "string" || topicId.trim() === "") {
            return Response.json({ error: "Topic is required" }, { status: 400 })
          }

          if (!name || typeof name !== "string" || name.trim() === "") {
            return Response.json({ error: "Name is required" }, { status: 400 })
          }

          const topic = db
            .query("SELECT * FROM topics WHERE id = ? AND isArchived = 0")
            .get(topicId) as
            | {
                id: string
                name: string
                description: string | null
                isArchived: number
                createdAt: string
                updatedAt: string
              }
            | undefined

          if (!topic) {
            return Response.json({ error: "Topic not found" }, { status: 404 })
          }

          const ideaId = crypto.randomUUID()
          const now = new Date().toISOString()

          db.query(`
            INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, 0, ?, ?)
          `).run(ideaId, topicId, name.trim(), description || null, now, now)

          const tagIds: string[] = []

          if (tags && Array.isArray(tags) && tags.length > 0) {
            const insertTag = db.query("INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)")
            const getTagId = db.query("SELECT id FROM tags WHERE LOWER(name) = LOWER(?)")

            for (const tag of tags) {
              const tagName = tag.trim()
              if (!tagName) continue

              const existingTag = getTagId.get(tagName) as { id: string } | undefined

              if (existingTag) {
                tagIds.push(existingTag.id)
              } else {
                const tagId = crypto.randomUUID()
                insertTag.run(tagId, tagName)
                tagIds.push(tagId)
              }
            }

            const linkTag = db.query(
              "INSERT OR IGNORE INTO idea_tags (ideaId, tagId) VALUES (?, ?)"
            )
            for (const tagId of tagIds) {
              linkTag.run(ideaId, tagId)
            }
          }

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
          console.error("Error creating idea:", error)
          return Response.json({ error: "Failed to create idea" }, { status: 500 })
        }
      },
    },

    "/api/ideas/:id": {
      async GET(req) {
        try {
          const ideaId = req.params.id

          const idea = db
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
              t.isArchived as topicArchived,
              f.rating as feedbackRating,
              f.notes as feedbackNotes,
              (
                SELECT GROUP_CONCAT(tag.name, ',')
                FROM idea_tags it
                JOIN tags tag ON tag.id = it.tagId
                WHERE it.ideaId = i.id
              ) as tags
            FROM ideas i
            LEFT JOIN topics t ON t.id = i.topicId
            LEFT JOIN feedback f ON f.ideaId = i.id
            WHERE i.id = ?
          `)
            .get(ideaId) as
            | {
                id: string
                topicId: string
                name: string
                description: string | null
                isArchived: number
                createdAt: string
                updatedAt: string
                topicName: string | null
                topicArchived: number | null
                feedbackRating: number | null
                feedbackNotes: string | null
                tags: string | null
              }
            | undefined

          if (!idea || idea.isArchived === 1 || idea.topicArchived === 1) {
            return Response.json({ error: "Idea not found" }, { status: 404 })
          }

          return Response.json({
            id: idea.id,
            topicId: idea.topicId,
            topicName: idea.topicName,
            name: idea.name,
            description: idea.description,
            isArchived: idea.isArchived === 1,
            tags: idea.tags ? idea.tags.split(",") : [],
            feedback: idea.feedbackRating
              ? {
                  rating: idea.feedbackRating,
                  notes: idea.feedbackNotes,
                }
              : undefined,
            createdAt: idea.createdAt,
            updatedAt: idea.updatedAt,
          })
        } catch (error) {
          console.error("Error fetching idea:", error)
          return Response.json({ error: "Failed to fetch idea" }, { status: 500 })
        }
      },
    },

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

    "/api/archive/topics/:id/restore": {
      async POST(req) {
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

          if (!existingTopic) {
            return Response.json({ error: "Topic not found" }, { status: 404 })
          }

          if (existingTopic.isArchived === 0) {
            return Response.json({ error: "Topic is not archived" }, { status: 400 })
          }

          const now = new Date().toISOString()

          db.query(`
            UPDATE topics
            SET isArchived = 0, updatedAt = ?
            WHERE id = ?
          `).run(now, topicId)

          db.query(`
            UPDATE ideas
            SET isArchived = 0, updatedAt = ?
            WHERE topicId = ?
          `).run(now, topicId)

          const restoredTopic = db
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
            LEFT JOIN ideas i ON i.topicId = t.id AND i.isArchived = 0
            WHERE t.id = ?
            GROUP BY t.id
          `)
            .get(topicId) as {
            id: string
            name: string
            description: string | null
            isArchived: number
            createdAt: string
            updatedAt: string
            ideaCount: number
            tags: string | null
          }

          return Response.json({
            id: restoredTopic.id,
            name: restoredTopic.name,
            description: restoredTopic.description,
            isArchived: restoredTopic.isArchived === 1,
            ideaCount: restoredTopic.ideaCount,
            tags: restoredTopic.tags ? restoredTopic.tags.split(",") : [],
            createdAt: restoredTopic.createdAt,
            updatedAt: restoredTopic.updatedAt,
          })
        } catch (error) {
          console.error("Error restoring topic:", error)
          return Response.json({ error: "Failed to restore topic" }, { status: 500 })
        }
      },
    },

    "/api/archive/ideas/:id/restore": {
      async POST(req) {
        try {
          const ideaId = req.params.id

          const idea = db
            .query(`
            SELECT i.id, i.topicId, i.name, i.description, i.isArchived, t.isArchived as topicArchived
            FROM ideas i
            LEFT JOIN topics t ON t.id = i.topicId
            WHERE i.id = ?
          `)
            .get(ideaId) as
            | {
                id: string
                topicId: string
                name: string
                description: string | null
                isArchived: number
                topicArchived: number
              }
            | undefined

          if (!idea) {
            return Response.json({ error: "Idea not found" }, { status: 404 })
          }

          if (idea.isArchived === 0) {
            return Response.json({ error: "Idea is not archived" }, { status: 400 })
          }

          if (idea.topicArchived === 1) {
            const topic = db.query("SELECT id, name FROM topics WHERE id = ?").get(idea.topicId) as {
              id: string
              name: string
            } | undefined

            return Response.json(
              {
                error: "Cannot restore idea because its parent topic is archived",
                topic: topic
                  ? {
                      id: topic.id,
                      name: topic.name,
                    }
                  : null,
              },
              { status: 400 }
            )
          }

          const now = new Date().toISOString()

          db.query(`
            UPDATE ideas
            SET isArchived = 0, updatedAt = ?
            WHERE id = ?
          `).run(now, ideaId)

          const restoredIdea = db
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
            WHERE i.id = ?
          `)
            .get(ideaId) as {
            id: string
            topicId: string
            name: string
            description: string | null
            isArchived: number
            createdAt: string
            updatedAt: string
            topicName: string | null
            tags: string | null
          }

          return Response.json({
            id: restoredIdea.id,
            topicId: restoredIdea.topicId,
            name: restoredIdea.name,
            description: restoredIdea.description,
            isArchived: restoredIdea.isArchived === 1,
            topicName: restoredIdea.topicName,
            tags: restoredIdea.tags ? restoredIdea.tags.split(",") : [],
            createdAt: restoredIdea.createdAt,
            updatedAt: restoredIdea.updatedAt,
          })
        } catch (error) {
          console.error("Error restoring idea:", error)
          return Response.json({ error: "Failed to restore idea" }, { status: 500 })
        }
      },
    },

    "/api/test/cleanup": {
      async POST() {
        if (process.env.NODE_ENV === "production") {
          return Response.json({ error: "Not allowed in production" }, { status: 403 })
        }
        try {
          db.exec("DELETE FROM feedback")
          db.exec("DELETE FROM idea_tags")
          db.exec("DELETE FROM topic_tags")
          db.exec("DELETE FROM ideas")
          db.exec("DELETE FROM topics")
          db.exec("DELETE FROM tags")
          return Response.json({ success: true })
        } catch (error) {
          console.error("Error cleaning up database:", error)
          return Response.json({ error: "Failed to cleanup database" }, { status: 500 })
        }
      },
    },

    "/api/topics/:id": {
      async GET(req) {
        try {
          const topicId = req.params.id

          const topic = db
            .query(`
            SELECT 
              t.id,
              t.name,
              t.description,
              t.isArchived,
              t.createdAt,
              t.updatedAt,
              (
                SELECT GROUP_CONCAT(tag.name, ',')
                FROM topic_tags tt
                JOIN tags tag ON tag.id = tt.tagId
                WHERE tt.topicId = t.id
              ) as tags
            FROM topics t
            WHERE t.id = ?
          `)
            .get(topicId) as
            | {
                id: string
                name: string
                description: string | null
                isArchived: number
                createdAt: string
                updatedAt: string
                tags: string | null
              }
            | undefined

          if (!topic || topic.isArchived === 1) {
            return Response.json({ error: "Topic not found" }, { status: 404 })
          }

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
              f.rating as feedbackRating,
              f.notes as feedbackNotes,
              (
                SELECT GROUP_CONCAT(tag.name, ',')
                FROM idea_tags it
                JOIN tags tag ON tag.id = it.tagId
                WHERE it.ideaId = i.id
              ) as tags
            FROM ideas i
            LEFT JOIN feedback f ON f.ideaId = i.id
            WHERE i.topicId = ? AND i.isArchived = 0
            ORDER BY i.createdAt DESC
          `)
            .all(topicId) as Array<{
            id: string
            topicId: string
            name: string
            description: string | null
            isArchived: number
            createdAt: string
            updatedAt: string
            feedbackRating: number | null
            feedbackNotes: string | null
            tags: string | null
          }>

          const formattedIdeas = ideas.map((idea) => ({
            id: idea.id,
            topicId: idea.topicId,
            name: idea.name,
            description: idea.description,
            isArchived: idea.isArchived === 1,
            tags: idea.tags ? idea.tags.split(",") : [],
            feedback: idea.feedbackRating
              ? {
                  rating: idea.feedbackRating,
                  notes: idea.feedbackNotes,
                }
              : undefined,
            createdAt: idea.createdAt,
            updatedAt: idea.updatedAt,
          }))

          return Response.json({
            id: topic.id,
            name: topic.name,
            description: topic.description,
            isArchived: topic.isArchived === 1,
            tags: topic.tags ? topic.tags.split(",") : [],
            ideas: formattedIdeas,
            createdAt: topic.createdAt,
            updatedAt: topic.updatedAt,
          })
        } catch (error) {
          console.error("Error fetching topic:", error)
          return Response.json({ error: "Failed to fetch topic" }, { status: 500 })
        }
      },

      async PUT(req) {
        try {
          const topicId = req.params.id
          const body = await req.json()
          const { name, description, tags } = body

          if (!name || typeof name !== "string" || name.trim() === "") {
            return Response.json({ error: "Name is required" }, { status: 400 })
          }

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
            SET name = ?, description = ?, updatedAt = ?
            WHERE id = ?
          `).run(name.trim(), description || null, now, topicId)

          if (tags && Array.isArray(tags)) {
            const existingTagLinks = db
              .query("SELECT tagId FROM topic_tags WHERE topicId = ?")
              .all(topicId) as Array<{ tagId: string }>
            const existingTagIds = existingTagLinks.map((t) => t.tagId)

            const insertTag = db.query("INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)")
            const getTagId = db.query("SELECT id FROM tags WHERE LOWER(name) = LOWER(?)")
            const linkTag = db.query(
              "INSERT OR IGNORE INTO topic_tags (topicId, tagId) VALUES (?, ?)"
            )
            const unlinkTag = db.query("DELETE FROM topic_tags WHERE topicId = ? AND tagId = ?")

            const newTagIds: string[] = []

            for (const tag of tags) {
              const tagName = tag.trim()
              if (!tagName) continue

              const existingTag = getTagId.get(tagName) as { id: string } | undefined

              if (existingTag) {
                newTagIds.push(existingTag.id)
                linkTag.run(topicId, existingTag.id)
              } else {
                const tagId = crypto.randomUUID()
                insertTag.run(tagId, tagName)
                newTagIds.push(tagId)
                linkTag.run(topicId, tagId)
              }
            }

            for (const oldTagId of existingTagIds) {
              if (!newTagIds.includes(oldTagId)) {
                unlinkTag.run(topicId, oldTagId)
              }
            }
          }

          const topic = db.query("SELECT * FROM topics WHERE id = ?").get(topicId) as {
            id: string
            name: string
            description: string | null
            isArchived: number
            createdAt: string
            updatedAt: string
          }

          return Response.json({
            id: topic.id,
            name: topic.name,
            description: topic.description,
            isArchived: topic.isArchived === 1,
            createdAt: topic.createdAt,
            updatedAt: topic.updatedAt,
          })
        } catch (error) {
          console.error("Error updating topic:", error)
          return Response.json({ error: "Failed to update topic" }, { status: 500 })
        }
      },

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

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
})

console.log(`🚀 Server running at ${server.url}`)
