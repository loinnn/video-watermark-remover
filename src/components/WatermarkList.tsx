import React from 'react';
import {
  Trash2,
  Eye,
  EyeOff,
  Sliders,
  Clock,
  Square,
  Sparkles,
  Layers,
  Plus
} from 'lucide-react';
import { WatermarkRegion, InpaintMethod } from '../types';

interface WatermarkListProps {
  regions: WatermarkRegion[];
  selectedRegionId: string | null;
  duration: number;
  onSelectRegion: (id: string | null) => void;
  onUpdateRegion: (region: WatermarkRegion) => void;
  onDeleteRegion: (id: string) => void;
  onAddNewRegion: () => void;
}

export const WatermarkList: React.FC<WatermarkListProps> = ({
  regions,
  selectedRegionId,
  duration,
  onSelectRegion,
  onUpdateRegion,
  onDeleteRegion,
  onAddNewRegion,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-full shadow-xl">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-200">水印区域列表</h3>
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-800 text-indigo-400 rounded-full border border-slate-700">
            {regions.length}
          </span>
        </div>

        <button
          onClick={onAddNewRegion}
          className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all flex items-center gap-1 shadow-md shadow-indigo-900/30"
          title="新建默认选区"
        >
          <Plus className="w-3.5 h-3.5" /> 手动添加
        </button>
      </div>

      {/* Quick Watermark Location Presets */}
      <div className="mb-3.5 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
        <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 快捷一键定位常用水印位置:
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => {
              const preset: WatermarkRegion = {
                id: `preset-doubao-${Date.now()}`,
                x: 68,
                y: 89,
                width: 25,
                height: 7,
                label: '右下角豆包AI生成',
                startTime: 0,
                endTime: duration || 10,
                method: 'spatiotemporal',
                feather: 8,
                blurRadius: 4,
                visible: true,
              };
              if (selectedRegionId) {
                const existing = regions.find((r) => r.id === selectedRegionId);
                if (existing) {
                  onUpdateRegion({ ...existing, x: 68, y: 89, width: 25, height: 7, label: '右下角豆包AI生成' });
                  return;
                }
              }
              onUpdateRegion(preset);
            }}
            className="px-2 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/60 hover:border-indigo-500 text-indigo-200 rounded-lg text-[11px] font-medium text-left transition-colors flex items-center gap-1"
          >
            🎯 右下角“豆包AI生成”
          </button>

          <button
            type="button"
            onClick={() => {
              const preset: WatermarkRegion = {
                id: `preset-bc-${Date.now()}`,
                x: 39,
                y: 88,
                width: 22,
                height: 6.5,
                label: '底部居中水印',
                startTime: 0,
                endTime: duration || 10,
                method: 'spatiotemporal',
                feather: 8,
                blurRadius: 4,
                visible: true,
              };
              if (selectedRegionId) {
                const existing = regions.find((r) => r.id === selectedRegionId);
                if (existing) {
                  onUpdateRegion({ ...existing, x: 39, y: 88, width: 22, height: 6.5, label: '底部居中水印' });
                  return;
                }
              }
              onUpdateRegion(preset);
            }}
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-[11px] font-medium text-left transition-colors flex items-center gap-1"
          >
            📍 底部居中水印
          </button>

          <button
            type="button"
            onClick={() => {
              const preset: WatermarkRegion = {
                id: `preset-bl-${Date.now()}`,
                x: 4,
                y: 88,
                width: 22,
                height: 6.5,
                label: '左下角账号/水印',
                startTime: 0,
                endTime: duration || 10,
                method: 'spatiotemporal',
                feather: 8,
                blurRadius: 4,
                visible: true,
              };
              if (selectedRegionId) {
                const existing = regions.find((r) => r.id === selectedRegionId);
                if (existing) {
                  onUpdateRegion({ ...existing, x: 4, y: 88, width: 22, height: 6.5, label: '左下角账号/水印' });
                  return;
                }
              }
              onUpdateRegion(preset);
            }}
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-[11px] font-medium text-left transition-colors flex items-center gap-1"
          >
            📍 左下角水印
          </button>

          <button
            type="button"
            onClick={() => {
              const preset: WatermarkRegion = {
                id: `preset-tr-${Date.now()}`,
                x: 74,
                y: 4,
                width: 20,
                height: 6,
                label: '右上角Logo标识',
                startTime: 0,
                endTime: duration || 10,
                method: 'spatiotemporal',
                feather: 8,
                blurRadius: 4,
                visible: true,
              };
              if (selectedRegionId) {
                const existing = regions.find((r) => r.id === selectedRegionId);
                if (existing) {
                  onUpdateRegion({ ...existing, x: 74, y: 4, width: 20, height: 6, label: '右上角Logo标识' });
                  return;
                }
              }
              onUpdateRegion(preset);
            }}
            className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-[11px] font-medium text-left transition-colors flex items-center gap-1"
          >
            📍 右上角平台标识
          </button>
        </div>
      </div>

      {/* Empty State */}
      {regions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 my-8 border border-dashed border-slate-800 rounded-xl">
          <Square className="w-10 h-10 text-slate-700 mb-3" />
          <p className="text-xs font-medium text-slate-400 mb-1">暂未添加水印选区</p>
          <p className="text-[11px] text-slate-500 max-w-xs">
            您可以在播放器画面上直接拖拽鼠标框选水印，或点击顶部的“AI 智能识别”按钮。
          </p>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] pr-1 custom-scrollbar">
          {regions.map((region, index) => {
            const isSelected = region.id === selectedRegionId;

            return (
              <div
                key={region.id}
                onClick={() => onSelectRegion(region.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/90 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                {/* Region Item Header */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center justify-center border border-indigo-500/30">
                      #{index + 1}
                    </span>
                    <input
                      type="text"
                      value={region.label}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdateRegion({ ...region, label: e.target.value })}
                      className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none focus:border-b focus:border-indigo-500 px-1 py-0.5 rounded w-28"
                    />
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {/* Toggle Visibility */}
                    <button
                      onClick={() => onUpdateRegion({ ...region, visible: !region.visible })}
                      className={`p-1.5 rounded-md text-xs transition-colors ${
                        region.visible ? 'text-indigo-400 hover:bg-indigo-950/50' : 'text-slate-600 hover:text-slate-400'
                      }`}
                      title={region.visible ? '已启用修补' : '已禁用'}
                    >
                      {region.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => onDeleteRegion(region.id)}
                      className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                      title="删除此选区"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Region Details Controls */}
                <div className="space-y-2 text-[11px] text-slate-400" onClick={(e) => e.stopPropagation()}>
                  {/* Algorithm Selector */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 shrink-0">修补模式:</span>
                    <select
                      value={region.method}
                      onChange={(e) =>
                        onUpdateRegion({ ...region, method: e.target.value as InpaintMethod })
                      }
                      className="bg-slate-900 border border-slate-700/80 text-slate-200 text-[11px] rounded px-2 py-1 outline-none focus:border-indigo-500 w-full"
                    >
                      <option value="spatiotemporal">时空邻域边缘平滑 (推荐)</option>
                      <option value="telea">Telea 快速行进流</option>
                      <option value="navier_stokes">Navier-Stokes 流体融合</option>
                      <option value="gaussian_smooth">高斯柔化边缘过渡</option>
                    </select>
                  </div>

                  {/* Feathering Slider */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 shrink-0">边缘羽化过渡:</span>
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="range"
                        min={0}
                        max={30}
                        value={region.feather}
                        onChange={(e) =>
                          onUpdateRegion({ ...region, feather: parseInt(e.target.value) || 0 })
                        }
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-500"
                      />
                      <span className="font-mono text-indigo-400 text-[10px] w-6 text-right">
                        {region.feather}px
                      </span>
                    </div>
                  </div>

                  {/* Border Radius Slider */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 shrink-0">选区边框圆角:</span>
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="range"
                        min={0}
                        max={40}
                        value={region.borderRadius || 0}
                        onChange={(e) =>
                          onUpdateRegion({ ...region, borderRadius: parseInt(e.target.value) || 0 })
                        }
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-500"
                      />
                      <span className="font-mono text-indigo-400 text-[10px] w-6 text-right">
                        {region.borderRadius || 0}px
                      </span>
                    </div>
                  </div>

                  {/* Coordinates Grid (X, Y, W, H) */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800 text-center">
                      <span className="text-[9px] text-slate-500 block">左边距 X (%)</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={region.x}
                        onChange={(e) =>
                          onUpdateRegion({ ...region, x: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full text-center bg-transparent text-slate-200 font-mono focus:outline-none text-xs"
                      />
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800 text-center">
                      <span className="text-[9px] text-slate-500 block">顶边距 Y (%)</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={region.y}
                        onChange={(e) =>
                          onUpdateRegion({ ...region, y: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full text-center bg-transparent text-slate-200 font-mono focus:outline-none text-xs"
                      />
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800 text-center relative group">
                      <span className="text-[9px] text-slate-500 block">宽度 W (%)</span>
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => onUpdateRegion({ ...region, width: Math.max(1, Math.round((region.width - 0.5) * 10) / 10) })}
                          className="text-slate-500 hover:text-indigo-400 px-0.5 text-[10px] font-bold"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          step={0.5}
                          value={region.width}
                          onChange={(e) =>
                            onUpdateRegion({ ...region, width: parseFloat(e.target.value) || 1 })
                          }
                          className="w-full text-center bg-transparent text-slate-200 font-mono focus:outline-none text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => onUpdateRegion({ ...region, width: Math.min(100 - region.x, Math.round((region.width + 0.5) * 10) / 10) })}
                          className="text-slate-500 hover:text-indigo-400 px-0.5 text-[10px] font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800 text-center relative group">
                      <span className="text-[9px] text-slate-500 block">高度 H (%)</span>
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => onUpdateRegion({ ...region, height: Math.max(1, Math.round((region.height - 0.5) * 10) / 10) })}
                          className="text-slate-500 hover:text-indigo-400 px-0.5 text-[10px] font-bold"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          step={0.5}
                          value={region.height}
                          onChange={(e) =>
                            onUpdateRegion({ ...region, height: parseFloat(e.target.value) || 1 })
                          }
                          className="w-full text-center bg-transparent text-slate-200 font-mono focus:outline-none text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => onUpdateRegion({ ...region, height: Math.min(100 - region.y, Math.round((region.height + 0.5) * 10) / 10) })}
                          className="text-slate-500 hover:text-indigo-400 px-0.5 text-[10px] font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Time Range */}
                  <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3 text-indigo-400" /> 生效时间段:
                    </span>
                    <div className="flex items-center gap-1 font-mono">
                      <input
                        type="number"
                        min={0}
                        max={duration || 100}
                        step={0.1}
                        value={region.startTime}
                        onChange={(e) =>
                          onUpdateRegion({ ...region, startTime: parseFloat(e.target.value) || 0 })
                        }
                        className="w-12 bg-slate-900 border border-slate-800 rounded text-center px-1 py-0.5 text-slate-200"
                      />
                      <span>s -</span>
                      <input
                        type="number"
                        min={0}
                        max={duration || 100}
                        step={0.1}
                        value={region.endTime || duration}
                        onChange={(e) =>
                          onUpdateRegion({ ...region, endTime: parseFloat(e.target.value) || duration })
                        }
                        className="w-12 bg-slate-900 border border-slate-800 rounded text-center px-1 py-0.5 text-slate-200"
                      />
                      <span>s</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
