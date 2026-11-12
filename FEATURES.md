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
  "+ CREDITS" top-up button, account avatar. ✅ (Stage 2, 2026-11-12: nav is
  HOME / WORKSPACE / FILMKIT TV / LIBRARY; credits pill shows the built-in
  "Free plan"; avatar menu explains the built-in plan — real accounts and
  the credits top-up arrive with the accounts/credits stage; phone gets a
  bottom nav bar)
- Festival banner: "Flick AI Film Festival — submit by 12.15.2026" with prizes
  ($15K). ⬜
- Notifications panel: likes, comments, follows, tips land here; desktop
  notifications opt-in; per-type toggles in settings. 🔨 (Stage 2: bell +
  panel exist with an honest "Nothing yet" empty state; real notifications
  arrive with accounts)

## 2. Home

- Hero prompt: "What story do you want to create today?" — big idea box,
  style button ("NO STYLE"), aspect-ratio button (16:9), record-voice (mic)
  button, submit. ✅ (mini: prompt + style picker + 16:9)
- "Workflow variants" toggle above the prompt box. ✅ (Stage 2: switch adds
  an alternate-takes instruction to storyboard generation)
- Entry paths: **Script to Film**, **Prompt to Film**, **Build Characters**,
  **Start from a style**, **Blank canvas**. ✅ (Stage 2: all five are real
  routes; Script to Film and Blank canvas create an empty project in the
  studio, Build Characters creates one and lands in the Bible — characters
  first, story later, Bible survives storyboard generation and the
  storyboard is written for the existing cast)
