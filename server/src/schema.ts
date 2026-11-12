// Drizzle schema for FilmKit.
//
// A project is one short film: the user's story prompt, a chosen cinematic
// style, and an ordered list of scenes. Each scene carries the storyboard
// text (title, description, visual prompt) and, once generated, the blob key
// of its AI-generated still in ctx.blobs. Sample films are ordinary project
// rows flagged is_sample = 1, seeded once by the seedSamples action.

import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  style: text("style").notNull(),
  isSample: integer("is_sample").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const scenes = sqliteTable("scenes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  visualPrompt: text("visual_prompt").notNull(),
  imageBlobKey: text("image_blob_key"),
  status: text("status", { enum: ["pending", "ready", "failed"] })
    .notNull()
    .default("pending"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});
