import React from 'react';
import { X, Sparkles, MousePointer, Layers, Clock, ShieldCheck, Check } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" /> 使用指南与小技巧
        </h3>

        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          <div className="flex gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0 h-fit">
              <MousePointer className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-100 mb-0.5">1. 手动框选水印区域</h4>
              <p className="text-slate-400">
                在视频画面上按住鼠标左键并拖拽，即可绘制遮罩选区。支持同时框选多个不同的水印或字幕位置！
              </p>
            </div>
          </div>

          <div className="flex gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400 shrink-0 h-fit">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-100 mb-0.5">2. AI 智能自动识别</h4>
              <p className="text-slate-400">
                播放到包含水印的画面，点击顶部“AI 智能识别水印”，Gemini 大模型将自动扫描并高亮标注角标、logo 及字幕。
              </p>
            </div>
          </div>

          <div className="flex gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 h-fit">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-100 mb-0.5">3. 设定水印出现的时间段</h4>
              <p className="text-slate-400">
                如果水印只在片头或片尾出现，可以在右侧选区列表中单独设置开始和结束秒数，避免影响其他片段。
              </p>
            </div>
          </div>

          <div className="flex gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="p-2 rounded-lg bg-pink-500/20 text-pink-400 shrink-0 h-fit">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-100 mb-0.5">4. 羽化边距调整</h4>
              <p className="text-slate-400">
                若选区边缘留有痕迹，可适当调大“羽化边距”参数，让选区与四周邻域像素过渡更自然平滑。
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
        >
          开始使用
        </button>
      </div>
    </div>
  );
};