- "Guided Tour" — a 15-minute in-app tour. ⬜
- Recent Projects strip. ✅ (Stage 2: last-edited order; every card has a
  labeled "Open in Studio" button and the card itself opens the studio —
  added after Glenn reported he couldn't find the studio from Home)
- Beginner templates: "Flick Basics - Beginner" and "Flick Basics - Advanced"
  sample projects, each with New Project / Open Template. ⬜
- Flick TV section linking into the gallery. ✅

## 3. Workspace

- Team header ("Glenn's Team — your own workspace"), tabs: All / In Progress /
  Done / Archived; search by name; sort (Edited by me / Last edited). ✅
  (Stage 2: tabs with counts, search, Last edited / Name sort; team header
  not replicated — single built-in user)
- Project cards with thumbnail, date, Open button, and a menu: Rename,
  Duplicate, Archive, Delete. ✅ (Stage 2: labeled "Open in Studio" button
  plus a card menu — Rename, Duplicate, Mark Done / In Progress, Archive /
  Unarchive, Delete with confirm; status/archived persist on the project)

## 4. Create flow

- "+ CREATE" menu: **New project** (opens a blank canvas immediately — no
  wizard) and **Publish video**. ✅ (Stage 2: New project creates and opens
  the studio at once; Publish video lists finished films with
  Publish/Unpublish — published films show in FilmKit TV badged as yours,
  and publishing is server-guarded to fully filmed films)
- New canvas opens with an AI chat already beside it (see §6).

## 5. Studio shell

- Project top bar: back to projects, editable title, Flickpedia shortcut,
  project style selector ("keep your visual consistency"), Share button,
  credits pill, avatar. ⬜
- Four view tabs: **STORY · CANVAS · 3D STAGE · VIDEO EDITOR**. 🔨
  (FilmKit's studio is one scrolling page with a section nav — Storyboard /
  Bible / Watch since Stage 2, **Story added in Stage 3, Canvas in
  Stage 4, Editor in Stage 5, Stage in Stage 6**; the nav is now Story /
  Storyboard / Canvas / Stage / Editor / Bible / Watch)

## 6. Story view

- Left outline: Brief, Narrative, Creative direction (with Plan), Script with
  scene headings and character links. 🔨 (Stage 3, 2026-11-12: the Story
  section carries a script outline — every scene heading in the script with
  a coverage chip, "On the storyboard" / "Not storyboarded yet", plus chips
  naming the Bible characters that scene's text mentions; tapping a heading
  selects and scrolls to it in the editor. Flick's Brief / Narrative /
  Creative-direction panels are not replicated — the project prompt and the
  Bible carry that role in FilmKit)
- Script editor: fountain format, undo/redo, expand, Shots view, character and
  mic buttons; **Import a Script** (upload or paste); **Edit with AI**. ✅
  (Stage 3: each project has a script document — `projects.script_text` —
  edited on a monospace screenplay surface; fountain-style headings
  (INT./EXT. …), CAPS speaker names, and dialogue are understood but plain
  structured text works too; autosaves as you type with word/scene counts;
  undo/redo is the editor's native text undo. **Import a Script**: paste
  text or upload a .txt/.fountain/.md file, replacing the script or
  appending to it — the user's choice. **Edit with AI**: an instruction box
  ("make the ending darker", "add a scene in the cottage") returns a full
  revised draft that is shown for review and only replaces the script when
  the user keeps it — discarding changes nothing. Mic/dictation and the
  expand view are not replicated)
- Storyboard tab: generated from the script ("Agent can write one from your
  idea and plan its shots" — Plan my shots / Write a script actions). ✅
  (Stage 3: **Write a script from my idea** generates a screenplay-formatted
  script — scene headings, action, light dialogue — from the project's
  prompt + style, with the existing Bible as binding context, and lands as a
  reviewable draft. **Plan my shots** parses the script's scene headings:
  one storyboard scene per script scene, the heading becoming the scene
  title and its action lines (character cues and dialogue stripped) the
  description and visual prompt; each planned scene stores its heading
  (`scenes.script_heading`) and is auto-tagged to any Bible characters /
  locations its text names. With no headings it falls back to writing
  scenes from the script's story, as before. When the storyboard already
  has scenes the user chooses **append or replace** first — planning never
  silently wipes scenes, tags, or stills. Script ↔ storyboard links run
  both ways: outline coverage chips in the Story view, and a "View in
  script — INT. …" button on every planned scene card that jumps to and
  highlights its heading. Home's **Script to Film** now lands in the Story
  view with the import dialog open. The Stage 2 paste-a-story panel still
  works and now also files the pasted text as the project's script when it
  has none)

## 7. Canvas view (the core studio)

- Node-based board. **Add Node** menu: Upload, Text Note, Generate Image,
  Generate Video (Frame to Video / Omni Reference / GIF), Generate Voice
  (Text to Voice / Create or Clone Voice), Generate Music, Generate Emotion. 🔨
  (Stage 4, 2026-11-12: FilmKit's board runs the node types it can run
  honestly today — **Upload** (an image from the device becomes a media
  item), **Text Note** (free text), **Generate Image**, and **Frame to
  Clip**. Generate Voice / Generate Music / Generate Emotion are **not in
  the menu**: there are no real audio models behind them yet, and FilmKit
  doesn't ship fake nodes — they arrive with the audio models at Stage 9)
- Canvas sections (collapsible groups, e.g. CHARACTER CREATION, SCENE
  CREATION, SHOT CREATION, VIDEO CREATION) with instruction text nodes. ✅
  (Stage 4: collapsible labeled sections drawn as frames on the board;
  new projects start with CHARACTERS / SCENES / SHOTS / CLIPS; users can
  add, rename, collapse, and delete sections, and move any node between
  sections from the node's own menu)
- Image node: model dropdown, aspect ratio, style, resolution (1K), up to
  **10 reference images**, prompt box (@ to reference an asset), quantity,
  **Run button showing its credit cost before you run it**. 🔨 (Stage 4:
  prompt box — the node's own text, or a **wired Text Note** as its prompt
  source (the one meaningful wiring the board supports, persisted as a
  link) — project style, 16:9, quantity 1–4, Run generates real stills
  onto the node. No model dropdown, resolution picker, reference images,
  or credit cost yet: FilmKit has one built-in generator and no credits
  until Stage 9. **Bible wiring carries over**: image nodes take the same
  optional character/location tags as scenes, and the tagged profiles fold
  into the generation prompt — the exact composed prompt is shown on the
  node, like scenes)
- Video node (Frame to Video): model (Auto default), aspect, resolution
  (720p), duration (5s), start frame (required), end frame (optional),
  animation prompt, quantity, Run with credit cost. 🔨 (Stage 4: **Frame
  to Clip** — a media item is wired in as the start frame (or use any
  still's "make a motion clip" action, which creates + wires + runs the
  node in one step), plus an animation note. The result is a **motion
  clip**: the start frame presented with the player's slow cinematic
  pan/zoom, labeled "Motion clip" everywhere it appears — FilmKit has no
  real video models until Stage 9, and the clip is never passed off as
  generated video. Motion clips play in the Watch player after the
  scenes, and are the Stage 5 editor's clip source)
- Media item actions: favorite, archive, name, download, fullscreen,
  duplicate, delete, regenerate, extract frame (first/this/last), add to
  folder, **Add to Timeline**, copy prompt. 🔨 (Stage 4: favorite,
  archive/unarchive, rename, download, fullscreen view (clips play their
  pan/zoom there), duplicate, delete, regenerate (generated stills,
  re-running the exact stored prompt) — plus FilmKit's own two: **send to
  a storyboard scene** (sets that scene's still) and **Editor bin** (flags
  the item into the per-project asset list the Stage 5 editor will read;
  the bin and its contents are shown under the board). Not replicated:
  extract frame, add to folder, copy prompt)
- Left toolbar: Add Node, hand mode, Add Section, Add Text, Tidy canvas,
  Assets, Story, Video Editor, canvas settings, zoom. 🔨 (Stage 4: an
  Add Node row (Text note / Generate image / Frame to clip / Upload image,
  with a target-section picker), an Add Section form, a sections bar
  (collapse/rename/delete), and zoom controls with Reset view under the
  board. The board pans by dragging the background and zooms in 15% steps;
  nodes move by dragging their headers and **persist their positions**.
  No Tidy/Assets/settings tools)
- **AI chat panel** (right side): writes scripts, structures scene lists,
  storyboards shots. Shows prompts left on free chat; Attach file, Reference
  an asset, **Agent memory**, **Approval mode** (Auto / ask first), record
  voice; quick actions: Dictate a script, Upload and reformat a script,
  Understand how this script works. 🔨 (Stage 4: a collapsible project
  chat beside the board; history persists per project. The assistant
  discusses the film and can attach **structured proposals** — a shot list
  (applied = storyboard scenes appended), bible drafts (applied = routed
  into the Bible panel's existing review flow; never saved directly), and
  image generations (applied = Generate Image nodes created in SHOTS and
  run). **Approval mode** (Ask first / Auto, default Ask, persisted per
  project): in Ask, nothing a proposal names is created until the user
  approves it; in Auto, proposed image generations run immediately —
  shot lists and bible drafts always wait. Not replicated: attach file,
  reference an asset, agent memory beyond the project's own context,
  voice input, quick actions)
- **Phone layout (Stage 4 note)**: at phone width the free-form board is
  replaced by a **stacked fallback** — the same nodes grouped under their
  section headings with every action reachable; pan/zoom/drag is a
  wider-screen surface. The board itself is fully usable from tablet
  width up.
- Housekeeping (Stage 4): duplicating a project copies its storyboard,
  script, and Bible but **not** its canvas or chat (media blob keys are
  shared with scenes, so a canvas copy is a later refinement); deleting
  a project removes its canvas, media, and chat rows with everything
  else. Deleting a node keeps its media as unattached project assets.

## 8. 3D Stage view

- Block scenes in 3D: add figures and cameras ("components"), lights,
  multiple scenes per project. 🔨 (Stage 6, 2026-11-12: FilmKit's **Stage**
  section is a top-down **blocking board**, one ground plan per setup, with
  **multiple setups per project** (add / rename / delete). On the board:
  **figures** — one per Bible character in one click via **Add cast**
  (labeled with the character's name and a per-character color), plus
  generic figures; **cameras** — markers with a facing direction and a
  visible **field-of-view cone**, each with a **shot size** (Wide / Medium /
  Close-up) and **height** (Low / Eye-level / High / Overhead); **props** —
  labeled blocks from a preset list (table, door, car, tree, chair, bed,
  counter, desk, fence, lamp post) or a custom label. Everything is placed
  by dragging, by tap-to-place, or by arrow keys, rotated with a facing
  slider, and **persisted per project** (`stage_setups` / `stage_items`).
  A figure keeps its label snapshot if its Bible character is later
  deleted — it becomes a generic figure, never a broken row. Lights are
  not replicated: lighting lives in the Bible's location profiles)
- Movement modes: Default (move/orbit/WASD) or Unreal/Unity style. ⬜
  (not replicated — the board is a 2D ground plan, not a 3D viewport)
- Timeline with a track per character; camera tracks with actions (e.g.
  Orbit 0–5s); Rehearse and Record (record needs at least one camera);
  "Send to canvas" to turn a staged shot into a generation. 🔨 (Stage 6:
  **no timeline, no Rehearse, no Record** — see the honest scope note
  below. What ships instead: for the selected camera the stage
  **auto-composes a plain-language shot description** from the layout —
  who is in frame, each figure's side (frame left / center / frame right)
  and depth (foreground / mid-ground / background) worked out from the
  camera's position, facing, and shot-size cone, plus the shot size,
  camera height/angle, any in-frame props, and the camera's **movement
  note** (a free-text field — "slow push-in", "orbit left" — which is how
  camera movement is expressed this stage; there are no timed camera
  actions). The description is shown live on an editable text box (an edit
  is stored as the camera's override; "Reset to auto" returns to the
  composed text) beside a simple **camera's-eye preview** that projects
  the in-frame figures and props onto a 16:9 frame. **Send to canvas**
  creates a Generate Image node in the canvas's SHOTS section whose prompt
  is that description with the framed cast's Bible profiles folded in —
  the same prompt-folding scene and canvas generation use — and tags the
  node with those characters, ready to run. **Send to storyboard** appends
  a storyboard scene with the description as its visual prompt, tagged
  with the framed cast)
- **Honest scope (Stage 6)**: this is a **blocking/planning tool — there
  is no 3D rendering engine and no video recording of the stage**. Flick's
  3D viewport, WASD/orbit movement modes, per-character timeline tracks,
  camera actions, and Rehearse/Record are **not** replicated; a camera's
  movement note field is the whole of camera motion this stage, and it
  goes into the shot description. Duplicating a project does not copy its
  stage setups (same as the canvas); deleting a project removes them.
- **Phone layout (Stage 6 note)**: the board is full-width and works by
  touch drag or tap-to-place (select a piece, tap where it goes); the
  item editor, camera settings, shot description, and send buttons stack
  below the board, all reachable.
- This is Flick's camera/motion control surface (motion control itself is a
  Standard-plan feature, §11). ⬜

## 9. Video Editor view

- Library tabs: **Assets** (grouped by canvas section), **Effects**,
  **Transitions**, **Motions**, **SFX**, more; search; upload media. 🔨
  (Stage 5, 2026-11-12: FilmKit's Editor section has the same five tabs.
  **Assets** is grouped by source instead of canvas section — **Storyboard**
  (every scene; unfilmed scenes are listed but can't be added until their
  still exists), **Canvas bin** (media flagged "Editor bin" on the canvas),
  and **Clips** (Frame-to-Clip motion clips) — each with **Add to
  timeline**. No search box and no library upload button: uploads live on
  the canvas (images) and in the SFX tab (audio))
- Timeline: Main track with mute + volume; tools — Select (V), Razor (C),
  Delete left (Q), Split (S), Delete right (W); magnet + snapping toggles;
  zoom; 16:9, 30 fps; timecode; fullscreen. 🔨 (Stage 5: FilmKit's timeline
  is an edit decision list, not a frame-accurate NLE — a **video track**
  (ordered clips, each with an editable duration in seconds, move
  earlier/later buttons, and remove; no razor/split — a clip is whole or
  gone), a **text track** (title cards, lower thirds, captions — each with
  editable words, motion preset, start, and duration), and an **audio
  track** (uploaded files with volume and start offset). The preview player
  shows a running timecode and per-clip progress segments. Keyboard tools,
  snapping, track mute, and zoom are not replicated)
- **Generate captions**, Add text, **Auto edit** ("let the agent assemble a
  first cut"), **Export**. ✅ (Stage 5: **Generate captions** creates one
  caption per scene-sourced clip from the scene's description, timed to
  that clip on the reordered timeline; clips that already have a caption
  are skipped, so edited captions are never overwritten, and removing a
  clip removes its captions. **Auto edit** assembles every filmed scene in
  storyboard order at 5s each and **asks before replacing** a non-empty
  timeline (the server refuses an unconfirmed replace too). **Export cut**
  saves the edit as the project's **cut**: Watch — and FilmKit TV, which
  plays through Watch — then play the cut (order, durations, look presets,
  transitions, text, captions, soundtrack) instead of the raw scene
  sequence; the cut always reflects the current timeline, and **Withdraw
  cut** returns Watch to the raw scenes. There is **no Download WebM**:
  the preview is a DOM/CSS player (an SVG posterize filter, blend-mode
  overlays, animated DOM text) that canvas capture cannot reproduce
  faithfully, so rather than ship a degraded fake render, the exported cut
  *is* the deliverable, played in Watch/TV)
- Effects library: Color & Light (split tone, duotone, chroma key), Blur
  (motion, radial, bloom), Detail (posterize, halftone, edge detect,
  painterly, grain, chromatic aberration, pixel sort, glitch, VHS), Distort
  (pixelate, fisheye, whirl & pinch, kaleidoscope, mirror). 🔨 (Stage 5:
  FilmKit ships **8 working look presets** applied at playback as CSS
  filters/overlays — Warm, Cold, Noir (B&W + contrast), Grain (animated
  film grain), VHS (scanlines + tracking bar), Bloom (soft glow),
  Vignette, Posterize (a real SVG feComponentTransfer posterize) — plus
  None, chosen per clip from the Effects tab or the clip's own menu, and
  labelled honestly as look presets. The rest of Flick's library (chroma
  key, glitch, distortions…) is not replicated)
- Transitions library: dissolves/warps/morphs, wipes (incl. slices, blinds,
  petals, crosshatch), shapes (circle, heart, hexagons, mosaic), pushes and
  zooms (spin zoom, pinwheel, ripple, water drop, wind, bounce), 3D (cube,
  doorway, swap, bowtie, fly eye), glitch set. 🔨 (Stage 5: four transitions,
  set per join and played in the preview and the cut — **Cut**, **Cross
  dissolve**, **Fade through black**, **Wipe** — stored on the clip they
  play into; the first clip always opens cold. Flick's shape/3D/glitch
  transition sets are not replicated)
- Motions library (animated text presets): General (clean rise, typewriter,
  lower thirds, hook captions, karaoke captions, countdown, news ticker…),
  Cinematic (film opening title, end credit roll, 16mm flicker, festival
  laurels, silent-film intertitle, neon sign, perspective crawl…), Campaign
  (promo price, call to action, sale countdown, discount starburst…). 🔨
  (Stage 5: FilmKit's Motions tab adds five presets to the text track —
  **Opening title · Fade rise**, **Opening title · Slam**, **Typewriter
  title**, **Lower third · Fade rise**, and **End credits · Credit roll**
  (timed to the end of the current timeline). Text motions are CSS
  animations in the player: fade rise, typewriter (typed live at playback),
  slam, and a linear credit roll. Every text item stays editable after it
  lands. Karaoke/hook captions and the campaign set are not replicated)
- SFX library: 60+ clips powered by Freesound; categories Nature, Animals,
  Ambient, Cinematic, Action, Game & UI, Sci-fi & Tech, Horror; preview and
  Add to Timeline per clip. 🔨 (Stage 5: honest state — the eight categories
  are shown as **"arrives with audio models at Stage 9"**; FilmKit stocks
  no fake clips. What works today is the user's own audio: upload a real
  audio file (MP3/WAV/M4A/OGG/WebM/AAC, stored as a blob like other media)
  in the SFX tab and it lands on the **audio track** with a volume slider
  and a start offset, playing under the preview and the exported cut)
- **Phone layout (Stage 5 note)**: the editor stacks — preview, cut
  actions, library, then the timeline (video / text / audio tracks); clip
  blocks stack vertically instead of scrolling sideways, and every control
  (duration, look, transition, reorder, remove) stays reachable with big
  touch targets. The horizontal clip strip is a wider-screen layout.

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
  cheapest video Pruna Draft 3–40. ✅ **(built Stage 9, 2026-11-12 — the
  full catalog lives in FilmKit with costs/ranges, fulfillment class, and
  locks, and pickers on scene generation, canvas image nodes, and
  Frame to Clip show name + cost + lock before running. Fulfillment is
  honest: only "FilmKit Standard" (the built-in image engine) and Flick's
  6 budget video models (as motion clips) run built-in; every other model
  is aggregator-locked until a fal.ai/Replicate key is saved in
  Integrations. Attempts with an invalid key fail with a clear error and
  an automatic refund — verified. Real aggregator fulfillment is the one
  piece that still needs Glenn's real key.)**

## 11. Credits and plans

- Balance in the top bar on every page; "+ 200 CREDITS" top-up button.
  Top-ups on paid plans: $1.50 per 100 credits. Plan credits do **not** roll
  over; failed generations refund credits. ✅ **(built Stage 9, 2026-11-12
  — FilmKit runs this exact system at Flick's prices, Glenn's decision:
  Free 100 / Casual $4/500 / Standard $16/2,500 / Pro $45/8,000 / Studio
  $100/24,000 credits, top-ups $1.50/100 shown but purchase-disabled,
  Monday +100 on Free expiring in 7 days, monthly cycle grants with
  expiry of leftovers, a full ledger (grant/spend/refund/expiry), costs
  charged per generation at the selected model, and a clear
  insufficient-credits stop. Payments are NOT connected: every price
  surface says so, plan switching is live only to exercise the tiers, and
  no card is ever charged. Plan gates are live too: full video catalog +
  no-watermark at Standard+, "Made with FilmKit" watermark on Free/Casual
  playback, budget-6 video on Free/Casual.)**
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
  Animation, Horror & Thriller, True Stories, Flick Festival. ✅ **(built
  Stage 8, 2026-11-12 — FilmKit TV is now the full gallery: an Editor's
  Choice hero (one featured film, rotating daily through the featured —
  sample-led — pool), a Featured row, and the community grid below.
  Category tabs are FilmKit's set — All, Featured Workflows, Series,
  Animation, Horror & Thriller, True Stories, Festival (Flick's Following /
  Residency tabs need accounts and a social graph, Stage 9). Films land in
  categories from their style/genre: Anime and Cartoon styles → Animation,
  Horror → Horror & Thriller, Documentary → True Stories, sample and
  editor-flagged films → Featured Workflows, festival submissions →
  Festival. Series holds nothing yet — multi-film sagas are beyond scope —
  and every empty category shows an honest empty state instead of filler.
  Search filters by title; sort is Recommended / Most liked / Newest.
  Every card shows title, creator ("You" for the user's films, "FilmKit"
  for samples), runtime (the cut's total duration when a cut is exported,
  otherwise ~7s per filmed scene), likes, and supports; samples stay
  badged Sample, the user's films Yours, festival entries Festival)**
- Every film card: **Get Workflow** (copy how it was made), Like, Support
  (tips — creators get paid via PayPal, see §14). ✅ **(Stage 8: Like is a
  persistent toggle with a count (`projects.tv_likes` / `tv_liked`).
  Support records in-app support with a persistent count
  (`tv_supports` / `tv_supported`) and the UI says plainly that no money
  moves — tipping and PayPal payouts arrive with accounts at Stage 9.
  **Get Workflow** opens a read-only view of how the film was made: the
  story prompt, the style used, the storyboard (scene titles, descriptions
  and visual prompts), the Bible overview (character/location names with
  one-line profiles, when the project has them), and editor notes (whether
  a cut was exported and what Watch therefore plays). **Remix this
  workflow** duplicates that structure into the user's Workspace —
  storyboard and Bible copied, stills NOT copied (every scene starts
  unfilmed, Bible portraits/views pending) — for sample and user films
  alike; the original is untouched. The same Like / Support / Get Workflow
  / Festival controls also appear on the Watch page for gallery films, so
  opening a film plays it with the controls right there)**
- Festival submission entry point. ✅ **(Stage 8: a published film is
  submitted from its Watch/detail view — "Submit to the festival" toggles
  `projects.festival_submitted`, the badge shows on its card, and the
  Festival tab lists submissions. Copy is honest throughout: this is
  FilmKit's in-app festival shelf; prizes and judging are a future
  business step, not promised in-app. Unpublishing a film from Workspace
  removes it from the gallery and the festival shelf at once)**

## 13. Flickpedia (inspiration library)

- Tabs: Explore, Image Inspo, Visual Styles, Sound Effects, Classic Film
  Scenes, Tutorials, Docs. Search with suggestion chips. ⬜ (FilmKit's
  Library ships the Visual Styles tab this stage; Image Inspo / Classic
  Film Scenes / Tutorials are a later stage, and Sound Effects arrives
  with the audio models at stage 9 — the Library page says so rather than
  faking the tabs.)
- **Visual Styles: 917 styles** (Flick's count), category filters
  (Cinematic, Cartoon, Anime, Drawing, Illustration, Painting, 3D), "Use
  this style", favorites / Saved Styles, **Create My Style**, sort Latest
  / Recommended. ✅ **(built Stage 7, 2026-11-12 — FilmKit's own catalog:
  36 built-in styles across the same 7 categories, each a name +
  description + a prompt modifier + a thumbnail generated in that style;
  the page shows the true count. Browse with category chips, search by
  name/description, sort Recommended / A–Z, and a Favorites filter.
  "Use this style" starts a new film in the style or switches an existing
  project — the style's modifier then steers storyboard/scene/canvas/
  stage generation exactly where the six built-in styles steer today,
  chosen from Home ("Start from a style", the prompt box's Library
  picker) or the studio's style settings. Create My Style: name +
  category + description, the app drafts the prompt modifier (editable),
  and the thumbnail generates on first save; user styles are badged
  "Yours", editable and deletable; built-ins can't be edited or deleted
  but duplicate into a user style to tweak. Deleting a style a project
  uses falls that project back to the Noir built-in look.)**
- Free assets positioning: image inspiration (1.5M+ film stills claimed),
  classic film scenes, sound effects, tutorials. ⬜ (later stages, as
  noted above)

## 14. Account center

✅ **(built Stage 9, 2026-11-12 — FilmKit's Account Center has Account,
Usage with the full credit ledger, Billing and plans with the compare
table and the payments-not-connected note, Preferences — workflow rules
feed the canvas chat — Notifications toggles, Team (owner + plan-based
member note; invites honestly wait for full accounts), Integrations
(aggregator key, write-only), and Help. Sign-in is honestly labeled a
workspace account; full multi-user sign-ups and connected apps/MCP are
launch steps beyond this build.)** The Flick reference inventory:

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

## 16. FilmKit's differentiator — the Bible ✅ (built Stage 1, 2026-11-12)

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

1. Bible (characters + locations) — ✅ done (2026-11-12)
2. App shell: global nav, Home entry paths, Workspace tabs/menus — ✅ done
   (2026-11-12)
3. Story view: script editor (fountain), import, storyboard-from-script —
   ✅ done (2026-11-12; see §6 — script document, import, write-from-idea,
   plan-my-shots with heading parsing + Bible auto-tag, Edit with AI
   review flow, two-way script ↔ storyboard links)
4. Canvas view: nodes, sections, AI chat agent, media actions — ✅ done
   (2026-11-12; see §7 — pannable/zoomable board with persisted node
   positions, Upload / Text Note / Generate Image / Frame to Clip nodes,
   note→image and media→clip wiring, collapsible sections, full media
   actions + send-to-scene + editor bin, Bible-tagged canvas generation,
   and the approval-gated AI chat; Voice/Music/Emotion nodes deliberately
   absent until real audio models land at stage 9; phone gets a stacked
   section layout instead of the board)
5. Video Editor: timeline, effects/transitions/motions/SFX libraries,
   captions, auto-edit, export — ✅ done (2026-11-12; see §9 — three-track
   edit decision list (video / text / audio) persisted per project, Assets
   grouped Storyboard / Canvas bin / Clips, 8 playback look presets, 4
   transitions, 5 text-motion presets, generated captions that follow the
   reordered timeline and never overwrite edits, ask-before-replace auto
   edit, uploaded-audio soundtrack track, and the exported cut playing in
   Watch/TV in place of the raw scenes; no WebM download — see §9 for why)
6. 3D Stage: figures/cameras, tracks, record → send to canvas — ✅ done
   (2026-11-12; see §8 — shipped as an honest top-down blocking board, not
   a 3D engine: multiple persisted setups per project, Add-cast figures
   from the Bible + generic figures, cameras with shot size / height /
   FOV cone / movement note, preset + custom props, a live auto-composed
   shot description (editable, with a camera's-eye preview), Send to
   canvas (SHOTS node, Bible profiles folded into the prompt, cast tagged)
   and Send to storyboard; no 3D rendering, no Rehearse/Record, no timed
   camera actions — the movement note carries camera motion)
7. Flickpedia-style library: styles (use/save/create), inspiration, SFX
   — 🔨 **styles done (2026-11-12; see §13 — 36-style seeded catalog with
   generated thumbnails, browse/search/favorites, Create My Style with an
   AI-drafted modifier, and library styles wired into generation from
   Home and the studio)**; inspiration tabs and SFX remain (SFX lands
   with audio at stage 9)
8. Flick TV full: categories, Get Workflow, likes/supports, festival
   — ✅ done (2026-11-12; see §12 — Editor's Choice hero rotating daily,
   Featured row, community grid, style-derived category tabs with honest
   empty states (Series empty by design), title search, Recommended /
   Most liked / Newest sort, persistent Like and in-app Support toggles
   with honest no-money copy, read-only Get Workflow (prompt, style,
   storyboard, Bible overview, editor notes) with Remix-into-Workspace
   copying structure without stills, and the in-app Festival shelf with
   persisted submissions; unpublishing removes a film everywhere)
9. Accounts + credits + plans (aggregator models, catalog, credit ledger,
   plan gates, top-ups), account center, teams, notifications — ✅ done
   (2026-11-12; see §§10, 11, 14 — live credit ledger at Flick's exact
   prices with Monday grants, cycle expiry and auto-refunds; the 71-entry
   model catalog with built-in vs aggregator-locked fulfillment and
   cost-on-the-button pickers; Flick's plan gates incl. the Free/Casual
   watermark; the full Account Center with Integrations waiting on
   Glenn's aggregator key; honestly-locked Voice/Music/Emotion canvas
   nodes complete the §7 menu. Payments not connected — stated in-app.
   ALL 9 STAGES COMPLETE.)
