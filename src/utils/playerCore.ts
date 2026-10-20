/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MPC-Rust Player Core - Pure deterministic logic for media calculations,
 * hardware acceleration profile configuration, aspect ratio letterboxing,
 * Pan & Scan transforms, A-B repeat looping, Go-To frame/timecode parsing,
 * chapter navigation, and SubRip (.srt) subtitle parsing & resynchronization.
 */

export type AspectRatioMode = 'keep' | 'fill' | '4:3' | '16:9' | '16:10' | '21:9' | '1.85:1' | '2.35:1' | 'custom';

export type VideoFrameMode = 'inside' | 'outside' | 'stretch' | 'half' | 'normal' | 'double';

export type OperatingSystem = 'windows' | 'macos' | 'linux';

export type HardwareDecoder = 'd3d11va' | 'dxva2' | 'videotoolbox' | 'vaapi' | 'vdpau' | 'nvdec' | 'software';

export type ViewPreset = 'minimal' | 'compact' | 'normal';

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

export interface ChapterMarker {
  id: string;
  title: string;
  time: number; // seconds
}

export interface FavoriteBookmark {
  id: string;
  trackId: string;
  trackTitle: string;
  time: number;
  label: string;
  createdAt: string;
}

export interface PanScanState {
  zoomX: number; // 1.0 = 100%
  zoomY: number; // 1.0 = 100%
  panX: number;  // percentage -100 to 100
  panY: number;  // percentage -100 to 100
  rotation: 0 | 90 | 180 | 270;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export interface ColorControlState {
  brightness: number; // -100 to +100 (0 default)
  contrast: number;   // -100 to +100 (0 default)
  hue: number;        // -180 to +180 (0 default)
  saturation: number; // -100 to +100 (0 default)
}

export const DEFAULT_PAN_SCAN: PanScanState = {
  zoomX: 1.0,
  zoomY: 1.0,
  panX: 0,
  panY: 0,
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
};

export const DEFAULT_COLOR_CONTROLS: ColorControlState = {
  brightness: 0,
  contrast: 0,
  hue: 0,
  saturation: 0,
};

/**
 * Format seconds into MPC-HC standard timecode (HH:MM:SS or MM:SS)
 */
export function formatTimecode(seconds: number, forceHours = false, includeMillis = false): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const totalMs = Math.round(seconds * 1000);
  const ms = totalMs % 1000;
  const s = Math.floor(totalMs / 1000);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  const base =
    hrs > 0 || forceHours
      ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
      : `${pad(mins)}:${pad(secs)}`;

  return includeMillis ? `${base}.${pad(ms, 3)}` : base;
}

/**
 * Parse MPC-HC Go-To timecode string (e.g., "01:23:45.500", "02:15", "95.5") into seconds
 */
export function parseTimecodeToSeconds(input: string): number | null {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim().replace(',', '.');
  if (!trimmed) return null;

  // Pure number (seconds)
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const val = parseFloat(trimmed);
    return isNaN(val) || val < 0 ? null : val;
  }

  const parts = trimmed.split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10);
    const secs = parseFloat(parts[1]);
    if (isNaN(mins) || isNaN(secs) || mins < 0 || secs < 0) return null;
    return mins * 60 + secs;
  }

  if (parts.length === 3) {
    const hrs = parseInt(parts[0], 10);
    const mins = parseInt(parts[1], 10);
    const secs = parseFloat(parts[2]);
    if (isNaN(hrs) || isNaN(mins) || isNaN(secs) || hrs < 0 || mins < 0 || secs < 0) return null;
    return hrs * 3600 + mins * 60 + secs;
  }

  return null;
}

/**
 * Convert frame number and FPS to timestamp in seconds
 */
export function frameToSeconds(frame: number, fps = 24): number {
  if (fps <= 0 || frame <= 0) return 0;
  return frame / fps;
}

/**
 * Convert timestamp in seconds to exact frame index
 */
export function secondsToFrame(seconds: number, fps = 24): number {
  if (fps <= 0 || seconds <= 0) return 0;
  return Math.floor(seconds * fps);
}

/**
 * Evaluate A-B Repeat Loop state; returns target seek time if loopB reached
 */
export function evaluateAbLoop(
  currentTime: number,
  loopA: number | null,
  loopB: number | null
): number | null {
  if (loopA !== null && loopB !== null && loopB > loopA) {
    if (currentTime >= loopB || currentTime < loopA) {
      return loopA;
    }
  }
  return null;
}

/**
 * Find the currently active chapter for a given playback time
 */
export function getActiveChapter(chapters: ChapterMarker[], currentTime: number): ChapterMarker | null {
  if (!chapters || chapters.length === 0) return null;
  const sorted = [...chapters].sort((a, b) => a.time - b.time);
  let active = sorted[0];
  for (const ch of sorted) {
    if (currentTime >= ch.time) {
      active = ch;
    } else {
      break;
    }
  }
  return active;
}

