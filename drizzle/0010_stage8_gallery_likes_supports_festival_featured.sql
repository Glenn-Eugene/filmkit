ALTER TABLE `projects` ADD COLUMN `tv_likes` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `projects` ADD COLUMN `tv_supports` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `projects` ADD COLUMN `tv_liked` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `projects` ADD COLUMN `tv_supported` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `projects` ADD COLUMN `festival_submitted` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `projects` ADD COLUMN `tv_featured` integer DEFAULT 0 NOT NULL;
