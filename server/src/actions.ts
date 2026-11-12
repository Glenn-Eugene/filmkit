// FilmKit actions: the full mini-Flick loop.
//
//   createProject  — story prompt + style -> AI storyboard (ctx.inference)
//   generateScene  — one scene -> AI cinematic still (ctx.tool.generate_media)
//   scene editing  — update / add / delete / reorder scenes
//   story (Stage 3) — per-project script document: saveScript autosave,
//                     writeScriptFromIdea, editScriptWithAi (draft-only),
//                     planShotsFromScript (heading parse + bible auto-tag)
//   listProjects / getProject — library + gallery reads
//   styles (Stage 7) — the Library catalog: seedStyles (idempotent
//                     built-ins + thumbnails), user styles CRUD, and
//                     setProjectStyle wiring a library style's prompt
//                     modifier into every generation prompt
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

/* ------------------------- Styles library (Stage 7) ----------------------- */
//
// The Library's visual styles catalog (FEATURES.md §13). A style's
// MODIFIER is the text that actually steers generation: when a project
// uses a library style (projects.style_id), the modifier takes the place
// of the built-in STYLE_LOOK text everywhere a prompt is composed, and
// the style's name takes the place of the built-in name in AI-writing
// prompts. Built-in rows are seeded by seedStyles (slug-keyed, so the
// seed is idempotent); user styles have a null slug.

export const STYLE_CATEGORIES = [
  "Cinematic",
  "Cartoon",
  "Anime",
  "Drawing",
  "Illustration",
  "Painting",
  "3D",
] as const;

const styleCategorySchema = z.enum(STYLE_CATEGORIES);

type BuiltinStyleDef = {
  slug: string;
  name: string;
  category: (typeof STYLE_CATEGORIES)[number];
  description: string;
  modifier: string;
  // The thumbnail's subject, rendered in the style itself.
  subject: string;
};

const BUILTIN_STYLES: BuiltinStyleDef[] = [
  // Cinematic
  {
    slug: "golden-age-hollywood",
    name: "Golden Age Hollywood",
    category: "Cinematic",
    description:
      "Glamorous studio-era sheen: soft glow, elegant sets, stars lit like icons.",
    modifier:
      "golden age Hollywood studio cinematography, glamorous soft-glow lighting, elegant art-deco sets, rich silky highlights, classic 1930s glamour, photographic film still",
    subject:
      "an elegant 1930s film star in an evening gown descending an art-deco staircase",
  },
  {
    slug: "neo-noir-neon",
    name: "Neo-Noir Neon",
    category: "Cinematic",
    description:
      "Rain-slick streets lit by neon signs — moral shadows in electric color.",
    modifier:
      "neo-noir cinematography, rain-slick city streets at night, saturated neon signage in magenta and cyan, wet reflections, moody haze, anamorphic film still",
    subject:
      "a lone figure with an umbrella on a rain-slick neon-lit street at night",
  },
  {
    slug: "desert-epic",
    name: "Desert Epic",
    category: "Cinematic",
    description:
      "Vast horizons and tiny figures — the scale of the classic desert epic.",
    modifier:
      "sweeping desert epic cinematography, vast dunes and endless sky, heat shimmer, tiny silhouetted travelers, warm sand and pale blue palette, grand 70mm film still",
    subject:
      "a tiny caravan crossing vast golden dunes under an enormous sky",
  },
  {
    slug: "nordic-minimal",
    name: "Nordic Minimal",
    category: "Cinematic",
    description: "Cold light, empty space, silence you can see.",
    modifier:
      "Nordic minimalist cinematography, cold pale daylight, sparse composition with generous negative space, muted blue-grey palette, still and quiet mood, natural-light film still",
    subject: "a single figure standing in a vast pale snowy landscape",
  },
  {
    slug: "giallo",
    name: "Giallo",
    category: "Cinematic",
    description:
      "Italian thriller color: lurid reds, ornate rooms, baroque dread.",
    modifier:
      "1970s Italian giallo thriller still, lurid saturated reds and greens, dramatic colored gel lighting, ornate interiors, deep shadows, grainy film stock",
    subject:
      "an ornate room lit in deep red, a gloved hand resting on a carved door",
  },
  {
    slug: "symmetrical-storybook",
    name: "Symmetrical Storybook",
    category: "Cinematic",
    description:
      "Perfectly centered frames, pastel worlds, dollhouse precision.",
    modifier:
      "whimsical symmetrical cinematography, perfectly centered compositions, pastel color palette, dollhouse-like miniature sets, flat frontal staging, storybook film still",
    subject:
      "a perfectly symmetrical pastel hotel lobby with a tiny bellhop standing at center",
  },
  {
    slug: "found-footage",
    name: "Found Footage",
    category: "Cinematic",
    description: "Shaky camcorder reality: harsh light, raw and unpolished.",
    modifier:
      "found footage camcorder aesthetic, handheld shake, harsh on-camera light, night-vision green in darkness, raw unpolished realism, low-fi video still",
    subject: "a dark corridor lit only by a camcorder's harsh light",
  },
  // Cartoon
  {
    slug: "golden-age-cartoon",
    name: "Golden Age Cartoon",
    category: "Cartoon",
    description:
      "Rubber-hose limbs and pie-cut eyes, straight off a 1930s reel.",
    modifier:
      "1930s rubber-hose cartoon style, pie-cut eyes, bouncy exaggerated motion, monochrome with a sepia tint, vintage animation cel look",
    subject: "a cheerful rubber-hose cartoon cat tipping its hat",
  },
  {
    slug: "saturday-morning",
    name: "Saturday Morning",
    category: "Cartoon",
    description: "Bold outlines and flat colors — cereal-commercial energy.",
    modifier:
      "classic Saturday-morning cartoon style, bold black outlines, flat bright colors, simple shapes, cheerful exaggerated expressions, vintage TV animation frame",
    subject:
      "a group of cartoon kids and a dog in front of a suburban house",
  },
  {
    slug: "claymation",
    name: "Claymation",
    category: "Cartoon",
    description:
      "Handmade stop-motion: fingerprints in the clay, cozy and tactile.",
    modifier:
      "claymation stop-motion style, hand-sculpted clay figures with visible fingerprints, miniature handmade sets, warm practical lighting, tactile and charming",
    subject: "a clay figure baker in a tiny handmade bakery",
  },
  {
    slug: "paper-cutout",
    name: "Paper Cutout",
    category: "Cartoon",
    description:
      "Construction-paper worlds, visible scissor edges, playful collage.",
    modifier:
      "paper cutout animation style, layered construction paper shapes with visible cut edges, flat collage composition, bright matte colors, handmade charm",
    subject: "a layered paper-cutout forest with a small paper fox",
  },
  {
    slug: "ink-and-paint-cel",
    name: "Ink & Paint Cel",
    category: "Cartoon",
    description: "Classic hand-inked cel animation over painted backgrounds.",
    modifier:
      "traditional hand-drawn cel animation, inked outlines over lush gouache-painted backgrounds, classic mid-century cartoon look, warm saturated color",
    subject: "a cartoon fox standing in a lush painted forest clearing",
  },
  // Anime
  {
    slug: "shonen-action",
    name: "Shonen Action",
    category: "Anime",
    description: "Speed lines, power stances, skies that crackle with energy.",
    modifier:
      "dynamic shonen anime style, bold speed lines, dramatic power poses, crackling energy effects, vivid saturated color, detailed anime film frame",
    subject:
      "an anime hero in a dramatic pose surrounded by crackling energy",
  },
  {
    slug: "cozy-slice-of-life",
    name: "Cozy Slice-of-Life",
    category: "Anime",
    description:
      "Sunlit classrooms and quiet afternoons — nothing happens, beautifully.",
    modifier:
      "cozy slice-of-life anime style, soft sunlight through windows, gentle pastel palette, detailed everyday backgrounds, calm nostalgic mood, anime film frame",
    subject: "an anime student reading by a sunlit classroom window",
  },
  {
    slug: "mecha-hangar",
    name: "Mecha Hangar",
    category: "Anime",
    description:
      "Giant robots, maintenance gantries, industrial cathedral scale.",
    modifier:
      "mecha anime style, a giant robot in a vast industrial hangar, maintenance gantries and cables, dramatic scale contrast, detailed mechanical design, anime film frame",
    subject:
      "a giant robot standing in a vast hangar with tiny engineers below",
  },
  {
    slug: "retro-80s-anime",
    name: "Retro 80s Anime",
    category: "Anime",
    description: "Airbrushed skies, film grain, city-pop neon.",
    modifier:
      "1980s retro anime style, airbrushed gradient skies, film grain and chromatic aberration, neon city-pop palette, hand-drawn cel look, vintage anime frame",
    subject:
      "an anime couple on a motorcycle under an airbrushed sunset sky",
  },
  {
    slug: "ink-wash-anime",
    name: "Ink Wash Anime",
    category: "Anime",
    description:
      "Sumi-e brush strokes meet animation: spare, poetic, monochrome.",
    modifier:
      "sumi-e ink wash anime style, expressive black brush strokes, generous white space, minimal monochrome palette with one accent color, poetic stillness, anime frame",
    subject: "an ink-wash anime swordsman standing on a misty bridge",
  },
  // Drawing
  {
    slug: "charcoal-sketch",
    name: "Charcoal Sketch",
    category: "Drawing",
    description: "Smudged charcoal drama: bold strokes, raw texture.",
    modifier:
      "charcoal drawing style, bold smudged strokes, deep blacks and dusty greys, rough paper texture, raw expressive mark-making",
    subject: "a lighthouse in a storm, drawn in charcoal",
  },
  {
    slug: "ink-crosshatch",
    name: "Ink Crosshatch",
    category: "Drawing",
    description: "Pen-and-ink worlds built from a thousand careful lines.",
    modifier:
      "pen and ink crosshatching style, intricate hatched shading, crisp black lines on cream paper, vintage book illustration look",
    subject: "an old windmill, drawn in pen-and-ink crosshatch",
  },
  {
    slug: "colored-pencil",
    name: "Colored Pencil",
    category: "Drawing",
    description: "Soft layered pencil color with visible grain and warmth.",
    modifier:
      "colored pencil illustration style, soft layered strokes, visible paper grain, gentle warm palette, hand-drawn storybook feel",
    subject: "a cottage garden, drawn in colored pencil",
  },
  {
    slug: "marker-concept",
    name: "Marker Concept",
    category: "Drawing",
    description:
      "Storyboard marker art: grey tones, bold accents, fast and confident.",
    modifier:
      "marker concept art style, grey alcohol-marker tones with bold accent colors, confident loose strokes, white highlights, storyboard panel look",
    subject: "a futuristic street market, drawn as marker concept art",
  },
  // Illustration
  {
    slug: "storybook-gouache",
    name: "Storybook Gouache",
    category: "Illustration",
    description:
      "The picture-book look: opaque paint, rounded shapes, gentle wonder.",
    modifier:
      "gouache storybook illustration, opaque matte paint, rounded friendly shapes, rich warm colors, classic picture-book charm",
    subject: "a bear family outside a forest cottage, in gouache",
  },
  {
    slug: "art-deco-poster",
    name: "Art Deco Poster",
    category: "Illustration",
    description:
      "Geometric glamour: gold lines, bold shapes, vintage travel poster.",
    modifier:
      "art deco poster illustration, geometric shapes, gold and teal palette, bold flat design, elegant vintage travel-poster composition",
    subject: "an ocean liner, as an art deco travel poster",
  },
  {
    slug: "ukiyo-e-wave",
    name: "Ukiyo-e Wave",
    category: "Illustration",
    description: "Japanese woodblock: flat color, bold line, nature in motion.",
    modifier:
      "ukiyo-e woodblock print style, flat color areas, bold black outlines, stylized waves and nature, textured washi paper feel",
    subject: "a great stylized wave with fishing boats, as a woodblock print",
  },
  {
    slug: "noir-comic",
    name: "Noir Comic",
    category: "Illustration",
    description:
      "Ink-heavy graphic-novel shadows, hard-boiled and high contrast.",
    modifier:
      "noir comic book illustration, heavy black ink shadows, limited duotone palette, halftone texture, hard-boiled graphic novel look",
    subject: "a detective under a streetlamp, as a noir comic illustration",
  },
  {
    slug: "botanical-plate",
    name: "Botanical Plate",
    category: "Illustration",
    description:
      "Scientific illustration: precise, delicate, quietly beautiful.",
    modifier:
      "vintage botanical illustration style, precise scientific detail, delicate linework and watercolor washes, cream paper background, natural history plate",
    subject: "wildflowers and ferns, as a vintage botanical plate",
  },
  // Painting
  {
    slug: "impressionist-light",
    name: "Impressionist Light",
    category: "Painting",
    description: "Broken color and shimmering light, painted en plein air.",
    modifier:
      "impressionist painting style, broken brushstrokes, shimmering natural light, vivid color dabs, soft atmospheric depth, visible canvas texture",
    subject: "a riverbank at golden hour, as an impressionist painting",
  },
  {
    slug: "baroque-drama",
    name: "Baroque Drama",
    category: "Painting",
    description: "Chiaroscuro on canvas: storms and theatrical shadow.",
    modifier:
      "baroque oil painting style, dramatic chiaroscuro, theatrical gestures, deep umber shadows and golden highlights, rich canvas texture",
    subject: "a stormy sea rescue, as a baroque oil painting",
  },
  {
    slug: "watercolor-wash",
    name: "Watercolor Wash",
    category: "Painting",
    description: "Pigment blooming in water: soft edges, luminous paper white.",
    modifier:
      "watercolor painting style, translucent washes, soft bleeding edges, luminous white paper showing through, gentle granulation texture",
    subject: "a misty mountain village, painted in watercolor",
  },
  {
    slug: "palette-knife",
    name: "Palette Knife",
    category: "Painting",
    description: "Thick impasto strokes you can almost touch.",
    modifier:
      "palette knife oil painting style, thick impasto strokes, sculptural paint texture, bold color contrasts, expressive surface detail",
    subject: "a sunflower field, painted with a palette knife",
  },
  {
    slug: "fresco",
    name: "Fresco",
    category: "Painting",
    description:
      "Wall-painted antiquity: earth pigments, cracked plaster, timeless calm.",
    modifier:
      "fresco painting style, earth pigments on cracked plaster, flat ancient composition, muted ochre and terracotta palette, aged wall texture",
    subject: "harvesters in an ancient countryside, as a fresco",
  },
  // 3D
  {
    slug: "toy-diorama",
    name: "Toy Diorama",
    category: "3D",
    description: "A miniature world shot like it's real: tilt-shift charm.",
    modifier:
      "tilt-shift miniature diorama look, a tiny handcrafted model world photographed as if real, shallow depth of field, bright cheerful color, photographic still",
    subject: "a miniature diorama of a tiny seaside town",
  },
  {
    slug: "low-poly-world",
    name: "Low-Poly World",
    category: "3D",
    description: "Faceted geometry and flat-shaded color, game-art nostalgia.",
    modifier:
      "low-poly 3D render style, faceted geometric shapes, flat-shaded colors, clean minimal composition, soft studio lighting",
    subject: "a low-poly 3D island with a lighthouse and trees",
  },
  {
    slug: "clay-render",
    name: "Clay Render",
    category: "3D",
    description: "Digital clay: everything soft, matte, freshly sculpted.",
    modifier:
      "3D clay render style, soft matte sculpted forms, pastel palette, gentle rounded shapes, soft diffused lighting, tactile digital clay look",
    subject: "a small clay-rendered character in a rounded pastel room",
  },
  {
    slug: "voxel-scene",
    name: "Voxel Scene",
    category: "3D",
    description: "Built from cubes: charming blocky worlds.",
    modifier:
      "voxel art 3D style, a scene built entirely from small cubes, isometric charm, bright colors, crisp blocky detail",
    subject: "a voxel art castle on a floating island",
  },
  {
    slug: "porcelain-render",
    name: "Porcelain Render",
    category: "3D",
    description: "Glossy ceramic worlds: delicate, reflective, gallery-clean.",
    modifier:
      "porcelain 3D render style, glossy ceramic surfaces, delicate reflections, clean gallery lighting, elegant minimal composition",
    subject: "a white ceramic fox in a clean gallery space, as a porcelain render",
  },
];

const styleOut = z.object({
  id: z.number(),
  name: z.string(),
  category: styleCategorySchema,
  description: z.string(),
  modifier: z.string(),
  imageUrl: z.string().nullable(),
  isBuiltin: z.boolean(),
  favorite: z.boolean(),
});

type StyleRow = typeof schema.styles.$inferSelect;

async function styleToOut(
  ctx: Ctx,
  row: StyleRow,
): Promise<z.infer<typeof styleOut>> {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    modifier: row.modifier,
    imageUrl: row.imageBlobKey ? await ctx.blobs.getUrl(row.imageBlobKey) : null,
    isBuiltin: row.isBuiltin === 1,
    favorite: row.favorite === 1,
  };
}

// The prompt text that steers generation for a project: the library
// style's modifier when the project uses one, else the built-in look.
async function resolveProjectLook(
  ctx: Ctx,
  project: ProjectRow,
): Promise<string> {
  if (project.styleId) {
    const db = ctx.db<typeof schema>();
    const rows = await db
      .select()
      .from(schema.styles)
      .where(eq(schema.styles.id, project.styleId))
      .limit(1);
    if (rows[0]) return rows[0].modifier;
  }
  return (
    STYLE_LOOK[project.style] ??
    STYLE_LOOK["Sci-Fi"] ??
    "cinematic film still"
  );
}

// Resolves a library style id to its row for project creation / style
// switching; throws when the id doesn't resolve so a bad pick never
// silently falls back to a built-in.
async function loadStyleRow(
  ctx: Ctx,
  styleId: number,
  who: string,
): Promise<StyleRow> {
  const db = ctx.db<typeof schema>();
  const rows = await db
    .select()
    .from(schema.styles)
    .where(eq(schema.styles.id, styleId))
    .limit(1);
  const row = rows[0];
  if (!row) throw new Error(`${who}: style not found`);
  return row;
}

const sceneOut = z.object({
  id: z.number(),
  position: z.number(),
  title: z.string(),
  description: z.string(),
  visualPrompt: z.string(),
  imageUrl: z.string().nullable(),
  status: z.enum(["pending", "ready", "failed"]),
  // Bible tags.
  locationId: z.number().nullable(),
  characterIds: z.array(z.number()),
  stateNote: z.string().nullable(),
  // The exact composed prompt of the latest generation (null until filmed).
  lastPrompt: z.string().nullable(),
  // The script heading this scene was planned from (Stage 3), else null.
  scriptHeading: z.string().nullable(),
});

const characterOut = z.object({
  id: z.number(),
  name: z.string(),
  role: z.string(),
  appearance: z.string(),
  wardrobe: z.string(),
  personality: z.string(),
  backstory: z.string(),
  imageUrl: z.string().nullable(),
  status: z.enum(["pending", "ready", "failed"]),
});

const locationOut = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  mood: z.string(),
  lighting: z.string(),
  timeOfDay: z.string(),
  imageUrl: z.string().nullable(),
  status: z.enum(["pending", "ready", "failed"]),
});

const projectSummary = z.object({
  id: z.number(),
  title: z.string(),
  prompt: z.string(),
  style: z.string(),
  // Styles library (Stage 7): the library style row this project uses,
  // or null when it uses one of the six built-in styles.
  styleId: z.number().nullable(),
  isSample: z.boolean(),
  // Workspace organisation (Stage 2 shell).
  status: z.enum(["in_progress", "done"]),
  archived: z.boolean(),
  published: z.boolean(),
  sceneCount: z.number(),
  readyCount: z.number(),
  posterUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // FilmKit TV (Stage 8).
  hasCut: z.boolean(),
  likes: z.number(),
  supports: z.number(),
  liked: z.boolean(),
  supported: z.boolean(),
  festivalSubmitted: z.boolean(),
  featured: z.boolean(),
  imageModel: z.string(),
  videoModel: z.string(),
});

type SceneRow = typeof schema.scenes.$inferSelect;
type ProjectRow = typeof schema.projects.$inferSelect;
type CharacterRow = typeof schema.characters.$inferSelect;
type LocationRow = typeof schema.locations.$inferSelect;

async function sceneToOut(
  ctx: Ctx,
  row: SceneRow,
): Promise<z.infer<typeof sceneOut>> {
  const db = ctx.db<typeof schema>();
  const links = await db
    .select()
    .from(schema.sceneCharacters)
    .where(eq(schema.sceneCharacters.sceneId, row.id))
    .orderBy(asc(schema.sceneCharacters.characterId));
  return {
    id: row.id,
    position: row.position,
    title: row.title,
    description: row.description,
    visualPrompt: row.visualPrompt,
    imageUrl: row.imageBlobKey ? await ctx.blobs.getUrl(row.imageBlobKey) : null,
    status: row.status,
    locationId: row.locationId ?? null,
    characterIds: links.map((l) => l.characterId),
    stateNote: row.stateNote ?? null,
    lastPrompt: row.lastPrompt ?? null,
    scriptHeading: row.scriptHeading ?? null,
  };
}

async function characterToOut(
  ctx: Ctx,
  row: CharacterRow,
): Promise<z.infer<typeof characterOut>> {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    appearance: row.appearance,
    wardrobe: row.wardrobe,
    personality: row.personality,
    backstory: row.backstory,
    imageUrl: row.imageBlobKey ? await ctx.blobs.getUrl(row.imageBlobKey) : null,
    status: row.status,
  };
}

async function locationToOut(
  ctx: Ctx,
  row: LocationRow,
): Promise<z.infer<typeof locationOut>> {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    mood: row.mood,
    lighting: row.lighting,
    timeOfDay: row.timeOfDay,
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
    styleId: project.styleId ?? null,
    isSample: project.isSample === 1,
    status: project.status,
    archived: project.archived === 1,
    published: project.published === 1,
    sceneCount: rows.length,
    readyCount: rows.filter((r) => r.status === "ready").length,
    posterUrl: poster?.imageBlobKey
      ? await ctx.blobs.getUrl(poster.imageBlobKey)
      : null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: (project.updatedAt ?? project.createdAt).toISOString(),
    hasCut: project.hasCut === 1,
    likes: project.tvLikes ?? 0,
    supports: project.tvSupports ?? 0,
    liked: project.tvLiked === 1,
    supported: project.tvSupported === 1,
    festivalSubmitted: project.festivalSubmitted === 1,
    featured: project.tvFeatured === 1 || project.isSample === 1,
    imageModel: project.imageModel ?? "filmkit-standard",
    videoModel: project.videoModel ?? "minimax-h3-fast",
  };
}

/* ------------------------- FilmKit TV (Stage 8) ------------------------- */

export const GALLERY_CATEGORIES = [
  "All",
  "Featured Workflows",
  "Series",
  "Animation",
  "Horror & Thriller",
  "True Stories",
  "Festival",
] as const;
export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

// Primary genre category for a film, derived from its style — never
// invented. Library styles resolve through their catalog category.
async function galleryCategoryFor(
  ctx: Ctx,
  project: ProjectRow,
): Promise<string> {
  const style = project.style.toLowerCase();
  let styleCat: string | null = null;
  if (project.styleId) {
    const db = ctx.db<typeof schema>();
    const rows = await db
      .select()
      .from(schema.styles)
      .where(eq(schema.styles.id, project.styleId))
      .limit(1);
    styleCat = rows[0]?.category ?? null;
  }
  if (
    style === "anime" ||
    styleCat === "Anime" ||
    styleCat === "Cartoon" ||
    style.includes("anime") ||
    style.includes("cartoon") ||
    style.includes("animation")
  )
    return "Animation";
  if (style === "horror" || style.includes("horror") || style.includes("thriller"))
    return "Horror & Thriller";
  if (
    style === "documentary" ||
    style.includes("documentary") ||
    style.includes("true stor")
  )
    return "True Stories";
  return "Featured Workflows";
}

function galleryCategoriesFor(
  project: ProjectRow,
  primary: string,
): string[] {
  const cats: string[] = ["All", primary];
  if (project.tvFeatured === 1 || project.isSample === 1)
    cats.push("Featured Workflows");
  if (project.festivalSubmitted === 1) cats.push("Festival");
  return [...new Set(cats)];
}

const galleryFilm = z.object({
  id: z.number(),
  title: z.string(),
  prompt: z.string(),
  style: z.string(),
  styleId: z.number().nullable(),
  isSample: z.boolean(),
  published: z.boolean(),
  hasCut: z.boolean(),
  creator: z.string(),
  sceneCount: z.number(),
  readyCount: z.number(),
  posterUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  runtimeSeconds: z.number(),
  likes: z.number(),
  supports: z.number(),
  liked: z.boolean(),
  supported: z.boolean(),
  festivalSubmitted: z.boolean(),
  featured: z.boolean(),
  category: z.string(),
  categories: z.array(z.string()),
});

async function projectToGalleryFilm(
  ctx: Ctx,
  project: ProjectRow,
): Promise<z.infer<typeof galleryFilm>> {
  const db = ctx.db<typeof schema>();
  const summary = await projectToSummary(ctx, project);
  let runtimeSeconds = summary.readyCount * 7;
  if (project.hasCut === 1) {
    const clips = await db
      .select()
      .from(schema.timelineClips)
      .where(eq(schema.timelineClips.projectId, project.id));
    if (clips.length > 0)
      runtimeSeconds = Math.round(
        clips.reduce((sum, c) => sum + c.duration, 0),
      );
  }
  const primary = await galleryCategoryFor(ctx, project);
  return {
    id: summary.id,
    title: summary.title,
    prompt: summary.prompt,
    style: summary.style,
    styleId: summary.styleId,
    isSample: summary.isSample,
    published: summary.published,
    hasCut: summary.hasCut,
    creator: summary.isSample ? "FilmKit" : "You",
    sceneCount: summary.sceneCount,
    readyCount: summary.readyCount,
    posterUrl: summary.posterUrl,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    runtimeSeconds,
    likes: summary.likes,
    supports: summary.supports,
    liked: summary.liked,
    supported: summary.supported,
    festivalSubmitted: summary.festivalSubmitted,
    featured: summary.featured,
    category: primary,
    categories: galleryCategoriesFor(project, primary),
  };
}

