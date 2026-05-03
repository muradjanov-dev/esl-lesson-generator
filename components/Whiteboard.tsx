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
  "#f97316", "#ef4444", "#3b82f6", "#22c55e",
  "#a855f7", "#ec4899", "#eab308", "#000000",
];

interface WhiteboardProps {
  drawMode: boolean;
}

export default function Whiteboard({ drawMode }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const isDrawingRef = useRef(false);
  const drawModeRef = useRef(drawMode);
  const toolRef = useRef<"pen" | "eraser">("pen");
  const colorRef = useRef("#f97316");

  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState("#f97316");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [hasStrokes, setHasStrokes] = useState(false);

  useEffect(() => { drawModeRef.current = drawMode; }, [drawMode]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);

  const resizeCanvas = useCallback(() => {
    const h = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      window.innerHeight
    );
    setCanvasSize({ width: window.innerWidth, height: h });
  }, []);

  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(document.body);
    window.addEventListener("resize", resizeCanvas);
    return () => { ro.disconnect(); window.removeEventListener("resize", resizeCanvas); };
  }, [resizeCanvas]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const paint = (stroke: Stroke) => {
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
        const p = stroke.points[i - 1];
        const c = stroke.points[i];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + c.x) / 2, (p.y + c.y) / 2);
      }
      ctx.stroke();
      ctx.restore();
    };

    strokesRef.current.forEach(paint);
    if (currentStrokeRef.current) paint(currentStrokeRef.current);
  }, []);

  useEffect(() => { redraw(); }, [redraw, canvasSize]);

  const clientToCanvas = (clientX: number, clientY: number): Point => ({
    x: clientX,
    y: clientY + window.scrollY,
  });

  const startStroke = useCallback((x: number, y: number) => {
    isDrawingRef.current = true;
    currentStrokeRef.current = {
      points: [clientToCanvas(x, y)],
      color: toolRef.current === "eraser" ? "#000" : colorRef.current,
      width: toolRef.current === "eraser" ? 28 : 4,
      isEraser: toolRef.current === "eraser",
    };
  }, []);

  const continueStroke = useCallback((x: number, y: number) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    currentStrokeRef.current.points.push(clientToCanvas(x, y));
    redraw();
  }, [redraw]);

  const endStroke = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 1) {
      strokesRef.current.push({ ...currentStrokeRef.current });
      setHasStrokes(true);
    }
    currentStrokeRef.current = null;
    redraw();
  }, [redraw]);

  // Mouse events on window (works on desktop)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!drawModeRef.current || e.button !== 0) return;
      startStroke(e.clientX, e.clientY);
    };
    const onMove = (e: MouseEvent) => {
      if (!isDrawingRef.current) return;
      continueStroke(e.clientX, e.clientY);
    };
    const onUp = () => endStroke();

    window.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [startStroke, continueStroke, endStroke]);

  // Touch events — attached to document with passive:false so we CAN preventDefault
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (!drawModeRef.current) return;
      const t = e.touches[0];
      startStroke(t.clientX, t.clientY);
      // don't preventDefault here — let the browser see the touch
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!drawModeRef.current || !isDrawingRef.current) return;
      e.preventDefault(); // block scroll only when actively drawing
      const t = e.touches[0];
      continueStroke(t.clientX, t.clientY);
    };

    const onTouchEnd = () => endStroke();

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [startStroke, continueStroke, endStroke]);

  const clearAll = () => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    setHasStrokes(false);
    redraw();
  };

  if (!drawMode && !hasStrokes) return null;

  return (
    <>
      {/* Canvas — pointer-events:none, purely for rendering */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 40,
          pointerEvents: "none",   // never blocks clicks/scroll
          touchAction: "none",
          cursor: "default",
        }}
      />

      {/* Toolbar */}
      {drawMode && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.97)",
            boxShadow: "0 8px 32px rgba(249,115,22,0.25), 0 2px 8px rgba(0,0,0,0.08)",
            backdropFilter: "blur(12px)",
            border: "1px solid #fed7aa",
          }}
        >
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setTool("pen")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 12px", borderRadius: 16,
              fontWeight: 700, fontSize: 14, cursor: "pointer", border: "none",
              background: tool === "pen" ? "#f97316" : "transparent",
              color: tool === "pen" ? "#fff" : "#ea580c",
              boxShadow: tool === "pen" ? "0 2px 8px rgba(249,115,22,0.4)" : "none",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            </svg>
            Pen
          </button>

          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={() => setTool("eraser")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 12px", borderRadius: 16,
              fontWeight: 700, fontSize: 14, cursor: "pointer", border: "none",
              background: tool === "eraser" ? "#f97316" : "transparent",
              color: tool === "eraser" ? "#fff" : "#ea580c",
              boxShadow: tool === "eraser" ? "0 2px 8px rgba(249,115,22,0.4)" : "none",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 20H7L3 16l11-11 7 7-1 8Z"/><path d="m6.5 17.5-4-4"/>
            </svg>
            Eraser
          </button>

          <div style={{ width: 1, height: 24, background: "#fed7aa", margin: "0 4px" }} />

          {/* Color picker */}
          <div style={{ position: "relative" }}>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setShowColorPicker((v) => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 12px", borderRadius: 16,
                fontWeight: 700, fontSize: 14, cursor: "pointer", border: "none",
                background: "transparent", color: "#ea580c",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
              </svg>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: color, border: "2px solid white", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
            </button>

            {showColorPicker && (
              <div
                style={{
                  position: "absolute", bottom: 52, left: 0,
                  padding: 12, borderRadius: 16,
                  background: "rgba(255,255,255,0.99)",
                  boxShadow: "0 8px 32px rgba(249,115,22,0.2)",
                  border: "1px solid #fed7aa",
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                  zIndex: 60,
                }}
              >
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => { setColor(c); setTool("pen"); setShowColorPicker(false); }}
                    style={{
                      width: 32, height: 32, borderRadius: "50%", cursor: "pointer",
                      background: c, border: c === color ? "3px solid #fb923c" : "2px solid transparent",
                      boxShadow: c === color ? "0 0 0 2px #fb923c" : "none",
                      transition: "transform 0.1s",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div style={{ width: 1, height: 24, background: "#fed7aa", margin: "0 4px" }} />

          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={clearAll}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 12px", borderRadius: 16,
              fontWeight: 700, fontSize: 14, cursor: "pointer", border: "none",
              background: "transparent", color: "#ef4444",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
            Clear
          </button>
        </div>
      )}

      {/* Cursor dot that follows the finger/mouse — shows where you're drawing */}
      {drawMode && (
        <CursorDot tool={tool} color={color} drawModeRef={drawModeRef} isDrawingRef={isDrawingRef} />
      )}
    </>
  );
}

function CursorDot({
  tool, color, drawModeRef, isDrawingRef,
}: {
  tool: "pen" | "eraser";
  color: string;
  drawModeRef: React.RefObject<boolean>;
  isDrawingRef: React.RefObject<boolean>;
}) {
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (x: number, y: number) => {
      const dot = dotRef.current;
      if (!dot) return;
      dot.style.left = `${x}px`;
      dot.style.top = `${y}px`;
      dot.style.opacity = "1";
    };
    const hide = () => { if (dotRef.current) dotRef.current.style.opacity = "0"; };

    const onMouse = (e: MouseEvent) => move(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => move(e.touches[0].clientX, e.touches[0].clientY);

    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("mouseleave", hide);
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("mouseleave", hide);
    };
  }, []);

  const size = tool === "eraser" ? 28 : 12;

  return (
    <div
      ref={dotRef}
      style={{
        position: "fixed",
        width: size,
        height: size,
        borderRadius: "50%",
        background: tool === "eraser" ? "rgba(255,255,255,0.6)" : color,
        border: tool === "eraser" ? "2px solid #fb923c" : "2px solid white",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        zIndex: 55,
        opacity: 0,
        transition: "opacity 0.1s",
      }}
    />
  );
}
