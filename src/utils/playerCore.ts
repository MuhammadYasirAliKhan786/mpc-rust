/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * MPC-Rust Player Core - Pure deterministic logic for media calculations,
 * hardware acceleration profile configuration, aspect ratio letterboxing,
 * timecode formatting, and subtitle parsing.
 */

export type AspectRatioMode = 'keep' | 'fill' | '4:3' | '16:9' | '21:9' | 'custom';

export type OperatingSystem = 'windows' | 'macos' | 'linux';

export type HardwareDecoder = 'd3d11va' | 'dxva2' | 'videotoolbox' | 'vaapi' | 'vdpau' | 'software';

export interface HardwareProfile {
  os: OperatingSystem;
  decoder: HardwareDecoder;
  apiName: string;
  backend: 'Direct3D 11/12' | 'Metal' | 'Vulkan' | 'CPU (Software)';
  zeroCopy: boolean;
  hdrSupported: boolean;
  maxResolution: string;
  recommendedColorFormat: string;
}

export interface VideoDimensions {
  renderWidth: number;
  renderHeight: number;
  offsetX: number;
  offsetY: number;
}

export interface SubtitleCue {
  id: number;
  startTime: number;
  endTime: number;
  text: string;
}

/**
 * Format seconds into MPC-HC standard timecode (HH:MM:SS or MM:SS)
 */
export function formatTimecode(seconds: number, forceHours = false): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const s = Math.floor(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0 || forceHours) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Calculate video render dimensions and letterboxing offset based on aspect ratio mode
 */
export function calculateVideoDimensions(
  videoWidth: number,
  videoHeight: number,
  containerWidth: number,
  containerHeight: number,
  mode: AspectRatioMode = 'keep'
): VideoDimensions {
  if (videoWidth <= 0 || videoHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { renderWidth: 0, renderHeight: 0, offsetX: 0, offsetY: 0 };
  }

  let targetRatio = videoWidth / videoHeight;

  if (mode === '4:3') targetRatio = 4 / 3;
  else if (mode === '16:9') targetRatio = 16 / 9;
  else if (mode === '21:9') targetRatio = 21 / 9;
  else if (mode === 'fill') {
    return {
      renderWidth: containerWidth,
      renderHeight: containerHeight,
      offsetX: 0,
      offsetY: 0,
    };
  }

  const containerRatio = containerWidth / containerHeight;
  let renderWidth = containerWidth;
  let renderHeight = containerHeight;

  if (targetRatio > containerRatio) {
    // Letterbox top and bottom
    renderWidth = containerWidth;
    renderHeight = containerWidth / targetRatio;
  } else {
    // Pillarbox left and right
    renderHeight = containerHeight;
    renderWidth = containerHeight * targetRatio;
  }

  const offsetX = (containerWidth - renderWidth) / 2;
  const offsetY = (containerHeight - renderHeight) / 2;

  return {
    renderWidth: Math.round(renderWidth),
    renderHeight: Math.round(renderHeight),
    offsetX: Math.round(offsetX),
    offsetY: Math.round(offsetY),
  };
}

/**
 * Calculate frame step duration in seconds for precision single-frame stepping
 */
export function getFrameDuration(fps = 23.976): number {
  if (fps <= 0) return 1 / 23.976;
  return 1 / fps;
}

/**
 * Step playback rate up or down within MPC-HC range (0.25x to 4x)
 */
export function stepPlaybackRate(currentRate: number, direction: 'up' | 'down'): number {
  const rates = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 3.0, 4.0];
  const tolerance = 0.05;

  let index = rates.findIndex((r) => Math.abs(r - currentRate) < tolerance);
  if (index === -1) {
    // Find closest rate
    index = rates.reduce((prevIdx, curr, idx) => {
      return Math.abs(curr - currentRate) < Math.abs(rates[prevIdx] - currentRate) ? idx : prevIdx;
    }, 0);
  }

  if (direction === 'up') {
    return rates[Math.min(rates.length - 1, index + 1)];
  } else {
    return rates[Math.max(0, index - 1)];
  }
}

