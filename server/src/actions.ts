// FilmKit actions: the full mini-Flick loop.
//
//   createProject  — story prompt + style -> AI storyboard (ctx.inference)
//   generateScene  — one scene -> AI cinematic still (ctx.tool.generate_media)
//   scene editing  — update / add / delete / reorder scenes
//   listProjects / getProject — library + gallery reads
//   seedSamples    — one-time seed of clearly-labeled sample films
//
// Projects and scenes live in ctx.db; generated stills live in ctx.blobs
// and only their blob keys are persisted on the scene row.

import {
defineAction,
z,
type ActionsModule,
type Ctx,
} from "@hatch/space-sdk";
import { and, asc, desc, eq } from "drizzle-orm";
import * as schema from "./schema";

export const STYLES = [
  "Noir",
  "Sci-Fi",
  "Western",
  "Anime",
  "Documentary",
  "Horror",
] as const;

const STYLE_LOOK: Record<string, string> = {
  Noir: "black-and-white film noir, extreme high-contrast chiaroscuro lighting, deep shadows, wet streets and cigarette smoke, grainy 1940s cinematography",
  "Sci-Fi":
    "cinematic science fiction, sleek production design, volumetric light, teal and amber palette, anamorphic lens flares, photorealistic film still",
  Western:
    "classic western cinematography, golden desert light, dust in the air, weathered wood and leather, wide epic composition, warm faded film stock",
  Anime:
    "hand-drawn anime film still, lush painted backgrounds, expressive characters, soft cel shading, warm nostalgic light, detailed 2D animation frame",
  Documentary:
    "naturalistic documentary still, available light, unposed real people and places, muted true-to-life color, observational composition, subtle film grain",
  Horror:
    "atmospheric horror film still, cold desaturated palette, thick fog, a single harsh practical light source, deep shadow, dread and stillness, grainy film stock",
};

const styleSchema = z.enum(STYLES);

const sceneOut = z.object({
  id: z.number(),
  position: z.number(),
  title: z.string(),
  description: z.string(),
  visualPrompt: z.string(),
  imageUrl: z.string().nullable(),
  status: z.enum(["pending", "ready", "failed"]),
});

const projectSummary = z.object({
  id: z.number(),
  title: z.string(),
  prompt: z.string(),
  style: z.string(),
  isSample: z.boolean(),
  sceneCount: z.number(),
  readyCount: z.number(),
  posterUrl: z.string().nullable(),
  createdAt: z.string(),
});

type SceneRow = typeof schema.scenes.$inferSelect;
type ProjectRow = typeof schema.projects.$inferSelect;

async function sceneToOut(
  ctx: Ctx,
  row: SceneRow,
): Promise<z.infer<typeof sceneOut>> {
  return {
    id: row.id,
    position: row.position,
    title: row.title,
    description: row.description,
    visualPrompt: row.visualPrompt,
    imageUrl: row.imageBlobKey ? await ctx.blobs.getUrl(row.imageBlobKey) : null,
    status: row.status,
  };
}

async function projectToSummary(
  ctx: Ctx,
  project: ProjectRow,
): Promise<z.infer<typeof projectSummary>> {
  const db = ctx.db<typeof schema>();
  const rows = await db
    .select()
    .from(schema.scenes)
    .where(eq(schema.scenes.projectId, project.id))
    .orderBy(asc(schema.scenes.position));
  const poster = rows.find((r) => r.imageBlobKey);
  return {
    id: project.id,
    title: project.title,
    prompt: project.prompt,
    style: project.style,
    isSample: project.isSample === 1,
    sceneCount: rows.length,
    readyCount: rows.filter((r) => r.status === "ready").length,
    posterUrl: poster?.imageBlobKey
      ? await ctx.blobs.getUrl(poster.imageBlobKey)
      : null,
    createdAt: project.createdAt.toISOString(),
  };
}

