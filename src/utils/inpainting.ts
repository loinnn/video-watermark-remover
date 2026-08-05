import { WatermarkRegion, InpaintMethod } from '../types';

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.beginPath();
  if (radius <= 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  const r = Math.min(radius, w / 2, h / 2);
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

/**
 * Inpaints a single region on an ImageData object or Canvas context
 */
export function inpaintRegion(
  ctx: CanvasRenderingContext2D,
  region: WatermarkRegion,
  canvasWidth: number,
  canvasHeight: number
) {
  const rx = Math.round((region.x / 100) * canvasWidth);
  const ry = Math.round((region.y / 100) * canvasHeight);
  const rw = Math.round((region.width / 100) * canvasWidth);
  const rh = Math.round((region.height / 100) * canvasHeight);

  if (rw <= 0 || rh <= 0 || rx >= canvasWidth || ry >= canvasHeight) return;

  const clampX = Math.max(0, rx);
  const clampY = Math.max(0, ry);
  const clampW = Math.min(canvasWidth - clampX, rw);
  const clampH = Math.min(canvasHeight - clampY, rh);

  if (clampW <= 2 || clampH <= 2) return;

  const feather = Math.max(2, region.feather || 8);
  // Scale border radius based on canvas size (relative to 1000px base video dimension)
  const borderRadiusPx = Math.round((region.borderRadius || 0) * (canvasWidth / 1000));

  // Fast GPU patch inpainting (no getImageData GPU pipeline stalls)
  gpuInpaintRegion(ctx, clampX, clampY, clampW, clampH, feather, borderRadiusPx);
}

/**
 * Fast GPU-accelerated patch inpainting using Canvas2D blend modes and filters.
 * Eliminates CPU readbacks (getImageData) to maintain 60FPS video decoding without micro-stutters.
 */
export function gpuInpaintRegion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  feather: number = 8,
  borderRadius: number = 0
) {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;

  if (w <= 0 || h <= 0 || x >= canvasWidth || y >= canvasHeight) return;

  const clampX = Math.max(0, x);
  const clampY = Math.max(0, y);
  const clampW = Math.min(canvasWidth - clampX, w);
  const clampH = Math.min(canvasHeight - clampY, h);

  if (clampW <= 2 || clampH <= 2) return;

  // Sample border thickness around watermark region
  const bSize = Math.max(6, Math.min(30, Math.round(Math.min(clampW, clampH) * 0.25)));

  const srcTopY = Math.max(0, clampY - bSize);
  const srcTopH = clampY - srcTopY;

  const srcBotY = Math.min(canvasHeight, clampY + clampH);
  const srcBotH = Math.min(bSize, canvasHeight - srcBotY);

  const srcLeftX = Math.max(0, clampX - bSize);
  const srcLeftW = clampX - srcLeftX;

  const srcRightX = Math.min(canvasWidth, clampX + clampW);
  const srcRightW = Math.min(bSize, canvasWidth - srcRightX);

  ctx.save();

  // Clip to the watermark rectangle or rounded rectangle
  drawRoundedRectPath(ctx, clampX, clampY, clampW, clampH, borderRadius);
  ctx.clip();

  // 1. Stretch top surrounding texture down
  if (srcTopH > 0) {
    ctx.globalAlpha = 1.0;
    ctx.drawImage(
      ctx.canvas,
      clampX, srcTopY, clampW, srcTopH,
      clampX, clampY, clampW, clampH * 0.65
    );
  }

  // 2. Blend bottom surrounding texture up
  if (srcBotH > 0) {
    ctx.globalAlpha = srcTopH > 0 ? 0.5 : 1.0;
    ctx.drawImage(
      ctx.canvas,
      clampX, srcBotY, clampW, srcBotH,
      clampX, clampY + clampH * 0.35, clampW, clampH * 0.65
    );
  }

  // 3. Cross-blend left surrounding texture right
  if (srcLeftW > 0) {
    ctx.globalAlpha = 0.5;
    ctx.drawImage(
      ctx.canvas,
      srcLeftX, clampY, srcLeftW, clampH,
      clampX, clampY, clampW * 0.65, clampH
    );
  }

  // 4. Cross-blend right surrounding texture left
  if (srcRightW > 0) {
    ctx.globalAlpha = 0.5;
    ctx.drawImage(
      ctx.canvas,
      srcRightX, clampY, srcRightW, clampH,
      clampX + clampW * 0.35, clampY, clampW * 0.65, clampH
    );
  }

  // 5. In-clip subtle blur to blend texture seams seamlessly
  const blurRadius = Math.min(10, Math.max(2, Math.round(feather / 2)));
  ctx.globalAlpha = 0.85;
  ctx.filter = `blur(${blurRadius}px)`;
  ctx.drawImage(
    ctx.canvas,
    clampX, clampY, clampW, clampH,
    clampX, clampY, clampW, clampH
  );

  ctx.restore();
}

