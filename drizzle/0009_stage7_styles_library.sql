CREATE TABLE `styles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`modifier` text NOT NULL,
	`image_blob_key` text,
	`is_builtin` integer DEFAULT 0 NOT NULL,
	`favorite` integer DEFAULT 0 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `styles_slug_unique` ON `styles` (`slug`);
--> statement-breakpoint
ALTER TABLE `projects` ADD COLUMN `style_id` integer REFERENCES `styles`(`id`);
