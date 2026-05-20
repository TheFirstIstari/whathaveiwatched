use spacetimedb::{reducer, ReducerContext, Table};
use crate::tables::Participant;
use crate::tables::board::board;
use crate::tables::participant::participant;
use crate::tables::watch_entry::watch_entry;
use crate::tables::watch_aggregate::watch_aggregate;
use crate::helpers::auth::{assert_board_owner, current_time_ms};

#[reducer]
pub fn join_board(ctx: &ReducerContext, board_id: u64, invite_token: String, display_name: String) -> Result<(), String> {
    if display_name.trim().is_empty() {
        return Err("INVALID_STATE: display_name is empty".into());
    }
    let board = ctx.db.board().id().find(board_id)
        .ok_or_else(|| "NOT_FOUND: Board does not exist".to_string())?;
    if board.invite_token != invite_token {
        return Err("INVALID_TOKEN: invite token mismatch".into());
    }
    let already = ctx.db.participant().iter()
        .any(|p| p.board_id == board_id && p.participant_identity == ctx.sender);
    if already {
        return Err("INVALID_STATE: already a participant".into());
    }
    let name_taken = ctx.db.participant().iter()
        .any(|p| p.board_id == board_id && p.display_name == display_name);
    if name_taken {
        return Err("DUPLICATE_NAME: display name already taken".into());
    }
    ctx.db.participant().insert(Participant {
        id: 0,
        board_id,
        participant_identity: ctx.sender,
        display_name: display_name.trim().to_string(),
        joined_at: current_time_ms(ctx),
    });
    Ok(())
}

#[reducer]
pub fn remove_participant(ctx: &ReducerContext, board_id: u64, participant_id: u64) -> Result<(), String> {
    assert_board_owner(ctx, board_id).map_err(|e| e.to_string())?;
    let p = ctx.db.participant().id().find(participant_id)
        .ok_or_else(|| "NOT_FOUND".to_string())?;
    if p.board_id != board_id {
        return Err("NOT_FOUND".into());
    }
    let ident = p.participant_identity;
    let entries: Vec<_> = ctx.db.watch_entry().iter()
        .filter(|e| e.board_id == board_id && e.watcher_identity == ident).collect();
    for row in entries { ctx.db.watch_entry().id().delete(row.id); }
    let aggs: Vec<_> = ctx.db.watch_aggregate().iter()
        .filter(|a| a.board_id == board_id && a.watcher_identity == ident).collect();
    for row in aggs { ctx.db.watch_aggregate().id().delete(row.id); }
    ctx.db.participant().id().delete(participant_id);
    Ok(())
}