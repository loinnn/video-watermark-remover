import { WatermarkRegion, ExportConfig, ProcessingProgress } from '../types';
import { processCanvasFrame } from './inpainting';

/**
 * Patches MP4 / WebM container metadata to write exact video duration into header atoms.
 * Guarantees Windows File Explorer and media players display exact total duration.
 */
export async function fixVideoMetadata(blob: Blob, durationSec: number): Promise<Blob> {
  if (!durationSec || durationSec <= 0) return blob;

  try {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const isMp4 = checkIsMp4(bytes);

    if (isMp4) {
      return fixMp4Duration(buffer, bytes, durationSec, blob.type);
    } else {
      return fixWebmDuration(buffer, bytes, durationSec, blob.type);
    }
  } catch (err) {
    console.warn('Metadata duration patching warning:', err);
    return blob;
  }
}

function checkIsMp4(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    return true; // 'ftyp'
  }
  for (let i = 0; i < Math.min(bytes.length - 4, 4000); i++) {
    if (bytes[i] === 0x6d && bytes[i + 1] === 0x6f && bytes[i + 2] === 0x6f && bytes[i + 3] === 0x76) {
      return true; // 'moov'
    }
  }
  return false;
}

/**
 * Parses ISOBMFF box hierarchy (moov, trak, mdia) and patches mvhd, tkhd, mdhd, mehd durations
 * using exact movie and media timescales to prevent video playback truncation or early looping.
 */
function fixMp4Duration(buffer: ArrayBuffer, bytes: Uint8Array, durationSec: number, mimeType: string): Blob {
  const dataView = new DataView(buffer);
  let movieTimescale = 1000;

  function parseBoxes(start: number, end: number) {
    let pos = start;
    while (pos + 8 <= end) {
      let boxSize = dataView.getUint32(pos, false);
      const boxType = String.fromCharCode(
        bytes[pos + 4],
        bytes[pos + 5],
        bytes[pos + 6],
        bytes[pos + 7]
      );

      if (boxSize === 0) {
        boxSize = end - pos;
      } else if (boxSize === 1 && pos + 16 <= end) {
        if (typeof dataView.getBigUint64 === 'function') {
          boxSize = Number(dataView.getBigUint64(pos + 8, false));
        } else {
          break;
        }
      }

      if (boxSize < 8 || pos + boxSize > end) {
        break;
      }

      const boxEnd = pos + boxSize;

      // Recurse into container boxes
      if (boxType === 'moov' || boxType === 'trak' || boxType === 'mdia' || boxType === 'minf') {
        parseBoxes(pos + 8, boxEnd);
      } else if (boxType === 'mvhd') {
        const version = bytes[pos + 8];
        if (version === 0 && pos + 28 <= boxEnd) {
          movieTimescale = dataView.getUint32(pos + 20, false) || 1000;
          const targetDuration = Math.round(durationSec * movieTimescale);
          dataView.setUint32(pos + 24, targetDuration, false);
        } else if (version === 1 && pos + 40 <= boxEnd) {
          movieTimescale = dataView.getUint32(pos + 28, false) || 1000;
          const targetDuration = BigInt(Math.round(durationSec * movieTimescale));
          if (typeof dataView.setBigUint64 === 'function') {
            dataView.setBigUint64(pos + 32, targetDuration, false);
          }
        }
      } else if (boxType === 'tkhd') {
        const version = bytes[pos + 8];
        if (version === 0 && pos + 32 <= boxEnd) {
          const targetDuration = Math.round(durationSec * movieTimescale);
          dataView.setUint32(pos + 28, targetDuration, false);
        } else if (version === 1 && pos + 44 <= boxEnd) {
          const targetDuration = BigInt(Math.round(durationSec * movieTimescale));
          if (typeof dataView.setBigUint64 === 'function') {
            dataView.setBigUint64(pos + 36, targetDuration, false);
          }
        }
      } else if (boxType === 'mdhd') {
        const version = bytes[pos + 8];
        if (version === 0 && pos + 28 <= boxEnd) {
          const mediaTimescale = dataView.getUint32(pos + 20, false) || 1000;
          const targetDuration = Math.round(durationSec * mediaTimescale);
          dataView.setUint32(pos + 24, targetDuration, false);
        } else if (version === 1 && pos + 40 <= boxEnd) {
          const mediaTimescale = dataView.getUint32(pos + 28, false) || 1000;
          const targetDuration = BigInt(Math.round(durationSec * mediaTimescale));
          if (typeof dataView.setBigUint64 === 'function') {
            dataView.setBigUint64(pos + 32, targetDuration, false);
          }
        }
      } else if (boxType === 'mehd') {
        const version = bytes[pos + 8];
        if (version === 0 && pos + 16 <= boxEnd) {
          const targetDuration = Math.round(durationSec * movieTimescale);
          dataView.setUint32(pos + 12, targetDuration, false);
        } else if (version === 1 && pos + 20 <= boxEnd) {
          const targetDuration = BigInt(Math.round(durationSec * movieTimescale));
          if (typeof dataView.setBigUint64 === 'function') {
            dataView.setBigUint64(pos + 12, targetDuration, false);
          }
        }
      }

      pos += boxSize;
    }
  }

  try {
    parseBoxes(0, bytes.length);
  } catch (err) {
    console.warn('ISOBMFF box parsing exception:', err);
  }

  return new Blob([buffer], { type: mimeType || 'video/mp4' });
}

