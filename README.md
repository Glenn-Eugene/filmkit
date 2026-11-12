# FilmKit

A working mini version of an AI filmmaking platform, inspired by flick.art —
original branding and copy. Type a story, get a film.

## What it does

1. **Prompt** — enter a story idea on the cinematic landing page and pick a
   style (Noir, Sci-Fi, Western, Anime, Documentary, Horror).
2. **Storyboard** — the app writes a storyboard of 4–6 scenes (title,
   description, visual prompt per scene). Scenes can be edited, added,
   deleted, and reordered in the studio.
3. **Generate** — each scene gets an AI-generated cinematic still in the
   chosen style.
4. **Watch** — a built-in player plays the scenes in sequence as one short
   film (stills with a slow pan/zoom, scene captions, pause / next / back).
5. **Save + gallery** — films persist in *My films*; *FilmKit TV* is a
   browsable gallery that starts with three labeled sample films.

## Mini-version limits

- Scenes are generated **stills**, not video clips — real video generation
  (via an aggregator API such as fal.ai or Replicate) is a later step.
- No accounts, payments, or credit purchases. The model layer is shaped as a
  catalog (per-model credit cost + tier) running as one built-in free plan,
  so paid plans can be added without rebuilding the model side.

## Layout

- `client/` — the web UI (React + Vite-style build via `client/build.mjs`)
- `server/` — the app server and data actions (`server/src/`)
- `drizzle/` — database migrations
- `DATA-PLAN.md` — the data model notes

## Notes on this snapshot

Binary/generated assets (`client/src/assets/hero.jpg`, `icon.webp`), build
output (`dist/`), the local database (`app.db`), and generated media blobs
are not in this snapshot — the app code is.
