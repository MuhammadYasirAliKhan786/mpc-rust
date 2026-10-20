//! MPC-Rust Core Engine
//! Full Media Player Classic - Home Cinema (MPC-HC) core state machine in Rust:
//! - Lock-free packet queues & MasterClock audio/video synchronization
//! - Pan & Scan (PnS) geometric transforms, rotation, and aspect ratio override
//! - A-B Repeat segment looping & frame-accurate stepping (forward & backward)
//! - Go-To Timecode (`HH:MM:SS.mmm`) and Frame Number (`#1234`) parser
//! - Favorites / Timestamp Bookmarking & Playlist queue management

pub mod clock;
pub mod demuxer;
pub mod subtitles;

pub use clock::MasterClock;
pub use demuxer::{AudioPacket, MediaDemuxer, MediaInfoMetadata, VideoPacket};
pub use subtitles::{SubtitleCue, SubtitleTrack};

use crossbeam_channel::Sender;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum MpcError {
    #[error("Failed to open media source: {0}")]
    SourceOpenFailed(String),
    #[error("No video stream found")]
    NoVideoStream,
    #[error("Hardware decoder initialization error: {0}")]
    DecoderError(String),
    #[error("Playback end of stream")]
    EndOfStream,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PlaybackState {
    Stopped,
    Playing,
    Paused,
    Seeking,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ViewPreset {
    Minimal, // Ctrl+1..5 hidden except video
    Compact, // Seekbar + status only
    Normal,  // Full classic MPC-HC chrome
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AspectRatioOverride {
    Default,
    StretchToWindow,
    Ratio4x3,
    Ratio5x4,
    Ratio16x9,
    Ratio16x10,
    Ratio21x9,
    Ratio235x100,
}

impl AspectRatioOverride {
    pub fn label(&self) -> &'static str {
        match self {
            Self::Default => "Default (Source AR)",
            Self::StretchToWindow => "Stretch to Window",
            Self::Ratio4x3 => "4:3 Standard TV",
            Self::Ratio5x4 => "5:4 SXGA",
            Self::Ratio16x9 => "16:9 Widescreen",
            Self::Ratio16x10 => "16:10 Display",
            Self::Ratio21x9 => "21:9 UltraWide",
            Self::Ratio235x100 => "2.35:1 CinemaScope",
        }
    }

    pub fn target_ratio(&self, source_w: f64, source_h: f64) -> Option<f64> {
        match self {
            Self::Default => {
                if source_h > 0.0 {
                    Some(source_w / source_h)
                } else {
                    Some(16.0 / 9.0)
                }
            }
            Self::StretchToWindow => None,
            Self::Ratio4x3 => Some(4.0 / 3.0),
            Self::Ratio5x4 => Some(5.0 / 4.0),
            Self::Ratio16x9 => Some(16.0 / 9.0),
            Self::Ratio16x10 => Some(16.0 / 10.0),
            Self::Ratio21x9 => Some(21.0 / 9.0),
            Self::Ratio235x100 => Some(2.35),
        }
    }
}

/// MPC-HC Pan & Scan (PnS) state (Numpad controls in classic MPC-HC)
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct PanScanState {
    pub zoom_x: f64,
    pub zoom_y: f64,
    pub offset_x: f64,
    pub offset_y: f64,
    pub rotation_deg: i32,
    pub flip_horizontal: bool,
    pub flip_vertical: bool,
}

impl Default for PanScanState {
    fn default() -> Self {
        Self {
            zoom_x: 1.0,
            zoom_y: 1.0,
            offset_x: 0.0,
            offset_y: 0.0,
            rotation_deg: 0,
            flip_horizontal: false,
            flip_vertical: false,
        }
    }
}

impl PanScanState {
    pub fn reset(&mut self) {
        *self = Self::default();
    }

    pub fn scale_uniform(&mut self, delta: f64) {
        self.zoom_x = (self.zoom_x + delta).clamp(0.25, 4.0);
        self.zoom_y = (self.zoom_y + delta).clamp(0.25, 4.0);
    }

    pub fn scale_width(&mut self, delta: f64) {
        self.zoom_x = (self.zoom_x + delta).clamp(0.25, 4.0);
    }

    pub fn scale_height(&mut self, delta: f64) {
        self.zoom_y = (self.zoom_y + delta).clamp(0.25, 4.0);
    }

    pub fn pan(&mut self, dx: f64, dy: f64) {
        self.offset_x = (self.offset_x + dx).clamp(-500.0, 500.0);
        self.offset_y = (self.offset_y + dy).clamp(-500.0, 500.0);
    }

    pub fn rotate_cw(&mut self) {
        self.rotation_deg = (self.rotation_deg + 90) % 360;
    }

    pub fn rotate_ccw(&mut self) {
        self.rotation_deg = (self.rotation_deg + 270) % 360;
    }
}

/// MPC-HC A-B Repeat Segment Loop (`[` and `]` markers)
#[derive(Debug, Clone, Copy, Default, Serialize, Deserialize)]
pub struct AbLoopState {
    pub point_a_micros: Option<u64>,
    pub point_b_micros: Option<u64>,
}

impl AbLoopState {
    pub fn clear(&mut self) {
        self.point_a_micros = None;
        self.point_b_micros = None;
    }

    pub fn should_loop(&self, current_micros: u64) -> Option<u64> {
        if let (Some(a), Some(b)) = (self.point_a_micros, self.point_b_micros) {
            if b > a && current_micros >= b {
                return Some(a);
            }
        }
        None
    }
}

/// Saved Favorite / Timestamp Bookmark
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FavoriteBookmark {
    pub title: String,
    pub path: String,
    pub timestamp_micros: u64,
}

/// Format seconds into standard MPC-HC timecode (HH:MM:SS or MM:SS)
pub fn format_timecode(seconds: u64, force_hours: bool) -> String {
    let hrs = seconds / 3600;
    let mins = (seconds % 3600) / 60;
    let secs = seconds % 60;
    if hrs > 0 || force_hours {
        format!("{:02}:{:02}:{:02}", hrs, mins, secs)
    } else {
        format!("{:02}:{:02}", mins, secs)
    }
}

/// Format microseconds into precision MPC-HC timecode `HH:MM:SS.mmm`
pub fn format_timecode_ms(micros: u64) -> String {
    let total_ms = micros / 1_000;
    let ms = total_ms % 1_000;
    let total_secs = total_ms / 1_000;
    let hrs = total_secs / 3600;
    let mins = (total_secs % 3600) / 60;
    let secs = total_secs % 60;
    format!("{:02}:{:02}:{:02}.{:03}", hrs, mins, secs, ms)
}

/// Parse MPC-HC Go-To dialog string (`Ctrl+G`):
/// Accepts either frame number `#1250` or timecode `HH:MM:SS.mmm` / `MM:SS` / `SS`
pub fn parse_goto_target(input: &str, fps: f64) -> Option<u64> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return None;
    }
    let effective_fps = if fps > 0.0 { fps } else { 24.0 };
    if let Some(frame_str) = trimmed.strip_prefix('#') {
        let frame_num: u64 = frame_str.trim().parse().ok()?;
        let secs = frame_num as f64 / effective_fps;
        return Some((secs * 1_000_000.0) as u64);
    }

    let parts: Vec<&str> = trimmed.split(':').collect();
    match parts.len() {
        1 => {
            let s: f64 = parts[0].parse().ok()?;
            Some((s.max(0.0) * 1_000_000.0) as u64)
        }
        2 => {
            let m: u64 = parts[0].parse().ok()?;
            let s: f64 = parts[1].parse().ok()?;
            Some(((m as f64 * 60.0 + s).max(0.0) * 1_000_000.0) as u64)
        }
        3 => {
            let h: u64 = parts[0].parse().ok()?;
            let m: u64 = parts[1].parse().ok()?;
            let s: f64 = parts[2].parse().ok()?;
            Some(((h as f64 * 3600.0 + m as f64 * 60.0 + s).max(0.0) * 1_000_000.0) as u64)
        }
        _ => None,
    }
}