const storyboardSchema = z.object({
  title: z.string(),
  scenes: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        visualPrompt: z.string(),
      }),
    )
    .min(4)
    .max(6),
});

async function writeStoryboard(
  ctx: Ctx,
  prompt: string,
  style: string,
  sceneCount?: number,
): Promise<z.infer<typeof storyboardSchema>> {
  const countLine = sceneCount
    ? `exactly ${sceneCount} scenes`
    : "between 4 and 6 scenes";
  return ctx.inference.complete(
    [
      `You are a film director's storyboard artist. Turn this story idea into a short silent film storyboard in the ${style} style.`,
      `Story idea: "${prompt}"`,
      `Give the film a title and ${countLine}. Each scene needs: a short evocative title, a one-line description of what happens, and a detailed visual prompt describing one cinematic film still for that scene (composition, subject, lighting, mood — the visual prompt must not ask for any text, words, or letters in the image).`,
      `Keep one consistent protagonist and visual world across all scenes so the stills feel like one film. Build a clear arc: opening, development, climax, resolution.`,
    ].join("\n"),
    { schema: storyboardSchema, timeout_secs: 120 },
  );
}

async function insertStoryboard(
  ctx: Ctx,
  input: { prompt: string; style: string; isSample: boolean },
  board: z.infer<typeof storyboardSchema>,
): Promise<number> {
  const db = ctx.db<typeof schema>();
  const inserted = await db
    .insert(schema.projects)
    .values({
      title: board.title,
      prompt: input.prompt,
      style: input.style,
      isSample: input.isSample ? 1 : 0,
    })
    .returning({ id: schema.projects.id });
  const project = inserted[0];
  if (!project) throw new Error("createProject: insert returned no rows");
  for (const [i, s] of board.scenes.entries()) {
    await db.insert(schema.scenes).values({
      projectId: project.id,
      position: i,
      title: s.title,
      description: s.description,
      visualPrompt: s.visualPrompt,
    });
  }
  return project.id;
}

async function generateStillForScene(
  ctx: Ctx,
  sceneId: number,
): Promise<z.infer<typeof sceneOut>> {
  const db = ctx.db<typeof schema>();
  const sceneRows = await db
    .select()
    .from(schema.scenes)
    .where(eq(schema.scenes.id, sceneId))
    .limit(1);
  const scene = sceneRows[0];
  if (!scene) throw new Error("generateScene: scene not found");
  const projectRows = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, scene.projectId))
    .limit(1);
  const project = projectRows[0];
  if (!project) throw new Error("generateScene: project not found");

  const look = STYLE_LOOK[project.style] ?? STYLE_LOOK["Sci-Fi"];
  const prompt = `Cinematic film still, 16:9 composition. ${scene.visualPrompt} Style: ${look}. No text, no words, no letters, no watermark.`;
  try {
    const media = await ctx.tool.generate_media(prompt, {
      orientation: "landscape",
    });
    await db
      .update(schema.scenes)
      .set({ imageBlobKey: media.blobKey, status: "ready" })
      .where(eq(schema.scenes.id, sceneId));
  } catch {
    await db
      .update(schema.scenes)
      .set({ status: "failed" })
      .where(eq(schema.scenes.id, sceneId));
  }
  const updated = await db
    .select()
    .from(schema.scenes)
    .where(eq(schema.scenes.id, sceneId))
    .limit(1);
  const row = updated[0];
  if (!row) throw new Error("generateScene: scene vanished");
  return sceneToOut(ctx, row);
}