async function loadGalleryProject(
  ctx: Ctx,
  projectId: number,
  who: string,
): Promise<ProjectRow> {
  const db = ctx.db<typeof schema>();
  const rows = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, projectId))
    .limit(1);
  const project = rows[0];
  if (!project) throw new Error(`${who}: film not found`);
  const inGallery =
    project.isSample === 1 || project.published === 1;
  if (!inGallery) throw new Error(`${who}: film is not in the gallery`);
  return project;
}

// Marks a project as edited "now" so the Workspace "Last edited" sort and
// the Home recent strip reflect real activity.
async function touchProject(ctx: Ctx, projectId: number): Promise<void> {
  const db = ctx.db<typeof schema>();
  await db
    .update(schema.projects)
    .set({ updatedAt: new Date() })
    .where(eq(schema.projects.id, projectId));
}

/* ------------------------- Bible context (shared) ------------------------ */

// Loads a project's bible rows in stable order.
async function loadBible(
  ctx: Ctx,
  projectId: number,
): Promise<{ characters: CharacterRow[]; locations: LocationRow[] }> {
  const db = ctx.db<typeof schema>();
  const characters = await db
    .select()
    .from(schema.characters)
    .where(eq(schema.characters.projectId, projectId))
    .orderBy(asc(schema.characters.id));
  const locations = await db
    .select()
    .from(schema.locations)
    .where(eq(schema.locations.projectId, projectId))
    .orderBy(asc(schema.locations.id));
  return { characters, locations };
}

// The binding-context paragraph used whenever AI writes for a project that
// already has a bible (storyboard, script writing): the existing cast and
// places are the film's cast and places, never replacements to invent.
function bibleContextString(
  characters: CharacterRow[],
  locations: LocationRow[],
): string | undefined {
  if (characters.length === 0 && locations.length === 0) return undefined;
  const parts = [
    `This film's world bible already exists — write for THESE characters and places, using their exact names, looks, and wardrobes. Do not invent replacement characters for roles they already fill.`,
  ];
  for (const c of characters) {
    parts.push(
      `Character ${c.name} (${c.role}): ${c.appearance}. Wardrobe: ${c.wardrobe}. Personality: ${c.personality}.`,
    );
  }
  for (const l of locations) {
    parts.push(
      `Location ${l.name}: ${l.description} Mood: ${l.mood}. Lighting: ${l.lighting}. Time of day: ${l.timeOfDay}.`,
    );
  }
  return parts.join("\n");
}

/* --------------------------- Script parsing ------------------------------ */
//
// Stage 3 (Story view): the script is fountain-style plain text. A scene
// heading is a line starting INT. / EXT. / INT./EXT. / EST. (a leading "."
// force-heading is also accepted). Parsing is deliberately forgiving —
// plain structured text with no headings still works through the
// prompt-based fallback in planShotsFromScript.

const SCENE_HEADING_RE =
  /^(?:\.\s*)?(INT\.?\/EXT\.?|INT\.?|EXT\.?|EST\.)\s+\S/i;

type ScriptBlock = { heading: string; body: string[] };

function parseScriptScenes(text: string): ScriptBlock[] {
  const blocks: ScriptBlock[] = [];
  let current: ScriptBlock | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.length > 0 && line.length <= 120 && SCENE_HEADING_RE.test(line)) {
      current = { heading: line.replace(/\s+/g, " "), body: [] };
      blocks.push(current);
    } else if (current) {
      current.body.push(raw);
    }
  }
  return blocks;
}

// The action/description lines of one script scene: character cues (short
// ALL-CAPS lines) and the dialogue line that follows each cue are dropped,
// so what remains describes what the camera sees.
function scriptActionLines(body: string[]): string[] {
  const out: string[] = [];
  let skipNext = false;
  for (const raw of body) {
    const line = raw.trim();
    if (!line) continue;
    if (skipNext) {
      skipNext = false;
      continue;
    }
    const isCue =
      line.length <= 42 &&
      line === line.toUpperCase() &&
      /[A-Z]/.test(line) &&
      !/[.!?;:]$/.test(line);
    if (isCue) {
      skipNext = true;
      continue;
    }
    out.push(line);
  }
  return out;
}

// "INT. KITCHEN - DAY" -> "Int. Kitchen - Day" for a scene title.
function headingToTitle(heading: string): string {
  return heading
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ")
    .slice(0, 120);
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
  variants = false,
  bibleContext?: string,
): Promise<z.infer<typeof storyboardSchema>> {
  const countLine = sceneCount
    ? `exactly ${sceneCount} scenes`
    : "between 4 and 6 scenes";
  const lines = [
    `You are a film director's storyboard artist. Turn this story idea into a short silent film storyboard in the ${style} style.`,
    `Story idea: "${prompt}"`,
    `Give the film a title and ${countLine}. Each scene needs: a short evocative title, a one-line description of what happens, and a detailed visual prompt describing one cinematic film still for that scene (composition, subject, lighting, mood — the visual prompt must not ask for any text, words, or letters in the image).`,
    `Keep one consistent protagonist and visual world across all scenes so the stills feel like one film. Build a clear arc: opening, development, climax, resolution.`,
  ];
  if (bibleContext) {
    // Characters-first flow: the project already has a developed bible.
    // The storyboard must be written for that cast and those places, not
    // invented replacements.
    lines.push(bibleContext);
  }
  if (variants) {
    lines.push(
      `Workflow variants are ON: lean into alternate takes — favour the less obvious staging of each beat, vary shot scale and camera angle boldly from scene to scene, and let one scene reinterpret the story from an unexpected point of view, while keeping the same protagonist, world, and arc.`,
    );
  }
  return ctx.inference.complete(lines.join("\n"), {
    schema: storyboardSchema,
    timeout_secs: 120,
  });
}

async function insertStoryboard(
  ctx: Ctx,
  input: {
    prompt: string;
    style: string;
    isSample: boolean;
    styleId?: number | null;
  },
  board: z.infer<typeof storyboardSchema>,
): Promise<number> {
  const db = ctx.db<typeof schema>();
  const inserted = await db
    .insert(schema.projects)
    .values({
      title: board.title,
      prompt: input.prompt,
      style: input.style,
      styleId: input.styleId ?? null,
      isSample: input.isSample ? 1 : 0,
      updatedAt: new Date(),
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
  charge = false,
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

  // Bible wiring: fold the tagged characters' profiles, the tagged
  // location's profile, and the in-scene state note into the prompt so the
  // same people and places stay consistent across the film. A scene with no
  // tags composes exactly the prompt it did before the bible existed.
  const links = await db
    .select()
    .from(schema.sceneCharacters)
    .where(eq(schema.sceneCharacters.sceneId, sceneId));
  const taggedCharacters: CharacterRow[] = [];
  for (const link of links) {
    const rows = await db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.id, link.characterId))
      .limit(1);
    if (rows[0]) taggedCharacters.push(rows[0]);
  }
  let taggedLocation: LocationRow | undefined;
  if (scene.locationId) {
    const rows = await db
      .select()
      .from(schema.locations)
      .where(eq(schema.locations.id, scene.locationId))
      .limit(1);
    taggedLocation = rows[0];
  }

  const bibleParts: string[] = [];
  if (taggedLocation) {
    bibleParts.push(
      `Setting: ${taggedLocation.name} — ${taggedLocation.description} Mood: ${taggedLocation.mood}. Lighting: ${taggedLocation.lighting}. Time of day: ${taggedLocation.timeOfDay}.`,
    );
  }
  for (const c of taggedCharacters) {
    bibleParts.push(
      `Character ${c.name} (${c.role}): ${c.appearance}. Wardrobe: ${c.wardrobe}. Bearing and expression show this personality: ${c.personality}.`,
    );
  }
  const stateNote = scene.stateNote?.trim();
  if (stateNote) bibleParts.push(`In this scene: ${stateNote}.`);

  const look = await resolveProjectLook(ctx, project);
  const prompt =
    `Cinematic film still, 16:9 composition. ${scene.visualPrompt} ` +
    (bibleParts.length > 0 ? `${bibleParts.join(" ")} ` : "") +
    `Style: ${look}. No text, no words, no letters, no watermark.`;
  // Stage 9 charging: deduct on success, auto-refund on failure.
  let chargeAcct: AcctRow | null = null;
  let chargeModel: ModelDef | null = null;
  let chargeCost = 0;
  if (charge) {
    const acct0 = await ensureAccount(ctx);
    chargeModel = modelById(project.imageModel);
    chargeCost = chargeModel.cost;
    await assertAndChargePrecheck(ctx, acct0, chargeModel, chargeCost, `Scene still — ${scene.title}`, project.id);
    chargeAcct = await spendCredits(ctx, acct0, chargeCost, `Scene still — ${scene.title}`, chargeModel, project.id);
  }
  try {
    const media = await ctx.tool.generate_media(prompt, {
      orientation: "landscape",
    });
    await db
      .update(schema.scenes)
      .set({ imageBlobKey: media.blobKey, status: "ready", lastPrompt: prompt })
      .where(eq(schema.scenes.id, sceneId));
  } catch {
    if (chargeAcct && chargeModel) await refundCredits(ctx, chargeAcct, chargeCost, `Refund — scene still failed (${chargeModel.name})`, chargeModel, project.id);
    await db
      .update(schema.scenes)
      .set({ status: "failed", lastPrompt: prompt })
      .where(eq(schema.scenes.id, sceneId));
    if (charge) throw new Error(`Generation failed with ${chargeModel?.name ?? "the image model"} — your ${chargeCost} credits were refunded automatically. Try again.`);
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

/* ------------------------- Canvas helpers (Stage 4) ----------------------- */

const canvasSectionOut = z.object({
  id: z.number(),
  name: z.string(),
  position: z.number(),
  collapsed: z.boolean(),
});

const canvasNodeOut = z.object({
  id: z.number(),
  sectionId: z.number().nullable(),
  type: z.enum(["upload", "note", "image", "clip"]),
  title: z.string(),
  x: z.number(),
  y: z.number(),
  text: z.string(),
  prompt: z.string(),
  quantity: z.number(),
  // Bible tags (image nodes), mirroring scene tags.
  locationId: z.number().nullable(),
  characterIds: z.array(z.number()),
  lastPrompt: z.string().nullable(),
});

const mediaItemOut = z.object({
  id: z.number(),
  nodeId: z.number().nullable(),
  kind: z.enum(["image", "upload", "clip"]),
  name: z.string(),
  imageUrl: z.string().nullable(),
  prompt: z.string().nullable(),
  favorite: z.boolean(),
  archived: z.boolean(),
  inEditorBin: z.boolean(),
});

const canvasLinkOut = z.object({
  id: z.number(),
  fromKind: z.enum(["node", "media"]),
  fromId: z.number(),
  toNodeId: z.number(),
  kind: z.enum(["prompt_source", "start_frame"]),
});

const chatMessageOut = z.object({
  id: z.number(),
  role: z.enum(["user", "assistant"]),
  text: z.string(),
  // Raw JSON of the structured proposal (shotlist / bible / images), or
  // null for a plain message. The client parses and renders it.
  proposal: z.string().nullable(),
  proposalStatus: z
    .enum(["pending", "applied", "in_review", "dismissed"])
    .nullable(),
});

type CanvasSectionRow = typeof schema.canvasSections.$inferSelect;
type CanvasNodeRow = typeof schema.canvasNodes.$inferSelect;
type MediaItemRow = typeof schema.mediaItems.$inferSelect;
type ChatMessageRow = typeof schema.chatMessages.$inferSelect;

function sectionToOut(
  row: CanvasSectionRow,
): z.infer<typeof canvasSectionOut> {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    collapsed: row.collapsed === 1,
  };
}

async function nodeToOut(
  ctx: Ctx,
  row: CanvasNodeRow,
): Promise<z.infer<typeof canvasNodeOut>> {
  const db = ctx.db<typeof schema>();
  const links = await db
    .select()
    .from(schema.nodeCharacters)
    .where(eq(schema.nodeCharacters.nodeId, row.id))
    .orderBy(asc(schema.nodeCharacters.characterId));
  return {
    id: row.id,
    sectionId: row.sectionId ?? null,
    type: row.type,
    title: row.title,
    x: row.x,
    y: row.y,
    text: row.text,
    prompt: row.prompt,
    quantity: row.quantity,
    locationId: row.locationId ?? null,
    characterIds: links.map((l) => l.characterId),
    lastPrompt: row.lastPrompt ?? null,
  };
}

async function mediaToOut(
  ctx: Ctx,
  row: MediaItemRow,
): Promise<z.infer<typeof mediaItemOut>> {
  return {
    id: row.id,
    nodeId: row.nodeId ?? null,
    kind: row.kind,
    name: row.name,
    imageUrl: row.imageBlobKey ? await ctx.blobs.getUrl(row.imageBlobKey) : null,
    prompt: row.prompt ?? null,
    favorite: row.favorite === 1,
    archived: row.archived === 1,
    inEditorBin: row.inEditorBin === 1,
  };
}

async function loadProjectRow(
  ctx: Ctx,
  projectId: number,
): Promise<ProjectRow | undefined> {
  const db = ctx.db<typeof schema>();
  const rows = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, projectId))
    .limit(1);
  return rows[0];
}

function assertWritable(project: ProjectRow, who: string): void {
  if (project.isSample === 1)
    throw new Error(`${who}: sample films are read-only`);
}

// Every project opens with the four starter sections (Flick's canvas
// grouping, in FilmKit's words). Created lazily on first canvas access.
const STARTER_SECTIONS = ["CHARACTERS", "SCENES", "SHOTS", "CLIPS"] as const;

async function ensureCanvasSections(
  ctx: Ctx,
  projectId: number,
): Promise<void> {
  const db = ctx.db<typeof schema>();
  const existing = await db
    .select({ id: schema.canvasSections.id })
    .from(schema.canvasSections)
    .where(eq(schema.canvasSections.projectId, projectId))
    .limit(1);
  if (existing.length > 0) return;
  for (const [i, name] of STARTER_SECTIONS.entries()) {
    await db.insert(schema.canvasSections).values({
      projectId,
      name,
      position: i,
    });
  }
}

// A simple cascade slot for a new node so nodes don't stack on one point.
async function nextNodePosition(
  ctx: Ctx,
  projectId: number,
): Promise<{ x: number; y: number }> {
  const db = ctx.db<typeof schema>();
  const rows = await db
    .select({ id: schema.canvasNodes.id })
    .from(schema.canvasNodes)
    .where(eq(schema.canvasNodes.projectId, projectId));
  const n = rows.length;
  return { x: 40 + (n % 3) * 300, y: 40 + Math.floor(n / 3) * 340 };
}

// Runs an image node: resolves its prompt (a wired text note wins over the
// node's own prompt), folds in its bible tags exactly like scene
// generation does, and creates the node's quantity of stills as media
// items. Returns the created items.
async function runImageNodeInternal(
  ctx: Ctx,
  nodeId: number,
): Promise<z.infer<typeof mediaItemOut>[]> {
  const db = ctx.db<typeof schema>();
  const nodeRows = await db
    .select()
    .from(schema.canvasNodes)
    .where(eq(schema.canvasNodes.id, nodeId))
    .limit(1);
  const node = nodeRows[0];
  if (!node) throw new Error("runImageNode: node not found");
  if (node.type !== "image")
    throw new Error("runImageNode: only image nodes generate stills");
  const project = await loadProjectRow(ctx, node.projectId);
  if (!project) throw new Error("runImageNode: project not found");
  assertWritable(project, "runImageNode");

  // Prompt source: a wired text note feeds this node.
  let sourceText = node.prompt.trim();
  const links = await db
    .select()
    .from(schema.canvasLinks)
    .where(
      and(
        eq(schema.canvasLinks.toNodeId, node.id),
        eq(schema.canvasLinks.kind, "prompt_source"),
      ),
    );
  const noteLink = links[0];
  if (noteLink) {
    const noteRows = await db
      .select()
      .from(schema.canvasNodes)
      .where(eq(schema.canvasNodes.id, noteLink.fromId))
      .limit(1);
    const noteText = noteRows[0]?.text.trim();
    if (noteText) sourceText = noteText;
  }
  if (!sourceText)
    throw new Error(
      "runImageNode: write a prompt on the node (or wire a text note into it) first",
    );

  // Bible folding — identical shape to generateStillForScene.
  const charLinks = await db
    .select()
    .from(schema.nodeCharacters)
    .where(eq(schema.nodeCharacters.nodeId, node.id));
  const taggedCharacters: CharacterRow[] = [];
  for (const link of charLinks) {
    const rows = await db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.id, link.characterId))
      .limit(1);
    if (rows[0]) taggedCharacters.push(rows[0]);
  }
  let taggedLocation: LocationRow | undefined;
  if (node.locationId) {
    const rows = await db
      .select()
      .from(schema.locations)
      .where(eq(schema.locations.id, node.locationId))
      .limit(1);
    taggedLocation = rows[0];
  }
  const bibleParts: string[] = [];
  // Skip a part the prompt text already carries (a node sent from the 3D
  // Stage arrives with its bible descriptors pre-folded into the prompt).
  if (taggedLocation && !sourceText.includes(`Setting: ${taggedLocation.name} —`)) {
    bibleParts.push(
      `Setting: ${taggedLocation.name} — ${taggedLocation.description} Mood: ${taggedLocation.mood}. Lighting: ${taggedLocation.lighting}. Time of day: ${taggedLocation.timeOfDay}.`,
    );
  }
  for (const c of taggedCharacters) {
    if (sourceText.includes(`Character ${c.name} (`)) continue;
    bibleParts.push(
      `Character ${c.name} (${c.role}): ${c.appearance}. Wardrobe: ${c.wardrobe}. Bearing and expression show this personality: ${c.personality}.`,
    );
  }
  const look = await resolveProjectLook(ctx, project);
  const composed =
    `Cinematic film still, 16:9 composition. ${sourceText} ` +
    (bibleParts.length > 0 ? `${bibleParts.join(" ")} ` : "") +
    `Style: ${look}. No text, no words, no letters, no watermark.`;

  const quantity = Math.min(4, Math.max(1, node.quantity));
  const _acct0 = await ensureAccount(ctx); const _model = modelById(project.imageModel); const _total = _model.cost * quantity; await assertAndChargePrecheck(ctx, _acct0, _model, _total, `Canvas image — ${node.title} ×${quantity}`, project.id); const _acct = await spendCredits(ctx, _acct0, _total, `Canvas image — ${node.title} ×${quantity}`, _model, project.id);
  const created: z.infer<typeof mediaItemOut>[] = [];
  const existing = await db
    .select({ id: schema.mediaItems.id })
    .from(schema.mediaItems)
    .where(eq(schema.mediaItems.nodeId, node.id));
  try {
  for (let i = 0; i < quantity; i++) {
    const media = await ctx.tool.generate_media(composed, {
      orientation: "landscape",
    });
    const inserted = await db
      .insert(schema.mediaItems)
      .values({
        projectId: node.projectId,
        nodeId: node.id,
        kind: "image",
        name: `${node.title} — ${existing.length + i + 1}`,
        imageBlobKey: media.blobKey,
        prompt: composed,
      })
      .returning();
    const row = inserted[0];
    if (row) created.push(await mediaToOut(ctx, row));
  }
  } catch (e) {
    await refundCredits(ctx, _acct, _total, `Refund — canvas image failed (${_model.name})`, _model, project.id);
    throw new Error(`Generation failed with ${_model.name} — your ${_total} credits were refunded automatically. Try again.`);
  }
  await db
    .update(schema.canvasNodes)
    .set({ lastPrompt: composed })
    .where(eq(schema.canvasNodes.id, node.id));
  await touchProject(ctx, node.projectId);
  return created;
}

// Runs a clip node: the motion clip is the wired start frame's still,
// presented with the player's cinematic pan/zoom and labeled honestly as
// a motion clip (real video models arrive with the accounts stage).
async function runClipNodeInternal(
  ctx: Ctx,
  nodeId: number,
  note: string,
): Promise<z.infer<typeof mediaItemOut>> {
  const db = ctx.db<typeof schema>();
  const nodeRows = await db
    .select()
    .from(schema.canvasNodes)
    .where(eq(schema.canvasNodes.id, nodeId))
    .limit(1);
  const node = nodeRows[0];
  if (!node) throw new Error("runClipNode: node not found");
  if (node.type !== "clip")
    throw new Error("runClipNode: only frame-to-clip nodes make clips");
  const project = await loadProjectRow(ctx, node.projectId);
  if (!project) throw new Error("runClipNode: project not found");
  assertWritable(project, "runClipNode");
  const links = await db
    .select()
    .from(schema.canvasLinks)
    .where(
      and(
        eq(schema.canvasLinks.toNodeId, node.id),
        eq(schema.canvasLinks.kind, "start_frame"),
      ),
    );
  const link = links[0];
  if (!link)
    throw new Error("runClipNode: wire a start frame into this node first");
  const itemRows = await db
    .select()
    .from(schema.mediaItems)
    .where(eq(schema.mediaItems.id, link.fromId))
    .limit(1);
  const source = itemRows[0];
  if (!source || !source.imageBlobKey)
    throw new Error("runClipNode: the start frame has no image yet");
  const _acct0 = await ensureAccount(ctx); const _vmodel = modelById(project.videoModel); await assertAndChargePrecheck(ctx, _acct0, _vmodel, _vmodel.cost, `Motion clip — ${node.title}`, project.id); await spendCredits(ctx, _acct0, _vmodel.cost, `Motion clip — ${node.title}`, _vmodel, project.id);
  const trimmed = note.trim();
  const inserted = await db
    .insert(schema.mediaItems)
    .values({
      projectId: node.projectId,
      nodeId: node.id,
      kind: "clip",
      name: `Motion clip — ${source.name}`.slice(0, 120),
      imageBlobKey: source.imageBlobKey,
      prompt: trimmed.length > 0 ? trimmed : null,
    })
    .returning();
  const row = inserted[0];
  if (!row) throw new Error("runClipNode: insert failed");
  await touchProject(ctx, node.projectId);
  return mediaToOut(ctx, row);
}

/* ------------------------- Canvas chat proposals -------------------------- */

const chatProposalSchema = z.object({
  kind: z.enum(["shotlist", "bible", "images"]),
  shots: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        visualPrompt: z.string(),
      }),
    )
    .max(6),
  characters: z
    .array(
      z.object({
        name: z.string(),
        role: z.string(),
        appearance: z.string(),
        wardrobe: z.string(),
        personality: z.string(),
        backstory: z.string(),
      }),
    )
    .max(6),
  locations: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        mood: z.string(),
        lighting: z.string(),
        timeOfDay: z.string(),
      }),
    )
    .max(6),
  imagePrompts: z.array(z.string()).max(3),
});

const chatReplySchema = z.object({
  reply: z.string(),
  proposal: chatProposalSchema.nullable(),
});

// Executes an approved chat proposal. Shot lists append storyboard scenes;
// image prompts become generate-image nodes (in SHOTS) that run now.
// Bible proposals never reach here — they route to the Bible review panel.
async function applyChatProposalInternal(
  ctx: Ctx,
  message: ChatMessageRow,
): Promise<void> {
  const db = ctx.db<typeof schema>();
  if (!message.proposalJson) return;
  const proposal = JSON.parse(
    message.proposalJson,
  ) as z.infer<typeof chatProposalSchema>;
  const project = await loadProjectRow(ctx, message.projectId);
  if (!project) throw new Error("applyChatProposal: project not found");
  if (proposal.kind === "shotlist") {
    const lastRow = await db
      .select()
      .from(schema.scenes)
      .where(eq(schema.scenes.projectId, project.id))
      .orderBy(desc(schema.scenes.position))
      .limit(1);
    let position = (lastRow[0]?.position ?? -1) + 1;
    for (const s of proposal.shots) {
      await db.insert(schema.scenes).values({
        projectId: project.id,
        position,
        title: s.title.slice(0, 120) || "Untitled scene",
        description: s.description.slice(0, 400) || s.title,
        visualPrompt: s.visualPrompt.slice(0, 1200) || s.description,
      });
      position += 1;
    }
    await touchProject(ctx, project.id);
  } else if (proposal.kind === "images") {
    await ensureCanvasSections(ctx, project.id);
    const sections = await db
      .select()
      .from(schema.canvasSections)
      .where(eq(schema.canvasSections.projectId, project.id))
      .orderBy(asc(schema.canvasSections.position));
    const shotsSection =
      sections.find((s) => s.name.toUpperCase() === "SHOTS") ?? sections[0];
    for (const promptText of proposal.imagePrompts) {
      const clean = promptText.trim();
      if (!clean) continue;
      const pos = await nextNodePosition(ctx, project.id);
      const inserted = await db
        .insert(schema.canvasNodes)
        .values({
          projectId: project.id,
          sectionId: shotsSection?.id ?? null,
          type: "image",
          title: clean.slice(0, 60),
          prompt: clean.slice(0, 1200),
          quantity: 1,
          x: pos.x,
          y: pos.y,
        })
        .returning({ id: schema.canvasNodes.id });
      const nodeRow = inserted[0];
      if (nodeRow) await runImageNodeInternal(ctx, nodeRow.id);
    }
  }
}

/* --------------------------- Stage helpers (Stage 6) ---------------------- */
//
// The 3D Stage is a top-down blocking board. Geometry is shared in shape
// with the client (which renders the live description): positions are
// board percentages, rotation 0 faces up (north) and turns clockwise.
// A camera sees a figure when the figure is in front of it and inside the
// field-of-view cone for its shot size.