function fixWebmDuration(buffer: ArrayBuffer, bytes: Uint8Array, durationSec: number, mimeType: string): Blob {
  const durationMs = durationSec * 1000;
  const infoHeader = [0x15, 0x49, 0xa9, 0x66];
  let infoPos = -1;

  for (let i = 0; i < Math.min(bytes.length - 4, 5000); i++) {
    if (
      bytes[i] === infoHeader[0] &&
      bytes[i + 1] === infoHeader[1] &&
      bytes[i + 2] === infoHeader[2] &&
      bytes[i + 3] === infoHeader[3]
    ) {
      infoPos = i;
      break;
    }
  }

  if (infoPos === -1) return new Blob([buffer], { type: mimeType || 'video/webm' });

  let timecodeScale = 1000000;
  const tcHeader = [0x2a, 0xd7, 0xb1];
  for (let i = infoPos; i < Math.min(bytes.length - 8, infoPos + 300); i++) {
    if (
      bytes[i] === tcHeader[0] &&
      bytes[i + 1] === tcHeader[1] &&
      bytes[i + 2] === tcHeader[2]
    ) {
      const len = bytes[i + 3] & 0x7f;
      let val = 0;
      for (let j = 0; j < len; j++) {
        val = (val << 8) | bytes[i + 4 + j];
      }
      if (val > 0) timecodeScale = val;
      break;
    }
  }

  const durationInTc = (durationMs * 1000000) / timecodeScale;

  const durHeader = [0x44, 0x89];
  let durPos = -1;
  for (let i = infoPos; i < Math.min(bytes.length - 10, infoPos + 300); i++) {
    if (bytes[i] === durHeader[0] && bytes[i + 1] === durHeader[1]) {
      durPos = i;
      break;
    }
  }

  if (durPos !== -1) {
    const view = new DataView(buffer, durPos + 3, 8);
    view.setFloat64(0, durationInTc, false);
    return new Blob([buffer], { type: mimeType || 'video/webm' });
  }

  const floatBuffer = new ArrayBuffer(8);
  new DataView(floatBuffer).setFloat64(0, durationInTc, false);
  const floatBytes = new Uint8Array(floatBuffer);

  const durTag = new Uint8Array([0x44, 0x89, 0x88, ...floatBytes]);

  const insertPos = infoPos + 12;
  const newBytes = new Uint8Array(bytes.length + durTag.length);
  newBytes.set(bytes.subarray(0, insertPos), 0);
  newBytes.set(durTag, insertPos);
  newBytes.set(bytes.subarray(insertPos), insertPos + durTag.length);

  return new Blob([newBytes.buffer], { type: mimeType || 'video/webm' });
}

