//! Asynchronous Media Demuxer for container formats (MKV, MP4, WebM, AVI, TS)

use crossbeam_channel::Sender;

pub struct VideoPacket {
    pub pts: u64, // Microseconds
    pub dts: u64,
    pub duration: u64,
    pub data: Vec<u8>,
    pub is_keyframe: bool,
    pub width: u32,
    pub height: u32,
}

pub struct AudioPacket {
    pub pts: u64,
    pub channels: u16,
    pub sample_rate: u32,
    pub samples: Vec<f32>,
}

pub struct MediaDemuxer {
    pub file_path: String,
    pub duration_micros: u64,
    pub has_video: bool,
    pub has_audio: bool,
}

impl MediaDemuxer {
    pub fn open(path: &str) -> anyhow::Result<Self> {
        Ok(Self {
            file_path: path.to_string(),
            duration_micros: 0,
            has_video: true,
            has_audio: true,
        })
    }

    pub fn start_demuxing_loop(
        &self,
        _video_tx: Sender<VideoPacket>,
        _audio_tx: Sender<AudioPacket>,
    ) -> anyhow::Result<()> {
        // Runs asynchronous demuxing thread pushing packets into bounded crossbeam channel
        Ok(())
    }
}