/**
 * Resolve hardware acceleration configuration based on Target OS and decoder
 */
export function getHardwareProfile(os: OperatingSystem, preferred?: HardwareDecoder): HardwareProfile {
  if (preferred === 'software') {
    return {
      os,
      decoder: 'software',
      apiName: 'CPU Software (FFmpeg AVCodec swscale)',
      backend: 'CPU (Software)',
      zeroCopy: false,
      hdrSupported: false,
      maxResolution: '4096x2160 @ 30fps',
      recommendedColorFormat: 'YUV420P',
    };
  }

  switch (os) {
    case 'windows':
      if (preferred === 'dxva2') {
        return {
          os: 'windows',
          decoder: 'dxva2',
          apiName: 'DirectX Video Acceleration 2.0 (DXVA2)',
          backend: 'Direct3D 11/12',
          zeroCopy: true,
          hdrSupported: true,
          maxResolution: '8192x4320 @ 60fps',
          recommendedColorFormat: 'NV12 / P010 (10-bit HDR)',
        };
      }
      return {
        os: 'windows',
        decoder: 'd3d11va',
        apiName: 'Direct3D 11 Video Acceleration (D3D11VA)',
        backend: 'Direct3D 11/12',
        zeroCopy: true,
        hdrSupported: true,
        maxResolution: '8192x4320 @ 120fps',
        recommendedColorFormat: 'NV12 / P010 (10-bit HDR)',
      };

    case 'macos':
      return {
        os: 'macos',
        decoder: 'videotoolbox',
        apiName: 'Apple VideoToolbox (CoreVideo CVPixelBuffer)',
        backend: 'Metal',
        zeroCopy: true,
        hdrSupported: true,
        maxResolution: '8192x4320 @ 60fps (ProRes/HEVC)',
        recommendedColorFormat: 'kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange / 10-bit',
      };

    case 'linux':
      if (preferred === 'vdpau') {
        return {
          os: 'linux',
          decoder: 'vdpau',
          apiName: 'NVIDIA VDPAU (Video Decode and Presentation API)',
          backend: 'Vulkan',
          zeroCopy: true,
          hdrSupported: false,
          maxResolution: '4096x2160 @ 60fps',
          recommendedColorFormat: 'NV12 / YV12',
        };
      }
      return {
        os: 'linux',
        decoder: 'vaapi',
        apiName: 'Linux VA-API (Video Acceleration API via libva)',
        backend: 'Vulkan',
        zeroCopy: true,
        hdrSupported: true,
        maxResolution: '8192x4320 @ 60fps',
        recommendedColorFormat: 'VA_FOURCC_NV12 / P010',
      };
  }
}

/**
 * Simple parser for SubRip (.srt) subtitle text
 */
export function parseSrt(srtContent: string): SubtitleCue[] {
  if (!srtContent || typeof srtContent !== 'string') return [];
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.trim().split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i].trim().split('\n');
    if (lines.length < 2) continue;

    let timeLineIndex = 0;
    if (/^\d+$/.test(lines[0])) {
      timeLineIndex = 1;
    }

    if (!lines[timeLineIndex]) continue;
    const timeMatch = lines[timeLineIndex].match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );

    if (timeMatch) {
      const startSecs =
        parseInt(timeMatch[1], 10) * 3600 +
        parseInt(timeMatch[2], 10) * 60 +
        parseInt(timeMatch[3], 10) +
        parseInt(timeMatch[4], 10) / 1000;

      const endSecs =
        parseInt(timeMatch[5], 10) * 3600 +
        parseInt(timeMatch[6], 10) * 60 +
        parseInt(timeMatch[7], 10) +
        parseInt(timeMatch[8], 10) / 1000;

      const text = lines.slice(timeLineIndex + 1).join('\n');
      cues.push({
        id: i + 1,
        startTime: startSecs,
        endTime: endSecs,
        text,
      });
    }
  }

  return cues;
}
