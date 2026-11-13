import { useEffect, useRef, useState } from 'react';
import { coordenadas } from '../engine/formations.js';
import { jogador } from '../data/jogadores.js';
import { som } from '../lib/efeitos.js';

// Jogo ao vivo: 90 minutos em ~32 s, igual para todos (o relógio vem do dono da sala).
export const DURACAO = 32000;
export const PENALTIS = 5000;
export const duracaoDe = (passo) => DURACAO + (passo.jogos.some((g) => g.pen) ? PENALTIS : 0);

function useAgora(ms = 120) {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return agora;
}

const curto = (nome) => {
  const p = nome.split(' ');
  return p.length > 1 && nome.length > 11 ? p[p.length - 1] : nome;
};

// Posições dos 11 (ou 5) no campo deitado. Time A ataca para a direita.
function posicoes(time, emCampo, ladoA) {
  return coordenadas(emCampo, time.formacao).map((c, i) => {
    const px = 6 + ((90 - c.y) / 78) * 40; // goleiro perto do gol, atacantes perto do meio
    const py = 6 + (c.x / 100) * 56;
    const j = jogador(time.vagas[i]);
    return { x: ladoA ? px : 105 - px, y: ladoA ? py : 68 - py, nome: j ? (j.base ? 'Base' : curto(j.nome)) : '', vaga: c.pos };
  });
}

const TEXTO = { gol: 'GOL!', defesa: 'Defesa de', trave: 'Na trave!', fora: 'Pra fora' };

