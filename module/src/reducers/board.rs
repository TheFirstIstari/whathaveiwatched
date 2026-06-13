use spacetimedb::{reducer, ReducerContext, Table};
use crate::tables::Board;
use crate::tables::board::board;
use crate::tables::account::account;
use crate::tables::media_item::media_item;
use crate::tables::participant::participant;
use crate::tables::watch_entry::watch_entry;
use crate::tables::watch_aggregate::watch_aggregate;
use crate::helpers::auth::{assert_board_owner, current_time_ms};
use crate::helpers::crypto::generate_random_token;

#[reducer]
pub fn create_board(ctx: &ReducerContext, title: String, description: String) -> Result<(), String> {
    ctx.db.account().owner_identity().find(ctx.sender)
        .ok_or_else(|| "NOT_AUTHENTICATED: register_owner first".to_string())?;
    if title.trim().is_empty() {
        return Err("INVALID_STATE: title is empty".into());
    }
    let now = current_time_ms(ctx);
    ctx.db.board().insert(Board {
        id: 0,
        owner_identity: ctx.sender,
        title: title.trim().to_string(),
        description: description.trim().to_string(),
        sharing_mode: "PRIVATE".into(),
        ordering_mode: "RELEASE_DATE".into(),
        invite_token: generate_random_token(ctx, 16),
        created_at: now,
        updated_at: now,
    });
    Ok(())
}

#[reducer]
pub fn update_board(ctx: &ReducerContext, board_id: u64, title: String, description: String,
                    sharing_mode: String, ordering_mode: String) -> Result<(), String> {
    let mut board = assert_board_owner(ctx, board_id).map_err(|e| e.to_string())?;
    if title.trim().is_empty() { return Err("INVALID_STATE: title is empty".into()); }
    if sharing_mode != "PRIVATE" && sharing_mode != "PUBLIC" {
        return Err("INVALID_STATE: bad sharing_mode".into());
    }
    if ordering_mode != "RELEASE_DATE" && ordering_mode != "CHRONO" {
        return Err("INVALID_STATE: bad ordering_mode".into());
    }
    board.title = title.trim().to_string();
    board.description = description.trim().to_string();
    board.sharing_mode = sharing_mode;
    board.ordering_mode = ordering_mode;
    board.updated_at = current_time_ms(ctx);
    ctx.db.board().id().update(board);
    Ok(())
}

#[reducer]
pub fn delete_board(ctx: &ReducerContext, board_id: u64) -> Result<(), String> {
    let board = assert_board_owner(ctx, board_id).map_err(|e| e.to_string())?;
    let items: Vec<_> = ctx.db.media_item().iter().filter(|m| m.board_id == board_id).collect();
    for row in items { ctx.db.media_item().id().delete(row.id); }
    let parts: Vec<_> = ctx.db.participant().iter().filter(|p| p.board_id == board_id).collect();
    for row in parts { ctx.db.participant().id().delete(row.id); }
    let entries: Vec<_> = ctx.db.watch_entry().iter().filter(|e| e.board_id == board_id).collect();
    for row in entries { ctx.db.watch_entry().id().delete(row.id); }
    let aggs: Vec<_> = ctx.db.watch_aggregate().iter().filter(|a| a.board_id == board_id).collect();
    for row in aggs { ctx.db.watch_aggregate().id().delete(row.id); }
    ctx.db.board().id().delete(board.id);
    Ok(())
}

#[reducer]
pub fn regenerate_invite(ctx: &ReducerContext, board_id: u64) -> Result<(), String> {
    let mut board = assert_board_owner(ctx, board_id).map_err(|e| e.to_string())?;
    board.invite_token = generate_random_token(ctx, 16);
    board.updated_at = current_time_ms(ctx);
    ctx.db.board().id().update(board);
    Ok(())
}

#[reducer]
pub fn update_media_item_chrono(
    ctx: &ReducerContext,
    board_id: u64,
    media_item_id: u64,
    new_chrono_order: f64,
) -> Result<(), String> {
    assert_board_owner(ctx, board_id).map_err(|e| e.to_string())?;
    
    let item = ctx.db.media_item().iter()
        .find(|m| m.id == media_item_id && m.board_id == board_id)
        .ok_or("Media item not found")?;
    
    let mut updated = item.clone();
    updated.chrono_order = new_chrono_order;
    ctx.db.media_item().id().delete(item.id);
    ctx.db.media_item().insert(updated);
    
    Ok(())
}