/// Core Playback Controller handling pipeline state, Pan & Scan, A-B loop, and Bookmarks
pub struct MediaPlayerCore {
    clock: Arc<MasterClock>,
    state: RwLock<PlaybackState>,
    pub pan_scan: RwLock<PanScanState>,
    pub aspect_override: RwLock<AspectRatioOverride>,
    pub ab_loop: RwLock<AbLoopState>,
    pub bookmarks: RwLock<Vec<FavoriteBookmark>>,
    pub view_preset: RwLock<ViewPreset>,
    video_tx: Sender<VideoPacket>,
    audio_tx: Sender<AudioPacket>,
}

impl MediaPlayerCore {
    pub fn new(video_tx: Sender<VideoPacket>, audio_tx: Sender<AudioPacket>) -> Self {
        Self {
            clock: MasterClock::new(),
            state: RwLock::new(PlaybackState::Stopped),
            pan_scan: RwLock::new(PanScanState::default()),
            aspect_override: RwLock::new(AspectRatioOverride::Default),
            ab_loop: RwLock::new(AbLoopState::default()),
            bookmarks: RwLock::new(Vec::new()),
            view_preset: RwLock::new(ViewPreset::Normal),
            video_tx,
            audio_tx,
        }
    }

    pub fn clock(&self) -> Arc<MasterClock> {
        self.clock.clone()
    }

