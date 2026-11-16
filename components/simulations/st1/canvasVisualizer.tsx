"use client";

import { useCallback, useEffect, useRef } from "react";
import type { BarPlotSpec, CurvePlotSpec, PlotSpec } from "./types";

interface CanvasVisualizerProps {
  spec: PlotSpec;
  ariaLabel: string;
}

interface Palette {
  maroon: string;
  ink: string;
  muted: string;
  grid: string;
  baseline: string;
  bar: string;
  serif: string;
  sans: string;
}

const FALLBACK: Palette = {
  maroon: "#5A1626",
  ink: "#2A1A1D",
  muted: "#7A6A66",
  grid: "#EFE6D6",
  baseline: "#B9A88F",
  bar: "#E4D6BE",
  serif: 'Iowan Old Style, "Palatino Linotype", Palatino, Georgia, serif',
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
};

function readPalette(el: HTMLElement): Palette {
  const cs = getComputedStyle(el);
  const get = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
  return {
    maroon: get("--st1-maroon", FALLBACK.maroon),
    ink: get("--st1-ink", FALLBACK.ink),
    muted: get("--st1-muted", FALLBACK.muted),
    grid: get("--st1-grid", FALLBACK.grid),
    baseline: get("--st1-baseline", FALLBACK.baseline),
    bar: get("--st1-bar", FALLBACK.bar),
    serif: get("--st1-serif", FALLBACK.serif),
    sans: get("--st1-sans", FALLBACK.sans),
  };
}

function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return hexToRgba(FALLBACK.maroon, alpha);
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** "Nice" tick step for a range so that about `target` ticks fit. */
function niceStep(range: number, target: number): number {
  const raw = range / Math.max(1, target);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
  return nice * mag;
}

function stepDecimals(step: number): number {
  return Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
}

function formatTick(x: number, decimals: number): string {
  const s = (Math.abs(x) < 1e-12 ? 0 : x).toFixed(decimals);
  return s.startsWith("-") ? "\u2212" + s.slice(1) : s;
}

interface Frame {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  pal: Palette;
}

function drawYAxis(f: Frame, yMax: number, yLabel: string) {
  const { ctx, left, right, top, bottom, pal } = f;
  const plotH = bottom - top;
  const step = niceStep(yMax, Math.max(3, Math.min(6, Math.floor(plotH / 55))));
  const dec = stepDecimals(step);
  ctx.font = `11px ${pal.sans}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let y = 0; y <= yMax + 1e-12; y += step) {
    const py = Math.round(bottom - (y / yMax) * plotH) + 0.5;
    if (y > 0) {
      ctx.strokeStyle = pal.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(left, py);
      ctx.lineTo(right, py);
      ctx.stroke();
    }
    ctx.fillStyle = pal.muted;
    ctx.fillText(formatTick(y, dec), left - 8, py);
  }
  ctx.font = `italic 13px ${pal.serif}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = pal.muted;
  ctx.fillText(yLabel, 8, 18);
}

