import React, { useRef, useState } from 'react';
import { Upload, Film, Image as ImageIcon, Sparkles, CheckCircle2 } from 'lucide-react';
import type { SampleVideo } from '../utils/sampleVideos';

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
      if (file.type.startsWith('video/') || file.type.startsWith('image/')) {
        onSelectVideo(file);
      } else {
        alert('请上传有效的视频文件（MP4, WebM, MOV等）或图片文件（PNG, JPG, WebP等）');
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
          视频 & 图片双模式 · 多区域框选 · AI 边缘平滑插值
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
          轻松框选水印，一键 AI 平滑修补
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          无需安装复杂软件，拖入视频或图片即可框选任意位置的水印、字幕、图标，AI 算法自动进行平滑融合与纹理补全。
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
          accept="video/*,image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="relative z-10 flex flex-col items-center justify-center">
          {/* Animated Upload Icon */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600/60 flex items-center justify-center text-indigo-400 mb-5 group-hover:scale-110 group-hover:border-indigo-500/50 transition-all duration-300 shadow-xl">
            <Upload className="w-9 h-9 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
          </div>

          <h3 className="text-lg font-semibold text-slate-200 mb-2">
            点击上传 或 将视频/图片拖拽至此处
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mb-6 max-w-md">
            支持标准视频格式（MP4, WebM, MOV 等）与图片格式（PNG, JPG, WebP, BMP 等），纯前端实时渲染，隐私安全不泄露
          </p>

          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-900/40 transition-all">
            <span className="flex items-center gap-1.5"><Film className="w-4 h-4" /> 选择视频</span>
            <span className="text-indigo-300">/</span>
            <span className="flex items-center gap-1.5"><ImageIcon className="w-4 h-4" /> 选择图片</span>
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
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 高清无损导出
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
