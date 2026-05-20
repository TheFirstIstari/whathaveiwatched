use spacetimedb::{table, Identity};

#[table(name = participant, public)]
pub struct Participant {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub board_id: u64,
    pub participant_identity: Identity,
    pub display_name: String,
    pub joined_at: u64,
}