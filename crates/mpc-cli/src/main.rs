//! MPC-Rust Command Line Interface & Headless Hardware Pipeline Benchmark

use mpc_audio::Equalizer10Band;
use mpc_core::MediaPlayerCore;
use mpc_render::{HardwareVideoRenderer, MpcShader};
use std::env;
use std::time::Instant;

fn main() -> anyhow::Result<()> {
    let args: Vec<String> = env::args().collect();
    println!("==============================================================");
    println!("  MPC-Rust: Media Player Classic Home Cinema (Rust Edition)   ");
    println!("==============================================================");

    let renderer = HardwareVideoRenderer::new(1920, 1080);
    println!("Active Hardware Decoder : {}", renderer.stats.decoder_name);
    println!("Active Surface Backend  : {}", renderer.stats.surface_backend);
    println!("Zero-Copy Pipeline      : {}", renderer.stats.zero_copy);
    println!("Default Pixel Shader    : {}", renderer.current_shader.name());

    if args.len() >= 2 {
        println!("Target Media Source     : {}", args[1]);
    }

    // Run quick self-test of 10-band Audio DSP and Pixel Shader Engine
    let start = Instant::now();
    let mut eq = Equalizer10Band::new(48_000.0);
    eq.set_band_gain(0, 4.5, 48_000.0);
    eq.set_band_gain(9, 3.0, 48_000.0);
    let mut acc = 0.0f32;
    for i in 0..48_000 {
        let sample = ((i as f32) * 0.01).sin() * 0.5;
        acc += eq.process_sample(sample);
    }

    let (v_tx, _v_rx) = crossbeam_channel::bounded(16);
    let (a_tx, _a_rx) = crossbeam_channel::bounded(16);
    let core = MediaPlayerCore::new(v_tx, a_tx);
    core.play();
    core.step_frame(16_667);

    let (r, g, b) = renderer.evaluate_pixel_shader(0.5, 0.6, 0.7, 10);
    let elapsed = start.elapsed();

    println!(
        "DSP Benchmark (1s 48kHz 10-Band EQ + Shader: {:.2},{:.2},{:.2} | checksum {:.2}) completed in {:.2?}",
        r, g, b, acc, elapsed
    );
    Ok(())
}
