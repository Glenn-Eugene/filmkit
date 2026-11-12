# Data Plan

## Context provenance
- `Build a working mini version` of flick.art (verbatim build request; the full core loop must function, not a mockup)
- `You direct. AI films it.` — brief-supplied headline direction, original copy, no Flick branding/text reused
- Brief-required sample films: `the user's own plus a few clearly-labeled sample films to make the gallery feel alive on first open` (explicitly requested persisted sample content, seeded once via post-submit action)
- Brief out-of-scope list: no accounts, no payments, no editor timeline, no festival — trimming is scene order/delete only

## Tested sources
### ctx.inference.complete (storyboard writing)
**Used by**: `createProject` — turns a story prompt + style into a film title and 4–6 scenes (title, one-line description, visual generation prompt)
**Test command**: `bun /opt/muse/assets/spaces/ts-runtime/dist/probe-ctx.js < /tmp/probe-inference.ts`
**Sample output**: `{"title":"What the Light Calls","scenes":[{"title":"The Nightly Vigil","description":"A solitary keeper begins his nightly ritual...","visualPrompt":"Cinematic black-and-white film still, film noir..."}, ...5 scenes total]}` — schema-validated structured output, ~16s
**Processing**: zod schema enforces title + scenes array; scene count clamped to 4–6 in the prompt; visualPrompt is stored per scene and later combined with the project's style string when generating the still.

### ctx.tool.generate_media (scene stills)
**Used by**: `generateScene` (per-scene cinematic still, landscape 16:9) and `seedSamples` (sample-film stills)
**Test command**: probe-ctx run of a snippet calling `ctx.tool.generate_media(prompt, { orientation: "landscape" })`
**Sample output**: probe mode returns `ctx.tool.generate_media is not available in probe mode — requires a built web artifact` — the SDK type (`GeneratedMedia { blobKey, url, contentType, bytes }`, own-origin `./blobs/<key>` URL, stored in this space's ctx.blobs) is the contract; it will be verified for real in Build via `artifact.invoke_action` on `generateScene` and the audit. No video generation exists in the runtime tool surface, so the player uses the brief-sanctioned fallback: generated stills with a slow cinematic pan/zoom (Ken Burns), captions, and scene sequencing.
**Processing**: prompt = scene visualPrompt + style suffix (per-style cinematic look string) + `cinematic film still, 16:9, no text`; returned blobKey persisted on the scene row; status flips pending → generating → ready/failed.

### Build-time hero image (media.generate_image)
**Used by**: landing hero — one original cinematic film-still-style image generated at build time into `client/src/assets/`, imported by the client. Not a real film still and not Flick content; an original generated illustration in a photographic cinematic style for the hero backdrop.

## Long-term data behavior
- **Refresh policy**: none — all data is user-created at runtime; no external feed.
- **Growth**: one project row per film, one scene row per scene; images live in ctx.blobs, only blob keys in the DB.
- **Ordering**: projects newest-first in "My films"; gallery shows sample films plus finished user films; scenes ordered by position.
- **Time semantics**: created_at is a creation instant, rendered viewer-local.

## Rejected approaches
- **Tried**: runtime video generation per scene
  **Why rejected**: the runtime tool surface (`SpaceToolClient`) exposes image generation only — no video. Player falls back to Ken Burns pan/zoom over stills, which the brief explicitly allows.
- **Tried**: probing generate_media before build
  **Why rejected**: probe mode refuses it (`requires a built web artifact`); verified instead through the built artifact's actions during audit.
