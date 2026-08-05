import React, { useRef, useState } from 'react';
import { Upload, Film, Sparkles, FileVideo, ShieldCheck, CheckCircle2, Play } from 'lucide-react';
import { SAMPLE_VIDEOS, SampleVideo } from '../utils/sampleVideos';

interface VideoUploaderProps {
  onSelectVideo: (file: File | null, sampleUrl?: string, sampleVideo?: SampleVideo) => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({ onSelectVideo }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        onSelectVideo(file);
      } else {
        alert('请上传有效的视频文件（如 MP4, WebM, MOV 等）');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onSelectVideo(files[0]);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
      {/* Hero Welcome Banner */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          多区域框选 · AI 边缘平滑插值 · 实时原图对比
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
          轻松框选水印，一键 AI 平滑修补
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          无需安装复杂软件，拖入视频即可框选任意位置的水印、字幕、图标或字幕角落，AI 算法自动进行时空融合与纹理补全。
        </p>
      </div>

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-8 sm:p-12 text-center bg-slate-900/60 backdrop-blur-sm overflow-hidden ${
          isDragging
            ? 'border-indigo-500 bg-indigo-950/30 scale-[1.01] shadow-2xl shadow-indigo-500/10'
            : 'border-slate-700/80 hover:border-slate-500 hover:bg-slate-900/90 shadow-xl'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="relative z-10 flex flex-col items-center justify-center">
          {/* Animated Upload Icon */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600/60 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-110 group-hover:border-indigo-500/50 transition-all duration-300 shadow-xl">
            <Upload className="w-9 h-9 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
          </div>

          <h3 className="text-lg font-semibold text-slate-200 mb-2">
            点击上传 或 将视频拖拽至此处
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mb-6 max-w-md">
            支持标准视频格式（MP4, WebM, MOV, AVI, MKV 等），浏览器本地实时渲染，隐私安全不泄露
          </p>

          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-900/40 transition-all">
            <Film className="w-4 h-4" /> 选择本地视频文件
          </div>

          {/* Features badge */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 w-full max-w-lg flex items-center justify-around text-xs text-slate-400 gap-2 flex-wrap">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 支持框选多个区域
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 智能 AI 自动识别
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 逐帧处理与导出
            </span>
          </div>
        </div>
      </div>

      {/* Preset Sample Videos Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-300 tracking-wider uppercase flex items-center gap-2">
            <FileVideo className="w-4 h-4 text-indigo-400" />
            快速体验（示例视频）：
          </h3>
          <span className="text-xs text-slate-500">点击下方示例可直接加载测试</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SAMPLE_VIDEOS.map((sample) => (
            <div
              key={sample.id}
              onClick={() => onSelectVideo(null, sample.url, sample)}
              className="group relative bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-3.5 cursor-pointer transition-all duration-200 flex gap-4 items-center hover:bg-slate-800/80 shadow-md"
            >
              <div className="relative w-28 h-20 rounded-lg overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                <img
                  src={sample.thumbnail}
                  alt={sample.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-colors flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                  {sample.name}
                </h4>
                <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                  {sample.description}
                </p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-indigo-400">
                  <span>预设 {sample.defaultRegions?.length || 0} 个水印标注</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
