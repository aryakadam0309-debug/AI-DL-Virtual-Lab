import { useRef, useEffect, useState, useCallback, type PointerEvent, type WheelEvent } from 'react';
import type { Matrix2x2, Vector2D } from './types';
import { transformVector, round } from './matrixMath';
import styles from './classNames';

interface CanvasVisualizerProps {
  matrix: Matrix2x2;
  onMatrixChange?: (newMatrix: Matrix2x2) => void;
  interactive?: boolean;
  testVector?: Vector2D | null;
  showOriginalGrid?: boolean;
  showTransformedGrid?: boolean;
  snapToGrid?: boolean;
  det: number;
  label?: string;
  className?: string;
}

export default function CanvasVisualizer({
  matrix,
  onMatrixChange,
  interactive = true,
  testVector = null,
  showOriginalGrid = true,
  showTransformedGrid = true,
  snapToGrid = false,
  det,
  label,
  className = '',
}: CanvasVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport transformation: scale (pixels per unit) and pan offset in pixels
  const [scale, setScale] = useState<number>(55);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging state: 'e1' (vector 1), 'e2' (vector 2), 'pan', or null
  const [dragState, setDragState] = useState<'e1' | 'e2' | 'pan' | null>(null);
  const [dragStartMouse, setDragStartMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStartOffset, setDragStartOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredVector, setHoveredVector] = useState<'e1' | 'e2' | null>(null);
  const [cursorCoord, setCursorCoord] = useState<{ x: number; y: number } | null>(null);

  // Convert canvas pixel coords to math coords
  const pixelToMath = useCallback(
    (px: number, py: number, canvas: HTMLCanvasElement): [number, number] => {
      const cx = canvas.width / 2 + offset.x;
      const cy = canvas.height / 2 + offset.y;
      return [(px - cx) / scale, -(py - cy) / scale];
    },
    [scale, offset]
  );

  // Convert math coords to canvas pixel coords
  const mathToPixel = useCallback(
    (mx: number, my: number, canvas: HTMLCanvasElement): [number, number] => {
      const cx = canvas.width / 2 + offset.x;
      const cy = canvas.height / 2 + offset.y;
      return [cx + mx * scale, cy - my * scale];
    },
    [scale, offset]
  );

  const resetView = () => {
    setScale(55);
    setOffset({ x: 0, y: 0 });
  };

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2 + offset.x;
    const cy = H / 2 + offset.y;

    // Determine visible range in math coords
    const left = -cx / scale;
    const right = (W - cx) / scale;
    const top_ = cy / scale;
    const bottom = -(H - cy) / scale;
    const minU = Math.floor(Math.min(left, bottom)) - 1;
    const maxU = Math.ceil(Math.max(right, top_)) + 1;

    // Draw original grid
    if (showOriginalGrid) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 0.5;
      for (let i = minU; i <= maxU; i++) {
        // Vertical
        const px = cx + i * scale;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, H);
        ctx.stroke();
        // Horizontal
        const py = cy - i * scale;
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(W, py);
        ctx.stroke();
      }
    }

    // Draw transformed grid
    if (showTransformedGrid) {
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.lineWidth = 0.6;
      for (let i = minU; i <= maxU; i++) {
        // Horizontal-transformed lines
        const hlStart = transformVector(matrix, [minU, i]);
        const hlEnd = transformVector(matrix, [maxU, i]);
        ctx.beginPath();
        ctx.moveTo(cx + hlStart[0] * scale, cy - hlStart[1] * scale);
        ctx.lineTo(cx + hlEnd[0] * scale, cy - hlEnd[1] * scale);
        ctx.stroke();

        // Vertical-transformed lines
        const vlStart = transformVector(matrix, [i, minU]);
        const vlEnd = transformVector(matrix, [i, maxU]);
        ctx.beginPath();
        ctx.moveTo(cx + vlStart[0] * scale, cy - vlStart[1] * scale);
        ctx.lineTo(cx + vlEnd[0] * scale, cy - vlEnd[1] * scale);
        ctx.stroke();
      }
    }

    // Axes
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(W, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, H);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
    ctx.font = '11px system-ui';
    for (let i = minU; i <= maxU; i++) {
      if (i === 0) continue;
      ctx.textAlign = 'center';
      ctx.fillText(String(i), cx + i * scale, cy + 14);
      ctx.textAlign = 'right';
      ctx.fillText(String(i), cx - 6, cy - i * scale + 4);
    }
    ctx.textAlign = 'center';
    ctx.fillText('x', W - 12, cy + 14);
    ctx.fillText('y', cx + 6, 14);

    // Helper: draw arrow
    const drawArrow = (
      fromX: number, fromY: number,
      toX: number, toY: number,
      color: string,
      lineW: number = 2.5,
      glow?: string
    ) => {
      const dx = toX - fromX;
      const dy = toY - fromY;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 2) return;
      const headLen = Math.min(12, len * 0.3);
      const angle = Math.atan2(dy, dx);

      if (glow) {
        ctx.save();
        ctx.shadowColor = glow;
        ctx.shadowBlur = 10;
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = lineW;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(
        toX - headLen * Math.cos(angle - Math.PI / 6),
        toY - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        toX - headLen * Math.cos(angle + Math.PI / 6),
        toY - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();
      if (glow) ctx.restore();
    };

    // e1 and e2 basis vectors (columns of the matrix)
    const e1Color = '#0284c7';
    const e2Color = '#a855f7';
    const e1Glow = 'rgba(2, 132, 199, 0.35)';
    const e2Glow = 'rgba(168, 85, 247, 0.35)';

    // Transformed basis vectors
    const te1 = transformVector(matrix, [1, 0]);
    const te2 = transformVector(matrix, [0, 1]);

    // Draw from origin
    drawArrow(
      cx, cy,
      cx + te1[0] * scale, cy - te1[1] * scale,
      e1Color, hoveredVector === 'e1' ? 3.5 : 2.5, e1Glow
    );
    drawArrow(
      cx, cy,
      cx + te2[0] * scale, cy - te2[1] * scale,
      e2Color, hoveredVector === 'e2' ? 3.5 : 2.5, e2Glow
    );

    // Labels
    ctx.font = '700 13px system-ui';
    ctx.fillStyle = e1Color;
    ctx.textAlign = 'center';
    ctx.fillText(
      `e₁' (${round(te1[0], 2)}, ${round(te1[1], 2)})`,
      cx + te1[0] * scale,
      cy - te1[1] * scale - 10
    );
    ctx.fillStyle = e2Color;
    ctx.fillText(
      `e₂' (${round(te2[0], 2)}, ${round(te2[1], 2)})`,
      cx + te2[0] * scale,
      cy - te2[1] * scale - 10
    );

    // Original basis vectors (dimmed)
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + scale, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - scale);
    ctx.stroke();
    ctx.setLineDash([]);

    // Test vector
    if (testVector) {
      const tv = transformVector(matrix, testVector);
      // Original
      ctx.setLineDash([3, 3]);
      drawArrow(
        cx, cy,
        cx + testVector[0] * scale, cy - testVector[1] * scale,
        '#fbbf24', 1.5
      );
      ctx.setLineDash([]);
      // Transformed
      drawArrow(
        cx, cy,
        cx + tv[0] * scale, cy - tv[1] * scale,
        '#f59e0b', 2.5, 'rgba(245, 158, 11, 0.3)'
      );
      ctx.font = '11px system-ui';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Av = (${round(tv[0], 2)}, ${round(tv[1], 2)})`,
        cx + tv[0] * scale,
        cy - tv[1] * scale - 8
      );
    }

    // Determinant area parallelogram
    if (Math.abs(det) > 0.01) {
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = det > 0 ? '#22c55e' : '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + te1[0] * scale, cy - te1[1] * scale);
      ctx.lineTo(
        cx + (te1[0] + te2[0]) * scale,
        cy - (te1[1] + te2[1]) * scale
      );
      ctx.lineTo(cx + te2[0] * scale, cy - te2[1] * scale);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Origin dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [matrix, scale, offset, showOriginalGrid, showTransformedGrid, testVector, det, hoveredVector, mathToPixel]);

  // Resize handler
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      // Trigger re-draw by forcing a state update
      setScale((s: number) => s);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Mouse interaction handlers
  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLCanvasElement>) => {
      if (!interactive || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const [mx, my] = pixelToMath(px * (window.devicePixelRatio || 1), py * (window.devicePixelRatio || 1), canvas);

      const te1 = transformVector(matrix, [1, 0]);
      const te2 = transformVector(matrix, [0, 1]);
      const d1 = Math.sqrt((mx - te1[0]) ** 2 + (my - te1[1]) ** 2);
      const d2 = Math.sqrt((mx - te2[0]) ** 2 + (my - te2[1]) ** 2);
      const threshold = 0.5;

      if (d1 < threshold && d1 < d2) {
        setDragState('e1');
      } else if (d2 < threshold) {
        setDragState('e2');
      } else {
        setDragState('pan');
        setDragStartMouse({ x: e.clientX, y: e.clientY });
        setDragStartOffset({ ...offset });
      }
      canvas.setPointerCapture(e.pointerId);
    },
    [interactive, matrix, offset, pixelToMath]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const [mx, my] = pixelToMath(px * (window.devicePixelRatio || 1), py * (window.devicePixelRatio || 1), canvas);

      setCursorCoord({ x: round(mx, 1), y: round(my, 1) });

      if (!dragState) {
        // Hover detection
        const te1 = transformVector(matrix, [1, 0]);
        const te2 = transformVector(matrix, [0, 1]);
        const d1 = Math.sqrt((mx - te1[0]) ** 2 + (my - te1[1]) ** 2);
        const d2 = Math.sqrt((mx - te2[0]) ** 2 + (my - te2[1]) ** 2);
        if (d1 < 0.5 && d1 < d2) setHoveredVector('e1');
        else if (d2 < 0.5) setHoveredVector('e2');
        else setHoveredVector(null);
        return;
      }

      if (dragState === 'pan') {
        setOffset({
          x: dragStartOffset.x + (e.clientX - dragStartMouse.x),
          y: dragStartOffset.y + (e.clientY - dragStartMouse.y),
        });
        return;
      }

      // Dragging e1 or e2 to change the matrix
      let nx = mx;
      let ny = my;
      if (snapToGrid) {
        nx = Math.round(nx * 2) / 2;
        ny = Math.round(ny * 2) / 2;
      }

      if (onMatrixChange) {
        if (dragState === 'e1') {
          onMatrixChange([
            [nx, matrix[0][1]],
            [ny, matrix[1][1]],
          ]);
        } else {
          onMatrixChange([
            [matrix[0][0], nx],
            [matrix[1][0], ny],
          ]);
        }
      }
    },
    [dragState, matrix, offset, dragStartMouse, dragStartOffset, onMatrixChange, pixelToMath, snapToGrid]
  );

  const handlePointerUp = useCallback(() => {
    setDragState(null);
  }, []);

  const handleWheel = useCallback((e: WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setScale((s: number) => Math.min(140, Math.max(25, s * (e.deltaY < 0 ? 1.1 : 0.9))));
  }, []);

  return (
    <div className={`${styles.canvasContainer} ${className}`} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {label && <div className={styles.canvasBadge}>{label}</div>}

      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor:
            dragState === 'pan'
              ? 'grabbing'
              : hoveredVector
              ? 'grab'
              : dragState
              ? 'grabbing'
              : 'crosshair',
          touchAction: 'none',
        }}
      />

      {/* Floating Canvas Controls */}
      <div className={styles.canvasControls}>
        <button
          type="button"
          onClick={() => setScale((s: number) => Math.min(140, s * 1.2))}
          title="Zoom In"
          className={styles.canvasBtn}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setScale((s: number) => Math.max(25, s * 0.8))}
          title="Zoom Out"
          className={styles.canvasBtn}
        >
          −
        </button>
        <button
          type="button"
          onClick={resetView}
          title="Recenter Origin"
          className={styles.canvasBtn}
        >
          ⌖
        </button>
      </div>

      {/* Cursor math coordinates indicator */}
      {cursorCoord && (
        <div className={styles.canvasCoord}>
          ({cursorCoord.x}, {cursorCoord.y})
        </div>
      )}
    </div>
  );
}

