//! OS-specific Hardware Accelerated Video Decoding Implementations
//! Replaces MPC-HC's legacy Microsoft DShow filters with direct native APIs.

pub trait HardwareDecoderDevice {
    fn name(&self) -> &'static str;
    fn is_zero_copy(&self) -> bool;
    fn supports_10bit_hdr(&self) -> bool;
}

#[cfg(target_os = "windows")]
pub struct D3D11VaDecoder;

#[cfg(target_os = "windows")]
impl HardwareDecoderDevice for D3D11VaDecoder {
    fn name(&self) -> &'static str { "Direct3D 11 Video Acceleration (D3D11VA)" }
    fn is_zero_copy(&self) -> bool { true }
    fn supports_10bit_hdr(&self) -> bool { true }
}

#[cfg(target_os = "macos")]
pub struct VideoToolboxDecoder;

#[cfg(target_os = "macos")]
impl HardwareDecoderDevice for VideoToolboxDecoder {
    fn name(&self) -> &'static str { "Apple VideoToolbox (Metal Zero-Copy)" }
    fn is_zero_copy(&self) -> bool { true }
    fn supports_10bit_hdr(&self) -> bool { true }
}

#[cfg(target_os = "linux")]
pub struct VaapiDecoder;

#[cfg(target_os = "linux")]
impl HardwareDecoderDevice for VaapiDecoder {
    fn name(&self) -> &'static str { "Linux VA-API (libva / Vulkan DMABUF)" }
    fn is_zero_copy(&self) -> bool { true }
    fn supports_10bit_hdr(&self) -> bool { true }
}

pub struct SoftwareDecoder;

impl HardwareDecoderDevice for SoftwareDecoder {
    fn name(&self) -> &'static str { "FFmpeg Software Decoder (CPU swscale)" }
    fn is_zero_copy(&self) -> bool { false }
    fn supports_10bit_hdr(&self) -> bool { false }
}
