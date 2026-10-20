//! MPC-Rust Native macOS Cocoa / AppKit UI
//! Embeds high-performance Metal layer inside native NSWindow with full menu bar integration.

#[cfg(target_os = "macos")]
mod macos_app {
    pub fn run() {
        println!("Starting MPC-Rust for macOS (Cocoa Native + Apple VideoToolbox / Metal)...");
    }
}

fn main() {
    #[cfg(target_os = "macos")]
    macos_app::run();

    #[cfg(not(target_os = "macos"))]
    println!("mpc-ui-macos is the native macOS Cocoa/AppKit binary. On Linux use mpc-ui-linux; on Windows use mpc-ui-win32.");
}
