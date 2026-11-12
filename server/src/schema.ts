// Drizzle schema for FilmKit.
//
// A project is one short film: the user's story prompt, a chosen cinematic
// style, and an ordered list of scenes. Each scene carries the storyboard
// text (title, description, visual prompt) and, once generated, the blob key
// of its AI-generated still in ctx.blobs. Sample films are ordinary project
// rows flagged is_sample = 1, seeded once by the seedSamples action.

import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  prompt: text("prompt").notNull(),
  style: text("style").notNull(),
  // Styles library (Stage 7): when set, the project uses this library
  // style — `style` above then holds the style's name for display and the
  // styles row's prompt modifier steers generation. Null = one of the six
  // built-in styles named by `style`.
  styleId: integer("style_id").references(() => styles.id),
  isSample: integer("is_sample").notNull().default(0),
  // Workspace organisation (Stage 2 shell): lifecycle status, archive flag,
  // and whether the finished film is published to the FilmKit TV gallery.
  status: text("status", { enum: ["in_progress", "done"] })
    .notNull()
    .default("in_progress"),
  archived: integer("archived").notNull().default(0),
  published: integer("published").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  // Last content edit (rename, status change, scene/bible edits). Nullable
  // for rows created before the column existed; readers fall back to
  // createdAt in that case.
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
  // The project's script document (Stage 3 Story view): fountain-style
  // screenplay text the user writes, imports, or has written from their
  // idea. Null until a script exists.
  scriptText: text("script_text"),
  // Canvas AI chat approval mode (Stage 4): "ask" = image generations the
  // chat proposes wait for the user's approval; "auto" = they run at once.
  canvasApprovalMode: text("canvas_approval_mode", {
    enum: ["ask", "auto"],
  })
    .notNull()
    .default("ask"),
  // Editor (Stage 5): 1 once the user exports a cut — Watch and FilmKit TV
  // then play the exported timeline instead of the raw scene sequence.
  hasCut: integer("has_cut").notNull().default(0),
  // FilmKit TV (Stage 8): gallery engagement. Likes/supports are in-app
  // counts only — no money moves until accounts/payments at Stage 9.
  // tv_liked / tv_supported are the single built-in viewer's own toggles
  // so a like or support persists and can be withdrawn.
  tvLikes: integer("tv_likes").notNull().default(0),
  tvSupports: integer("tv_supports").notNull().default(0),
  tvLiked: integer("tv_liked").notNull().default(0),
  tvSupported: integer("tv_supported").notNull().default(0),
  festivalSubmitted: integer("festival_submitted").notNull().default(0),
  tvFeatured: integer("tv_featured").notNull().default(0),
  // Stage 9: per-project model selection (catalog ids). Defaults are the
  // built-in image model and the budget video model.
  imageModel: text("image_model").notNull().default("filmkit-standard"),
  videoModel: text("video_model").notNull().default("minimax-h3-fast"),
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
  // Bible tags: the location this scene plays in, plus an optional free-text
  // in-scene state note (e.g. "Mara is wounded; different coat"). Character
  // tags live in sceneCharacters.
  locationId: integer("location_id").references(() => locations.id),
  stateNote: text("state_note"),
  // The exact composed prompt sent to image generation for the latest still,
  // so the user (and the audit) can see the bible descriptors folded in.
  lastPrompt: text("last_prompt"),
  // The script scene heading this storyboard scene was planned from
  // (Stage 3 "Plan my shots"), so the scene can jump back to its place in
  // the script. Null for scenes written from a prompt or added by hand.
  scriptHeading: text("script_heading"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Project bible: developed characters. A character is a full profile (role,
// appearance, wardrobe, personality, backstory) plus an optional generated
// portrait in the project's style. Scenes tag characters so their
// descriptors feed scene generation.
export const characters = sqliteTable("characters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  name: text("name").notNull(),
  role: text("role").notNull(),
  appearance: text("appearance").notNull(),
  wardrobe: text("wardrobe").notNull(),
  personality: text("personality").notNull(),
  backstory: text("backstory").notNull(),
  imageBlobKey: text("image_blob_key"),
  status: text("status", { enum: ["pending", "ready", "failed"] })
    .notNull()
    .default("pending"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Project bible: developed locations. A location is a full profile
// (description, mood, lighting, time of day) plus an optional generated
// establishing view in the project's style.
export const locations = sqliteTable("locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  mood: text("mood").notNull(),
  lighting: text("lighting").notNull(),
  timeOfDay: text("time_of_day").notNull(),
  imageBlobKey: text("image_blob_key"),
  status: text("status", { enum: ["pending", "ready", "failed"] })
    .notNull()
    .default("pending"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Many-to-many: which characters appear in which scene.
export const sceneCharacters = sqliteTable("scene_characters", {
  sceneId: integer("scene_id")
    .notNull()
    .references(() => scenes.id),
  characterId: integer("character_id")
    .notNull()
    .references(() => characters.id),
});

/* --------------------------- Canvas (Stage 4) ---------------------------- */
//
// The canvas is a per-project node board. Sections are collapsible labeled
// groups; nodes are the work units (upload / text note / generate image /
// frame-to-clip); media items are the images and motion clips nodes
// produce (uploads are media items too). Links wire a text note into an
// image node as its prompt source, and a media item into a clip node as
// its start frame. Chat messages carry the project AI chat, including
// structured proposals the user approves before anything is created.

export const canvasSections = sqliteTable("canvas_sections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  collapsed: integer("collapsed").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const canvasNodes = sqliteTable("canvas_nodes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  sectionId: integer("section_id").references(() => canvasSections.id),
  type: text("type", {
    enum: ["upload", "note", "image", "clip"],
  }).notNull(),
  title: text("title").notNull(),
  // Board position (board coordinates, pre-zoom).
  x: real("x").notNull().default(40),
  y: real("y").notNull().default(40),
  // Note nodes: the free text (also the prompt source when wired into an
  // image node). Image nodes: their own prompt text.
  text: text("text").notNull().default(""),
  prompt: text("prompt").notNull().default(""),
  // Image nodes: stills per run, 1–4.
  quantity: integer("quantity").notNull().default(1),
  // Bible tags for image nodes, mirroring scene tags: one location plus
  // characters via nodeCharacters; folded into the generation prompt.
  locationId: integer("location_id").references(() => locations.id),
  lastPrompt: text("last_prompt"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Many-to-many: which bible characters an image node is tagged with.
export const nodeCharacters = sqliteTable("node_characters", {
  nodeId: integer("node_id")
    .notNull()
    .references(() => canvasNodes.id),
  characterId: integer("character_id")
    .notNull()
    .references(() => characters.id),
});

// A media item is one produced or uploaded asset: a generated still
// (image), an uploaded image (upload), or a motion clip (clip — the start
// frame still presented with a cinematic pan/zoom, labeled as such).
// Images live in ctx.blobs; only the blob key is persisted.
export const mediaItems = sqliteTable("media_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  nodeId: integer("node_id").references(() => canvasNodes.id),
  kind: text("kind", { enum: ["image", "upload", "clip"] }).notNull(),
  name: text("name").notNull(),
  imageBlobKey: text("image_blob_key"),
  // The exact composed prompt that produced the item (images), or the
  // animation note (clips). Null for uploads.
  prompt: text("prompt"),
  favorite: integer("favorite").notNull().default(0),
  archived: integer("archived").notNull().default(0),
  // Editor bin: flagged for the Stage 5 video editor's asset list.
  inEditorBin: integer("in_editor_bin").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Wiring between canvas things. kind "prompt_source": fromKind "node"
// (a text note) feeds the target image node. kind "start_frame": fromKind
// "media" (a media item) is the target clip node's start frame.
export const canvasLinks = sqliteTable("canvas_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  fromKind: text("from_kind", { enum: ["node", "media"] }).notNull(),
  fromId: integer("from_id").notNull(),
  toNodeId: integer("to_node_id")
    .notNull()
    .references(() => canvasNodes.id),
  kind: text("kind", { enum: ["prompt_source", "start_frame"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/* --------------------------- Editor (Stage 5) ---------------------------- */
//
// The editor is a per-project edit decision list. Timeline clips are the
// main video track: an ordered sequence of sources (a storyboard scene's
// still, or a canvas media item — a generated/uploaded still or a motion
// clip), each with its own duration, look preset (effect), and the
// transition that plays INTO it. Timeline texts are the text track: title
// cards, lower thirds, and generated captions, each timed in seconds from
// the start of the cut; captions also link to the clip they were generated
// from so removing that clip takes its captions with it. Timeline audio
// rows are user-uploaded soundtrack files (bytes in ctx.blobs) placed on a
// simple audio track with a start offset and a volume. Exporting a cut
// flips projects.has_cut; Watch then plays this list.

export const timelineClips = sqliteTable("timeline_clips", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  sourceKind: text("source_kind", { enum: ["scene", "media"] }).notNull(),
  sourceId: integer("source_id").notNull(),
  position: integer("position").notNull(),
  // Seconds the clip stays on screen in the cut.
  duration: real("duration").notNull().default(5),
  // Look preset applied at playback (CSS filter/overlay in the player).
  effect: text("effect", {
    enum: [
      "none",
      "warm",
      "cold",
      "noir",
      "grain",
      "vhs",
      "bloom",
      "vignette",
      "posterize",
    ],
  })
    .notNull()
    .default("none"),
  // How playback moves INTO this clip from the previous one.
  transition: text("transition", {
    enum: ["cut", "dissolve", "fade_black", "wipe"],
  })
    .notNull()
    .default("cut"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const timelineTexts = sqliteTable("timeline_texts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  // Captions link to the timeline clip they were generated from; title
  // cards and lower thirds are unlinked (null).
  clipId: integer("clip_id").references(() => timelineClips.id),
  text: text("text").notNull(),
  kind: text("kind", { enum: ["title", "lower_third", "caption"] })
    .notNull()
    .default("title"),
  motion: text("motion", {
    enum: ["none", "fade_rise", "typewriter", "slam", "credit_roll"],
  })
    .notNull()
    .default("fade_rise"),
  // Seconds from the start of the cut, and how long the text stays up.
  start: real("start").notNull().default(0),
  duration: real("duration").notNull().default(4),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const timelineAudio = sqliteTable("timeline_audio", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  name: text("name").notNull(),
  blobKey: text("blob_key").notNull(),
  mimeType: text("mime_type").notNull(),
  // 0–1 playback volume in the cut.
  volume: real("volume").notNull().default(0.8),
  // Seconds from the start of the cut where the audio begins.
  start: real("start").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/* --------------------------- 3D Stage (Stage 6) --------------------------- */
//
// The stage is a per-project blocking board. A project has multiple stage
// setups; each setup holds placed items on a ground plane (positions are
// board percentages 0–100, rotation is facing in degrees, 0 = up/north,
// clockwise). Items are figures (optionally linked to a Bible character —
// the link is nullable and the figure keeps its own label snapshot, so
// deleting the character leaves a generic labeled figure, never a broken
// row), cameras (shot size, height, movement note, and an optional
// user-edited shot description override), and props (labeled blocks).

export const stageSetups = sqliteTable("stage_setups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const stageItems = sqliteTable("stage_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  setupId: integer("setup_id")
    .notNull()
    .references(() => stageSetups.id),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  kind: text("kind", { enum: ["figure", "camera", "prop"] }).notNull(),
  // Figures linked to a Bible character carry its id; the label below is a
  // snapshot taken at placement so the figure survives character deletion.
  characterId: integer("character_id").references(() => characters.id),
  label: text("label").notNull(),
  color: text("color").notNull().default("#8a6d3b"),
  // Board position in percent of the ground plane (0–100 on both axes)
  // and facing direction in degrees (0 = up, clockwise).
  x: real("x").notNull().default(50),
  y: real("y").notNull().default(50),
  rotation: real("rotation").notNull().default(0),
  // Cameras only: shot size, camera height, free-text movement note
  // ("slow push-in"), and the user's edited shot description (null = the
  // auto-composed description is used).
  shotSize: text("shot_size", { enum: ["wide", "medium", "close"] }),
  camHeight: text("cam_height", {
    enum: ["low", "eye", "high", "overhead"],
  }),
  movementNote: text("movement_note"),
  descriptionOverride: text("description_override"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Project AI chat (Stage 4). Assistant messages may carry a structured
// proposal (JSON: shotlist / bible / images) with a status the user drives:
// pending → applied / in_review (bible drafts handed to the Bible review
// panel) / dismissed. Nothing a proposal names is created until applied.
export const chatMessages = sqliteTable("chat_messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  text: text("text").notNull(),
  proposalJson: text("proposal_json"),
  proposalStatus: text("proposal_status", {
    enum: ["pending", "applied", "in_review", "dismissed"],
  }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/* ------------------------- Styles library (Stage 7) ----------------------- */
//
// The Library's visual styles catalog. A style is a name, a Flickpedia-
// style category, a short description, and a PROMPT MODIFIER — the text
// that actually steers image generation — plus a generated thumbnail in
// that style. Built-in rows are seeded once by the seedStyles action
// (slug-keyed, idempotent) and cannot be deleted or edited; user styles
// ("Yours") are created in the app and fully editable. A project picks a
// library style via projects.style_id; favorite is a plain flag the
// Library's Favorites filter reads.

/* ------------------- Stage 9: Account, credits, plans ------------------- */
// Single workspace account (id=1). The aggregator key is stored here and
// NEVER returned to the client — reads expose only hasKey.
export const workspaceAccount = sqliteTable("workspace_account", {
  id: integer("id").primaryKey(),
  plan: text("plan", { enum: ["free", "casual", "standard", "pro", "studio", "enterprise"] }).notNull().default("free"),
  billingPeriod: text("billing_period", { enum: ["annual", "monthly"] }).notNull().default("annual"),
  displayName: text("display_name").notNull().default("You"),
  bio: text("bio").notNull().default(""),
  balance: integer("balance").notNull().default(0),
  cycleStart: integer("cycle_start", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  cycleEnd: integer("cycle_end", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
  lastMondayGrant: integer("last_monday_grant", { mode: "timestamp_ms" }),
  chatDefault: text("chat_default", { enum: ["ask", "auto"] }).notNull().default("ask"),
  watermarkPos: text("watermark_pos", { enum: ["top-left", "top-right"] }).notNull().default("top-right"),
  theme: text("theme", { enum: ["system", "light", "dark"] }).notNull().default("system"),
  workflowRules: text("workflow_rules").notNull().default(""),
  notifJson: text("notif_json").notNull().default("{}"),
  aggProvider: text("agg_provider", { enum: ["fal", "replicate"] }).notNull().default("fal"),
  aggKey: text("agg_key"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const creditLedger = sqliteTable("credit_ledger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  kind: text("kind", { enum: ["grant", "spend", "refund", "expiry", "topup"] }).notNull(),
  reason: text("reason").notNull(),
  modelName: text("model_name"),
  projectId: integer("project_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().$defaultFn(() => new Date()),
});

export const styles = sqliteTable("styles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Stable key for seeded built-ins (idempotent seeding); null for user
  // styles.
  slug: text("slug").unique(),
  name: text("name").notNull(),
  category: text("category", {
    enum: [
      "Cinematic",
      "Cartoon",
      "Anime",
      "Drawing",
      "Illustration",
      "Painting",
      "3D",
    ],
  }).notNull(),
  description: text("description").notNull(),
  modifier: text("modifier").notNull(),
  imageBlobKey: text("image_blob_key"),
  isBuiltin: integer("is_builtin").notNull().default(0),
  favorite: integer("favorite").notNull().default(0),
  // Browse order within the catalog (seed order for built-ins).
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});
