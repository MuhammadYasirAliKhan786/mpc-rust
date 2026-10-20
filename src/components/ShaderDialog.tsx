/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sparkles, X, Check, Sliders, Eye } from 'lucide-react';
import { SHADER_OPTIONS, ShaderType } from '../utils/shaders';

interface ShaderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  activeShader: ShaderType;
  onSelectShader: (shader: ShaderType) => void;
  shaderIntensity: number;
  onIntensityChange: (intensity: number) => void;
}

export const ShaderDialog: React.FC<ShaderDialogProps> = ({
  isOpen,
  onClose,
  activeShader,
  onSelectShader,
  shaderIntensity,
  onIntensityChange,
}) => {
  if (!isOpen) return null;

  const currentOption = SHADER_OPTIONS.find((s) => s.id === activeShader) || SHADER_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[#24252a] text-[#dedede] border border-[#3e414c] rounded shadow-2xl w-full max-w-2xl font-sans text-xs select-none">
        {/* Title bar */}
        <div className="bg-[#1b1c21] px-3 py-2 border-b border-[#353742] flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium text-sm text-gray-200">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>MPC-HC Post-Processing Pixel Shaders (GPU Hardware Pipeline)</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/10"
            aria-label="Close Shaders"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <div className="text-gray-400">
            Media Player Classic is famous for its hardware pixel shader chain. Select a shader below to execute real-time GLSL/WGSL post-processing on the video hardware canvas:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Shaders list */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {SHADER_OPTIONS.map((shader) => {
                const isSelected = activeShader === shader.id;
                return (
                  <button
                    key={shader.id}
                    onClick={() => onSelectShader(shader.id)}
                    className={`w-full text-left p-2.5 rounded border transition flex items-start justify-between ${
                      isSelected
                        ? 'bg-purple-900/30 border-purple-500 text-purple-200'
                        : 'bg-[#1e1f24] border-[#343640] text-gray-300 hover:bg-[#282a32]'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs flex items-center gap-1.5">
                        {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                        <span>{shader.name}</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">
                        {shader.description}
                      </div>
                    </div>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 bg-black/40 rounded text-gray-400 shrink-0 ml-2">
                      {shader.category}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Code & Parameter Inspector */}
            <div className="bg-[#17181d] border border-[#30323c] rounded p-3 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-semibold text-gray-300 mb-2 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  <span>Shader Details & GPU HLSL/GLSL Kernel</span>
                </div>
                
                <div className="bg-[#101115] p-2.5 rounded border border-[#262832] font-mono text-[10px] text-purple-300 h-32 overflow-auto">
                  <pre>{currentOption.codePreview}</pre>
                </div>
              </div>

              {/* Intensity slider if applicable */}
              <div className="mt-3 pt-3 border-t border-[#292b34] space-y-1">
                <div className="flex justify-between text-[11px] text-gray-300">
                  <span>Shader Filter Strength:</span>
                  <span className="font-mono text-purple-400">{(shaderIntensity * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.05"
                  value={shaderIntensity}
                  onChange={(e) => onIntensityChange(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                  aria-label="Shader Intensity"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-2 border-t border-[#343640]">
            <span className="text-[11px] text-gray-400 font-mono">
              Pipeline: WGPU Fragment Stage -&gt; Texture2D BindGroup
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded transition"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
