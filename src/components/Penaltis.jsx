import { useEffect, useRef, useState } from 'react';
import { NOME_ZONA, placar, vez, ZONAS } from '../engine/penaltis.js';
import { confete, som } from '../lib/efeitos.js';

// Disputa de pênaltis estilo FIFA: tela do gol vista de trás do batedor.
// Quem bate toca no canto; quem defende toca para onde o goleiro pula. Sem relógio.

const G = { x0: 50, x1: 250, y0: 46, y1: 142 }; // gol no SVG
const CW = (G.x1 - G.x0) / 3;
const RH = (G.y1 - G.y0) / 2;
const COL = { e: 0, m: 1, d: 2 };
const centro = (z) => ({ x: G.x0 + CW * COL[z[0]] + CW / 2, y: G.y0 + RH * (z[1] === 'a' ? 0 : 1) + RH / 2 });

// onde a bola para quando vai pra fora / na trave
function destino(c) {
  const p = centro(c.chute);
  if (c.res === 'fora') {
    if (c.chute[1] === 'a') return { x: p.x + (c.chute[0] === 'e' ? -16 : c.chute[0] === 'd' ? 16 : 0), y: G.y0 - 22 };
    return { x: c.chute[0] === 'd' ? G.x1 + 22 : G.x0 - 22, y: p.y };
  }
  if (c.res === 'trave') {
    if (c.chute[0] === 'm') return { x: p.x, y: G.y0 };
    return { x: c.chute[0] === 'e' ? G.x0 : G.x1, y: p.y };
  }
  if (c.res === 'defesa') return { x: (p.x + centro(c.pulo).x) / 2, y: p.y + 4 };
  return p;
}

// pose do goleiro conforme o pulo
function pose(pulo) {
  if (!pulo) return 'translate(0px,0px) rotate(0deg)';
  const lado = pulo[0] === 'e' ? -1 : pulo[0] === 'd' ? 1 : 0;
  const alto = pulo[1] === 'a';
  if (!lado) return alto ? 'translate(0px,-26px)' : 'translate(0px,10px) scale(1.15,0.8)';
  return `translate(${lado * (alto ? 62 : 66)}px, ${alto ? -22 : 22}px) rotate(${lado * (alto ? 62 : 84)}deg)`;
}

function Goleiro({ cor, transform }) {
  return (
    <g style={{ transform, transformOrigin: '150px 120px', transformBox: 'view-box', transition: 'transform .55s cubic-bezier(.2,.9,.3,1)' }}>
      <ellipse cx="150" cy="143" rx="16" ry="3" fill="rgba(0,0,0,.35)" />
      {/* pernas */}
      <rect x="141" y="118" width="7" height="24" rx="3" fill="#1b1f24" />
      <rect x="152" y="118" width="7" height="24" rx="3" fill="#1b1f24" />
      {/* braços abertos */}
      <path d="M137 96 L118 84" stroke={cor} strokeWidth="7" strokeLinecap="round" />
      <path d="M163 96 L182 84" stroke={cor} strokeWidth="7" strokeLinecap="round" />
      <circle cx="116" cy="82" r="5" fill="#fff" stroke="#111" strokeWidth="1" />
      <circle cx="184" cy="82" r="5" fill="#fff" stroke="#111" strokeWidth="1" />
      {/* tronco */}
      <rect x="136" y="90" width="28" height="31" rx="7" fill={cor} stroke="rgba(0,0,0,.45)" strokeWidth="1.2" />
      <rect x="136" y="104" width="28" height="4" fill="rgba(0,0,0,.25)" />
      {/* cabeça */}
      <circle cx="150" cy="81" r="8" fill="#e3b48c" stroke="rgba(0,0,0,.4)" strokeWidth="1" />
      <path d="M142 79 q8 -9 16 0" fill="#2a1d14" />
    </g>
  );
}

function Batedor({ cor, numero, chutou }) {
  return (
    <g transform="translate(78 58) scale(0.72)">
    <g style={{ transform: chutou ? 'translate(-14px,-10px) rotate(-8deg)' : 'none', transformOrigin: '150px 230px', transformBox: 'view-box', transition: 'transform .25s ease-out' }}>
      {/* visto de costas, maior por estar perto da "câmera" */}
      <rect x="128" y="205" width="11" height="30" rx="5" fill="#f4f4f4" />
      <rect x="161" y="205" width="11" height="30" rx="5" fill="#f4f4f4" />
      <rect x="124" y="196" width="52" height="20" rx="6" fill="#20262c" />
      <path d="M118 160 q32 -16 64 0 l4 40 h-72 z" fill={cor} stroke="rgba(0,0,0,.45)" strokeWidth="1.5" />
      <path d="M118 166 l-10 30" stroke={cor} strokeWidth="10" strokeLinecap="round" />
      <path d="M182 166 l10 30" stroke={cor} strokeWidth="10" strokeLinecap="round" />
      <text x="150" y="192" textAnchor="middle" fontFamily="Saira Condensed, sans-serif" fontWeight="900" fontSize="24" fill="rgba(0,0,0,.6)">{numero}</text>
      <circle cx="150" cy="148" r="14" fill="#2a1d14" />
    </g>
    </g>
  );
}