export class VideoExporter {
  private videoUrl: string;
  private regions: WatermarkRegion[];
  private config: ExportConfig;
  private onProgress: (progress: ProcessingProgress) => void;
  private isCancelled: boolean = false;

  constructor(
    videoUrl: string,
    regions: WatermarkRegion[],
    config: ExportConfig,
    onProgress: (progress: ProcessingProgress) => void
  ) {
    this.videoUrl = videoUrl;
    this.regions = regions;
    this.config = config;
    this.onProgress = onProgress;
  }

  public cancel() {
    this.isCancelled = true;
  }

  public async exportVideo(): Promise<string> {
    this.isCancelled = false;

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.src = this.videoUrl;
      video.muted = true;
      video.crossOrigin = 'anonymous';
      video.playsInline = true;

      video.onloadedmetadata = async () => {
        try {
          // Ensure video frames are sufficiently buffered to prevent playback stutter
          if (video.readyState < 3) {
            await new Promise<void>((res) => {
              const onCanPlay = () => {
                video.removeEventListener('canplaythrough', onCanPlay);
                res();
              };
              video.addEventListener('canplaythrough', onCanPlay);
              setTimeout(res, 1000); // safety fallback timeout
            });
          }

          const duration = video.duration || 1;
          const fps = this.config.fps || 30;
          const totalFrames = Math.max(1, Math.floor(duration * fps));
          const width = video.videoWidth || 1280;
          const height = video.videoHeight || 720;

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (!ctx) {
            reject(new Error('Failed to create 2D canvas context'));
            return;
          }

          // Determine supported MIME type
          const mp4MimeTypes = [
            'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
            'video/mp4;codecs=avc1',
            'video/mp4;codecs=h264',
            'video/mp4',
          ];

          let mimeType = '';
          if (this.config.format === 'mp4' || !this.config.format) {
            for (const type of mp4MimeTypes) {
              if (MediaRecorder.isTypeSupported(type)) {
                mimeType = type;
                break;
              }
            }
          }

          if (!mimeType) {
            const fallbackTypes = [
              'video/webm;codecs=vp9',
              'video/webm;codecs=vp8',
              'video/webm',
            ];
            for (const type of fallbackTypes) {
              if (MediaRecorder.isTypeSupported(type)) {
                mimeType = type;
                break;
              }
            }
          }

          // Capture audio directly from video element in real-time sync
          let audioTrack: MediaStreamTrack | null = null;
          let audioCtx: AudioContext | null = null;

          try {
            video.muted = false;
            video.volume = 1.0;
            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtxClass) {
              audioCtx = new AudioCtxClass();
              const sourceNode = audioCtx.createMediaElementSource(video);
              const destNode = audioCtx.createMediaStreamDestination();
              sourceNode.connect(destNode);
              const tracks = destNode.stream.getAudioTracks();
              if (tracks.length > 0) {
                audioTrack = tracks[0];
              }
            }
          } catch (audioErr) {
            console.warn('Audio stream capture fallback:', audioErr);
          }

          const stream = canvas.captureStream(fps);
          if (audioTrack) {
            stream.addTrack(audioTrack);
          }

          let mediaRecorder: MediaRecorder;
          try {
            mediaRecorder = mimeType
              ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 })
              : new MediaRecorder(stream);
          } catch (e) {
            mediaRecorder = new MediaRecorder(stream);
          }

          const cleanupAudio = () => {
            if (audioCtx) {
              try { audioCtx.close(); } catch (_) {}
            }
          };