export default function AoVivo({ passo, inicio, estado, eu, nome, cor }) {
  const agora = useAgora();
  const passou = Math.max(0, agora - inicio);
  const min = Math.min(90, Math.floor((passou / DURACAO) * 90));
  const nosPenaltis = passou >= DURACAO;
  const meuJogo = passo.jogos.find((g) => !g.folga && (g.a === eu.id || g.b === eu.id));
  const [escolhido, setEscolhido] = useState(null);
  const jogos = passo.jogos.filter((g) => !g.folga);
  const g = jogos.find((x) => `${x.a}-${x.b}` === escolhido) || meuJogo || jogos[0];

  const placar = (x) => [x.lances.filter((l) => l.tipo === 'gol' && l.t === x.a && l.min <= min).length, x.lances.filter((l) => l.tipo === 'gol' && l.t === x.b && l.min <= min).length];
  const [pa, pb] = placar(g);

  // som de gol
  const golsAnt = useRef(-1);
  const totalGols = jogos.reduce((s, x) => s + placar(x)[0] + placar(x)[1], 0);
  useEffect(() => {
    if (golsAnt.current >= 0 && totalGols > golsAnt.current) som('martelo');
    golsAnt.current = totalGols;
  }, [totalGols]);

  const { emCampo } = estado.config;
  const A = posicoes(estado.times[g.a], emCampo, true);
  const B = posicoes(estado.times[g.b], emCampo, false);

  // bola: vai até quem finalizou nos lances; no resto, passeia pelo meio puxada pela posse
  const recente = [...g.lances].reverse().find((l) => l.min <= min && min - l.min <= 2);
  let bola;
  let destaque = null;
  if (recente && !nosPenaltis) {
    const lado = recente.t === g.a ? A : B;
    const quem = lado.find((p) => p.nome === curto(recente.nome)) || lado[lado.length - 1];
    destaque = quem;
    const gol = recente.t === g.a ? 102 : 3;
    bola = min === recente.min ? { x: quem.x, y: quem.y } : { x: recente.tipo === 'fora' ? gol : gol + (recente.t === g.a ? -2 : 2), y: recente.tipo === 'fora' ? 22 : 34 };
  } else {
    const t = passou / 1000;
    const vies = (g.posse - 50) / 50;
    bola = { x: 52.5 + Math.sin(t * 0.9) * 26 + vies * 10, y: 34 + Math.sin(t * 1.7 + 1) * 20 };
  }
  const flashGol = recente && recente.tipo === 'gol' && recente.min === min;

  const feed = [...g.lances].filter((l) => l.min <= min).reverse();

  return (
    <section className="painel aovivo">
      <div className="av-topo">
        <span className="av-ao">● Ao vivo</span>
        <span className="sobre">{passo.nome}</span>
        <span className="av-min">{nosPenaltis && g.pen ? 'Pênaltis' : `${min}'`}</span>
      </div>
      <div className="av-placar">
        <span className="t a" style={{ color: cor(g.a) }}>
          {nome(g.a)}
        </span>
        <b>
          {pa} × {pb}
        </b>
        <span className="t" style={{ color: cor(g.b) }}>
          {nome(g.b)}
        </span>
      </div>
      {nosPenaltis && g.pen && <p className="av-pen">Pênaltis: {passou > DURACAO + PENALTIS * 0.6 ? `${g.pen[0]} × ${g.pen[1]}` : '…'}</p>}
      <div className="posse">
        <i style={{ width: `${g.posse}%`, background: cor(g.a) }} />
        <i style={{ width: `${100 - g.posse}%`, background: cor(g.b) }} />
      </div>
      <div className="posse-txt">
        <span>{g.posse}% posse</span>
        <span>{100 - g.posse}%</span>
      </div>

      <div className="av-campo">
        <svg viewBox="0 0 105 68" aria-label={`Campo: ${nome(g.a)} contra ${nome(g.b)}`}>
          <defs>
            <pattern id="faixas" width="15" height="68" patternUnits="userSpaceOnUse">
              <rect width="7.5" height="68" fill="#18663e" />
              <rect x="7.5" width="7.5" height="68" fill="#145a36" />
            </pattern>
          </defs>
          <rect width="105" height="68" fill="url(#faixas)" />
          <g fill="none" stroke="rgba(255,255,255,.55)" strokeWidth=".35">
            <rect x=".5" y=".5" width="104" height="67" />
            <line x1="52.5" y1="0" x2="52.5" y2="68" />
            <circle cx="52.5" cy="34" r="9.15" />
            <rect x=".5" y="13.85" width="16.5" height="40.3" />
            <rect x="88" y="13.85" width="16.5" height="40.3" />
            <rect x=".5" y="24.85" width="5.5" height="18.3" />
            <rect x="99" y="24.85" width="5.5" height="18.3" />
          </g>
          {[...A.map((p) => ({ ...p, c: cor(g.a) })), ...B.map((p) => ({ ...p, c: cor(g.b) }))].map((p, k) => (
            <g key={k} className="jog" style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
              {destaque === p && <circle r="3.6" fill="none" stroke="#fff" strokeWidth=".5" className="pulso" />}
              <circle r="2.1" fill={p.c} stroke="rgba(0,0,0,.6)" strokeWidth=".4" />
              <text y="4.6" textAnchor="middle">
                {p.nome}
              </text>
            </g>
          ))}
          <g className="bola" style={{ transform: `translate(${bola.x}px, ${bola.y}px)` }}>
            <circle r="1.3" fill="#fff" stroke="#111" strokeWidth=".3" />
          </g>
        </svg>
        {flashGol && <div className="av-gol">GOL!</div>}
      </div>

      <div className="av-feed">
        {feed.length === 0 && <p className="dica">Bola rolando…</p>}
        {feed.slice(0, 6).map((l, k) => (
          <div key={`${l.min}-${k}`} className={`lance ${l.tipo}`}>
            <span className="m">{l.min}'</span>
            <span>
              <b>{TEXTO[l.tipo]}</b> {l.tipo === 'defesa' ? `${l.gk} pega o chute de ${l.nome}` : l.nome}
              <span style={{ color: 'var(--mute)' }}> · {nome(l.t)}</span>
            </span>
          </div>
        ))}
      </div>

      {jogos.length > 1 && (
        <div className="av-outros">
          <span className="sobre">Outros jogos — toque para assistir</span>
          {jogos.map((x) => {
            const [a, b] = placar(x);
            const k = `${x.a}-${x.b}`;
            return (
              <button type="button" key={k} className={`av-outro ${x === g ? 'atual' : ''}`} onClick={() => setEscolhido(k)}>
                <span className="t a">{nome(x.a)}</span>
                <b>
                  {a} × {b}
                </b>
                <span className="t">{nome(x.b)}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
