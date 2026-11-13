// Som (sintetizado, sem arquivos) e confete. Som começa desligado.
let ac = null;
let ligado = false;
try {
  ligado = localStorage.getItem('leilao:som') === '1';
} catch {
  ligado = false;
}

export const somLigado = () => ligado;
export function alternarSom() {
  ligado = !ligado;
  try {
    localStorage.setItem('leilao:som', ligado ? '1' : '0');
  } catch {
    /* sem armazenamento */
  }
  if (ligado) som('lance');
  return ligado;
}

export function som(tipo) {
  if (!ligado) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const n = ac.currentTime;
    const tom = (f1, f2, d, forma = 'sine', g = 0.06) => {
      const o = ac.createOscillator();
      const v = ac.createGain();
      o.type = forma;
      o.frequency.setValueAtTime(f1, n);
      o.frequency.exponentialRampToValueAtTime(f2, n + d);
      v.gain.setValueAtTime(g, n);
      v.gain.exponentialRampToValueAtTime(0.0001, n + d);
      o.connect(v).connect(ac.destination);
      o.start(n);
      o.stop(n + d);
    };
    const ruido = (d, f, g = 0.15, q = 1) => {
      const b = ac.createBuffer(1, Math.floor(ac.sampleRate * d), ac.sampleRate);
      const a = b.getChannelData(0);
      for (let i = 0; i < a.length; i += 1) a[i] = (Math.random() * 2 - 1) * (1 - i / a.length);
      const s = ac.createBufferSource();
      const fl = ac.createBiquadFilter();
      const v = ac.createGain();
      s.buffer = b;
      fl.type = 'bandpass';
      fl.frequency.value = f;
      fl.Q.value = q;
      v.gain.value = g;
      s.connect(fl).connect(v).connect(ac.destination);
      s.start(n);
    };
    if (tipo === 'lance') tom(660, 990, 0.09, 'triangle', 0.07);
    if (tipo === 'tique') tom(1200, 1100, 0.04, 'square', 0.025);
    if (tipo === 'martelo') {
      ruido(0.12, 1800, 0.35, 2);
      tom(140, 50, 0.25, 'sine', 0.35);
    }
    if (tipo === 'vira') ruido(0.5, 700, 0.12, 0.6);
    if (tipo === 'bum') {
      tom(90, 40, 0.7, 'sine', 0.4);
      ruido(0.6, 300, 0.2, 0.5);
    }
  } catch {
    /* navegador sem áudio */
  }
}

let parts = [];
let cv = null;
let cx = null;
export function confete(x, y) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!cv) {
    cv = document.createElement('canvas');
    cv.id = 'confete';
    document.body.appendChild(cv);
    cx = cv.getContext('2d');
  }
  const d = window.devicePixelRatio || 1;
  cv.width = window.innerWidth * d;
  cv.height = window.innerHeight * d;
  const parado = !parts.length;
  for (let i = 0; i < 140; i += 1) {
    parts.push({ x: x * d, y: y * d, vx: (Math.random() - 0.5) * 22, vy: -Math.random() * 18 - 4, s: ((4 + Math.random() * 6) * d) / 1.4, c: ['#f2c14e', '#eef6f0', '#3ddc84', '#ff4d5e', '#9fd6ff'][i % 5], r: Math.random() * 6, l: 100 });
  }
  if (parado) requestAnimationFrame(anima);
}
function anima() {
  cx.clearRect(0, 0, cv.width, cv.height);
  parts = parts.filter((p) => (p.l -= 1) > 0);
  parts.forEach((p) => {
    p.vy += 0.5;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.r += 0.2;
    cx.save();
    cx.translate(p.x, p.y);
    cx.rotate(p.r);
    cx.fillStyle = p.c;
    cx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 1.6);
    cx.restore();
  });
  if (parts.length) requestAnimationFrame(anima);
  else cx.clearRect(0, 0, cv.width, cv.height);
}
