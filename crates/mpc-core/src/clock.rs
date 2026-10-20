//! High-precision Master Clock for Audio/Video synchronization in Rust

use parking_lot::RwLock;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

pub struct MasterClock {
    base_time: RwLock<Instant>,
    paused_at: RwLock<Option<Duration>>,
    playback_rate: RwLock<f32>,
    seek_offset_micros: AtomicU64,
    is_paused: AtomicBool,
}

impl MasterClock {
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            base_time: RwLock::new(Instant::now()),
            paused_at: RwLock::new(None),
            playback_rate: RwLock::new(1.0),
            seek_offset_micros: AtomicU64::new(0),
            is_paused: AtomicBool::new(false),
        })
    }

    pub fn current_time_micros(&self) -> u64 {
        if self.is_paused.load(Ordering::Relaxed) {
            let offset = self.seek_offset_micros.load(Ordering::Relaxed);
            if let Some(paused_dur) = *self.paused_at.read() {
                return offset + (paused_dur.as_micros() as f32 * *self.playback_rate.read()) as u64;
            }
            return offset;
        }

        let elapsed = self.base_time.read().elapsed();
        let rate = *self.playback_rate.read();
        let scaled_micros = (elapsed.as_micros() as f32 * rate) as u64;
        self.seek_offset_micros.load(Ordering::Relaxed) + scaled_micros
    }

    pub fn pause(&self) {
        if !self.is_paused.swap(true, Ordering::SeqCst) {
            *self.paused_at.write() = Some(self.base_time.read().elapsed());
        }
    }

    pub fn resume(&self) {
        if self.is_paused.swap(false, Ordering::SeqCst) {
            if let Some(paused_dur) = self.paused_at.write().take() {
                let rate = *self.playback_rate.read();
                let added_micros = (paused_dur.as_micros() as f32 * rate) as u64;
                self.seek_offset_micros.fetch_add(added_micros, Ordering::SeqCst);
                *self.base_time.write() = Instant::now();
            }
        }
    }

    pub fn seek_to(&self, target_micros: u64) {
        self.seek_offset_micros.store(target_micros, Ordering::SeqCst);
        *self.base_time.write() = Instant::now();
        if self.is_paused.load(Ordering::Relaxed) {
            *self.paused_at.write() = Some(Duration::ZERO);
        }
    }

    pub fn set_rate(&self, new_rate: f32) {
        let current = self.current_time_micros();
        self.seek_offset_micros.store(current, Ordering::SeqCst);
        *self.base_time.write() = Instant::now();
        *self.playback_rate.write() = new_rate.clamp(0.25, 16.0);
    }

    pub fn rate(&self) -> f32 {
        *self.playback_rate.read()
    }
}
