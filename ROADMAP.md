# IHaveWatched — Development Roadmap

| Field | Value |
|---|---|
| **Document title** | IHaveWatched Development Roadmap |
| **Document type** | Project planning (informative; not part of the specification) |
| **Status** | Draft — architecture finalised |
| **Companion specification** | [`SPEC.md`](./SPEC.md) |
| **Last updated** | 2026-05-20 |

> **⚠️ Status: implementation has diverged from this roadmap.**
> - Module language: **Rust**, not TypeScript (SpacetimeDB v1.0 Rust SDK)
> - Auth: **Anonymous SpacetimeDB identities**, not SpacetimeAuth/Google OAuth
> - TMDB import: **Client-side fetch → reducer** pattern, not SpacetimeDB Procedures
> - Deployment: **Self-hosted Docker** (home server), not Vercel + Maincloud
> See the root [`README.md`](./README.md) and [`AGENTS.md`](./AGENTS.md) for the current architecture.

This document covers repository structure, milestones, and workstream breakdown. For the product and data model specification see [`SPEC.md`](./SPEC.md).

---

## 1. Architecture Summary (current)

```
┌──────────────────────────────────────────────────────────┐
│  Next.js 16 (Home server, pm2) — frontend only           │
│  ├─ App Router (pages, layout)                           │
│  ├─ react-konva canvas (board view)                      │
│  ├─ SpacetimeDB React hooks (useTable, useReducer)       │
│  └─ /api/tmdb/{search,fetch}  ← Route Handlers (proxy)  │
└───────────────────┬──────────────────────────────────────┘
                    │  WebSocket (SpacetimeDB SDK v2.2.0)
┌───────────────────▼──────────────────────────────────────┐
│  SpacetimeDB Module (Rust) — self-hosted Docker           │
│  ├─ Tables: Account, Board, Participant,                  │
│  │          MediaItem, WatchEntry, WatchAggregate         │
│  ├─ 13 reducers: register_owner, board CRUD,              │
│  │   join/remove participant, set_watch/bulk,             │
│  │   reset_progress, insert_movie, insert_tv_show,        │
│  │   remove_media_item                                    │
│  └─ 0 procedures (TMDB fetching is client-side)           │
└──────────────────────────────────────────────────────────┘
```

**Key architectural properties:**
- Next.js is a pure frontend — no DB access from Server Components or Route Handlers (except the TMDB proxy routes)
- Auth is **anonymous SpacetimeDB identities** (no OAuth, no SpacetimeAuth)
- TMDB data is fetched client-side via Next.js API routes, then passed into `insert_movie` / `insert_tv_show` reducers
- All board data arrives via WebSocket subscriptions (`useTable`)
- Real-time updates are built-in from v1 — no polling, no SSE setup required
- Board pages are client-rendered (no SSR for dynamic board data)

---

## 2. Repository Structure (current)

```
IHaveWatched/
├── README.md
├── SPEC.md                    # Spec (stale — see notes above)
├── ROADMAP.md
├── AGENTS.md                  # Agent instructions (source of truth for current architecture)
├── entities.json
├── mempalace.yaml
│
├── module/                    # SpacetimeDB Rust module
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs             # module entry
│   │   ├── errors.rs          # ReducerError enum
│   │   ├── tables/
│   │   │   ├── account.rs
│   │   │   ├── board.rs
│   │   │   ├── participant.rs
│   │   │   ├── media_item.rs
│   │   │   ├── watch_entry.rs
│   │   │   └── watch_aggregate.rs
│   │   ├── reducers/
│   │   │   ├── auth.rs        # register_owner
│   │   │   ├── board.rs       # create/update/delete_board, regenerate_invite
│   │   │   ├── participant.rs # join_board, remove_participant
│   │   │   └── watch.rs       # set_watch, set_watch_bulk, reset_progress
│   │   ├── procedures/
│   │   │   └── tmdb.rs        # insert_movie, insert_tv_show, remove_media_item (all sync reducers)
│   │   └── helpers/
│   │       ├── auth.rs        # assert_board_owner, assert_board_member
│   │       ├── watch.rs       # collect_leaf_ids, recompute_aggregates, upsert_watch_entry
│   │       └── crypto.rs      # generate_random_token
│   └── target/
│
├── frontend/                  # Next.js 16 app
│   ├── app/
│   │   ├── layout.tsx         # Root layout + dark-theme inline script
│   │   ├── page.tsx           # Dashboard / board list
│   │   ├── providers.tsx      # Theme + SpacetimeDB providers
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   ├── globals.css
│   │   ├── signin/page.tsx    # Display name entry
│   │   ├── callback/page.tsx  # OAuth redirect safety-net (dead route)
│   │   ├── boards/new/page.tsx
│   │   ├── board/[boardId]/
│   │   │   ├── page.tsx       # Board canvas (main view)
│   │   │   ├── join/page.tsx  # Participant join via invite link
│   │   │   └── settings/page.tsx
│   │   └── api/tmdb/
│   │       ├── search/route.ts  # TMDB search proxy
│   │       └── fetch/route.ts   # TMDB metadata fetch proxy
│   ├── components/
│   │   ├── canvas/            # BoardCanvas, NodeCard, WatchChips, EdgeLayer,
│   │   │                      # DrillDownDrawer, ContextMenu, Tooltip
│   │   ├── board/             # AddMediaSearch
│   │   └── ui/                # Button, Input, Modal, Spinner, ThemeToggle, ConnectionBanner
│   ├── lib/
│   │   ├── db/connection.ts   # Identity token + display name localStorage management
│   │   ├── db/importMedia.ts  # TMDB fetch + reducer orchestration
│   │   ├── canvas/layout.ts   # computeLayout — zoom levels, lane allocation
│   │   ├── hooks/useCanvasCamera.ts, useKonvaImage.ts
│   │   ├── theme.ts           # Light/dark theme token maps
│   │   ├── avatarColor.ts     # Deterministic colour from identity hex
│   │   └── tmdb.ts            # TMDB image base URL helper
│   ├── src/module_bindings/   # Auto-generated by `spacetime generate` (do not edit)
│   ├── .env.local.example
│   ├── next.config.ts
│   └── tsconfig.json
│
└── .github/workflows/
    ├── deploy-frontend.yml    # rsync to home server via Tailscale
    └── README.md              # Deploy workflow docs
```

