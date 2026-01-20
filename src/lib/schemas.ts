/**
 * Zod validation schemas for API requests
 *
 * Provides runtime type-safe validation for all API endpoints.
 */

import { z } from "zod";

/**
 * Tag name validation: max 50 characters
 */
export const tagSchema = z.string().max(50, "Tag name must be at most 50 characters");

/**
 * Idea update request schema
 */
export const updateIdeaSchema = z.object({
  topicId: z.string().min(1, "Topic ID is required"),
  name: z.string().min(1, "Name is required").max(200, "Name must be at most 200 characters").transform((val) => val.trim()),
  description: z.string().max(5000, "Description must be at most 5000 characters").optional().transform((val) => val?.trim() || undefined),
  tags: z.array(tagSchema).optional().default([]),
});

export type UpdateIdeaInput = z.infer<typeof updateIdeaSchema>;

/**
 * Helper function to format Zod validation errors
 */
export function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join(", ");
}

/**
 * Idea create request schema
 */
export const createIdeaSchema = z.object({
  topicId: z.string().min(1, "Topic ID is required"),
  name: z.string().min(1, "Name is required").max(200, "Name must be at most 200 characters").transform((val) => val.trim()),
  description: z.string().max(5000, "Description must be at most 5000 characters").optional().transform((val) => val?.trim() || undefined),
  tags: z.array(tagSchema).optional().default([]),
});

export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;

/**
 * Topic create/update request schema
 */
export const topicSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be at most 200 characters").transform((val) => val.trim()),
  description: z.string().max(5000, "Description must be at most 5000 characters").optional().transform((val) => val?.trim() || undefined),
  tags: z.array(tagSchema).optional().default([]),
});

export type TopicInput = z.infer<typeof topicSchema>;

/**
 * Feedback create/update request schema
 */
export const feedbackSchema = z.object({
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  notes: z.string().max(500, "Notes must be at most 500 characters").optional().transform((val) => val?.trim() || undefined),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
