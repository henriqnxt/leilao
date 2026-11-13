import { useEffect, useMemo, useRef, useState } from 'react';
import { coordenadas } from '../engine/formations.js';
import { jogador } from '../data/jogadores.js';
import { som } from '../lib/efeitos.js';
import { ESTILOS, MARCACOES } from '../engine/tatica.js';

// Jogo ao vivo: 90 minutos em 60 s, igual para todos (o relógio vem do dono da sala).
// A bola passa de pé em pé: cada lance do resultado vira uma jogada com passes até a finalização.
export const DURACAO = 60000;
export const PENALTIS = 7000;
export const duracaoDe = (passo) => DURACAO + (passo.jogos.some((g) => g.pen) ? PENALTIS : 0);
const PASSO = 850; // tempo entre toques na bola

function useAgora(ms = 100) {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return agora;
}

function rng(texto) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const curto = (nome) => {
  const p = nome.split(' ');
  return p.length > 1 && nome.length > 11 ? p[p.length - 1] : nome;
};

// Posições no campo deitado (105 x 68). Time A ataca para a direita.
function posicoes(time, emCampo, ladoA) {
  return coordenadas(emCampo, time.formacao).map((c, i) => {
    const px = 6 + ((90 - c.y) / 78) * 40;
    const py = 6 + (c.x / 100) * 56;
    const j = jogador(time.vagas[i]);
    return { x: ladoA ? px : 105 - px, y: ladoA ? py : 68 - py, nome: j ? curto(j.nome) : '', completo: j ? j.nome : '', vaga: c.pos };
  });
}

const CAMINHO = {
  alas: [['ZAG', 'VOL', 'LE', 'LD'], ['LE', 'LD', 'PE', 'PD'], ['PE', 'PD', 'MEI']],
  meio: [['ZAG', 'VOL'], ['VOL', 'MEI'], ['MEI', 'ATA']],
  contra: [['GOL', 'ZAG', 'VOL'], ['PE', 'PD', 'ATA']],
  posse: [['ZAG', 'VOL'], ['VOL', 'MEI'], ['MEI', 'VOL'], ['MEI', 'PE', 'PD']],
};

// Linha do tempo de toques na bola de um jogo inteiro
function montarJogadas(g, A, B, taticas) {
  const r = rng(`${g.a}-${g.b}-${g.ga}-${g.gb}-${g.lances.length}`);
  const time = (t) => (t === g.a ? A : B);
  const escolhe = (lista, vagas) => {
    const ok = lista.map((p, i) => ({ p, i })).filter(({ p }) => vagas.includes(p.vaga) && p.vaga !== 'GOL');
    const pool = ok.length ? ok : lista.map((p, i) => ({ p, i })).filter(({ p }) => p.vaga !== 'GOL');
    return pool[Math.floor(r() * pool.length)].i;
  };
  const toques = [];
  // jogadas que terminam em finalização
  const reservado = [];
  g.lances.forEach((l) => {
    const tFim = (l.min / 90) * DURACAO;
    const lista = time(l.t);
    const estilo = (taticas && taticas[l.t] && taticas[l.t].estilo) || 'meio';
    let quem = lista.findIndex((p) => p.completo === l.nome || p.nome === curto(l.nome));
    if (quem < 0) quem = escolhe(lista, ['ATA', 'PE', 'PD', 'MEI']);
    const cadeia = CAMINHO[estilo].map((vs) => escolhe(lista, vs)).filter((i) => i !== quem);
    const n = cadeia.length;
    cadeia.forEach((i, k) => toques.push({ t: tFim - (n - k + 1) * PASSO, time: l.t, i, tipo: 'passe' }));
    toques.push({ t: tFim - PASSO, time: l.t, i: quem, tipo: 'passe' });
    toques.push({ t: tFim, time: l.t, i: quem, tipo: l.tipo, lance: l });
    reservado.push([tFim - (n + 2) * PASSO, tFim + PASSO * 1.5]);
  });
  // posse de bola no resto do tempo
  const livre = (t) => !reservado.some(([a, b]) => t >= a && t <= b);
  let dono = r() * 100 < g.posse ? g.a : g.b;
  let seguidos = 0;
  for (let t = 300; t < DURACAO; t += PASSO) {
    if (!livre(t)) continue;
    seguidos += 1;
    if (seguidos > 3 + r() * 4) {
      const outro = dono === g.a ? g.b : g.a;
      const chance = dono === g.a ? (100 - g.posse) / 100 : g.posse / 100;
      if (r() < chance + 0.15) {
        dono = outro;
        seguidos = 0;
        toques.push({ t, time: dono, i: escolhe(time(dono), ['ZAG', 'VOL', 'MEI', 'LE', 'LD']), tipo: 'roubada' });
        continue;
      }
    }
    toques.push({ t, time: dono, i: escolhe(time(dono), seguidos < 3 ? ['ZAG', 'VOL', 'LE', 'LD', 'MEI'] : ['MEI', 'PE', 'PD', 'ATA', 'VOL']), tipo: 'passe' });
  }
  return toques.sort((x, y) => x.t - y.t);
}

