ALTER TABLE `projects` ADD COLUMN `canvas_approval_mode` text DEFAULT 'ask' NOT NULL;
--> statement-breakpoint
CREATE TABLE `canvas_sections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL REFERENCES `projects`(`id`),
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`collapsed` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `canvas_nodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL REFERENCES `projects`(`id`),
	`section_id` integer REFERENCES `canvas_sections`(`id`),
	`type` text NOT NULL,
	`title` text NOT NULL,
	`x` real DEFAULT 40 NOT NULL,
	`y` real DEFAULT 40 NOT NULL,
	`text` text DEFAULT '' NOT NULL,
	`prompt` text DEFAULT '' NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`location_id` integer REFERENCES `locations`(`id`),
	`last_prompt` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `node_characters` (
	`node_id` integer NOT NULL REFERENCES `canvas_nodes`(`id`),
	`character_id` integer NOT NULL REFERENCES `characters`(`id`)
);
--> statement-breakpoint
CREATE TABLE `media_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL REFERENCES `projects`(`id`),
	`node_id` integer REFERENCES `canvas_nodes`(`id`),
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`image_blob_key` text,
	`prompt` text,
	`favorite` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`in_editor_bin` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `canvas_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL REFERENCES `projects`(`id`),
	`from_kind` text NOT NULL,
	`from_id` integer NOT NULL,
	`to_node_id` integer NOT NULL REFERENCES `canvas_nodes`(`id`),
	`kind` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL REFERENCES `projects`(`id`),
	`role` text NOT NULL,
	`text` text NOT NULL,
	`proposal_json` text,
	`proposal_status` text,
	`created_at` integer NOT NULL
);
