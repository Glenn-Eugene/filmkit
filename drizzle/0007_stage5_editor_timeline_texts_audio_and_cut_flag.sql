ALTER TABLE `projects` ADD COLUMN `has_cut` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `timeline_clips` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL REFERENCES `projects`(`id`),
	`source_kind` text NOT NULL,
	`source_id` integer NOT NULL,
	`position` integer NOT NULL,
	`duration` real DEFAULT 5 NOT NULL,
	`effect` text DEFAULT 'none' NOT NULL,
	`transition` text DEFAULT 'cut' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `timeline_texts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL REFERENCES `projects`(`id`),
	`clip_id` integer REFERENCES `timeline_clips`(`id`),
	`text` text NOT NULL,
	`kind` text DEFAULT 'title' NOT NULL,
	`motion` text DEFAULT 'fade_rise' NOT NULL,
	`start` real DEFAULT 0 NOT NULL,
	`duration` real DEFAULT 4 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `timeline_audio` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL REFERENCES `projects`(`id`),
	`name` text NOT NULL,
	`blob_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`volume` real DEFAULT 0.8 NOT NULL,
	`start` real DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