---

## 3. Workstreams

| # | Workstream | Primary area | Phase 1 deliverable |
|---|---|---|---|
| W1 | Module scaffold | `module/src/tables/*.rs`, `lib.rs` | All 6 tables defined; module deploys to local SpacetimeDB |
| W2 | Core reducers | `module/src/reducers/*.rs` | All reducers implemented and tested locally |
| W3 | TMDB import reducers | `module/src/procedures/tmdb.rs` | `insert_movie` + `insert_tv_show` reducers + TMDB fetch API routes |
| W4 | Next.js scaffold | `app/`, `providers.tsx` | SpacetimeDB connection live in browser; auth flow (anonymous identity) working |
| W5 | Board management UI | `app/board/`, board reducers | Create/view/delete boards; invite link generation |
| W6 | TMDB search UI | `components/board/AddMediaSearch`, `/api/tmdb/search` | Search + trigger import; MediaItems appear in subscription |
| W7 | Canvas rendering | `components/canvas/`, `lib/canvas/layout.ts` | Nodes rendered on react-konva canvas; pan + pinch-zoom |
| W8 | Zoom collapse | `computeLayout` zoom levels, node components | 3-level collapse (episode → season → show) |
| W9 | Watch tracking | `set_watch` reducer, WatchAggregate helpers | Mark watched per title/episode; state pushes to all clients |
| W10 | Watch overlay | `WatchChips`, `NodeCard` | Per-participant chips on each node; aggregate on collapsed |
| W11 | Participant join | `join_board` reducer, `app/board/[id]/join/` | Guest joins via invite link; anonymous identity persisted |
| W12 | Sharing modes | `update_board` reducer, settings page | PRIVATE / PUBLIC toggle; public view-only route |

W1–W2 are prerequisites for W3–W6. W4 is prerequisite for W5–W12. W6 is prerequisite for W7. W7 is prerequisite for W8, W10. W9 depends on W7 + W11.

---

## 4. Phase 1 Milestones

### M0 — Environment setup (days 1–2)

- [ ] Install SpacetimeDB CLI: `curl -sSf https://install.spacetimedb.com | sh`
- [ ] `cargo init --lib module` — scaffold Rust module; add `spacetimedb = "1"` to `Cargo.toml`
- [ ] `npx create-next-app` with TypeScript + Tailwind + App Router
- [ ] Install frontend deps: `spacetimedb`, `react-konva`, `konva`, `sonner`, `@radix-ui/*`
- [ ] `.env.local.example` with all required variables documented
- [ ] SpacetimeDB Docker container running on home server; `spacetime start` working locally
- [ ] Home server (Fedora MiniPC) set up with Docker, Node.js, pm2, Tailscale

### M1 — Module: tables + reducers (days 2–5)

- [ ] All 6 tables defined in `module/src/tables/*.rs` with `#[table(name = ..., public)]`
- [ ] All 13 reducers implemented in `module/src/reducers/` + `module/src/procedures/tmdb.rs`
- [ ] Module compiles: `cargo build --target wasm32-unknown-unknown --release`
- [ ] Module deploys locally; `spacetime generate` produces TypeScript `module_bindings/`
- [ ] Manual reducer tests via `spacetime call` CLI

