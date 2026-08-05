import React from 'react';
import { Sparkles, Download, Trash2, HelpCircle, Video, Play, FileVideo, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  hasVideo: boolean;
  regionsCount: number;
  isDetectingAI: boolean;
  onDetectAI: () => void;
  onExport: () => void;
  onClearRegions: () => void;
  onOpenHelp: () => void;
  onResetVideo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  hasVideo,
  regionsCount,
  isDetectingAI,
  onDetectAI,
  onExport,
  onClearRegions,
  onOpenHelp,
  onResetVideo,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 px-4 lg:px-8 py-3.5 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                视频水印去除工具
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-indigo-400" /> AI 智能修补
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              框选任意水印或字幕区域，智能平滑修补无痕导出
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {hasVideo && (
            <>
              {/* AI Auto-Detect Button */}
              <button
                onClick={onDetectAI}
                disabled={isDetectingAI}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 shadow-sm ${
                  isDetectingAI
                    ? 'bg-purple-900/50 text-purple-300 cursor-not-allowed border border-purple-500/30'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400/30 shadow-purple-900/30 active:scale-95'
                }`}
                title="自动截取当前视频帧并利用 Gemini AI 自动识别可见水印区域"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isDetectingAI ? 'animate-spin text-purple-300' : 'text-purple-200'}`} />
                {isDetectingAI ? 'AI 识别中...' : 'AI 智能识别水印'}
              </button>

              {/* Clear Regions */}
              {regionsCount > 0 && (
                <button
                  onClick={onClearRegions}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-red-400 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all flex items-center gap-1.5 active:scale-95"
                  title="清空所有标注选区"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  清空选区 ({regionsCount})
                </button>
              )}

              {/* Reset Video */}
              <button
                onClick={onResetVideo}
                className="px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-all flex items-center gap-1.5 active:scale-95"
                title="重新上传其他视频"
              >
                <FileVideo className="w-3.5 h-3.5 text-slate-400" />
                更换视频
              </button>

              {/* Export Button */}
              <button
                onClick={onExport}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 border border-emerald-400/30 transition-all flex items-center gap-2 active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                导出去水印视频
              </button>
            </>
          )}

          {/* Help Modal Toggle */}
          <button
            onClick={onOpenHelp}
            className="p-2 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
            title="使用帮助"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