const stageItemOut = z.object({
  id: z.number(),
  kind: z.enum(["figure", "camera", "prop"]),
  // Live Bible character id, or null for generic figures and figures
  // whose character was deleted (the label snapshot keeps them readable).
  characterId: z.number().nullable(),
  characterName: z.string().nullable(),
  label: z.string(),
  color: z.string(),
  x: z.number(),
  y: z.number(),
  rotation: z.number(),
  shotSize: z.enum(["wide", "medium", "close"]).nullable(),
  camHeight: z.enum(["low", "eye", "high", "overhead"]).nullable(),
  movementNote: z.string().nullable(),
  descriptionOverride: z.string().nullable(),
});

const stageSetupOut = z.object({
  id: z.number(),
  name: z.string(),
  position: z.number(),
  items: z.array(stageItemOut),
});

type StageItemRow = typeof schema.stageItems.$inferSelect;

// Half-angle of the field of view per shot size (degrees).
const SHOT_HALF_FOV: Record<string, number> = {
  wide: 35,
  medium: 25,
  close: 14,
};

const SHOT_SIZE_LABEL: Record<string, string> = {
  wide: "Wide shot",
  medium: "Medium shot",
  close: "Close-up",
};

const CAM_HEIGHT_PHRASE: Record<string, string> = {
  low: "from a low angle, looking up",
  eye: "at eye level",
  high: "from a high angle, looking down",
  overhead: "from directly overhead, looking straight down",
};

type FramedThing = {
  itemId: number;
  label: string;
  side: "frame left" | "center frame" | "frame right";
  depth: "foreground" | "mid-ground" | "background";
  dist: number;
};

// Works out what one camera sees: which figures/props are in frame and
// where each sits (side + depth), nearest first.
function frameContents(
  camera: StageItemRow,
  items: StageItemRow[],
  labelOf: (item: StageItemRow) => string,
): { figures: FramedThing[]; props: FramedThing[] } {
  const rad = (camera.rotation * Math.PI) / 180;
  const fx = Math.sin(rad);
  const fy = -Math.cos(rad);
  const rx = Math.cos(rad);
  const ry = Math.sin(rad);
  const halfFov = SHOT_HALF_FOV[camera.shotSize ?? "wide"] ?? 35;
  const figures: FramedThing[] = [];
  const props: FramedThing[] = [];
  for (const item of items) {
    if (item.id === camera.id || item.kind === "camera") continue;
    const dx = item.x - camera.x;
    const dy = item.y - camera.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) continue;
    const forward = dx * fx + dy * fy;
    if (forward <= 0) continue;
    const angleDeg =
      (Math.acos(Math.min(1, Math.max(-1, forward / dist))) * 180) / Math.PI;
    if (angleDeg > halfFov) continue;
    const lateral = dx * rx + dy * ry;
    const ratio = lateral / dist;
    const side =
      ratio < -0.28
        ? "frame left"
        : ratio > 0.28
          ? "frame right"
          : "center frame";
    const depth =
      dist < 24 ? "foreground" : dist > 52 ? "background" : "mid-ground";
    const entry: FramedThing = {
      itemId: item.id,
      label: labelOf(item),
      side,
      depth,
      dist,
    };
    if (item.kind === "figure") figures.push(entry);
    else props.push(entry);
  }
  figures.sort((a, b) => a.dist - b.dist);
  props.sort((a, b) => a.dist - b.dist);
  return { figures, props };
}

// The auto-composed plain-language shot description for a camera. Mirrors
// the client's live computation (client/src/App.tsx, same geometry).
function composeShotDescription(
  camera: StageItemRow,
  items: StageItemRow[],
  labelOf: (item: StageItemRow) => string,
): string {
  const size = SHOT_SIZE_LABEL[camera.shotSize ?? "wide"] ?? "Wide shot";
  const height =
    CAM_HEIGHT_PHRASE[camera.camHeight ?? "eye"] ?? "at eye level";
  const { figures, props } = frameContents(camera, items, labelOf);
  const parts: string[] = [`${size}, ${height}.`];
  if (figures.length === 0) {
    parts.push("No characters are in frame from this camera.");
  } else {
    const lines = figures.map(
      (f) => `${f.label} is at ${f.side}, in the ${f.depth}`,
    );
    parts.push(`${lines.join("; ")}.`);
  }
  if (props.length > 0) {
    const lines = props.map(
      (p) => `${p.label} in the ${p.depth} at ${p.side}`,
    );
    parts.push(`Also visible: ${lines.join("; ")}.`);
  }
  const move = camera.movementNote?.trim();
  if (move) parts.push(`Camera movement: ${move}.`);
  return parts.join(" ");
}

// The effective description: the user's edit wins over the auto text.
function effectiveShotDescription(
  camera: StageItemRow,
  items: StageItemRow[],
  labelOf: (item: StageItemRow) => string,
): string {
  const override = camera.descriptionOverride?.trim();
  if (override) return override;
  return composeShotDescription(camera, items, labelOf);
}

async function stageItemToOut(
  ctx: Ctx,
  row: StageItemRow,
): Promise<z.infer<typeof stageItemOut>> {
  const db = ctx.db<typeof schema>();
  let characterName: string | null = null;
  if (row.characterId) {
    const rows = await db
      .select({ name: schema.characters.name })
      .from(schema.characters)
      .where(eq(schema.characters.id, row.characterId))
      .limit(1);
    characterName = rows[0]?.name ?? null;
  }
  return {
    id: row.id,
    kind: row.kind,
    characterId: characterName ? row.characterId : null,
    characterName,
    label: row.label,
    color: row.color,
    x: row.x,
    y: row.y,
    rotation: row.rotation,
    shotSize: row.shotSize ?? null,
    camHeight: row.camHeight ?? null,
    movementNote: row.movementNote ?? null,
    descriptionOverride: row.descriptionOverride ?? null,
  };
}

async function loadStageSetup(
  ctx: Ctx,
  setupId: number,
): Promise<{ setup: typeof schema.stageSetups.$inferSelect; project: ProjectRow }> {
  const db = ctx.db<typeof schema>();
  const rows = await db
    .select()
    .from(schema.stageSetups)
    .where(eq(schema.stageSetups.id, setupId))
    .limit(1);
  const setup = rows[0];
  if (!setup) throw new Error("stage: setup not found");
  const project = await loadProjectRow(ctx, setup.projectId);
  if (!project) throw new Error("stage: project not found");
  return { setup, project };
}

// Display label for a stage item: the live character name when the figure
// is still linked to a Bible character, else its stored label.
async function stageLabelResolver(
  ctx: Ctx,
  projectId: number,
): Promise<(item: StageItemRow) => string> {
  const db = ctx.db<typeof schema>();
  const chars = await db
    .select()
    .from(schema.characters)
    .where(eq(schema.characters.projectId, projectId));
  const byId = new Map(chars.map((c) => [c.id, c.name]));
  return (item) =>
    item.characterId ? (byId.get(item.characterId) ?? item.label) : item.label;
}

// The cast figures a camera actually frames (for bible tagging on send).
function framedCharacterIds(
  camera: StageItemRow,
  items: StageItemRow[],
): number[] {
  const { figures } = frameContents(camera, items, (i) => i.label);
  const inFrame = new Set(figures.map((f) => f.itemId));
  const ids: number[] = [];
  for (const item of items) {
    if (item.kind === "figure" && item.characterId && inFrame.has(item.id))
      ids.push(item.characterId);
  }
  return ids;
}

const FIGURE_COLORS = [
  "#b3543f",
  "#3f6fb5",
  "#3f9155",
  "#8a5fb5",
  "#b58a3f",
  "#3fa8a0",
  "#b53f78",
  "#5b6ab5",
];

/* -------------------------- Editor helpers (Stage 5) ---------------------- */

const effectSchema = z.enum([
  "none",
  "warm",
  "cold",
  "noir",
  "grain",
  "vhs",
  "bloom",
  "vignette",
  "posterize",
]);
const transitionSchema = z.enum(["cut", "dissolve", "fade_black", "wipe"]);
const textMotionSchema = z.enum([
  "none",
  "fade_rise",
  "typewriter",
  "slam",
  "credit_roll",
]);

const editorClipOut = z.object({
  id: z.number(),
  sourceKind: z.enum(["scene", "media"]),
  sourceId: z.number(),
  position: z.number(),
  duration: z.number(),
  effect: effectSchema,
  transition: transitionSchema,
  // Resolved from the source row at read time, so renames and re-filmed
  // scenes show up in the edit without touching the timeline rows.
  title: z.string(),
  imageUrl: z.string().nullable(),
  isMotionClip: z.boolean(),
});

const editorTextOut = z.object({
  id: z.number(),
  clipId: z.number().nullable(),
  text: z.string(),
  kind: z.enum(["title", "lower_third", "caption"]),
  motion: textMotionSchema,
  start: z.number(),
  duration: z.number(),
});

const editorAudioOut = z.object({
  id: z.number(),
  name: z.string(),
  audioUrl: z.string(),
  volume: z.number(),
  start: z.number(),
});

type TimelineClipRow = typeof schema.timelineClips.$inferSelect;

async function editorClipToOut(
  ctx: Ctx,
  row: TimelineClipRow,
): Promise<z.infer<typeof editorClipOut>> {
  const db = ctx.db<typeof schema>();
  let title = "Missing source";
  let imageUrl: string | null = null;
  let isMotionClip = false;
  if (row.sourceKind === "scene") {
    const rows = await db
      .select()
      .from(schema.scenes)
      .where(eq(schema.scenes.id, row.sourceId))
      .limit(1);
    const scene = rows[0];
    if (scene) {
      title = scene.title;
      imageUrl = scene.imageBlobKey
        ? await ctx.blobs.getUrl(scene.imageBlobKey)
        : null;
    }
  } else {
    const rows = await db
      .select()
      .from(schema.mediaItems)
      .where(eq(schema.mediaItems.id, row.sourceId))
      .limit(1);
    const item = rows[0];
    if (item) {
      title = item.name;
      imageUrl = item.imageBlobKey
        ? await ctx.blobs.getUrl(item.imageBlobKey)
        : null;
      isMotionClip = item.kind === "clip";
    }
  }
  return {
    id: row.id,
    sourceKind: row.sourceKind,
    sourceId: row.sourceId,
    position: row.position,
    duration: row.duration,
    effect: row.effect,
    transition: row.transition,
    title,
    imageUrl,
    isMotionClip,
  };
}

// Rewrites clip positions as 0..n-1 in the current order after a removal,
// so later appends and swaps never collide.
async function renumberTimelineClips(
  ctx: Ctx,
  projectId: number,
): Promise<void> {
  const db = ctx.db<typeof schema>();
  const rows = await db
    .select()
    .from(schema.timelineClips)
    .where(eq(schema.timelineClips.projectId, projectId))
    .orderBy(asc(schema.timelineClips.position), asc(schema.timelineClips.id));
  for (const [i, row] of rows.entries()) {
    if (row.position !== i) {
      await db
        .update(schema.timelineClips)
        .set({ position: i })
        .where(eq(schema.timelineClips.id, row.id));
    }
  }
}

/* ----------------------- Stage 9: plans & models ----------------------- */
// Prices MATCH Flick's exactly (annual billing shown; monthly ≈ +25%).
export const PLAN_IDS = ["free", "casual", "standard", "pro", "studio", "enterprise"] as const;
type PlanId = (typeof PLAN_IDS)[number];
const PLAN_RANK: Record<PlanId, number> = { free: 0, casual: 1, standard: 2, pro: 3, studio: 4, enterprise: 5 };
type PlanDef = { id: PlanId; name: string; annual: number | null; monthly: number | null; credits: number; creditsNote: string; gens: string; video: string };
export const PLANS: PlanDef[] = [
  { id: "free", name: "Free", annual: 0, monthly: 0, credits: 100, creditsNote: "100 credits/mo", gens: "~20 standard image gens", video: "Budget video models only" },
  { id: "casual", name: "Casual", annual: 4, monthly: 5, credits: 500, creditsNote: "500 credits/mo", gens: "~100 standard image gens", video: "~2 min video/mo" },
  { id: "standard", name: "Standard", annual: 16, monthly: 20, credits: 2500, creditsNote: "2,500 credits/mo", gens: "~500 standard image gens", video: "~10 min video/mo" },
  { id: "pro", name: "Pro", annual: 45, monthly: 56, credits: 8000, creditsNote: "8,000 credits/mo", gens: "~1,600 standard image gens", video: "~33 min video/mo · priority support" },
  { id: "studio", name: "Studio", annual: 100, monthly: 125, credits: 24000, creditsNote: "24,000 credits/mo (scales to 240,000)", gens: "~4,800 standard image gens", video: "~100 min video/mo" },
  { id: "enterprise", name: "Enterprise", annual: null, monthly: null, credits: 0, creditsNote: "Custom credits", gens: "Custom", video: "Custom" },
];
function planDef(id: string): PlanDef { return PLANS.find((p) => p.id === id) ?? PLANS[0]!; }

