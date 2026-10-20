/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Volume2, Sliders, RotateCcw, X, Activity } from 'lucide-react';

export interface EqualizerBand {
  freq: number;
  label: string;
  gain: number; // -12 to +12 dB
}

interface AudioEqualizerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bands: EqualizerBand[];
  onBandChange: (index: number, gain: number) => void;
  onReset: () => void;
  enabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
}

const PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  Rock: [4, 3, 2, -1, -2, 0, 2, 4, 5, 5],
  Pop: [-1, 1, 3, 4, 3, 0, -1, 1, 3, 4],
  'Movie / Theater': [4, 3, 1, 0, 2, 3, 2, 1, 3, 4],
  'Vocal Clarity': [-3, -2, -1, 1, 4, 5, 4, 2, 0, -2],
};

export const AudioEqualizerDialog: React.FC<AudioEqualizerDialogProps> = ({
  isOpen,
  onClose,
  bands,
  onBandChange,
  onReset,
  enabled,
  onToggleEnabled,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('Flat');

  if (!isOpen) return null;

  const handleApplyPreset = (presetName: string) => {
    setSelectedPreset(presetName);
    const gains = PRESETS[presetName];
    if (gains) {
      gains.forEach((g, idx) => {
        onBandChange(idx, g);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[#24252a] text-[#e0e0e0] border border-[#3f414a] rounded shadow-2xl w-full max-w-2xl font-sans text-xs select-none">
        {/* Title Bar */}
        <div className="bg-[#1b1c20] px-3 py-2 border-b border-[#353740] flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium text-sm text-gray-200">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>MPC-Rust - 10-Band Parametric Audio Equalizer</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
            aria-label="Close Equalizer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1e1f24] p-2.5 rounded border border-[#33353e]">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => onToggleEnabled(e.target.checked)}
                  className="rounded border-gray-600 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="font-semibold text-gray-200">Enable Equalizer (DSP)</span>
              </label>

              <span className="text-gray-500">|</span>

              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">Preset:</span>
                <select
                  value={selectedPreset}
                  onChange={(e) => handleApplyPreset(e.target.value)}
                  className="bg-[#2b2c34] text-gray-200 border border-[#444652] rounded px-2 py-0.5 text-xs focus:outline-hidden focus:border-emerald-500"
                >
                  {Object.keys(PRESETS).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={onReset}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#32343d] hover:bg-[#3d404b] text-gray-200 rounded border border-[#464956] transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to 0 dB</span>
            </button>
          </div>

          {/* Equalizer Frequency Sliders */}
          <div className={`p-4 bg-[#191a1e] rounded border border-[#2e3038] transition ${!enabled ? 'opacity-40 pointer-events-none' : ''}`}>
            {/* dB scale markers */}
            <div className="flex justify-between text-[10px] text-gray-500 mb-2 px-1">
              <span>+12 dB</span>
              <span>0 dB (Flat)</span>
              <span>-12 dB</span>
            </div>

            <div className="grid grid-cols-10 gap-2 items-end h-44 pb-2">
              {bands.map((band, idx) => (
                <div key={band.freq} className="flex flex-col items-center h-full justify-between">
                  <span className="text-[10px] font-mono text-emerald-400">
                    {band.gain > 0 ? `+${band.gain}` : band.gain}
                  </span>

                  <div className="h-32 flex items-center justify-center my-1 relative">
                    {/* Zero-line marker */}
                    <div className="absolute w-full h-[1px] bg-gray-700 pointer-events-none" />
                    
                    <input
                      type="range"
                      min="-12"
                      max="12"
                      step="1"
                      value={band.gain}
                      onChange={(e) => onBandChange(idx, parseInt(e.target.value, 10))}
                      className="h-28 w-2 accent-emerald-500 cursor-pointer -rotate-90 origin-center"
                      style={{ transform: 'rotate(-90deg)' }}
                      aria-label={`Gain for ${band.label}`}
                    />
                  </div>

                  <span className="text-[10px] font-mono text-gray-300 font-semibold mt-1">
                    {band.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Filter Topology: 10-Band Biquad Peaking IIR Filter (Q=1.414)</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded shadow transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
