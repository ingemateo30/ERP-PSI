/**
 * SignaturePad — componente de firma digital compatible con Wacom, stylus, mouse y touch.
 *
 * Diferencias clave vs react-signature-canvas:
 *  - Usa Pointer Events (pointermove/pointerdown/pointerup) en lugar de mouse/touch separados
 *    → Wacom y otros stylus son reconocidos automáticamente sin configuración extra
 *  - Aplica device pixel ratio correcto para pantallas Retina/HiDPI
 *  - Curvas suaves con interpolación Bézier cúbica
 *  - API compatible: ref.clear(), ref.isEmpty(), ref.toDataURL()
 */

import React, { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';

const SignaturePad = forwardRef(({
  width = 500,
  height = 200,
  backgroundColor = 'rgb(255,255,255)',
  penColor = '#1a1a2e',
  minWidth = 1,
  maxWidth = 3,
  velocityFilterWeight = 0.7,
  onBegin,
  onEnd,
  className = '',
  style = {},
}, ref) => {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const points = useRef([]);          // puntos del trazo actual
  const lastVelocity = useRef(0);
  const lastWidth = useRef((minWidth + maxWidth) / 2);
  const isEmpty = useRef(true);

  // ── Utilidades ──────────────────────────────────────────────────────────
  const getCtx = () => canvasRef.current?.getContext('2d');

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    // Usar presión del stylus si está disponible (Wacom)
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : 0.5;
    return {
      x: (e.clientX - rect.left) * dpr,
      y: (e.clientY - rect.top)  * dpr,
      t: Date.now(),
      pressure,
    };
  };

  const calcWidth = (velocity, pressure) => {
    const v = velocityFilterWeight * velocity + (1 - velocityFilterWeight) * lastVelocity.current;
    lastVelocity.current = v;
    const w = Math.max(maxWidth / (v + 1), minWidth);
    // Modular por presión del stylus (Wacom)
    return w * (0.5 + pressure);
  };

  const drawPoint = (ctx, x, y, size) => {
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = penColor;
    ctx.fill();
  };

  const drawCurve = (ctx, p1, p2, p3, p4) => {
    const cp1x = p2.x + (p3.x - p1.x) / 6;
    const cp1y = p2.y + (p3.y - p1.y) / 6;
    const cp2x = p3.x - (p4.x - p2.x) / 6;
    const cp2y = p3.y - (p4.y - p2.y) / 6;

    const dx = p3.x - p2.x;
    const dy = p3.y - p2.y;
    const velocity = Math.sqrt(dx * dx + dy * dy) / Math.max(p3.t - p2.t, 1);

    const w = calcWidth(velocity, (p2.pressure + p3.pressure) / 2);
    lastWidth.current = w;

    ctx.beginPath();
    ctx.moveTo(p2.x, p2.y);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p3.x, p3.y);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = w * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  // ── Inicializar canvas ──────────────────────────────────────────────────
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    isEmpty.current = true;
  }, [width, height, backgroundColor]);

  useEffect(() => {
    setupCanvas();
  }, [setupCanvas]);

  // ── Pointer handlers ────────────────────────────────────────────────────
  const handlePointerDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawing.current = true;
    points.current = [getPos(e)];
    lastVelocity.current = 0;
    lastWidth.current = (minWidth + maxWidth) / 2;
    isEmpty.current = false;
    onBegin?.();

    const ctx = getCtx();
    if (ctx) {
      const p = points.current[0];
      drawPoint(ctx, p.x, p.y, lastWidth.current);
    }
    e.preventDefault();
  }, [minWidth, maxWidth, onBegin]);

  const handlePointerMove = useCallback((e) => {
    if (!isDrawing.current) return;
    const ctx = getCtx();
    if (!ctx) return;

    const p = getPos(e);
    points.current.push(p);

    const pts = points.current;
    if (pts.length >= 4) {
      drawCurve(ctx, pts[pts.length - 4], pts[pts.length - 3], pts[pts.length - 2], pts[pts.length - 1]);
    } else if (pts.length === 2) {
      drawPoint(ctx, p.x, p.y, lastWidth.current);
    }
    e.preventDefault();
  }, []);

  const handlePointerUp = useCallback((e) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    points.current = [];
    onEnd?.();
    e.preventDefault();
  }, [onEnd]);

  // ── Prevent scroll en touch ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prevent = (e) => { if (isDrawing.current) e.preventDefault(); };
    canvas.addEventListener('touchmove', prevent, { passive: false });
    return () => canvas.removeEventListener('touchmove', prevent);
  }, []);

  // ── API pública (ref) ────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    clear() {
      setupCanvas();
    },
    isEmpty() {
      return isEmpty.current;
    },
    toDataURL(type = 'image/png', quality) {
      return canvasRef.current?.toDataURL(type, quality) || '';
    },
    getCanvas() {
      return canvasRef.current;
    },
  }), [setupCanvas]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: width + 'px',
        height: height + 'px',
        touchAction: 'none',
        cursor: 'crosshair',
        display: 'block',
        ...style,
      }}
      className={className}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
});

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