          const chunks: Blob[] = [];
          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          mediaRecorder.onstop = async () => {
            cleanupAudio();
            if (this.isCancelled) {
              reject(new Error('Export cancelled by user'));
              return;
            }
            const activeMime = mediaRecorder.mimeType || mimeType || 'video/mp4';
            const rawBlob = new Blob(chunks, { type: activeMime.includes('mp4') ? activeMime : 'video/mp4' });

            // Fix duration metadata in container headers
            const fixedBlob = await fixVideoMetadata(rawBlob, duration);
            const renderedUrl = URL.createObjectURL(fixedBlob);
            this.onProgress({
              isProcessing: false,
              currentFrame: totalFrames,
              totalFrames,
              percent: 100,
              etaSeconds: 0,
              renderedBlobUrl: renderedUrl,
            });
            resolve(renderedUrl);
          };

          // Reset video position & speed
          video.currentTime = 0;
          video.playbackRate = 1.0;

          if (audioCtx && audioCtx.state === 'suspended') {
            await audioCtx.resume();
          }

          // Start MediaRecorder
          mediaRecorder.start(100);

          let animFrameId: number | null = null;
          let isFinished = false;

          const cancelScheduledFrame = () => {
            if (animFrameId !== null) {
              cancelAnimationFrame(animFrameId);
              animFrameId = null;
            }
          };

          const finishExport = () => {
            if (isFinished) return;
            isFinished = true;

            cancelScheduledFrame();
            video.pause();
            video.removeEventListener('ended', finishExport);

            if (mediaRecorder.state !== 'inactive') {
              try {
                mediaRecorder.requestData();
              } catch (_) {}
              setTimeout(() => {
                if (mediaRecorder.state !== 'inactive') {
                  try {
                    mediaRecorder.stop();
                  } catch (_) {}
                }
              }, 150);
            }
          };

          video.addEventListener('ended', finishExport);
          video.addEventListener('pause', () => {
            if (video.currentTime >= duration - 0.25) {
              finishExport();
            }
          });

          // Safety timeout to guarantee completion even if playback stalls
          const maxSafetyTimer = setTimeout(() => {
            if (!isFinished) {
              console.warn('Export safety timeout reached, forcing completion');
              finishExport();
            }
          }, Math.ceil((duration + 3) * 1000));

          let lastPos = -1;
          let stuckCount = 0;

          const renderLoop = () => {
            if (this.isCancelled) {
              clearTimeout(maxSafetyTimer);
              cancelScheduledFrame();
              video.pause();
              if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
              return;
            }

            if (isFinished) return;

            const currentPos = video.currentTime;

            // Draw video frame & perform fast GPU watermark inpainting
            ctx.drawImage(video, 0, 0, width, height);
            processCanvasFrame(ctx, width, height, this.regions, currentPos);

            const percent = Math.min(99, Math.round((currentPos / duration) * 100));
            const remainingSeconds = Math.max(0, Math.ceil(duration - currentPos));

            this.onProgress({
              isProcessing: true,
              currentFrame: Math.min(totalFrames, Math.round(currentPos * fps)),
              totalFrames,
              percent,
              etaSeconds: remainingSeconds,
              renderedBlobUrl: null,
            });

            // End condition checks
            if (video.ended || currentPos >= duration - 0.08 || (video.paused && currentPos >= duration - 0.3)) {
              clearTimeout(maxSafetyTimer);
              finishExport();
              return;
            }

            // Check if stuck near the end of video
            if (currentPos >= duration - 0.4 && Math.abs(currentPos - lastPos) < 0.001) {
              stuckCount++;
              if (stuckCount >= 4) {
                clearTimeout(maxSafetyTimer);
                finishExport();
                return;
              }
            } else {
              stuckCount = 0;
            }
            lastPos = currentPos;

            animFrameId = requestAnimationFrame(renderLoop);
          };

          // Start video playback & rendering loop
          await video.play().catch((err) => {
            console.warn('Realtime video playback start:', err);
          });

          animFrameId = requestAnimationFrame(renderLoop);
        } catch (err: any) {
          reject(err);
        }
      };

      video.onerror = () => {
        reject(new Error('Failed to load video for export rendering'));
      };
    });
  }
}