const TEXTO = { gol: 'GOL!', defesa: 'Defesa de', trave: 'Na trave!', fora: 'Pra fora' };
const sigla = (n) => n.replace(/ Bot$/, '').slice(0, 3).toUpperCase();

export default function AoVivo({ passo, inicio, estado, eu, nome, cor }) {
  const agora = useAgora();
  const passou = Math.max(0, agora - inicio);
  const min = Math.min(90, Math.floor((passou / DURACAO) * 90));
  const nosPenaltis = passou >= DURACAO;
  const jogos = passo.jogos.filter((g) => !g.folga);
  const meuJogo = jogos.find((g) => g.a === eu.id || g.b === eu.id);
  const [escolhido, setEscolhido] = useState(null);
  const g = jogos.find((x) => `${x.a}-${x.b}` === escolhido) || meuJogo || jogos[0];
  const taticas = (estado.camp && estado.camp.taticas) || {};

  const placar = (x) => [
    x.lances.filter((l) => l.tipo === 'gol' && l.t === x.a && l.min <= min).length,
    x.lances.filter((l) => l.tipo === 'gol' && l.t === x.b && l.min <= min).length,
  ];
  const [pa, pb] = placar(g);

  const golsAnt = useRef(-1);
  const totalGols = jogos.reduce((s, x) => s + placar(x)[0] + placar(x)[1], 0);
  useEffect(() => {
    if (golsAnt.current >= 0 && totalGols > golsAnt.current) som('bum');
    golsAnt.current = totalGols;
  }, [totalGols]);

  const { emCampo } = estado.config;
  const A = useMemo(() => posicoes(estado.times[g.a], emCampo, true), [estado.times, g.a, emCampo]);
  const B = useMemo(() => posicoes(estado.times[g.b], emCampo, false), [estado.times, g.b, emCampo]);
  const toques = useMemo(() => montarJogadas(g, A, B, taticas), [g, A, B, taticas]);

  // quem está com a bola agora
  let k = -1;
  for (let i = 0; i < toques.length && toques[i].t <= passou; i += 1) k = i;
  const atual = nosPenaltis ? null : toques[k];
  const anterior = k > 0 ? toques[k - 1] : null;
  const lista = (t) => (t === g.a ? A : B);
  const comBola = atual ? lista(atual.time)[atual.i] : null;
  const atacaA = atual ? atual.time === g.a : true;

  // bola: no pé de quem tem a posse; na finalização vai para o gol
  let bola = { x: 52.5, y: 34 };
  if (atual && comBola) {
    bola = { x: comBola.x + (atacaA ? 1.5 : -1.5), y: comBola.y };
    const desde = passou - atual.t;
    if (['gol', 'defesa', 'fora', 'trave'].includes(atual.tipo) && desde > 250) {
      const gx = atacaA ? 104 : 1;
      if (atual.tipo === 'gol') bola = { x: atacaA ? 105 : 0, y: 31 + ((atual.i * 7) % 6) };
      else if (atual.tipo === 'defesa') bola = { x: atacaA ? 100 : 5, y: 34 };
      else if (atual.tipo === 'trave') bola = { x: gx, y: 30.3 };
      else bola = { x: gx, y: atual.i % 2 ? 24 : 44 };
    }
  }

  // time com a bola sobe, o outro recua; todo mundo puxa um pouco para o lado da bola
  const t = passou / 1000;
  const mover = (p, k2, doA) => {
    const ataca = atual && ((doA && atacaA) || (!doA && !atacaA));
    const dir = doA ? 1 : -1;
    const sobe = p.vaga === 'GOL' ? 0 : ataca ? 7 : -4;
    const puxa = p.vaga === 'GOL' ? 0 : (bola.y - p.y) * 0.12;
    return { x: p.x + dir * sobe + Math.sin(t * 0.8 + k2) * 0.8, y: p.y + puxa + Math.cos(t * 0.7 + k2 * 1.7) * 0.8 };
  };
  const PA = A.map((p, i) => ({ ...p, ...mover(p, i, true) }));
  const PB = B.map((p, i) => ({ ...p, ...mover(p, i, false) }));
  const pos = (tq) => (tq.time === g.a ? PA : PB)[tq.i];

  const flashGol = atual && atual.tipo === 'gol' && passou - atual.t < 2600;
  let narra = 'Bola rolando…';
  if (nosPenaltis) narra = g.pen ? 'Disputa de pênaltis!' : 'Fim de jogo';
  else if (atual && comBola) {
    if (atual.tipo === 'gol') narra = `GOOOL! ${atual.lance.nome} (${atual.lance.como || 'finalização'})`;
    else if (atual.tipo === 'defesa') narra = `${atual.lance.gk} defende o chute de ${comBola.nome}!`;
    else if (atual.tipo === 'trave') narra = `${comBola.nome} acerta a trave!`;
    else if (atual.tipo === 'fora') narra = `${comBola.nome} chuta pra fora`;
    else if (atual.tipo === 'roubada') narra = `${comBola.nome} rouba a bola`;
    else if (anterior && anterior.time === atual.time && anterior.tipo === 'passe') narra = `${lista(anterior.time)[anterior.i].nome} toca para ${comBola.nome}`;
    else narra = `${comBola.nome} com a bola`;
  }
  const feed = [...g.lances].filter((l) => l.min <= min).reverse();
  const tat = (id) => {
    const x = taticas[id];
    return x ? `${ESTILOS.find((e) => e.id === x.estilo).nome} · ${MARCACOES.find((m) => m.id === x.marcacao).nome}` : '';
  };
  const tempo = nosPenaltis ? 'PÊN' : min < 45 ? '1º T' : '2º T';

  return (
    <section className="aovivo">
      <div className="tv">
        <span className="tv-ao">● AO VIVO</span>
        <div className="tv-placar">
          <span className="tv-time" style={{ '--c': cor(g.a) }}>
            <i />
            {sigla(nome(g.a))}
          </span>
          <b>
            {pa}-{pb}
          </b>
          <span className="tv-time" style={{ '--c': cor(g.b) }}>
            {sigla(nome(g.b))}
            <i />
          </span>
        </div>
        <span className="tv-min">
          {tempo} {nosPenaltis ? '' : `${String(min).padStart(2, '0')}'`}
        </span>
      </div>
      <div className="av-nomes">
        <div>
          <b style={{ color: cor(g.a) }}>{nome(g.a)}</b>
          <span>{tat(g.a)}</span>
        </div>
        <div>
          <b style={{ color: cor(g.b) }}>{nome(g.b)}</b>
          <span>{tat(g.b)}</span>
        </div>
      </div>

      <div className={`av-campo ${flashGol ? 'balanca' : ''}`}>
        <svg viewBox="0 0 105 68" aria-label={`Campo: ${nome(g.a)} contra ${nome(g.b)}`}>
          <defs>
            <pattern id="faixas" width="10.5" height="68" patternUnits="userSpaceOnUse">
              <rect width="5.25" height="68" fill="#1b7445" />
              <rect x="5.25" width="5.25" height="68" fill="#176a3f" />
            </pattern>
            <radialGradient id="luz" cx=".5" cy=".45" r=".7">
              <stop offset="0" stopColor="#fff" stopOpacity=".14" />
              <stop offset="1" stopColor="#000" stopOpacity=".35" />
            </radialGradient>
          </defs>
          <rect width="105" height="68" fill="url(#faixas)" />
          <rect width="105" height="68" fill="url(#luz)" />
          <g fill="none" stroke="rgba(255,255,255,.6)" strokeWidth=".3">
            <rect x="1" y="1" width="103" height="66" />
            <line x1="52.5" y1="1" x2="52.5" y2="67" />
            <circle cx="52.5" cy="34" r="9.15" />
            <circle cx="52.5" cy="34" r=".5" fill="rgba(255,255,255,.6)" />
            <rect x="1" y="13.85" width="16.5" height="40.3" />
            <rect x="87.5" y="13.85" width="16.5" height="40.3" />
            <rect x="1" y="24.85" width="5.5" height="18.3" />
            <rect x="98.5" y="24.85" width="5.5" height="18.3" />
            <path d="M17.5 26.7 A9.15 9.15 0 0 1 17.5 41.3 M87.5 26.7 A9.15 9.15 0 0 0 87.5 41.3" />
          </g>
          <g className="redes">
            <rect x="-1.5" y="30.3" width="2.5" height="7.4" />
            <rect x="104" y="30.3" width="2.5" height="7.4" />
          </g>
          {anterior && atual && anterior.time === atual.time && atual.tipo === 'passe' && (
            <line key={k} className="rastro" x1={pos(anterior).x} y1={pos(anterior).y} x2={pos(atual).x} y2={pos(atual).y} />
          )}
          {[...PA.map((p, i) => ({ ...p, c: cor(g.a), dono: atual && atual.time === g.a && atual.i === i })), ...PB.map((p, i) => ({ ...p, c: cor(g.b), dono: atual && atual.time === g.b && atual.i === i }))].map((p, i) => (
            <g key={i} className={`jog ${p.dono ? 'dono' : ''}`} style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
              <ellipse cx=".4" cy="2.4" rx="2" ry=".7" fill="rgba(0,0,0,.35)" />
              {p.dono && <circle r="3.4" className="halo" />}
              <circle r="2" fill={p.c} stroke="rgba(0,0,0,.65)" strokeWidth=".35" />
              <text y="4.7" textAnchor="middle">
                {p.nome}
              </text>
            </g>
          ))}
          <g className="bola" style={{ transform: `translate(${bola.x}px, ${bola.y}px)` }}>
            <ellipse cx=".4" cy="1.3" rx="1.1" ry=".4" fill="rgba(0,0,0,.4)" />
            <circle r="1.05" fill="#fff" stroke="#222" strokeWidth=".25" />
            <circle r=".35" fill="#222" />
          </g>
        </svg>
        <div className="narracao" key={narra}>
          {narra}
        </div>
        {flashGol && (
          <div className="av-gol">
            <b>GOL!</b>
            <span>{atual.lance.nome}</span>
          </div>
        )}
        {nosPenaltis && g.pen && (
          <div className="av-gol pen">
            <b>{passou > DURACAO + PENALTIS * 0.55 ? `${g.pen[0]} × ${g.pen[1]}` : 'PÊNALTIS'}</b>
            <span>{passou > DURACAO + PENALTIS * 0.55 ? `${nome(g.vence)} passa!` : 'quem vai bater?'}</span>
          </div>
        )}
      </div>

      <div className="posse">
        <i style={{ width: `${g.posse}%`, background: cor(g.a) }} />
        <i style={{ width: `${100 - g.posse}%`, background: cor(g.b) }} />
      </div>
      <div className="posse-txt">
        <span>{g.posse}% posse</span>
        <span>{100 - g.posse}%</span>
      </div>

      <div className="av-feed">
        {feed.length === 0 && <p className="dica">Nenhum lance de perigo ainda.</p>}
        {feed.slice(0, 6).map((l, i) => (
          <div key={`${l.min}-${i}`} className={`lance ${l.tipo}`}>
            <span className="m">{l.min}'</span>
            <span>
              <b>{TEXTO[l.tipo]}</b> {l.tipo === 'defesa' ? `${l.gk} pega o chute de ${l.nome}` : l.nome}
              {l.como ? <span className="como"> · {l.como}</span> : null}
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
            const id = `${x.a}-${x.b}`;
            return (
              <button type="button" key={id} className={`av-outro ${x === g ? 'atual' : ''}`} onClick={() => setEscolhido(id)}>
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