    pub fn state(&self) -> PlaybackState {
        *self.state.read()
    }

    pub fn play(&self) {
        *self.state.write() = PlaybackState::Playing;
        self.clock.resume();
    }

    pub fn pause(&self) {
        *self.state.write() = PlaybackState::Paused;
        self.clock.pause();
    }

    pub fn stop(&self) {
        *self.state.write() = PlaybackState::Stopped;
        self.clock.seek_to(0);
        self.clock.pause();
    }

    pub fn step_frame(&self, frame_duration_micros: u64) {
        let next_time = self.clock.current_time_micros() + frame_duration_micros;
        self.clock.seek_to(next_time);
    }

    pub fn step_frame_back(&self, frame_duration_micros: u64) {
        let cur = self.clock.current_time_micros();
        let prev_time = cur.saturating_sub(frame_duration_micros);
        self.clock.seek_to(prev_time);
    }

    pub fn add_bookmark(&self, title: impl Into<String>, path: impl Into<String>, timestamp_micros: u64) {
        self.bookmarks.write().push(FavoriteBookmark {
            title: title.into(),
            path: path.into(),
            timestamp_micros,
        });
    }

    pub fn dispatch_video(&self, packet: VideoPacket) -> Result<(), MpcError> {
        self.video_tx
            .send(packet)
            .map_err(|e| MpcError::DecoderError(e.to_string()))
    }

    pub fn dispatch_audio(&self, packet: AudioPacket) -> Result<(), MpcError> {
        self.audio_tx
            .send(packet)
            .map_err(|e| MpcError::DecoderError(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_timecode() {
        assert_eq!(format_timecode(0, false), "00:00");
        assert_eq!(format_timecode(65, false), "01:05");
        assert_eq!(format_timecode(3665, false), "01:01:05");
        assert_eq!(format_timecode(45, true), "00:00:45");
    }

    #[test]
    fn test_parse_goto_target() {
        assert_eq!(parse_goto_target("01:30", 24.0), Some(90_000_000));
        assert_eq!(parse_goto_target("00:02:05.500", 24.0), Some(125_500_000));
        assert_eq!(parse_goto_target("#240", 24.0), Some(10_000_000));
    }

    #[test]
    fn test_ab_loop_and_stepping() {
        let (v_tx, _v_rx) = crossbeam_channel::bounded(8);
        let (a_tx, _a_rx) = crossbeam_channel::bounded(8);
        let player = MediaPlayerCore::new(v_tx, a_tx);
        player.pause();
        player.step_frame(41_667);
        assert_eq!(player.clock().current_time_micros(), 41_667);
        player.step_frame_back(11_667);
        assert_eq!(player.clock().current_time_micros(), 30_000);

        let mut ab = AbLoopState {
            point_a_micros: Some(10_000_000),
            point_b_micros: Some(20_000_000),
        };
        assert_eq!(ab.should_loop(15_000_000), None);
        assert_eq!(ab.should_loop(21_000_000), Some(10_000_000));
        ab.clear();
        assert_eq!(ab.should_loop(21_000_000), None);
    }
}
