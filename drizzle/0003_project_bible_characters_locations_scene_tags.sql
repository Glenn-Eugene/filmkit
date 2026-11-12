CREATE TABLE characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  appearance TEXT NOT NULL,
  wardrobe TEXT NOT NULL,
  personality TEXT NOT NULL,
  backstory TEXT NOT NULL,
  image_blob_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  mood TEXT NOT NULL,
  lighting TEXT NOT NULL,
  time_of_day TEXT NOT NULL,
  image_blob_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE scene_characters (
  scene_id INTEGER NOT NULL REFERENCES scenes(id),
  character_id INTEGER NOT NULL REFERENCES characters(id),
  PRIMARY KEY (scene_id, character_id)
);
--> statement-breakpoint
ALTER TABLE scenes ADD COLUMN location_id INTEGER REFERENCES locations(id);
--> statement-breakpoint
ALTER TABLE scenes ADD COLUMN state_note TEXT;
--> statement-breakpoint
ALTER TABLE scenes ADD COLUMN last_prompt TEXT;
--> statement-breakpoint
CREATE INDEX characters_project_idx ON characters (project_id);
--> statement-breakpoint
CREATE INDEX locations_project_idx ON locations (project_id);
--> statement-breakpoint
CREATE INDEX scene_characters_scene_idx ON scene_characters (scene_id);
