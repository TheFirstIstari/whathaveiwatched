use spacetimedb::{table, Identity};

#[table(name = media_item, public)]
pub struct MediaItem {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub board_id: u64,
    pub tmdb_id: i64,
    pub tmdb_type: String,
    pub media_type: String,
    pub title: String,
    pub overview: String,
    pub poster_url: String,
    pub air_date: String,
    pub chrono_order: f64,
    pub parent_id: u64,
    pub lane_index: u32,
    pub canvas_x: f64,
    pub canvas_y: f64,
    pub added_by: Identity,
    pub created_at: u64,
}