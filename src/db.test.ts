import { test, expect, beforeEach, describe } from "bun:test";
import { getDatabase, initDatabase } from "./lib/db";
import { randomUUID } from "node:crypto";

describe("database schema", () => {
  let db: ReturnType<typeof getDatabase>;

  beforeEach(() => {
    db = getDatabase();
    db.exec("DROP TABLE IF EXISTS feedback");
    db.exec("DROP TABLE IF EXISTS idea_tags");
    db.exec("DROP TABLE IF EXISTS topic_tags");
    db.exec("DROP TABLE IF EXISTS ideas");
    db.exec("DROP TABLE IF EXISTS tags");
    db.exec("DROP TABLE IF EXISTS topics");
    initDatabase(db);
  });

  test("topics table exists and has correct schema", () => {
    const result = db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='topics'").get() as { sql: string };
    expect(result).toBeDefined();
    expect(result.sql).toContain("id TEXT PRIMARY KEY");
    expect(result.sql).toContain("name TEXT NOT NULL UNIQUE");
    expect(result.sql).toContain("description TEXT");
    expect(result.sql).toContain("isArchived INTEGER NOT NULL DEFAULT 0");
    expect(result.sql).toContain("createdAt TEXT NOT NULL");
    expect(result.sql).toContain("updatedAt TEXT NOT NULL");
  });

  test("ideas table exists and has correct schema", () => {
    const result = db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='ideas'").get() as { sql: string };
    expect(result).toBeDefined();
    expect(result.sql).toContain("id TEXT PRIMARY KEY");
    expect(result.sql).toContain("topicId TEXT NOT NULL");
    expect(result.sql).toContain("FOREIGN KEY (topicId) REFERENCES topics(id) ON DELETE CASCADE");
  });

  test("tags table exists and has correct schema", () => {
    const result = db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='tags'").get() as { sql: string };
    expect(result).toBeDefined();
    expect(result.sql).toContain("id TEXT PRIMARY KEY");
    expect(result.sql).toContain("name TEXT NOT NULL UNIQUE COLLATE NOCASE");
  });

  test("topic_tags table exists and has correct schema", () => {
    const result = db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='topic_tags'").get() as { sql: string };
    expect(result).toBeDefined();
    expect(result.sql).toContain("PRIMARY KEY (topicId, tagId)");
    expect(result.sql).toContain("FOREIGN KEY (topicId) REFERENCES topics(id) ON DELETE CASCADE");
    expect(result.sql).toContain("FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE");
  });

  test("idea_tags table exists and has correct schema", () => {
    const result = db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='idea_tags'").get() as { sql: string };
    expect(result).toBeDefined();
    expect(result.sql).toContain("PRIMARY KEY (ideaId, tagId)");
    expect(result.sql).toContain("FOREIGN KEY (ideaId) REFERENCES ideas(id) ON DELETE CASCADE");
    expect(result.sql).toContain("FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE");
  });

  test("feedback table exists and has correct schema", () => {
    const result = db.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='feedback'").get() as { sql: string };
    expect(result).toBeDefined();
    expect(result.sql).toContain("id TEXT PRIMARY KEY");
    expect(result.sql).toContain("ideaId TEXT NOT NULL");
    expect(result.sql).toContain("rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5)");
    expect(result.sql).toContain("FOREIGN KEY (ideaId) REFERENCES ideas(id) ON DELETE CASCADE");
  });

  test("indexes exist for foreign keys", () => {
    const indexes = db.query("SELECT name FROM sqlite_master WHERE type='index'").all() as Array<{ name: string }>;
    const indexNames = indexes.map(i => i.name);
    expect(indexNames).toContain("idx_ideas_topicId");
    expect(indexNames).toContain("idx_feedback_ideaId");
  });

  test("duplicate topic name throws error", () => {
    const topicId = randomUUID();
    const now = new Date().toISOString();

    db.query(
      "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(topicId, "Test Topic", "Description", 0, now, now);

    expect(() => {
      db.query(
        "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(randomUUID(), "Test Topic", "Description", 0, now, now);
    }).toThrow();
  });

  test("foreign key constraint enforced: cannot insert idea without topic", () => {
    const ideaId = randomUUID();
    const now = new Date().toISOString();

    expect(() => {
      db.query(
        "INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run(ideaId, "non-existent-topic", "Test Idea", "Description", 0, now, now);
    }).toThrow();
  });

  test("foreign key constraint enforced: deleting topic with ideas cascades", () => {
    const topicId = randomUUID();
    const ideaId = randomUUID();
    const tagId = randomUUID();
    const feedbackId = randomUUID();
    const now = new Date().toISOString();

    db.query(
      "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(topicId, "Test Topic", "Description", 0, now, now);

    db.query(
      "INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(ideaId, topicId, "Test Idea", "Description", 0, now, now);

    db.query("INSERT INTO tags (id, name) VALUES (?, ?)").run(tagId, "test-tag");

    db.query("INSERT INTO topic_tags (topicId, tagId) VALUES (?, ?)").run(topicId, tagId);
    db.query("INSERT INTO idea_tags (ideaId, tagId) VALUES (?, ?)").run(ideaId, tagId);

    db.query(
      "INSERT INTO feedback (id, ideaId, rating, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(feedbackId, ideaId, 5, "Great idea!", now, now);

    const ideaBeforeDelete = db.query("SELECT * FROM ideas WHERE id = ?").get(ideaId);
    expect(ideaBeforeDelete).toBeDefined();

    const feedbackBeforeDelete = db.query("SELECT * FROM feedback WHERE id = ?").get(feedbackId);
    expect(feedbackBeforeDelete).toBeDefined();

    const topicTagBeforeDelete = db.query("SELECT * FROM topic_tags WHERE topicId = ? AND tagId = ?").get(topicId, tagId);
    expect(topicTagBeforeDelete).toBeDefined();

    const ideaTagBeforeDelete = db.query("SELECT * FROM idea_tags WHERE ideaId = ? AND tagId = ?").get(ideaId, tagId);
    expect(ideaTagBeforeDelete).toBeDefined();

    db.query("DELETE FROM topics WHERE id = ?").run(topicId);

    const ideaAfterDelete = db.query("SELECT * FROM ideas WHERE id = ?").get(ideaId);
    expect(ideaAfterDelete).toBeNull();

    const feedbackAfterDelete = db.query("SELECT * FROM feedback WHERE id = ?").get(feedbackId);
    expect(feedbackAfterDelete).toBeNull();

    const topicTagAfterDelete = db.query("SELECT * FROM topic_tags WHERE topicId = ? AND tagId = ?").get(topicId, tagId);
    expect(topicTagAfterDelete).toBeNull();

    const ideaTagAfterDelete = db.query("SELECT * FROM idea_tags WHERE ideaId = ? AND tagId = ?").get(ideaId, tagId);
    expect(ideaTagAfterDelete).toBeNull();
  });

  test("foreign key constraint enforced: deleting tag removes tag associations", () => {
    const topicId = randomUUID();
    const tagId = randomUUID();
    const now = new Date().toISOString();

    db.query(
      "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(topicId, "Test Topic", "Description", 0, now, now);

    db.query("INSERT INTO tags (id, name) VALUES (?, ?)").run(tagId, "test-tag");

    db.query("INSERT INTO topic_tags (topicId, tagId) VALUES (?, ?)").run(topicId, tagId);

    const topicTagBeforeDelete = db.query("SELECT * FROM topic_tags WHERE topicId = ? AND tagId = ?").get(topicId, tagId);
    expect(topicTagBeforeDelete).toBeDefined();

    db.query("DELETE FROM tags WHERE id = ?").run(tagId);

    const topicTagAfterDelete = db.query("SELECT * FROM topic_tags WHERE topicId = ? AND tagId = ?").get(topicId, tagId);
    expect(topicTagAfterDelete).toBeNull();
  });

  test("feedback rating constraint: rating must be between 1 and 5", () => {
    const ideaId = randomUUID();
    const feedbackId = randomUUID();
    const now = new Date().toISOString();

    expect(() => {
      db.query(
        "INSERT INTO feedback (id, ideaId, rating, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(feedbackId, ideaId, 0, "Invalid rating", now, now);
    }).toThrow();

    expect(() => {
      db.query(
        "INSERT INTO feedback (id, ideaId, rating, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(feedbackId, ideaId, 6, "Invalid rating", now, now);
    }).toThrow();
  });

  test("tag names are case-insensitive", () => {
    const tagId1 = randomUUID();
    const tagId2 = randomUUID();

    db.query("INSERT INTO tags (id, name) VALUES (?, ?)").run(tagId1, "test-tag");

    expect(() => {
      db.query("INSERT INTO tags (id, name) VALUES (?, ?)").run(tagId2, "TEST-TAG");
    }).toThrow();
  });

  test("full workflow: topic with idea, tags, and feedback", () => {
    const topicId = randomUUID();
    const ideaId = randomUUID();
    const tagId1 = randomUUID();
    const tagId2 = randomUUID();
    const feedbackId = randomUUID();
    const now = new Date().toISOString();

    db.query(
      "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(topicId, "Test Topic", "Description", 0, now, now);

    db.query(
      "INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(ideaId, topicId, "Test Idea", "Description", 0, now, now);

    db.query("INSERT INTO tags (id, name) VALUES (?, ?)").run(tagId1, "tag1");
    db.query("INSERT INTO tags (id, name) VALUES (?, ?)").run(tagId2, "tag2");

    db.query("INSERT INTO topic_tags (topicId, tagId) VALUES (?, ?)").run(topicId, tagId1);
    db.query("INSERT INTO topic_tags (topicId, tagId) VALUES (?, ?)").run(topicId, tagId2);

    db.query("INSERT INTO idea_tags (ideaId, tagId) VALUES (?, ?)").run(ideaId, tagId1);

    db.query(
      "INSERT INTO feedback (id, ideaId, rating, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(feedbackId, ideaId, 5, "Great idea!", now, now);

    const topic = db.query("SELECT * FROM topics WHERE id = ?").get(topicId);
    expect(topic).toBeDefined();
    expect((topic as { name: string }).name).toBe("Test Topic");

    const idea = db.query("SELECT * FROM ideas WHERE id = ?").get(ideaId);
    expect(idea).toBeDefined();
    expect((idea as { topicId: string }).topicId).toBe(topicId);

    const topicTags = db.query("SELECT COUNT(*) as count FROM topic_tags WHERE topicId = ?").get(topicId);
    expect((topicTags as { count: number }).count).toBe(2);

    const ideaTags = db.query("SELECT COUNT(*) as count FROM idea_tags WHERE ideaId = ?").get(ideaId);
    expect((ideaTags as { count: number }).count).toBe(1);

    const feedback = db.query("SELECT * FROM feedback WHERE ideaId = ?").get(ideaId);
    expect(feedback).toBeDefined();
    expect((feedback as { rating: number }).rating).toBe(5);
  });
});
