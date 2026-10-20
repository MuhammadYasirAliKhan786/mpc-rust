//! MPC-Rust Native Linux (Ubuntu) UI
//! Implements GNOME / Adwaita interface with Wayland/X11 Vulkan surface and VA-API decoding.

#![cfg(target_os = "linux")]

use gtk4::prelude::*;
use libadwaita as adw;
use adw::prelude::*;

fn main() {
    println!("Starting MPC-Rust for Linux (Ubuntu GTK4/Adwaita + VA-API / Vulkan)...");
    let app = adw::Application::builder()
        .application_id("io.github.mpc_rust.player")
        .build();

    app.connect_activate(|app| {
        let window = adw::ApplicationWindow::builder()
            .application(app)
            .title("Media Player Classic - Rust Edition")
            .default_width(1280)
            .default_height(720)
            .build();

        window.present();
    });

    app.run();
}
