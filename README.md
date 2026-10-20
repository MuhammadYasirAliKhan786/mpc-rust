# MPC-Rust: Media Player Classic Home Cinema Rebuilt in Rust

A complete modern rewrite of **MPC-HC (Media Player Classic - Home Cinema)** in pure, memory-safe, multi-threaded **Rust**.

Designed for extreme playback efficiency, zero-copy hardware acceleration, and **native OS-specific UI frameworks** for Windows, macOS, and Linux (Ubuntu).

---

## 🎯 Architecture Comparison: C++ MPC-HC vs MPC-Rust

| Component | Legacy C++ MPC-HC (2006-2023) | MPC-Rust (Modern Rebuild) |
| :--- | :--- | :--- |
| **Language** | C++17 / MFC / DirectShow | **Rust 2021** (Safe concurrency, zero data races) |
| **Pipeline Model** | DirectShow GraphBuilder (COM, sync locks) | **Lock-Free Crossbeam Channel Graph** |
| **Windows UI** | MFC (Microsoft Foundation Classes) | **Native Win32 + Windows 11 Mica / Acrylic (`windows-rs`)** |
| **macOS UI** | Unsupported (Windows only) | **Native Cocoa AppKit + `CAMetalLayer` (`objc2`)** |
| **Linux UI** | Unsupported (Windows only) | **Native GTK4 + Libadwaita + Wayland / X11 (`libadwaita`)** |
| **Hardware Video** | DXVA2 / DirectShow EVR-CP / madVR | **D3D11VA (Win), VideoToolbox (Mac), VA-API/VDPAU (Linux)** |
| **Post-Processing** | Direct3D 9 HLSL Pixel Shaders | **WGPU / MSL / HLSL / Vulkan Shaders** (Sharpen Complex 2) |
| **Audio DSP** | DirectSound / WASAPI / internal matrix | **10-Band Biquad Parametric EQ + Pitch Shift** |
| **Subtitles** | ISR / VSFilter (C++ DirectShow filter) | **Native Rust Subtitle Rasterizer** |

---

## 📂 Multi-Crate Workspace Layout

```
.
├── Cargo.toml                    # Root workspace manifest
├── crates/
│   ├── mpc-core/                 # Async demuxer, master clock sync, and packet queues
│   ├── mpc-render/               # Hardware acceleration (D3D11VA, VideoToolbox, VA-API) & shaders
│   ├── mpc-audio/                # 10-band parametric EQ and DSP
│   ├── mpc-ui-win32/             # Native Windows Win32 UI + Windows 11 Mica / Acrylic DWM
│   ├── mpc-ui-macos/             # Native macOS Cocoa/AppKit UI + CAMetalLayer
│   ├── mpc-ui-linux/             # Native Linux Ubuntu GTK4/Libadwaita + Wayland / X11
│   └── mpc-cli/                  # Headless playback runner and hardware benchmark tool
├── .github/workflows/
│   └── build-matrix.yml          # Multi-OS CI/CD build matrix
└── src/                          # Web-based interactive player simulation & architecture explorer
```

---

## 🚀 Quick Start & Building

### 1. Linux (Ubuntu 22.04 / 24.04 LTS GNOME / Wayland)
```bash
# Prerequisites: GTK4 and Libadwaita dev headers
sudo apt install -y libgtk-4-dev libadwaita-1-dev libva-dev libvulkan-dev libasound2-dev

# Build and launch from the mpc-rust/ workspace root (or any crate directory):
cargo run --release -p mpc-ui-linux
```

### 2. Windows (Win32 + D3D11VA + DirectComposition)
```powershell
cargo run --release -p mpc-ui-win32
```

### 3. macOS (Apple Silicon M1/M2/M3/M4 + Intel Metal)
```bash
cargo run --release -p mpc-ui-macos
```

### 4. Headless CLI & DSP Benchmark (All Platforms)
```bash
cargo run --release -p mpc-cli
```
