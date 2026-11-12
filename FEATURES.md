# FilmKit — full feature inventory & build target

Everything inside Flick's logged-in app, recorded from a full look-only tour of
Glenn's own flick.art account on 2026-11-12 (Free plan). This is the master
checklist: FilmKit is being built toward this full set, plus FilmKit's own
differentiator — deeper **character development** and **location development**
(the project Bible, in progress) — which Flick does not have.

Status key: ✅ in FilmKit now · 🔨 building · ⬜ planned stage

---

## 1. Global shell

- Top nav on every page: HOME, WORKSPACE, FLICK TV, FLICKPEDIA, notifications
  bell, "+ CREATE" button, credits balance pill (opens the account center),
  "+ CREDITS" top-up button, account avatar. ⬜
- Festival banner: "Flick AI Film Festival — submit by 12.15.2026" with prizes
  ($15K). ⬜
- Notifications panel: likes, comments, follows, tips land here; desktop
  notifications opt-in; per-type toggles in settings. ⬜

## 2. Home

- Hero prompt: "What story do you want to create today?" — big idea box,
  style button ("NO STYLE"), aspect-ratio button (16:9), record-voice (mic)
  button, submit. ✅ (mini: prompt + style picker + 16:9)
- "Workflow variants" toggle above the prompt box. ⬜
- Entry paths: **Script to Film**, **Prompt to Film**, **Build Characters**,
  **Start from a style**, **Blank canvas**. ⬜
- "Guided Tour" — a 15-minute in-app tour. ⬜
- Recent Projects strip. ✅ (My films)
- Beginner templates: "Flick Basics - Beginner" and "Flick Basics - Advanced"
  sample projects, each with New Project / Open Template. ⬜
- Flick TV section linking into the gallery. ✅

## 3. Workspace

- Team header ("Glenn's Team — your own workspace"), tabs: All / In Progress /
  Done / Archived; search by name; sort (Edited by me / Last edited). ⬜
- Project cards with thumbnail, date, Open button, and a menu: Rename,
  Duplicate, Archive, Delete. ✅ (basic list) / ⬜ (tabs, menus)

## 4. Create flow

- "+ CREATE" menu: **New project** (opens a blank canvas immediately — no
  wizard) and **Publish video**. ⬜
- New canvas opens with an AI chat already beside it (see §6).

## 5. Studio shell

- Project top bar: back to projects, editable title, Flickpedia shortcut,
  project style selector ("keep your visual consistency"), Share button,
  credits pill, avatar. ⬜
- Four view tabs: **STORY · CANVAS · 3D STAGE · VIDEO EDITOR**. ⬜

## 6. Story view

- Left outline: Brief, Narrative, Creative direction (with Plan), Script with
  scene headings and character links. ⬜
- Script editor: fountain format, undo/redo, expand, Shots view, character and
  mic buttons; **Import a Script** (upload or paste); **Edit with AI**. ⬜
- Storyboard tab: generated from the script ("Agent can write one from your
  idea and plan its shots" — Plan my shots / Write a script actions). ✅
  (mini: storyboard from prompt)

## 7. Canvas view (the core studio)

- Node-based board. **Add Node** menu: Upload, Text Note, Generate Image,
  Generate Video (Frame to Video / Omni Reference / GIF), Generate Voice
  (Text to Voice / Create or Clone Voice), Generate Music, Generate Emotion. ⬜
- Canvas sections (collapsible groups, e.g. CHARACTER CREATION, SCENE
  CREATION, SHOT CREATION, VIDEO CREATION) with instruction text nodes. ⬜
- Image node: model dropdown, aspect ratio, style, resolution (1K), up to
  **10 reference images**, prompt box (@ to reference an asset), quantity,
  **Run button showing its credit cost before you run it**. ⬜
- Video node (Frame to Video): model (Auto default), aspect, resolution
  (720p), duration (5s), start frame (required), end frame (optional),
  animation prompt, quantity, Run with credit cost. ⬜
- Media item actions: favorite, archive, name, download, fullscreen,
  duplicate, delete, regenerate, extract frame (first/this/last), add to
  folder, **Add to Timeline**, copy prompt. ⬜
- Left toolbar: Add Node, hand mode, Add Section, Add Text, Tidy canvas,
  Assets, Story, Video Editor, canvas settings, zoom. ⬜
- **AI chat panel** (right side): writes scripts, structures scene lists,
  storyboards shots. Shows prompts left on free chat; Attach file, Reference
  an asset, **Agent memory**, **Approval mode** (Auto / ask first), record
  voice; quick actions: Dictate a script, Upload and reformat a script,
  Understand how this script works. ⬜

## 8. 3D Stage view

- Block scenes in 3D: add figures and cameras ("components"), lights,
  multiple scenes per project. ⬜
- Movement modes: Default (move/orbit/WASD) or Unreal/Unity style. ⬜
- Timeline with a track per character; camera tracks with actions (e.g.
  Orbit 0–5s); Rehearse and Record (record needs at least one camera);
  "Send to canvas" to turn a staged shot into a generation. ⬜
- This is Flick's camera/motion control surface (motion control itself is a
  Standard-plan feature, §11). ⬜

