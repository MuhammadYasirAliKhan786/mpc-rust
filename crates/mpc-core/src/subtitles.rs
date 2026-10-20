//! Subtitle Parser & Rasterizer for SubRip (.srt), WebVTT, and SubStation Alpha (.ass/.ssa)

#[derive(Debug, Clone)]
pub struct SubtitleCue {
    pub id: u32,
    pub start_time_micros: u64,
    pub end_time_micros: u64,
    pub text: String,
}

pub struct SubtitleTrack {
    pub cues: Vec<SubtitleCue>,
    pub language: String,
    pub delay_micros: i64,
}

impl SubtitleTrack {
    pub fn new(language: impl Into<String>) -> Self {
        Self {
            cues: Vec::new(),
            language: language.into(),
            delay_micros: 0,
        }
    }

    pub fn parse_srt(content: &str) -> Vec<SubtitleCue> {
        let mut cues = Vec::new();
        let normalized = content.replace("\r\n", "\n").replace('\r', "\n");
        let blocks = normalized.trim().split("\n\n");

        for (idx, block) in blocks.enumerate() {
            let lines: Vec<&str> = block.trim().split('\n').collect();
            if lines.len() < 2 {
                continue;
            }

            let time_line_idx = if lines[0].parse::<u32>().is_ok() { 1 } else { 0 };
            if time_line_idx >= lines.len() {
                continue;
            }

            let parts: Vec<&str> = lines[time_line_idx].split("-->").collect();
            if parts.len() == 2 {
                let start_micros = parse_srt_timestamp(parts[0].trim());
                let end_micros = parse_srt_timestamp(parts[1].trim());
                let text = lines[time_line_idx + 1..].join("\n");

                cues.push(SubtitleCue {
                    id: (idx + 1) as u32,
                    start_time_micros: start_micros,
                    end_time_micros: end_micros,
                    text,
                });
            }
        }
        cues
    }

    pub fn get_active_cue(&self, current_time_micros: u64) -> Option<&SubtitleCue> {
        let adjusted = (current_time_micros as i64 + self.delay_micros).max(0) as u64;
        self.cues.iter().find(|cue| adjusted >= cue.start_time_micros && adjusted <= cue.end_time_micros)
    }
}

fn parse_srt_timestamp(ts: &str) -> u64 {
    // Expected format: HH:MM:SS,mmm or HH:MM:SS.mmm
    let clean = ts.replace(',', ".");
    let parts: Vec<&str> = clean.split(':').collect();
    if parts.len() == 3 {
        let h: u64 = parts[0].parse().unwrap_or(0);
        let m: u64 = parts[1].parse().unwrap_or(0);
        let s_f: f64 = parts[2].parse().unwrap_or(0.0);
        return (h * 3600 + m * 60) * 1_000_000 + (s_f * 1_000_000.0) as u64;
    }
    0
}