export type ModelDef = { id: string; name: string; type: "image" | "video" | "audio"; cost: number; costMax: number | null; fulfillment: "builtin" | "aggregator"; minPlan: PlanId; note: string };
const IMG = (id: string, name: string, cost: number, costMax: number | null, fulfillment: "builtin" | "aggregator", note = ""): ModelDef => ({ id, name, type: "image", cost, costMax, fulfillment, minPlan: "free", note });
const VID = (id: string, name: string, cost: number, costMax: number | null, fulfillment: "builtin" | "aggregator", minPlan: PlanId, note = ""): ModelDef => ({ id, name, type: "video", cost, costMax, fulfillment, minPlan, note });
const AUD = (id: string, name: string, cost: number, costMax: number | null, note = ""): ModelDef => ({ id, name, type: "audio", cost, costMax, fulfillment: "aggregator", minPlan: "free", note });
export const MODELS: ModelDef[] = [
  IMG("filmkit-standard", "FilmKit Standard", 5, null, "builtin", "Built-in engine — the standard image model (GPT Image 2.5 class, 5 credits observed)"),
  IMG("gpt-image-2-5", "GPT Image 2.5", 5, 10, "aggregator"),
  IMG("gpt-image-2-6", "GPT Image 2.6", 6, 12, "aggregator"),
  IMG("gpt-image-1", "GPT Image 1", 4, 8, "aggregator"),
  IMG("flux-1-pro", "FLUX.1 Pro", 8, 15, "aggregator"),
  IMG("flux-1-dev", "FLUX.1 Dev", 4, 8, "aggregator"),
  IMG("flux-kontext-pro", "FLUX Kontext Pro", 12, 20, "aggregator"),
  IMG("ideogram-3", "Ideogram 3.0", 10, 15, "aggregator"),
  IMG("recraft-v3", "Recraft V3", 8, 12, "aggregator"),
  IMG("midjourney-v6", "Midjourney V6", 15, 30, "aggregator"),
  IMG("dall-e-3", "DALL·E 3", 10, 10, "aggregator"),
  IMG("sd-3-5-large", "Stable Diffusion 3.5 Large", 6, 10, "aggregator"),
  IMG("sdxl-turbo", "SDXL Turbo", 2, 4, "aggregator"),
  IMG("imagen-4", "Imagen 4", 12, 20, "aggregator"),
  IMG("imagen-3", "Imagen 3", 8, 12, "aggregator"),
  IMG("seedream-4", "Seedream 4.0", 5, 10, "aggregator"),
  IMG("qwen-image", "Qwen Image", 4, 8, "aggregator"),
  IMG("wan-2-2-image", "Wan 2.2 Image", 5, 10, "aggregator"),
  IMG("reve-image", "Reve Image", 10, 15, "aggregator"),
  IMG("photon", "Photon (Luma)", 8, 12, "aggregator"),
  IMG("auraflow", "AuraFlow", 3, 5, "aggregator"),
  IMG("kolors-2", "Kolors 2.0", 4, 8, "aggregator"),
  IMG("hidream-i1", "HiDream I1", 6, 10, "aggregator"),
  IMG("chroma", "Chroma", 3, 6, "aggregator"),
  IMG("pixart-sigma", "PixArt Sigma", 2, 4, "aggregator"),
  IMG("playground-2-5", "Playground v2.5", 3, 6, "aggregator"),
  IMG("leonardo-phoenix", "Leonardo Phoenix", 10, 15, "aggregator"),
  IMG("firefly-4", "Firefly Image 4", 9, 14, "aggregator"),
  IMG("bria-3-2", "Bria 3.2", 5, 8, "aggregator"),
  IMG("nano-banana", "Nano Banana (Gemini Image)", 7, 12, "aggregator"),
  VID("minimax-h3-fast", "MiniMax H3 Fast", 20, 40, "builtin", "free", "Budget model — fulfilled as a motion clip by the built-in engine"),
  VID("minimax-h3-max", "MiniMax H3 Max", 35, 60, "builtin", "free", "Budget model — fulfilled as a motion clip by the built-in engine"),
  VID("pruna-draft", "Pruna Draft", 15, 25, "builtin", "free", "Budget model — fulfilled as a motion clip by the built-in engine"),
  VID("bytedance-upscale", "Bytedance Upscale", 10, 20, "builtin", "free", "Budget upscaler — fulfilled as a motion clip by the built-in engine"),
  VID("mirelo-sfx-2", "Mirelo SFX 2.0", 12, 20, "builtin", "free", "Budget model — fulfilled as a motion clip by the built-in engine"),
  VID("gpt-image-2-6-gif", "GPT Image 2.6 GIF", 12, 20, "builtin", "free", "Budget GIF maker — fulfilled as a motion clip by the built-in engine"),
  VID("kling-2-1-pro", "Kling 2.1 Pro", 120, 240, "aggregator", "standard"),
  VID("kling-2-1-standard", "Kling 2.1 Standard", 80, 160, "aggregator", "standard"),
  VID("kling-2-0", "Kling 2.0", 70, 140, "aggregator", "standard"),
  VID("runway-gen-4", "Runway Gen-4", 100, 200, "aggregator", "standard"),
  VID("runway-gen-3", "Runway Gen-3 Alpha", 60, 120, "aggregator", "standard"),
  VID("luma-ray-2", "Luma Dream Machine Ray 2", 90, 180, "aggregator", "standard"),
  VID("luma-ray-flash", "Luma Ray Flash", 45, 90, "aggregator", "standard"),
  VID("pika-2-2", "Pika 2.2", 50, 100, "aggregator", "standard"),
  VID("veo-3", "Veo 3", 240, 240, "aggregator", "standard"),
  VID("veo-3-fast", "Veo 3 Fast", 150, 200, "aggregator", "standard"),
  VID("veo-2", "Veo 2", 100, 160, "aggregator", "standard"),
  VID("sora-preview", "Sora (preview)", 200, 240, "aggregator", "standard"),
  VID("hailuo-02-pro", "Hailuo 02 Pro", 110, 200, "aggregator", "standard"),
  VID("hailuo-02-standard", "Hailuo 02 Standard", 70, 130, "aggregator", "standard"),
  VID("wan-2-2-video", "Wan 2.2 Video", 55, 110, "aggregator", "standard"),
  VID("wan-2-1-video", "Wan 2.1 Video", 40, 80, "aggregator", "standard"),
  VID("seedance-1-pro", "Seedance 1.0 Pro", 95, 180, "aggregator", "standard"),
  VID("seedance-1-lite", "Seedance 1.0 Lite", 50, 90, "aggregator", "standard"),
  VID("pixverse-v4", "PixVerse V4", 45, 90, "aggregator", "standard"),
  VID("vidu-q1", "Vidu Q1", 60, 110, "aggregator", "standard"),
  VID("marey", "Moonvalley Marey", 85, 150, "aggregator", "standard"),
  VID("ltx-video", "LTX Video", 25, 50, "aggregator", "standard"),
  VID("cogvideox", "CogVideoX", 30, 60, "aggregator", "standard"),
  VID("hunyuan-video", "Hunyuan Video", 65, 120, "aggregator", "standard"),
  VID("mochi-1", "Mochi 1", 35, 70, "aggregator", "standard"),
  VID("pyramid-flow", "Pyramid Flow", 20, 40, "aggregator", "standard"),
  VID("animatediff", "AnimateDiff", 18, 36, "aggregator", "standard"),
  VID("svd", "Stable Video Diffusion", 22, 44, "aggregator", "standard"),
  VID("morph-studio", "Morph Studio", 40, 80, "aggregator", "standard"),
  VID("genmo-turbo", "Genmo Mochi Turbo", 28, 50, "aggregator", "standard"),
  VID("krea-video", "Krea Video", 75, 140, "aggregator", "standard"),
  AUD("elevenlabs-voice", "ElevenLabs Voice", 10, 20),
  AUD("elevenlabs-music", "ElevenLabs Music", 30, 50),
  AUD("suno-v4-5", "Suno v4.5", 25, 40),
  AUD("mirelo-sfx-pro", "Mirelo SFX Pro", 12, 24),
];
function modelById(id: string | null | undefined): ModelDef {
  return MODELS.find((m) => m.id === id) ?? MODELS[0]!;
}
const modelOut = z.object({ id: z.string(), name: z.string(), type: z.enum(["image", "video", "audio"]), cost: z.number(), costMax: z.number().nullable(), fulfillment: z.enum(["builtin", "aggregator"]), minPlan: z.string(), note: z.string(), locked: z.boolean(), lockReason: z.string().nullable() });
const planOut = z.object({ id: z.string(), name: z.string(), annual: z.number().nullable(), monthly: z.number().nullable(), credits: z.number(), creditsNote: z.string(), gens: z.string(), video: z.string() });
const ledgerOut = z.object({ id: z.number(), amount: z.number(), balanceAfter: z.number(), kind: z.string(), reason: z.string(), modelName: z.string().nullable(), createdAt: z.string() });
const accountOut = z.object({
  plan: z.string(), billingPeriod: z.string(), displayName: z.string(), bio: z.string(), balance: z.number(),
  cycleStart: z.string(), cycleEnd: z.string(), chatDefault: z.string(), watermarkPos: z.string(), theme: z.string(),
  workflowRules: z.string(), notifications: z.record(z.string(), z.boolean()), aggProvider: z.string(), hasKey: z.boolean(),
  plans: z.array(planOut), models: z.array(modelOut), ledger: z.array(ledgerOut),
});
type AcctRow = typeof schema.workspaceAccount.$inferSelect;
function mostRecentMonday(d: Date): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); const day = x.getDay(); const diff = (day + 6) % 7; x.setDate(x.getDate() - diff); return x; }
async function ledgerAdd(ctx: Ctx, acct: AcctRow, amount: number, kind: "grant" | "spend" | "refund" | "expiry" | "topup", reason: string, modelName?: string | null, projectId?: number | null): Promise<AcctRow> {
  const db = ctx.db<typeof schema>();
  const next = Math.max(0, acct.balance + amount);
  await db.update(schema.workspaceAccount).set({ balance: next }).where(eq(schema.workspaceAccount.id, acct.id));
  await db.insert(schema.creditLedger).values({ amount, balanceAfter: next, kind, reason, modelName: modelName ?? null, projectId: projectId ?? null });
  return { ...acct, balance: next };
}
async function ensureAccount(ctx: Ctx): Promise<AcctRow> {
  const db = ctx.db<typeof schema>();
  const rows = await db.select().from(schema.workspaceAccount).where(eq(schema.workspaceAccount.id, 1)).limit(1);
  const now = new Date();
  if (!rows[0]) {
    const mrm = mostRecentMonday(now);
    const end = new Date(mrm); end.setDate(end.getDate() + 7);
    await db.insert(schema.workspaceAccount).values({ id: 1, plan: "free", billingPeriod: "annual", displayName: "You", bio: "", balance: 0, cycleStart: mrm, cycleEnd: end, lastMondayGrant: mrm, chatDefault: "ask", watermarkPos: "top-right", theme: "system", workflowRules: "", notifJson: "{}", aggProvider: "fal", aggKey: null });
    const fresh = (await db.select().from(schema.workspaceAccount).where(eq(schema.workspaceAccount.id, 1)).limit(1))[0]!;
    await ledgerAdd(ctx, fresh, 100, "grant", "Free plan — Monday grant (100 credits)");
    const after = (await db.select().from(schema.workspaceAccount).where(eq(schema.workspaceAccount.id, 1)).limit(1))[0]!;
    return after;
  }
  let acct = rows[0];
  if (acct.plan === "free") {
    const mrm = mostRecentMonday(now);
    if (!acct.lastMondayGrant || acct.lastMondayGrant.getTime() < mrm.getTime()) {
      if (acct.balance > 0) acct = await ledgerAdd(ctx, acct, -acct.balance, "expiry", "Free credits expired (weekly cycle)");
      const end = new Date(mrm); end.setDate(end.getDate() + 7);
      await db.update(schema.workspaceAccount).set({ lastMondayGrant: mrm, cycleStart: mrm, cycleEnd: end }).where(eq(schema.workspaceAccount.id, 1));
      acct = { ...acct, lastMondayGrant: mrm, cycleStart: mrm, cycleEnd: end };
      acct = await ledgerAdd(ctx, acct, 100, "grant", "Free plan — Monday grant (100 credits)");
    }
  } else if (acct.cycleEnd.getTime() <= now.getTime()) {
    const def = planDef(acct.plan);
    if (acct.balance > 0) acct = await ledgerAdd(ctx, acct, -acct.balance, "expiry", "Plan credits expired (credits do not roll over)");
    const end = new Date(now); end.setDate(end.getDate() + 30);
    await db.update(schema.workspaceAccount).set({ cycleStart: now, cycleEnd: end }).where(eq(schema.workspaceAccount.id, 1));
    acct = { ...acct, cycleStart: now, cycleEnd: end };
    acct = await ledgerAdd(ctx, acct, def.credits, "grant", `${def.name} plan — monthly grant (${def.credits.toLocaleString()} credits)`);
  }
  return acct;
}
function modelLock(acct: AcctRow, m: ModelDef): { locked: boolean; reason: string | null } {
  if (PLAN_RANK[acct.plan as PlanId] < PLAN_RANK[m.minPlan]) return { locked: true, reason: `${planDef(m.minPlan).name} plan or higher` };
  if (m.fulfillment === "aggregator" && !acct.aggKey) return { locked: true, reason: "Needs aggregator key" };
  return { locked: false, reason: null };
}
async function accountToOut(ctx: Ctx, acct: AcctRow): Promise<z.infer<typeof accountOut>> {
  const db = ctx.db<typeof schema>();
  const ledgerRows = await db.select().from(schema.creditLedger).orderBy(desc(schema.creditLedger.id)).limit(100);
  let notifs: Record<string, boolean> = {};
  try { notifs = JSON.parse(acct.notifJson || "{}") as Record<string, boolean>; } catch { notifs = {}; }
  return {
    plan: acct.plan, billingPeriod: acct.billingPeriod, displayName: acct.displayName, bio: acct.bio, balance: acct.balance,
    cycleStart: acct.cycleStart.toISOString(), cycleEnd: acct.cycleEnd.toISOString(), chatDefault: acct.chatDefault, watermarkPos: acct.watermarkPos,
    theme: acct.theme, workflowRules: acct.workflowRules, notifications: notifs, aggProvider: acct.aggProvider, hasKey: !!acct.aggKey,
    plans: PLANS.map((p) => ({ id: p.id, name: p.name, annual: p.annual, monthly: p.monthly, credits: p.credits, creditsNote: p.creditsNote, gens: p.gens, video: p.video })),
    models: MODELS.map((m) => { const l = modelLock(acct, m); return { id: m.id, name: m.name, type: m.type, cost: m.cost, costMax: m.costMax, fulfillment: m.fulfillment, minPlan: m.minPlan, note: m.note, locked: l.locked, lockReason: l.reason }; }),
    ledger: ledgerRows.map((r) => ({ id: r.id, amount: r.amount, balanceAfter: r.balanceAfter, kind: r.kind, reason: r.reason, modelName: r.modelName ?? null, createdAt: r.createdAt.toISOString() })),
  };
}
// Validates plan gate + key + balance BEFORE any spend. For aggregator
// models WITH a key saved, the provider call is attempted and fails in
// this build (no live provider wiring yet): spend + auto-refund, then throw.
async function assertAndChargePrecheck(ctx: Ctx, acct: AcctRow, model: ModelDef, totalCost: number, reason: string, projectId?: number | null): Promise<AcctRow> {
  const lock = modelLock(acct, model);
  if (lock.locked && lock.reason?.includes("plan")) throw new Error(`${model.name} needs ${lock.reason}. Switch plans in Account → Billing to unlock it.`);
  if (lock.locked) throw new Error(`${model.name} is locked — Needs aggregator key. Save a fal.ai or Replicate key in Account → Integrations to unlock aggregator models.`);
  if (acct.balance < totalCost) throw new Error(`Not enough credits — this run costs ${totalCost} credits but your balance is ${acct.balance}. Switch plans or wait for your next grant in Account → Billing.`);
  if (model.fulfillment === "aggregator") {
    let a = await ledgerAdd(ctx, acct, -totalCost, "spend", reason, model.name, projectId ?? null);
    a = await ledgerAdd(ctx, a, totalCost, "refund", `Refund — aggregator (${acct.aggProvider === "fal" ? "fal.ai" : "Replicate"}) could not fulfill ${model.name}`, model.name, projectId ?? null);
    void a;
    throw new Error(`Aggregator (${acct.aggProvider === "fal" ? "fal.ai" : "Replicate"}) could not fulfill ${model.name} — the key was rejected or the provider is unreachable. Your ${totalCost} credits were refunded automatically.`);
  }
  return acct;
}
async function spendCredits(ctx: Ctx, acct: AcctRow, totalCost: number, reason: string, model: ModelDef, projectId?: number | null): Promise<AcctRow> {
  return ledgerAdd(ctx, acct, -totalCost, "spend", reason, model.name, projectId ?? null);
}
async function refundCredits(ctx: Ctx, acct: AcctRow, totalCost: number, reason: string, model: ModelDef, projectId?: number | null): Promise<void> {
  await ledgerAdd(ctx, acct, totalCost, "refund", reason, model.name, projectId ?? null);
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
      characters: z.array(characterOut),
      locations: z.array(locationOut),
      // The project's script document (Stage 3 Story view), null until
      // a script is written or imported.
      script: z.string().nullable(),
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
      const characterRows = await db
        .select()
        .from(schema.characters)
        .where(eq(schema.characters.projectId, project.id))
        .orderBy(asc(schema.characters.id));
      const characters: z.infer<typeof characterOut>[] = [];
      for (const row of characterRows)
        characters.push(await characterToOut(ctx, row));
      const locationRows = await db
        .select()
        .from(schema.locations)
        .where(eq(schema.locations.projectId, project.id))
        .orderBy(asc(schema.locations.id));
      const locations: z.infer<typeof locationOut>[] = [];
      for (const row of locationRows)
        locations.push(await locationToOut(ctx, row));
      return {
        project: await projectToSummary(ctx, project),
        scenes,
        characters,
        locations,
        script: project.scriptText ?? null,
      };
    },
  }),

  createProject: defineAction({
    description:
      "Creates a film from a story prompt and cinematic style: an AI storyboard of 4–6 scenes is written and saved as a new project.",
    request: z.object({
      prompt: z.string().min(3).max(600),
      style: styleSchema.default("Noir"),
      // Styles library (Stage 7): when set, the project uses this library
      // style instead of the built-in named by `style`.
      styleId: z.number().int().positive().optional(),
      // Home's "Workflow variants" toggle: alternate-takes direction.
      variants: z.boolean().default(false),
    }),
    response: z.object({ projectId: z.number() }),
    async handler(ctx, args) {
      const picked = args.styleId
        ? await loadStyleRow(ctx, args.styleId, "createProject")
        : null;
      const styleName = picked ? picked.name : args.style;
      const board = await writeStoryboard(
        ctx,
        args.prompt,
        styleName,
        undefined,
        args.variants,
      );
      const projectId = await insertStoryboard(
        ctx,
        {
          prompt: args.prompt,
          style: styleName,
          isSample: false,
          styleId: picked ? picked.id : null,
        },
        board,
      );
      ctx.invalidateQueries();
      return { projectId };
    },
  }),

  createBlankProject: defineAction({
    description:
      "Creates an empty project with no scenes and opens it in the studio (the Blank canvas and + CREATE → New project entry paths).",
    request: z.object({
      style: styleSchema.default("Noir"),
      styleId: z.number().int().positive().optional(),
      title: z.string().min(1).max(120).default("Untitled film"),
    }),
    response: z.object({ projectId: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const picked = args.styleId
        ? await loadStyleRow(ctx, args.styleId, "createBlankProject")
        : null;
      const inserted = await db
        .insert(schema.projects)
        .values({
          title: args.title,
          prompt: "",
          style: picked ? picked.name : args.style,
          styleId: picked ? picked.id : null,
          isSample: 0,
          updatedAt: new Date(),
        })
        .returning({ id: schema.projects.id });
      const project = inserted[0];
      if (!project) throw new Error("createBlankProject: insert failed");
      ctx.invalidateQueries();
      return { projectId: project.id };
    },
  }),

  storyboardFromScript: defineAction({
    description:
      "Turns a pasted script or story into the storyboard of an existing (usually blank) project: writes the scenes, adopts the generated film title, and stores the pasted text as the project's prompt.",
    request: z.object({
      projectId: z.number().int().positive(),
      text: z.string().min(10).max(6000),
    }),
    response: z.object({ projectId: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, args.projectId))
        .limit(1);
      const project = rows[0];
      if (!project) throw new Error("storyboardFromScript: project not found");
      if (project.isSample === 1)
        throw new Error("storyboardFromScript: sample films are read-only");
      // Start-anywhere: if the user built the Bible before writing the
      // story (characters first), the storyboard is written for the
      // existing cast and locations. Bible rows are never touched here.
      const bible = await loadBible(ctx, project.id);
      const bibleContext = bibleContextString(
        bible.characters,
        bible.locations,
      );
      const board = await writeStoryboard(
        ctx,
        args.text,
        project.style,
        undefined,
        false,
        bibleContext,
      );
      await db
        .update(schema.projects)
        .set({
          title: board.title,
          prompt: args.text.slice(0, 600),
          // The pasted text also becomes the project's script document
          // (Stage 3 Story view) when it doesn't have one yet.
          ...(project.scriptText ? {} : { scriptText: args.text }),
          updatedAt: new Date(),
        })
        .where(eq(schema.projects.id, project.id));
      const existing = await db
        .select()
        .from(schema.scenes)
        .where(eq(schema.scenes.projectId, project.id))
        .orderBy(desc(schema.scenes.position))
        .limit(1);
      let position = (existing[0]?.position ?? -1) + 1;
      for (const s of board.scenes) {
        await db.insert(schema.scenes).values({
          projectId: project.id,
          position,
          title: s.title,
          description: s.description,
          visualPrompt: s.visualPrompt,
        });
        position += 1;
      }
      ctx.invalidateQueries();
      return { projectId: project.id };
    },
  }),

  duplicateProject: defineAction({
    description:
      "Duplicates a project with its storyboard, bible (characters and locations), scene tags, and generated stills. The copy starts unpublished and in progress.",
    request: z.object({ projectId: z.number().int().positive() }),
    response: z.object({ projectId: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, args.projectId))
        .limit(1);
      const source = rows[0];
      if (!source) throw new Error("duplicateProject: project not found");
      const inserted = await db
        .insert(schema.projects)
        .values({
          title: `${source.title} (copy)`.slice(0, 120),
          prompt: source.prompt,
          style: source.style,
          styleId: source.styleId ?? null,
          scriptText: source.scriptText,
          isSample: 0,
          status: "in_progress",
          archived: 0,
          published: 0,
          updatedAt: new Date(),
        })
        .returning({ id: schema.projects.id });
      const copy = inserted[0];
      if (!copy) throw new Error("duplicateProject: insert failed");

      // Bible first so scene tags can be remapped to the new ids.
      const charIdMap = new Map<number, number>();
      const sourceChars = await db
        .select()
        .from(schema.characters)
        .where(eq(schema.characters.projectId, source.id))
        .orderBy(asc(schema.characters.id));
      for (const c of sourceChars) {
        const ins = await db
          .insert(schema.characters)
          .values({
            projectId: copy.id,
            name: c.name,
            role: c.role,
            appearance: c.appearance,
            wardrobe: c.wardrobe,
            personality: c.personality,
            backstory: c.backstory,
            imageBlobKey: c.imageBlobKey,
            status: c.status,
          })
          .returning({ id: schema.characters.id });
        if (ins[0]) charIdMap.set(c.id, ins[0].id);
      }
      const locIdMap = new Map<number, number>();
      const sourceLocs = await db
        .select()
        .from(schema.locations)
        .where(eq(schema.locations.projectId, source.id))
        .orderBy(asc(schema.locations.id));
      for (const l of sourceLocs) {
        const ins = await db
          .insert(schema.locations)
          .values({
            projectId: copy.id,
            name: l.name,
            description: l.description,
            mood: l.mood,
            lighting: l.lighting,
            timeOfDay: l.timeOfDay,
            imageBlobKey: l.imageBlobKey,
            status: l.status,
          })
          .returning({ id: schema.locations.id });
        if (ins[0]) locIdMap.set(l.id, ins[0].id);
      }
      const sourceScenes = await db
        .select()
        .from(schema.scenes)
        .where(eq(schema.scenes.projectId, source.id))
        .orderBy(asc(schema.scenes.position));
      for (const s of sourceScenes) {
        const ins = await db
          .insert(schema.scenes)
          .values({
            projectId: copy.id,
            position: s.position,
            title: s.title,
            description: s.description,
            visualPrompt: s.visualPrompt,
            imageBlobKey: s.imageBlobKey,
            status: s.status,
            locationId: s.locationId
              ? (locIdMap.get(s.locationId) ?? null)
              : null,
            stateNote: s.stateNote,
            lastPrompt: s.lastPrompt,
            scriptHeading: s.scriptHeading,
          })
          .returning({ id: schema.scenes.id });
        const newScene = ins[0];
        if (!newScene) continue;
        const links = await db
          .select()
          .from(schema.sceneCharacters)
          .where(eq(schema.sceneCharacters.sceneId, s.id));
        for (const link of links) {
          const newCharId = charIdMap.get(link.characterId);
          if (newCharId) {
            await db.insert(schema.sceneCharacters).values({
              sceneId: newScene.id,
              characterId: newCharId,
            });
          }
        }
      }
      ctx.invalidateQueries();
      return { projectId: copy.id };
    },
  }),

  setProjectStatus: defineAction({
    description:
      "Marks a project In Progress or Done (the Workspace status control).",
    request: z.object({
      projectId: z.number().int().positive(),
      status: z.enum(["in_progress", "done"]),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.projects)
        .set({ status: args.status, updatedAt: new Date() })
        .where(eq(schema.projects.id, args.projectId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  setProjectArchived: defineAction({
    description: "Archives or unarchives a project (Workspace menu).",
    request: z.object({
      projectId: z.number().int().positive(),
      archived: z.boolean(),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.projects)
        .set({ archived: args.archived ? 1 : 0, updatedAt: new Date() })
        .where(eq(schema.projects.id, args.projectId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  setProjectPublished: defineAction({
    description:
      "Publishes a finished film to (or unpublishes it from) the FilmKit TV gallery. Publishing requires every scene to be filmed.",
    request: z.object({
      projectId: z.number().int().positive(),
      published: z.boolean(),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      if (args.published) {
        const sceneRows = await db
          .select()
          .from(schema.scenes)
          .where(eq(schema.scenes.projectId, args.projectId));
        const finished =
          sceneRows.length > 0 &&
          sceneRows.every((s) => s.status === "ready");
        if (!finished)
          throw new Error(
            "setProjectPublished: only a finished film (every scene filmed) can be published",
          );
      }
      await db
        .update(schema.projects)
        .set({ published: args.published ? 1 : 0, updatedAt: new Date() })
        .where(eq(schema.projects.id, args.projectId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  listGallery: defineAction({
    description:
      "Lists the FilmKit TV gallery: sample films and the user's published films, with creator, runtime, likes, supports, festival and category data.",
    request: z.object({}),
    response: z.object({ films: z.array(galleryFilm) }),
    async handler(ctx) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.projects)
        .orderBy(desc(schema.projects.id));
      const films: z.infer<typeof galleryFilm>[] = [];
      for (const row of rows) {
        if (!(row.isSample === 1 || row.published === 1)) continue;
        const film = await projectToGalleryFilm(ctx, row);
        if (film.readyCount === 0) continue;
        films.push(film);
      }
      return { films };
    },
  }),

  toggleGalleryLike: defineAction({
    description:
      "Likes or unlikes a FilmKit TV gallery film; the like and its count persist.",
    request: z.object({
      projectId: z.number().int().positive(),
      liked: z.boolean(),
    }),
    response: z.object({
      likes: z.number(),
      liked: z.boolean(),
    }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const project = await loadGalleryProject(
        ctx,
        args.projectId,
        "toggleGalleryLike",
      );
      const was = project.tvLiked === 1;
      if (was === args.liked)
        return { likes: project.tvLikes ?? 0, liked: was };
      const likes = Math.max(
        0,
        (project.tvLikes ?? 0) + (args.liked ? 1 : -1),
      );
      await db
        .update(schema.projects)
        .set({ tvLikes: likes, tvLiked: args.liked ? 1 : 0 })
        .where(eq(schema.projects.id, project.id));
      ctx.invalidateQueries();
      return { likes, liked: args.liked };
    },
  }),

  toggleGallerySupport: defineAction({
    description:
      "Records or withdraws the viewer's in-app support for a gallery film. No money moves — tipping and payouts arrive with accounts at Stage 9.",
    request: z.object({
      projectId: z.number().int().positive(),
      supported: z.boolean(),
    }),
    response: z.object({
      supports: z.number(),
      supported: z.boolean(),
    }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const project = await loadGalleryProject(
        ctx,
        args.projectId,
        "toggleGallerySupport",
      );
      const was = project.tvSupported === 1;
      if (was === args.supported)
        return { supports: project.tvSupports ?? 0, supported: was };
      const supports = Math.max(
        0,
        (project.tvSupports ?? 0) + (args.supported ? 1 : -1),
      );
      await db
        .update(schema.projects)
        .set({
          tvSupports: supports,
          tvSupported: args.supported ? 1 : 0,
        })
        .where(eq(schema.projects.id, project.id));
      ctx.invalidateQueries();
      return { supports, supported: args.supported };
    },
  }),

  setFestivalSubmitted: defineAction({
    description:
      "Submits a published film to (or withdraws it from) FilmKit's in-app festival shelf. No prizes or judging are promised in-app.",
    request: z.object({
      projectId: z.number().int().positive(),
      submitted: z.boolean(),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await loadGalleryProject(ctx, args.projectId, "setFestivalSubmitted");
      await db
        .update(schema.projects)
        .set({ festivalSubmitted: args.submitted ? 1 : 0 })
        .where(eq(schema.projects.id, args.projectId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  getWorkflow: defineAction({
    description:
      "Returns the read-only workflow for a gallery film: story prompt, style, storyboard scenes with visual prompts, Bible overview, and editor notes.",
    request: z.object({ projectId: z.number().int().positive() }),
    response: z.object({
      projectId: z.number(),
      title: z.string(),
      prompt: z.string(),
      style: z.string(),
      isSample: z.boolean(),
      creator: z.string(),
      hasCut: z.boolean(),
      editorNote: z.string(),
      scenes: z.array(
        z.object({
          title: z.string(),
          description: z.string(),
          visualPrompt: z.string(),
        }),
      ),
      characters: z.array(
        z.object({ name: z.string(), role: z.string(), line: z.string() }),
      ),
      locations: z.array(
        z.object({ name: z.string(), line: z.string() }),
      ),
    }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const project = await loadGalleryProject(ctx, args.projectId, "getWorkflow");
      const sceneRows = await db
        .select()
        .from(schema.scenes)
        .where(eq(schema.scenes.projectId, project.id))
        .orderBy(asc(schema.scenes.position));
      const bible = await loadBible(ctx, project.id);
      return {
        projectId: project.id,
        title: project.title,
        prompt: project.prompt,
        style: project.style,
        isSample: project.isSample === 1,
        creator: project.isSample === 1 ? "FilmKit" : "You",
        hasCut: project.hasCut === 1,
        editorNote:
          project.hasCut === 1
            ? "A cut was exported in the Editor — Watch plays the edited timeline (order, durations, looks, transitions, text and soundtrack) instead of the raw scene sequence."
            : "No cut exported — Watch plays the storyboard scenes in order with the cinematic pan/zoom player.",
        scenes: sceneRows.map((s) => ({
          title: s.title,
          description: s.description,
          visualPrompt: s.visualPrompt,
        })),
        characters: bible.characters.map((c) => ({
          name: c.name,
          role: c.role,
          line: `${c.appearance} Wardrobe: ${c.wardrobe}. ${c.personality}`.slice(0, 280),
        })),
        locations: bible.locations.map((l) => ({
          name: l.name,
          line: `${l.description} Mood: ${l.mood}. Lighting: ${l.lighting}. Time of day: ${l.timeOfDay}.`.slice(0, 280),
        })),
      };
    },
  }),

  remixWorkflow: defineAction({
    description:
      "Remixes a gallery film's workflow into a new editable project in the user's Workspace: storyboard and Bible are copied, stills are not — every scene starts unfilmed. The original is untouched.",
    request: z.object({ projectId: z.number().int().positive() }),
    response: z.object({ projectId: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const source = await loadGalleryProject(ctx, args.projectId, "remixWorkflow");
      const inserted = await db
        .insert(schema.projects)
        .values({
          title: `${source.title} (remix)`.slice(0, 120),
          prompt: source.prompt,
          style: source.style,
          styleId: source.styleId ?? null,
          scriptText: source.scriptText,
          isSample: 0,
          status: "in_progress",
          archived: 0,
          published: 0,
          hasCut: 0,
          updatedAt: new Date(),
        })
        .returning({ id: schema.projects.id });
      const copy = inserted[0];
      if (!copy) throw new Error("remixWorkflow: insert failed");
      const charIdMap = new Map<number, number>();
      const sourceChars = await db
        .select()
        .from(schema.characters)
        .where(eq(schema.characters.projectId, source.id))
        .orderBy(asc(schema.characters.id));
      for (const c of sourceChars) {
        const ins = await db
          .insert(schema.characters)
          .values({
            projectId: copy.id,
            name: c.name,
            role: c.role,
            appearance: c.appearance,
            wardrobe: c.wardrobe,
            personality: c.personality,
            backstory: c.backstory,
            imageBlobKey: null,
            status: "pending",
          })
          .returning({ id: schema.characters.id });
        if (ins[0]) charIdMap.set(c.id, ins[0].id);
      }
      const locIdMap = new Map<number, number>();
      const sourceLocs = await db
        .select()
        .from(schema.locations)
        .where(eq(schema.locations.projectId, source.id))
        .orderBy(asc(schema.locations.id));
      for (const l of sourceLocs) {
        const ins = await db
          .insert(schema.locations)
          .values({
            projectId: copy.id,
            name: l.name,
            description: l.description,
            mood: l.mood,
            lighting: l.lighting,
            timeOfDay: l.timeOfDay,
            imageBlobKey: null,
            status: "pending",
          })
          .returning({ id: schema.locations.id });
        if (ins[0]) locIdMap.set(l.id, ins[0].id);
      }
      const sourceScenes = await db
        .select()
        .from(schema.scenes)
        .where(eq(schema.scenes.projectId, source.id))
        .orderBy(asc(schema.scenes.position));
      for (const s of sourceScenes) {
        const ins = await db
          .insert(schema.scenes)
          .values({
            projectId: copy.id,
            position: s.position,
            title: s.title,
            description: s.description,
            visualPrompt: s.visualPrompt,
            imageBlobKey: null,
            status: "pending",
            locationId: s.locationId
              ? (locIdMap.get(s.locationId) ?? null)
              : null,
            stateNote: s.stateNote,
            lastPrompt: null,
            scriptHeading: s.scriptHeading,
          })
          .returning({ id: schema.scenes.id });
        const newScene = ins[0];
        if (!newScene) continue;
        const links = await db
          .select()
          .from(schema.sceneCharacters)
          .where(eq(schema.sceneCharacters.sceneId, s.id));
        for (const link of links) {
          const newCharId = charIdMap.get(link.characterId);
          if (newCharId) {
            await db.insert(schema.sceneCharacters).values({
              sceneId: newScene.id,
              characterId: newCharId,
            });
          }
        }
      }
      ctx.invalidateQueries();
      return { projectId: copy.id };
    },
  }),

  generateScene: defineAction({
    description:
      "Generates the cinematic AI still for one scene in the project's chosen style and marks the scene ready (or failed).",
    request: z.object({ sceneId: z.number().int().positive() }),
    response: z.object({ scene: sceneOut }),
    async handler(ctx, args) {
      const scene = await generateStillForScene(ctx, args.sceneId, true);
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
      const owner = await db
        .select({ projectId: schema.scenes.projectId })
        .from(schema.scenes)
        .where(eq(schema.scenes.id, args.sceneId))
        .limit(1);
      if (owner[0]) await touchProject(ctx, owner[0].projectId);
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
      await touchProject(ctx, args.projectId);
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
        .delete(schema.sceneCharacters)
        .where(eq(schema.sceneCharacters.sceneId, args.sceneId));
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
        .set({ title: args.title, updatedAt: new Date() })
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
      const sceneRows = await db
        .select({ id: schema.scenes.id })
        .from(schema.scenes)
        .where(eq(schema.scenes.projectId, args.projectId));
      for (const s of sceneRows) {
        await db
          .delete(schema.sceneCharacters)
          .where(eq(schema.sceneCharacters.sceneId, s.id));
      }
      await db
        .delete(schema.scenes)
        .where(eq(schema.scenes.projectId, args.projectId));
      // Canvas (Stage 4): nodes' bible tags first, then the board itself.
      const nodeRows = await db
        .select({ id: schema.canvasNodes.id })
        .from(schema.canvasNodes)
        .where(eq(schema.canvasNodes.projectId, args.projectId));
      for (const n of nodeRows) {
        await db
          .delete(schema.nodeCharacters)
          .where(eq(schema.nodeCharacters.nodeId, n.id));
      }
      await db
        .delete(schema.canvasLinks)
        .where(eq(schema.canvasLinks.projectId, args.projectId));
      await db
        .delete(schema.mediaItems)
        .where(eq(schema.mediaItems.projectId, args.projectId));
      await db
        .delete(schema.canvasNodes)
        .where(eq(schema.canvasNodes.projectId, args.projectId));
      await db
        .delete(schema.canvasSections)
        .where(eq(schema.canvasSections.projectId, args.projectId));
      await db
        .delete(schema.chatMessages)
        .where(eq(schema.chatMessages.projectId, args.projectId));
      // Editor (Stage 5): caption texts reference clips, so texts first.
      await db
        .delete(schema.timelineTexts)
        .where(eq(schema.timelineTexts.projectId, args.projectId));
      await db
        .delete(schema.timelineClips)
        .where(eq(schema.timelineClips.projectId, args.projectId));
      await db
        .delete(schema.timelineAudio)
        .where(eq(schema.timelineAudio.projectId, args.projectId));
      // Stage (Stage 6): items first, then the setups they belong to.
      await db
        .delete(schema.stageItems)
        .where(eq(schema.stageItems.projectId, args.projectId));
      await db
        .delete(schema.stageSetups)
        .where(eq(schema.stageSetups.projectId, args.projectId));
      await db
        .delete(schema.characters)
        .where(eq(schema.characters.projectId, args.projectId));
      await db
        .delete(schema.locations)
        .where(eq(schema.locations.projectId, args.projectId));
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

  /* ------------------------------ Bible ------------------------------ */

  addCharacter: defineAction({
    description:
      "Adds a character with a full profile (role, appearance, wardrobe, personality, backstory) to a project's bible.",
    request: z.object({
      projectId: z.number().int().positive(),
      name: z.string().min(1).max(80),
      role: z.string().min(1).max(80),
      appearance: z.string().min(1).max(600),
      wardrobe: z.string().min(1).max(400),
      personality: z.string().min(1).max(400),
      backstory: z.string().min(1).max(800),
    }),
    response: z.object({ character: characterOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const inserted = await db
        .insert(schema.characters)
        .values({
          projectId: args.projectId,
          name: args.name,
          role: args.role,
          appearance: args.appearance,
          wardrobe: args.wardrobe,
          personality: args.personality,
          backstory: args.backstory,
        })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("addCharacter: insert returned no rows");
      ctx.invalidateQueries();
      return { character: await characterToOut(ctx, row) };
    },
  }),

  updateCharacter: defineAction({
    description:
      "Edits a bible character's profile fields.",
    request: z.object({
      characterId: z.number().int().positive(),
      name: z.string().min(1).max(80),
      role: z.string().min(1).max(80),
      appearance: z.string().min(1).max(600),
      wardrobe: z.string().min(1).max(400),
      personality: z.string().min(1).max(400),
      backstory: z.string().min(1).max(800),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.characters)
        .set({
          name: args.name,
          role: args.role,
          appearance: args.appearance,
          wardrobe: args.wardrobe,
          personality: args.personality,
          backstory: args.backstory,
        })
        .where(eq(schema.characters.id, args.characterId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  deleteCharacter: defineAction({
    description:
      "Deletes a bible character and untags them from every scene.",
    request: z.object({ characterId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .delete(schema.sceneCharacters)
        .where(eq(schema.sceneCharacters.characterId, args.characterId));
      // Stage figures keep their label snapshot and become generic rather
      // than dangling (Stage 6).
      await db
        .update(schema.stageItems)
        .set({ characterId: null })
        .where(eq(schema.stageItems.characterId, args.characterId));
      await db
        .delete(schema.nodeCharacters)
        .where(eq(schema.nodeCharacters.characterId, args.characterId));
      await db
        .delete(schema.characters)
        .where(eq(schema.characters.id, args.characterId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  generateCharacterImage: defineAction({
    description:
      "Generates (or regenerates) a character's portrait sheet from their profile, in the project's cinematic style.",
    request: z.object({ characterId: z.number().int().positive() }),
    response: z.object({ character: characterOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.characters)
        .where(eq(schema.characters.id, args.characterId))
        .limit(1);
      const character = rows[0];
      if (!character) throw new Error("generateCharacterImage: not found");
      const projectRows = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, character.projectId))
        .limit(1);
      const project = projectRows[0];
      if (!project) throw new Error("generateCharacterImage: no project");
      const look = await resolveProjectLook(ctx, project);
      const prompt =
        `Character portrait sheet for one consistent character, 16:9 composition with a full-length view and a close portrait side by side. ` +
        `${character.name}, the ${character.role}. Appearance: ${character.appearance}. Wardrobe: ${character.wardrobe}. ` +
        `Bearing and expression show this personality: ${character.personality}. Plain neutral backdrop so the character reads clearly. ` +
        `Style: ${look}. No text, no words, no letters, no watermark.`;
      const _acct0 = await ensureAccount(ctx); const _model = modelById(project.imageModel); await assertAndChargePrecheck(ctx, _acct0, _model, _model.cost, `Character portrait — ${character.name}`, project.id); const _acct = await spendCredits(ctx, _acct0, _model.cost, `Character portrait — ${character.name}`, _model, project.id);
      try {
        const media = await ctx.tool.generate_media(prompt, {
          orientation: "landscape",
        });
        await db
          .update(schema.characters)
          .set({ imageBlobKey: media.blobKey, status: "ready" })
          .where(eq(schema.characters.id, character.id));
      } catch {
        await refundCredits(ctx, _acct, _model.cost, `Refund — character portrait failed (${_model.name})`, _model, project.id);
        await db
          .update(schema.characters)
          .set({ status: "failed" })
          .where(eq(schema.characters.id, character.id));
        throw new Error(`Generation failed with ${_model.name} — your ${_model.cost} credits were refunded automatically. Try again.`);
      }
      const updated = await db
        .select()
        .from(schema.characters)
        .where(eq(schema.characters.id, character.id))
        .limit(1);
      const row = updated[0];
      if (!row) throw new Error("generateCharacterImage: character vanished");
      ctx.invalidateQueries();
      return { character: await characterToOut(ctx, row) };
    },
  }),

  addLocation: defineAction({
    description:
      "Adds a location with a full profile (description, mood, lighting, time of day) to a project's bible.",
    request: z.object({
      projectId: z.number().int().positive(),
      name: z.string().min(1).max(80),
      description: z.string().min(1).max(600),
      mood: z.string().min(1).max(300),
      lighting: z.string().min(1).max(300),
      timeOfDay: z.string().min(1).max(80),
    }),
    response: z.object({ location: locationOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const inserted = await db
        .insert(schema.locations)
        .values({
          projectId: args.projectId,
          name: args.name,
          description: args.description,
          mood: args.mood,
          lighting: args.lighting,
          timeOfDay: args.timeOfDay,
        })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("addLocation: insert returned no rows");
      ctx.invalidateQueries();
      return { location: await locationToOut(ctx, row) };
    },
  }),

  updateLocation: defineAction({
    description: "Edits a bible location's profile fields.",
    request: z.object({
      locationId: z.number().int().positive(),
      name: z.string().min(1).max(80),
      description: z.string().min(1).max(600),
      mood: z.string().min(1).max(300),
      lighting: z.string().min(1).max(300),
      timeOfDay: z.string().min(1).max(80),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.locations)
        .set({
          name: args.name,
          description: args.description,
          mood: args.mood,
          lighting: args.lighting,
          timeOfDay: args.timeOfDay,
        })
        .where(eq(schema.locations.id, args.locationId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  deleteLocation: defineAction({
    description:
      "Deletes a bible location and untags it from every scene.",
    request: z.object({ locationId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.scenes)
        .set({ locationId: null })
        .where(eq(schema.scenes.locationId, args.locationId));
      await db
        .delete(schema.locations)
        .where(eq(schema.locations.id, args.locationId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  generateLocationImage: defineAction({
    description:
      "Generates (or regenerates) a location's establishing view from its profile, in the project's cinematic style.",
    request: z.object({ locationId: z.number().int().positive() }),
    response: z.object({ location: locationOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.locations)
        .where(eq(schema.locations.id, args.locationId))
        .limit(1);
      const location = rows[0];
      if (!location) throw new Error("generateLocationImage: not found");
      const projectRows = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, location.projectId))
        .limit(1);
      const project = projectRows[0];
      if (!project) throw new Error("generateLocationImage: no project");
      const look = await resolveProjectLook(ctx, project);
      const prompt =
        `Wide establishing shot of a film location, 16:9 composition, no people. ` +
        `${location.name}: ${location.description} Mood: ${location.mood}. Lighting: ${location.lighting}. Time of day: ${location.timeOfDay}. ` +
        `Style: ${look}. No text, no words, no letters, no watermark.`;
      const _acct0 = await ensureAccount(ctx); const _model = modelById(project.imageModel); await assertAndChargePrecheck(ctx, _acct0, _model, _model.cost, `Location view — ${location.name}`, project.id); const _acct = await spendCredits(ctx, _acct0, _model.cost, `Location view — ${location.name}`, _model, project.id);
      try {
        const media = await ctx.tool.generate_media(prompt, {
          orientation: "landscape",
        });
        await db
          .update(schema.locations)
          .set({ imageBlobKey: media.blobKey, status: "ready" })
          .where(eq(schema.locations.id, location.id));
      } catch {
        await refundCredits(ctx, _acct, _model.cost, `Refund — location view failed (${_model.name})`, _model, project.id);
        await db
          .update(schema.locations)
          .set({ status: "failed" })
          .where(eq(schema.locations.id, location.id));
        throw new Error(`Generation failed with ${_model.name} — your ${_model.cost} credits were refunded automatically. Try again.`);
      }
      const updated = await db
        .select()
        .from(schema.locations)
        .where(eq(schema.locations.id, location.id))
        .limit(1);
      const row = updated[0];
      if (!row) throw new Error("generateLocationImage: location vanished");
      ctx.invalidateQueries();
      return { location: await locationToOut(ctx, row) };
    },
  }),

  setSceneBible: defineAction({
    description:
      "Saves a scene's bible tags: one location (or none), any number of characters, and an optional in-scene state note.",
    request: z.object({
      sceneId: z.number().int().positive(),
      locationId: z.number().int().positive().nullable(),
      characterIds: z.array(z.number().int().positive()).max(20),
      stateNote: z.string().max(300),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      const note = args.stateNote.trim();
      await db
        .update(schema.scenes)
        .set({
          locationId: args.locationId,
          stateNote: note.length > 0 ? note : null,
        })
        .where(eq(schema.scenes.id, args.sceneId));
      await db
        .delete(schema.sceneCharacters)
        .where(eq(schema.sceneCharacters.sceneId, args.sceneId));
      for (const characterId of args.characterIds) {
        await db
          .insert(schema.sceneCharacters)
          .values({ sceneId: args.sceneId, characterId });
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  developBible: defineAction({
    description:
      "Reads the project's story and storyboard and proposes draft bible entries — characters and locations with filled-in profiles — plus suggested scene tags. Nothing is saved until the user accepts each draft.",
    request: z.object({ projectId: z.number().int().positive() }),
    response: z.object({
      characters: z.array(
        z.object({
          name: z.string(),
          role: z.string(),
          appearance: z.string(),
          wardrobe: z.string(),
          personality: z.string(),
          backstory: z.string(),
        }),
      ),
      locations: z.array(
        z.object({
          name: z.string(),
          description: z.string(),
          mood: z.string(),
          lighting: z.string(),
          timeOfDay: z.string(),
        }),
      ),
      sceneTags: z.array(
        z.object({
          sceneId: z.number(),
          locationName: z.string().nullable(),
          characterNames: z.array(z.string()),
        }),
      ),
    }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const projectRows = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, args.projectId))
        .limit(1);
      const project = projectRows[0];
      if (!project) throw new Error("developBible: project not found");
      const sceneRows = await db
        .select()
        .from(schema.scenes)
        .where(eq(schema.scenes.projectId, project.id))
        .orderBy(asc(schema.scenes.position));
      if (sceneRows.length === 0)
        throw new Error("developBible: no storyboard yet");
      const existingCharacters = await db
        .select()
        .from(schema.characters)
        .where(eq(schema.characters.projectId, project.id));
      const existingLocations = await db
        .select()
        .from(schema.locations)
        .where(eq(schema.locations.projectId, project.id));

      const draftSchema = z.object({
        characters: z
          .array(
            z.object({
              name: z.string(),
              role: z.string(),
              appearance: z.string(),
              wardrobe: z.string(),
              personality: z.string(),
              backstory: z.string(),
            }),
          )
          .max(8),
        locations: z
          .array(
            z.object({
              name: z.string(),
              description: z.string(),
              mood: z.string(),
              lighting: z.string(),
              timeOfDay: z.string(),
            }),
          )
          .max(8),
        sceneTags: z.array(
          z.object({
            sceneIndex: z.number().int().min(0),
            locationName: z.string().nullable(),
            characterNames: z.array(z.string()),
          }),
        ),
      });

      const sceneLines = sceneRows
        .map(
          (s, i) =>
            `Scene ${i + 1} (id ${s.id}) "${s.title}": ${s.description} Visual: ${s.visualPrompt}`,
        )
        .join("\n");
      const existingLines = [
        existingCharacters.length > 0
          ? `Characters already in the bible (do not propose these again): ${existingCharacters.map((c) => c.name).join(", ")}`
          : "The bible has no characters yet.",
        existingLocations.length > 0
          ? `Locations already in the bible (do not propose these again): ${existingLocations.map((l) => l.name).join(", ")}`
          : "The bible has no locations yet.",
      ].join("\n");

      const draft = await ctx.inference.complete(
        [
          `You are a film's character and production designer. Develop the world bible for a short ${project.style} film.`,
          `Film title: "${project.title}"`,
          `Story: "${project.prompt}"`,
          `Storyboard:\n${sceneLines}`,
          existingLines,
          `Propose the characters who actually appear or matter in this story, each with: name, role (lead, supporting, antagonist…), a concrete visual appearance (age, build, face, hair — specific enough to draw the same person twice), a signature wardrobe, personality in one or two vivid lines, and a short backstory that explains what they want and what haunts them.`,
          `Propose the distinct locations the story plays in, each with: name, a concrete visual description (architecture, materials, key props — specific enough to draw the same place twice), mood, lighting, and time of day.`,
          `Then tag every scene by its 0-based sceneIndex: which proposed-or-existing location name it plays in (or null) and which proposed-or-existing character names appear in it. Use the exact names from your proposals and the existing bible.`,
          `Stay true to the story and the ${project.style} style. Invent only the concrete visual detail the story leaves open.`,
        ].join("\n"),
        { schema: draftSchema, timeout_secs: 120 },
      );

      // Hard dedupe by name: a draft that matches an existing bible entry
      // (case-insensitive) is dropped even if the model re-proposed it, so
      // developing twice — or developing after a characters-first session —
      // never duplicates the cast or the locations.
      const existingCharNames = new Set(
        existingCharacters.map((c) => c.name.trim().toLowerCase()),
      );
      const existingLocNames = new Set(
        existingLocations.map((l) => l.name.trim().toLowerCase()),
      );
      draft.characters = draft.characters.filter(
        (c) => !existingCharNames.has(c.name.trim().toLowerCase()),
      );
      draft.locations = draft.locations.filter(
        (l) => !existingLocNames.has(l.name.trim().toLowerCase()),
      );

      const clamp = (s: string, max: number) =>
        s.length > max ? s.slice(0, max) : s;
      const sceneTags: {
        sceneId: number;
        locationName: string | null;
        characterNames: string[];
      }[] = [];
      for (const t of draft.sceneTags) {
        const scene = sceneRows[t.sceneIndex];
        if (!scene) continue;
        sceneTags.push({
          sceneId: scene.id,
          locationName: t.locationName,
          characterNames: t.characterNames,
        });
      }
      return {
        characters: draft.characters.map((c) => ({
          name: clamp(c.name, 80),
          role: clamp(c.role, 80),
          appearance: clamp(c.appearance, 600),
          wardrobe: clamp(c.wardrobe, 400),
          personality: clamp(c.personality, 400),
          backstory: clamp(c.backstory, 800),
        })),
        locations: draft.locations.map((l) => ({
          name: clamp(l.name, 80),
          description: clamp(l.description, 600),
          mood: clamp(l.mood, 300),
          lighting: clamp(l.lighting, 300),
          timeOfDay: clamp(l.timeOfDay, 80),
        })),
        sceneTags,
      };
    },
  }),

  /* --------------------------- Story (Stage 3) --------------------------- */

  saveScript: defineAction({
    description:
      "Saves a project's script document (the Story view editor autosaves here; import and accepted AI revisions land here too).",
    request: z.object({
      projectId: z.number().int().positive(),
      text: z.string().max(60000),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, args.projectId))
        .limit(1);
      const project = rows[0];
      if (!project) throw new Error("saveScript: project not found");
      if (project.isSample === 1)
        throw new Error("saveScript: sample films are read-only");
      await db
        .update(schema.projects)
        .set({
          scriptText: args.text.trim().length > 0 ? args.text : null,
          updatedAt: new Date(),
        })
        .where(eq(schema.projects.id, args.projectId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  writeScriptFromIdea: defineAction({
    description:
      "Writes a short screenplay-formatted script from the project's story prompt and style, honoring the existing bible, and returns it for the user to review in the Story view (it is saved when they keep it).",
    request: z.object({ projectId: z.number().int().positive() }),
    response: z.object({ script: z.string() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, args.projectId))
        .limit(1);
      const project = rows[0];
      if (!project) throw new Error("writeScriptFromIdea: project not found");
      if (project.isSample === 1)
        throw new Error("writeScriptFromIdea: sample films are read-only");
      if (!project.prompt.trim())
        throw new Error("writeScriptFromIdea: the project has no story idea");
      const bible = await loadBible(ctx, project.id);
      const bibleContext = bibleContextString(
        bible.characters,
        bible.locations,
      );
      const lines = [
        `You are a screenwriter. Write a short screenplay for a ${project.style} short film from this story idea: "${project.prompt}"`,
        `Write it as plain fountain-style screenplay text: each scene starts with a scene heading on its own line (INT. or EXT., the place, and the time, e.g. "INT. LIGHTHOUSE LAMP ROOM - NIGHT"), followed by short present-tense action lines describing what the camera sees. Put a speaker's name in ALL CAPS on its own line before any line of dialogue, and keep dialogue light — this is a visual short film.`,
        `Write 4 to 6 scenes with a clear arc (opening, development, climax, resolution). Keep it tight: roughly 400–700 words of script in total. Plain text only — no markdown, no title page, no scene numbers.`,
      ];
      if (bibleContext) lines.push(bibleContext);
      const result = await ctx.inference.complete(lines.join("\n"), {
        schema: z.object({ script: z.string() }),
        timeout_secs: 120,
      });
      const script = result.script.trim().slice(0, 60000);
      if (!script) throw new Error("writeScriptFromIdea: empty script");
      return { script };
    },
  }),

  editScriptWithAi: defineAction({
    description:
      "Revises the project's script following the user's instruction and returns the full revised draft. Nothing is saved until the user accepts the revision in the Story view.",
    request: z.object({
      projectId: z.number().int().positive(),
      instruction: z.string().min(3).max(300),
    }),
    response: z.object({ script: z.string() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, args.projectId))
        .limit(1);
      const project = rows[0];
      if (!project) throw new Error("editScriptWithAi: project not found");
      if (project.isSample === 1)
        throw new Error("editScriptWithAi: sample films are read-only");
      const current = project.scriptText?.trim();
      if (!current) throw new Error("editScriptWithAi: no script yet");
      const result = await ctx.inference.complete(
        [
          `You are a screenwriter revising a short ${project.style} screenplay.`,
          `Revision requested: "${args.instruction}"`,
          `Apply the revision and return the COMPLETE revised screenplay as plain fountain-style text, keeping the same format: scene headings (INT./EXT. …) on their own lines, action lines, speaker names in ALL CAPS before dialogue. Change only what the revision calls for; keep everything else as close to the original wording as you can. Plain text only — no markdown, no commentary.`,
          `Current screenplay:\n${current}`,
        ].join("\n"),
        { schema: z.object({ script: z.string() }), timeout_secs: 120 },
      );
      const script = result.script.trim().slice(0, 60000);
      if (!script) throw new Error("editScriptWithAi: empty revision");
      return { script };
    },
  }),

  planShotsFromScript: defineAction({
    description:
      "Plans the storyboard from the project's script: one storyboard scene per script scene heading (carrying the heading and its action lines, auto-tagged to bible entries the text names), or — when the script has no headings — scenes written from the script's story. Append adds to the storyboard; replace clears it first (the client confirms before replacing).",
    request: z.object({
      projectId: z.number().int().positive(),
      mode: z.enum(["append", "replace"]),
    }),
    response: z.object({
      created: z.number(),
      fromHeadings: z.boolean(),
      scriptScenes: z.number(),
    }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, args.projectId))
        .limit(1);
      const project = rows[0];
      if (!project) throw new Error("planShotsFromScript: project not found");
      if (project.isSample === 1)
        throw new Error("planShotsFromScript: sample films are read-only");
      const script = project.scriptText?.trim();
      if (!script) throw new Error("planShotsFromScript: no script yet");

      if (args.mode === "replace") {
        const old = await db
          .select({ id: schema.scenes.id })
          .from(schema.scenes)
          .where(eq(schema.scenes.projectId, project.id));
        for (const s of old) {
          await db
            .delete(schema.sceneCharacters)
            .where(eq(schema.sceneCharacters.sceneId, s.id));
        }
        await db
          .delete(schema.scenes)
          .where(eq(schema.scenes.projectId, project.id));
      }
      const lastRow = await db
        .select()
        .from(schema.scenes)
        .where(eq(schema.scenes.projectId, project.id))
        .orderBy(desc(schema.scenes.position))
        .limit(1);
      let position = (lastRow[0]?.position ?? -1) + 1;

      const blocks = parseScriptScenes(script).slice(0, 40);
      if (blocks.length > 0) {
        // Deterministic path: the script's own structure is the plan.
        // Bible entries named in a script scene are tagged onto it, so a
        // characters-first project keeps its cast through planning.
        const bible = await loadBible(ctx, project.id);
        let created = 0;
        for (const block of blocks) {
          const action = scriptActionLines(block.body);
          const actionText = action.join(" ");
          const description = (
            actionText || `The scene at ${headingToTitle(block.heading)}.`
          ).slice(0, 400);
          const visualPrompt = (
            `Film still for the scene "${block.heading}". ` +
            (actionText
              ? actionText
              : `Establishing view of ${headingToTitle(block.heading)}.`)
          ).slice(0, 1200);
          const haystack =
            `${block.heading} ${block.body.join(" ")}`.toLowerCase();
          const location =
            bible.locations.find((l) =>
              haystack.includes(l.name.trim().toLowerCase()),
            ) ?? null;
          const cast = bible.characters.filter((c) =>
            haystack.includes(c.name.trim().toLowerCase()),
          );
          const inserted = await db
            .insert(schema.scenes)
            .values({
              projectId: project.id,
              position,
              title: headingToTitle(block.heading),
              description,
              visualPrompt,
              locationId: location?.id ?? null,
              scriptHeading: block.heading,
            })
            .returning({ id: schema.scenes.id });
          position += 1;
          created += 1;
          const newScene = inserted[0];
          if (newScene) {
            for (const c of cast) {
              await db.insert(schema.sceneCharacters).values({
                sceneId: newScene.id,
                characterId: c.id,
              });
            }
          }
        }
        await touchProject(ctx, project.id);
        ctx.invalidateQueries();
        return { created, fromHeadings: true, scriptScenes: blocks.length };
      }

      // Fallback: no scene headings — write the storyboard from the
      // script's story, the same writer the prompt flow uses. The bible
      // stays binding context and is never modified.
      const bible = await loadBible(ctx, project.id);
      const board = await writeStoryboard(
        ctx,
        script.slice(0, 6000),
        project.style,
        undefined,
        false,
        bibleContextString(bible.characters, bible.locations),
      );
      for (const s of board.scenes) {
        await db.insert(schema.scenes).values({
          projectId: project.id,
          position,
          title: s.title,
          description: s.description,
          visualPrompt: s.visualPrompt,
        });
        position += 1;
      }
      await touchProject(ctx, project.id);
      ctx.invalidateQueries();
      return {
        created: board.scenes.length,
        fromHeadings: false,
        scriptScenes: 0,
      };
    },
  }),

  /* ---------------------------- Canvas (Stage 4) ---------------------------- */

  getCanvas: defineAction({
    description:
      "Returns a project's whole canvas: sections, nodes (with bible tags), media items, links, the AI chat history, and the chat approval mode. A project with no sections yet gets the four starter sections (Characters, Scenes, Shots, Clips).",
    request: z.object({ projectId: z.number().int().positive() }),
    response: z.object({
      sections: z.array(canvasSectionOut),
      nodes: z.array(canvasNodeOut),
      media: z.array(mediaItemOut),
      links: z.array(canvasLinkOut),
      chat: z.array(chatMessageOut),
      approvalMode: z.enum(["ask", "auto"]),
    }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const project = await loadProjectRow(ctx, args.projectId);
      if (!project) throw new Error("getCanvas: project not found");
      if (project.isSample !== 1) {
        await ensureCanvasSections(ctx, project.id);
      }
      const sectionRows = await db
        .select()
        .from(schema.canvasSections)
        .where(eq(schema.canvasSections.projectId, project.id))
        .orderBy(asc(schema.canvasSections.position));
      const nodeRows = await db
        .select()
        .from(schema.canvasNodes)
        .where(eq(schema.canvasNodes.projectId, project.id))
        .orderBy(asc(schema.canvasNodes.id));
      const mediaRows = await db
        .select()
        .from(schema.mediaItems)
        .where(eq(schema.mediaItems.projectId, project.id))
        .orderBy(asc(schema.mediaItems.id));
      const linkRows = await db
        .select()
        .from(schema.canvasLinks)
        .where(eq(schema.canvasLinks.projectId, project.id))
        .orderBy(asc(schema.canvasLinks.id));
      const chatRows = await db
        .select()
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.projectId, project.id))
        .orderBy(asc(schema.chatMessages.id));
      const nodes: z.infer<typeof canvasNodeOut>[] = [];
      for (const row of nodeRows) nodes.push(await nodeToOut(ctx, row));
      const media: z.infer<typeof mediaItemOut>[] = [];
      for (const row of mediaRows) media.push(await mediaToOut(ctx, row));
      return {
        sections: sectionRows.map(sectionToOut),
        nodes,
        media,
        links: linkRows.map((l) => ({
          id: l.id,
          fromKind: l.fromKind,
          fromId: l.fromId,
          toNodeId: l.toNodeId,
          kind: l.kind,
        })),
        chat: chatRows.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text,
          proposal: m.proposalJson ?? null,
          proposalStatus: m.proposalStatus ?? null,
        })),
        approvalMode: project.canvasApprovalMode,
      };
    },
  }),

  addCanvasSection: defineAction({
    description: "Adds a labeled section (group) to a project's canvas.",
    request: z.object({
      projectId: z.number().int().positive(),
      name: z.string().min(1).max(60),
    }),
    response: z.object({ section: canvasSectionOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const project = await loadProjectRow(ctx, args.projectId);
      if (!project) throw new Error("addCanvasSection: project not found");
      assertWritable(project, "addCanvasSection");
      const existing = await db
        .select()
        .from(schema.canvasSections)
        .where(eq(schema.canvasSections.projectId, project.id))
        .orderBy(desc(schema.canvasSections.position))
        .limit(1);
      const inserted = await db
        .insert(schema.canvasSections)
        .values({
          projectId: project.id,
          name: args.name.trim(),
          position: (existing[0]?.position ?? -1) + 1,
        })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("addCanvasSection: insert failed");
      ctx.invalidateQueries();
      return { section: sectionToOut(row) };
    },
  }),

  updateCanvasSection: defineAction({
    description:
      "Renames a canvas section or collapses/expands it on the board.",
    request: z.object({
      sectionId: z.number().int().positive(),
      name: z.string().min(1).max(60).optional(),
      collapsed: z.boolean().optional(),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      const patch: { name?: string; collapsed?: number } = {};
      if (args.name !== undefined) patch.name = args.name.trim();
      if (args.collapsed !== undefined)
        patch.collapsed = args.collapsed ? 1 : 0;
      if (Object.keys(patch).length > 0) {
        await db
          .update(schema.canvasSections)
          .set(patch)
          .where(eq(schema.canvasSections.id, args.sectionId));
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  deleteCanvasSection: defineAction({
    description:
      "Deletes a canvas section. Its nodes stay on the board, unsectioned.",
    request: z.object({ sectionId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.canvasNodes)
        .set({ sectionId: null })
        .where(eq(schema.canvasNodes.sectionId, args.sectionId));
      await db
        .delete(schema.canvasSections)
        .where(eq(schema.canvasSections.id, args.sectionId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  addCanvasNode: defineAction({
    description:
      "Adds a node to a project's canvas: an upload placeholder, a text note, a generate-image node, or a frame-to-clip node, placed in the given section (or unsectioned).",
    request: z.object({
      projectId: z.number().int().positive(),
      type: z.enum(["upload", "note", "image", "clip"]),
      sectionId: z.number().int().positive().nullable().default(null),
      title: z.string().min(1).max(80).optional(),
    }),
    response: z.object({ node: canvasNodeOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const project = await loadProjectRow(ctx, args.projectId);
      if (!project) throw new Error("addCanvasNode: project not found");
      assertWritable(project, "addCanvasNode");
      await ensureCanvasSections(ctx, project.id);
      const defaults: Record<string, string> = {
        upload: "Upload",
        note: "Text note",
        image: "Generate image",
        clip: "Frame to clip",
      };
      const pos = await nextNodePosition(ctx, project.id);
      const inserted = await db
        .insert(schema.canvasNodes)
        .values({
          projectId: project.id,
          sectionId: args.sectionId,
          type: args.type,
          title: args.title?.trim() || defaults[args.type] || "Node",
          x: pos.x,
          y: pos.y,
        })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("addCanvasNode: insert failed");
      await touchProject(ctx, project.id);
      ctx.invalidateQueries();
      return { node: await nodeToOut(ctx, row) };
    },
  }),

  updateCanvasNode: defineAction({
    description:
      "Patches a canvas node: title, note text, image prompt, quantity (1–4), board position, or the section it belongs to.",
    request: z.object({
      nodeId: z.number().int().positive(),
      title: z.string().min(1).max(80).optional(),
      text: z.string().max(2000).optional(),
      prompt: z.string().max(1200).optional(),
      quantity: z.number().int().min(1).max(4).optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      sectionId: z.number().int().positive().nullable().optional(),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      const patch: Partial<{
        title: string;
        text: string;
        prompt: string;
        quantity: number;
        x: number;
        y: number;
        sectionId: number | null;
      }> = {};
      if (args.title !== undefined) patch.title = args.title.trim();
      if (args.text !== undefined) patch.text = args.text;
      if (args.prompt !== undefined) patch.prompt = args.prompt;
      if (args.quantity !== undefined) patch.quantity = args.quantity;
      if (args.x !== undefined) patch.x = args.x;
      if (args.y !== undefined) patch.y = args.y;
      if (args.sectionId !== undefined) patch.sectionId = args.sectionId;
      if (Object.keys(patch).length > 0) {
        await db
          .update(schema.canvasNodes)
          .set(patch)
          .where(eq(schema.canvasNodes.id, args.nodeId));
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  deleteCanvasNode: defineAction({
    description:
      "Deletes a canvas node and its wiring. Media the node produced stays in the project as unattached media.",
    request: z.object({ nodeId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .delete(schema.nodeCharacters)
        .where(eq(schema.nodeCharacters.nodeId, args.nodeId));
      await db
        .delete(schema.canvasLinks)
        .where(eq(schema.canvasLinks.toNodeId, args.nodeId));
      await db
        .delete(schema.canvasLinks)
        .where(
          and(
            eq(schema.canvasLinks.fromKind, "node"),
            eq(schema.canvasLinks.fromId, args.nodeId),
          ),
        );
      await db
        .update(schema.mediaItems)
        .set({ nodeId: null })
        .where(eq(schema.mediaItems.nodeId, args.nodeId));
      await db
        .delete(schema.canvasNodes)
        .where(eq(schema.canvasNodes.id, args.nodeId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  setNodeBible: defineAction({
    description:
      "Saves an image node's bible tags (one location, any characters) — the same tagging scenes use; tagged profiles fold into the node's generation prompt.",
    request: z.object({
      nodeId: z.number().int().positive(),
      locationId: z.number().int().positive().nullable(),
      characterIds: z.array(z.number().int().positive()).max(20),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.canvasNodes)
        .set({ locationId: args.locationId })
        .where(eq(schema.canvasNodes.id, args.nodeId));
      await db
        .delete(schema.nodeCharacters)
        .where(eq(schema.nodeCharacters.nodeId, args.nodeId));
      for (const characterId of args.characterIds) {
        await db
          .insert(schema.nodeCharacters)
          .values({ nodeId: args.nodeId, characterId });
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  connectCanvas: defineAction({
    description:
      "Wires the canvas: a text note into an image node as its prompt source, or a media item into a clip node as its start frame. Replaces any existing wire of the same kind into that node.",
    request: z.object({
      projectId: z.number().int().positive(),
      fromKind: z.enum(["node", "media"]),
      fromId: z.number().int().positive(),
      toNodeId: z.number().int().positive(),
    }),
    response: z.object({ link: canvasLinkOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const targetRows = await db
        .select()
        .from(schema.canvasNodes)
        .where(eq(schema.canvasNodes.id, args.toNodeId))
        .limit(1);
      const target = targetRows[0];
      if (!target) throw new Error("connectCanvas: target node not found");
      let kind: "prompt_source" | "start_frame";
      if (args.fromKind === "node") {
        const sourceRows = await db
          .select()
          .from(schema.canvasNodes)
          .where(eq(schema.canvasNodes.id, args.fromId))
          .limit(1);
        const source = sourceRows[0];
        if (!source || source.type !== "note")
          throw new Error("connectCanvas: the prompt source must be a text note");
        if (target.type !== "image")
          throw new Error("connectCanvas: a text note can only feed an image node");
        kind = "prompt_source";
      } else {
        const mediaRows = await db
          .select()
          .from(schema.mediaItems)
          .where(eq(schema.mediaItems.id, args.fromId))
          .limit(1);
        if (!mediaRows[0])
          throw new Error("connectCanvas: media item not found");
        if (target.type !== "clip")
          throw new Error("connectCanvas: a start frame can only feed a frame-to-clip node");
        kind = "start_frame";
      }
      await db
        .delete(schema.canvasLinks)
        .where(
          and(
            eq(schema.canvasLinks.toNodeId, args.toNodeId),
            eq(schema.canvasLinks.kind, kind),
          ),
        );
      const inserted = await db
        .insert(schema.canvasLinks)
        .values({
          projectId: args.projectId,
          fromKind: args.fromKind,
          fromId: args.fromId,
          toNodeId: args.toNodeId,
          kind,
        })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("connectCanvas: insert failed");
      ctx.invalidateQueries();
      return {
        link: {
          id: row.id,
          fromKind: row.fromKind,
          fromId: row.fromId,
          toNodeId: row.toNodeId,
          kind: row.kind,
        },
      };
    },
  }),

  disconnectCanvas: defineAction({
    description: "Removes one canvas wire.",
    request: z.object({ linkId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .delete(schema.canvasLinks)
        .where(eq(schema.canvasLinks.id, args.linkId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  runImageNode: defineAction({
    description:
      "Runs a generate-image node: the prompt comes from a wired text note when one is connected, otherwise the node's own prompt; bible tags fold in like they do for scenes. Creates 1–4 real stills as media items on the node.",
    request: z.object({ nodeId: z.number().int().positive() }),
    response: z.object({
      media: z.array(mediaItemOut),
      promptUsed: z.string(),
    }),
    async handler(ctx, args) {
      const media = await runImageNodeInternal(ctx, args.nodeId);
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.canvasNodes)
        .where(eq(schema.canvasNodes.id, args.nodeId))
        .limit(1);
      ctx.invalidateQueries();
      return { media, promptUsed: rows[0]?.lastPrompt ?? "" };
    },
  }),

  uploadCanvasImage: defineAction({
    description:
      "Uploads an image file (JPEG/PNG/WebP/GIF, sent as base64) into a project's canvas: stores the bytes, creates an upload node, and puts the image on it as a media item.",
    request: z.object({
      projectId: z.number().int().positive(),
      sectionId: z.number().int().positive().nullable().default(null),
      name: z.string().min(1).max(120),
      dataBase64: z.string().min(1).max(14000000),
      mimeType: z.string().min(1).max(60),
    }),
    response: z.object({ node: canvasNodeOut, media: mediaItemOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const project = await loadProjectRow(ctx, args.projectId);
      if (!project) throw new Error("uploadCanvasImage: project not found");
      assertWritable(project, "uploadCanvasImage");
      const allowed: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
      };
      const ext = allowed[args.mimeType];
      if (!ext)
        throw new Error("uploadCanvasImage: only JPEG, PNG, WebP, or GIF images");
      const bytes = new Uint8Array(
        Buffer.from(args.dataBase64, "base64"),
      );
      if (bytes.length === 0)
        throw new Error("uploadCanvasImage: empty file");
      const blobKey = `canvas/${project.id}/${Date.now()}-${Math.floor(
        Math.random() * 1e9,
      )}.${ext}`;
      await ctx.blobs.put(blobKey, bytes, { contentType: args.mimeType });
      await ensureCanvasSections(ctx, project.id);
      const pos = await nextNodePosition(ctx, project.id);
      const name = args.name.trim() || "Uploaded image";
      const nodeIns = await db
        .insert(schema.canvasNodes)
        .values({
          projectId: project.id,
          sectionId: args.sectionId,
          type: "upload",
          title: name.slice(0, 80),
          x: pos.x,
          y: pos.y,
        })
        .returning();
      const node = nodeIns[0];
      if (!node) throw new Error("uploadCanvasImage: node insert failed");
      const mediaIns = await db
        .insert(schema.mediaItems)
        .values({
          projectId: project.id,
          nodeId: node.id,
          kind: "upload",
          name,
          imageBlobKey: blobKey,
        })
        .returning();
      const item = mediaIns[0];
      if (!item) throw new Error("uploadCanvasImage: media insert failed");
      await touchProject(ctx, project.id);
      ctx.invalidateQueries();
      return {
        node: await nodeToOut(ctx, node),
        media: await mediaToOut(ctx, item),
      };
    },
  }),

  runClipNode: defineAction({
    description:
      "Runs a frame-to-clip node: takes its wired start-frame media item and produces a motion clip entry (the still presented with a cinematic pan/zoom, labeled as a motion clip) on the node.",
    request: z.object({
      nodeId: z.number().int().positive(),
      note: z.string().max(300).default(""),
    }),
    response: z.object({ media: mediaItemOut }),
    async handler(ctx, args) {
      const media = await runClipNodeInternal(ctx, args.nodeId, args.note);
      ctx.invalidateQueries();
      return { media };
    },
  }),

  makeClipFromMedia: defineAction({
    description:
      "One-step frame-to-clip from any media item: creates a frame-to-clip node in the Clips section, wires the item in as its start frame, and produces the motion clip.",
    request: z.object({
      mediaId: z.number().int().positive(),
      note: z.string().max(300).default(""),
    }),
    response: z.object({ node: canvasNodeOut, media: mediaItemOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const itemRows = await db
        .select()
        .from(schema.mediaItems)
        .where(eq(schema.mediaItems.id, args.mediaId))
        .limit(1);
      const item = itemRows[0];
      if (!item) throw new Error("makeClipFromMedia: media item not found");
      if (!item.imageBlobKey)
        throw new Error("makeClipFromMedia: that item has no image yet");
      const project = await loadProjectRow(ctx, item.projectId);
      if (!project) throw new Error("makeClipFromMedia: project not found");
      assertWritable(project, "makeClipFromMedia");
      await ensureCanvasSections(ctx, project.id);
      const sections = await db
        .select()
        .from(schema.canvasSections)
        .where(eq(schema.canvasSections.projectId, project.id))
        .orderBy(asc(schema.canvasSections.position));
      const clipsSection =
        sections.find((s) => s.name.toUpperCase() === "CLIPS") ??
        sections[sections.length - 1];
      const pos = await nextNodePosition(ctx, project.id);
      const nodeIns = await db
        .insert(schema.canvasNodes)
        .values({
          projectId: project.id,
          sectionId: clipsSection?.id ?? null,
          type: "clip",
          title: `Clip — ${item.name}`.slice(0, 80),
          x: pos.x,
          y: pos.y,
        })
        .returning();
      const node = nodeIns[0];
      if (!node) throw new Error("makeClipFromMedia: node insert failed");
      await db.insert(schema.canvasLinks).values({
        projectId: project.id,
        fromKind: "media",
        fromId: item.id,
        toNodeId: node.id,
        kind: "start_frame",
      });
      const media = await runClipNodeInternal(ctx, node.id, args.note);
      await touchProject(ctx, project.id);
      ctx.invalidateQueries();
      return { node: await nodeToOut(ctx, node), media };
    },
  }),

  updateMediaItem: defineAction({
    description:
      "Patches a media item: rename it, favorite/unfavorite, archive/unarchive, or add/remove it from the editor bin (the asset list the video editor will read).",
    request: z.object({
      mediaId: z.number().int().positive(),
      name: z.string().min(1).max(120).optional(),
      favorite: z.boolean().optional(),
      archived: z.boolean().optional(),
      inEditorBin: z.boolean().optional(),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      const patch: Partial<{
        name: string;
        favorite: number;
        archived: number;
        inEditorBin: number;
      }> = {};
      if (args.name !== undefined) patch.name = args.name.trim();
      if (args.favorite !== undefined) patch.favorite = args.favorite ? 1 : 0;
      if (args.archived !== undefined) patch.archived = args.archived ? 1 : 0;
      if (args.inEditorBin !== undefined)
        patch.inEditorBin = args.inEditorBin ? 1 : 0;
      if (Object.keys(patch).length > 0) {
        await db
          .update(schema.mediaItems)
          .set(patch)
          .where(eq(schema.mediaItems.id, args.mediaId));
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  duplicateMediaItem: defineAction({
    description:
      "Duplicates a media item (the copy shares the same stored image).",
    request: z.object({ mediaId: z.number().int().positive() }),
    response: z.object({ media: mediaItemOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.mediaItems)
        .where(eq(schema.mediaItems.id, args.mediaId))
        .limit(1);
      const item = rows[0];
      if (!item) throw new Error("duplicateMediaItem: not found");
      const inserted = await db
        .insert(schema.mediaItems)
        .values({
          projectId: item.projectId,
          nodeId: item.nodeId,
          kind: item.kind,
          name: `${item.name} (copy)`.slice(0, 120),
          imageBlobKey: item.imageBlobKey,
          prompt: item.prompt,
          favorite: item.favorite,
          inEditorBin: item.inEditorBin,
        })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("duplicateMediaItem: insert failed");
      ctx.invalidateQueries();
      return { media: await mediaToOut(ctx, row) };
    },
  }),

  deleteMediaItem: defineAction({
    description:
      "Deletes a media item and any start-frame wires that used it.",
    request: z.object({ mediaId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .delete(schema.canvasLinks)
        .where(
          and(
            eq(schema.canvasLinks.fromKind, "media"),
            eq(schema.canvasLinks.fromId, args.mediaId),
          ),
        );
      await db
        .delete(schema.mediaItems)
        .where(eq(schema.mediaItems.id, args.mediaId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  regenerateMediaItem: defineAction({
    description:
      "Regenerates a generated still in place, re-running the exact prompt that produced it.",
    request: z.object({ mediaId: z.number().int().positive() }),
    response: z.object({ media: mediaItemOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.mediaItems)
        .where(eq(schema.mediaItems.id, args.mediaId))
        .limit(1);
      const item = rows[0];
      if (!item) throw new Error("regenerateMediaItem: not found");
      if (item.kind !== "image" || !item.prompt)
        throw new Error(
          "regenerateMediaItem: only generated stills can be regenerated",
        );
      const _proj = await loadProjectRow(ctx, item.projectId); const _acct0 = await ensureAccount(ctx); const _model = modelById(_proj?.imageModel); await assertAndChargePrecheck(ctx, _acct0, _model, _model.cost, `Regenerate — ${item.name}`, item.projectId); const _acct = await spendCredits(ctx, _acct0, _model.cost, `Regenerate — ${item.name}`, _model, item.projectId);
      let media: Awaited<ReturnType<typeof ctx.tool.generate_media>>;
      try { media = await ctx.tool.generate_media(item.prompt, { orientation: "landscape" }); } catch { await refundCredits(ctx, _acct, _model.cost, `Refund — regeneration failed (${_model.name})`, _model, item.projectId); throw new Error(`Generation failed with ${_model.name} — your ${_model.cost} credits were refunded automatically. Try again.`); }
      await db
        .update(schema.mediaItems)
        .set({ imageBlobKey: media.blobKey })
        .where(eq(schema.mediaItems.id, item.id));
      const updated = await db
        .select()
        .from(schema.mediaItems)
        .where(eq(schema.mediaItems.id, item.id))
        .limit(1);
      const row = updated[0];
      if (!row) throw new Error("regenerateMediaItem: item vanished");
      ctx.invalidateQueries();
      return { media: await mediaToOut(ctx, row) };
    },
  }),

  sendMediaToScene: defineAction({
    description:
      "Sets a media item's image as a storyboard scene's still (the scene becomes filmed/ready).",
    request: z.object({
      mediaId: z.number().int().positive(),
      sceneId: z.number().int().positive(),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.mediaItems)
        .where(eq(schema.mediaItems.id, args.mediaId))
        .limit(1);
      const item = rows[0];
      if (!item || !item.imageBlobKey)
        throw new Error("sendMediaToScene: that item has no image yet");
      await db
        .update(schema.scenes)
        .set({
          imageBlobKey: item.imageBlobKey,
          status: "ready",
          lastPrompt: item.prompt ?? null,
        })
        .where(eq(schema.scenes.id, args.sceneId));
      await touchProject(ctx, item.projectId);
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  setCanvasApprovalMode: defineAction({
    description:
      "Sets the canvas AI chat approval mode: ask (image generations wait for approval) or auto (they run immediately).",
    request: z.object({
      projectId: z.number().int().positive(),
      mode: z.enum(["ask", "auto"]),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.projects)
        .set({ canvasApprovalMode: args.mode })
        .where(eq(schema.projects.id, args.projectId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  canvasChat: defineAction({
    description:
      "Sends a message to the project's canvas AI chat. The assistant can discuss the film and attach a structured proposal (a shot list, bible drafts, or image generations) that creates nothing until the user approves it — except in Auto approval mode, where proposed image generations run immediately.",
    request: z.object({
      projectId: z.number().int().positive(),
      text: z.string().min(1).max(2000),
    }),
    response: z.object({ message: chatMessageOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const project = await loadProjectRow(ctx, args.projectId);
      if (!project) throw new Error("canvasChat: project not found");
      assertWritable(project, "canvasChat");
      await db.insert(schema.chatMessages).values({
        projectId: project.id,
        role: "user",
        text: args.text.trim(),
      });
      const sceneRows = await db
        .select()
        .from(schema.scenes)
        .where(eq(schema.scenes.projectId, project.id))
        .orderBy(asc(schema.scenes.position));
      const bible = await loadBible(ctx, project.id);
      const nodeRows = await db
        .select()
        .from(schema.canvasNodes)
        .where(eq(schema.canvasNodes.projectId, project.id));
      const history = await db
        .select()
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.projectId, project.id))
        .orderBy(desc(schema.chatMessages.id))
        .limit(8);
      const historyLines = history
        .reverse()
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
        .join("\n");
      const _acctForRules = await ensureAccount(ctx);
      const result = await ctx.inference.complete(
        [
          `You are the AI assistant inside the canvas of a short-film studio, helping the user make a ${project.style} short film titled "${project.title}".`,
          _acctForRules.workflowRules.trim() ? `Standing instructions from the filmmaker (always follow these): ${_acctForRules.workflowRules.trim()}` : "",
          project.prompt
            ? `Story idea: "${project.prompt}"`
            : "The project has no story idea yet.",
          sceneRows.length > 0
            ? `Storyboard so far (${sceneRows.length} scenes): ${sceneRows.map((s) => s.title).join(" · ")}`
            : "The storyboard is empty.",
          bible.characters.length > 0
            ? `Bible characters: ${bible.characters.map((c) => c.name).join(", ")}`
            : "The bible has no characters yet.",
          bible.locations.length > 0
            ? `Bible locations: ${bible.locations.map((l) => l.name).join(", ")}`
            : "The bible has no locations yet.",
          `Canvas nodes so far: ${nodeRows.length}.`,
          `Recent conversation:\n${historyLines}`,
          `Reply helpfully and briefly in "reply". Additionally, when — and only when — the user's latest message clearly asks for one of these, attach a "proposal":`,
          `- kind "shotlist": the user wants scenes/a shot list added to the storyboard. Fill "shots" with 2–6 scenes (title, one-line description, detailed visual prompt with no text in the image).`,
          `- kind "bible": the user wants characters or locations developed. Fill "characters" and/or "locations" with full draft profiles (same fields a bible entry needs). These drafts go to the bible review panel; they are never saved directly.`,
          `- kind "images": the user wants images generated on the canvas. Fill "imagePrompts" with 1–3 detailed visual prompts (no text in the image).`,
          `For anything else (questions, discussion, feedback), set "proposal" to null. Always fill every array in a proposal (empty when unused). Keep the reply in plain words, no markdown.`,
        ].join("\n"),
        { schema: chatReplySchema, timeout_secs: 120 },
      );

      let proposal = result.proposal;
      let proposalStatus: "pending" | "applied" | null =
        proposal !== null ? "pending" : null;
      let replyText = result.reply.trim() || "Done.";
      if (
        proposal !== null &&
        proposal.kind === "images" &&
        project.canvasApprovalMode === "auto"
      ) {
        // Auto approval mode: the user has pre-approved image generations,
        // so run this proposal now instead of parking it.
        const fakeMessage = {
          id: 0,
          projectId: project.id,
          role: "assistant" as const,
          text: replyText,
          proposalJson: JSON.stringify(proposal),
          proposalStatus: "pending" as const,
          createdAt: new Date(),
        };
        await applyChatProposalInternal(ctx, fakeMessage);
        proposalStatus = "applied";
        replyText = `${replyText}\n\nApproval mode is Auto, so I generated those images right away — they're on the canvas.`;
      }
      if (proposal !== null) {
        // Drop empty kinds so the stored proposal stays readable.
        proposal = {
          kind: proposal.kind,
          shots: proposal.kind === "shotlist" ? proposal.shots : [],
          characters: proposal.kind === "bible" ? proposal.characters : [],
          locations: proposal.kind === "bible" ? proposal.locations : [],
          imagePrompts: proposal.kind === "images" ? proposal.imagePrompts : [],
        };
      }
      const inserted = await db
        .insert(schema.chatMessages)
        .values({
          projectId: project.id,
          role: "assistant",
          text: replyText,
          proposalJson: proposal !== null ? JSON.stringify(proposal) : null,
          proposalStatus,
        })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("canvasChat: insert failed");
      ctx.invalidateQueries();
      return {
        message: {
          id: row.id,
          role: row.role,
          text: row.text,
          proposal: row.proposalJson ?? null,
          proposalStatus: row.proposalStatus ?? null,
        },
      };
    },
  }),

  applyChatProposal: defineAction({
    description:
      "Approves a pending canvas chat proposal: a shot list becomes storyboard scenes, image prompts become generate-image nodes that run now, and bible drafts are handed to the Bible review panel (status in_review — nothing is saved to the bible by this action).",
    request: z.object({ messageId: z.number().int().positive() }),
    response: z.object({
      ok: z.literal(true),
      kind: z.enum(["shotlist", "bible", "images"]),
    }),
    handler: async (
      ctx,
      args,
    ): Promise<{ ok: true; kind: "shotlist" | "bible" | "images" }> => {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.chatMessages)
        .where(eq(schema.chatMessages.id, args.messageId))
        .limit(1);
      const message = rows[0];
      if (!message || !message.proposalJson)
        throw new Error("applyChatProposal: no proposal on that message");
      if (message.proposalStatus !== "pending")
        throw new Error("applyChatProposal: that proposal was already handled");
      const proposal = JSON.parse(message.proposalJson) as z.infer<
        typeof chatProposalSchema
      >;
      if (proposal.kind === "bible") {
        await db
          .update(schema.chatMessages)
          .set({ proposalStatus: "in_review" })
          .where(eq(schema.chatMessages.id, message.id));
        ctx.invalidateQueries();
        return { ok: true, kind: "bible" };
      }
      await applyChatProposalInternal(ctx, message);
      await db
        .update(schema.chatMessages)
        .set({ proposalStatus: "applied" })
        .where(eq(schema.chatMessages.id, message.id));
      ctx.invalidateQueries();
      return { ok: true, kind: proposal.kind };
    },
  }),

  dismissChatProposal: defineAction({
    description: "Dismisses a pending canvas chat proposal without applying it.",
    request: z.object({ messageId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.chatMessages)
        .set({ proposalStatus: "dismissed" })
        .where(
          and(
            eq(schema.chatMessages.id, args.messageId),
            eq(schema.chatMessages.proposalStatus, "pending"),
          ),
        );
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  /* ---------------------------- Editor (Stage 5) ---------------------------- */

  getEdit: defineAction({
    description:
      "Returns a project's whole edit: the timeline clips (sources resolved to titles and image URLs), the text track (titles, lower thirds, captions), the audio track, whether a cut has been exported, and the asset library (filmed storyboard scenes, editor-bin media, and motion clips).",
    request: z.object({ projectId: z.number().int().positive() }),
    response: z.object({
      clips: z.array(editorClipOut),
      texts: z.array(editorTextOut),
      audio: z.array(editorAudioOut),
      hasCut: z.boolean(),
      assets: z.object({
        scenes: z.array(
          z.object({
            id: z.number(),
            title: z.string(),
            description: z.string(),
            imageUrl: z.string().nullable(),
            ready: z.boolean(),
          }),
        ),
        binMedia: z.array(mediaItemOut),
        clips: z.array(mediaItemOut),
      }),
    }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const project = await loadProjectRow(ctx, args.projectId);
      if (!project) throw new Error("getEdit: project not found");
      const clipRows = await db
        .select()
        .from(schema.timelineClips)
        .where(eq(schema.timelineClips.projectId, project.id))
        .orderBy(
          asc(schema.timelineClips.position),
          asc(schema.timelineClips.id),
        );
      const clips: z.infer<typeof editorClipOut>[] = [];
      for (const row of clipRows)
        clips.push(await editorClipToOut(ctx, row));
      const textRows = await db
        .select()
        .from(schema.timelineTexts)
        .where(eq(schema.timelineTexts.projectId, project.id))
        .orderBy(asc(schema.timelineTexts.start), asc(schema.timelineTexts.id));
      const audioRows = await db
        .select()
        .from(schema.timelineAudio)
        .where(eq(schema.timelineAudio.projectId, project.id))
        .orderBy(asc(schema.timelineAudio.id));
      const audio: z.infer<typeof editorAudioOut>[] = [];
      for (const row of audioRows) {
        audio.push({
          id: row.id,
          name: row.name,
          audioUrl: await ctx.blobs.getUrl(row.blobKey),
          volume: row.volume,
          start: row.start,
        });
      }
      const sceneRows = await db
        .select()
        .from(schema.scenes)
        .where(eq(schema.scenes.projectId, project.id))
        .orderBy(asc(schema.scenes.position));
      const assetScenes: {
        id: number;
        title: string;
        description: string;
        imageUrl: string | null;
        ready: boolean;
      }[] = [];
      for (const s of sceneRows) {
        assetScenes.push({
          id: s.id,
          title: s.title,
          description: s.description,
          imageUrl: s.imageBlobKey
            ? await ctx.blobs.getUrl(s.imageBlobKey)
            : null,
          ready: s.status === "ready" && s.imageBlobKey !== null,
        });
      }
      const mediaRows = await db
        .select()
        .from(schema.mediaItems)
        .where(eq(schema.mediaItems.projectId, project.id))
        .orderBy(asc(schema.mediaItems.id));
      const live = mediaRows.filter((m) => m.archived === 0);
      const binMedia: z.infer<typeof mediaItemOut>[] = [];
      for (const m of live.filter((m) => m.inEditorBin === 1))
        binMedia.push(await mediaToOut(ctx, m));
      const binIds = new Set(binMedia.map((m) => m.id));
      const clipMedia: z.infer<typeof mediaItemOut>[] = [];
      for (const m of live.filter(
        (m) => m.kind === "clip" && !binIds.has(m.id),
      ))
        clipMedia.push(await mediaToOut(ctx, m));
      return {
        clips,
        texts: textRows.map((t) => ({
          id: t.id,
          clipId: t.clipId ?? null,
          text: t.text,
          kind: t.kind,
          motion: t.motion,
          start: t.start,
          duration: t.duration,
        })),
        audio,
        hasCut: project.hasCut === 1,
        assets: { scenes: assetScenes, binMedia, clips: clipMedia },
      };
    },
  }),

  addToTimeline: defineAction({
    description:
      "Appends a source to the end of a project's editor timeline: a filmed storyboard scene or a canvas media item (still, upload, or motion clip), at the default 5 seconds with no effect and a cut transition.",
    request: z.object({
      projectId: z.number().int().positive(),
      sourceKind: z.enum(["scene", "media"]),
      sourceId: z.number().int().positive(),
    }),
    response: z.object({ clip: editorClipOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const project = await loadProjectRow(ctx, args.projectId);
      if (!project) throw new Error("addToTimeline: project not found");
      assertWritable(project, "addToTimeline");
      if (args.sourceKind === "scene") {
        const rows = await db
          .select()
          .from(schema.scenes)
          .where(eq(schema.scenes.id, args.sourceId))
          .limit(1);
        const scene = rows[0];
        if (!scene || scene.projectId !== project.id)
          throw new Error("addToTimeline: scene not found in this project");
        if (!scene.imageBlobKey)
          throw new Error(
            "addToTimeline: film that scene first — the timeline needs its still",
          );
      } else {
        const rows = await db
          .select()
          .from(schema.mediaItems)
          .where(eq(schema.mediaItems.id, args.sourceId))
          .limit(1);
        const item = rows[0];
        if (!item || item.projectId !== project.id)
          throw new Error("addToTimeline: media item not found in this project");
        if (!item.imageBlobKey)
          throw new Error("addToTimeline: that item has no image yet");
      }
      const existing = await db
        .select()
        .from(schema.timelineClips)
        .where(eq(schema.timelineClips.projectId, project.id))
        .orderBy(desc(schema.timelineClips.position))
        .limit(1);
      const inserted = await db
        .insert(schema.timelineClips)
        .values({
          projectId: project.id,
          sourceKind: args.sourceKind,
          sourceId: args.sourceId,
          position: (existing[0]?.position ?? -1) + 1,
          duration: 5,
        })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("addToTimeline: insert failed");
      await touchProject(ctx, project.id);
      ctx.invalidateQueries();
      return { clip: await editorClipToOut(ctx, row) };
    },
  }),

  updateTimelineClip: defineAction({
    description:
      "Patches one timeline clip: its on-screen duration (seconds), its look preset (effect), or the transition that plays into it.",
    request: z.object({
      clipId: z.number().int().positive(),
      duration: z.number().min(1).max(120).optional(),
      effect: effectSchema.optional(),
      transition: transitionSchema.optional(),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.timelineClips)
        .where(eq(schema.timelineClips.id, args.clipId))
        .limit(1);
      const clip = rows[0];
      if (!clip) throw new Error("updateTimelineClip: clip not found");
      const project = await loadProjectRow(ctx, clip.projectId);
      if (project) assertWritable(project, "updateTimelineClip");
      const patch: Partial<{
        duration: number;
        effect: z.infer<typeof effectSchema>;
        transition: z.infer<typeof transitionSchema>;
      }> = {};
      if (args.duration !== undefined) patch.duration = args.duration;
      if (args.effect !== undefined) patch.effect = args.effect;
      if (args.transition !== undefined) patch.transition = args.transition;
      if (Object.keys(patch).length > 0) {
        await db
          .update(schema.timelineClips)
          .set(patch)
          .where(eq(schema.timelineClips.id, args.clipId));
        await touchProject(ctx, clip.projectId);
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  moveTimelineClip: defineAction({
    description:
      "Moves a timeline clip one step earlier or later in the cut.",
    request: z.object({
      clipId: z.number().int().positive(),
      direction: z.enum(["up", "down"]),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.timelineClips)
        .where(eq(schema.timelineClips.id, args.clipId))
        .limit(1);
      const clip = rows[0];
      if (!clip) return { ok: true };
      const siblings = await db
        .select()
        .from(schema.timelineClips)
        .where(eq(schema.timelineClips.projectId, clip.projectId))
        .orderBy(asc(schema.timelineClips.position));
      const idx = siblings.findIndex((c) => c.id === clip.id);
      const swapIdx = args.direction === "up" ? idx - 1 : idx + 1;
      const other = siblings[swapIdx];
      if (idx < 0 || !other) return { ok: true };
      await db
        .update(schema.timelineClips)
        .set({ position: other.position })
        .where(eq(schema.timelineClips.id, clip.id));
      await db
        .update(schema.timelineClips)
        .set({ position: clip.position })
        .where(eq(schema.timelineClips.id, other.id));
      await touchProject(ctx, clip.projectId);
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  removeTimelineClip: defineAction({
    description:
      "Removes a clip from the timeline. Captions generated for that clip are removed with it; title cards and lower thirds stay.",
    request: z.object({ clipId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.timelineClips)
        .where(eq(schema.timelineClips.id, args.clipId))
        .limit(1);
      const clip = rows[0];
      if (!clip) return { ok: true };
      await db
        .delete(schema.timelineTexts)
        .where(eq(schema.timelineTexts.clipId, args.clipId));
      await db
        .delete(schema.timelineClips)
        .where(eq(schema.timelineClips.id, args.clipId));
      await renumberTimelineClips(ctx, clip.projectId);
      await touchProject(ctx, clip.projectId);
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  addTimelineText: defineAction({
    description:
      "Adds a text item to the editor's text track: a title card, a lower third, or a caption, with a motion preset and a start/duration in seconds from the start of the cut.",
    request: z.object({
      projectId: z.number().int().positive(),
      text: z.string().min(1).max(300),
      kind: z.enum(["title", "lower_third", "caption"]).default("title"),
      motion: textMotionSchema.default("fade_rise"),
      start: z.number().min(0).max(3600).default(0),
      duration: z.number().min(0.5).max(600).default(4),
    }),
    response: z.object({ item: editorTextOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const project = await loadProjectRow(ctx, args.projectId);
      if (!project) throw new Error("addTimelineText: project not found");
      assertWritable(project, "addTimelineText");
      const inserted = await db
        .insert(schema.timelineTexts)
        .values({
          projectId: project.id,
          text: args.text.trim(),
          kind: args.kind,
          motion: args.motion,
          start: args.start,
          duration: args.duration,
        })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("addTimelineText: insert failed");
      await touchProject(ctx, project.id);
      ctx.invalidateQueries();
      return {
        item: {
          id: row.id,
          clipId: row.clipId ?? null,
          text: row.text,
          kind: row.kind,
          motion: row.motion,
          start: row.start,
          duration: row.duration,
        },
      };
    },
  }),

  updateTimelineText: defineAction({
    description:
      "Patches a text-track item: its words, motion preset, start time, or duration.",
    request: z.object({
      textId: z.number().int().positive(),
      text: z.string().min(1).max(300).optional(),
      motion: textMotionSchema.optional(),
      start: z.number().min(0).max(3600).optional(),
      duration: z.number().min(0.5).max(600).optional(),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      const patch: Partial<{
        text: string;
        motion: z.infer<typeof textMotionSchema>;
        start: number;
        duration: number;
      }> = {};
      if (args.text !== undefined) patch.text = args.text.trim();
      if (args.motion !== undefined) patch.motion = args.motion;
      if (args.start !== undefined) patch.start = args.start;
      if (args.duration !== undefined) patch.duration = args.duration;
      if (Object.keys(patch).length > 0) {
        await db
          .update(schema.timelineTexts)
          .set(patch)
          .where(eq(schema.timelineTexts.id, args.textId));
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  deleteTimelineText: defineAction({
    description: "Deletes one text-track item.",
    request: z.object({ textId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .delete(schema.timelineTexts)
        .where(eq(schema.timelineTexts.id, args.textId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  generateCaptions: defineAction({
    description:
      "Builds caption items for the timeline: one caption per clip that comes from a storyboard scene, carrying the scene's description, timed to that clip. Clips that already have a caption are skipped, so edited captions are never overwritten.",
    request: z.object({ projectId: z.number().int().positive() }),
    response: z.object({ created: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const project = await loadProjectRow(ctx, args.projectId);
      if (!project) throw new Error("generateCaptions: project not found");
      assertWritable(project, "generateCaptions");
      const clips = await db
        .select()
        .from(schema.timelineClips)
        .where(eq(schema.timelineClips.projectId, project.id))
        .orderBy(asc(schema.timelineClips.position));
      const existing = await db
        .select()
        .from(schema.timelineTexts)
        .where(
          and(
            eq(schema.timelineTexts.projectId, project.id),
            eq(schema.timelineTexts.kind, "caption"),
          ),
        );
      const captionedClipIds = new Set(
        existing.map((t) => t.clipId).filter((id) => id !== null),
      );
      let created = 0;
      let offset = 0;
      for (const clip of clips) {
        const start = offset;
        offset += clip.duration;
        if (clip.sourceKind !== "scene") continue;
        if (captionedClipIds.has(clip.id)) continue;
        const sceneRows = await db
          .select()
          .from(schema.scenes)
          .where(eq(schema.scenes.id, clip.sourceId))
          .limit(1);
        const scene = sceneRows[0];
        if (!scene) continue;
        const text = (scene.description.trim() || scene.title).slice(0, 300);
        if (!text) continue;
        await db.insert(schema.timelineTexts).values({
          projectId: project.id,
          clipId: clip.id,
          text,
          kind: "caption",
          motion: "none",
          start,
          duration: clip.duration,
        });
        created += 1;
      }
      if (created > 0) await touchProject(ctx, project.id);
      ctx.invalidateQueries();
      return { created };
    },
  }),

  autoEdit: defineAction({
    description:
      "Assembles a first cut: every filmed storyboard scene, in storyboard order, at 5 seconds each on the timeline. When the timeline already has clips it refuses unless replace is set (the client asks the user first); replacing removes the old clips and their captions, and keeps title cards, lower thirds, and audio.",
    request: z.object({
      projectId: z.number().int().positive(),
      replace: z.boolean().default(false),
    }),
    response: z.object({ clips: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const project = await loadProjectRow(ctx, args.projectId);
      if (!project) throw new Error("autoEdit: project not found");
      assertWritable(project, "autoEdit");
      const existing = await db
        .select()
        .from(schema.timelineClips)
        .where(eq(schema.timelineClips.projectId, project.id));
      if (existing.length > 0 && !args.replace)
        throw new Error(
          "autoEdit: the timeline already has clips — replacing needs the user's confirmation",
        );
      const filmed = await db
        .select()
        .from(schema.scenes)
        .where(eq(schema.scenes.projectId, project.id))
        .orderBy(asc(schema.scenes.position));
      const ready = filmed.filter(
        (s) => s.status === "ready" && s.imageBlobKey !== null,
      );
      if (ready.length === 0)
        throw new Error(
          "autoEdit: no scenes are filmed yet — generate some scene stills first",
        );
      if (existing.length > 0) {
        await db
          .delete(schema.timelineTexts)
          .where(
            and(
              eq(schema.timelineTexts.projectId, project.id),
              eq(schema.timelineTexts.kind, "caption"),
            ),
          );
        await db
          .delete(schema.timelineClips)
          .where(eq(schema.timelineClips.projectId, project.id));
      }
      for (const [i, scene] of ready.entries()) {
        await db.insert(schema.timelineClips).values({
          projectId: project.id,
          sourceKind: "scene",
          sourceId: scene.id,
          position: i,
          duration: 5,
        });
      }
      await touchProject(ctx, project.id);
      ctx.invalidateQueries();
      return { clips: ready.length };
    },
  }),

  exportCut: defineAction({
    description:
      "Exports the current timeline as the project's cut: Watch and FilmKit TV then play the cut (order, durations, effects, transitions, text, captions, audio) instead of the raw scene sequence.",
    request: z.object({ projectId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      const project = await loadProjectRow(ctx, args.projectId);
      if (!project) throw new Error("exportCut: project not found");
      assertWritable(project, "exportCut");
      const clips = await db
        .select({ id: schema.timelineClips.id })
        .from(schema.timelineClips)
        .where(eq(schema.timelineClips.projectId, project.id))
        .limit(1);
      if (clips.length === 0)
        throw new Error("exportCut: the timeline is empty — add clips first");
      await db
        .update(schema.projects)
        .set({ hasCut: 1, updatedAt: new Date() })
        .where(eq(schema.projects.id, project.id));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  clearCut: defineAction({
    description:
      "Withdraws the exported cut: Watch goes back to playing the raw scene sequence. The timeline itself is kept.",
    request: z.object({ projectId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.projects)
        .set({ hasCut: 0, updatedAt: new Date() })
        .where(eq(schema.projects.id, args.projectId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  uploadEditorAudio: defineAction({
    description:
      "Uploads an audio file (MP3/WAV/M4A/OGG/WebM/AAC, sent as base64) onto a project's editor audio track, so a soundtrack can play under the cut. The bytes are stored like other media; only the blob key is persisted.",
    request: z.object({
      projectId: z.number().int().positive(),
      name: z.string().min(1).max(120),
      dataBase64: z.string().min(1).max(21000000),
      mimeType: z.string().min(1).max(60),
    }),
    response: z.object({ audio: editorAudioOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const project = await loadProjectRow(ctx, args.projectId);
      if (!project) throw new Error("uploadEditorAudio: project not found");
      assertWritable(project, "uploadEditorAudio");
      const allowed: Record<string, string> = {
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/x-wav": "wav",
        "audio/mp4": "m4a",
        "audio/ogg": "ogg",
        "audio/webm": "webm",
        "audio/aac": "aac",
      };
      const ext = allowed[args.mimeType];
      if (!ext)
        throw new Error(
          "uploadEditorAudio: only MP3, WAV, M4A, OGG, WebM, or AAC audio",
        );
      const bytes = new Uint8Array(Buffer.from(args.dataBase64, "base64"));
      if (bytes.length === 0)
        throw new Error("uploadEditorAudio: empty file");
      const blobKey = `audio/${project.id}/${Date.now()}-${Math.floor(
        Math.random() * 1e9,
      )}.${ext}`;
      await ctx.blobs.put(blobKey, bytes, { contentType: args.mimeType });
      const inserted = await db
        .insert(schema.timelineAudio)
        .values({
          projectId: project.id,
          name: args.name.trim() || "Soundtrack",
          blobKey,
          mimeType: args.mimeType,
          volume: 0.8,
          start: 0,
        })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("uploadEditorAudio: insert failed");
      await touchProject(ctx, project.id);
      ctx.invalidateQueries();
      return {
        audio: {
          id: row.id,
          name: row.name,
          audioUrl: await ctx.blobs.getUrl(blobKey),
          volume: row.volume,
          start: row.start,
        },
      };
    },
  }),

  updateTimelineAudio: defineAction({
    description:
      "Patches an audio-track item: its playback volume (0–1) or its start offset in seconds.",
    request: z.object({
      audioId: z.number().int().positive(),
      volume: z.number().min(0).max(1).optional(),
      start: z.number().min(0).max(3600).optional(),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      const patch: Partial<{ volume: number; start: number }> = {};
      if (args.volume !== undefined) patch.volume = args.volume;
      if (args.start !== undefined) patch.start = args.start;
      if (Object.keys(patch).length > 0) {
        await db
          .update(schema.timelineAudio)
          .set(patch)
          .where(eq(schema.timelineAudio.id, args.audioId));
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  deleteTimelineAudio: defineAction({
    description: "Removes an audio file from the editor's audio track.",
    request: z.object({ audioId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .delete(schema.timelineAudio)
        .where(eq(schema.timelineAudio.id, args.audioId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  /* ------------------------------ Stage (Stage 6) ------------------------------ */

  getStage: defineAction({
    description:
      "Returns a project's 3D Stage: every blocking setup with its placed figures, cameras, and props (positions, rotations, camera settings).",
    request: z.object({ projectId: z.number().int().positive() }),
    response: z.object({ setups: z.array(stageSetupOut) }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const project = await loadProjectRow(ctx, args.projectId);
      if (!project) throw new Error("getStage: project not found");
      const setupRows = await db
        .select()
        .from(schema.stageSetups)
        .where(eq(schema.stageSetups.projectId, project.id))
        .orderBy(asc(schema.stageSetups.position));
      const setups: z.infer<typeof stageSetupOut>[] = [];
      for (const s of setupRows) {
        const itemRows = await db
          .select()
          .from(schema.stageItems)
          .where(eq(schema.stageItems.setupId, s.id))
          .orderBy(asc(schema.stageItems.id));
        const items: z.infer<typeof stageItemOut>[] = [];
        for (const row of itemRows) items.push(await stageItemToOut(ctx, row));
        setups.push({ id: s.id, name: s.name, position: s.position, items });
      }
      return { setups };
    },
  }),

  addStageSetup: defineAction({
    description:
      "Adds a blocking setup (one staged scene layout) to a project's 3D Stage.",
    request: z.object({
      projectId: z.number().int().positive(),
      name: z.string().min(1).max(80).optional(),
    }),
    response: z.object({ setup: stageSetupOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const project = await loadProjectRow(ctx, args.projectId);
      if (!project) throw new Error("addStageSetup: project not found");
      assertWritable(project, "addStageSetup");
      const existing = await db
        .select()
        .from(schema.stageSetups)
        .where(eq(schema.stageSetups.projectId, project.id))
        .orderBy(desc(schema.stageSetups.position))
        .limit(1);
      const position = (existing[0]?.position ?? -1) + 1;
      const inserted = await db
        .insert(schema.stageSetups)
        .values({
          projectId: project.id,
          name: args.name?.trim() || `Setup ${position + 1}`,
          position,
        })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("addStageSetup: insert failed");
      await touchProject(ctx, project.id);
      ctx.invalidateQueries();
      return { setup: { id: row.id, name: row.name, position: row.position, items: [] } };
    },
  }),

  renameStageSetup: defineAction({
    description: "Renames a stage setup.",
    request: z.object({
      setupId: z.number().int().positive(),
      name: z.string().min(1).max(80),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.stageSetups)
        .set({ name: args.name.trim() })
        .where(eq(schema.stageSetups.id, args.setupId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  deleteStageSetup: defineAction({
    description: "Deletes a stage setup and everything placed in it.",
    request: z.object({ setupId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .delete(schema.stageItems)
        .where(eq(schema.stageItems.setupId, args.setupId));
      await db
        .delete(schema.stageSetups)
        .where(eq(schema.stageSetups.id, args.setupId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  addStageCast: defineAction({
    description:
      "Adds one stage figure per Bible character of the project to a setup (the 'Add cast' button). Characters who already have a figure in the setup are skipped.",
    request: z.object({ setupId: z.number().int().positive() }),
    response: z.object({ added: z.number() }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const { setup, project } = await loadStageSetup(ctx, args.setupId);
      assertWritable(project, "addStageCast");
      const chars = await db
        .select()
        .from(schema.characters)
        .where(eq(schema.characters.projectId, project.id))
        .orderBy(asc(schema.characters.id));
      const existing = await db
        .select()
        .from(schema.stageItems)
        .where(eq(schema.stageItems.setupId, setup.id));
      const placed = new Set(
        existing
          .filter((i) => i.characterId !== null)
          .map((i) => i.characterId as number),
      );
      let added = 0;
      let slot = 0;
      for (const [idx, c] of chars.entries()) {
        if (placed.has(c.id)) continue;
        await db.insert(schema.stageItems).values({
          setupId: setup.id,
          projectId: project.id,
          kind: "figure",
          characterId: c.id,
          label: c.name,
          color: FIGURE_COLORS[idx % FIGURE_COLORS.length] ?? "#8a6d3b",
          x: 30 + slot * 14,
          y: 42,
          rotation: 180,
        });
        slot += 1;
        added += 1;
      }
      await touchProject(ctx, project.id);
      ctx.invalidateQueries();
      return { added };
    },
  }),

  addStageItem: defineAction({
    description:
      "Places one item on a stage setup: a generic figure, a camera (with default shot size and height), or a labeled prop block.",
    request: z.object({
      setupId: z.number().int().positive(),
      kind: z.enum(["figure", "camera", "prop"]),
      label: z.string().min(1).max(60).optional(),
    }),
    response: z.object({ item: stageItemOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const { setup, project } = await loadStageSetup(ctx, args.setupId);
      assertWritable(project, "addStageItem");
      const existing = await db
        .select()
        .from(schema.stageItems)
        .where(eq(schema.stageItems.setupId, setup.id));
      const countOf = (k: string) => existing.filter((i) => i.kind === k).length;
      const defaults = {
        figure: {
          label: args.label?.trim() || `Figure ${countOf("figure") + 1}`,
          color: "#6b7280",
          x: 50,
          y: 45,
          rotation: 180,
        },
        camera: {
          label: args.label?.trim() || `Camera ${countOf("camera") + 1}`,
          color: "#17171c",
          x: 50,
          y: 88,
          rotation: 0,
        },
        prop: {
          label: args.label?.trim() || "Prop",
          color: "#a08c5a",
          x: 50,
          y: 30,
          rotation: 0,
        },
      } as const;
      const d = defaults[args.kind];
      const inserted = await db
        .insert(schema.stageItems)
        .values({
          setupId: setup.id,
          projectId: project.id,
          kind: args.kind,
          label: d.label,
          color: d.color,
          x: d.x,
          y: d.y,
          rotation: d.rotation,
          ...(args.kind === "camera"
            ? { shotSize: "wide" as const, camHeight: "eye" as const }
            : {}),
        })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("addStageItem: insert failed");
      await touchProject(ctx, project.id);
      ctx.invalidateQueries();
      return { item: await stageItemToOut(ctx, row) };
    },
  }),

  updateStageItem: defineAction({
    description:
      "Patches a placed stage item: board position, facing rotation, label, color, and (for cameras) shot size, camera height, movement note, and the edited shot description (null clears the edit back to the auto-composed text).",
    request: z.object({
      itemId: z.number().int().positive(),
      x: z.number().min(0).max(100).optional(),
      y: z.number().min(0).max(100).optional(),
      rotation: z.number().min(0).max(360).optional(),
      label: z.string().min(1).max(60).optional(),
      color: z.string().min(4).max(9).optional(),
      shotSize: z.enum(["wide", "medium", "close"]).optional(),
      camHeight: z.enum(["low", "eye", "high", "overhead"]).optional(),
      movementNote: z.string().max(200).nullable().optional(),
      descriptionOverride: z.string().max(1200).nullable().optional(),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      const patch: Partial<{
        x: number;
        y: number;
        rotation: number;
        label: string;
        color: string;
        shotSize: "wide" | "medium" | "close";
        camHeight: "low" | "eye" | "high" | "overhead";
        movementNote: string | null;
        descriptionOverride: string | null;
      }> = {};
      if (args.x !== undefined) patch.x = args.x;
      if (args.y !== undefined) patch.y = args.y;
      if (args.rotation !== undefined) patch.rotation = args.rotation % 360;
      if (args.label !== undefined) patch.label = args.label.trim();
      if (args.color !== undefined) patch.color = args.color;
      if (args.shotSize !== undefined) patch.shotSize = args.shotSize;
      if (args.camHeight !== undefined) patch.camHeight = args.camHeight;
      if (args.movementNote !== undefined)
        patch.movementNote = args.movementNote?.trim() || null;
      if (args.descriptionOverride !== undefined)
        patch.descriptionOverride =
          args.descriptionOverride?.trim() || null;
      if (Object.keys(patch).length > 0) {
        await db
          .update(schema.stageItems)
          .set(patch)
          .where(eq(schema.stageItems.id, args.itemId));
      }
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  deleteStageItem: defineAction({
    description: "Removes one placed item (figure, camera, or prop) from a stage setup.",
    request: z.object({ itemId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const db = ctx.db<typeof schema>();
      await db
        .delete(schema.stageItems)
        .where(eq(schema.stageItems.id, args.itemId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  sendStageToCanvas: defineAction({
    description:
      "Sends a staged camera shot to the canvas: creates a Generate Image node in the SHOTS section whose prompt is the camera's shot description with the framed cast's Bible profiles folded in (the same folding scene generation uses), and tags the node with those characters so it is ready to run.",
    request: z.object({
      setupId: z.number().int().positive(),
      cameraId: z.number().int().positive(),
    }),
    response: z.object({ node: canvasNodeOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const { setup, project } = await loadStageSetup(ctx, args.setupId);
      assertWritable(project, "sendStageToCanvas");
      const items = await db
        .select()
        .from(schema.stageItems)
        .where(eq(schema.stageItems.setupId, setup.id));
      const camera = items.find(
        (i) => i.id === args.cameraId && i.kind === "camera",
      );
      if (!camera) throw new Error("sendStageToCanvas: camera not found");
      const labelOf = await stageLabelResolver(ctx, project.id);
      const description = effectiveShotDescription(camera, items, labelOf);
      const charIds = framedCharacterIds(camera, items);
      // Fold the framed cast's Bible profiles into the prompt text, in
      // the same shape generateStillForScene / runImageNodeInternal use.
      const bibleParts: string[] = [];
      for (const id of charIds) {
        const rows = await db
          .select()
          .from(schema.characters)
          .where(eq(schema.characters.id, id))
          .limit(1);
        const c = rows[0];
        if (c)
          bibleParts.push(
            `Character ${c.name} (${c.role}): ${c.appearance}. Wardrobe: ${c.wardrobe}. Bearing and expression show this personality: ${c.personality}.`,
          );
      }
      const prompt = (
        bibleParts.length > 0
          ? `${description} ${bibleParts.join(" ")}`
          : description
      ).slice(0, 1200);
      await ensureCanvasSections(ctx, project.id);
      const sections = await db
        .select()
        .from(schema.canvasSections)
        .where(eq(schema.canvasSections.projectId, project.id))
        .orderBy(asc(schema.canvasSections.position));
      const shotsSection =
        sections.find((s) => s.name.toUpperCase() === "SHOTS") ?? sections[0];
      const pos = await nextNodePosition(ctx, project.id);
      const inserted = await db
        .insert(schema.canvasNodes)
        .values({
          projectId: project.id,
          sectionId: shotsSection?.id ?? null,
          type: "image",
          title: `${setup.name} — ${camera.label}`.slice(0, 80),
          prompt,
          quantity: 1,
          x: pos.x,
          y: pos.y,
        })
        .returning();
      const node = inserted[0];
      if (!node) throw new Error("sendStageToCanvas: insert failed");
      for (const id of charIds) {
        await db.insert(schema.nodeCharacters).values({
          nodeId: node.id,
          characterId: id,
        });
      }
      await touchProject(ctx, project.id);
      ctx.invalidateQueries();
      return { node: await nodeToOut(ctx, node) };
    },
  }),

  sendStageToStoryboard: defineAction({
    description:
      "Sends a staged camera shot to the storyboard: appends a new scene whose description and visual prompt are the camera's shot description, tagged with the cast the camera frames.",
    request: z.object({
      setupId: z.number().int().positive(),
      cameraId: z.number().int().positive(),
    }),
    response: z.object({ scene: sceneOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const { setup, project } = await loadStageSetup(ctx, args.setupId);
      assertWritable(project, "sendStageToStoryboard");
      const items = await db
        .select()
        .from(schema.stageItems)
        .where(eq(schema.stageItems.setupId, setup.id));
      const camera = items.find(
        (i) => i.id === args.cameraId && i.kind === "camera",
      );
      if (!camera) throw new Error("sendStageToStoryboard: camera not found");
      const labelOf = await stageLabelResolver(ctx, project.id);
      const description = effectiveShotDescription(camera, items, labelOf);
      const charIds = framedCharacterIds(camera, items);
      const lastRow = await db
        .select()
        .from(schema.scenes)
        .where(eq(schema.scenes.projectId, project.id))
        .orderBy(desc(schema.scenes.position))
        .limit(1);
      const inserted = await db
        .insert(schema.scenes)
        .values({
          projectId: project.id,
          position: (lastRow[0]?.position ?? -1) + 1,
          title: `${setup.name} — ${camera.label}`.slice(0, 120),
          description: description.slice(0, 400),
          visualPrompt: description.slice(0, 1200),
        })
        .returning();
      const scene = inserted[0];
      if (!scene) throw new Error("sendStageToStoryboard: insert failed");
      for (const id of charIds) {
        await db.insert(schema.sceneCharacters).values({
          sceneId: scene.id,
          characterId: id,
        });
      }
      await touchProject(ctx, project.id);
      ctx.invalidateQueries();
      return { scene: await sceneToOut(ctx, scene) };
    },
  }),

  /* ----------------------- Styles library (Stage 7) ---------------------- */

  listStyles: defineAction({
    description:
      "Lists the whole styles library (built-in catalog plus the user's own styles) in browse order.",
    request: z.object({}),
    response: z.object({ styles: z.array(styleOut) }),
    async handler(ctx) {
      const db = ctx.db<typeof schema>();
      const rows = await db
        .select()
        .from(schema.styles)
        .orderBy(asc(schema.styles.position), asc(schema.styles.id));
      const styles: z.infer<typeof styleOut>[] = [];
      for (const row of rows) styles.push(await styleToOut(ctx, row));
      return { styles };
    },
  }),

  seedStyles: defineAction({
    description:
      "Seeds the built-in styles library: inserts any missing catalog rows (slug-keyed, so re-runs change nothing) and generates up to 12 missing style thumbnails per call in parallel batches. Safe to call repeatedly until it reports zero pending.",
    request: z.object({}),
    response: z.object({
      stylesCreated: z.number(),
      thumbnailsReady: z.number(),
      thumbnailsPending: z.number(),
    }),
    async handler(ctx) {
      const db = ctx.db<typeof schema>();

      // Phase 1: every catalog row exists (keyed by slug — idempotent).
      let stylesCreated = 0;
      const existing = await db.select().from(schema.styles);
      const haveSlugs = new Set(
        existing.map((r) => r.slug).filter((s): s is string => !!s),
      );
      for (const [i, def] of BUILTIN_STYLES.entries()) {
        if (haveSlugs.has(def.slug)) continue;
        await db.insert(schema.styles).values({
          slug: def.slug,
          name: def.name,
          category: def.category,
          description: def.description,
          modifier: def.modifier,
          isBuiltin: 1,
          position: i,
        });
        stylesCreated += 1;
      }

      // Phase 2: generate missing thumbnails, in parallel batches,
      // capped per call so one call always finishes well inside the
      // action time limit — the Library keeps calling until none are
      // pending (and a manual re-run finishes the job too).
      const rows = await db
        .select()
        .from(schema.styles)
        .where(eq(schema.styles.isBuiltin, 1))
        .orderBy(asc(schema.styles.position));
      const bySlug = new Map(
        BUILTIN_STYLES.map((d) => [d.slug, d] as const),
      );
      const missing = rows.filter((r) => !r.imageBlobKey);
      let thumbnailsReady = rows.length - missing.length;
      const todo = missing.slice(0, 12);
      const BATCH = 6;
      for (let i = 0; i < todo.length; i += BATCH) {
        const batch = todo.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map(async (row) => {
            const def = row.slug ? bySlug.get(row.slug) : undefined;
            const subject = def?.subject ?? row.description;
            try {
              const media = await ctx.tool.generate_media(
                `Showcase image for a visual style: ${subject}. Rendered fully in this style: ${row.modifier}. No text, no words, no letters, no watermark.`,
                { orientation: "landscape" },
              );
              await db
                .update(schema.styles)
                .set({ imageBlobKey: media.blobKey })
                .where(eq(schema.styles.id, row.id));
              return true;
            } catch {
              return false;
            }
          }),
        );
        thumbnailsReady += results.filter(Boolean).length;
      }
      const thumbnailsPending = rows.length - thumbnailsReady;
      ctx.invalidateQueries();
      return { stylesCreated, thumbnailsReady, thumbnailsPending };
    },
  }),

  draftStyleModifier: defineAction({
    description:
      "Drafts a generation prompt modifier for a user style from its name and description. Returns the draft only — nothing is saved until createStyle/updateStyle.",
    request: z.object({
      name: z.string().min(1).max(80),
      description: z.string().min(3).max(600),
    }),
    response: z.object({ modifier: z.string() }),
    async handler(ctx, args) {
      const out = await ctx.inference.complete(
        [
          `You write prompt modifiers for an AI image generator. A "prompt modifier" is one comma-separated line of visual descriptors that steers every image a film generates toward one consistent look (medium, palette, lighting, texture, mood, era).`,
          `Style name: "${args.name}". What the user wants: "${args.description}".`,
          `Write the modifier for this style: concrete visual language only, 15–40 words, no sentences, no mention of text or words in the image, no quotation marks.`,
        ].join("\n"),
        {
          schema: z.object({ modifier: z.string().min(10).max(600) }),
          timeout_secs: 60,
        },
      );
      return { modifier: out.modifier.trim() };
    },
  }),

  createStyle: defineAction({
    description:
      "Creates a user style (name, category, description, prompt modifier) and generates its thumbnail in that style. The thumbnail can be retried with generateStyleThumbnail if it fails.",
    request: z.object({
      name: z.string().min(1).max(80),
      category: styleCategorySchema,
      description: z.string().min(1).max(600),
      modifier: z.string().min(3).max(800),
    }),
    response: z.object({ style: styleOut }),
    async handler(ctx, args) {
      const db = ctx.db<typeof schema>();
      const maxRows = await db
        .select({ position: schema.styles.position })
        .from(schema.styles)
        .orderBy(desc(schema.styles.position))
        .limit(1);
      const inserted = await db
        .insert(schema.styles)
        .values({
          name: args.name.trim(),
          category: args.category,
          description: args.description.trim(),
          modifier: args.modifier.trim(),
          isBuiltin: 0,
          position: (maxRows[0]?.position ?? -1) + 1,
        })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("createStyle: insert returned no rows");
      // First save generates the thumbnail; a failure leaves it null and
      // the Library offers a retry rather than failing the whole create.
      try {
        const media = await ctx.tool.generate_media(
          `Showcase image for a visual style: ${row.description} Rendered fully in this style: ${row.modifier}. No text, no words, no letters, no watermark.`,
          { orientation: "landscape" },
        );
        await db
          .update(schema.styles)
          .set({ imageBlobKey: media.blobKey })
          .where(eq(schema.styles.id, row.id));
        row.imageBlobKey = media.blobKey;
      } catch {
        // Thumbnail stays null; retryable from the Library.
      }
      ctx.invalidateQueries();
      return { style: await styleToOut(ctx, row) };
    },
  }),

  updateStyle: defineAction({
    description:
      "Edits a user style's name, category, description, and prompt modifier. Built-in styles are read-only — duplicate one to tweak it.",
    request: z.object({
      styleId: z.number().int().positive(),
      name: z.string().min(1).max(80),
      category: styleCategorySchema,
      description: z.string().min(1).max(600),
      modifier: z.string().min(3).max(800),
    }),
    response: z.object({ style: styleOut }),
    async handler(ctx, args) {
      const row = await loadStyleRow(ctx, args.styleId, "updateStyle");
      if (row.isBuiltin === 1)
        throw new Error(
          "updateStyle: built-in styles can't be edited — duplicate it to make your own version",
        );
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.styles)
        .set({
          name: args.name.trim(),
          category: args.category,
          description: args.description.trim(),
          modifier: args.modifier.trim(),
        })
        .where(eq(schema.styles.id, row.id));
      // Projects using this style display its name — keep them in sync.
      await db
        .update(schema.projects)
        .set({ style: args.name.trim() })
        .where(eq(schema.projects.styleId, row.id));
      const updated = await loadStyleRow(ctx, row.id, "updateStyle");
      ctx.invalidateQueries();
      return { style: await styleToOut(ctx, updated) };
    },
  }),

  deleteStyle: defineAction({
    description:
      "Deletes a user style. Built-in styles refuse. Projects using the style fall back to the Noir built-in look.",
    request: z.object({ styleId: z.number().int().positive() }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const row = await loadStyleRow(ctx, args.styleId, "deleteStyle");
      if (row.isBuiltin === 1)
        throw new Error("deleteStyle: built-in styles can't be deleted");
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.projects)
        .set({ styleId: null, style: "Noir" })
        .where(eq(schema.projects.styleId, row.id));
      await db.delete(schema.styles).where(eq(schema.styles.id, row.id));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  duplicateStyle: defineAction({
    description:
      "Copies any style (built-in or user) into a new user style the user can tweak. The copy shares the original's thumbnail.",
    request: z.object({ styleId: z.number().int().positive() }),
    response: z.object({ style: styleOut }),
    async handler(ctx, args) {
      const source = await loadStyleRow(ctx, args.styleId, "duplicateStyle");
      const db = ctx.db<typeof schema>();
      const maxRows = await db
        .select({ position: schema.styles.position })
        .from(schema.styles)
        .orderBy(desc(schema.styles.position))
        .limit(1);
      const inserted = await db
        .insert(schema.styles)
        .values({
          name: `${source.name} (copy)`.slice(0, 80),
          category: source.category,
          description: source.description,
          modifier: source.modifier,
          imageBlobKey: source.imageBlobKey,
          isBuiltin: 0,
          position: (maxRows[0]?.position ?? -1) + 1,
        })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("duplicateStyle: insert returned no rows");
      ctx.invalidateQueries();
      return { style: await styleToOut(ctx, row) };
    },
  }),

  toggleStyleFavorite: defineAction({
    description: "Marks or unmarks a style as a favorite in the Library.",
    request: z.object({
      styleId: z.number().int().positive(),
      favorite: z.boolean(),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      await loadStyleRow(ctx, args.styleId, "toggleStyleFavorite");
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.styles)
        .set({ favorite: args.favorite ? 1 : 0 })
        .where(eq(schema.styles.id, args.styleId));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),

  generateStyleThumbnail: defineAction({
    description:
      "Generates (or regenerates) a style's thumbnail image in that style — the retry for a style whose thumbnail is missing.",
    request: z.object({ styleId: z.number().int().positive() }),
    response: z.object({ style: styleOut }),
    async handler(ctx, args) {
      const row = await loadStyleRow(
        ctx,
        args.styleId,
        "generateStyleThumbnail",
      );
      const media = await ctx.tool.generate_media(
        `Showcase image for a visual style: ${row.description} Rendered fully in this style: ${row.modifier}. No text, no words, no letters, no watermark.`,
        { orientation: "landscape" },
      );
      const db = ctx.db<typeof schema>();
      await db
        .update(schema.styles)
        .set({ imageBlobKey: media.blobKey })
        .where(eq(schema.styles.id, row.id));
      const updated = await loadStyleRow(ctx, row.id, "generateStyleThumbnail");
      ctx.invalidateQueries();
      return { style: await styleToOut(ctx, updated) };
    },
  }),

  setProjectStyle: defineAction({
    description:
      "Changes a project's style: either a library style (styleId) or one of the six built-in styles (builtin). The pick steers every generation prompt from then on; existing stills are not regenerated.",
    request: z.object({
      projectId: z.number().int().positive(),
      styleId: z.number().int().positive().optional(),
      builtin: styleSchema.optional(),
    }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      if (!args.styleId && !args.builtin)
        throw new Error("setProjectStyle: pick a library style or a built-in");
      const project = await loadProjectRow(ctx, args.projectId);
      if (!project) throw new Error("setProjectStyle: project not found");
      assertWritable(project, "setProjectStyle");
      const db = ctx.db<typeof schema>();
      if (args.styleId) {
        const style = await loadStyleRow(ctx, args.styleId, "setProjectStyle");
        await db
          .update(schema.projects)
          .set({ styleId: style.id, style: style.name, updatedAt: new Date() })
          .where(eq(schema.projects.id, project.id));
      } else if (args.builtin) {
        await db
          .update(schema.projects)
          .set({ styleId: null, style: args.builtin, updatedAt: new Date() })
          .where(eq(schema.projects.id, project.id));
      }
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
  getAccount: defineAction({
    description: "Returns the workspace account: plan, live credit balance, cycle dates, preferences, model catalog with locks, and the credit ledger. Grants Monday/monthly credits when due.",
    request: z.object({}),
    response: z.object({ account: accountOut }),
    async handler(ctx) { const acct = await ensureAccount(ctx); return { account: await accountToOut(ctx, acct) }; },
  }),

  switchPlan: defineAction({
    description: "Switches the workspace plan (no payment is taken — prices are launch prices). Expires the current cycle's remaining credits and grants the new plan's credits for a fresh cycle.",
    request: z.object({ plan: z.enum(PLAN_IDS), billingPeriod: z.enum(["annual", "monthly"]).default("annual") }),
    response: z.object({ account: accountOut }),
    handler: async (ctx, args): Promise<{ account: z.infer<typeof accountOut> }> => {
      if (args.plan === "enterprise") throw new Error("Enterprise is custom — contact sales. Pick a self-serve plan to switch in-app.");
      const db = ctx.db<typeof schema>();
      let acct = await ensureAccount(ctx);
      if (acct.balance > 0) acct = await ledgerAdd(ctx, acct, -acct.balance, "expiry", "Credits expired on plan switch (credits do not roll over)");
      const def = planDef(args.plan);
      const now = new Date();
      const end = new Date(now); end.setDate(end.getDate() + (args.plan === "free" ? 7 : 30));
      await db.update(schema.workspaceAccount).set({ plan: args.plan, billingPeriod: args.billingPeriod, cycleStart: now, cycleEnd: end, lastMondayGrant: args.plan === "free" ? mostRecentMonday(now) : acct.lastMondayGrant }).where(eq(schema.workspaceAccount.id, 1));
      acct = { ...acct, plan: args.plan, billingPeriod: args.billingPeriod, cycleStart: now, cycleEnd: end };
      acct = await ledgerAdd(ctx, acct, def.credits, "grant", `${def.name} plan — grant (${def.credits.toLocaleString()} credits)`);
      const fresh = (await db.select().from(schema.workspaceAccount).where(eq(schema.workspaceAccount.id, 1)).limit(1))[0]!;
      ctx.invalidateQueries();
      return { account: await accountToOut(ctx, fresh) };
    },
  }),

  updateAccountProfile: defineAction({
    description: "Updates the workspace owner's display name and bio shown in the account center and team page.",
    request: z.object({ displayName: z.string().min(1).max(60), bio: z.string().max(300).default("") }),
    response: z.object({ account: accountOut }),
    async handler(ctx, args) { const db = ctx.db<typeof schema>(); await ensureAccount(ctx); await db.update(schema.workspaceAccount).set({ displayName: args.displayName, bio: args.bio }).where(eq(schema.workspaceAccount.id, 1)); const acct = (await db.select().from(schema.workspaceAccount).where(eq(schema.workspaceAccount.id, 1)).limit(1))[0]!; ctx.invalidateQueries(); return { account: await accountToOut(ctx, acct) }; },
  }),

  updatePreferences: defineAction({
    description: "Saves account preferences: canvas chat approval default, watermark position, theme, and workflow rules text.",
    request: z.object({ chatDefault: z.enum(["ask", "auto"]).optional(), watermarkPos: z.enum(["top-left", "top-right"]).optional(), theme: z.enum(["system", "light", "dark"]).optional(), workflowRules: z.string().max(1000).optional() }),
    response: z.object({ account: accountOut }),
    async handler(ctx, args) { const db = ctx.db<typeof schema>(); await ensureAccount(ctx); await db.update(schema.workspaceAccount).set({ ...(args.chatDefault ? { chatDefault: args.chatDefault } : {}), ...(args.watermarkPos ? { watermarkPos: args.watermarkPos } : {}), ...(args.theme ? { theme: args.theme } : {}), ...(args.workflowRules !== undefined ? { workflowRules: args.workflowRules } : {}) }).where(eq(schema.workspaceAccount.id, 1)); const acct = (await db.select().from(schema.workspaceAccount).where(eq(schema.workspaceAccount.id, 1)).limit(1))[0]!; ctx.invalidateQueries(); return { account: await accountToOut(ctx, acct) }; },
  }),

  updateNotifications: defineAction({
    description: "Saves the six notification toggles for the workspace account.",
    request: z.object({ notifications: z.record(z.string(), z.boolean()) }),
    response: z.object({ account: accountOut }),
    async handler(ctx, args) { const db = ctx.db<typeof schema>(); await ensureAccount(ctx); await db.update(schema.workspaceAccount).set({ notifJson: JSON.stringify(args.notifications) }).where(eq(schema.workspaceAccount.id, 1)); const acct = (await db.select().from(schema.workspaceAccount).where(eq(schema.workspaceAccount.id, 1)).limit(1))[0]!; ctx.invalidateQueries(); return { account: await accountToOut(ctx, acct) }; },
  }),

  saveAggregatorKey: defineAction({
    description: "Saves the aggregator provider and API key server-side. The key is write-only and is never returned to the client.",
    request: z.object({ provider: z.enum(["fal", "replicate"]), apiKey: z.string().min(4).max(300) }),
    response: z.object({ account: accountOut }),
    async handler(ctx, args) { const db = ctx.db<typeof schema>(); await ensureAccount(ctx); await db.update(schema.workspaceAccount).set({ aggProvider: args.provider, aggKey: args.apiKey }).where(eq(schema.workspaceAccount.id, 1)); const acct = (await db.select().from(schema.workspaceAccount).where(eq(schema.workspaceAccount.id, 1)).limit(1))[0]!; ctx.invalidateQueries(); return { account: await accountToOut(ctx, acct) }; },
  }),

  clearAggregatorKey: defineAction({
    description: "Removes the saved aggregator API key, re-locking aggregator models.",
    request: z.object({}),
    response: z.object({ account: accountOut }),
    async handler(ctx) { const db = ctx.db<typeof schema>(); await ensureAccount(ctx); await db.update(schema.workspaceAccount).set({ aggKey: null }).where(eq(schema.workspaceAccount.id, 1)); const acct = (await db.select().from(schema.workspaceAccount).where(eq(schema.workspaceAccount.id, 1)).limit(1))[0]!; ctx.invalidateQueries(); return { account: await accountToOut(ctx, acct) }; },
  }),

  setProjectModels: defineAction({
    description: "Sets a project's selected image and/or video model from the Stage 9 catalog. Locked or plan-gated picks are refused with the reason.",
    request: z.object({ projectId: z.number().int().positive(), imageModel: z.string().optional(), videoModel: z.string().optional() }),
    response: z.object({ ok: z.literal(true) }),
    handler: async (ctx, args): Promise<{ ok: true }> => {
      const project = await loadProjectRow(ctx, args.projectId);
      if (!project) throw new Error("setProjectModels: project not found");
      assertWritable(project, "setProjectModels");
      const acct = await ensureAccount(ctx);
      const db = ctx.db<typeof schema>();
      const patch: { imageModel?: string; videoModel?: string; updatedAt: Date } = { updatedAt: new Date() };
      if (args.imageModel) { const m = modelById(args.imageModel); if (m.type !== "image") throw new Error("setProjectModels: that is not an image model"); const l = modelLock(acct, m); if (l.locked) throw new Error(`${m.name} is locked — ${l.reason}.`); patch.imageModel = m.id; }
      if (args.videoModel) { const m = modelById(args.videoModel); if (m.type !== "video") throw new Error("setProjectModels: that is not a video model"); const l = modelLock(acct, m); if (l.locked) throw new Error(`${m.name} is locked — ${l.reason}.`); patch.videoModel = m.id; }
      await db.update(schema.projects).set(patch).where(eq(schema.projects.id, project.id));
      ctx.invalidateQueries();
      return { ok: true };
    },
  }),
} satisfies ActionsModule;
