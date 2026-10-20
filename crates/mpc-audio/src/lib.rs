//! MPC-Rust Audio Engine with 10-Band Parametric Equalizer & DSP

pub mod equalizer;

pub use equalizer::{BiquadFilter, Equalizer10Band, EQ_BANDS, EQ_LABELS};