export const Actions = {
  listProjects: defineAction({
    description:
      "Lists all FilmKit projects (the user's films and the labeled sample films), newest first, with poster images and scene counts.",
    request: z.object({}),
    response: z.object({ projects: z.array(projectSummary) }),
    async handler(ctx) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.projects)
        .orderBy(desc(schema.projects.id));
      const projects: z.infer<typeof projectSummary>[] = [];
      for (const row of rows) projects.push(await projectToSummary(ctx, row));
      return { projects };
    },
  }),

  getProject: defineAction({
    description:
      "Returns one project with its full storyboard: scenes in order, each with text and its generated still URL when ready.",
    request: z.object({ projectId: z.number().int().positive() }),
    response: z.object({
      project: projectSummary,
      scenes: z.array(sceneOut),
    }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, args.projectId))
        .limit(1);
      const project = rows[0];
      if (!project) throw new Error("getProject: project not found");
      const sceneRows = await db
        .select()
        .from(schema.scenes)
        .where(eq(schema.scenes.projectId, project.id))
        .orderBy(asc(schema.scenes.position));
      const scenes: z.infer<typeof sceneOut>[] = [];
      for (const row of sceneRows) scenes.push(await sceneToOut(ctx, row));
      return { project: await projectToSummary(ctx, project), scenes };
    },
  }),

  createProject: defineAction({
    description:
      "Creates a film from a story prompt and cinematic style: an AI storyboard of 4–6 scenes is written and saved as a new project.",
    request: z.object({
      prompt: z.string().min(3).max(600),
      style: styleSchema,
    }),
    response: z.object({ projectId: z.number() }),
    async handler(ctx, args) {
      const board = await writeStoryboard(ctx, args.prompt, args.style);
      const projectId = await insertStoryboard(
        ctx,
        { prompt: args.prompt, style: args.style, isSample: false },
        board,
      );
      ctx.invalidateQueries();
      return { projectId };
    },
  }),

  generateScene: defineAction({
    description:
      "Generates the cinematic AI still for one scene in the project's chosen style and marks the scene ready (or failed).",
    request: z.object({ sceneId: z.number().int().positive() }),
    response: z.object({ scene: sceneOut }),
    async handler(ctx, args) {
      const scene = await generateStillForScene(ctx, args.sceneId);
      ctx.invalidateQueries();
      return { scene };
    },
  }),

  updateScene: defineAction({
    description:
      "Edits a scene's title, description, or visual generation prompt.",
    request: z.object({
      sceneId: z.number().int().positive(),
      title: z.string().min(1).max(120),
      description: z.string().min(1).max(400),
      visualPrompt: z.string().min(1).max(1200),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.scenes)
        .set({
          title: args.title,
          description: args.description,
          visualPrompt: args.visualPrompt,
        })
        .where(eq(schema.scenes.id, args.sceneId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  addScene: defineAction({
    description:
      "Adds a new blank scene to the end of a project's storyboard for the user to write and generate.",
    request: z.object({
      projectId: z.number().int().positive(),
      title: z.string().min(1).max(120),
      description: z.string().min(1).max(400),
      visualPrompt: z.string().min(1).max(1200),
    }),
    response: z.object({ scene: sceneOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const existing = await db
        .select()
        .from(schema.scenes)
        .where(eq(schema.scenes.projectId, args.projectId))
        .orderBy(desc(schema.scenes.position))
        .limit(1);
      const nextPosition = (existing[0]?.position ?? -1) + 1;
      const inserted = await db
        .insert(schema.scenes)
        .values({
          projectId: args.projectId,
          position: nextPosition,
          title: args.title,
          description: args.description,
          visualPrompt: args.visualPrompt,
        })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("addScene: insert returned no rows");
      ctx.invalidateQueries();
      return { scene: await sceneToOut(ctx, row) };
    },
  }),

  deleteScene: defineAction({
    description: "Deletes one scene from a project's storyboard.",
    request: z.object({ sceneId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .delete(schema.scenes)
        .where(eq(schema.scenes.id, args.sceneId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  moveScene: defineAction({
    description:
      "Moves a scene one step earlier or later in its project's storyboard order.",
    request: z.object({
      sceneId: z.number().int().positive(),
      direction: z.enum(["up", "down"]),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.scenes)
        .where(eq(schema.scenes.id, args.sceneId))
        .limit(1);
      const scene = rows[0];
      if (!scene) return { ok: true };
      const siblings = await db
        .select()
        .from(schema.scenes)
        .where(eq(schema.scenes.projectId, scene.projectId))
        .orderBy(asc(schema.scenes.position));
      const idx = siblings.findIndex((s) => s.id === scene.id);
      const swapIdx = args.direction === "up" ? idx - 1 : idx + 1;
      const other = siblings[swapIdx];
      if (idx < 0 || !other) return { ok: true };
      await db
        .update(schema.scenes)
        .set({ position: other.position })
        .where(eq(schema.scenes.id, scene.id));
      await db
        .update(schema.scenes)
        .set({ position: scene.position })
        .where(eq(schema.scenes.id, other.id));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  renameProject: defineAction({
    description: "Renames a film project.",
    request: z.object({
      projectId: z.number().int().positive(),
      title: z.string().min(1).max(120),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.projects)
        .set({ title: args.title })
        .where(eq(schema.projects.id, args.projectId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  deleteProject: defineAction({
    description: "Deletes a film project and all of its scenes.",
    request: z.object({ projectId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .delete(schema.scenes)
        .where(eq(schema.scenes.projectId, args.projectId));
      await db
        .delete(schema.projects)
        .where(
          and(
            eq(schema.projects.id, args.projectId),
            eq(schema.projects.isSample, 0),
          ),
        );
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  seedSamples: defineAction({
    description:
      "Seeds the three labeled sample films for the FilmKit TV gallery (storyboards and generated stills). Resumable: creates any missing sample storyboards, then generates any missing stills in parallel; safe to call repeatedly until it reports zero pending.",
    request: z.object({}),
    response: z.object({
      filmsCreated: z.number(),
      stillsReady: z.number(),
      stillsPending: z.number(),
    }),
    async handler(ctx) {
      const db = ctx.db<typeof schema>();

      const samples: { prompt: string; style: string }[] = [
        {
          prompt:
            "The last lighthouse keeper on a storm-battered coast realizes the beam has been guiding something ancient toward the shore.",
          style: "Noir",
        },
        {
          prompt:
            "A retired starship cartographer takes one final voyage to map a nebula that rearranges itself every time she looks away.",
          style: "Sci-Fi",
        },
        {
          prompt:
            "Two rival tea houses in a mountain village compete to serve a mysterious traveler who only arrives when it rains.",
          style: "Anime",
        },
      ];

      // Phase 1: every sample storyboard exists.
      let filmsCreated = 0;
      const existing = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.isSample, 1));
      for (const sample of samples) {
        if (existing.some((p) => p.prompt === sample.prompt)) continue;
        const board = await writeStoryboard(ctx, sample.prompt, sample.style, 4);
        await insertStoryboard(
          ctx,
          { prompt: sample.prompt, style: sample.style, isSample: true },
          board,
        );
        filmsCreated += 1;
      }

      // Phase 2: generate every missing sample still, in parallel.
      const sampleProjects = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.isSample, 1));
      const pending: number[] = [];
      let stillsReady = 0;
      for (const project of sampleProjects) {
        const sceneRows = await db
          .select()
          .from(schema.scenes)
          .where(eq(schema.scenes.projectId, project.id));
        for (const scene of sceneRows) {
          if (scene.status === "ready" && scene.imageBlobKey) {
            stillsReady += 1;
          } else {
            pending.push(scene.id);
          }
        }
      }
      const results = await Promise.all(
        pending.map((id) => generateStillForScene(ctx, id)),
      );
      stillsReady += results.filter((r) => r.status === "ready").length;
      const stillsPending = results.filter(
        (r) => r.status !== "ready",
      ).length;
      ctx.invalidateQueries();
      return { filmsCreated, stillsReady, stillsPending };
    },
  }),
} satisfies ActionsModule;
