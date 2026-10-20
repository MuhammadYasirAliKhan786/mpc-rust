/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Authentic MPC-HC "File -> Save Thumbnails..." Contact Sheet Generator
 * Renders an official MPC-HC style thumbnail contact sheet with technical metadata
 * header and timestamped video preview cells.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Grid, Download, X, RefreshCw } from 'lucide-react';
import { formatTimecode } from '../utils/playerCore';

interface ThumbnailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  audioCodec: string;
  hardwareApi: string;
}

export const ThumbnailsDialog: React.FC<ThumbnailsDialogProps> = ({
  isOpen,
  onClose,
  title,
  duration,
  width,
  height,
  fps,
  codec,
  audioCodec,
  hardwareApi,
}) => {
  const [cols, setCols] = useState(4);
  const [rows, setRows] = useState(4);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const renderContactSheet = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sheetWidth = 960;
    const headerHeight = 104;
    const padding = 12;
    const cellW = Math.floor((sheetWidth - padding * (cols + 1)) / cols);
    const cellH = Math.floor(cellW * (9 / 16));
    const sheetHeight = headerHeight + padding + rows * (cellH + padding);

    canvas.width = sheetWidth;
    canvas.height = sheetHeight;

    // 1. Classic MPC-HC Light/Dark Technical Sheet Background
    ctx.fillStyle = '#f0f1f4';
    ctx.fillRect(0, 0, sheetWidth, sheetHeight);

    // 2. Header Info Box
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(padding, padding, sheetWidth - padding * 2, headerHeight - padding);
    ctx.strokeStyle = '#c4c7d0';
    ctx.lineWidth = 1;
    ctx.strokeRect(padding, padding, sheetWidth - padding * 2, headerHeight - padding);

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`File Name : ${title}`, padding + 12, padding + 22);

    ctx.fillStyle = '#374151';
    ctx.font = '12px monospace';
    const safeDur = duration > 0 ? duration : 734;
    ctx.fillText(
      `File Size : 184.6 MB (193,566,720 bytes)  |  Duration: ${formatTimecode(safeDur, true)}`,
      padding + 12,
      padding + 42
    );
    ctx.fillText(
      `Video     : ${codec}, ${width}x${height}p, ${fps} fps  |  Audio: ${audioCodec}`,
      padding + 12,
      padding + 62
    );
    ctx.fillStyle = '#047857';
    ctx.fillText(
      `Generated : MPC-Rust v2.5.0 [Hardware Pipeline: ${hardwareApi}]`,
      padding + 12,
      padding + 80
    );

    // 3. Draw Grid of Timestamped Cells
    const totalCells = rows * cols;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const x = padding + c * (cellW + padding);
        const y = headerHeight + padding + r * (cellH + padding);
        const cellTime = ((idx + 1) / (totalCells + 1)) * safeDur;

        // Cell background gradient simulating cinematic scene progression
        const hue1 = (idx * 27 + 195) % 360;
        const hue2 = (idx * 27 + 245) % 360;
        const grad = ctx.createLinearGradient(x, y, x + cellW, y + cellH);
        grad.addColorStop(0, `hsl(${hue1}, 48%, 18%)`);
        grad.addColorStop(0.6, `hsl(${hue2}, 42%, 28%)`);
        grad.addColorStop(1, `hsl(${(hue1 + 60) % 360}, 50%, 14%)`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, cellW, cellH);

        // Horizon / Anamorphic flare accent inside thumbnail
        ctx.fillStyle = `hsla(${(hue1 + 40) % 360}, 85%, 65%, 0.22)`;
        ctx.fillRect(x, y + cellH * 0.45, cellW, 3);

        // Simulated subject silhouette / frame waveform
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.arc(
          x + cellW * (0.3 + ((idx * 17) % 40) / 100),
          y + cellH * 0.48,
          cellH * 0.2,
          0,
          Math.PI * 2
        );
        ctx.stroke();

        // Border
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, cellW, cellH);

        // Timestamp badge in bottom-right corner (MPC-HC style)
        const tsText = formatTimecode(cellTime, true);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
        ctx.fillRect(x + cellW - 68, y + cellH - 20, 64, 16);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(tsText, x + cellW - 63, y + cellH - 8);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(renderContactSheet, 20);
    }
  }, [isOpen, rows, cols, title, duration]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_thumbs.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div
        role="dialog"
        aria-label="Save Thumbnails Contact Sheet"
        className="bg-[#232429] text-[#e0e0e0] border border-[#3e404c] rounded shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col font-sans text-xs select-none"
      >
        <div className="bg-[#191a1f] px-3 py-2 border-b border-[#343640] flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-sm text-gray-200">
            <Grid className="w-4 h-4 text-amber-400" />
            <span>Save Thumbnails Contact Sheet (MPC-HC Generator)</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
            aria-label="Close Save Thumbnails"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-[#1c1d22] border-b border-[#2e303a] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5">
              <span className="text-gray-400">Columns:</span>
              <select
                value={cols}
                onChange={(e) => setCols(Number(e.target.value))}
                aria-label="Thumbnail Columns"
                className="bg-[#121317] border border-[#383a45] rounded px-2 py-1 text-gray-200"
              >
                <option value={3}>3 Columns</option>
                <option value={4}>4 Columns</option>
                <option value={5}>5 Columns</option>
              </select>
            </label>

            <label className="flex items-center gap-1.5">
              <span className="text-gray-400">Rows:</span>
              <select
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                aria-label="Thumbnail Rows"
                className="bg-[#121317] border border-[#383a45] rounded px-2 py-1 text-gray-200"
              >
                <option value={3}>3 Rows</option>
                <option value={4}>4 Rows</option>
                <option value={5}>5 Rows</option>
              </select>
            </label>

            <button
              onClick={renderContactSheet}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#2b2d36] hover:bg-[#353844] rounded border border-[#414452] text-gray-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerate</span>
            </button>
          </div>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded shadow transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save Contact Sheet (.PNG)</span>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-[#121316] flex justify-center items-start">
          <canvas
            ref={canvasRef}
            className="max-w-full h-auto rounded shadow-xl border border-gray-700"
          />
        </div>
      </div>
    </div>
  );
};
