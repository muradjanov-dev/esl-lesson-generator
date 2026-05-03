"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Pencil, Eraser, Trash2, Palette, X } from "lucide-react";

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
  "#f97316", // orange
  "#ef4444", // red
  "#3b82f6", // blue
  "#22c55e", // green
  "#a855f7", // purple
  "#ec4899", // pink
  "#eab308", // yellow
  "#000000", // black
];

interface WhiteboardProps {
  drawMode: boolean;
}

export default function Whiteboard({ drawMode }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#f97316");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const isDrawing = useRef(false);
  const lastPoint = useRef<Point | null>(null);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      window.innerHeight
    );
    const newW = window.innerWidth;
    const newH = docHeight;
    if (canvas.width !== newW || canvas.height !== newH) {
      setCanvasSize({ width: newW, height: newH });
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(document.body);
    window.addEventListener("resize", resizeCanvas);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [resizeCanvas]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawStroke = (stroke: Stroke) => {
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
        const midX = (prev.x + curr.x) / 2;
        const midY = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
      ctx.stroke();
      ctx.restore();
    };

    strokes.forEach(drawStroke);
    if (currentStroke) drawStroke(currentStroke);
  }, [strokes, currentStroke]);

  useEffect(() => {
    redraw();
  }, [redraw, canvasSize]);

  const getPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scrollY = window.scrollY;
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top + scrollY,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top + scrollY,
    };
  };

  const startDraw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!drawMode) return;
      e.preventDefault();
      isDrawing.current = true;
      const point = getPoint(e);
      lastPoint.current = point;
      const newStroke: Stroke = {
        points: [point],
        color: tool === "eraser" ? "#000000" : color,
        width: tool === "eraser" ? 24 : 4,
        isEraser: tool === "eraser",
      };
      setCurrentStroke(newStroke);
    },
    [drawMode, tool, color]
  );

  const continueDraw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!drawMode || !isDrawing.current || !currentStroke) return;
      e.preventDefault();
      const point = getPoint(e);
      setCurrentStroke((prev) =>
        prev ? { ...prev, points: [...prev.points, point] } : prev
      );
      lastPoint.current = point;
    },
    [drawMode, currentStroke]
  );

  const endDraw = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (currentStroke && currentStroke.points.length > 1) {
      setStrokes((prev) => [...prev, currentStroke]);
    }
    setCurrentStroke(null);
    lastPoint.current = null;
  }, [currentStroke]);

  const clearAll = () => {
    setStrokes([]);
    setCurrentStroke(null);
  };

  if (!drawMode && strokes.length === 0) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="fixed top-0 left-0"
        style={{
          zIndex: 40,
          pointerEvents: drawMode ? "all" : "none",
          cursor: drawMode
            ? tool === "eraser"
              ? "cell"
              : "crosshair"
            : "default",
          touchAction: drawMode ? "none" : "auto",
        }}
        onMouseDown={startDraw}
        onMouseMove={continueDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={continueDraw}
        onTouchEnd={endDraw}
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
              tool === "pen"
                ? "bg-orange-500 text-white shadow-md"
                : "text-orange-600 hover:bg-orange-50"
            }`}
            title="Pen"
          >
            <Pencil size={16} />
            <span>Pen</span>
          </button>

          <button
            onClick={() => setTool("eraser")}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-semibold transition-all ${
              tool === "eraser"
                ? "bg-orange-500 text-white shadow-md"
                : "text-orange-600 hover:bg-orange-50"
            }`}
            title="Eraser"
          >
            <Eraser size={16} />
            <span>Eraser</span>
          </button>

          <div className="w-px h-6 bg-orange-200 mx-1" />

          <div className="relative">
            <button
              onClick={() => setShowColorPicker((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-all"
              title="Pick color"
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
                    onClick={() => {
                      setColor(c);
                      setTool("pen");
                      setShowColorPicker(false);
                    }}
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
            title="Clear all drawings"
          >
            <Trash2 size={16} />
            <span>Clear</span>
          </button>
        </div>
      )}
    </>
  );
}
