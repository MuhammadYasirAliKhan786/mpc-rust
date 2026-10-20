/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Settings, X, Monitor, Cpu, Volume2, Type, Keyboard, Layout, ShieldCheck } from 'lucide-react';
import { OperatingSystem, HardwareDecoder, AspectRatioMode } from '../utils/playerCore';

interface OptionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  os: OperatingSystem;
  onSelectOS: (os: OperatingSystem) => void;
  decoder: HardwareDecoder;
  onSelectDecoder: (decoder: HardwareDecoder) => void;
  aspectRatio: AspectRatioMode;
  onSelectAspectRatio: (mode: AspectRatioMode) => void;
  showStats: boolean;
  onToggleStats: (show: boolean) => void;
  autoPlay: boolean;
  onToggleAutoPlay: (auto: boolean) => void;
  loop: boolean;
  onToggleLoop: (loop: boolean) => void;
}

export const OptionsDialog: React.FC<OptionsDialogProps> = ({
  isOpen,
  onClose,
  os,
  onSelectOS,
  decoder,
  onSelectDecoder,
  aspectRatio,
  onSelectAspectRatio,
  showStats,
  onToggleStats,
  autoPlay,
  onToggleAutoPlay,
  loop,
  onToggleLoop,
}) => {
  const [activeCategory, setActiveCategory] = useState<'hardware' | 'os' | 'playback' | 'audio' | 'keys'>('hardware');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[#24252a] text-[#dedede] border border-[#3e414c] rounded shadow-2xl w-full max-w-2xl font-sans text-xs select-none flex flex-col max-h-[85vh]">
        {/* Title bar */}
        <div className="bg-[#1b1c21] px-3 py-2 border-b border-[#353742] flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium text-sm text-gray-200">
            <Settings className="w-4 h-4 text-emerald-400" />
            <span>MPC-Rust Options & Settings</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
            aria-label="Close Options"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body with Left Sidebar + Right Settings Panel */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Category Tree */}
          <div className="w-48 bg-[#1e1f24] border-r border-[#343640] p-2 space-y-1">
            <button
              onClick={() => setActiveCategory('hardware')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left ${
                activeCategory === 'hardware'
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-300 hover:bg-[#282a32]'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Hardware Acceleration</span>
            </button>

            <button
              onClick={() => setActiveCategory('os')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left ${
                activeCategory === 'os'
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-300 hover:bg-[#282a32]'
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              <span>Native OS Framework</span>
            </button>

            <button
              onClick={() => setActiveCategory('playback')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left ${
                activeCategory === 'playback'
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-300 hover:bg-[#282a32]'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Playback & Video</span>
            </button>

            <button
              onClick={() => setActiveCategory('audio')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left ${
                activeCategory === 'audio'
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-300 hover:bg-[#282a32]'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Audio Renderer</span>
            </button>

            <button
              onClick={() => setActiveCategory('keys')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left ${
                activeCategory === 'keys'
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-300 hover:bg-[#282a32]'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Keys & Shortcuts</span>
            </button>
          </div>

          {/* Right Configuration Panel */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {activeCategory === 'hardware' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-200 text-sm mb-1">
                    Zero-Copy Hardware Video Acceleration
                  </h3>
                  <p className="text-gray-400 text-xs">
                    Choose the native hardware decoding pipeline. In the native Rust build, these compile directly into native GPU APIs without DirectShow overhead.
                  </p>
                </div>

                <div className="space-y-2 border border-[#373944] rounded p-3 bg-[#1d1e23]">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="decoder"
                      checked={decoder === 'd3d11va'}
                      onChange={() => onSelectDecoder('d3d11va')}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <div>
                      <div className="font-medium text-gray-200">
                        Direct3D 11 Video Acceleration (D3D11VA) - Windows
                      </div>
                      <div className="text-gray-400 text-[11px]">
                        Zero-copy GPU decoding into DXGI swapchain. Supports 10-bit HDR (HEVC / AV1 / VP9).
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-[#2e303a]">
                    <input
                      type="radio"
                      name="decoder"
                      checked={decoder === 'dxva2'}
                      onChange={() => onSelectDecoder('dxva2')}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <div>
                      <div className="font-medium text-gray-200">
                        DirectX Video Acceleration 2.0 (DXVA2 Native) - Windows Legacy
                      </div>
                      <div className="text-gray-400 text-[11px]">
                        DirectX 9 / EVR-CP compatible decoding mode for legacy Intel / AMD / NVIDIA hardware.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-[#2e303a]">
                    <input
                      type="radio"
                      name="decoder"
                      checked={decoder === 'videotoolbox'}
                      onChange={() => onSelectDecoder('videotoolbox')}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <div>
                      <div className="font-medium text-gray-200">
                        Apple VideoToolbox (Metal Zero-Copy) - macOS
                      </div>
                      <div className="text-gray-400 text-[11px]">
                        Hardware silicon acceleration for Apple Silicon M1-M4 and Intel Macs. Direct CVPixelBuffer into MTLTexture.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-[#2e303a]">
                    <input
                      type="radio"
                      name="decoder"
                      checked={decoder === 'vaapi'}
                      onChange={() => onSelectDecoder('vaapi')}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <div>
                      <div className="font-medium text-gray-200">
                        Linux VA-API (Video Acceleration API) - Linux / Ubuntu
                      </div>
                      <div className="text-gray-400 text-[11px]">
                        libva hardware decoding for Intel, AMD Radeon (Mesa), and modern Linux distributions with Wayland DMABUF.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-[#2e303a]">
                    <input
                      type="radio"
                      name="decoder"
                      checked={decoder === 'software'}
                      onChange={() => onSelectDecoder('software')}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <div>
                      <div className="font-medium text-gray-200">
                        Software Fallback (FFmpeg libavcodec CPU)
                      </div>
                      <div className="text-gray-400 text-[11px]">
                        Multi-threaded CPU software decoding when no compatible GPU hardware decoder is present.
                      </div>
                    </div>
                  </label>
                </div>

                <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded flex items-center gap-2 text-emerald-300">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Hardware Deinterlacing and HDR Tonemapping active on GPU pipeline.</span>
                </div>
              </div>
            )}

            {activeCategory === 'os' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-200 text-sm mb-1">
                    Target Operating System & Native UI Framework
                  </h3>
                  <p className="text-gray-400 text-xs">
                    Switch the player chrome to preview the native OS UI frameworks written for each platform.
                  </p>
                </div>

                <div className="space-y-3">
                  <div
                    onClick={() => onSelectOS('windows')}
                    className={`p-3 rounded border cursor-pointer transition ${
                      os === 'windows'
                        ? 'border-sky-500 bg-sky-950/30'
                        : 'border-[#383a45] bg-[#1e1f25] hover:bg-[#25272e]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-200">Windows (Win32 + Windows 11 Mica / Acrylic)</span>
                      {os === 'windows' && <span className="text-[10px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded">Active</span>}
                    </div>
                    <div className="text-gray-400 text-[11px] mt-1">
                      Crate: <code className="text-sky-300">crates/mpc-ui-win32</code> • High-performance native Win32 windowing with DirectComposition swapchain and classic MPC-HC styling.
                    </div>
                  </div>

                  <div
                    onClick={() => onSelectOS('macos')}
                    className={`p-3 rounded border cursor-pointer transition ${
                      os === 'macos'
                        ? 'border-indigo-500 bg-indigo-950/30'
                        : 'border-[#383a45] bg-[#1e1f25] hover:bg-[#25272e]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-200">macOS (Cocoa AppKit + Metal)</span>
                      {os === 'macos' && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">Active</span>}
                    </div>
                    <div className="text-gray-400 text-[11px] mt-1">
                      Crate: <code className="text-indigo-300">crates/mpc-ui-macos</code> • Native Cocoa NSWindow, CAMetalLayer hardware canvas, macOS Menu Bar, and Touch Bar controls.
                    </div>
                  </div>

                  <div
                    onClick={() => onSelectOS('linux')}
                    className={`p-3 rounded border cursor-pointer transition ${
                      os === 'linux'
                        ? 'border-amber-500 bg-amber-950/30'
                        : 'border-[#383a45] bg-[#1e1f25] hover:bg-[#25272e]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-200">Linux Ubuntu (GTK4 + Libadwaita + Wayland)</span>
                      {os === 'linux' && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded">Active</span>}
                    </div>
                    <div className="text-gray-400 text-[11px] mt-1">
                      Crate: <code className="text-amber-300">crates/mpc-ui-linux</code> • Modern GNOME Adwaita dark styling, Wayland native compositing, and MPRIS D-Bus player controls.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'playback' && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-200 text-sm mb-1">Video & Aspect Ratio</h3>
                
                <div className="space-y-2 border border-[#373944] rounded p-3 bg-[#1d1e23]">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Aspect Ratio Mode:</span>
                    <select
                      value={aspectRatio}
                      onChange={(e) => onSelectAspectRatio(e.target.value as AspectRatioMode)}
                      className="bg-[#292a32] text-gray-200 border border-[#444653] rounded px-2 py-1 text-xs"
                    >
                      <option value="keep">Keep Aspect Ratio (Auto Letterbox)</option>
                      <option value="fill">Fill / Stretch Window</option>
                      <option value="16:9">16:9 Widescreen</option>
                      <option value="4:3">4:3 Standard</option>
                      <option value="21:9">21:9 UltraWide Cinema</option>
                    </select>
                  </div>

                  <div className="pt-2 border-t border-[#2e303a] space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showStats}
                        onChange={(e) => onToggleStats(e.target.checked)}
                        className="accent-emerald-500"
                      />
                      <span className="text-gray-200">Display Renderer Statistics Overlay (Ctrl+J)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={loop}
                        onChange={(e) => onToggleLoop(e.target.checked)}
                        className="accent-emerald-500"
                      />
                      <span className="text-gray-200">Repeat / Loop playback forever</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'audio' && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-200 text-sm mb-1">Audio Processing & Output</h3>
                <div className="p-3 bg-[#1d1e23] border border-[#373944] rounded space-y-2 text-gray-300">
                  <div className="flex justify-between items-center">
                    <span>Audio Driver Backend:</span>
                    <span className="font-mono text-emerald-400">CPAL (WASAPI / CoreAudio / ALSA)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Sampling Buffer Size:</span>
                    <span className="font-mono">512 samples (~10.6ms low latency)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Surround Downmixing:</span>
                    <span className="font-mono">ITU-R BS.775 5.1 -&gt; Stereo</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Pitch Preservation on Speed Change:</span>
                    <span className="font-mono text-sky-400">WSOLA Phase Vocoder Active</span>
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'keys' && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-200 text-sm mb-1">MPC-HC Keyboard Shortcuts</h3>
                <div className="border border-[#373944] rounded overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#1a1b20] text-gray-400 uppercase">
                      <tr>
                        <th className="p-2">Action</th>
                        <th className="p-2">Key Shortcut</th>
                        <th className="p-2">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2d2f38] bg-[#1f2026] text-gray-300">
                      <tr>
                        <td className="p-2 font-medium">Play / Pause</td>
                        <td className="p-2 font-mono text-emerald-400">Space</td>
                        <td className="p-2">Toggle media playback</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Render Stats HUD</td>
                        <td className="p-2 font-mono text-emerald-400">Ctrl + J</td>
                        <td className="p-2">Toggle MPC-HC/EVR-CP debug graphs</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Frame Step</td>
                        <td className="p-2 font-mono text-emerald-400">Period (.)</td>
                        <td className="p-2">Step forward by exact 1 video frame</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Rate Faster / Slower</td>
                        <td className="p-2 font-mono text-emerald-400">[ and ]</td>
                        <td className="p-2">Change playback speed (0.25x - 4x)</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Seek Forward / Back</td>
                        <td className="p-2 font-mono text-emerald-400">← and →</td>
                        <td className="p-2">Jump 5 seconds</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Fullscreen</td>
                        <td className="p-2 font-mono text-emerald-400">F or Alt+Enter</td>
                        <td className="p-2">Toggle fullscreen video mode</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">Mute</td>
                        <td className="p-2 font-mono text-emerald-400">M</td>
                        <td className="p-2">Toggle audio mute</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#1b1c21] px-4 py-2.5 border-t border-[#353742] flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded transition"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
