# WhatHaveIWatched

Collaborative media-tracking app for watchparties and friend groups. Track movies and TV shows together in real time.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | [SpacetimeDB](https://spacetimedb.com) (Rust module, self-hosted) |
| Frontend | Next.js 16 (App Router, Turbopack) |
| Real-time | SpacetimeDB WebSocket subscriptions |
| Media data | [TMDB API](https://www.themoviedb.org/) |

## Features

- Create boards and invite friends via a shareable link
- Search for movies and TV shows (including full season/episode breakdown)
- Track watched status per-item, per-person — updated live across all connected clients
- Board owner controls: update details, regenerate invite link, remove participants, delete board
- No account required — anonymous identity tokens, just enter a display name

## Project structure

```
module/          Rust SpacetimeDB module (tables + reducers)
frontend/        Next.js app
  app/           Pages (App Router)
  components/    UI + canvas components
  lib/           Helpers (db connection, importMedia, theme)
  src/module_bindings/  Auto-generated TypeScript bindings
```

## Development

### Prerequisites

- Rust + `wasm32-unknown-unknown` target
- Node.js 20+
- SpacetimeDB CLI (`spacetime`)
- A running SpacetimeDB instance (local or remote)
- TMDB API read access token

### Frontend

```bash
cd frontend
cp .env.local.example .env.local   # fill in your values
npm install
npm run dev
```

### Module

```bash
cd module
cargo build --target wasm32-unknown-unknown --release
spacetime publish --server <your-server> whathaveiwatched
```

### Environment variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SPACETIMEDB_HOST=wss://<your-spacetimedb-host>
NEXT_PUBLIC_SPACETIMEDB_DB=whathaveiwatched
TMDB_READ_ACCESS_TOKEN=<your-tmdb-read-access-token>
```

## Acknowledgements

This product uses the TMDB API but is not endorsed or certified by TMDB.
