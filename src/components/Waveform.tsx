import { useEffect, useRef } from "react";

interface Props {
  /** 0 = perfectly coherent carrier, 1 = pure static */
  chaos: number;
  /** trace color, keyed to signal status */
  color: string;
}

/**
 * The signature: an oscilloscope trace drawn on <canvas>. At chaos 0 it's a clean
 * low-amplitude carrier; as chaos rises the noise term overtakes the carrier until
 * the line is static — mirroring how the model's text decays at high temperature.
 */
export function Waveform({ chaos, color }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  // keep the latest props without restarting the animation loop
  const state = useRef({ chaos, color });
  state.current = { chaos, color };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let phase = 0;

    // cheap deterministic noise so static shimmers without Math.random churn cost
    const noiseAt = (x: number, t: number) => {
      const v = Math.sin(x * 12.9898 + t * 78.233) * 43758.5453;
      return (v - Math.floor(v)) * 2 - 1;
    };

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();

    const draw = (time: number) => {
      const { chaos: c, color: col } = state.current;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const mid = h / 2;
      ctx.clearRect(0, 0, w, h);

      // graticule
      ctx.strokeStyle = "rgba(70,232,176,0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      const step = 28;
      for (let x = 0; x <= w; x += step) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
      }
      for (let y = mid % step; y <= h; y += step) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(w, y + 0.5);
      }
      ctx.stroke();
      // center axis a touch brighter
      ctx.strokeStyle = "rgba(70,232,176,0.13)";
      ctx.beginPath();
      ctx.moveTo(0, mid + 0.5);
      ctx.lineTo(w, mid + 0.5);
      ctx.stroke();

      const carrierAmp = h * 0.13;
      const noiseAmp = h * 0.4 * c;

      ctx.lineWidth = 1.6;
      ctx.strokeStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 7;
      ctx.beginPath();
      for (let x = 0; x <= w; x++) {
        const k = x / w;
        const carrier =
          Math.sin(k * 18 + phase) * 0.7 + Math.sin(k * 7.3 - phase * 1.4) * 0.3;
        const n = noiseAt(x, time * 0.05) + noiseAt(x * 2.7, time * 0.09) * 0.5;
        const y = mid - carrier * carrierAmp * (1 - c * 0.55) - n * noiseAmp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (reduce) return; // single static frame
      phase += 0.012;
      raf = requestAnimationFrame(draw);
    };

    if (reduce) draw(0);
    else raf = requestAnimationFrame(draw);

    const ro = new ResizeObserver(() => {
      fit();
      if (reduce) draw(0);
    });
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="rig__trace" aria-hidden="true" />;
}
