//! 10-Band Biquad IIR Parametric Equalizer implementation in Rust

pub const EQ_BANDS: [f32; 10] = [
    31.25, 62.5, 125.0, 250.0, 500.0, 1000.0, 2000.0, 4000.0, 8000.0, 16000.0,
];

pub const EQ_LABELS: [&str; 10] = [
    "32Hz", "64Hz", "125Hz", "250Hz", "500Hz", "1kHz", "2kHz", "4kHz", "8kHz", "16kHz",
];

#[derive(Clone, Copy)]
pub struct BiquadFilter {
    b0: f32,
    b1: f32,
    b2: f32,
    a1: f32,
    a2: f32,
    x1: f32,
    x2: f32,
    y1: f32,
    y2: f32,
}

impl BiquadFilter {
    pub fn new_peaking(center_freq: f32, sample_rate: f32, gain_db: f32, q: f32) -> Self {
        let w0 = 2.0 * std::f32::consts::PI * center_freq / sample_rate;
        let alpha = w0.sin() / (2.0 * q);
        let a = 10.0f32.powf(gain_db / 40.0);

        let b0 = 1.0 + alpha * a;
        let b1 = -2.0 * w0.cos();
        let b2 = 1.0 - alpha * a;
        let a0 = 1.0 + alpha / a;
        let a1 = -2.0 * w0.cos();
        let a2 = 1.0 - alpha / a;

        Self {
            b0: b0 / a0,
            b1: b1 / a0,
            b2: b2 / a0,
            a1: a1 / a0,
            a2: a2 / a0,
            x1: 0.0,
            x2: 0.0,
            y1: 0.0,
            y2: 0.0,
        }
    }

    pub fn process(&mut self, input: f32) -> f32 {
        let output = self.b0 * input + self.b1 * self.x1 + self.b2 * self.x2
            - self.a1 * self.y1
            - self.a2 * self.y2;
        self.x2 = self.x1;
        self.x1 = input;
        self.y2 = self.y1;
        self.y1 = output;
        output
    }
}

pub struct Equalizer10Band {
    filters: [BiquadFilter; 10],
    pub gains: [f32; 10],
    pub enabled: bool,
    pub sample_rate: f32,
}

impl Equalizer10Band {
    pub fn new(sample_rate: f32) -> Self {
        let mut filters = [BiquadFilter::new_peaking(1000.0, sample_rate, 0.0, 1.414); 10];
        for i in 0..10 {
            filters[i] = BiquadFilter::new_peaking(EQ_BANDS[i], sample_rate, 0.0, 1.414);
        }
        Self {
            filters,
            gains: [0.0; 10],
            enabled: true,
            sample_rate,
        }
    }

    pub fn set_band_gain(&mut self, band_idx: usize, gain_db: f32, sample_rate: f32) {
        if band_idx < 10 {
            self.gains[band_idx] = gain_db.clamp(-12.0, 12.0);
            self.filters[band_idx] = BiquadFilter::new_peaking(
                EQ_BANDS[band_idx],
                sample_rate,
                self.gains[band_idx],
                1.414,
            );
        }
    }

    pub fn reset(&mut self) {
        for i in 0..10 {
            self.set_band_gain(i, 0.0, self.sample_rate);
        }
    }

    pub fn process_sample(&mut self, mut sample: f32) -> f32 {
        if !self.enabled {
            return sample;
        }
        for filter in &mut self.filters {
            sample = filter.process(sample);
        }
        sample.clamp(-1.0, 1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_flat_eq_unity_gain() {
        let mut eq = Equalizer10Band::new(48_000.0);
        let out = eq.process_sample(0.5);
        assert!((out - 0.5).abs() < 1e-4);
    }
}
