import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Eye,
  Columns,
  Layers,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Sliders,
  Move
} from 'lucide-react';
import { WatermarkRegion, VideoInfo } from '../types';
import { processCanvasFrame } from '../utils/inpainting';

export type ViewMode = 'inpainted' | 'original' | 'split';

interface VideoCanvasPlayerProps {
  videoInfo: VideoInfo;
  regions: WatermarkRegion[];
  selectedRegionId: string | null;
  onSelectRegion: (id: string | null) => void;
  onAddRegion: (region: Omit<WatermarkRegion, 'id'>) => void;
  onUpdateRegion: (region: WatermarkRegion) => void;
  onDeleteRegion: (id: string) => void;
}

export const VideoCanvasPlayer: React.FC<VideoCanvasPlayerProps> = ({
  videoInfo,
  regions,
  selectedRegionId,
  onSelectRegion,
  onAddRegion,
  onUpdateRegion,
  onDeleteRegion,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Player States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(videoInfo.duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('inpainted');
  const [splitRatio, setSplitRatio] = useState(50); // percentage for split view

  // Mouse Interaction States for Drawing / Editing Bounding Boxes
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawRect, setCurrentDrawRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const [draggingRegionId, setDraggingRegionId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [activeHandleRegionId, setActiveHandleRegionId] = useState<string | null>(null);
  const [handleStart, setHandleStart] = useState<{ mouseX: number; mouseY: number; box: WatermarkRegion } | null>(null);

  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);

  const isImage = videoInfo.mediaType === 'image';
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // Load image object if mediaType is image
  useEffect(() => {
    if (isImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = videoInfo.url;
      img.onload = () => {
        setImageObj(img);
      };
    } else {
      setImageObj(null);
    }
  }, [isImage, videoInfo.url]);

  // Synchronize duration on video load
  useEffect(() => {
    if (isImage) return;
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration || videoInfo.duration || 0);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [isImage, videoInfo]);

  // Main Canvas Render Loop
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    let sourceElem: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement | null = null;
    let width = videoInfo.width || 1280;
    let height = videoInfo.height || 720;

    if (isImage) {
      if (!imageObj) return;
      sourceElem = imageObj;
      width = imageObj.naturalWidth || width;
      height = imageObj.naturalHeight || height;
    } else {
      const video = videoRef.current;
      if (!video) return;
      sourceElem = video;
      width = video.videoWidth || width;
      height = video.videoHeight || height;
    }

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const t = isImage ? 0 : (videoRef.current?.currentTime || 0);

    if (viewMode === 'original') {
      // Raw media
      ctx.drawImage(sourceElem, 0, 0, width, height);
    } else if (viewMode === 'inpainted') {
      // Fully inpainted media
      ctx.drawImage(sourceElem, 0, 0, width, height);
      processCanvasFrame(ctx, width, height, regions, t);
    } else if (viewMode === 'split') {
      // Split view: Left = Inpainted, Right = Original
      const splitX = Math.round((splitRatio / 100) * width);

      // Draw original
      ctx.drawImage(sourceElem, 0, 0, width, height);

      // Draw inpainted on offscreen then copy left portion
      const offscreen = document.createElement('canvas');
      offscreen.width = width;
      offscreen.height = height;
      const offCtx = offscreen.getContext('2d');
      if (offCtx) {
        offCtx.drawImage(sourceElem, 0, 0, width, height);
        processCanvasFrame(offCtx, width, height, regions, t);

        // Copy left slice
        if (splitX > 0) {
          ctx.drawImage(offscreen, 0, 0, splitX, height, 0, 0, splitX, height);
        }

        // Draw vertical split line
        ctx.save();
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = Math.max(2, Math.round(width / 400));
        ctx.beginPath();
        ctx.moveTo(splitX, 0);
        ctx.lineTo(splitX, height);
        ctx.stroke();

        // Split badge labels
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(10, 10, 100, 26);
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('修补后', 20, 27);

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(width - 110, 10, 100, 26);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(isImage ? '原始图片' : '原始视频', width - 95, 27);

        ctx.restore();
      }
    }
  }, [isImage, imageObj, viewMode, regions, splitRatio, videoInfo.width, videoInfo.height]);

  // RequestAnimationFrame loop when playing
  useEffect(() => {
    let animId: number;
    const loop = () => {
      renderFrame();
      const video = videoRef.current;
      if (video) {
        setCurrentTime(video.currentTime);
      }
      if (isPlaying) {
        animId = requestAnimationFrame(loop);
      }
    };

    loop();
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isPlaying, renderFrame]);

  // Trigger render frame whenever video time or viewMode changes while paused
  useEffect(() => {
    if (!isPlaying) {
      renderFrame();
    }
  }, [currentTime, viewMode, regions, splitRatio, isPlaying, renderFrame]);

  // Play / Pause controls
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.currentTime = targetTime;
      setCurrentTime(targetTime);
      renderFrame();
    }
  };

  const stepFrame = (frames: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setIsPlaying(false);
    const frameDuration = 1 / (videoInfo.fps || 30);
    const newTime = Math.max(0, Math.min(duration, video.currentTime + frames * frameDuration));
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  // Keyboard arrow keys for fine-tuning selected region position (supports Shift/Alt modifiers)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedRegionId) return;
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') return;

      const selectedRegion = regions.find((r) => r.id === selectedRegionId);
      if (!selectedRegion) return;

      const step = e.shiftKey ? 2 : e.altKey ? 0.1 : 0.5;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onUpdateRegion({
          ...selectedRegion,
          x: Math.max(0, Math.round((selectedRegion.x - step) * 100) / 100),
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onUpdateRegion({
          ...selectedRegion,
          x: Math.min(100 - selectedRegion.width, Math.round((selectedRegion.x + step) * 100) / 100),
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onUpdateRegion({
          ...selectedRegion,
          y: Math.max(0, Math.round((selectedRegion.y - step) * 100) / 100),
        });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onUpdateRegion({
          ...selectedRegion,
          y: Math.min(100 - selectedRegion.height, Math.round((selectedRegion.y + step) * 100) / 100),
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRegionId, regions, onUpdateRegion]);

  // Convert canvas pixel mouse coordinates to stage percentage (0-100%)
  const getCanvasCoords = (e: React.MouseEvent | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { xPct: 0, yPct: 0, rectWidth: 0, rectHeight: 0, clickX: 0, clickY: 0 };

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPct = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, (clickY / rect.height) * 100));

    return { xPct, yPct, rectWidth: rect.width, rectHeight: rect.height, clickX, clickY };
  };

  // Window mouse move & mouse up listeners for smooth resizing/dragging even outside canvas bounds
  useEffect(() => {
    if (!activeHandle && !isDraggingBox && !isDrawing) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const { xPct, yPct } = getCanvasCoords(e);

      if (isDrawing && drawStart) {
        const x = Math.min(drawStart.x, xPct);
        const y = Math.min(drawStart.y, yPct);
        const w = Math.abs(xPct - drawStart.x);
        const h = Math.abs(yPct - drawStart.y);
        setCurrentDrawRect({ x, y, w, h });
        return;
      }

      const targetBoxId = draggingRegionId || selectedRegionId;
      if (isDraggingBox && targetBoxId && dragOffset) {
        const box = regions.find((r) => r.id === targetBoxId);
        if (box) {
          let newX = Math.max(0, Math.min(100 - box.width, xPct - dragOffset.x));
          let newY = Math.max(0, Math.min(100 - box.height, yPct - dragOffset.y));
          onUpdateRegion({ ...box, x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
        }
        return;
      }

      const handleBoxId = activeHandleRegionId || selectedRegionId;
      if (activeHandle && handleStart && handleBoxId) {
        const box = regions.find((r) => r.id === handleBoxId);
        if (!box) return;

        const dx = xPct - handleStart.mouseX;
        const dy = yPct - handleStart.mouseY;

        let { x, y, width, height } = handleStart.box;

        if (activeHandle.includes('e')) width = Math.max(1, Math.min(100 - x, handleStart.box.width + dx));
        if (activeHandle.includes('s')) height = Math.max(1, Math.min(100 - y, handleStart.box.height + dy));
        if (activeHandle.includes('w')) {
          const newWidth = Math.max(1, handleStart.box.width - dx);
          x = handleStart.box.x + (handleStart.box.width - newWidth);
          width = newWidth;
        }
        if (activeHandle.includes('n')) {
          const newHeight = Math.max(1, handleStart.box.height - dy);
          y = handleStart.box.y + (handleStart.box.height - newHeight);
          height = newHeight;
        }

        onUpdateRegion({
          ...box,
          x: Math.round(Math.max(0, x) * 10) / 10,
          y: Math.round(Math.max(0, y) * 10) / 10,
          width: Math.round(Math.min(100 - x, width) * 10) / 10,
          height: Math.round(Math.min(100 - y, height) * 10) / 10,
        });
      }
    };

    const handleWindowMouseUp = () => {
      if (isDrawing && currentDrawRect) {
        if (currentDrawRect.w > 1 && currentDrawRect.h > 1) {
          onAddRegion({
            x: Math.round(currentDrawRect.x * 10) / 10,
            y: Math.round(currentDrawRect.y * 10) / 10,
            width: Math.round(currentDrawRect.w * 10) / 10,
            height: Math.round(currentDrawRect.h * 10) / 10,
            label: `水印区域 ${regions.length + 1}`,
            startTime: 0,
            endTime: duration,
            method: 'spatiotemporal',
            feather: 8,
            blurRadius: 4,
            borderRadius: 4,
            visible: true,
          });
        }
      }

      setIsDrawing(false);
      setDrawStart(null);
      setCurrentDrawRect(null);

      setIsDraggingBox(false);
      setDraggingRegionId(null);
      setDragOffset(null);

      setActiveHandle(null);
      setActiveHandleRegionId(null);
      setHandleStart(null);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [
    activeHandle,
    activeHandleRegionId,
    isDraggingBox,
    draggingRegionId,
    isDrawing,
    drawStart,
    currentDrawRect,
    handleStart,
    selectedRegionId,
    dragOffset,
    regions,
    duration,
    onAddRegion,
    onUpdateRegion,
  ]);

  // Keyboard shortcut support for fine-tuning selected box size/position
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedRegionId) return;
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'select' || targetTag === 'textarea') return;

      const box = regions.find((r) => r.id === selectedRegionId);
      if (!box) return;

      const delta = e.shiftKey ? 2 : 0.5; // shift for larger jump

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (e.altKey) {
          // Alt + Left = Shrink width
          onUpdateRegion({ ...box, width: Math.max(1, Math.round((box.width - delta) * 10) / 10) });
        } else {
          // Move left
          onUpdateRegion({ ...box, x: Math.max(0, Math.round((box.x - delta) * 10) / 10) });
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (e.altKey) {
          // Alt + Right = Expand width
          onUpdateRegion({ ...box, width: Math.min(100 - box.x, Math.round((box.width + delta) * 10) / 10) });
        } else {
          // Move right
          onUpdateRegion({ ...box, x: Math.min(100 - box.width, Math.round((box.x + delta) * 10) / 10) });
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (e.altKey) {
          // Alt + Up = Shrink height
          onUpdateRegion({ ...box, height: Math.max(1, Math.round((box.height - delta) * 10) / 10) });
        } else {
          // Move up
          onUpdateRegion({ ...box, y: Math.max(0, Math.round((box.y - delta) * 10) / 10) });
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (e.altKey) {
          // Alt + Down = Expand height
          onUpdateRegion({ ...box, height: Math.min(100 - box.y, Math.round((box.height + delta) * 10) / 10) });
        } else {
          // Move down
          onUpdateRegion({ ...box, y: Math.min(100 - box.height, Math.round((box.y + delta) * 10) / 10) });
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        onDeleteRegion(selectedRegionId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedRegionId, regions, onUpdateRegion, onDeleteRegion]);

  // Mouse Down Event for Stage Container (Draw New Box or Select Existing)
  const handleStageMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDraggingSplitter) return;
    const { xPct, yPct } = getCanvasCoords(e);

    // Check if clicking on any existing region box to select it and drag
    const clickedBox = regions.find(
      (r) => xPct >= r.x && xPct <= r.x + r.width && yPct >= r.y && yPct <= r.y + r.height
    );

    if (clickedBox) {
      onSelectRegion(clickedBox.id);
      setIsDraggingBox(true);
      setDragOffset({ x: xPct - clickedBox.x, y: yPct - clickedBox.y });
      return;
    }

    // Otherwise, start drawing a new region box
    onSelectRegion(null);
    setIsDrawing(true);
    setDrawStart({ x: xPct, y: yPct });
    setCurrentDrawRect({ x: xPct, y: yPct, w: 0, h: 0 });
  };

  // Helper to detect if cursor is over box resize handles
  const getHandleUnderCursor = (xPct: number, yPct: number, box: WatermarkRegion) => {
    const handleThreshold = 3; // % margin
    const handles = [
      { name: 'nw', x: box.x, y: box.y },
      { name: 'n', x: box.x + box.width / 2, y: box.y },
      { name: 'ne', x: box.x + box.width, y: box.y },
      { name: 'e', x: box.x + box.width, y: box.y + box.height / 2 },
      { name: 'se', x: box.x + box.width, y: box.y + box.height },
      { name: 's', x: box.x + box.width / 2, y: box.y + box.height },
      { name: 'sw', x: box.x, y: box.y + box.height },
      { name: 'w', x: box.x, y: box.y + box.height / 2 },
    ];

    for (const h of handles) {
      if (Math.abs(xPct - h.x) <= handleThreshold && Math.abs(yPct - h.y) <= handleThreshold) {
        return h.name;
      }
    }
    return null;
  };

  // Format time (00:00.0)
  const formatTime = (timeInSec: number) => {
    if (isNaN(timeInSec)) return '00:00';
    const mins = Math.floor(timeInSec / 60);
    const secs = Math.floor(timeInSec % 60);
    const tenths = Math.floor((timeInSec % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* View Mode Toolbar Header */}
      <div className="bg-slate-950/80 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setViewMode('inpainted')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              viewMode === 'inpainted'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            去水印预览
          </button>
          <button
            onClick={() => setViewMode('original')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              viewMode === 'original'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            原图与框选
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              viewMode === 'split'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            左右对比
          </button>
        </div>

        {/* Video Specs Badge */}
        <div className="flex items-center gap-3 text-slate-400 text-[11px]">
          <span>分辨率: <strong className="text-slate-200">{videoInfo.width || 0}x{videoInfo.height || 0}</strong></span>
          <span>帧率: <strong className="text-slate-200">{videoInfo.fps || 30} FPS</strong></span>
          <span>选区数量: <strong className="text-indigo-400">{regions.length} 个</strong></span>
        </div>
      </div>

      {/* Primary Video Canvas Stage Container */}
      <div
        className="relative bg-black flex items-center justify-center select-none overflow-hidden min-h-[360px] sm:min-h-[460px]"
        onMouseDown={handleStageMouseDown}
      >
        {/* Hidden HTML5 video element source */}
        <video
          ref={videoRef}
          src={videoInfo.url}
          className="hidden"
          playsInline
          muted={isMuted}
        />

        {/* Canvas & Overlay Interactive Stage Wrapper */}
        <div className="relative inline-flex items-center justify-center max-w-full max-h-[65vh]">
          {/* Render Canvas */}
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-[65vh] object-contain shadow-2xl cursor-crosshair block"
          />

          {/* Bounding Boxes Layer Overlay - pinned EXACTLY to canvas bounds */}
          <div className="absolute inset-0 pointer-events-none">
            {regions.map((region) => {
              const isSelected = region.id === selectedRegionId;
              const isActiveTime =
                currentTime >= (region.startTime || 0) &&
                (region.endTime ? currentTime <= region.endTime : true);

              return (
                <div
                  key={region.id}
                  style={{
                    left: `${region.x}%`,
                    top: `${region.y}%`,
                    width: `${region.width}%`,
                    height: `${region.height}%`,
                    borderRadius: `${region.borderRadius || 0}px`,
                  }}
                  className={`absolute pointer-events-auto transition-colors border-2 cursor-grab active:cursor-grabbing ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-500/20 shadow-lg shadow-indigo-500/30 z-20'
                      : isActiveTime
                      ? 'border-emerald-400/80 bg-emerald-500/10 hover:border-emerald-300 z-10'
                      : 'border-slate-500/50 bg-slate-500/5 z-0 opacity-60'
                  }`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onSelectRegion(region.id);
                    setDraggingRegionId(region.id);
                    setIsDraggingBox(true);
                    const { xPct, yPct } = getCanvasCoords(e);
                    setDragOffset({
                      x: xPct - region.x,
                      y: yPct - region.y,
                    });
                  }}
                >
                  {/* Unified Region Label Tag & On-Box Controls Bar */}
                  <div
                    className={`absolute ${
                      region.y < 12 ? 'top-1 left-1' : '-top-8 left-0'
                    } px-2 py-0.5 text-[10px] font-semibold rounded-md shadow-xl flex items-center gap-1.5 whitespace-nowrap select-none border backdrop-blur-md z-30 ${
                      isSelected
                        ? 'bg-indigo-900/95 text-white border-indigo-400/80 shadow-indigo-950/50'
                        : 'bg-slate-900/90 text-slate-200 border-slate-700/80'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <span>{region.label || '水印区域'}</span>
                    <span className="font-mono text-[9px] opacity-80 border-l border-indigo-400/30 pl-1.5">
                      {Math.round((region.width / 100) * (videoInfo.width || 1280))}px × {Math.round((region.height / 100) * (videoInfo.height || 720))}px
                    </span>
                    {!isActiveTime && <span className="text-amber-300 text-[9px]">(非当前时段)</span>}

                    {/* Size Steppers integrated cleanly inside badge when selected */}
                    {isSelected && (
                      <div className="flex items-center gap-0.5 border-l border-indigo-400/40 pl-1.5 ml-0.5">
                        <button
                          type="button"
                          onClick={() => onUpdateRegion({ ...region, width: Math.max(1, Math.round((region.width - 0.5) * 10) / 10) })}
                          className="px-1 py-0.2 bg-indigo-950 hover:bg-indigo-600 border border-indigo-500/50 rounded text-[9px] font-mono font-bold transition-colors"
                          title="减小宽度 (-0.5%)"
                        >
                          -W
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateRegion({ ...region, width: Math.min(100 - region.x, Math.round((region.width + 0.5) * 10) / 10) })}
                          className="px-1 py-0.2 bg-indigo-950 hover:bg-indigo-600 border border-indigo-500/50 rounded text-[9px] font-mono font-bold transition-colors"
                          title="增加宽度 (+0.5%)"
                        >
                          +W
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateRegion({ ...region, height: Math.max(1, Math.round((region.height - 0.5) * 10) / 10) })}
                          className="px-1 py-0.2 bg-indigo-950 hover:bg-indigo-600 border border-indigo-500/50 rounded text-[9px] font-mono font-bold transition-colors"
                          title="减小高度 (-0.5%)"
                        >
                          -H
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateRegion({ ...region, height: Math.min(100 - region.y, Math.round((region.height + 0.5) * 10) / 10) })}
                          className="px-1 py-0.2 bg-indigo-950 hover:bg-indigo-600 border border-indigo-500/50 rounded text-[9px] font-mono font-bold transition-colors"
                          title="增加高度 (+0.5%)"
                        >
                          +H
                        </button>
                      </div>
                    )}
                  </div>

                {/* Direct Edge Resizing Strips for Selected Box */}
                {isSelected && (
                  <>
                    {/* Top Edge */}
                    <div
                      className="absolute top-0 left-2 right-2 h-1.5 -translate-y-1/2 cursor-ns-resize hover:bg-indigo-400/60 z-20"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const { xPct, yPct } = getCanvasCoords(e);
                        setActiveHandle('n');
                        setActiveHandleRegionId(region.id);
                        setHandleStart({ mouseX: xPct, mouseY: yPct, box: { ...region } });
                      }}
                    />
                    {/* Bottom Edge */}
                    <div
                      className="absolute bottom-0 left-2 right-2 h-1.5 translate-y-1/2 cursor-ns-resize hover:bg-indigo-400/60 z-20"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const { xPct, yPct } = getCanvasCoords(e);
                        setActiveHandle('s');
                        setActiveHandleRegionId(region.id);
                        setHandleStart({ mouseX: xPct, mouseY: yPct, box: { ...region } });
                      }}
                    />
                    {/* Left Edge */}
                    <div
                      className="absolute left-0 top-2 bottom-2 w-1.5 -translate-x-1/2 cursor-ew-resize hover:bg-indigo-400/60 z-20"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const { xPct, yPct } = getCanvasCoords(e);
                        setActiveHandle('w');
                        setActiveHandleRegionId(region.id);
                        setHandleStart({ mouseX: xPct, mouseY: yPct, box: { ...region } });
                      }}
                    />
                    {/* Right Edge */}
                    <div
                      className="absolute right-0 top-2 bottom-2 w-1.5 translate-x-1/2 cursor-ew-resize hover:bg-indigo-400/60 z-20"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const { xPct, yPct } = getCanvasCoords(e);
                        setActiveHandle('e');
                        setActiveHandleRegionId(region.id);
                        setHandleStart({ mouseX: xPct, mouseY: yPct, box: { ...region } });
                      }}
                    />
                  </>
                )}

                {/* Resize Handles for Selected Box */}
                {isSelected && (
                  <>
                    {[
                      { key: 'nw', cls: '-top-1.5 -left-1.5 cursor-nwse-resize' },
                      { key: 'n', cls: '-top-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
                      { key: 'ne', cls: '-top-1.5 -right-1.5 cursor-nesw-resize' },
                      { key: 'e', cls: 'top-1/2 -right-1.5 -translate-y-1/2 cursor-ew-resize' },
                      { key: 'se', cls: '-bottom-1.5 -right-1.5 cursor-nwse-resize' },
                      { key: 's', cls: '-bottom-1.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
                      { key: 'sw', cls: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
                      { key: 'w', cls: 'top-1/2 -left-1.5 -translate-y-1/2 cursor-ew-resize' },
                    ].map((h) => (
                      <div
                        key={h.key}
                        className={`absolute w-3 h-3 bg-white border-2 border-indigo-600 rounded-full shadow-lg hover:scale-125 transition-transform z-30 ${h.cls}`}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const { xPct, yPct } = getCanvasCoords(e);
                          setActiveHandle(h.key);
                          setActiveHandleRegionId(region.id);
                          setHandleStart({ mouseX: xPct, mouseY: yPct, box: { ...region } });
                        }}
                      />
                    ))}
                  </>
                )}
              </div>
            );
          })}

          {/* Render box currently being drawn by user dragging */}
          {isDrawing && currentDrawRect && (
            <div
              style={{
                left: `${currentDrawRect.x}%`,
                top: `${currentDrawRect.y}%`,
                width: `${currentDrawRect.w}%`,
                height: `${currentDrawRect.h}%`,
              }}
              className="absolute border-2 border-dashed border-indigo-400 bg-indigo-500/20 z-30 pointer-events-none"
            >
              <div className="absolute -top-5 left-0 px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] rounded font-mono">
                {Math.round(currentDrawRect.w)}% x {Math.round(currentDrawRect.h)}%
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Split view slider bar */}
        {viewMode === 'split' && (
          <div
            style={{ left: `${splitRatio}%` }}
            className="absolute top-0 bottom-0 w-1 bg-indigo-500 cursor-ew-resize z-40 flex items-center justify-center group"
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsDraggingSplitter(true);
            }}
          >
            <div className="w-6 h-8 bg-indigo-600 text-white rounded-md shadow-lg flex items-center justify-center -ml-0.5 border border-indigo-400 text-[10px] font-bold">
              <Move className="w-3 h-3" />
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      {isImage ? (
        <div className="bg-slate-950 p-3.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold text-[10px] border border-indigo-500/30">
              图片去水印模式
            </span>
            <span className="font-mono text-slate-300">
              原始尺寸: {imageObj?.naturalWidth || videoInfo.width || 0} × {imageObj?.naturalHeight || videoInfo.height || 0} px
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            框选水印区域后即可直接导出无痕去水印图片
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 p-4 border-t border-slate-800 space-y-3">
          {/* Timeline Scrubber */}
          <div className="relative flex items-center group">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2.5 transition-all"
            />
            {/* Active Watermark Markers on Timeline */}
            {regions.map((r) => {
              if (!duration) return null;
              const startPct = ((r.startTime || 0) / duration) * 100;
              const endPct = r.endTime ? (r.endTime / duration) * 100 : 100;
              return (
                <div
                  key={r.id}
                  style={{ left: `${startPct}%`, width: `${Math.max(1, endPct - startPct)}%` }}
                  className="absolute top-0 h-1.5 bg-indigo-500/40 rounded pointer-events-none"
                />
              );
            })}
          </div>

          {/* Playback Controls Grid */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-900/40 transition-all active:scale-95"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
              </button>

              {/* Frame step backward / forward */}
              <button
                onClick={() => stepFrame(-1)}
                className="p-2 rounded-lg text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
                title="倒退 1 帧 (1/30 秒)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => stepFrame(1)}
                className="p-2 rounded-lg text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
                title="前进 1 帧 (1/30 秒)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Timestamp text */}
              <div className="text-xs font-mono text-slate-300 ml-2">
                <span className="text-indigo-400 font-semibold">{formatTime(currentTime)}</span>
                <span className="text-slate-600 mx-1">/</span>
                <span className="text-slate-400">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Playback Speed dropdown */}
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span>倍速:</span>
                <select
                  value={playbackRate}
                  onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-md px-2 py-1 outline-none focus:border-indigo-500"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1.0x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2.0x</option>
                </select>
              </div>

              {/* Mute & Volume */}
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="text-slate-400 hover:text-white">
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={changeVolume}
                  className="w-16 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