### M2 — TMDB import (days 5–7)

- [ ] `GET /api/tmdb/fetch` Next.js Route Handler proxies TMDB API (server-side key)
- [ ] `insert_movie` reducer: validates owner, deduplicates, inserts FILM MediaItem
- [ ] `insert_tv_show` reducer: inserts SHOW → SEASON → EPISODE tree with correct `parent_id` hierarchy
- [ ] `remove_media_item` reducer: cascading delete of item + all descendants
- [ ] `importMedia` client helper: fetches TMDB data → calls correct reducer
- [ ] `chrono_order` initialised from `air_date` in both reducers

### M3 — Next.js: connection + auth (days 7–9)

- [ ] `SpacetimeDBProvider` configured in `app/providers.tsx` (defers to client mount)
- [ ] `lib/db/connection.ts`: identity token + display name localStorage management
- [ ] `DbConnection.builder()` initialised with anonymous token (no OAuth)
- [ ] On connect: SDK emits identity + token → stored in `localStorage`
- [ ] Sign-in page at `/signin`: enter display name → stored → redirect to `/`
- [ ] Dashboard auto-calls `register_owner` reducer on mount
- [ ] Auth mode detection: owner (has `Account` row) vs participant (has `Participant` row) vs public

### M4 — Board management (days 9–12)

- [ ] Dashboard on `/` — `useTable(tables.board)` filtered by owner identity and joined boards
- [ ] Create board wizard at `/boards/new` — calls `create_board` reducer
- [ ] Board page at `/board/[boardId]` — client-rendered; subscribes to board + media items + participants + watches
- [ ] Board settings at `/board/[boardId]/settings` — `update_board`, `delete_board`, `regenerate_invite`

### M5 — TMDB search + import UI (days 12–15)

- [ ] `/api/tmdb/search` Route Handler — proxies TMDB `/search/multi`; API key server-side
- [ ] `AddMediaSearch` component — debounced input, type filter pills, result list, add button
- [ ] Import button calls `importMedia()` helper: fetches via `/api/tmdb/fetch`, then calls `insertMovie`/`insertTvShow` reducer
- [ ] `MediaItem` rows appear in real-time via WebSocket subscription
- [ ] Handles both `MOVIE` and `TV` types (full season/episode breakdown for TV)
- [ ] TMDB attribution in footer

### M6 — Canvas rendering (days 15–20)

- [ ] `BoardCanvas` component: react-konva `Stage` + `Layer`; fullscreen
- [ ] `lib/canvas/layout.ts`: `computeLayout` — filter by zoom level, sort by chrono_order, greedy lane assignment, node dimensions
- [ ] `NodeCard` component: single unified card with poster, title, subtitle, watch state badge, type badge
- [ ] `WatchChips` component: per-participant avatar circles with initials
- [ ] `EdgeLayer`: connector lines between chronologically adjacent nodes within a lane
- [ ] `useCanvasCamera` hook: pan (drag), scroll-wheel zoom, pinch-to-zoom, fit-to-view
- [ ] `DrillDownDrawer`: slide-out panel for per-episode watch toggles under a season/show node
- [ ] `ContextMenu`: right-click actions (mark watched/unwatched, mark all up to here, remove)
- [ ] `Tooltip`: hover tooltip on nodes
- [ ] Layers: `bg-layer`, `edge-layer`, `node-layer`, `ui-layer`

### M7 — Zoom-level collapse (days 20–24)

- [ ] `computeLayout` zoom levels: `EPISODE` (≥0.5), `SEASON` (0.25–0.49), `SHOW` (<0.25)
- [ ] `filterForLevel`: at EPISODE zoom, show EPISODE + FILM nodes; at SEASON zoom, show SEASON + ARC + FILM; at SHOW zoom, show SHOW + FILM
- [ ] Collapsed nodes show aggregate watch state from `WatchAggregate` rows
- [ ] Zoom label displayed in board header
- [ ] Scale change triggers `useMemo` re-layout (no animation yet — Phase 2)

### M8 — Participant join flow (days 24–26)

- [ ] `/board/[boardId]/join?invite=<token>` page — display name input form with error handling
- [ ] On submit: call `join_board(board_id, invite_token, display_name)` reducer
- [ ] Participant state stored in `localStorage` as `ihw_participant_<boardId>` (JSON with display name + timestamp)
- [ ] On return visits: stored state restored; board page shows participant's watch state
- [ ] Owner board page lists all participants; owner can remove participants from settings

### M9 — Watch tracking (days 26–29)

