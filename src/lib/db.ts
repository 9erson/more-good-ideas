import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";

const DB_PATH = "data/database.sqlite";

export function getDatabase(): Database {
  mkdirSync("data", { recursive: true });
  const db = new Database(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON");
  return db;
}

export function initDatabase(db: Database): void {
  db.exec(`
    -- Topics table
    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      isArchived INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    -- Ideas table
    CREATE TABLE IF NOT EXISTS ideas (
      id TEXT PRIMARY KEY,
      topicId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      isArchived INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (topicId) REFERENCES topics(id) ON DELETE CASCADE
    );

    -- Tags table
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE COLLATE NOCASE
    );

    -- Topic tags join table
    CREATE TABLE IF NOT EXISTS topic_tags (
      topicId TEXT NOT NULL,
      tagId TEXT NOT NULL,
      PRIMARY KEY (topicId, tagId),
      FOREIGN KEY (topicId) REFERENCES topics(id) ON DELETE CASCADE,
      FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
    );

    -- Idea tags join table
    CREATE TABLE IF NOT EXISTS idea_tags (
      ideaId TEXT NOT NULL,
      tagId TEXT NOT NULL,
      PRIMARY KEY (ideaId, tagId),
      FOREIGN KEY (ideaId) REFERENCES ideas(id) ON DELETE CASCADE,
      FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
    );

    -- Feedback table
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      ideaId TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      notes TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (ideaId) REFERENCES ideas(id) ON DELETE CASCADE
    );

    -- Indexes for foreign keys
    CREATE INDEX IF NOT EXISTS idx_ideas_topicId ON ideas(topicId);
    CREATE INDEX IF NOT EXISTS idx_feedback_ideaId ON feedback(ideaId);
  `);
}