/**
 * Spatiotemporal weighted edge-based bilinear/biharmonic interpolation
 */
function spatiotemporalInpaint(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  tx: number,
  ty: number,
  tw: number,
  th: number,
  borderWidth: number,
  feather: number
) {
  const getPixel = (x: number, y: number) => {
    const px = Math.max(0, Math.min(width - 1, x));
    const py = Math.max(0, Math.min(height - 1, y));
    const idx = (py * width + px) * 4;
    return [pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]];
  };

  const setPixel = (x: number, y: number, r: number, g: number, b: number) => {
    const idx = (y * width + x) * 4;
    pixels[idx] = r;
    pixels[idx + 1] = g;
    pixels[idx + 2] = b;
  };

  // Sample perimeter colors around target box
  for (let py = 0; py < th; py++) {
    const currentY = ty + py;
    const normY = py / th; // 0 to 1

    for (let px = 0; px < tw; px++) {
      const currentX = tx + px;
      const normX = px / tw; // 0 to 1

      // Top boundary pixel sample
      const topPixel = getPixel(currentX, ty - Math.max(1, Math.floor(borderWidth / 2)));
      // Bottom boundary pixel sample
      const bottomPixel = getPixel(currentX, ty + th + Math.max(0, Math.floor(borderWidth / 2)));
      // Left boundary pixel sample
      const leftPixel = getPixel(tx - Math.max(1, Math.floor(borderWidth / 2)), currentY);
      // Right boundary pixel sample
      const rightPixel = getPixel(tx + tw + Math.max(0, Math.floor(borderWidth / 2)), currentY);

      // Distance weights
      const dTop = py + 1;
      const dBottom = th - py;
      const dLeft = px + 1;
      const dRight = tw - px;

      const wTop = 1 / (dTop * dTop);
      const wBottom = 1 / (dBottom * dBottom);
      const wLeft = 1 / (dLeft * dLeft);
      const wRight = 1 / (dRight * dRight);

      const totalWeight = wTop + wBottom + wLeft + wRight;

      // Color interpolation
      const r = Math.round((topPixel[0] * wTop + bottomPixel[0] * wBottom + leftPixel[0] * wLeft + rightPixel[0] * wRight) / totalWeight);
      const g = Math.round((topPixel[1] * wTop + bottomPixel[1] * wBottom + leftPixel[1] * wLeft + rightPixel[1] * wRight) / totalWeight);
      const b = Math.round((topPixel[2] * wTop + bottomPixel[2] * wBottom + leftPixel[2] * wLeft + rightPixel[2] * wRight) / totalWeight);

      // Add subtle luminance noise to prevent plastic artificially smooth look
      const noise = (Math.random() - 0.5) * 3;
      const finalR = Math.max(0, Math.min(255, r + noise));
      const finalG = Math.max(0, Math.min(255, g + noise));
      const finalB = Math.max(0, Math.min(255, b + noise));

      setPixel(currentX, currentY, finalR, finalG, finalB);
    }
  }
}

/**
 * Fast Marching Method (Telea / Navier-Stokes simulation)
 */
