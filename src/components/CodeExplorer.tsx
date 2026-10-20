/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Code,
  Folder,
  FileCode,
  Copy,
  Check,
  Download,
  Terminal,
  ExternalLink,
  Search,
  X,
  FileText,
} from 'lucide-react';
import JSZip from 'jszip';
import { RUST_WORKSPACE_FILES, RustFile } from '../data/rustCodebase';

interface CodeExplorerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeExplorer: React.FC<CodeExplorerProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<RustFile>(RUST_WORKSPACE_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const filteredFiles = RUST_WORKSPACE_FILES.filter(
    (f) =>
      f.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();
      const folder = zip.folder('mpc-rust') || zip;

      for (const file of RUST_WORKSPACE_FILES) {
        folder.file(file.path, file.content);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mpc-rust-cross-platform.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#1c1d22] text-[#e0e0e0] border border-[#383a45] rounded-lg shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col font-sans select-none overflow-hidden">
        {/* Top Header */}
        <div className="bg-[#141519] px-4 py-2.5 border-b border-[#2d2f38] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Code className="w-5 h-5 text-amber-400" />
            <div>
              <span className="font-semibold text-gray-100 text-sm">
                MPC-Rust: Complete Cross-Platform Rust Codebase Explorer
              </span>
              <span className="ml-2 text-xs text-gray-400">
                (Windows Win32, macOS Cocoa, Linux Ubuntu GTK4)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold shadow transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isZipping ? 'Archiving...' : 'Download Full Rust Project (.zip)'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 rounded hover:bg-white/10"
              aria-label="Close Explorer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content: Left File Tree + Right Code View */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-72 bg-[#17181d] border-r border-[#2d2f38] flex flex-col">
            {/* Search */}
            <div className="p-2 border-b border-[#262830]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Filter Rust crates & files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#111215] text-xs text-gray-200 pl-8 pr-2 py-1.5 rounded border border-[#30333d] focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            {/* File List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-400" />
                <span>mpc-rust workspace</span>
              </div>

              {filteredFiles.map((file) => {
                const isSelected = selectedFile.path === file.path;
                return (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 transition ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 font-medium border border-amber-500/40'
                        : 'text-gray-300 hover:bg-[#23242b]'
                    }`}
                  >
                    {file.path.endsWith('.rs') ? (
                      <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    )}
                    <span className="truncate">{file.path}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Build Cheatsheet */}
            <div className="p-2.5 bg-[#121317] border-t border-[#262830] text-[11px] text-gray-400 space-y-1">
              <div className="flex items-center gap-1 font-semibold text-gray-200">
                <Terminal className="w-3 h-3 text-emerald-400" />
                <span>Build Commands:</span>
              </div>
              <div className="font-mono text-[10px] text-emerald-400 truncate">
                Win: cargo build --release -p mpc-ui-win32
              </div>
              <div className="font-mono text-[10px] text-indigo-400 truncate">
                Mac: cargo build --release -p mpc-ui-macos
              </div>
              <div className="font-mono text-[10px] text-amber-400 truncate">
                Linux: cargo build --release -p mpc-ui-linux
              </div>
            </div>
          </div>

          {/* Right Code Area */}
          <div className="flex-1 flex flex-col bg-[#111216] overflow-hidden">
            {/* File info bar */}
            <div className="px-4 py-2 bg-[#15161b] border-b border-[#282a32] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-gray-200 font-semibold">{selectedFile.path}</span>
                <span className="text-gray-400">({selectedFile.description})</span>
              </div>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#23252d] hover:bg-[#2e303b] text-gray-200 rounded border border-[#3b3d49] transition text-xs"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy File</span>
                  </>
                )}
              </button>
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-gray-200 bg-[#0d0e11]">
              <pre className="select-text whitespace-pre">
                {selectedFile.content.split('\n').map((line, idx) => (
                  <div key={idx} className="table-row">
                    <span className="table-cell select-none pr-4 text-gray-600 text-right w-10">
                      {idx + 1}
                    </span>
                    <span className="table-cell">{line}</span>
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