/**
 * Calculate CSS transform string for MPC-HC Pan & Scan state
 */
export function calculatePanScanTransform(panScan: PanScanState): string {
  const scaleX = panScan.zoomX * (panScan.flipHorizontal ? -1 : 1);
  const scaleY = panScan.zoomY * (panScan.flipVertical ? -1 : 1);
  return `translate(${panScan.panX}%, ${panScan.panY}%) rotate(${panScan.rotation}deg) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
}

/**
 * Calculate CSS filter string for MPC-HC Color Controls (Brightness, Contrast, Hue, Saturation)
 */
export function calculateColorFilterCss(color: ColorControlState): string {
  const b = Math.max(0, 100 + color.brightness);
  const c = Math.max(0, 100 + color.contrast);
  const s = Math.max(0, 100 + color.saturation);
  const h = color.hue;
  return `brightness(${b}%) contrast(${c}%) saturate(${s}%) hue-rotate(${h}deg)`;
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
  else if (mode === '16:10') targetRatio = 16 / 10;
  else if (mode === '21:9') targetRatio = 21 / 9;
  else if (mode === '1.85:1') targetRatio = 1.85;
  else if (mode === '2.35:1') targetRatio = 2.35;
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
    renderWidth = containerWidth;
    renderHeight = containerWidth / targetRatio;
  } else {
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
 * Step playback rate up or down within MPC-HC range (0.125x to 8.0x)
 */
export function stepPlaybackRate(currentRate: number, direction: 'up' | 'down'): number {
  const rates = [0.125, 0.25, 0.5, 0.75, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0, 3.0, 4.0, 8.0];
  const tolerance = 0.03;

  let index = rates.findIndex((r) => Math.abs(r - currentRate) < tolerance);
  if (index === -1) {
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
      apiName: 'CPU Software (FFmpeg AVCodec + SIMD AVX2 swscale)',
      backend: 'CPU (Software)',
      zeroCopy: false,
      hdrSupported: false,
      maxResolution: '4096x2160 @ 30fps',
      recommendedColorFormat: 'YUV420P',
    };
  }

  if (preferred === 'nvdec') {
    return {
      os,
      decoder: 'nvdec',
      apiName: 'NVIDIA NVDEC Hardware Decoder (CUDA Zero-Copy)',
      backend: os === 'windows' ? 'Direct3D 11/12' : 'Vulkan',
      zeroCopy: true,
      hdrSupported: true,
      maxResolution: '8192x4320 @ 120fps (AV1/HEVC 10-bit)',
      recommendedColorFormat: 'NV12 / P010 (10-bit HDR)',
    };
  }

  switch (os) {
    case 'windows':
      if (preferred === 'dxva2') {
        return {
          os: 'windows',
          decoder: 'dxva2',
          apiName: 'DirectX Video Acceleration 2.0 (DXVA2 Native)',
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
        apiName: 'Direct3D 11 Video Acceleration (D3D11VA Zero-Copy)',
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
        apiName: 'Apple VideoToolbox (CoreVideo CVPixelBuffer IOSurface)',
        backend: 'Metal',
        zeroCopy: true,
        hdrSupported: true,
        maxResolution: '8192x4320 @ 60fps (ProRes/HEVC/AV1)',
        recommendedColorFormat: 'kCVPixelFormatType_420YpCbCr10BiPlanarVideoRange',
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
        apiName: 'Linux VA-API (libva / Vulkan DMABUF Zero-Copy)',
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
        id: cues.length + 1,
        startTime: startSecs,
        endTime: endSecs,
        text,
      });
    }
  }

  return cues;
}

/**
 * Format seconds as SubRip timestamp (HH:MM:SS,mmm)
 */
export function formatSrtTimestamp(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const totalMs = Math.round(clamped * 1000);
  const ms = totalMs % 1000;
  const s = Math.floor(totalMs / 1000);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number, len = 2) => n.toString().padStart(len, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)},${pad(ms, 3)}`;
}

/**
 * Shift all subtitle cues by a delta in seconds (Subresync module)
 */
export function shiftSubtitleCues(cues: SubtitleCue[], deltaSeconds: number): SubtitleCue[] {
  return cues.map((cue) => ({
    ...cue,
    startTime: Math.max(0, Number((cue.startTime + deltaSeconds).toFixed(3))),
    endTime: Math.max(0.1, Number((cue.endTime + deltaSeconds).toFixed(3))),
  }));
}

/**
 * Export SubtitleCue array back to valid SubRip (.srt) file string
 */
export function exportSrt(cues: SubtitleCue[]): string {
  return cues
    .map(
      (cue, idx) =>
        `${idx + 1}\n${formatSrtTimestamp(cue.startTime)} --> ${formatSrtTimestamp(cue.endTime)}\n${cue.text}`
    )
    .join('\n\n');
}
