ALTER TABLE `projects` ADD COLUMN `image_model` text DEFAULT 'filmkit-standard' NOT NULL;
--> statement-breakpoint
ALTER TABLE `projects` ADD COLUMN `video_model` text DEFAULT 'minimax-h3-fast' NOT NULL;
--> statement-breakpoint
CREATE TABLE `workspace_account` (
  `id` integer PRIMARY KEY NOT NULL,
  `plan` text DEFAULT 'free' NOT NULL,
  `billing_period` text DEFAULT 'annual' NOT NULL,
  `display_name` text DEFAULT 'You' NOT NULL,
  `bio` text DEFAULT '' NOT NULL,
  `balance` integer DEFAULT 0 NOT NULL,
  `cycle_start` integer NOT NULL,
  `cycle_end` integer NOT NULL,
  `last_monday_grant` integer,
  `chat_default` text DEFAULT 'ask' NOT NULL,
  `watermark_pos` text DEFAULT 'top-right' NOT NULL,
  `theme` text DEFAULT 'system' NOT NULL,
  `workflow_rules` text DEFAULT '' NOT NULL,
  `notif_json` text DEFAULT '{}' NOT NULL,
  `agg_provider` text DEFAULT 'fal' NOT NULL,
  `agg_key` text,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `credit_ledger` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `amount` integer NOT NULL,
  `balance_after` integer NOT NULL,
  `kind` text NOT NULL,
  `reason` text NOT NULL,
  `model_name` text,
  `project_id` integer,
  `created_at` integer NOT NULL
);
