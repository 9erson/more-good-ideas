#!/usr/bin/env bun
import { getDatabase, initDatabase } from "./src/lib/db";
import { randomUUID } from "node:crypto";

const db = getDatabase();
initDatabase(db);

const now = new Date().toISOString();

const topics = [
  {
    id: randomUUID(),
    name: "Startup Ideas",
    description: "Potential business ideas and concepts to explore",
  },
  {
    id: randomUUID(),
    name: "Book Recommendations",
    description: "Books to read and share",
  },
  {
    id: randomUUID(),
    name: "Personal Development",
    description: "Goals and plans for self-improvement",
  },
  {
    id: randomUUID(),
    name: "Archived Project",
    description: "This should not appear on the dashboard",
  },
];

const tags = [
  { id: randomUUID(), name: "business" },
  { id: randomUUID(), name: "tech" },
  { id: randomUUID(), name: "self-help" },
  { id: randomUUID(), name: "productivity" },
];

const topicTags = [
  { topicId: topics[0].id, tagId: tags[0].id },
  { topicId: topics[0].id, tagId: tags[1].id },
  { topicId: topics[1].id, tagId: tags[2].id },
  { topicId: topics[2].id, tagId: tags[2].id },
  { topicId: topics[2].id, tagId: tags[3].id },
];

const ideas = [
  { id: randomUUID(), topicId: topics[0].id, name: "AI Assistant Service" },
  { id: randomUUID(), topicId: topics[0].id, name: "Mobile Payment App" },
  { id: randomUUID(), topicId: topics[0].id, name: "Remote Work Platform" },
  { id: randomUUID(), topicId: topics[1].id, name: "Atomic Habits" },
  { id: randomUUID(), topicId: topics[2].id, name: "Morning Routine" },
  { id: randomUUID(), topicId: topics[3].id, name: "Old Archived Idea" },
];

db.query(
  "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
).run(
  topics[0].id,
  topics[0].name,
  topics[0].description,
  0,
  now,
  now
);

db.query(
  "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
).run(
  topics[1].id,
  topics[1].name,
  topics[1].description,
  0,
  now,
  now
);

db.query(
  "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
).run(
  topics[2].id,
  topics[2].name,
  topics[2].description,
  0,
  now,
  now
);

db.query(
  "INSERT INTO topics (id, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)"
).run(
  topics[3].id,
  topics[3].name,
  topics[3].description,
  1,
  now,
  now
);

for (const tag of tags) {
  db.query("INSERT INTO tags (id, name) VALUES (?, ?)").run(tag.id, tag.name);
}

for (const topicTag of topicTags) {
  db.query("INSERT INTO topic_tags (topicId, tagId) VALUES (?, ?)").run(topicTag.topicId, topicTag.tagId);
}

for (const idea of ideas) {
  const topic = topics.find(t => t.id === idea.topicId);
  const isArchived = topic?.isArchived ?? 0;
  db.query(
    "INSERT INTO ideas (id, topicId, name, description, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(idea.id, idea.topicId, idea.name, null, isArchived, now, now);
}

console.log("✅ Test data seeded successfully");
console.log(`   - 4 topics (1 archived, 3 active)`);
console.log(`   - ${ideas.length} ideas`);
console.log(`   - ${tags.length} tags`);

db.close();
