/**
 * Tag processing utilities for topics and ideas
 *
 * Provides shared functions for syncing tags with topics and ideas.
 */

import { Database } from "bun:sqlite";

export interface TagSyncResult {
  tagIds: string[];
}

/**
 * Syncs tags for an idea by removing old tags and adding new ones.
 *
 * This function:
 * 1. Gets existing tag links for the idea
 * 2. Creates new tags if they don't exist (case-insensitive)
 * 3. Links all new tags to the idea
 * 4. Removes old tags that aren't in the new tag list
 *
 * @param db - The database instance
 * @param ideaId - The idea ID to sync tags for
 * @param tags - Array of tag names to sync
 * @returns Object containing the synced tag IDs
 */
export function syncIdeaTags(
  db: Database,
  ideaId: string,
  tags: string[] = []
): TagSyncResult {
  const existingTagLinks = db
    .query("SELECT tagId FROM idea_tags WHERE ideaId = ?")
    .all(ideaId) as Array<{ tagId: string }>;
  const existingTagIds = existingTagLinks.map((t) => t.tagId);

  const insertTag = db.query("INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)");
  const getTagId = db.query("SELECT id FROM tags WHERE LOWER(name) = LOWER(?)");
  const linkTag = db.query(
    "INSERT OR IGNORE INTO idea_tags (ideaId, tagId) VALUES (?, ?)"
  );
  const unlinkTag = db.query("DELETE FROM idea_tags WHERE ideaId = ? AND tagId = ?");

  const newTagIds: string[] = [];

  for (const tag of tags) {
    const tagName = tag.trim();
    if (!tagName) continue;

    const existingTag = getTagId.get(tagName) as { id: string } | undefined;

    if (existingTag) {
      newTagIds.push(existingTag.id);
      linkTag.run(ideaId, existingTag.id);
    } else {
      const tagId = crypto.randomUUID();
      insertTag.run(tagId, tagName);
      newTagIds.push(tagId);
      linkTag.run(ideaId, tagId);
    }
  }

  // Remove old tags that aren't in the new list
  for (const oldTagId of existingTagIds) {
    if (!newTagIds.includes(oldTagId)) {
      unlinkTag.run(ideaId, oldTagId);
    }
  }

  return { tagIds: newTagIds };
}

/**
 * Creates tags for a new idea (no removal of old tags).
 *
 * This function:
 * 1. Creates new tags if they don't exist (case-insensitive)
 * 2. Returns the tag IDs for linking
 *
 * @param db - The database instance
 * @param tags - Array of tag names to create
 * @returns Object containing the created tag IDs
 */
export function createIdeaTags(
  db: Database,
  tags: string[] = []
): TagSyncResult {
  const tagIds: string[] = [];

  if (!tags || tags.length === 0) {
    return { tagIds };
  }

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

  return { tagIds };
}

/**
 * Links tags to an idea.
 *
 * @param db - The database instance
 * @param ideaId - The idea ID
 * @param tagIds - Array of tag IDs to link
 */
export function linkIdeaTags(db: Database, ideaId: string, tagIds: string[]): void {
  if (tagIds.length === 0) return;

  const linkTag = db.query(
    "INSERT OR IGNORE INTO idea_tags (ideaId, tagId) VALUES (?, ?)"
  );
  for (const tagId of tagIds) {
    linkTag.run(ideaId, tagId);
  }
}
