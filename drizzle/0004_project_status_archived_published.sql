ALTER TABLE projects ADD COLUMN status TEXT NOT NULL DEFAULT 'in_progress';
--> statement-breakpoint
ALTER TABLE projects ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE projects ADD COLUMN published INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE projects ADD COLUMN updated_at INTEGER;