function drawBaseline(f: Frame, xLabel: string) {
  const { ctx, left, right, bottom, height, pal } = f;
  ctx.strokeStyle = pal.baseline;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, Math.round(bottom) + 0.5);
  ctx.lineTo(right, Math.round(bottom) + 0.5);
  ctx.stroke();
  ctx.font = `italic 13px ${pal.serif}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = pal.muted;
  ctx.fillText(xLabel, (left + right) / 2, height - 10);
}

function drawMean(f: Frame, px: number) {
  const { ctx, top, bottom, right, pal } = f;
  const x = Math.round(px) + 0.5;
  ctx.save();
  ctx.strokeStyle = pal.maroon;
  ctx.lineWidth = 1.25;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(x, bottom);
  ctx.lineTo(x, top);
  ctx.stroke();
  ctx.restore();
  ctx.font = `italic 12px ${pal.serif}`;
  ctx.fillStyle = pal.maroon;
  ctx.textBaseline = "top";
  const nearRight = x > right - 40;
  ctx.textAlign = nearRight ? "right" : "left";
  ctx.fillText("mean", nearRight ? x - 5 : x + 5, top);
}

function drawXTicks(f: Frame, ticks: { px: number; label: string }[]) {
  const { ctx, bottom, pal } = f;
  ctx.font = `11px ${pal.sans}`;
  ctx.fillStyle = pal.muted;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const t of ticks) {
    ctx.strokeStyle = pal.baseline;
    ctx.beginPath();
    ctx.moveTo(Math.round(t.px) + 0.5, bottom);
    ctx.lineTo(Math.round(t.px) + 0.5, bottom + 4);
    ctx.stroke();
    ctx.fillText(t.label, t.px, bottom + 8);
  }
}

function drawCurve(f: Frame, spec: CurvePlotSpec) {
  const { ctx, left, right, top, bottom, pal } = f;
  const plotW = right - left;
  const plotH = bottom - top;
  const yMax = spec.yPeak * 1.12 || 1;
  const sx = (x: number) => left + ((x - spec.xMin) / (spec.xMax - spec.xMin)) * plotW;
  const sy = (y: number) => bottom - (Math.min(y, yMax) / yMax) * plotH;

  drawYAxis(f, yMax, spec.yLabel);

  // Shaded area
  if (spec.shade) {
    const from = Math.max(spec.xMin, Math.min(spec.shade.from, spec.shade.to));
    const to = Math.min(spec.xMax, Math.max(spec.shade.from, spec.shade.to));
    if (to > from) {
      const n = Math.max(2, Math.ceil(((to - from) / (spec.xMax - spec.xMin)) * plotW * 2));
      const grad = ctx.createLinearGradient(0, top, 0, bottom);
      grad.addColorStop(0, hexToRgba(pal.maroon, 0.34));
      grad.addColorStop(1, hexToRgba(pal.maroon, 0.08));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(sx(from), bottom);
      for (let i = 0; i <= n; i++) {
        const x = from + ((to - from) * i) / n;
        ctx.lineTo(sx(x), sy(spec.density(x)));
      }
      ctx.lineTo(sx(to), bottom);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = pal.maroon;
      ctx.lineWidth = 1;
      for (const edge of [from, to]) {
        const ex = Math.round(sx(edge)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(ex, bottom);
        ctx.lineTo(ex, sy(spec.density(edge)));
        ctx.stroke();
      }
    }
  }

  // Curve, sampled at twice the pixel resolution
  const samples = Math.max(200, Math.ceil(plotW * 2));
  ctx.strokeStyle = pal.maroon;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i <= samples; i++) {
    const x = spec.xMin + ((spec.xMax - spec.xMin) * i) / samples;
    const px = sx(x);
    const py = sy(spec.density(x));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  drawBaseline(f, spec.xLabel);

  const step = niceStep(spec.xMax - spec.xMin, Math.max(3, Math.min(10, Math.floor(plotW / 60))));
  const dec = stepDecimals(step);
  const ticks: { px: number; label: string }[] = [];
  for (let x = Math.ceil(spec.xMin / step) * step; x <= spec.xMax + 1e-9; x += step) {
    ticks.push({ px: sx(x), label: formatTick(x, dec) });
  }
  drawXTicks(f, ticks);

  if (spec.mean >= spec.xMin && spec.mean <= spec.xMax) drawMean(f, sx(spec.mean));
}

function drawBars(f: Frame, spec: BarPlotSpec) {
  const { ctx, left, right, top, bottom, pal } = f;
  const plotW = right - left;
  const plotH = bottom - top;
  const count = spec.bars.length;
  const peak = spec.bars.reduce((m, b) => Math.max(m, b.y), 0);
  const yMax = peak * 1.12 || 1;
  const slot = plotW / count;
  const barW = Math.max(1, slot * 0.72);
  const sx = (x: number) => left + (x + 0.5) * slot;

  drawYAxis(f, yMax, spec.yLabel);

  for (const b of spec.bars) {
    const h = (b.y / yMax) * plotH;
    ctx.fillStyle = b.x === spec.highlight ? pal.maroon : pal.bar;
    ctx.fillRect(sx(b.x) - barW / 2, bottom - h, barW, h);
  }

  drawBaseline(f, spec.xLabel);

  const maxLabels = Math.max(2, Math.floor(plotW / 34));
  const step = Math.max(1, Math.ceil(count / maxLabels));
  const nice = step <= 1 ? 1 : step <= 2 ? 2 : step <= 5 ? 5 : step <= 10 ? 10 : Math.ceil(step / 10) * 10;
  const ticks: { px: number; label: string }[] = [];
  for (let x = 0; x < count; x += nice) ticks.push({ px: sx(x), label: String(x) });
  drawXTicks(f, ticks);

  const meanPx = sx(spec.mean);
  if (meanPx >= left && meanPx <= right) drawMean(f, meanPx);
}

export function CanvasVisualizer({ spec, ariaLabel }: CanvasVisualizerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const width = wrap.clientWidth;
    const height = wrap.clientHeight;
    if (width === 0 || height === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const frame: Frame = {
      ctx,
      width,
      height,
      left: 52,
      right: width - 16,
      top: 34,
      bottom: height - 52,
      pal: readPalette(canvas),
    };
    if (spec.kind === "curve") drawCurve(frame, spec);
    else drawBars(frame, spec);
  }, [spec]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(wrap);
    window.addEventListener("resize", draw);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", draw);
    };
  }, [draw]);

  return (
    <div ref={wrapRef} className="st1-canvas-wrap">
      <canvas ref={canvasRef} role="img" aria-label={ariaLabel} className="st1-canvas" />
    </div>
  );
}

export default CanvasVisualizer;
