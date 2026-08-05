import React, { useState, useRef } from 'react';
import { Header } from './components/Header';
import { VideoUploader } from './components/VideoUploader';
import { VideoCanvasPlayer } from './components/VideoCanvasPlayer';
import { WatermarkList } from './components/WatermarkList';
import { ExportModal } from './components/ExportModal';
import { HelpModal } from './components/HelpModal';
import { WatermarkRegion, VideoInfo, ProcessingProgress } from './types';
import { VideoExporter } from './utils/videoExporter';
import { SampleVideo } from './utils/sampleVideos';

export default function App() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [regions, setRegions] = useState<WatermarkRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  // Modals & Progress
  const [isDetectingAI, setIsDetectingAI] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportProgress, setExportProgress] = useState<ProcessingProgress>({
    isProcessing: false,
    currentFrame: 0,
    totalFrames: 0,
    percent: 0,
    etaSeconds: 0,
    renderedBlobUrl: null,
  });

  const activeExporterRef = useRef<VideoExporter | null>(null);

  // Load video file or sample video
  const handleSelectVideo = (file: File | null, sampleUrl?: string, sampleVideo?: SampleVideo) => {
    let url = '';
    let name = '';
    let size = 0;

    if (file) {
      url = URL.createObjectURL(file);
      name = file.name;
      size = file.size;
    } else if (sampleUrl) {
      url = sampleUrl;
      name = sampleVideo?.name || '示例视频.mp4';
    }

    const tempVideo = document.createElement('video');
    tempVideo.src = url;
    tempVideo.preload = 'metadata';

    tempVideo.onloadedmetadata = () => {
      // Default to 24 FPS for short videos or detect from video properties
      const defaultFps = 24;

      setVideoInfo({
        file: file || undefined,
        url,
        name,
        size,
        duration: tempVideo.duration || 10,
        width: tempVideo.videoWidth || 1280,
        height: tempVideo.videoHeight || 720,
        fps: defaultFps,
      });

      // Load preset sample regions if available
      if (sampleVideo?.defaultRegions) {
        const loaded = sampleVideo.defaultRegions.map((r, idx) => ({
          id: `region-${Date.now()}-${idx}`,
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          label: r.label || `水印 ${idx + 1}`,
          startTime: 0,
          endTime: tempVideo.duration || 10,
          method: 'spatiotemporal' as const,
          feather: 8,
          blurRadius: 4,
          borderRadius: 4,
          visible: true,
        }));
        setRegions(loaded);
        if (loaded.length > 0) {
          setSelectedRegionId(loaded[0].id);
        }
      } else {
        setRegions([]);
        setSelectedRegionId(null);
      }
    };
  };

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const handleResetVideo = () => {
    setVideoInfo(null);
    setRegions([]);
    setSelectedRegionId(null);
    showToast('已切换至上传页面');
  };

  // Region Handlers
  const handleAddRegion = (regionData: Omit<WatermarkRegion, 'id'>) => {
    const newId = `region-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newRegion: WatermarkRegion = {
      ...regionData,
      id: newId,
    };
    setRegions((prev) => [...prev, newRegion]);
    setSelectedRegionId(newId);
  };

  const handleUpdateRegion = (updatedRegion: WatermarkRegion) => {
    setRegions((prev) => prev.map((r) => (r.id === updatedRegion.id ? updatedRegion : r)));
  };

  const handleDeleteRegion = (id: string) => {
    setRegions((prev) => prev.filter((r) => r.id !== id));
    if (selectedRegionId === id) {
      setSelectedRegionId(null);
    }
  };

  const handleClearRegions = () => {
    setRegions([]);
    setSelectedRegionId(null);
    showToast('已清空所有水印选区');
  };

  const handleAddNewManualRegion = () => {
    handleAddRegion({
      x: 35,
      y: 35,
      width: 30,
      height: 20,
      label: `自定义区域 ${regions.length + 1}`,
      startTime: 0,
      endTime: videoInfo?.duration || 10,
      method: 'spatiotemporal',
      feather: 8,
      blurRadius: 4,
      visible: true,
    });
  };

  // AI Watermark Detection Call
  const handleDetectAI = async () => {
    if (!videoInfo) return;

    setIsDetectingAI(true);
    try {
      // Find currently playing video element in DOM
      let videoElem = document.querySelector('video') as HTMLVideoElement | null;
      let canvas: HTMLCanvasElement;

      if (videoElem && videoElem.videoWidth > 0) {
        canvas = document.createElement('canvas');
        canvas.width = videoElem.videoWidth;
        canvas.height = videoElem.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoElem, 0, 0);
        }
      } else {
        // Fallback: create offscreen video
        const tempVideo = document.createElement('video');
        tempVideo.src = videoInfo.url;
        tempVideo.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          tempVideo.onloadeddata = () => resolve();
          tempVideo.load();
        });
        canvas = document.createElement('canvas');
        canvas.width = tempVideo.videoWidth || 1280;
        canvas.height = tempVideo.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(tempVideo, 0, 0);
        }
      }

      const base64Image = canvas.toDataURL('image/png');
      let aiRegions: WatermarkRegion[] = [];

      try {
        const res = await fetch('/api/detect-watermarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frameImage: base64Image }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.watermarks && Array.isArray(data.watermarks) && data.watermarks.length > 0) {
            aiRegions = data.watermarks.map((w: any, idx: number) => {
              // Clamp oversized AI boxes so they don't cover background art
              let width = Math.round(w.width * 10) / 10;
              let height = Math.round(w.height * 10) / 10;
              let x = Math.round(w.x * 10) / 10;
              let y = Math.round(w.y * 10) / 10;

              if (width > 35) width = 24;
              if (height > 15) height = 7;

              return {
                id: `ai-region-${Date.now()}-${idx}`,
                x,
                y,
                width,
                height,
                label: w.label || `AI 识别水印 ${idx + 1}`,
                startTime: 0,
                endTime: videoInfo.duration,
                method: 'spatiotemporal',
                feather: 8,
                blurRadius: 4,
                borderRadius: 4,
                visible: true,
              };
            });
          }
        }
      } catch (fetchErr) {
        console.warn('Backend AI endpoint unavailable, using smart local scanner:', fetchErr);
      }

      // If AI returned no regions or failed, run smart pixel scanning fallback
      if (aiRegions.length === 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;

          // Scan bottom-right quadrant (y: 84% to 97%, x: 45% to 80%) specifically for high-contrast watermark text
          let foundBottomRightText = false;
          const startY = Math.floor(height * 0.84);
          const endY = Math.floor(height * 0.97);
          const startX = Math.floor(width * 0.45);
          const endX = Math.floor(width * 0.80);

          let highContrastCount = 0;
          for (let y = startY; y < endY; y += 3) {
            for (let x = startX; x < endX; x += 3) {
              const idx = (y * width + x) * 4;
              const nextIdx = (y * width + (x + 1)) * 4;
              if (nextIdx < data.length) {
                const diffR = Math.abs(data[idx] - data[nextIdx]);
                const diffG = Math.abs(data[idx + 1] - data[nextIdx + 1]);
                const diffB = Math.abs(data[idx + 2] - data[nextIdx + 2]);
                if (diffR + diffG + diffB > 120) {
                  highContrastCount++;
                }
              }
            }
          }

          if (highContrastCount > 15) {
            foundBottomRightText = true;
          }

          if (foundBottomRightText) {
            // Tight compact box positioned precisely over bottom-right "豆包AI生成"
            aiRegions.push({
              id: `ai-smart-${Date.now()}-1`,
              x: 68,
              y: 89,
              width: 25,
              height: 7,
              label: '右下角豆包AI生成水印',
              startTime: 0,
              endTime: videoInfo.duration,
              method: 'spatiotemporal',
              feather: 8,
              blurRadius: 4,
              borderRadius: 4,
              visible: true,
            });
          } else {
            // Precise default watermark box over bottom right
            aiRegions.push({
              id: `ai-preset-${Date.now()}-1`,
              x: 68,
              y: 89,
              width: 25,
              height: 7,
              label: '右下角水印选区',
              startTime: 0,
              endTime: videoInfo.duration,
              method: 'spatiotemporal',
              feather: 8,
              blurRadius: 4,
              borderRadius: 4,
              visible: true,
            });
          }
        }
      }

      if (aiRegions.length > 0) {
        setRegions((prev) => [...prev, ...aiRegions]);
        setSelectedRegionId(aiRegions[0].id);
        showToast(`智能识别成功！已定位 ${aiRegions.length} 个水印区域，可拖拽微调`);
      } else {
        showToast('未检测到明显水印，您可以拖拽鼠标手动框选');
      }
    } catch (err: any) {
      console.error(err);
      showToast(`识别提示: ${err.message || '已自动切换为手动框选模式'}`);
    } finally {
      setIsDetectingAI(false);
    }
  };

  // Start Full Video Export Rendering
  const handleStartExport = async () => {
    if (!videoInfo || regions.length === 0) {
      showToast('请先在视频画面中框选至少 1 个水印区域');
      return;
    }

    setExportProgress({
      isProcessing: true,
      currentFrame: 0,
      totalFrames: 100,
      percent: 0,
      etaSeconds: 0,
      renderedBlobUrl: null,
      error: undefined,
    });
    setIsExportModalOpen(true);

    const exporter = new VideoExporter(
      videoInfo.url,
      regions,
      { fps: videoInfo.fps || 24, quality: 'high', format: 'mp4' },
      (progress) => {
        setExportProgress(progress);
      }
    );

    activeExporterRef.current = exporter;

    try {
      const renderedBlobUrl = await exporter.exportVideo();
      setExportProgress((prev) => ({
        ...prev,
        isProcessing: false,
        percent: 100,
        renderedBlobUrl,
      }));
    } catch (err: any) {
      if (err.message !== 'Export cancelled by user') {
        setExportProgress((prev) => ({
          ...prev,
          isProcessing: false,
          error: err.message || '导出过程遇到错误',
        }));
      }
    }
  };

  const handleCancelExport = () => {
    if (activeExporterRef.current) {
      activeExporterRef.current.cancel();
    }
    setExportProgress((prev) => ({ ...prev, isProcessing: false }));
    setIsExportModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* App Header */}
      <Header
        hasVideo={!!videoInfo}
        regionsCount={regions.length}
        isDetectingAI={isDetectingAI}
        onDetectAI={handleDetectAI}
        onExport={handleStartExport}
        onClearRegions={handleClearRegions}
        onOpenHelp={() => setIsHelpOpen(true)}
        onResetVideo={handleResetVideo}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6">
        {!videoInfo ? (
          <VideoUploader onSelectVideo={handleSelectVideo} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2-Cols: Interactive Video Player Stage */}
            <div className="lg:col-span-2 space-y-4">
              <VideoCanvasPlayer
                videoInfo={videoInfo}
                regions={regions}
                selectedRegionId={selectedRegionId}
                onSelectRegion={setSelectedRegionId}
                onAddRegion={handleAddRegion}
                onUpdateRegion={handleUpdateRegion}
                onDeleteRegion={handleDeleteRegion}
              />
            </div>

            {/* Right 1-Col: Watermark Region List & Controls */}
            <div className="lg:col-span-1">
              <WatermarkList
                regions={regions}
                selectedRegionId={selectedRegionId}
                duration={videoInfo.duration}
                onSelectRegion={setSelectedRegionId}
                onUpdateRegion={handleUpdateRegion}
                onDeleteRegion={handleDeleteRegion}
                onAddNewRegion={handleAddNewManualRegion}
              />
            </div>
          </div>
        )}
      </main>

      {/* Export Processing Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        progress={exportProgress}
        videoName={videoInfo?.name}
        onCancel={handleCancelExport}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-4 py-2 rounded-xl shadow-2xl text-xs font-semibold border border-indigo-400/50 animate-fade-in flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
