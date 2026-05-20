/// TMDB import reducers.
///
/// SpacetimeDB reducers are synchronous — they cannot make outbound HTTP calls.
/// The correct pattern is:
///   1. The client calls the Next.js API route `/api/tmdb/fetch` which does the
///      HTTP requests to TMDB and returns structured data.
///   2. The client then calls `insert_movie` or `insert_tv_show` with that data.
///
/// This keeps all TMDB I/O outside the module while the module owns data integrity.

use spacetimedb::{reducer, ReducerContext, Table};
use crate::tables::MediaItem;
use crate::tables::media_item::media_item;
use crate::helpers::auth::assert_board_owner;

fn poster_url(path: &str) -> String {
    if path.is_empty() { String::new() }
    else { format!("https://image.tmdb.org/t/p/w300{}", path) }
}

fn date_to_chrono_order(date: &str) -> f64 {
    chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d")
        .map(|d| d.signed_duration_since(
            chrono::NaiveDate::from_ymd_opt(2000, 1, 1).unwrap()
        ).num_days() as f64)
        .unwrap_or(f64::MAX)
}

fn current_ms(ctx: &ReducerContext) -> u64 {
    ctx.timestamp.to_micros_since_unix_epoch() as u64 / 1000
}

// ---------------------------------------------------------------------------
// Movie import (single item)
// ---------------------------------------------------------------------------

#[reducer]
pub fn insert_movie(
    ctx: &ReducerContext,
    board_id: u64,
    tmdb_id: i64,
    title: String,
    overview: String,
    poster_path: String,
    release_date: String,
) -> Result<(), String> {
    assert_board_owner(ctx, board_id).map_err(|e| e.to_string())?;

    // Deduplicate
    if ctx.db.media_item().iter()
        .any(|m| m.board_id == board_id && m.tmdb_id == tmdb_id && tmdb_id != 0)
    {
        return Ok(());
    }

    let now = current_ms(ctx);
    ctx.db.media_item().insert(MediaItem {
        id: 0,
        board_id,
        tmdb_id,
        tmdb_type: "MOVIE".into(),
        media_type: "FILM".into(),
        title: title.trim().to_string(),
        overview: overview.trim().to_string(),
        poster_url: poster_url(&poster_path),
        air_date: release_date.clone(),
        chrono_order: date_to_chrono_order(&release_date),
        parent_id: 0,
        lane_index: 0,
        canvas_x: 0.0,
        canvas_y: 0.0,
        added_by: ctx.sender,
        created_at: now,
    });
    Ok(())
}

// ---------------------------------------------------------------------------
// TV Show import — show + seasons + episodes passed as JSON blobs
// ---------------------------------------------------------------------------

/// Represents one season's worth of data as passed from the client.
/// Fields are plain strings / numbers to avoid needing serde on the wire.
#[derive(spacetimedb::SpacetimeType, serde::Deserialize)]
pub struct SeasonPayload {
    pub season_number: u32,
    pub title: String,
    pub overview: String,
    pub poster_path: String,
    pub air_date: String,
    pub episodes: Vec<EpisodePayload>,
}

#[derive(spacetimedb::SpacetimeType, serde::Deserialize)]
pub struct EpisodePayload {
    pub episode_number: u32,
    pub title: String,
    pub overview: String,
    pub air_date: String,
}

#[reducer]
pub fn insert_tv_show(
    ctx: &ReducerContext,
    board_id: u64,
    tmdb_id: i64,
    show_title: String,
    show_overview: String,
    show_poster_path: String,
    first_air_date: String,
    seasons: Vec<SeasonPayload>,
) -> Result<(), String> {
    assert_board_owner(ctx, board_id).map_err(|e| e.to_string())?;

    // Deduplicate show
    if ctx.db.media_item().iter()
        .any(|m| m.board_id == board_id && m.tmdb_id == tmdb_id && tmdb_id != 0)
    {
        return Ok(());
    }

    let now = current_ms(ctx);

    // Insert show row
    let show_row = ctx.db.media_item().insert(MediaItem {
        id: 0,
        board_id,
        tmdb_id,
        tmdb_type: "TV_SHOW".into(),
        media_type: "SHOW".into(),
        title: show_title.trim().to_string(),
        overview: show_overview.trim().to_string(),
        poster_url: poster_url(&show_poster_path),
        air_date: first_air_date.clone(),
        chrono_order: date_to_chrono_order(&first_air_date),
        parent_id: 0,
        lane_index: 0,
        canvas_x: 0.0,
        canvas_y: 0.0,
        added_by: ctx.sender,
        created_at: now,
    });

    for season in &seasons {
        let season_row = ctx.db.media_item().insert(MediaItem {
            id: 0,
            board_id,
            tmdb_id: 0,
            tmdb_type: "TV_SEASON".into(),
            media_type: "SEASON".into(),
            title: format!("Season {}", season.season_number),
            overview: season.overview.trim().to_string(),
            poster_url: poster_url(&season.poster_path),
            air_date: season.air_date.clone(),
            chrono_order: date_to_chrono_order(&season.air_date),
            parent_id: show_row.id,
            lane_index: 0,
            canvas_x: 0.0,
            canvas_y: 0.0,
            added_by: ctx.sender,
            created_at: now,
        });

        for ep in &season.episodes {
            ctx.db.media_item().insert(MediaItem {
                id: 0,
                board_id,
                tmdb_id: 0,
                tmdb_type: "TV_EPISODE".into(),
                media_type: "EPISODE".into(),
                title: ep.title.trim().to_string(),
                overview: ep.overview.trim().to_string(),
                poster_url: String::new(),
                air_date: ep.air_date.clone(),
                chrono_order: date_to_chrono_order(&ep.air_date),
                parent_id: season_row.id,
                lane_index: 0,
                canvas_x: 0.0,
                canvas_y: 0.0,
                added_by: ctx.sender,
                created_at: now,
            });
        }
    }

    Ok(())
}

/// Remove a media item (and all its descendants) from a board.
/// Only the board owner may call this.
#[reducer]
pub fn remove_media_item(
    ctx: &ReducerContext,
    board_id: u64,
    media_item_id: u64,
) -> Result<(), String> {
    assert_board_owner(ctx, board_id).map_err(|e| e.to_string())?;

    // Collect item + all descendants
    let mut to_delete: Vec<u64> = Vec::new();
    collect_subtree(ctx, media_item_id, &mut to_delete);

    for id in to_delete {
        ctx.db.media_item().id().delete(id);
    }
    Ok(())
}

fn collect_subtree(ctx: &ReducerContext, root: u64, acc: &mut Vec<u64>) {
    acc.push(root);
    for child in ctx.db.media_item().iter().filter(|m| m.parent_id == root) {
        collect_subtree(ctx, child.id, acc);
    }
}
