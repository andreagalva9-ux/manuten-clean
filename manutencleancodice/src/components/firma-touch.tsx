"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ALTEZZA = 160;

/**
 * Area di firma su canvas, pensata per il dito su smartphone.
 * Il tratto viene salvato come PNG in data URL dentro un input nascosto,
 * così il form si comporta come un campo qualsiasi.
 */
export function FirmaTouch({
  nome,
  etichetta,
  valoreIniziale,
}: {
  nome: string;
  etichetta: string;
  valoreIniziale?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const disegnando = useRef(false);
  const ultimoPunto = useRef<{ x: number; y: number } | null>(null);

  const [valore, setValore] = useState<string>(valoreIniziale ?? "");
  const [vuoto, setVuoto] = useState(!valoreIniziale);

  const preparaContesto = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    return ctx;
  }, []);

  // Adatta il canvas alla larghezza reale e al pixel ratio dello schermo,
  // ridisegnando l'eventuale firma già salvata.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function ridimensiona() {
      const el = canvasRef.current;
      if (!el) return;
      const dpr = window.devicePixelRatio || 1;
      const larghezza = el.clientWidth;
      if (larghezza === 0) return;

      el.width = Math.round(larghezza * dpr);
      el.height = Math.round(ALTEZZA * dpr);

      const ctx = el.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      preparaContesto();

      if (valoreIniziale) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, larghezza, ALTEZZA);
        img.src = valoreIniziale;
      }
    }

    ridimensiona();
    const observer = new ResizeObserver(ridimensiona);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [preparaContesto, valoreIniziale]);

  function posizione(evento: React.PointerEvent<HTMLCanvasElement>) {
    const rect = evento.currentTarget.getBoundingClientRect();
    return {
      x: evento.clientX - rect.left,
      y: evento.clientY - rect.top,
    };
  }

  function inizio(evento: React.PointerEvent<HTMLCanvasElement>) {
    evento.preventDefault();
    evento.currentTarget.setPointerCapture(evento.pointerId);
    disegnando.current = true;
    ultimoPunto.current = posizione(evento);
  }

  function muovi(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (!disegnando.current) return;
    evento.preventDefault();

    const ctx = preparaContesto();
    const partenza = ultimoPunto.current;
    if (!ctx || !partenza) return;

    const punto = posizione(evento);
    ctx.beginPath();
    ctx.moveTo(partenza.x, partenza.y);
    ctx.lineTo(punto.x, punto.y);
    ctx.stroke();
    ultimoPunto.current = punto;
    if (vuoto) setVuoto(false);
  }

  function fine(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (!disegnando.current) return;
    disegnando.current = false;
    ultimoPunto.current = null;

    const canvas = evento.currentTarget;
    setValore(canvas.toDataURL("image/png"));
  }

  function cancella() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setValore("");
    setVuoto(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{etichetta}</span>
        {!vuoto && (
          <button
            type="button"
            onClick={cancella}
            className="text-sm font-medium text-slate-500 underline underline-offset-2"
          >
            Cancella
          </button>
        )}
      </div>

      <div className="relative rounded-lg border border-slate-300 bg-white">
        <canvas
          ref={canvasRef}
          onPointerDown={inizio}
          onPointerMove={muovi}
          onPointerUp={fine}
          onPointerCancel={fine}
          onPointerLeave={fine}
          style={{ height: ALTEZZA, touchAction: "none" }}
          className="block w-full cursor-crosshair rounded-lg"
          aria-label={etichetta}
        />
        {vuoto && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Firma qui con il dito
          </span>
        )}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-6 bottom-6 left-6 border-b border-dashed border-slate-300"
        />
      </div>

      <input type="hidden" name={nome} value={valore} />
    </div>
  );
}