function Bolinhas({ cob, lado, total }) {
  const minhas = cob.filter((c) => c.lado === lado);
  const n = Math.max(5, total);
  return (
    <div className="pen-bolas">
      {Array.from({ length: n }, (_, k) => {
        const c = minhas[k];
        return <i key={k} className={c ? (c.res === 'gol' ? 'g' : 'x') : ''} />;
      })}
    </div>
  );
}

export default function Penaltis({ g, passo, jogo, eu, nome, cor, enviar, souHost, destaque }) {
  const d = g.disputa;
  const acabou = !g.penPendente;
  const v = acabou ? null : vez(g);
  const [anim, setAnim] = useState(null); // última cobrança sendo mostrada
  const [voou, setVoou] = useState(false);
  const [revelado, setRevelado] = useState(true);
  const visto = useRef(d.cob.length);

  useEffect(() => {
    if (d.cob.length > visto.current) {
      visto.current = d.cob.length;
      const c = d.cob[d.cob.length - 1];
      setAnim(c);
      setVoou(false);
      setRevelado(false);
      const t1 = setTimeout(() => setVoou(true), 350);
      const t2 = setTimeout(() => {
        setRevelado(true);
        if (c.res === 'gol') som('bum');
        else som('martelo');
      }, 800);
      const t3 = setTimeout(() => setAnim(null), 3000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
    return undefined;
  }, [d.cob]);

  useEffect(() => {
    if (acabou && g.vence === eu.id && !anim) confete(window.innerWidth / 2, window.innerHeight / 3);
  }, [acabou, anim, g.vence, eu.id]);

  const mostrando = anim; // cobrança em animação
  // até a bola chegar, o placar ainda não conta a cobrança
  const dv = revelado ? d : { ...d, cob: d.cob.slice(0, -1) };
  const [pa, pb] = placar(dv);
  const ladoAtual = mostrando ? mostrando.lado : v ? v.lado : 'a';
  const quemBate = ladoAtual === 'a' ? g.a : g.b;
  const quemDefende = ladoAtual === 'a' ? g.b : g.a;
  const batedorNome = mostrando ? mostrando.batedor : v ? v.batedor.nome : '';
  const goleiroNome = mostrando ? mostrando.goleiro : v ? v.goleiro.nome : '';

  const souBatedor = !mostrando && v && eu.id === v.bate;
  const souGoleiro = !mostrando && v && eu.id === v.defende;
  const jaEscolhi = (souBatedor && d.chute) || (souGoleiro && d.pulo);
  const podeTocar = !acabou && !mostrando && (souBatedor || souGoleiro) && !jaEscolhi;
  const [marcada, setMarcada] = useState(null);
  useEffect(() => setMarcada(null), [d.cob.length]);

  const tocar = (z) => {
    if (!podeTocar) return;
    setMarcada(z);
    som('lance');
    enviar({ tipo: 'penalti', passo, jogo, zona: z });
  };

  const bola = mostrando && voou ? destino(mostrando) : { x: 150, y: 176 };
  const escalaBola = mostrando && voou ? 0.55 : 1;
  const totalCob = Math.max(Math.ceil(d.cob.length / 2), 5);

  let titulo = '';
  let sub = '';
  if (mostrando) {
    titulo = !revelado ? '' : { gol: 'GOL!', defesa: 'DEFENDEU!', fora: 'PRA FORA!', trave: 'NA TRAVE!' }[mostrando.res];
    sub = !revelado ? '' : mostrando.res === 'gol' ? `${mostrando.batedor} bateu ${NOME_ZONA[mostrando.chute]}` : mostrando.res === 'defesa' ? `${mostrando.goleiro} foi buscar` : `${mostrando.batedor} desperdiçou`;
  } else if (acabou) {
    // fim da disputa
    titulo = `${nome(g.vence)} passa!`;
    sub = `Pênaltis ${pa} × ${pb}`;
  }

  let instrucao;
  if (acabou) instrucao = null;
  else if (souBatedor && !d.chute) instrucao = <><b>Você bate.</b> Toque no canto do gol.</>;
  else if (souGoleiro && !d.pulo) instrucao = <><b>Você defende.</b> Toque para onde o goleiro pula.</>;
  else if (jaEscolhi) instrucao = <>Escolhido: <b>{NOME_ZONA[souBatedor ? d.chute : d.pulo]}</b>. Esperando {nome(souBatedor ? v.defende : v.bate)}…</>;
  else instrucao = <>{nome(v.bate)} bate · {nome(v.defende)} defende{d.chute ? ' · batedor pronto' : ''}{d.pulo ? ' · goleiro pronto' : ''}</>;

  const minhaZona = souBatedor ? d.chute || marcada : souGoleiro ? d.pulo || marcada : null;

  return (
    <section className={`penaltis ${destaque ? 'meu' : ''}`}>
      <div className="pen-placar">
        <div className="pen-time" style={{ '--c': cor(g.a) }}>
          <span>{nome(g.a)}</span>
          <Bolinhas cob={dv.cob} lado="a" total={totalCob} />
        </div>
        <div className="pen-num">
          <small>{g.ga} × {g.gb} no tempo normal</small>
          <b>{pa} – {pb}</b>
          <small>pênaltis</small>
        </div>
        <div className="pen-time dir" style={{ '--c': cor(g.b) }}>
          <span>{nome(g.b)}</span>
          <Bolinhas cob={dv.cob} lado="b" total={totalCob} />
        </div>
      </div>

      <div className="pen-campo">
        <svg viewBox="0 0 300 240" className={podeTocar ? 'ativo' : ''}>
          <defs>
            <linearGradient id="penCeu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b1a26" />
              <stop offset="1" stopColor="#163246" />
            </linearGradient>
            <linearGradient id="penGrama" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1f6b3a" />
              <stop offset="1" stopColor="#2f8f4f" />
            </linearGradient>
            <pattern id="penRede" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M0 0 L8 8 M8 0 L0 8" stroke="rgba(255,255,255,.18)" strokeWidth=".6" />
            </pattern>
          </defs>
          <rect width="300" height="240" fill="url(#penCeu)" />
          {/* torcida */}
          {Array.from({ length: 60 }, (_, k) => (
            <circle key={k} cx={(k * 37) % 300} cy={10 + ((k * 13) % 26)} r="2.2" fill={['#2b4a63', '#3a5f7a', '#1e3547', '#55778f'][k % 4]} />
          ))}
          <rect y="128" width="300" height="112" fill="url(#penGrama)" />
          {[0, 1, 2, 3, 4].map((k) => (
            <rect key={k} y={128 + k * 24} width="300" height="12" fill="rgba(255,255,255,.035)" />
          ))}
          {/* pequena área e marca do pênalti */}
          <path d="M20 142 L280 142 L300 200 L0 200 Z" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.4" />
          <ellipse cx="150" cy="178" rx="2.6" ry="1.2" fill="#fff" />
          {/* rede e gol */}
          <rect x={G.x0} y={G.y0} width={G.x1 - G.x0} height={G.y1 - G.y0} fill="rgba(0,0,0,.25)" />
          <rect x={G.x0} y={G.y0} width={G.x1 - G.x0} height={G.y1 - G.y0} fill="url(#penRede)" />

          <Goleiro cor={cor(quemDefende)} transform={mostrando && voou ? pose(mostrando.pulo) : 'none'} />

          {/* traves por cima do goleiro */}
          <path d={`M${G.x0} ${G.y1} V${G.y0} H${G.x1} V${G.y1}`} fill="none" stroke="#f5f7f8" strokeWidth="4.5" strokeLinejoin="round" />

          {/* bola */}
          <g style={{ transform: `translate(${bola.x}px, ${bola.y}px) scale(${escalaBola})`, transformBox: 'view-box', transition: 'transform .5s cubic-bezier(.15,.7,.3,1)' }}>
            <circle r="5.2" fill="#fff" stroke="#222" strokeWidth="1" />
            <path d="M0 -2.4 l2.2 1.6 -0.8 2.6 h-2.8 l-0.8 -2.6 z" fill="#222" />
          </g>

          <Batedor cor={cor(quemBate)} numero={Math.max(1, Math.ceil((mostrando ? d.cob.indexOf(mostrando) + 1 : d.cob.length + 1) / 2))} chutou={!!(mostrando && voou)} />
          {/* zonas (por cima de tudo, para o toque pegar) */}
          {ZONAS.map((z) => {
            const c = centro(z);
            const sel = minhaZona === z;
            return (
              <g key={z} className={`zona ${sel ? 'sel' : ''}`} onClick={() => tocar(z)}>
                <rect x={c.x - CW / 2 + 1} y={c.y - RH / 2 + 1} width={CW - 2} height={RH - 2} rx="3" />
                {sel && (
                  <g className="mira">
                    <circle cx={c.x} cy={c.y} r="11" />
                    <path d={`M${c.x - 16} ${c.y}h8M${c.x + 8} ${c.y}h8M${c.x} ${c.y - 16}v8M${c.x} ${c.y + 8}v8`} />
                  </g>
                )}
              </g>
            );
          })}

        </svg>

        <div className="pen-nomes">
          <span style={{ '--c': cor(quemBate) }}>
            <small>Batedor</small>
            {batedorNome}
          </span>
          <span className="dir" style={{ '--c': cor(quemDefende) }}>
            <small>Goleiro</small>
            {goleiroNome}
          </span>
        </div>

        {titulo && (
          <div className={`pen-msg ${mostrando ? mostrando.res : 'fim'}`} key={titulo + d.cob.length}>
            <b>{titulo}</b>
            <span>{sub}</span>
          </div>
        )}
      </div>

      {instrucao && <p className="pen-instr">{instrucao}</p>}
      {souHost && !acabou && !mostrando && (
        <button type="button" className="link" onClick={() => enviar({ tipo: 'penalti', passo, jogo, sortear: true })}>
          Alguém sumiu? Sortear esta cobrança
        </button>
      )}
    </section>
  );
}
