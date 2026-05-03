"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Pencil, Eraser, Trash2, Palette } from "lucide-react";

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
  isEraser: boolean;
}

const COLORS = [
  "#f97316",
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#ec4899",
  "#eab308",
  "#000000",
];

interface WhiteboardProps {
  drawMode: boolean;
}

export default function Whiteboard({ drawMode }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const isDrawing = useRef(false);
  const drawModeRef = useRef(drawMode);

  const [, forceRender] = useState(0);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#f97316");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [hasStrokes, setHasStrokes] = useState(false);

  const toolRef = useRef(tool);
  const colorRef = useRef(color);

  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);

  // ── Canvas resize ──
  const resizeCanvas = useCallback(() => {
    const docH = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      window.innerHeight
    );
    setCanvasSize({ width: window.innerWidth, height: docH });
  }, []);

  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(document.body);
    window.addEventListener("resize", resizeCanvas);
    return () => { ro.disconnect(); window.removeEventListener("resize", resizeCanvas); };
  }, [resizeCanvas]);

  // ── Redraw ──
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const paintStroke = (stroke: Stroke) => {
      if (stroke.points.length < 2) return;
      ctx.save();
      ctx.globalCompositeOperation = stroke.isEraser ? "destination-out" : "source-over";
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1];
        const curr = stroke.points[i];
        ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + curr.x) / 2, (prev.y + curr.y) / 2);
      }
      ctx.stroke();
      ctx.restore();
    };

    strokesRef.current.forEach(paintStroke);
    if (currentStrokeRef.current) paintStroke(currentStrokeRef.current);
  }, []);

  useEffect(() => { redraw(); }, [redraw, canvasSize]);

  // ── Point helper ──
  const getPoint = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top + window.scrollY,
    };
  };

  // ── Native pointer/touch event listeners ──
  // Key insight: canvas has pointerEvents: none always.
  // We attach listeners to window, check drawMode, and only
  // preventDefault (blocking scroll) AFTER the user has started a stroke.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!drawModeRef.current) return;
      // Only draw with primary pointer (finger or left mouse)
      if (e.button !== 0 && e.pointerType === "mouse") return;
      isDrawing.current = true;
      const pt = getPoint(e.clientX, e.clientY);
      currentStrokeRef.current = {
        points: [pt],
        color: toolRef.current === "eraser" ? "#000000" : colorRef.current,
        width: toolRef.current === "eraser" ? 24 : 4,
        isEraser: toolRef.current === "eraser",
      };
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drawModeRef.current || !isDrawing.current || !currentStrokeRef.current) return;
      e.preventDefault();
      const pt = getPoint(e.clientX, e.clientY);
      currentStrokeRef.current = {
        ...currentStrokeRef.current,
        points: [...currentStrokeRef.current.points, pt],
      };
      redraw();
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      if (currentStrokeRef.current && currentStrokeRef.current.points.length > 1) {
        strokesRef.current = [...strokesRef.current, currentStrokeRef.current];
        setHasStrokes(true);
      }
      currentStrokeRef.current = null;
      redraw();
    };

    // Attach to canvas with { passive: false } so we can preventDefault
    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", onPointerMove, { passive: false });
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, [redraw]);

  const clearAll = () => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    setHasStrokes(false);
    redraw();
  };

  if (!drawMode && !hasStrokes) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="fixed top-0 left-0"
        style={{
          zIndex: 40,
          // Always intercept pointer events so our listeners fire;
          // but touchAction auto means the browser still scrolls on non-drawing touches
          pointerEvents: drawMode ? "all" : "none",
          touchAction: "auto",
          cursor: drawMode
            ? tool === "eraser" ? "cell" : "crosshair"
            : "default",
        }}
      />

      {drawMode && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-3 rounded-3xl"
          style={{
            zIndex: 50,
            background: "rgba(255,255,255,0.95)",
            boxShadow: "0 8px 32px rgba(249,115,22,0.25), 0 2px 8px rgba(0,0,0,0.08)",
            backdropFilter: "blur(12px)",
            border: "1px solid #fed7aa",
          }}
        >
          <button
            onClick={() => setTool("pen")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-semibold transition-all ${
              tool === "pen" ? "bg-orange-500 text-white shadow-md" : "text-orange-600 hover:bg-orange-50"
            }`}
          >
            <Pencil size={16} />
            <span>Pen</span>
          </button>

          <button
            onClick={() => setTool("eraser")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-semibold transition-all ${
              tool === "eraser" ? "bg-orange-500 text-white shadow-md" : "text-orange-600 hover:bg-orange-50"
            }`}
          >
            <Eraser size={16} />
            <span>Eraser</span>
          </button>

          <div className="w-px h-6 bg-orange-200 mx-1" />

          <div className="relative">
            <button
              onClick={() => setShowColorPicker((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-all"
            >
              <Palette size={16} />
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow"
                style={{ background: color }}
              />
            </button>
            {showColorPicker && (
              <div
                className="absolute bottom-14 left-0 p-3 rounded-2xl grid gap-2"
                style={{
                  background: "rgba(255,255,255,0.98)",
                  boxShadow: "0 8px 32px rgba(249,115,22,0.2)",
                  border: "1px solid #fed7aa",
                  gridTemplateColumns: "repeat(4, 1fr)",
                }}
              >
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setColor(c); setTool("pen"); setShowColorPicker(false); }}
                    className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      background: c,
                      borderColor: c === color ? "#fb923c" : "transparent",
                      boxShadow: c === color ? "0 0 0 2px #fb923c" : "none",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-orange-200 mx-1" />

          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all"
          >
            <Trash2 size={16} />
            <span>Clear</span>
          </button>
        </div>
      )}
    </>
  );
}
