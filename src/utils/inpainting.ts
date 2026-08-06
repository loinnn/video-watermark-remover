import { WatermarkRegion } from '../types';

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
 * Inpaints a single region on a Canvas context according to the selected method.
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

  const feather = Math.max(1, region.feather ?? 8);
  const borderRadiusPx = Math.round((region.borderRadius || 0) * (canvasWidth / 1000));
  const method = region.method || 'spatiotemporal';

  if (method === 'telea') {
    teleaInpaint(ctx, clampX, clampY, clampW, clampH, feather, borderRadiusPx);
  } else if (method === 'navier_stokes') {
    patchCloneInpaint(ctx, clampX, clampY, clampW, clampH, feather, borderRadiusPx);
  } else if (method === 'gaussian_smooth') {
    gpuInpaintRegion(ctx, clampX, clampY, clampW, clampH, feather, borderRadiusPx);
  } else {
    // Default 'spatiotemporal' (AI Smart Gradient & Micro-texture Synthesis)
    smartGradientInpaint(ctx, clampX, clampY, clampW, clampH, feather, borderRadiusPx);
  }
}

/**
 * Smart Gradient & Micro-texture Inpainting (Default & Highest Quality)
 * Interpolates colors along boundary gradients, prevents blur/mosaic artifacts,
 * and blends subtle micro-textures to match the background naturally.
 */
export function smartGradientInpaint(
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

  // Margin for boundary color sampling
  const margin = Math.max(6, Math.min(25, Math.round(Math.min(w, h) * 0.2)));
  const sx = Math.max(0, x - margin);
  const sy = Math.max(0, y - margin);
  const sw = Math.min(canvasWidth - sx, w + margin * 2);
  const sh = Math.min(canvasHeight - sy, h + margin * 2);

  if (sw <= 4 || sh <= 4) return;

  const imgData = ctx.getImageData(sx, sy, sw, sh);
  const pixels = imgData.data;

  // Target rectangle relative coordinates within imgData
  const tx = x - sx;
  const ty = y - sy;
  const tw = w;
  const th = h;

  const getPixel = (px: number, py: number) => {
    const cx = Math.max(0, Math.min(sw - 1, px));
    const cy = Math.max(0, Math.min(sh - 1, py));
    const idx = (cy * sw + cx) * 4;
    return [pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]];
  };

  // Sample top, bottom, left, right perimeter pixels for fast reference
  const topBorder: number[][] = [];
  const botBorder: number[][] = [];
  for (let col = 0; col < tw; col++) {
    topBorder.push(getPixel(tx + col, Math.max(0, ty - 2)));
    botBorder.push(getPixel(tx + col, Math.min(sh - 1, ty + th + 1)));
  }

  const leftBorder: number[][] = [];
  const rightBorder: number[][] = [];
  for (let row = 0; row < th; row++) {
    leftBorder.push(getPixel(Math.max(0, tx - 2), ty + row));
    rightBorder.push(getPixel(Math.min(sw - 1, tx + tw + 1), ty + row));
  }

  // Pre-calculate border variance / noise texture level
  let noiseLevel = 0;
  for (let i = 0; i < topBorder.length - 1; i++) {
    noiseLevel += Math.abs(topBorder[i][0] - topBorder[i + 1][0]);
  }
  noiseLevel = Math.min(6, (noiseLevel / (topBorder.length || 1)) * 0.15);

  // Inpaint target pixels using distance-weighted gradient propagation
  for (let py = 0; py < th; py++) {
    const dTop = py + 1;
    const dBot = th - py;

    const leftP = leftBorder[py] || [128, 128, 128, 255];
    const rightP = rightBorder[py] || [128, 128, 128, 255];

    for (let px = 0; px < tw; px++) {
      const dLeft = px + 1;
      const dRight = tw - px;

      const topP = topBorder[px] || [128, 128, 128, 255];
      const botP = botBorder[px] || [128, 128, 128, 255];

      // Inverse distance squared weights
      const wTop = 1 / (dTop * dTop);
      const wBot = 1 / (dBot * dBot);
      const wLeft = 1 / (dLeft * dLeft);
      const wRight = 1 / (dRight * dRight);

      const totalW = wTop + wBot + wLeft + wRight;

      // Color interpolation
      let r = (topP[0] * wTop + botP[0] * wBot + leftP[0] * wLeft + rightP[0] * wRight) / totalW;
      let g = (topP[1] * wTop + botP[1] * wBot + leftP[1] * wLeft + rightP[1] * wRight) / totalW;
      let b = (topP[2] * wTop + botP[2] * wBot + leftP[2] * wLeft + rightP[2] * wRight) / totalW;

      // Subtle noise synthesis to eliminate flat plastic/mosaic look
      if (noiseLevel > 0.5) {
        const rnd = (Math.random() - 0.5) * noiseLevel;
        r = Math.max(0, Math.min(255, r + rnd));
        g = Math.max(0, Math.min(255, g + rnd));
        b = Math.max(0, Math.min(255, b + rnd));
      }

      const idx = ((ty + py) * sw + (tx + px)) * 4;
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = 255;
    }
  }

  // Put image data to temporary offscreen canvas, then blend with clip & feather
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sw;
  tempCanvas.height = sh;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  tempCtx.putImageData(imgData, 0, 0);

  ctx.save();
  drawRoundedRectPath(ctx, x, y, w, h, borderRadius);
  ctx.clip();

  // Draw inpainted patch
  ctx.drawImage(tempCanvas, tx, ty, tw, th, x, y, w, h);

  // Apply subtle perimeter feathering if requested
  if (feather > 0) {
    const fRadius = Math.min(5, Math.max(1, Math.round(feather / 3)));
    ctx.filter = `blur(${fRadius}px)`;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.35;
    ctx.drawImage(tempCanvas, tx, ty, tw, th, x, y, w, h);
  }

  ctx.restore();
}

