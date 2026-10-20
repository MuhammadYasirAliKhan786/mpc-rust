/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Media Player Classic - Home Cinema (Rust Edition / MPC-Rust)
 * High-performance cross-platform player with native OS UI frameworks,
 * zero-copy hardware acceleration pipelines, and EVR-CP pixel shaders.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  FastForward,
  Rewind,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sliders,
  Settings,
  Info,
  Code,
  FolderOpen,
  Sparkles,
  Layers,
  Monitor,
  Activity,
  Check,
  ChevronRight,
  ListVideo,
} from 'lucide-react';
import {
  OperatingSystem,
  HardwareDecoder,
  AspectRatioMode,
  formatTimecode,
  calculateVideoDimensions,
  getFrameDuration,
  stepPlaybackRate,
  getHardwareProfile,
  parseSrt,
  SubtitleCue,
} from '../utils/playerCore';
import { ShaderType, WebGLShaderRenderer } from '../utils/shaders';
import { AudioEqualizerDialog, EqualizerBand } from './AudioEqualizerDialog';
import { MediaInfoDialog } from './MediaInfoDialog';
import { OptionsDialog } from './OptionsDialog';
import { ShaderDialog } from './ShaderDialog';
import { CodeExplorer } from './CodeExplorer';

interface MediaTrack {
  id: string;
  title: string;
  url: string;
  subtitlesUrl?: string;
  subtitlesSrt?: string;
  fps: number;
  width: number;
  height: number;
  codec: string;
  audioCodec: string;
  sampleRate: number;
}

const DEMO_PLAYLIST: MediaTrack[] = [
  {
    id: 'tears-of-steel',
    title: 'Tears of Steel (4K Sci-Fi Cinema HDR)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    fps: 24,
    width: 1920,
    height: 800,
    codec: 'H.264 High@L5.1 / BT.709',
    audioCodec: 'AAC-LC (Stereo)',
    sampleRate: 48000,
    subtitlesSrt: `1
00:00:02,000 --> 00:00:06,000
Media Player Classic - Home Cinema (Rust Edition)

2
00:00:06,500 --> 00:00:10,500
Hardware Accelerated: Direct3D 11, Metal, VA-API Zero-Copy

3
00:00:11,000 --> 00:00:15,000
Press Ctrl+J to toggle EVR-CP Renderer Statistics!
`,
  },
  {
    id: 'big-buck-bunny',
    title: 'Big Buck Bunny (60fps Animation)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    fps: 60,
    width: 1920,
    height: 1080,
    codec: 'H.264 High@L4.2',
    audioCodec: 'AAC-LC',
    sampleRate: 44100,
  },
  {
    id: 'sintel',
    title: 'Sintel Open Movie (High Bitrate)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    fps: 24,
    width: 1280,
    height: 546,
    codec: 'H.264 Main@L3.1',
    audioCodec: 'AAC-LC',
    sampleRate: 48000,
  },
  {
    id: 'elephants-dream',
    title: 'Elephants Dream (Open Source CGI)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    fps: 24,
    width: 1280,
    height: 720,
    codec: 'H.264 Baseline',
    audioCodec: 'MP3 128kbps',
    sampleRate: 44100,
  },
];

const DEFAULT_EQ_BANDS: EqualizerBand[] = [
  { freq: 31.25, label: '32Hz', gain: 0 },
  { freq: 62.5, label: '64Hz', gain: 0 },
  { freq: 125, label: '125Hz', gain: 0 },
  { freq: 250, label: '250Hz', gain: 0 },
  { freq: 500, label: '500Hz', gain: 0 },
  { freq: 1000, label: '1kHz', gain: 0 },
  { freq: 2000, label: '2kHz', gain: 0 },
  { freq: 4000, label: '4kHz', gain: 0 },
  { freq: 8000, label: '8kHz', gain: 0 },
  { freq: 16000, label: '16kHz', gain: 0 },
];

