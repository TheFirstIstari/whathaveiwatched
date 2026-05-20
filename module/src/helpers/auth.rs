use spacetimedb::{ReducerContext, Table};
use crate::tables::Board;
use crate::tables::board::board;
use crate::tables::participant::participant;
use crate::errors::ReducerError;

pub fn assert_board_owner(ctx: &ReducerContext, board_id: u64) -> Result<Board, ReducerError> {
    let board = ctx.db.board().id().find(board_id)
        .ok_or(ReducerError::NotFound)?;
    if board.owner_identity != ctx.sender {
        return Err(ReducerError::NotAuthorized);
    }
    Ok(board)
}

pub fn assert_board_member(ctx: &ReducerContext, board_id: u64) -> Result<(), ReducerError> {
    let board = ctx.db.board().id().find(board_id)
        .ok_or(ReducerError::NotFound)?;
    if board.owner_identity == ctx.sender {
        return Ok(());
    }
    let is_participant = ctx.db.participant().iter()
        .any(|p| p.board_id == board_id && p.participant_identity == ctx.sender);
    if !is_participant {
        return Err(ReducerError::NotAuthorized);
    }
    Ok(())
}

pub fn current_time_ms(ctx: &ReducerContext) -> u64 {
    ctx.timestamp.to_micros_since_unix_epoch() as u64 / 1000
}