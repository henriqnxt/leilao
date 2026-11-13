import { useEffect, useRef } from 'react';

// Fundo vivo: refletores varrendo, névoa, torcida em silhueta e flashes de câmera.
export default function Estadio() {
  const ref = useRef(null);

  useEffect(() => {
    const sc = ref.current;
    const sx = sc.getContext('2d');
    const parado = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0;
    let H = 0;
    let torcida = null;
    let nevoa = [];
    let flashes = [];
    let raf = 0;
    let ultimo = 0;

    function medir() {
      const d = Math.min(window.devicePixelRatio || 1, 1.5);
      W = sc.width = window.innerWidth * d;
      H = sc.height = window.innerHeight * d;
      torcida = document.createElement('canvas');
      torcida.width = W;
      torcida.height = H * 0.3;
      const c = torcida.getContext('2d');
      for (let fila = 0; fila < 7; fila += 1) {
        const y = torcida.height * (0.18 + fila * 0.13);
        const r = Math.max(5, W / 220) * (1 + fila * 0.12);
        for (let x = -r; x < W + r; x += r * 1.7) {
          const jx = x + (Math.random() - 0.5) * r;
          c.fillStyle = `rgb(${8 + fila * 3},${16 + fila * 3},${14 + fila * 3})`;
          c.beginPath();
          c.arc(jx, y + (Math.random() - 0.5) * r * 0.6, r, 0, Math.PI * 2);
          c.fill();
          c.fillRect(jx - r * 1.1, y + r * 0.6, r * 2.2, r * 2);
        }
      }
      nevoa = Array.from({ length: 30 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.75, r: 60 + Math.random() * 160, v: 0.1 + Math.random() * 0.3 }));
    }

    function quadro(ts) {
      raf = parado ? 0 : requestAnimationFrame(quadro);
      if (ts - ultimo < 33 && !parado) return; // ~30 fps basta
      ultimo = ts;
      const t = ts / 1000;
      const g = sx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#03070a');
      g.addColorStop(0.62, '#071512');
      g.addColorStop(1, '#0b2a1d');
      sx.fillStyle = g;
      sx.fillRect(0, 0, W, H);
      const gy = H * 0.78;
      for (let i = 0; i < 14; i += 1) {
        sx.fillStyle = i % 2 ? '#0d3322' : '#0f3a27';
        sx.fillRect((i * W) / 14, gy, W / 14 + 1, H - gy);
      }
      const fade = sx.createLinearGradient(0, gy, 0, H);
      fade.addColorStop(0, 'rgba(4,9,10,.85)');
      fade.addColorStop(1, 'rgba(4,9,10,.35)');
      sx.fillStyle = fade;
      sx.fillRect(0, gy, W, H - gy);

      sx.globalCompositeOperation = 'lighter';
      [[0.08, 0.02, 1], [0.32, 0, -1], [0.68, 0, 1], [0.92, 0.02, -1]].forEach(([fx, fy, dir], i) => {
        const x = fx * W;
        const y = fy * H;
        const a = Math.PI / 2 + dir * (0.35 + Math.sin(t * 0.25 + i) * 0.18);
        const len = H * 1.1;
        const sp = 0.11;
        const x1 = x + Math.cos(a - sp) * len;
        const y1 = y + Math.sin(a - sp) * len;
        const x2 = x + Math.cos(a + sp) * len;
        const y2 = y + Math.sin(a + sp) * len;
        const lg = sx.createLinearGradient(x, y, (x1 + x2) / 2, (y1 + y2) / 2);
        lg.addColorStop(0, 'rgba(255,240,200,.15)');
        lg.addColorStop(1, 'rgba(255,240,200,0)');
        sx.fillStyle = lg;
        sx.beginPath();
        sx.moveTo(x, y);
        sx.lineTo(x1, y1);
        sx.lineTo(x2, y2);
        sx.closePath();
        sx.fill();
        const hg = sx.createRadialGradient(x, y, 0, x, y, W * 0.06);
        hg.addColorStop(0, 'rgba(255,250,230,.5)');
        hg.addColorStop(1, 'rgba(255,250,230,0)');
        sx.fillStyle = hg;
        sx.fillRect(x - W * 0.06, y - W * 0.06, W * 0.12, W * 0.12);
      });
      nevoa.forEach((h) => {
        h.x += h.v;
        if (h.x - h.r > W) h.x = -h.r;
        const hg = sx.createRadialGradient(h.x, h.y, 0, h.x, h.y, h.r);
        hg.addColorStop(0, 'rgba(180,220,200,.025)');
        hg.addColorStop(1, 'rgba(180,220,200,0)');
        sx.fillStyle = hg;
        sx.fillRect(h.x - h.r, h.y - h.r, h.r * 2, h.r * 2);
      });
      sx.globalCompositeOperation = 'source-over';
      sx.drawImage(torcida, 0, H * 0.5);
      if (Math.random() < 0.3) flashes.push({ x: Math.random() * W, y: H * 0.52 + Math.random() * H * 0.24, l: 1 });
      sx.globalCompositeOperation = 'lighter';
      flashes = flashes.filter((f) => (f.l -= 0.1) > 0);
      flashes.forEach((f) => {
        const r = W / 160;
        const fg = sx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * 4);
        fg.addColorStop(0, `rgba(255,255,255,${0.9 * f.l})`);
        fg.addColorStop(1, 'rgba(255,255,255,0)');
        sx.fillStyle = fg;
        sx.fillRect(f.x - r * 4, f.y - r * 4, r * 8, r * 8);
      });
      sx.globalCompositeOperation = 'source-over';
      const vg = sx.createRadialGradient(W / 2, H * 0.45, H * 0.2, W / 2, H * 0.45, Math.max(W, H) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,.7)');
      sx.fillStyle = vg;
      sx.fillRect(0, 0, W, H);
    }

    medir();
    window.addEventListener('resize', medir);
    raf = requestAnimationFrame(quadro);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', medir);
    };
  }, []);

  return (
    <>
      <canvas id="estadio" ref={ref} aria-hidden="true" />
      <div className="grao" />
    </>
  );
}
