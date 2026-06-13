use spacetimedb::{ReducerContext, Identity, Table};
use crate::tables::media_item::media_item;
use crate::tables::watch_entry::watch_entry;
use crate::tables::watch_aggregate::watch_aggregate;
use crate::tables::{WatchEntry, WatchAggregate};
use crate::helpers::auth::current_time_ms;

/// Collect all leaf (EPISODE/FILM) descendants of a media item.
/// Uses the parent_id btree index for efficient child lookups.
pub fn collect_leaf_ids(ctx: &ReducerContext, parent_id: u64) -> Vec<u64> {
    let mut result = Vec::new();
    for child in ctx.db.media_item().media_item_parent_id().filter(parent_id) {
        if child.media_type == "EPISODE" || child.media_type == "FILM" {
            result.push(child.id);
        } else {
            result.extend(collect_leaf_ids(ctx, child.id));
        }
    }
    result
}

/// Incrementally update aggregates for a single watcher toggle.
pub fn update_aggregates_for_toggle(
    ctx: &ReducerContext,
    media_item_id: u64,
    watcher: Identity,
    watched: bool,
) {
    let now = current_time_ms(ctx);
    let delta: i32 = if watched { 1 } else { -1 };

    let mut current_id = media_item_id;
    loop {
        let item = match ctx.db.media_item().id().find(current_id) {
            Some(i) => i,
            None => break,
        };

        if item.media_type != "EPISODE" && item.media_type != "FILM" {
            let existing = ctx.db.watch_aggregate()
                .agg_item_watcher()
                .filter((current_id, watcher))
                .next();

            if let Some(mut agg) = existing {
                let new_count = (agg.watched_count as i32 + delta).max(0) as u32;
                agg.watched_count = new_count;
                agg.updated_at = now;
                ctx.db.watch_aggregate().id().update(agg);
            } else {
                let leaves = collect_leaf_ids(ctx, current_id);
                let total = leaves.len() as u32;
                ctx.db.watch_aggregate().insert(WatchAggregate {
                    id: 0,
                    board_id: item.board_id,
                    media_item_id: current_id,
                    watcher_identity: watcher,
                    watched_count: if watched { 1 } else { 0 },
                    total_count: total,
                    updated_at: now,
                });
            }
        }

        if item.parent_id == 0 { break; }
        current_id = item.parent_id;
    }
}

pub fn upsert_watch_entry(ctx: &ReducerContext, board_id: u64, media_item_id: u64,
                           watcher: Identity, watched: bool, now: u64) {
    let existing = ctx.db.watch_entry()
        .watch_entry_item_watcher()
        .filter((media_item_id, watcher))
        .next();
    if let Some(mut e) = existing {
        e.watched = watched;
        e.watched_at = if watched { now } else { 0 };
        e.updated_at = now;
        ctx.db.watch_entry().id().update(e);
    } else {
        ctx.db.watch_entry().insert(WatchEntry {
            id: 0, board_id, media_item_id, watcher_identity: watcher,
            watched, watched_at: if watched { now } else { 0 }, updated_at: now,
        });
    }
}
