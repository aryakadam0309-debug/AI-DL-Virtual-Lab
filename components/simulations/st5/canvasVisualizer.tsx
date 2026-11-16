import { useEffect, useRef } from "react";
import type { PlotSpec } from "./types";

interface CanvasVisualizerProps {
  spec: PlotSpec;
  ariaLabel: string;
  className: string;
}

function withOpacity(color: string, opacity: number): string {
  const hex = color.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
  if (!hex) return color;
  const expanded = hex.length === 3 ? hex.split("").map((digit) => digit + digit).join("") : hex;
  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export function CanvasVisualizer({ spec, ariaLabel, className }: CanvasVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.closest<HTMLElement>("[data-st5-root]");
    if (!canvas || !root) return;

    const redraw = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const pixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * pixelRatio);
      canvas.height = Math.round(rect.height * pixelRatio);
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);

      const palette = getComputedStyle(root);
      const color = (name: string, fallback: string) =>
        palette.getPropertyValue(name).trim() || fallback;
      const maroon = color("--st5-maroon", "#5a1626");
      const hoverMaroon = color("--st5-maroon-hover", "#7e2a3c");
      const sandDark = color("--st5-sand-dark", "#b9a88f");
      const muted = color("--st5-muted", "#7a6a66");
      const grid = color("--st5-grid", "#efe6d6");
      const left = 56;
      const right = 16;
      const top = 18;
      const bottom = 58;
      const chartWidth = Math.max(1, rect.width - left - right);
      const chartHeight = Math.max(1, rect.height - top - bottom);
      const xAt = (p: number) => left + p * chartWidth;
      const yAt = (value: number) => top + chartHeight * (1 - Math.min(value, spec.yMax) / spec.yMax);

      context.save();
      context.beginPath();
      context.rect(left, top, chartWidth, chartHeight);
      context.clip();

      const shadePoints = spec.points.filter((point) => point.p >= spec.lower && point.p <= spec.upper);
      const firstShadePoint = shadePoints[0];
      const lastShadePoint = shadePoints[shadePoints.length - 1];
      if (firstShadePoint && lastShadePoint) {
        const gradient = context.createLinearGradient(0, top, 0, top + chartHeight);
        gradient.addColorStop(0, withOpacity(maroon, 0.34));
        gradient.addColorStop(1, withOpacity(maroon, 0.08));
        context.beginPath();
        context.moveTo(xAt(spec.lower), yAt(0));
        context.lineTo(xAt(spec.lower), yAt(firstShadePoint.posterior));
        for (const point of shadePoints) context.lineTo(xAt(point.p), yAt(point.posterior));
        context.lineTo(xAt(spec.upper), yAt(lastShadePoint.posterior));
        context.lineTo(xAt(spec.upper), yAt(0));
        context.closePath();
        context.fillStyle = gradient;
        context.fill();
      }

      context.strokeStyle = grid;
      context.lineWidth = 1;
      context.setLineDash([]);
      for (let tick = 0; tick <= 4; tick += 1) {
        const y = top + (chartHeight * tick) / 4;
        context.beginPath();
        context.moveTo(left, y);
        context.lineTo(left + chartWidth, y);
        context.stroke();
      }

      context.strokeStyle = hoverMaroon;
      context.lineWidth = 1;
      for (const boundary of [spec.lower, spec.upper]) {
        const point = spec.points.reduce((nearest, current) =>
          Math.abs(current.p - boundary) < Math.abs(nearest.p - boundary) ? current : nearest,
        );
        context.beginPath();
        context.moveTo(xAt(boundary), yAt(0));
        context.lineTo(xAt(boundary), yAt(point.posterior));
        context.stroke();
      }

      const drawCurve = (key: "prior" | "posterior" | "likelihood", color: string, width: number, dashed = false) => {
        context.beginPath();
        context.strokeStyle = color;
        context.lineWidth = width;
        context.lineJoin = "round";
        context.lineCap = "round";
        context.setLineDash(dashed ? [6, 5] : []);
        let started = false;
        for (const point of spec.points) {
          const value = key === "likelihood" ? point.likelihood : point[key];
          if (value === null || value === undefined) continue;
          const x = xAt(point.p);
          const y = yAt(value);
          if (!started) {
            context.moveTo(x, y);
            started = true;
          } else context.lineTo(x, y);
        }
        context.stroke();
      };

      drawCurve("prior", sandDark, 1.5);
      drawCurve("likelihood", hoverMaroon, 1.5, true);
      drawCurve("posterior", maroon, 2);

      context.beginPath();
      context.strokeStyle = maroon;
      context.lineWidth = 1.2;
      context.setLineDash([4, 4]);
      context.moveTo(xAt(spec.mean), top);
      context.lineTo(xAt(spec.mean), top + chartHeight);
      context.stroke();
      context.restore();

      context.strokeStyle = sandDark;
      context.lineWidth = 1;
      context.setLineDash([]);
      context.beginPath();
      context.moveTo(left, top + chartHeight);
      context.lineTo(left + chartWidth, top + chartHeight);
      context.stroke();

      context.fillStyle = muted;
      context.font = '11px system-ui, -apple-system, "Segoe UI", sans-serif';
      context.textAlign = "right";
      context.textBaseline = "middle";
      for (let tick = 0; tick <= 4; tick += 1) {
        const value = (spec.yMax * tick) / 4;
        const y = top + chartHeight * (1 - tick / 4);
        context.fillText(value.toFixed(value < 1 ? 2 : 1), left - 8, y);
      }

      context.textAlign = "center";
      context.textBaseline = "top";
      for (let tick = 0; tick <= 5; tick += 1) {
        const value = tick / 5;
        const x = xAt(value);
        context.fillText(value === 1 ? "1" : value.toFixed(1), x, top + chartHeight + 7);
      }

      context.fillStyle = muted;
      context.font = 'italic 13px Georgia, "Times New Roman", serif';
      context.textBaseline = "bottom";
      context.fillText("Probability of heads (p)", left + chartWidth / 2, rect.height - 2);
      context.save();
      context.translate(14, top + chartHeight / 2);
      context.rotate(-Math.PI / 2);
      context.fillText("Density", 0, 0);
      context.restore();

      context.fillStyle = maroon;
      context.font = 'italic 11px Georgia, "Times New Roman", serif';
      context.textAlign = spec.mean > 0.76 ? "right" : "left";
      context.textBaseline = "top";
      context.fillText("mean", xAt(spec.mean) + (spec.mean > 0.76 ? -5 : 5), top + 3);
    };

    redraw();
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [spec]);

  return <canvas ref={canvasRef} className={className} role="img" aria-label={ariaLabel} />;
}