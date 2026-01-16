import { serve } from "bun";
import index from "./index.html";
import { getDatabase } from "./lib/db";

const db = getDatabase();

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/hello": {
      async GET(req) {
        return Response.json({
          message: "Hello, world!",
          method: "GET",
        });
      },
      async PUT(req) {
        return Response.json({
          message: "Hello, world!",
          method: "PUT",
        });
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },

    "/api/topics": {
      async GET() {
        try {
          const topics = db.query(`
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
          `).all() as Array<{
            id: string;
            name: string;
            description: string | null;
            isArchived: number;
            createdAt: string;
            updatedAt: string;
            ideaCount: number;
            tags: string | null;
          }>;

          const formattedTopics = topics.map(topic => ({
            id: topic.id,
            name: topic.name,
            description: topic.description,
            isArchived: topic.isArchived === 1,
            ideaCount: topic.ideaCount,
            tags: topic.tags ? topic.tags.split(",") : [],
            createdAt: topic.createdAt,
            updatedAt: topic.updatedAt,
          }));

          return Response.json(formattedTopics);
        } catch (error) {
          console.error("Error fetching topics:", error);
          return Response.json({ error: "Failed to fetch topics" }, { status: 500 });
        }
      },

      async POST(req) {
        try {
          const body = await req.json();
          const { name, description, tags } = body;

          if (!name || typeof name !== "string" || name.trim() === "") {
            return Response.json({ error: "Name is required" }, { status: 400 });
          }

          const topicId = crypto.randomUUID();
          const now = new Date().toISOString();

          db.query(`
            INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt)
            VALUES (?, ?, ?, 0, ?, ?)
          `).run(topicId, name.trim(), description || null, now, now);

          const tagIds: string[] = [];

          if (tags && Array.isArray(tags) && tags.length > 0) {
            const insertTag = db.query("INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)");
            const getTagId = db.query("SELECT id FROM tags WHERE LOWER(name) = LOWER(?)");

            for (const tag of tags) {
              const tagName = tag.trim();
              if (!tagName) continue;

              const existingTag = getTagId.get(tagName) as { id: string } | undefined;

              if (existingTag) {
                tagIds.push(existingTag.id);
              } else {
                const tagId = crypto.randomUUID();
                insertTag.run(tagId, tagName);
                tagIds.push(tagId);
              }
            }

            const linkTag = db.query("INSERT OR IGNORE INTO topic_tags (topicId, tagId) VALUES (?, ?)");
            for (const tagId of tagIds) {
              linkTag.run(topicId, tagId);
            }
          }

          const topic = db.query("SELECT * FROM topics WHERE id = ?").get(topicId) as {
            id: string;
            name: string;
            description: string | null;
            isArchived: number;
            createdAt: string;
            updatedAt: string;
          };

          return Response.json({
            id: topic.id,
            name: topic.name,
            description: topic.description,
            isArchived: topic.isArchived === 1,
            createdAt: topic.createdAt,
            updatedAt: topic.updatedAt,
          });
        } catch (error) {
          console.error("Error creating topic:", error);
          return Response.json({ error: "Failed to create topic" }, { status: 500 });
        }
      },
    },

    "/api/tags": {
      async GET() {
        try {
          const tags = db.query("SELECT name FROM tags ORDER BY LOWER(name)").all() as Array<{ name: string }>;
          return Response.json(tags.map(t => t.name));
        } catch (error) {
          console.error("Error fetching tags:", error);
          return Response.json({ error: "Failed to fetch tags" }, { status: 500 });
        }
      },
    },

    "/api/topics/:id": {
      async GET(req) {
        try {
          const topicId = req.params.id;

          const topic = db.query(`
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
          `).get(topicId) as {
            id: string;
            name: string;
            description: string | null;
            isArchived: number;
            createdAt: string;
            updatedAt: string;
            tags: string | null;
          } | undefined;

          if (!topic || topic.isArchived === 1) {
            return Response.json({ error: "Topic not found" }, { status: 404 });
          }

          const ideas = db.query(`
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
          `).all(topicId) as Array<{
            id: string;
            topicId: string;
            name: string;
            description: string | null;
            isArchived: number;
            createdAt: string;
            updatedAt: string;
            feedbackRating: number | null;
            feedbackNotes: string | null;
            tags: string | null;
          }>;

          const formattedIdeas = ideas.map(idea => ({
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
          }));

          return Response.json({
            id: topic.id,
            name: topic.name,
            description: topic.description,
            isArchived: topic.isArchived === 1,
            tags: topic.tags ? topic.tags.split(",") : [],
            ideas: formattedIdeas,
            createdAt: topic.createdAt,
            updatedAt: topic.updatedAt,
          });
        } catch (error) {
          console.error("Error fetching topic:", error);
          return Response.json({ error: "Failed to fetch topic" }, { status: 500 });
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
});

console.log(`🚀 Server running at ${server.url}`);
