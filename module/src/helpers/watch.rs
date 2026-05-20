use spacetimedb::{ReducerContext, Identity, Table};
use crate::tables::{WatchEntry, WatchAggregate};
use crate::tables::media_item::media_item;
use crate::tables::watch_entry::watch_entry;
use crate::tables::watch_aggregate::watch_aggregate;
use crate::helpers::auth::current_time_ms;

pub fn collect_leaf_ids(ctx: &ReducerContext, parent_id: u64) -> Vec<u64> {
    let mut result = Vec::new();
    for child in ctx.db.media_item().iter().filter(|m| m.parent_id == parent_id) {
        if child.media_type == "EPISODE" || child.media_type == "FILM" {
            result.push(child.id);
        } else {
            result.extend(collect_leaf_ids(ctx, child.id));
        }
    }
    result
}

pub fn recompute_aggregates(ctx: &ReducerContext, start_id: u64, watcher: Identity) {
    let mut current_id = start_id;
    loop {
        let item = match ctx.db.media_item().id().find(current_id) {
            Some(i) => i,
            None => break,
        };
        if item.media_type != "EPISODE" && item.media_type != "FILM" {
            let leaves = collect_leaf_ids(ctx, current_id);
            let total = leaves.len() as u32;
            let watched_count = leaves.iter().filter(|&&lid| {
                ctx.db.watch_entry().iter()
                    .any(|e| e.media_item_id == lid && e.watcher_identity == watcher && e.watched)
            }).count() as u32;
            let now = current_time_ms(ctx);
            let existing = ctx.db.watch_aggregate().iter()
                .find(|a| a.media_item_id == current_id && a.watcher_identity == watcher);
            if let Some(mut agg) = existing {
                agg.watched_count = watched_count;
                agg.total_count = total;
                agg.updated_at = now;
                ctx.db.watch_aggregate().id().update(agg);
            } else {
                ctx.db.watch_aggregate().insert(WatchAggregate {
                    id: 0,
                    board_id: item.board_id,
                    media_item_id: current_id,
                    watcher_identity: watcher,
                    watched_count,
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
    let existing = ctx.db.watch_entry().iter()
        .find(|e| e.media_item_id == media_item_id && e.watcher_identity == watcher);
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