function teleaInpaint(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  tx: number,
  ty: number,
  tw: number,
  th: number,
  borderWidth: number,
  feather: number
) {
  // Simple multi-pass inward boundary propagation without object allocations
  const maxPasses = 3;
  const dx = [-1, 1, 0, 0, -1, 1, -1, 1];
  const dy = [0, 0, -1, 1, -1, -1, 1, 1];
  const weights = [1.0, 1.0, 1.0, 1.0, 0.707, 0.707, 0.707, 0.707];

  for (let pass = 0; pass < maxPasses; pass++) {
    for (let py = 0; py < th; py++) {
      const cy = ty + py;
      for (let px = 0; px < tw; px++) {
        const cx = tx + px;
        const idx = (cy * width + cx) * 4;

        let sumR = 0, sumG = 0, sumB = 0, count = 0;

        for (let k = 0; k < 8; k++) {
          const nx = cx + dx[k];
          const ny = cy + dy[k];

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const isInsideTarget = nx >= tx && nx < tx + tw && ny >= ty && ny < ty + th;
            if (!isInsideTarget || pass > 0) {
              const nIdx = (ny * width + nx) * 4;
              const distWeight = weights[k];
              sumR += pixels[nIdx] * distWeight;
              sumG += pixels[nIdx + 1] * distWeight;
              sumB += pixels[nIdx + 2] * distWeight;
              count += distWeight;
            }
          }
        }

        if (count > 0) {
          pixels[idx] = Math.round(sumR / count);
          pixels[idx + 1] = Math.round(sumG / count);
          pixels[idx + 2] = Math.round(sumB / count);
        }
      }
    }
  }
}

/**
 * Gaussian smooth edge-filling with box blur
 */
function gaussianSmoothInpaint(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  tx: number,
  ty: number,
  tw: number,
  th: number,
  borderWidth: number,
  feather: number
) {
  spatiotemporalInpaint(pixels, width, height, tx, ty, tw, th, borderWidth, feather);
}

let cachedOffCanvas: HTMLCanvasElement | null = null;

/**
 * Applies a smooth radial feathering filter around the watermark border to erase harsh edge seams
 */
function applyEdgeFeathering(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  feather: number
) {
  if (feather <= 0) return;
  const pad = 4;
  const sx = Math.max(0, x - pad);
  const sy = Math.max(0, y - pad);
  const sw = Math.min(ctx.canvas.width - sx, w + pad * 2);
  const sh = Math.min(ctx.canvas.height - sy, h + pad * 2);

  if (sw <= 0 || sh <= 0) return;

  if (!cachedOffCanvas) {
    cachedOffCanvas = document.createElement('canvas');
  }
  if (cachedOffCanvas.width < sw || cachedOffCanvas.height < sh) {
    cachedOffCanvas.width = Math.max(cachedOffCanvas.width, sw + 64);
    cachedOffCanvas.height = Math.max(cachedOffCanvas.height, sh + 64);
  }

  const offCtx = cachedOffCanvas.getContext('2d');
  if (!offCtx) return;

  offCtx.clearRect(0, 0, sw, sh);
  offCtx.drawImage(ctx.canvas, sx, sy, sw, sh, 0, 0, sw, sh);

  ctx.save();
  ctx.filter = `blur(${Math.min(8, Math.max(1, Math.round(feather / 2)))}px)`;
  ctx.drawImage(cachedOffCanvas, 0, 0, sw, sh, sx, sy, sw, sh);
  ctx.restore();
}

/**
 * Processes a full frame on canvas context, removing all active watermark regions
 */
export function processCanvasFrame(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  regions: WatermarkRegion[],
  currentTime: number
) {
  // Filter regions active at current timestamp
  const activeRegions = regions.filter((r) => {
    if (!r.visible) return false;
    const start = r.startTime || 0;
    const end = r.endTime && r.endTime > 0 ? r.endTime : Infinity;
    return currentTime >= start && currentTime <= end;
  });

  for (const region of activeRegions) {
    inpaintRegion(ctx, region, canvasWidth, canvasHeight);
  }
}