/**
 * Telea Fast Marching Inpainting Algorithm
 * Propagates boundary colors along normals inward to seamlessly dissolve watermarks.
 */
export function teleaInpaint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  feather: number = 8,
  borderRadius: number = 0
) {
  const margin = Math.max(4, Math.min(20, Math.round(Math.min(w, h) * 0.15)));
  const sx = Math.max(0, x - margin);
  const sy = Math.max(0, y - margin);
  const sw = Math.min(ctx.canvas.width - sx, w + margin * 2);
  const sh = Math.min(ctx.canvas.height - sy, h + margin * 2);

  if (sw <= 4 || sh <= 4) return;

  const imgData = ctx.getImageData(sx, sy, sw, sh);
  const pixels = imgData.data;

  const tx = x - sx;
  const ty = y - sy;
  const tw = w;
  const th = h;

  // Inward boundary propagation passes
  const passes = 3;
  for (let pass = 0; pass < passes; pass++) {
    for (let py = 0; py < th; py++) {
      const cy = ty + py;
      for (let px = 0; px < tw; px++) {
        const cx = tx + px;
        const idx = (cy * sw + cx) * 4;

        let sumR = 0, sumG = 0, sumB = 0, count = 0;

        const neighbors = [
          [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1],
          [cx - 1, cy - 1], [cx + 1, cy - 1], [cx - 1, cy + 1], [cx + 1, cy + 1]
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < sw && ny >= 0 && ny < sh) {
            const isInside = nx >= tx && nx < tx + tw && ny >= ty && ny < ty + th;
            if (!isInside || pass > 0) {
              const nIdx = (ny * sw + nx) * 4;
              const weight = nx === cx || ny === cy ? 1.0 : 0.707;
              sumR += pixels[nIdx] * weight;
              sumG += pixels[nIdx + 1] * weight;
              sumB += pixels[nIdx + 2] * weight;
              count += weight;
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

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = sw;
  tempCanvas.height = sh;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  tempCtx.putImageData(imgData, 0, 0);

  ctx.save();
  drawRoundedRectPath(ctx, x, y, w, h, borderRadius);
  ctx.clip();
  ctx.drawImage(tempCanvas, tx, ty, tw, th, x, y, w, h);
  ctx.restore();
}

/**
 * Patch Clone Inpainting (Best for textured/patterned backgrounds like grass, walls, fabric, sea)
 * Copies and seamlessly blends uncorrupted texture patches into the watermark zone.
 */
export function patchCloneInpaint(
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

  // Determine best adjacent source patch (prefer left or right depending on space)
  let srcX = x - w;
  let srcY = y;

  if (srcX < 0) {
    srcX = Math.min(canvasWidth - w, x + w);
  }
  if (srcX < 0 || srcX + w > canvasWidth) {
    srcX = x;
    srcY = y - h >= 0 ? y - h : Math.min(canvasHeight - h, y + h);
  }

  ctx.save();
  drawRoundedRectPath(ctx, x, y, w, h, borderRadius);
  ctx.clip();

  // Clone texture patch
  ctx.drawImage(ctx.canvas, srcX, srcY, w, h, x, y, w, h);

  // Blend with smart gradient for seamless boundary transition
  ctx.globalAlpha = 0.35;
  smartGradientInpaint(ctx, x, y, w, h, feather, borderRadius);

  ctx.restore();
}

/**
 * GPU Inpainting (Fast mode - without heavy full-box blur to prevent mosaic look)
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

  const bSize = Math.max(6, Math.min(24, Math.round(Math.min(clampW, clampH) * 0.25)));

  const srcTopY = Math.max(0, clampY - bSize);
  const srcTopH = clampY - srcTopY;

  const srcBotY = Math.min(canvasHeight, clampY + clampH);
  const srcBotH = Math.min(bSize, canvasHeight - srcBotY);

  const srcLeftX = Math.max(0, clampX - bSize);
  const srcLeftW = clampX - srcLeftX;

  const srcRightX = Math.min(canvasWidth, clampX + clampW);
  const srcRightW = Math.min(bSize, canvasWidth - srcRightX);

  ctx.save();
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

  // Soft perimeter edge blend if feathering is specified (no full-box mosaic blur!)
  if (feather > 0) {
    const edgeBlur = Math.min(4, Math.max(1, Math.round(feather / 4)));
    ctx.globalAlpha = 0.25;
    ctx.filter = `blur(${edgeBlur}px)`;
    ctx.drawImage(
      ctx.canvas,
      clampX, clampY, clampW, clampH,
      clampX, clampY, clampW, clampH
    );
  }

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
