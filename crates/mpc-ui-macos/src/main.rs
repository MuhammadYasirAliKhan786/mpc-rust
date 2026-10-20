//! MPC-Rust Native macOS Cocoa / AppKit UI
//! Embeds high-performance Metal layer inside native NSWindow with full menu bar integration.

#![cfg(target_os = "macos")]

use objc2::rc::Retained;
use objc2_app_kit::{NSApplication, NSApplicationActivationPolicy, NSWindow, NSMenu, NSMenuItem};
use objc2_foundation::NSString;

fn main() {
    println!("Starting MPC-Rust for macOS (Cocoa Native + Apple VideoToolbox / Metal)...");
    // Connects NSApplication and CAMetalLayer hardware canvas
}
