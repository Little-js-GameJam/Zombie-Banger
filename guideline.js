import * as LJS from "littlejsengine";

import { Objects } from "./Objects.js";
import { rayRecHit } from "./player.js";

// Look and feel. Tweak these to taste.
const GUIDELINE_WIDTH = 0.2; // line thickness in world units
const GUIDELINE_MAX_ALPHA = 0.8; // opacity at the player
const GUIDELINE_FADE_POWER = 1.5; // 1 = linear fade, higher = fades faster
const GUIDELINE_GRADIENT_STOPS = 8; // smoothness of non-linear fades
const GUIDELINE_MAX_SEGMENTS = 64; // safety cap against infinite bounce loops

// Opacity at a given distance along the whole path.
function alphaAt(distance, totalDistance) {
  const fade = Math.max(0, 1 - distance / totalDistance);
  return GUIDELINE_MAX_ALPHA * Math.pow(fade, GUIDELINE_FADE_POWER);
}

// Aiming guideline: a white line that follows the ricochet path for a fixed
// total distance (no matter how many bounces that takes) and fades out
// smoothly over the whole path.
export class Guideline {
  // Each segment: { start, end, startDist, length }
  segments = [];
  
  totalDistance = 0;

  // Rebuild the path. Call once per frame.
  update(start, direction, maxDistance) {
    this.segments.length = 0;
    this.totalDistance = maxDistance;

    let dir = direction.normalize();
    let pos = start; // where the next ray starts
    let drawFrom = start; // where the next segment is drawn from
    let remaining = maxDistance;
    let travelled = 0;

    for (let i = 0; i < GUIDELINE_MAX_SEGMENTS && remaining > 0; i++) {
      let nearestHit = null;
      let nearestDistance = Infinity;

      for (const rect of Objects) {
        const hit = rayRecHit(pos, dir, rect);

        if (!hit || !hit.normal) continue;

        if (hit.distance > 1e-4 && hit.distance < nearestDistance) {
          nearestDistance = hit.distance;
          nearestHit = hit;
        }
      }

      // Nothing hit within the remaining distance: draw the rest and stop.
      if (!nearestHit || nearestDistance >= remaining) {
        this.segments.push({
          start: drawFrom,
          end: pos.add(dir.scale(remaining)),
          startDist: travelled,
          length: remaining,
        });

        return;
      }

      // Draw up to the wall.
      this.segments.push({
        start: drawFrom,
        end: nearestHit.point,
        startDist: travelled,
        length: nearestDistance,
      });

      travelled += nearestDistance;
      remaining -= nearestDistance;

      // Reflect and continue from just off the wall.
      dir = dir
        .subtract(nearestHit.normal.scale(2 * dir.dot(nearestHit.normal)))
        .normalize();

      drawFrom = nearestHit.point;
      pos = nearestHit.point.add(nearestHit.normal.scale(0.01));
    }
  }

  // Fallback for when the engine doesn't expose a 2D canvas context:
  // many short LittleJS lines with decreasing alpha (looks smooth at this
  // step size, but costs more draw calls).
  renderChunked() {
    const step = 2;
    const color = new LJS.Color(1, 1, 1, 1);

    for (const seg of this.segments) {
      const steps = Math.max(1, Math.ceil(seg.length / step));

      for (let i = 0; i < steps; i++) {
        const t0 = i / steps;
        const t1 = (i + 1) / steps;

        const dist = seg.startDist + seg.length * ((t0 + t1) / 2);
        color.a = alphaAt(dist, this.totalDistance);

        LJS.drawLine(
          seg.start.lerp(seg.end, t0),
          seg.start.lerp(seg.end, t1),
          GUIDELINE_WIDTH,
          color,
        );
      }
    }
  }

  render() {
    if (this.totalDistance <= 0 || this.segments.length === 0) return;

    // Prefer the overlay canvas (always on top, real canvas gradients).
    // Fall back to the main canvas, then to plain LittleJS lines.
    const ctx = LJS.overlayContext ?? LJS.mainContext;

    if (!ctx) {
      this.renderChunked();
      return;
    }

    ctx.save();
    ctx.lineWidth = Math.max(1, GUIDELINE_WIDTH * LJS.cameraScale);
    ctx.lineCap = "butt";

    for (const seg of this.segments) {
      const a = LJS.worldToScreen(seg.start);
      const b = LJS.worldToScreen(seg.end);

      // One gradient per segment. Alpha is computed from the distance along
      // the WHOLE path, so it matches up perfectly at every bounce.
      const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);

      for (let i = 0; i <= GUIDELINE_GRADIENT_STOPS; i++) {
        const t = i / GUIDELINE_GRADIENT_STOPS;
        const distance = seg.startDist + seg.length * t;
        const alpha = alphaAt(distance, this.totalDistance);

        gradient.addColorStop(t, `rgba(255, 255, 255, ${alpha})`);
      }

      ctx.strokeStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    ctx.restore();
  }
}
