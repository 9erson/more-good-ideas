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
