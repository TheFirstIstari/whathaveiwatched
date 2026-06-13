use spacetimedb::{table, Identity};

#[table(
    name = watch_aggregate,
    public,
    index(name = agg_item_watcher, btree(columns = [media_item_id, watcher_identity])),
    index(name = agg_board_watcher, btree(columns = [board_id, watcher_identity]))
)]
pub struct WatchAggregate {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub board_id: u64,
    pub media_item_id: u64,
    pub watcher_identity: Identity,
    pub watched_count: u32,
    pub total_count: u32,
    pub updated_at: u64,
}
