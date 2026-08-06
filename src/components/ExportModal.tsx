import React from 'react';
import { Download, X, Loader2, CheckCircle, Film, AlertCircle } from 'lucide-react';
import { ProcessingProgress } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  progress: ProcessingProgress;
  videoName?: string;
  isImage?: boolean;
  onCancel: () => void;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  progress,
  videoName,
  isImage = false,
  onCancel,
  onClose,
}) => {
  if (!isOpen) return null;

  const isCompleted = progress.percent >= 100 || !!progress.renderedBlobUrl;
  const isError = !!progress.error;

  const defaultExt = isImage ? 'png' : 'mp4';
  const downloadFilename = videoName
    ? `${videoName.replace(/\.[^/.]+$/, '')}_去水印.${defaultExt}`
    : `watermark_removed_${isImage ? 'image.png' : 'video.mp4'}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={isCompleted || isError ? onClose : onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3 shadow-lg">
            {isCompleted ? (
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            ) : isError ? (
              <AlertCircle className="w-6 h-6 text-red-400" />
            ) : (
              <Film className="w-6 h-6 text-indigo-400 animate-pulse" />
            )}
          </div>

          <h3 className="text-lg font-bold text-white mb-1">
            {isCompleted
              ? `${isImage ? '图片' : '视频'}去水印处理完成！`
              : isError
              ? '导出遇到错误'
              : `正在进行${isImage ? '图片' : '视频'}去水印导出...`}
          </h3>
          <p className="text-xs text-slate-400">
            {isCompleted
              ? `您的${isImage ? '图片' : '视频'}已成功去水印，可以立即下载到本地`
              : isError
              ? progress.error
              : '浏览器正在本地处理水印遮罩，请勿关闭页面'}
          </p>
        </div>

        {/* Progress Display */}
        {!isCompleted && !isError && (
          <div className="space-y-5">
            {/* Circular Progress Bar */}
            <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-800"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-indigo-500 transition-all duration-300 ease-out"
                  strokeDasharray={`${progress.percent}, 100`}
                  strokeWidth="3"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                <span className="text-2xl font-bold text-white">{progress.percent}%</span>
                <span className="text-[10px] text-slate-400">处理进度</span>
              </div>
            </div>

            {/* Frame & ETA Stats */}
            {!isImage && (
              <div className="grid grid-cols-2 gap-3 text-center bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] mb-0.5">帧数进度</span>
                  <span className="text-slate-200 font-semibold">
                    {progress.currentFrame} / {progress.totalFrames} 帧
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] mb-0.5">预计剩余时间</span>
                  <span className="text-indigo-400 font-semibold">
                    约 {progress.etaSeconds || 0} 秒
                  </span>
                </div>
              </div>
            )}

            {/* Cancel Button */}
            <button
              onClick={onCancel}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              取消导出
            </button>
          </div>
        )}

        {/* Completed Download Section */}
        {isCompleted && progress.renderedBlobUrl && (
          <div className="space-y-4">
            {/* Rendered Preview */}
            <div className="rounded-xl overflow-hidden bg-black border border-slate-800 max-h-56 flex items-center justify-center p-2">
              {isImage ? (
                <img
                  src={progress.renderedBlobUrl}
                  alt="去水印结果"
                  className="max-h-52 max-w-full object-contain rounded"
                />
              ) : (
                <video
                  src={progress.renderedBlobUrl}
                  controls
                  autoPlay
                  className="max-h-56 max-w-full object-contain"
                />
              )}
            </div>

            <div className="flex gap-3">
              <a
                href={progress.renderedBlobUrl}
                download={downloadFilename}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all"
              >
                <Download className="w-4 h-4" /> 下载{isImage ? '图片' : 'MP4 视频'}去水印文件
              </a>
              <button
                onClick={onClose}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                完成关闭
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
