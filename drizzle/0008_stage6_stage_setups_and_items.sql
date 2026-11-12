CREATE TABLE `stage_setups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL REFERENCES `projects`(`id`),
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stage_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`setup_id` integer NOT NULL REFERENCES `stage_setups`(`id`),
	`project_id` integer NOT NULL REFERENCES `projects`(`id`),
	`kind` text NOT NULL,
	`character_id` integer REFERENCES `characters`(`id`),
	`label` text NOT NULL,
	`color` text DEFAULT '#8a6d3b' NOT NULL,
	`x` real DEFAULT 50 NOT NULL,
	`y` real DEFAULT 50 NOT NULL,
	`rotation` real DEFAULT 0 NOT NULL,
	`shot_size` text,
	`cam_height` text,
	`movement_note` text,
	`description_override` text,
	`created_at` integer NOT NULL
);