- [ ] Board page subscribes to `watch_entry` and `watch_aggregate` tables for the board
- [ ] Click on EPISODE/FILM node: toggle watched for current identity via `set_watch` reducer
- [ ] Click on SEASON/SHOW node: open `DrillDownDrawer` with per-episode checkboxes
- [ ] Watch propagation: `set_watch` reducer walks descendants via `collect_leaf_ids`, upserts `WatchEntry` per leaf, then `recompute_aggregates` walks ancestors
- [ ] `WatchAggregate` rows provide watched_count/total_count for non-leaf nodes
- [ ] Partial progress bar and visual state shown on `NodeCard` (coloured border, checkmark badge, partial bar)

### M10 — Watch overlay + sharing (days 29–32)

- [ ] `WatchChips`: row of coloured avatar circles per participant on each node (max 5, +N overflow)
- [ ] Colour assignment: deterministic from participant identity hex hash via `avatarColor.ts`
- [ ] Node border colour reflects current user's watch state (green = WATCHED, amber = PARTIAL, grey = UNWATCHED)
- [ ] Checkmark badge on WATCHED nodes
- [ ] Partial bar at bottom of PARTIAL nodes
- [ ] Board sharing mode toggle (PRIVATE / PUBLIC) in settings
- [ ] Public view via `/board/[boardId]?view=public`: read-only, watch chips visible but interactions disabled
- [ ] Auth mode detection in board page: owner → full controls, participant → watch toggles only, public → read-only

---

## 5. Near-term Pre-coding Tasks

Before writing production code (historical — most of these are now resolved):

1. ~~**Confirm SpacetimeAuth Google OAuth setup**~~ — **Resolved**: Switched to anonymous SpacetimeDB identities. No OAuth needed.
2. ~~**Procedure beta assessment**~~ — **Resolved**: TMDB import uses `insert_movie`/`insert_tv_show` reducers (client-side fetch + reducer), not SpacetimeDB Procedures.
3. **react-konva pinch-zoom** — implement a minimal pinch-to-zoom prototype (`Konva.hitOnDragEnabled = true` + custom `touchmove` handler) before building the full canvas. This is the most mobile-critical interaction.
4. **TMDB API key** — register at [themoviedb.org](https://www.themoviedb.org/settings/api); store in `.env.local` (server-side only, never exposed to client).
5. **Resolve SPEC Q2** (anonymous identity token expiry) — Store the SpacetimeDB-issued token in `localStorage` and handle expiry on reconnect. Currently implemented as `ihw_identity_token` in `connection.ts`.

---

## 6. Definition of Done — Phase 1

Phase 1 is complete when all of the following hold:

- [ ] A board owner can sign in (enter display name), create a board, and import a TV franchise from TMDB
- [ ] Imported media is displayed as a react-konva node canvas with correct chronological ordering
- [ ] Zoom-level collapse works across at least 3 levels (episode → season → show)
- [ ] A named participant can join via invite link (entering only a display name) and mark titles/episodes watched without creating an account
- [ ] Watch state updates appear in real-time on all connected clients without page refresh
- [ ] Watch state is reflected on canvas nodes with per-participant avatar chips
- [ ] A board can be made public (view-only) or kept private
- [ ] The Next.js frontend is deployed and reachable; the SpacetimeDB module is live (self-hosted Docker)
- [ ] TMDB attribution is displayed in the footer
- [ ] No secrets (TMDB API key) are committed to the repository
- [ ] The app is usable on mobile (pinch-to-zoom, tap to mark watched)

---

## 7. Future — Phase 2 and Beyond

### Phase 2 — Polish

- [x] "Mark all watched up to here" bulk action (`set_watch_bulk` reducer + context menu)
- [x] Participant management UI (owner removes a participant from settings)
- [ ] Animated zoom transitions (Konva Tween)
- [ ] Parallel lane auto-layout for chronologically concurrent titles
- [ ] Board cover image / customisation
- [ ] Mobile-optimised layout improvements
- [ ] `reset_progress` UI (participant clears their own watch history)

### Phase 3 — Extended features

- Community fandom chronology presets (MCU order, Machete Order, etc.)
- Arc-level grouping (auto-derived from TMDB season half-breaks, or manual)
- Export board as shareable image
- Board templates (pre-populated franchises)
- Multiple boards per owner (already supported by data model; needs UI management)
- VPS deployment migration (home server → Azure VM or similar)

### Deployment migration path (home server → VPS)

When VPS hosting becomes necessary:
1. Deploy SpacetimeDB Docker image on a VPS (e.g. Azure VM) with a persistent volume
2. Re-publish the module: `spacetime publish --server <vps-url> whathaveiwatched`
3. Update `NEXT_PUBLIC_SPACETIMEDB_HOST` in frontend env vars
4. Update deploy workflow target (change `DEPLOY_HOST`)
5. Investigate SpacetimeDB data export/backup strategy before migration
