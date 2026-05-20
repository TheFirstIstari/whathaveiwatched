use spacetimedb::{ReducerContext, rand::RngCore};

/// Generate a random hex token using SpacetimeDB's deterministic RNG.
/// `byte_len` is the number of random bytes (output will be 2× that many hex chars).
pub fn generate_random_token(ctx: &ReducerContext, byte_len: usize) -> String {
    let mut bytes = vec![0u8; byte_len];
    ctx.rng().fill_bytes(&mut bytes);
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}
