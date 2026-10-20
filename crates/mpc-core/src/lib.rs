//! MPC-Rust Core Engine
//! Replaces legacy DirectShow / MFC GraphBuilder with an asynchronous, lock-free
//! Rust pipeline orchestrating demuxing, master clock synchronization, and stream dispatch.

pub mod clock;
pub mod demuxer;
pub mod subtitles;

pub use clock::MasterClock;
pub use demuxer::{AudioPacket, MediaDemuxer, VideoPacket};
pub use subtitles::{SubtitleCue, SubtitleTrack};

use crossbeam_channel::Sender;
use parking_lot::RwLock;
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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PlaybackState {
    Stopped,
    Playing,
    Paused,
    Seeking,
}

/// Core Playback Controller handling pipeline state and filter graph connections
pub struct MediaPlayerCore {
    clock: Arc<MasterClock>,
    state: RwLock<PlaybackState>,
    video_tx: Sender<VideoPacket>,
    audio_tx: Sender<AudioPacket>,
}

impl MediaPlayerCore {
    pub fn new(video_tx: Sender<VideoPacket>, audio_tx: Sender<AudioPacket>) -> Self {
        Self {
            clock: MasterClock::new(),
            state: RwLock::new(PlaybackState::Stopped),
            video_tx,
            audio_tx,
        }
    }

    pub fn clock(&self) -> Arc<MasterClock> {
        self.clock.clone()
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
}
