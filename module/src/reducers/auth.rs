use spacetimedb::{reducer, ReducerContext, Table};
use crate::tables::Account;
use crate::tables::account::account;
use crate::helpers::auth::current_time_ms;

#[reducer]
pub fn register_owner(ctx: &ReducerContext, display_name: String, email: String, avatar_url: String) {
    if let Some(mut acc) = ctx.db.account().owner_identity().find(ctx.sender) {
        acc.display_name = display_name;
        acc.avatar_url = avatar_url;
        ctx.db.account().owner_identity().update(acc);
    } else {
        ctx.db.account().insert(Account {
            owner_identity: ctx.sender,
            email,
            display_name,
            avatar_url,
            created_at: current_time_ms(ctx),
        });
    }
}