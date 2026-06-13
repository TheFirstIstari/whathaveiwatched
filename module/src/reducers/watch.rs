use spacetimedb::{reducer, ReducerContext};
use crate::tables::media_item::media_item;
use crate::tables::watch_entry::watch_entry;
use crate::tables::watch_aggregate::watch_aggregate;
use crate::helpers::auth::{assert_board_member, current_time_ms};
use crate::helpers::watch::{collect_leaf_ids, update_aggregates_for_toggle, upsert_watch_entry};

#[reducer]
pub fn set_watch(ctx: &ReducerContext, board_id: u64, media_item_id: u64, watched: bool) -> Result<(), String> {
    assert_board_member(ctx, board_id).map_err(|e| e.to_string())?;
    let item = ctx.db.media_item().id().find(media_item_id)
        .ok_or_else(|| "NOT_FOUND".to_string())?;
    if item.board_id != board_id { return Err("NOT_FOUND: wrong board".into()); }
    let now = current_time_ms(ctx);
    if item.media_type == "EPISODE" || item.media_type == "FILM" {
        upsert_watch_entry(ctx, board_id, media_item_id, ctx.sender, watched, now);
    } else {
        for leaf_id in collect_leaf_ids(ctx, media_item_id) {
            upsert_watch_entry(ctx, board_id, leaf_id, ctx.sender, watched, now);
        }
    }
    update_aggregates_for_toggle(ctx, media_item_id, ctx.sender, watched);
    Ok(())
}

#[reducer]
pub fn set_watch_bulk(ctx: &ReducerContext, board_id: u64, media_item_ids: Vec<u64>, watched: bool) -> Result<(), String> {
    assert_board_member(ctx, board_id).map_err(|e| e.to_string())?;
    let now = current_time_ms(ctx);
    for media_item_id in &media_item_ids {
        let item = ctx.db.media_item().id().find(*media_item_id)
            .ok_or_else(|| "NOT_FOUND".to_string())?;
        if item.board_id != board_id { return Err("NOT_FOUND: wrong board".into()); }
        if item.media_type == "EPISODE" || item.media_type == "FILM" {
            upsert_watch_entry(ctx, board_id, *media_item_id, ctx.sender, watched, now);
        } else {
            for leaf_id in collect_leaf_ids(ctx, *media_item_id) {
                upsert_watch_entry(ctx, board_id, leaf_id, ctx.sender, watched, now);
            }
        }
        update_aggregates_for_toggle(ctx, *media_item_id, ctx.sender, watched);
    }
    Ok(())
}

#[reducer]
pub fn reset_progress(ctx: &ReducerContext, board_id: u64) -> Result<(), String> {
    assert_board_member(ctx, board_id).map_err(|e| e.to_string())?;
    let entries: Vec<_> = ctx.db.watch_entry()
        .watch_entry_board_watcher()
        .filter((board_id, ctx.sender))
        .collect();
    for row in entries { ctx.db.watch_entry().id().delete(row.id); }
    let aggs: Vec<_> = ctx.db.watch_aggregate()
        .agg_board_watcher()
        .filter((board_id, ctx.sender))
        .collect();
    for row in aggs { ctx.db.watch_aggregate().id().delete(row.id); }
    Ok(())
}
