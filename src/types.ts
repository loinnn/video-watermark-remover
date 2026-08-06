export type InpaintMethod = 
  | 'spatiotemporal' 
  | 'telea' 
  | 'navier_stokes' 
  | 'gaussian_smooth' 
  | 'pixel_interpolate';

export interface WatermarkRegion {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  label: string;
  startTime: number; // seconds
  endTime: number; // seconds (0 means end of video)
  method: InpaintMethod;
  feather: number; // pixels (0-30)
  blurRadius: number; // pixels (0-20)
  borderRadius?: number; // pixels (0-50)
  visible: boolean;
  color?: string;
}

export interface VideoInfo {
  file?: File;
  url: string;
  name: string;
  size: number;
  duration: number;
  width: number;
  height: number;
  fps: number;
  mediaType?: 'video' | 'image';
}

export interface ExportConfig {
  fps: number;
  quality: 'high' | 'medium' | 'low';
  format: 'webm' | 'mp4' | 'png' | 'jpg' | 'webp';
}

export interface ProcessingProgress {
  isProcessing: boolean;
  currentFrame: number;
  totalFrames: number;
  percent: number;
  etaSeconds: number;
  renderedBlobUrl: string | null;
  error?: string;
}