## 9. Video Editor view

- Library tabs: **Assets** (grouped by canvas section), **Effects**,
  **Transitions**, **Motions**, **SFX**, more; search; upload media. ⬜
- Timeline: Main track with mute + volume; tools — Select (V), Razor (C),
  Delete left (Q), Split (S), Delete right (W); magnet + snapping toggles;
  zoom; 16:9, 30 fps; timecode; fullscreen. ⬜
- **Generate captions**, Add text, **Auto edit** ("let the agent assemble a
  first cut"), **Export**. ⬜
- Effects library: Color & Light (split tone, duotone, chroma key), Blur
  (motion, radial, bloom), Detail (posterize, halftone, edge detect,
  painterly, grain, chromatic aberration, pixel sort, glitch, VHS), Distort
  (pixelate, fisheye, whirl & pinch, kaleidoscope, mirror). ⬜
- Transitions library: dissolves/warps/morphs, wipes (incl. slices, blinds,
  petals, crosshatch), shapes (circle, heart, hexagons, mosaic), pushes and
  zooms (spin zoom, pinwheel, ripple, water drop, wind, bounce), 3D (cube,
  doorway, swap, bowtie, fly eye), glitch set. ⬜
- Motions library (animated text presets): General (clean rise, typewriter,
  lower thirds, hook captions, karaoke captions, countdown, news ticker…),
  Cinematic (film opening title, end credit roll, 16mm flicker, festival
  laurels, silent-film intertitle, neon sign, perspective crawl…), Campaign
  (promo price, call to action, sale countdown, discount starburst…). ⬜
- SFX library: 60+ clips powered by Freesound; categories Nature, Animals,
  Ambient, Cinematic, Action, Game & UI, Sci-fi & Tech, Horror; preview and
  Add to Timeline per clip. ⬜

## 10. Models (full catalog, from the plan comparison)

- **Image (29):** GPT Image 2.5, GPT Image 2.6, GPT Image 2.6 Flare,
  GPT Image 2, Nano Banana 2.1, Krea 3, Nano Banana, Nano Banana 2 Lite,
  Midjourney, Recraft V3, ZImage Turbo, Seedream 5.0 Lite, Seedream 5.0 Pro,
  Grok Imagine, Nano Banana Pro, Wan 2.7, Riverflow 2.0 Pro, Riverflow 2.0
  Fast, Flux 2 Dev, Kling Image V3, Flick, Seedream 4.5, SeeDream, Pruna,
  Qwen Camera Control, Pruna Upscale, Topaz Upscale.
- **Video (37):** MiniMax H3 Fast, MiniMax H3 Max, Seedance 2.5 Draft,
  Kling 4.0, Wan 3.0, FLUX 3, Pruna Draft, MiniMax H3, Seedance 2.5,
  Seedance 2.0, Seedance 2.0 Mini, Kling 3.0 4K, Kling O3 Pro,
  Seedance 1.5 Pro, Kling O3, Kling 3.0 Pro, Happy Horse 1.1, Wan 2.6,
  Kling 3.0, Grok Imagine 1.5, Grok Imagine 1.5 Multi, Seedance Pro,
  Kling 2.6 Pro, Seedance Lite, Veo 3.1, Veo 3.1 Fast, Kling 2.6,
  Bytedance Upscale, Topaz Video Upscale, Gemini Omni Flash, Mirelo SFX 2.0,
  Kling AI Avatar v2, Kling AI Avatar v2 Pro, Kling O3 Pro Multishot,
  Kling O3 Multishot, GPT Image 2.6 GIF.
- **Audio (4):** Eleven v4, Eleven v3, Seed Audio 1.0, Eleven Music.
- Credit costs are per generation and vary with resolution/references —
  shown on the Run button. Examples seen: GPT Image 2.5 at 1K = 5 credits
  (range 2–110); image-to-video from 20 credits (Auto range 20–240);
  cheapest video Pruna Draft 3–40. ⬜ (FilmKit: single built-in generator
  today; catalog + real models come with the aggregator stage)

## 11. Credits and plans

- Balance in the top bar on every page; "+ 200 CREDITS" top-up button.
  Top-ups on paid plans: $1.50 per 100 credits. Plan credits do **not** roll
  over; failed generations refund credits. ⬜
- Free plan extras: 100 free credits every Monday (unused expire each week);
  join Discord = +200 credits; invite a friend who subscribes to Standard+
  = 2,000 credits. ⬜
- Plans (annual billing shown; monthly is ~20% more):
  - **Free $0** — 100 credits/mo.
  - **Casual $4/mo** — 500 credits/mo, up to ~100 GPT Image 2.5 generations,
    ~2 min video/mo.
  - **Standard $16/mo** — 2,500 credits/mo, ~500 generations, ~10 min video.
  - **Pro $45/mo** — 8,000 credits/mo, ~1,600 generations, ~33 min video,
    priority support.
  - **Studio $100/mo** — 24,000 credits/mo (slider up to 240,000), ~4,800
    generations, ~100 min video, private founders support.
  - **Enterprise** — custom; team collaboration, security, support.
- Feature gates:
  - All **image** models: every plan. All **audio** models: every plan.
  - **Video** models: "Limited" on Free/Casual — only MiniMax H3 Fast,
    MiniMax H3 Max, Pruna Draft, Bytedance Upscale, Mirelo SFX 2.0,
    GPT Image 2.6 GIF. Full set on Standard+.
  - **Character reference, multi-reference video, motion control, character
    dialogue, no watermark:** Standard+ only. **Watermark is forced on Free
    and Casual** (position top-left/top-right setting).
  - Team members: any paid plan. AI Chat, Style Presets, Film Inspirations:
    every plan. Paid tiers advertise 1.5M+ Flickpedia inspiration stills,
    1000+ style presets, unlimited AI chat, the video editor, Flick Teams.

## 12. Flick TV (gallery)

- Editor's Choice hero + featured films; community grid (~24+ films) with
  category tabs: All, Following, Residency, Featured Workflows, Series,
  Animation, Horror & Thriller, True Stories, Flick Festival. ✅ (basic
  gallery with sample films) / ⬜ (full)
- Every film card: **Get Workflow** (copy how it was made), Like, Support
  (tips — creators get paid via PayPal, see §14). ⬜
- Festival submission entry point. ⬜

## 13. Flickpedia (inspiration library)

- Tabs: Explore, Image Inspo, Visual Styles, Sound Effects, Classic Film
  Scenes, Tutorials, Docs. Search with suggestion chips. ⬜
- **Visual Styles: 917 styles**, category filters (Cinematic, Cartoon,
  Anime, Drawing, Illustration, Painting, 3D), "Use this style", favorites /
  Saved Styles, **Create My Style**, sort Latest / Recommended. ⬜
- Free assets positioning: image inspiration (1.5M+ film stills claimed),
  classic film scenes, sound effects, tutorials. ⬜

## 14. Account center

- **Account:** profile photo, name, bio; sign-in email shown as "managed by
  Google sign-in"; **Connected apps — Connect to Claude, Connect to
  ChatGPT, Connect to Cursor, other AI apps via a copied MCP connector
  URL**; **Getting paid:** PayPal (or "something else") payout email for
  tips/supports. ⬜
- **Notifications:** toggles for Likes, Comments, New followers, Tips,
  Workflow use, New films from people you follow. ⬜
- **Preferences:** Agent preferences — approval mode (Auto = asks before
  generating video) and free-text **workflow rules** (e.g. "Always confirm
  the shotlist with me before generating"); Appearance — theme (system /
  light / dark), language; Watermark include + position; Canvas navigation
  (scroll to zoom). ⬜
- **Team:** workspace members list, invite members, invitations tab. ⬜
- **Usage:** credits left, recent credit activity with expiry dates,
  earn-more offers. ⬜
- **Billing and plans:** current plan, upgrade, payment history / invoices. ⬜
- **Help:** join Discord, documentation, YouTube tutorials channel. ⬜

## 15. How characters work in Flick (for contrast)

- There is **no characters panel and no character profiles**. Consistency =
  reference images: standard character reference images (front view etc.)
  built in a canvas section, up to 10 reference images attached per
  generation, plus a "character replacement" workflow (swap the people in a
  scene with your characters). Character reference as a *feature* is gated
  to Standard+.
- Locations likewise have no profiles — a look comes from a style preset or
  reference stills only.

## 16. FilmKit's differentiator — the Bible 🔨

- **Characters:** full profiles — name, role, appearance, wardrobe,
  personality, backstory — plus a generated character portrait/sheet in the
  project's style, and per-scene state (mood / outfit changes) so characters
  develop across the story.
- **Locations:** full profiles — name, description, mood, lighting, time of
  day — plus generated establishing views.
- **Auto-develop:** one action drafts the bible from the storyboard for the
  user to edit and approve.
- **Scene tagging + wiring:** every scene tags its location and cast; the
  profiles and images feed that scene's generation automatically.

## 17. Build order (stages)

1. Bible (characters + locations) — 🔨 in progress
2. App shell: global nav, Home entry paths, Workspace tabs/menus
3. Story view: script editor (fountain), import, storyboard-from-script
4. Canvas view: nodes, sections, AI chat agent, media actions
5. Video Editor: timeline, effects/transitions/motions/SFX libraries,
   captions, auto-edit, export
6. 3D Stage: figures/cameras, tracks, record → send to canvas
7. Flickpedia-style library: styles (use/save/create), inspiration, SFX
8. Flick TV full: categories, Get Workflow, likes/supports, festival
9. Accounts + credits + plans (aggregator models, catalog, credit ledger,
   plan gates, top-ups), account center, teams, notifications
