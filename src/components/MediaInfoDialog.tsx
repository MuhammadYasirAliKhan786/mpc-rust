/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Info, X, Film, Music, Cpu, Layers } from 'lucide-react';
import { HardwareProfile } from '../utils/playerCore';

interface MediaInfoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mediaDetails: {
    title: string;
    url: string;
    duration: number;
    videoWidth: number;
    videoHeight: number;
    fps: number;
    codec: string;
    audioCodec: string;
    audioChannels: string;
    sampleRate: number;
    colorSpace: string;
    bitrate: string;
  };
  hardwareProfile: HardwareProfile;
  activeShader: string;
}

export const MediaInfoDialog: React.FC<MediaInfoDialogProps> = ({
  isOpen,
  onClose,
  mediaDetails,
  hardwareProfile,
  activeShader,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'graph'>('details');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[#232429] text-[#dedede] border border-[#3e404b] rounded shadow-2xl w-full max-w-xl font-sans text-xs select-none">
        {/* Title bar */}
        <div className="bg-[#1a1b20] px-3 py-2 border-b border-[#32343e] flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium text-sm text-gray-200">
            <Info className="w-4 h-4 text-sky-400" />
            <span>MPC-Rust Properties & Media Information</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
            aria-label="Close Properties"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-[#32343e] bg-[#1d1e23] px-3 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-3 py-1.5 font-medium rounded-t border-t border-x ${
              activeTab === 'details'
                ? 'bg-[#232429] border-[#3e404b] text-sky-400 border-b-transparent'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            MediaInfo Details
          </button>
          <button
            onClick={() => setActiveTab('graph')}
            className={`px-3 py-1.5 font-medium rounded-t border-t border-x ${
              activeTab === 'graph'
                ? 'bg-[#232429] border-[#3e404b] text-sky-400 border-b-transparent'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Filter Graph Architecture
          </button>
        </div>

        {/* Tab content */}
        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4">
          {activeTab === 'details' ? (
            <>
              {/* General Info */}
              <div className="bg-[#1c1d22] p-3 rounded border border-[#30323c] space-y-1.5">
                <div className="flex items-center gap-2 text-sky-400 font-semibold mb-2">
                  <Film className="w-3.5 h-3.5" />
                  <span>General File Metadata</span>
                </div>
                <div className="grid grid-cols-3 gap-y-1 text-gray-300">
                  <span className="text-gray-500">File Name:</span>
                  <span className="col-span-2 font-mono text-gray-200 truncate">{mediaDetails.title}</span>
                  <span className="text-gray-500">Duration:</span>
                  <span className="col-span-2 font-mono">{Math.floor(mediaDetails.duration)} seconds</span>
                  <span className="text-gray-500">Overall Bitrate:</span>
                  <span className="col-span-2 font-mono">{mediaDetails.bitrate}</span>
                  <span className="text-gray-500">Container Format:</span>
                  <span className="col-span-2 font-mono">ISO Media / MP4 v2 (Matroska / WebM compatible)</span>
                </div>
              </div>

              {/* Video Info */}
              <div className="bg-[#1c1d22] p-3 rounded border border-[#30323c] space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Video Stream Details</span>
                </div>
                <div className="grid grid-cols-3 gap-y-1 text-gray-300">
                  <span className="text-gray-500">Codec Profile:</span>
                  <span className="col-span-2 font-mono text-emerald-400">{mediaDetails.codec} (High@L5.1)</span>
                  <span className="text-gray-500">Dimensions:</span>
                  <span className="col-span-2 font-mono">{mediaDetails.videoWidth} x {mediaDetails.videoHeight}</span>
                  <span className="text-gray-500">Display Aspect Ratio:</span>
                  <span className="col-span-2 font-mono">{(mediaDetails.videoWidth / (mediaDetails.videoHeight || 1)).toFixed(3)}:1 (16:9)</span>
                  <span className="text-gray-500">Frame Rate:</span>
                  <span className="col-span-2 font-mono">{mediaDetails.fps} fps (CFR)</span>
                  <span className="text-gray-500">Color Primaries:</span>
                  <span className="col-span-2 font-mono">{mediaDetails.colorSpace}</span>
                  <span className="text-gray-500">Chroma Subsampling:</span>
                  <span className="col-span-2 font-mono">{hardwareProfile.recommendedColorFormat}</span>
                </div>
              </div>

              {/* Audio Info */}
              <div className="bg-[#1c1d22] p-3 rounded border border-[#30323c] space-y-1.5">
                <div className="flex items-center gap-2 text-amber-400 font-semibold mb-2">
                  <Music className="w-3.5 h-3.5" />
                  <span>Audio Stream Details</span>
                </div>
                <div className="grid grid-cols-3 gap-y-1 text-gray-300">
                  <span className="text-gray-500">Format:</span>
                  <span className="col-span-2 font-mono text-amber-400">{mediaDetails.audioCodec}</span>
                  <span className="text-gray-500">Channels:</span>
                  <span className="col-span-2 font-mono">{mediaDetails.audioChannels}</span>
                  <span className="text-gray-500">Sampling Rate:</span>
                  <span className="col-span-2 font-mono">{mediaDetails.sampleRate} Hz</span>
                  <span className="text-gray-500">Bit Depth:</span>
                  <span className="col-span-2 font-mono">32-bit Floating Point</span>
                </div>
              </div>
            </>
          ) : (
            /* Filter Graph Architecture Tab */
            <div className="space-y-3">
              <div className="text-xs text-gray-400">
                In classic C++ MPC-HC, playback was orchestrated by DirectShow <code className="text-sky-300">IGraphBuilder</code>.
                In <strong>MPC-Rust</strong>, this is replaced by a lock-free Tokio actor channel graph connecting zero-copy hardware decoders to native OS compositors:
              </div>

              <div className="flex flex-col gap-2 font-mono text-xs">
                {/* Node 1 */}
                <div className="p-2.5 bg-[#191a1f] border border-[#373944] rounded">
                  <div className="text-sky-400 font-bold">[1] Async Demuxer (mpc-core)</div>
                  <div className="text-gray-400 text-[11px] mt-0.5">Demuxes ISO/MKV packets -&gt; crossbeam channel (Ring buffer: 128 frames)</div>
                </div>

                <div className="text-center text-gray-500">↓ (VideoPackets / Zero-Copy)</div>

                {/* Node 2 */}
                <div className="p-2.5 bg-[#191a1f] border border-emerald-900/60 rounded bg-emerald-950/20">
                  <div className="text-emerald-400 font-bold">[2] Hardware Video Decoder ({hardwareProfile.apiName})</div>
                  <div className="text-gray-400 text-[11px] mt-0.5">
                    Backend: {hardwareProfile.backend} • Zero-Copy: {hardwareProfile.zeroCopy ? 'Enabled' : 'Disabled'} • HDR: {hardwareProfile.hdrSupported ? 'Ready' : 'SDR'}
                  </div>
                </div>

                <div className="text-center text-gray-500">↓ (GPU Texture Swapchain)</div>

                {/* Node 3 */}
                <div className="p-2.5 bg-[#191a1f] border border-purple-900/60 rounded bg-purple-950/20">
                  <div className="text-purple-400 font-bold">[3] Post-Processing Pixel Shaders</div>
                  <div className="text-gray-400 text-[11px] mt-0.5">
                    Active Shader: <span className="text-purple-300 font-semibold">{activeShader}</span> (WGPU WGSL / Direct3D HLSL)
                  </div>
                </div>

                <div className="text-center text-gray-500">↓ (VSync Presentation)</div>

                {/* Node 4 */}
                <div className="p-2.5 bg-[#191a1f] border border-amber-900/60 rounded bg-amber-950/20">
                  <div className="text-amber-400 font-bold">[4] Native OS Presenter (mpc-ui)</div>
                  <div className="text-gray-400 text-[11px] mt-0.5">
                    Windows: DirectComposition / macOS: CAMetalLayer / Linux: Wayland DMABUF Surface
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#1c1d22] px-4 py-2.5 border-t border-[#32343e] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
