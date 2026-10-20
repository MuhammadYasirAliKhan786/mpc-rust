//! MPC-Rust Command Line Interface & Headless Hardware Benchmark

use std::env;

fn main() -> anyhow::Result<()> {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        println!("MPC-Rust: Media Player Classic Home Cinema (Rust Edition)");
        println!("Usage: mpc-cli <video_file> [--hw-accel=d3d11va|videotoolbox|vaapi|software]");
        return Ok(());
    }

    println!("Playing file via MPC-Rust core engine: {}", args[1]);
    Ok(())
}