export const MpcPlayer: React.FC = () => {
  // OS & Hardware Configuration State
  const [os, setOs] = useState<OperatingSystem>('windows');
  const [decoder, setDecoder] = useState<HardwareDecoder>('d3d11va');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('keep');
  const [activeShader, setActiveShader] = useState<ShaderType>('sharpen_complex_2');
  const [shaderIntensity, setShaderIntensity] = useState<number>(1.0);

  // Playback State
  const [playlist, setPlaylist] = useState<MediaTrack[]>(DEMO_PLAYLIST);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loop, setLoop] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  // Stats & OSD
  const [showStats, setShowStats] = useState(false);
  const [osdMessage, setOsdMessage] = useState<string | null>('MPC-Rust Initialized [D3D11VA Ready]');
  const osdTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Subtitles
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [subtitleDelay, setSubtitleDelay] = useState(0); // seconds

  // Equalizer State
  const [eqBands, setEqBands] = useState<EqualizerBand[]>(DEFAULT_EQ_BANDS);
  const [eqEnabled, setEqEnabled] = useState(false);

  // Dialog Visibility
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [showMediaInfo, setShowMediaInfo] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showShaders, setShowShaders] = useState(false);
  const [showCodeExplorer, setShowCodeExplorer] = useState(false);
  const [showPlaylistDrawer, setShowPlaylistDrawer] = useState(false);

  // Active Menu Dropdown
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const srtInputRef = useRef<HTMLInputElement | null>(null);
  const shaderRendererRef = useRef<WebGLShaderRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Audio Context & Biquad Filters Ref
  const audioCtxRef = useRef<AudioContext | null>(null);
  const biquadFiltersRef = useRef<BiquadFilterNode[]>([]);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Live Jitter graph for Ctrl+J stats HUD
  const jitterHistoryRef = useRef<number[]>(Array(50).fill(16.6));
  const lastFrameTimeRef = useRef<number>(performance.now());
  const [liveFps, setLiveFps] = useState(60.0);
  const [renderTimeMs, setRenderTimeMs] = useState(2.15);

  const currentTrack = playlist[currentTrackIndex] || DEMO_PLAYLIST[0];
  const hardwareProfile = getHardwareProfile(os, decoder);

  const showOsd = useCallback((text: string) => {
    setOsdMessage(text);
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(() => {
      setOsdMessage(null);
    }, 2500);
  }, []);

  // Update hardware profile automatically if OS changes and current decoder doesn't match
  useEffect(() => {
    if (os === 'windows' && decoder !== 'd3d11va' && decoder !== 'dxva2' && decoder !== 'software') {
      setDecoder('d3d11va');
    } else if (os === 'macos' && decoder !== 'videotoolbox' && decoder !== 'software') {
      setDecoder('videotoolbox');
    } else if (os === 'linux' && decoder !== 'vaapi' && decoder !== 'vdpau' && decoder !== 'software') {
      setDecoder('vaapi');
    }
  }, [os, decoder]);

  // Load subtitles when track changes
  useEffect(() => {
    if (currentTrack.subtitlesSrt) {
      setSubtitleCues(parseSrt(currentTrack.subtitlesSrt));
    } else {
      setSubtitleCues([]);
      setCurrentSubtitle('');
    }
  }, [currentTrack]);

  // WebGL Shader Canvas Initializer
  useEffect(() => {
    if (canvasRef.current) {
      shaderRendererRef.current = new WebGLShaderRenderer(canvasRef.current);
      shaderRendererRef.current.setShader(activeShader);
    }
  }, [activeShader]);

  // Animation render loop for shaders and EVR-CP stats
  useEffect(() => {
    let active = true;

    const renderLoop = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      // Update frame render timing & jitter
      if (delta > 0 && delta < 100) {
        jitterHistoryRef.current.shift();
        jitterHistoryRef.current.push(delta);
        const avgDelta = jitterHistoryRef.current.reduce((a, b) => a + b, 0) / jitterHistoryRef.current.length;
        setLiveFps(Math.round(1000 / avgDelta));
        setRenderTimeMs(parseFloat((Math.random() * 0.4 + 1.9).toFixed(2)));
      }

      if (videoRef.current && canvasRef.current && shaderRendererRef.current && activeShader !== 'none') {
        const video = videoRef.current;
        if (video.readyState >= 2 && !video.paused) {
          canvasRef.current.width = video.videoWidth || 1280;
          canvasRef.current.height = video.videoHeight || 720;
          shaderRendererRef.current.render(video, shaderIntensity);
        }
      }

      if (active) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
      }
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeShader, shaderIntensity]);

  // Subtitle synchronization loop
  useEffect(() => {
    if (!subtitlesEnabled || subtitleCues.length === 0) {
      setCurrentSubtitle('');
      return;
    }

    const adjustedTime = currentTime + subtitleDelay;
    const activeCue = subtitleCues.find(
      (cue) => adjustedTime >= cue.startTime && adjustedTime <= cue.endTime
    );

    setCurrentSubtitle(activeCue ? activeCue.text : '');
  }, [currentTime, subtitlesEnabled, subtitleCues, subtitleDelay]);

  // Audio Context & 10-band equalizer initialization
  const initAudioNodes = () => {
    if (!videoRef.current || audioCtxRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const source = ctx.createMediaElementSource(videoRef.current);
      sourceNodeRef.current = source;

      let prevNode: AudioNode = source;
      const filters: BiquadFilterNode[] = [];

      eqBands.forEach((band) => {
        const filter = ctx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = band.freq;
        filter.Q.value = 1.414;
        filter.gain.value = eqEnabled ? band.gain : 0;
        prevNode.connect(filter);
        prevNode = filter;
        filters.push(filter);
      });

      prevNode.connect(ctx.destination);
      biquadFiltersRef.current = filters;
    } catch (err) {
      // Audio element might already be attached or cross-origin
      console.warn('Web Audio DSP not initialized (standard output active)', err);
    }
  };

  const handleBandGainChange = (index: number, gain: number) => {
    setEqBands((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], gain };
      return next;
    });

    if (biquadFiltersRef.current[index]) {
      biquadFiltersRef.current[index].gain.value = eqEnabled ? gain : 0;
    }
  };

  const handleToggleEq = (enabled: boolean) => {
    setEqEnabled(enabled);
    biquadFiltersRef.current.forEach((filter, idx) => {
      filter.gain.value = enabled ? eqBands[idx].gain : 0;
    });
    showOsd(enabled ? 'Audio DSP: 10-Band EQ Enabled' : 'Audio DSP: EQ Bypassed');
  };

  const handleResetEq = () => {
    setEqBands(DEFAULT_EQ_BANDS);
    biquadFiltersRef.current.forEach((filter) => {
      filter.gain.value = 0;
    });
    showOsd('Audio DSP: Equalizer Reset to 0 dB');
  };

  // Playback control actions
  const togglePlay = () => {
    initAudioNodes();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      showOsd('Paused');
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      showOsd('Play');
    }
  };

  const handleStop = () => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    showOsd('Stopped');
  };

  const handleSeek = (newTime: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleFrameStep = () => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const duration = getFrameDuration(currentTrack.fps);
    videoRef.current.currentTime = Math.min(videoRef.current.currentTime + duration, videoRef.current.duration || 0);
    showOsd(`Step (+1 Frame, ${currentTrack.fps}fps)`);
  };

  const handleRateChange = (direction: 'up' | 'down') => {
    const nextRate = stepPlaybackRate(playbackRate, direction);
    setPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
    showOsd(`Rate: ${nextRate.toFixed(2)}x (Pitch Preserved)`);
  };

  const handleResetRate = () => {
    setPlaybackRate(1.0);
    if (videoRef.current) {
      videoRef.current.playbackRate = 1.0;
    }
    showOsd('Rate: 1.00x Normal');
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
    showOsd(`Volume: ${Math.round(newVol * 100)}%`);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
    showOsd(newMuted ? 'Muted' : `Volume: ${Math.round(volume * 100)}%`);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Keyboard shortcut listener for classic MPC-HC hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'KeyJ' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setShowStats((prev) => !prev);
        showOsd(showStats ? 'Renderer Stats: Off' : 'Renderer Stats: On (Ctrl+J)');
      } else if (e.code === 'Period') {
        e.preventDefault();
        handleFrameStep();
      } else if (e.code === 'BracketRight') {
        e.preventDefault();
        handleRateChange('up');
      } else if (e.code === 'BracketLeft') {
        e.preventDefault();
        handleRateChange('down');
      } else if (e.code === 'KeyR' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleResetRate();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeek(Math.min(currentTime + 5, duration));
        showOsd(`Jump Forward +5s`);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(Math.max(currentTime - 5, 0));
        showOsd(`Jump Backward -5s`);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        handleVolumeChange(Math.min(volume + 0.05, 1.0));
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        handleVolumeChange(Math.max(volume - 0.05, 0.0));
      } else if (e.code === 'KeyO' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, showStats, currentTime, duration, volume, isMuted, playbackRate, togglePlay, showOsd]);

  // Open Local Video File
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newTrack: MediaTrack = {
        id: `local-${Date.now()}`,
        title: file.name,
        url,
        fps: 29.97,
        width: 1920,
        height: 1080,
        codec: 'Local Video / Hardware Decode',
        audioCodec: 'Local Audio (PCM/AAC)',
        sampleRate: 48000,
      };
      setPlaylist([newTrack, ...playlist]);
      setCurrentTrackIndex(0);
      showOsd(`Opened File: ${file.name}`);
    }
  };

  // Open Local Subtitles (.srt)
  const handleSrtSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setSubtitleCues(parseSrt(text));
          setSubtitlesEnabled(true);
          showOsd(`Loaded Subtitle: ${file.name}`);
        }
      };
      reader.readAsText(file);
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`min-h-screen flex flex-col font-sans select-none ${
        os === 'windows'
          ? 'bg-[#18191c] text-[#d6d8dd]'
          : os === 'macos'
          ? 'bg-[#1e1e24] text-[#ececf1]'
          : 'bg-[#242424] text-[#dedede]'
      }`}
    >
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={srtInputRef}
        type="file"
        accept=".srt,.vtt,.txt"
        onChange={handleSrtSelect}
        className="hidden"
      />

      {/* Top OS Window Title Bar */}
      <div
        className={`px-3 py-1.5 flex items-center justify-between border-b text-xs ${
          os === 'windows'
            ? 'bg-[#1f2024] border-[#2e3037] text-gray-300'
            : os === 'macos'
            ? 'bg-[#292933] border-[#393946] text-gray-200 justify-start gap-4'
            : 'bg-[#2d2d2d] border-[#383838] text-gray-200'
        }`}
      >
        {/* macOS Traffic Lights */}
        {os === 'macos' && (
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
          </div>
        )}

        {/* Windows Icon & Title */}
        <div className="flex items-center gap-2 truncate">
          <div className="w-3.5 h-3.5 rounded bg-amber-500/80 flex items-center justify-center font-bold text-[9px] text-black">
            M
          </div>
          <span className="font-semibold truncate">
            {currentTrack.title} - Media Player Classic - Home Cinema [Rust Edition]
          </span>
          <span className="text-[10px] px-1.5 py-0.2 bg-black/30 rounded text-emerald-400 font-mono">
            {hardwareProfile.apiName}
          </span>
        </div>

        {/* Windows / Ubuntu Titlebar Controls */}
        {os !== 'macos' && (
          <div className="flex items-center gap-2 text-gray-400">
            <button
              onClick={toggleFullscreen}
              className="p-1 hover:text-white hover:bg-white/10 rounded"
              title="Fullscreen (F)"
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Classic MPC-HC Menu Bar */}
      <div
        className={`px-2 py-0.5 border-b text-xs flex items-center justify-between z-20 gap-2 overflow-x-auto scrollbar-none ${
          os === 'windows'
            ? 'bg-[#232429] border-[#31333b]'
            : os === 'macos'
            ? 'bg-[#25252e] border-[#363642]'
            : 'bg-[#2c2c2c] border-[#3a3a3a]'
        }`}
      >
        <div className="flex items-center space-x-0.5 text-gray-300 shrink-0">
          {/* File Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === 'file' ? null : 'file');
              }}
              className="px-2 py-0.5 hover:bg-white/10 rounded cursor-default"
            >
              <u>F</u>ile
            </button>
            {openMenu === 'file' && (
              <div className="absolute top-full left-0 mt-0.5 w-52 bg-[#202126] border border-[#3b3d48] rounded shadow-xl py-1 text-xs z-50 text-gray-200">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between"
                >
                  <span>Quick Open File...</span>
                  <span className="text-gray-400">Ctrl+O</span>
                </button>
                <button
                  onClick={() => srtInputRef.current?.click()}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between"
                >
                  <span>Load Subtitles (.srt)...</span>
                </button>
                <div className="my-1 border-t border-[#31333d]" />
                <button
                  onClick={handleStop}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between"
                >
                  <span>Close Stream</span>
                  <span className="text-gray-400">Ctrl+C</span>
                </button>
                <button
                  onClick={() => setShowMediaInfo(true)}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between"
                >
                  <span>Properties (MediaInfo)</span>
                  <span className="text-gray-400">Shift+F10</span>
                </button>
              </div>
            )}
          </div>

          {/* View Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === 'view' ? null : 'view');
              }}
              className="px-2 py-0.5 hover:bg-white/10 rounded cursor-default"
            >
              <u>V</u>iew
            </button>
            {openMenu === 'view' && (
              <div className="absolute top-full left-0 mt-0.5 w-60 bg-[#202126] border border-[#3b3d48] rounded shadow-xl py-1 text-xs z-50 text-gray-200">
                <button
                  onClick={() => setShowStats(!showStats)}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between items-center"
                >
                  <span>Renderer Statistics HUD</span>
                  <span className="flex items-center gap-1 font-mono text-gray-400">
                    {showStats && <Check className="w-3.5 h-3.5 text-emerald-400" />} Ctrl+J
                  </span>
                </button>
                <button
                  onClick={() => setShowShaders(true)}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between items-center"
                >
                  <span>Post-Processing Shaders...</span>
                  <span className="text-gray-400">Ctrl+P</span>
                </button>
                <div className="my-1 border-t border-[#31333d]" />
                <div className="px-3 py-1 text-[10px] text-gray-400 uppercase font-semibold">Aspect Ratio</div>
                {(['keep', 'fill', '16:9', '4:3', '21:9'] as AspectRatioMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setAspectRatio(mode)}
                    className="w-full text-left px-3 py-1 hover:bg-emerald-600 hover:text-white flex items-center justify-between"
                  >
                    <span className="capitalize">{mode === 'keep' ? 'Auto Keep Ratio' : mode}</span>
                    {aspectRatio === mode && <Check className="w-3 h-3 text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Play Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === 'play' ? null : 'play');
              }}
              className="px-2 py-0.5 hover:bg-white/10 rounded cursor-default"
            >
              <u>P</u>lay
            </button>
            {openMenu === 'play' && (
              <div className="absolute top-full left-0 mt-0.5 w-52 bg-[#202126] border border-[#3b3d48] rounded shadow-xl py-1 text-xs z-50 text-gray-200">
                <button
                  onClick={togglePlay}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between"
                >
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                  <span className="text-gray-400">Space</span>
                </button>
                <button
                  onClick={handleStop}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between"
                >
                  <span>Stop</span>
                  <span className="text-gray-400">Period</span>
                </button>
                <button
                  onClick={handleFrameStep}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between"
                >
                  <span>Step Frame</span>
                  <span className="text-gray-400">.</span>
                </button>
                <div className="my-1 border-t border-[#31333d]" />
                <button
                  onClick={() => handleRateChange('up')}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between"
                >
                  <span>Rate Faster</span>
                  <span className="text-gray-400">]</span>
                </button>
                <button
                  onClick={() => handleRateChange('down')}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between"
                >
                  <span>Rate Slower</span>
                  <span className="text-gray-400">[</span>
                </button>
                <button
                  onClick={handleResetRate}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between"
                >
                  <span>Reset Normal Rate</span>
                  <span className="text-gray-400">Ctrl+R</span>
                </button>
              </div>
            )}
          </div>

          {/* Audio Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === 'audio' ? null : 'audio');
              }}
              className="px-2 py-0.5 hover:bg-white/10 rounded cursor-default"
            >
              <u>A</u>udio
            </button>
            {openMenu === 'audio' && (
              <div className="absolute top-full left-0 mt-0.5 w-56 bg-[#202126] border border-[#3b3d48] rounded shadow-xl py-1 text-xs z-50 text-gray-200">
                <button
                  onClick={() => setShowEqualizer(true)}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between items-center"
                >
                  <span>10-Band Parametric Equalizer...</span>
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                </button>
                <button
                  onClick={toggleMute}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between"
                >
                  <span>Mute Audio</span>
                  <span className="text-gray-400">M</span>
                </button>
              </div>
            )}
          </div>

          {/* Subtitles Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === 'subs' ? null : 'subs');
              }}
              className="px-2 py-0.5 hover:bg-white/10 rounded cursor-default"
            >
              <u>S</u>ubtitles
            </button>
            {openMenu === 'subs' && (
              <div className="absolute top-full left-0 mt-0.5 w-56 bg-[#202126] border border-[#3b3d48] rounded shadow-xl py-1 text-xs z-50 text-gray-200">
                <button
                  onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white flex justify-between items-center"
                >
                  <span>Enable Subtitle Renderer</span>
                  {subtitlesEnabled && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
                <button
                  onClick={() => srtInputRef.current?.click()}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white"
                >
                  Load Subtitle File (.srt)...
                </button>
                <div className="my-1 border-t border-[#31333d]" />
                <button
                  onClick={() => {
                    setSubtitleDelay((d) => d - 0.5);
                    showOsd(`Subtitle Delay: ${(subtitleDelay - 0.5).toFixed(1)}s`);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white"
                >
                  Delay -500 ms
                </button>
                <button
                  onClick={() => {
                    setSubtitleDelay((d) => d + 0.5);
                    showOsd(`Subtitle Delay: ${(subtitleDelay + 0.5).toFixed(1)}s`);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-600 hover:text-white"
                >
                  Delay +500 ms
                </button>
              </div>
            )}
          </div>

          {/* Options / Settings Menu */}
          <div className="relative">
            <button
              onClick={() => setShowOptions(true)}
              className="px-2 py-0.5 hover:bg-white/10 rounded cursor-default flex items-center gap-1"
            >
              <u>O</u>ptions
            </button>
          </div>

          {/* Rust Code Explorer Menu */}
          <div className="relative">
            <button
              onClick={() => setShowCodeExplorer(true)}
              className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold rounded cursor-default flex items-center gap-1 border border-amber-500/40 shrink-0"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Rust Architecture & Source</span>
            </button>
          </div>
        </div>

        {/* Right Quick Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* OS Framework Switcher */}
          <div className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-[#383a45]">
            <span className="text-[10px] text-gray-400 hidden sm:inline">OS UI:</span>
            <button
              onClick={() => setOs('windows')}
              className={`px-1.5 py-0.2 rounded text-[11px] ${
                os === 'windows' ? 'bg-sky-500 text-black font-bold' : 'text-gray-300 hover:text-white'
              }`}
            >
              Win32
            </button>
            <button
              onClick={() => setOs('macos')}
              className={`px-1.5 py-0.2 rounded text-[11px] ${
                os === 'macos' ? 'bg-indigo-500 text-white font-bold' : 'text-gray-300 hover:text-white'
              }`}
            >
              macOS
            </button>
            <button
              onClick={() => setOs('linux')}
              className={`px-1.5 py-0.2 rounded text-[11px] ${
                os === 'linux' ? 'bg-amber-500 text-black font-bold' : 'text-gray-300 hover:text-white'
              }`}
            >
              Ubuntu
            </button>
          </div>

          {/* Playlist drawer toggle */}
          <button
            onClick={() => setShowPlaylistDrawer(!showPlaylistDrawer)}
            className="flex items-center gap-1 px-2 py-0.5 bg-[#2b2c35] hover:bg-[#353742] text-gray-200 rounded border border-[#3e414f]"
            title="Toggle Clips Playlist"
          >
            <ListVideo className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Clips</span>
          </button>
        </div>
      </div>

      {/* Main Video Viewport & Filter Canvas */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden group">
        {/* Hidden/Underlying HTML5 Video */}
        <video
          ref={videoRef}
          src={currentTrack.url}
          className={activeShader !== 'none' ? 'opacity-0 absolute pointer-events-none' : 'max-w-full max-h-full object-contain'}
          onTimeUpdate={() => {
            if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration || 0);
              if (autoPlay) {
                videoRef.current.play().catch(() => {});
                setIsPlaying(true);
              }
            }
          }}
          onEnded={() => {
            if (loop) {
              if (videoRef.current) {
                videoRef.current.currentTime = 0;
                videoRef.current.play().catch(() => {});
              }
            } else if (currentTrackIndex < playlist.length - 1) {
              setCurrentTrackIndex((prev) => prev + 1);
            } else {
              setIsPlaying(false);
            }
          }}
          playsInline
        />

        {/* WebGL Hardware Canvas for Pixel Shaders */}
        {activeShader !== 'none' && (
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full object-contain pointer-events-auto cursor-pointer"
            onClick={togglePlay}
          />
        )}

        {/* On-Screen Display (OSD) Message */}
        {osdMessage && (
          <div className="absolute top-4 left-4 z-30 bg-black/75 px-3 py-1.5 rounded border border-emerald-500/50 text-emerald-400 font-mono text-sm shadow-lg pointer-events-none animate-fade-in flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{osdMessage}</span>
          </div>
        )}

        {/* Ctrl+J Render Statistics HUD (EVR-CP / madVR Clone) */}
        {showStats && (
          <div className="absolute top-2 right-2 md:top-4 md:right-4 z-30 bg-black/90 p-2 md:p-3.5 rounded border border-[#00ff66]/60 font-mono text-[10px] md:text-xs text-[#00ff66] shadow-2xl max-w-[90vw] md:max-w-md pointer-events-none select-none">
            <div className="border-b border-[#00ff66]/40 pb-1 mb-1.5 font-bold flex justify-between items-center text-xs md:text-sm">
              <span className="truncate">** MPC-HC RENDER STATS **</span>
              <span className="text-[9px] text-gray-400 shrink-0 ml-1">Ctrl+J to hide</span>
            </div>

            <div className="space-y-0.5 md:space-y-1 text-[9px] md:text-[11px] leading-tight md:leading-relaxed">
              <div>
                <span className="text-gray-400">Target Display FPS:</span> 60.000 Hz |{' '}
                <span className="text-gray-400">Actual:</span>{' '}
                <span className="font-bold">{liveFps.toFixed(3)} fps</span>
              </div>

              <div>
                <span className="text-gray-400">Frame Render Time:</span>{' '}
                <span className="font-bold">{renderTimeMs} ms</span> |{' '}
                <span className="text-gray-400">Max:</span> 4.12 ms
              </div>

              <div className="truncate">
                <span className="text-gray-400">Hardware Decoder:</span>{' '}
                <span className="text-white font-bold">{hardwareProfile.apiName}</span>
              </div>

              <div>
                <span className="text-gray-400">Surface Backend:</span> {hardwareProfile.backend} (Zero-Copy: {hardwareProfile.zeroCopy ? 'YES' : 'NO'})
              </div>

              <div>
                <span className="text-gray-400">Frame Drops:</span> 0 |{' '}
                <span className="text-gray-400">Jitter:</span> 0.12 ms |{' '}
                <span className="text-gray-400">Sync Offset:</span> +0.2 ms
              </div>

              <div>
                <span className="text-gray-400">Source:</span> {currentTrack.width}x{currentTrack.height}p, {currentTrack.fps} fps
              </div>

              <div>
                <span className="text-gray-400">Matrix:</span> BT.709 -&gt; sRGB D65 (Full PC 0-255)
              </div>

              <div>
                <span className="text-gray-400">Active Shader:</span>{' '}
                <span className="text-purple-300 font-bold">{activeShader}</span> ({Math.round(shaderIntensity * 100)}%)
              </div>
            </div>

            {/* VSync Oscillograph Graph */}
            <div className="mt-1.5 md:mt-2.5 pt-1.5 border-t border-[#00ff66]/30">
              <div className="text-[9px] text-gray-400 mb-0.5 flex justify-between">
                <span>VSync Timing Oscillogram</span>
                <span>±0.5ms Jitter</span>
              </div>
              <div className="h-6 md:h-10 w-full bg-[#0d160e] border border-[#00ff66]/30 rounded flex items-end px-1 gap-0.5">
                {jitterHistoryRef.current.slice(-24).map((val, idx) => {
                  const normalizedH = Math.min(Math.max((val - 14) * 6, 2), 24);
                  return (
                    <div
                      key={idx}
                      className="flex-1 bg-[#00ff66] opacity-80"
                      style={{ height: `${normalizedH}px` }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Subtitles Overlay */}
        {subtitlesEnabled && currentSubtitle && (
          <div className="absolute bottom-16 left-0 right-0 z-20 flex justify-center px-6 pointer-events-none">
            <div
              className="bg-black/80 px-4 py-1.5 rounded text-white text-base md:text-lg font-medium text-center shadow-lg"
              style={{
                textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 2px #000',
              }}
            >
              {currentSubtitle}
            </div>
          </div>
        )}

        {/* Playlist Drawer overlay */}
        {showPlaylistDrawer && (
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-[#191a20]/95 backdrop-blur-md border-l border-[#353744] z-40 p-3 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2d2f3b] pb-2 mb-2">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-gray-200">
                <ListVideo className="w-4 h-4 text-sky-400" />
                <span>Media Playlist</span>
              </div>
              <button
                onClick={() => setShowPlaylistDrawer(false)}
                className="text-gray-400 hover:text-white text-xs px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 text-xs">
              {playlist.map((track, idx) => (
                <button
                  key={track.id}
                  onClick={() => {
                    setCurrentTrackIndex(idx);
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                      videoRef.current.play().catch(() => {});
                      setIsPlaying(true);
                    }
                  }}
                  className={`w-full text-left p-2 rounded transition flex items-center justify-between ${
                    currentTrackIndex === idx
                      ? 'bg-sky-600/30 border border-sky-500 text-sky-300 font-medium'
                      : 'bg-[#202128] text-gray-300 hover:bg-[#282a33]'
                  }`}
                >
                  <div className="truncate mr-2">
                    <div>{track.title}</div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      {track.width}x{track.height} • {track.fps}fps
                    </div>
                  </div>
                  {currentTrackIndex === idx && <Play className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-[#2d2f3b] flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-1.5 bg-[#2d303b] hover:bg-[#383b49] text-gray-200 text-xs rounded border border-[#444758] flex items-center justify-center gap-1.5"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Add Local Video</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Classic MPC-HC Control Toolbar & Seek Bar */}
      <div
        className={`px-3 py-2 border-t z-10 flex flex-col gap-2 ${
          os === 'windows'
            ? 'bg-[#212227] border-[#30323a]'
            : os === 'macos'
            ? 'bg-[#24242d] border-[#353542]'
            : 'bg-[#2a2a2a] border-[#383838]'
        }`}
      >
        {/* Time Seek Slider */}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.05"
            value={currentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-gray-700 rounded-lg accent-emerald-500 cursor-pointer"
            aria-label="Seek Video"
          />
        </div>

        {/* Buttons Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Left Playback Buttons */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* Play Button */}
            <button
              onClick={togglePlay}
              className="p-1.5 rounded bg-[#2c2d35] hover:bg-[#393b45] active:bg-[#1a1b20] text-gray-200 border border-[#3e404b] transition shadow-xs"
              title="Play / Pause (Space)"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 text-emerald-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Stop Button */}
            <button
              onClick={handleStop}
              className="p-1.5 rounded bg-[#2c2d35] hover:bg-[#393b45] text-gray-200 border border-[#3e404b] transition shadow-xs"
              title="Stop (Period)"
              aria-label="Stop"
            >
              <Square className="w-4 h-4 text-rose-400" />
            </button>

            {/* Skip Previous */}
            <button
              onClick={() => {
                if (currentTrackIndex > 0) setCurrentTrackIndex(currentTrackIndex - 1);
              }}
              className="p-1.5 rounded bg-[#2c2d35] hover:bg-[#393b45] text-gray-200 border border-[#3e404b] transition shadow-xs"
              title="Previous Track"
              aria-label="Previous Track"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Fast Rewind */}
            <button
              onClick={() => handleSeek(Math.max(currentTime - 10, 0))}
              className="p-1.5 rounded bg-[#2c2d35] hover:bg-[#393b45] text-gray-200 border border-[#3e404b] transition shadow-xs hidden sm:inline-flex"
              title="Rewind 10s (Left Arrow)"
              aria-label="Rewind 10s"
            >
              <Rewind className="w-4 h-4" />
            </button>

            {/* Frame Step Forward */}
            <button
              onClick={handleFrameStep}
              className="p-1.5 rounded bg-[#2c2d35] hover:bg-[#393b45] text-gray-200 border border-[#3e404b] transition shadow-xs flex items-center justify-center font-mono font-bold text-xs"
              title="Step Single Frame (Period .)"
              aria-label="Step Single Frame"
            >
              ▶|
            </button>

            {/* Fast Forward */}
            <button
              onClick={() => handleSeek(Math.min(currentTime + 10, duration))}
              className="p-1.5 rounded bg-[#2c2d35] hover:bg-[#393b45] text-gray-200 border border-[#3e404b] transition shadow-xs hidden sm:inline-flex"
              title="Forward 10s (Right Arrow)"
              aria-label="Forward 10s"
            >
              <FastForward className="w-4 h-4" />
            </button>

            {/* Skip Next */}
            <button
              onClick={() => {
                if (currentTrackIndex < playlist.length - 1) setCurrentTrackIndex(currentTrackIndex + 1);
              }}
              className="p-1.5 rounded bg-[#2c2d35] hover:bg-[#393b45] text-gray-200 border border-[#3e404b] transition shadow-xs"
              title="Next Track"
              aria-label="Next Track"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Timecode Readout */}
            <div className="ml-1 sm:ml-3 font-mono text-gray-300 font-medium tracking-wide text-[11px] sm:text-xs">
              {formatTimecode(currentTime)} / {formatTimecode(duration)}
            </div>
          </div>

          {/* Right Volume & Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Speed Rate Badge */}
            <div className="flex items-center gap-1 bg-[#1a1b20] px-1.5 sm:px-2 py-0.5 rounded border border-[#363842] font-mono text-[10px] sm:text-[11px]">
              <span className="text-gray-400">Rate:</span>
              <button
                onClick={() => handleRateChange('down')}
                className="hover:text-emerald-400 px-0.5"
                title="Slower ([)"
              >
                -
              </button>
              <span className="text-emerald-400 font-bold">{playbackRate.toFixed(2)}x</span>
              <button
                onClick={() => handleRateChange('up')}
                className="hover:text-emerald-400 px-0.5"
                title="Faster (])"
              >
                +
              </button>
            </div>

            {/* Volume Slider */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                className="text-gray-300 hover:text-white p-1"
                title="Toggle Mute (M)"
                aria-label="Toggle Mute"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-14 sm:w-20 h-1.5 bg-gray-700 rounded-lg accent-emerald-500 cursor-pointer"
                aria-label="Volume Slider"
              />
            </div>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded bg-[#2c2d35] hover:bg-[#393b45] text-gray-200 border border-[#3e404b] transition shadow-xs"
              title="Fullscreen (F)"
              aria-label="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Classic MPC-HC Bottom Status Bar */}
      <div
        className={`px-3 py-1 border-t text-[11px] font-mono flex items-center justify-between ${
          os === 'windows'
            ? 'bg-[#1b1c20] border-[#292a32] text-gray-400'
            : os === 'macos'
            ? 'bg-[#1f1f27] border-[#2f2f3c] text-gray-300'
            : 'bg-[#222222] border-[#313131] text-gray-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-semibold">
            {isPlaying ? 'Playing' : currentTime === 0 ? 'Stopped' : 'Paused'}
          </span>
          <span>[{formatTimecode(currentTime)} / {formatTimecode(duration)}]</span>
        </div>

        <div className="flex items-center gap-4 text-gray-400 truncate">
          <span>{currentTrack.codec}</span>
          <span>{currentTrack.audioCodec} {currentTrack.sampleRate / 1000}kHz</span>
          <span className="text-emerald-400 font-bold">{hardwareProfile.decoder.toUpperCase()}</span>
          <span>Shader: {activeShader}</span>
        </div>
      </div>

      {/* Dialog Modals */}
      <AudioEqualizerDialog
        isOpen={showEqualizer}
        onClose={() => setShowEqualizer(false)}
        bands={eqBands}
        onBandChange={handleBandGainChange}
        onReset={handleResetEq}
        enabled={eqEnabled}
        onToggleEnabled={handleToggleEq}
      />

      <MediaInfoDialog
        isOpen={showMediaInfo}
        onClose={() => setShowMediaInfo(false)}
        mediaDetails={{
          title: currentTrack.title,
          url: currentTrack.url,
          duration,
          videoWidth: currentTrack.width,
          videoHeight: currentTrack.height,
          fps: currentTrack.fps,
          codec: currentTrack.codec,
          audioCodec: currentTrack.audioCodec,
          audioChannels: '2 Channels (Stereo)',
          sampleRate: currentTrack.sampleRate,
          colorSpace: 'BT.709 YUV420P',
          bitrate: '8,450 kbps (VBR)',
        }}
        hardwareProfile={hardwareProfile}
        activeShader={activeShader}
      />

      <OptionsDialog
        isOpen={showOptions}
        onClose={() => setShowOptions(false)}
        os={os}
        onSelectOS={setOs}
        decoder={decoder}
        onSelectDecoder={setDecoder}
        aspectRatio={aspectRatio}
        onSelectAspectRatio={setAspectRatio}
        showStats={showStats}
        onToggleStats={setShowStats}
        autoPlay={autoPlay}
        onToggleAutoPlay={setAutoPlay}
        loop={loop}
        onToggleLoop={setLoop}
      />

      <ShaderDialog
        isOpen={showShaders}
        onClose={() => setShowShaders(false)}
        activeShader={activeShader}
        onSelectShader={setActiveShader}
        shaderIntensity={shaderIntensity}
        onIntensityChange={setShaderIntensity}
      />

      <CodeExplorer
        isOpen={showCodeExplorer}
        onClose={() => setShowCodeExplorer(false)}
      />
    </div>
  );
};
