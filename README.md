# IHaveWatched

Collaborative media-tracking app for watchparties and friend groups. Track movies and TV shows together in real time.

## Tech stack

| Layer | Technology |
|---|---|
| Backend | [SpacetimeDB](https://spacetimedb.com) (Rust module, self-hosted Docker) |
| Frontend | Next.js 16 (App Router, Turbopack) |
| Canvas | react-konva (zoomable, pannable node canvas) |
| Real-time | SpacetimeDB WebSocket subscriptions (`spacetimedb` SDK v2.2.0) |
| Media data | [TMDB API](https://www.themoviedb.org/) (fetched server-side via Next.js route handlers) |

## Features

- Create boards and invite friends via a shareable invite link
- Search for movies and TV shows (including full season/episode breakdown)
- Import full TV franchises — show, seasons, and episodes are all tracked as individual nodes
- Track watched status per-item, per-person — updated live across all connected clients
- Zoomable node canvas with collapse levels (episode → season → show)
- Watch chips on every node showing each participant's watch state at a glance
- Drill-down drawer for per-episode watch toggles
- Board owner controls: update details, regenerate invite link, remove participants, delete board
- View-only public sharing mode
- **No account required** — anonymous SpacetimeDB identity tokens, just enter a display name

## Project structure

```
module/                 Rust SpacetimeDB module (tables + reducers)
  src/
    lib.rs              Module entry point
    tables/             6 table definitions (Account, Board, Participant,
                        MediaItem, WatchEntry, WatchAggregate)
    reducers/           13 reducers (auth, board CRUD, participant mgmt,
                        watch tracking)
    procedures/         Placeholder (TMDB fetching is client-side, not
                        via module procedures)
    helpers/            Auth guards, watch tree helpers, crypto

frontend/               Next.js 16 app
  app/                  App Router pages
    page.tsx            Dashboard / board list
    layout.tsx          Root layout + theme script
    providers.tsx       Theme + SpacetimeDB providers
    signin/             Display name entry
    callback/           OAuth redirect safety-net
    boards/new/         Create board
    board/[boardId]/
      page.tsx          Board canvas (main view)
      join/             Participant join via invite link
      settings/         Board settings (owner only)
    api/tmdb/
      search/route.ts       TMDB search proxy
      fetch/route.ts        TMDB metadata fetch proxy
  components/
    canvas/             BoardCanvas, NodeCard, WatchChips, EdgeLayer,
                        DrillDownDrawer, ContextMenu, Tooltip
    board/              AddMediaSearch
    ui/                 Button, Input, Modal, Spinner, ThemeToggle,
                        ConnectionBanner
  lib/
    db/
      connection.ts     Identity token + display name localStorage management
      importMedia.ts    TMDB fetch + reducer orchestration
    canvas/layout.ts    computeLayout — zoom levels, lane allocation, node dimensions
    hooks/
      useCanvasCamera.ts  Pan, zoom, fit-to-view
      useKonvaImage.ts    Async poster loading with cache
    theme.ts            Light/dark theme token maps
    avatarColor.ts      Deterministic colour from identity hex
    tmdb.ts             TMDB image base URL helper
  src/module_bindings/  Auto-generated TypeScript bindings (do not edit)
```

## Development

### Prerequisites

- Rust + `wasm32-unknown-unknown` target
- Node.js 20+
- SpacetimeDB CLI (`spacetime`)
- A running SpacetimeDB instance (local via Docker, or remote)
- TMDB API read access token ([register here](https://www.themoviedb.org/settings/api))

### Frontend

```bash
cd frontend
cp .env.local.example .env.local   # fill in your values
npm install
npm run dev     # → http://localhost:3000
```

### Module

```bash
cd module
cargo build --target wasm32-unknown-unknown --release
spacetime publish --server <your-server> whathaveiwatched

# After publishing, regenerate TypeScript bindings:
cd ../frontend
spacetime generate --lang typescript --out-dir src/module_bindings \
  --server <your-server> whathaveiwatched
```

### Environment variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SPACETIMEDB_HOST=wss://<your-spacetimedb-host>
NEXT_PUBLIC_SPACETIMEDB_DB=whathaveiwatched
TMDB_READ_ACCESS_TOKEN=<your-tmdb-read-access-token>
```

### Build & verify

```bash
cd frontend && npm run build   # must pass with no type errors
```

## Auth model

This app uses **anonymous SpacetimeDB identities** — no OAuth, no passwords.

1. On first visit, enter a display name → stored in `localStorage`
2. SpacetimeDB automatically issues an anonymous `Identity` + private token
3. The token is persisted in `localStorage` under `ihw_identity_token`
4. On return visits, the stored token restores the same identity
5. Participants join boards via invite links with a separate display-name entry

All state (boards created, watch progress) is tied to the device holding the token.

## Deployment

The frontend is deployed to a home server (Fedora MiniPC) via Tailscale + GitHub Actions rsync, running under pm2. See `.github/workflows/deploy-frontend.yml`.

The SpacetimeDB module runs in a Docker container on the same home server, persisted at `/var/lib/spacetime`.

## Acknowledgements

This product uses the TMDB API but is not endorsed or certified by TMDB.
