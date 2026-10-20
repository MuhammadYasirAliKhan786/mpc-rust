/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Authentic MPC-HC "Go To..." Dialog (Ctrl+G)
 * Allows jumping to an exact Timecode (HH:MM:SS.ms) or exact Frame Number + Frame Rate.
 */

import React, { useState, useEffect } from 'react';
import { Clock, Film, X, Check } from 'lucide-react';
import {
  formatTimecode,
  parseTimecodeToSeconds,
  frameToSeconds,
  secondsToFrame,
} from '../utils/playerCore';

interface GoToDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentTime: number;
  duration: number;
  fps: number;
  onSeek: (targetSeconds: number) => void;
}

export const GoToDialog: React.FC<GoToDialogProps> = ({
  isOpen,
  onClose,
  currentTime,
  duration,
  fps,
  onSeek,
}) => {
  const [timecodeInput, setTimecodeInput] = useState('00:00:00.000');
  const [frameInput, setFrameInput] = useState('0');
  const [fpsInput, setFpsInput] = useState(fps.toString());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimecodeInput(formatTimecode(currentTime, true, true));
      setFrameInput(secondsToFrame(currentTime, fps).toString());
      setFpsInput(fps.toFixed(3).replace(/\.?0+$/, ''));
      setErrorMsg(null);
    }
  }, [isOpen, currentTime, fps]);

  if (!isOpen) return null;

  const handleGoTimecode = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseTimecodeToSeconds(timecodeInput);
    if (parsed === null) {
      setErrorMsg('Invalid timecode format. Use HH:MM:SS.ms or MM:SS.');
      return;
    }
    const clamped = duration > 0 ? Math.min(parsed, duration) : parsed;
    onSeek(clamped);
    onClose();
  };

  const handleGoFrame = (e: React.FormEvent) => {
    e.preventDefault();
    const frameNum = parseInt(frameInput, 10);
    const parsedFps = parseFloat(fpsInput) || fps;
    if (isNaN(frameNum) || frameNum < 0 || parsedFps <= 0) {
      setErrorMsg('Please enter a valid non-negative frame number and FPS.');
      return;
    }
    const targetSec = frameToSeconds(frameNum, parsedFps);
    const clamped = duration > 0 ? Math.min(targetSec, duration) : targetSec;
    onSeek(clamped);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
      <div
        role="dialog"
        aria-label="Go To Timecode or Frame"
        className="bg-[#232429] text-[#e0e0e0] border border-[#3e404c] rounded shadow-2xl w-full max-w-md font-sans text-xs select-none"
      >
        {/* Title bar */}
        <div className="bg-[#191a1f] px-3 py-2 border-b border-[#343640] flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-sm text-gray-200">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Go To... (Ctrl+G)</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
            aria-label="Close Go To Dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {errorMsg && (
            <div className="p-2 bg-rose-950/60 border border-rose-500/50 rounded text-rose-300 text-[11px]">
              {errorMsg}
            </div>
          )}

          {/* Timecode Jump Row */}
          <form onSubmit={handleGoTimecode} className="space-y-1.5 bg-[#1b1c21] p-3 rounded border border-[#2f313b]">
            <label className="block font-semibold text-gray-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Timecode (HH:MM:SS.mmm):</span>
              </span>
              <span className="text-[10px] font-mono text-gray-400">
                Max: {formatTimecode(duration, true, true)}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={timecodeInput}
                onChange={(e) => setTimecodeInput(e.target.value)}
                placeholder="00:01:24.500"
                aria-label="Timecode Input"
                className="flex-1 bg-[#121317] border border-[#383a46] rounded px-2.5 py-1.5 font-mono text-sm text-emerald-300 focus:outline-hidden focus:border-emerald-500"
              />
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded transition flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Go!</span>
              </button>
            </div>
          </form>

          {/* Frame Number Jump Row */}
          <form onSubmit={handleGoFrame} className="space-y-1.5 bg-[#1b1c21] p-3 rounded border border-[#2f313b]">
            <label className="block font-semibold text-gray-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-sky-400" />
                <span>Frame Number &amp; Frame Rate:</span>
              </span>
              <span className="text-[10px] font-mono text-gray-400">
                Total Frames: ~{secondsToFrame(duration, fps)}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={frameInput}
                onChange={(e) => setFrameInput(e.target.value)}
                aria-label="Frame Number Input"
                className="w-28 bg-[#121317] border border-[#383a46] rounded px-2.5 py-1.5 font-mono text-sm text-sky-300 focus:outline-hidden focus:border-sky-500"
              />
              <span className="text-gray-400 text-[11px]">@</span>
              <input
                type="text"
                value={fpsInput}
                onChange={(e) => setFpsInput(e.target.value)}
                aria-label="FPS Input"
                className="w-20 bg-[#121317] border border-[#383a46] rounded px-2 py-1.5 font-mono text-xs text-gray-200 focus:outline-hidden focus:border-sky-500"
              />
              <span className="text-gray-400 text-[11px]">fps</span>
              <button
                type="submit"
                className="ml-auto px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded transition flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Go!</span>
              </button>
            </div>
          </form>

          <div className="flex justify-end pt-1">
            <button
              onClick={onClose}
              className="px-3 py-1 bg-[#2e303a] hover:bg-[#3a3d4a] text-gray-200 rounded border border-[#454857]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
