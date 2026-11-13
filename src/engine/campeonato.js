// Campeonato: simula as partidas a partir da força dos times (com o rendimento por posição).
// Tudo é sorteado de uma vez, com semente, quando o dono começa. A tela revela rodada por rodada.
import { jogador } from '../data/jogadores.js';
import { vagasDa } from './formations.js';
import { notaNaVaga, SETOR } from './posicoes.js';
import { encaixe, melhorEstilo, TATICA_PADRAO, valida } from './tatica.js';
import { efeitos } from './instrucoes.js';

function rng(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(r, lambda) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= r();
  } while (p > L);
  return k - 1;
}

const media = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0);

export function forca(s, tid) {
  const t = s.times[tid];
  const posicoes = vagasDa(s.config.emCampo, t.formacao);
  const por = { GOL: [], DEF: [], MEI: [], ATA: [] };
  const elenco = [];
  t.vagas.forEach((id, k) => {
    const j = jogador(id);
    const n = notaNaVaga(j, posicoes[k], posicoes.length);
    por[SETOR[posicoes[k]]].push(n);
    elenco.push({ id, nome: j ? j.nome : '?', vaga: posicoes[k], n });
  });
  const linha = [...por.DEF, ...por.MEI, ...por.ATA];
  const set = (k) => (por[k].length ? media(por[k]) : media(linha));
  const GOL = set('GOL');
  const DEF = set('DEF');
  const MEI = set('MEI');
  const ATA = set('ATA');
  const mods = efeitos(elenco, t.instrucoes || {});
  elenco.forEach((e, k) => {
    e.mult = mods.multGol[k];
  });
  return {
    ataque: 0.55 * ATA + 0.35 * MEI + 0.1 * DEF + mods.ataque,
    defesa: 0.45 * DEF + 0.3 * GOL + 0.25 * MEI + mods.defesa,
    mods,
    geral: Math.round(media(elenco.map((e) => e.n))),
    GOL, DEF, MEI, ATA, elenco,
  };
}

const PESO_GOL = { ATA: 5, PE: 4, PD: 4, MEI: 3, VOL: 1.4, LE: 0.8, LD: 0.8, ZAG: 0.6, GOL: 0 };

function artilheiro(r, elenco) {
  const peso = (e) => PESO_GOL[e.vaga] * (e.n / 80) * (e.mult || 1);
  const lista = elenco.filter((e) => PESO_GOL[e.vaga] > 0);
  const total = lista.reduce((a, e) => a + peso(e), 0);
  let x = r() * total;
  for (const e of lista) {
    x -= peso(e);
    if (x <= 0) return e.nome;
  }
  return lista.length ? lista[lista.length - 1].nome : '';
}

const COMO = {
  alas: ['jogada pela ponta', 'cruzamento da linha de fundo', 'lateral que chegou na frente'],
  meio: ['tabela pelo meio', 'enfiada de bola', 'chute de fora da área'],
  contra: ['contra-ataque', 'contra-ataque em velocidade'],
  posse: ['troca de passes', 'jogada trabalhada'],
};

// Partida em 6 blocos de 15 minutos: a tática e o placar mudam o ritmo ao longo do jogo.
function jogar(r, F, a, b, mata, T) {
  const ta = T[a];
  const tb = T[b];
  // metade qualidade, metade tática (encaixe do elenco no estilo escolhido)
  const ataque = (x, t) => 0.5 * F[x].ataque + 0.5 * (0.6 * encaixe(F[x], t.estilo) + 0.4 * F[x].ataque);
  const base = (x, tx, y, k) => k * Math.exp((ataque(x, tx) - F[y].defesa) / 13);
  let la = base(a, ta, b, 1.65);
  let lb = base(b, tb, a, 1.5);
  // estilo contra estilo
  const confronto = (t, outro, fy, fx) => {
    let f = 1;
    if (t.estilo === 'contra') f *= (outro.marcacao === 'alta' ? 1.25 : outro.marcacao === 'recuada' ? 0.85 : 1) * (fy.mods && fy.mods.libero ? 0.88 : 1);
    if (t.estilo === 'meio') f *= outro.marcacao === 'recuada' ? 0.9 : outro.marcacao === 'alta' ? 1.05 : 1;
    if (t.estilo === 'posse' && outro.marcacao === 'alta') f *= 0.9;
    if (t.estilo === 'alas') {
      const lat = fy.elenco.filter((e) => e.vaga === 'LE' || e.vaga === 'LD').map((e) => e.n);
      const defLado = lat.length ? lat.reduce((p, q) => p + q, 0) / lat.length : fy.DEF - 4;
      f *= Math.exp((encaixe(fx, 'alas') - defLado) / 25);
    }
    if (t.marcacao === 'alta') f *= 1.12;
    if (t.marcacao === 'recuada') f *= 0.85;
    if (outro.marcacao === 'alta') f *= 1.1; // espaço nas costas de quem pressiona
    if (outro.marcacao === 'recuada') f *= 0.8;
    if (outro.estilo === 'posse') f *= 0.92; // quem tem a bola não deixa jogar
    return f;
  };
  la *= confronto(ta, tb, F[b], F[a]);
  lb *= confronto(tb, ta, F[a], F[b]);
  la = Math.min(3.4, Math.max(0.3, la));
  lb = Math.min(3.4, Math.max(0.3, lb));

  const goleiro = (t) => (F[t].elenco.find((e) => e.vaga === 'GOL') || { nome: 'o goleiro' }).nome;
  const como = (t) => {
    const tt = T[t];
    if ((tt.marcacao === 'alta' && r() < 0.22) || (F[t].mods.pressao && r() < 0.12)) return 'roubada na pressão';
    const l = COMO[tt.estilo];
    return l[Math.floor(r() * l.length)];
  };
  const lances = [];
  let ga = 0;
  let gb = 0;
  for (let bloco = 0; bloco < 6; bloco += 1) {
    const ini = bloco * 15;
    let fa = 1;
    let fb = 1;
    if (ini >= 60) {
      if (ta.perdendo === 'pressionar' && ga < gb) { fa *= 1.4; fb *= 1.25; }
      if (tb.perdendo === 'pressionar' && gb < ga) { fb *= 1.4; fa *= 1.25; }
    }
    if (ini >= 75) {
      if (ta.marcacao === 'alta') fa *= 0.88; // cansaço
      if (tb.marcacao === 'alta') fb *= 0.88;
    }
    const gerar = (t, outro, l) => {
      const nG = poisson(r, (l / 6));
      const nP = poisson(r, (l / 6) * 1.8);
      const out = [];
      for (let k = 0; k < nG; k += 1) out.push({ t, nome: artilheiro(r, F[t].elenco), min: ini + 1 + Math.floor(r() * 15), tipo: 'gol', como: como(t) });
      for (let k = 0; k < nP; k += 1) {
        const x = r();
        out.push({ t, nome: artilheiro(r, F[t].elenco), min: ini + 1 + Math.floor(r() * 15), tipo: x < 0.45 ? 'defesa' : x < 0.6 ? 'trave' : 'fora', gk: goleiro(outro), como: como(t) });
      }
      return out;
    };
    const novos = [...gerar(a, b, la * fa), ...gerar(b, a, lb * fb)];
    ga += novos.filter((l) => l.tipo === 'gol' && l.t === a).length;
    gb += novos.filter((l) => l.tipo === 'gol' && l.t === b).length;
    lances.push(...novos);
  }
  lances.sort((x, y) => x.min - y.min);
  const gols = lances.filter((l) => l.tipo === 'gol').map(({ t, nome, min }) => ({ t, nome, min }));
  const bonusPosse = (t) => (t.estilo === 'posse' ? 8 : t.estilo === 'contra' ? -6 : 0) + (t.marcacao === 'alta' ? 3 : t.marcacao === 'recuada' ? -4 : 0);
  const posse = Math.round(Math.min(72, Math.max(28, 50 + (F[a].MEI - F[b].MEI) * 1.2 + bonusPosse(ta) + F[a].mods.posse * 1.5 - bonusPosse(tb) - F[b].mods.posse * 1.5 + (r() - 0.5) * 6)));
  const jogo = { a, b, ga, gb, gols, lances, posse };
  if (mata && ga === gb) {
    // pênaltis: goleiro melhor ajuda um pouco
    let pa = 0;
    let pb = 0;
    const chance = (g) => 0.72 + (85 - g) / 400;
    for (let k = 0; k < 5; k += 1) {
      if (r() < chance(F[b].GOL)) pa += 1;
      if (r() < chance(F[a].GOL)) pb += 1;
    }
    while (pa === pb) {
      if (r() < chance(F[b].GOL)) pa += 1;
      if (r() < chance(F[a].GOL)) pb += 1;
    }
    jogo.pen = [pa, pb];
  }
  jogo.vence = ga > gb || (jogo.pen && jogo.pen[0] > jogo.pen[1]) ? a : ga < gb || jogo.pen ? b : null;
  return jogo;
}

function pontosCorridos(ids) {
  const lista = ids.length % 2 ? [...ids, null] : [...ids];
  const n = lista.length;
  const rodadas = [];
  for (let r = 0; r < n - 1; r += 1) {
    const jogos = [];
    for (let k = 0; k < n / 2; k += 1) {
      const a = lista[k];
      const b = lista[n - 1 - k];
      if (a && b) jogos.push(r % 2 ? [b, a] : [a, b]);
    }
    rodadas.push(jogos);
    lista.splice(1, 0, lista.pop());
  }
  return rodadas;
}

export function classificacao(ids, rodadas) {
  const t = {};
  ids.forEach((id) => {
    t[id] = { id, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 };
  });
  rodadas.flat().forEach((g) => {
    const A = t[g.a];
    const B = t[g.b];
    A.j += 1; B.j += 1;
    A.gp += g.ga; A.gc += g.gb; B.gp += g.gb; B.gc += g.ga;
    if (g.ga > g.gb) { A.v += 1; B.d += 1; A.pts += 3; } else if (g.ga < g.gb) { B.v += 1; A.d += 1; B.pts += 3; } else { A.e += 1; B.e += 1; A.pts += 1; B.pts += 1; }
  });
  return Object.values(t).sort((x, y) => y.pts - x.pts || y.gp - y.gc - (x.gp - x.gc) || y.gp - x.gp || x.id.localeCompare(y.id));
}

const NOMES_FASE = { 1: 'Final', 2: 'Semifinal', 4: 'Quartas de final', 8: 'Oitavas de final' };

function mataMata(r, F, T, ordem) {
  let tam = 1;
  while (tam < ordem.length) tam *= 2;
  // cabeças de chave enfrentam os "byes"
  const chave = [];
  for (let k = 0; k < tam / 2; k += 1) chave.push([ordem[k] || null, ordem[tam - 1 - k] || null]);
  const fases = [];
  let pares = chave;
  while (pares.length >= 1) {
    const jogos = pares.map(([a, b]) => (a && b ? jogar(r, F, a, b, true, T) : { a: a || b, b: null, folga: true, vence: a || b }));
    fases.push({ nome: NOMES_FASE[pares.length] || 'Mata-mata', jogos });
    if (pares.length === 1) break;
    const vencedores = jogos.map((g) => g.vence);
    pares = [];
    for (let k = 0; k < vencedores.length; k += 2) pares.push([vencedores[k], vencedores[k + 1]]);
  }
  return fases;
}

export function montarCampeonato(s, semente) {
  const r = rng(semente);
  const ids = s.tecnicos.map((t) => t.id).filter((id) => s.times[id]);
  const F = {};
  ids.forEach((id) => {
    F[id] = forca(s, id);
  });
  // tática de cada um (bot escolhe o estilo que mais encaixa no elenco)
  const T = {};
  ids.forEach((id) => {
    const tec = s.tecnicos.find((t) => t.id === id);
    const tt = s.times[id].tatica;
    T[id] = tec && tec.bot ? { estilo: melhorEstilo(F[id]), marcacao: 'normal', perdendo: 'pressionar' } : valida(tt) ? tt : TATICA_PADRAO;
  });
  const formato = s.config.formato;
  const passos = [];
  let campeao = null;

  if (formato === 'pontos' || formato === 'ambos') {
    pontosCorridos(ids).forEach((jogos, k) => {
      passos.push({ tipo: 'rodada', nome: `Rodada ${k + 1}`, jogos: jogos.map(([a, b]) => jogar(r, F, a, b, false, T)) });
    });
    const tabela = classificacao(ids, passos.map((p) => p.jogos));
    if (formato === 'pontos') campeao = tabela[0].id;
    else {
      const vao = tabela.slice(0, ids.length >= 4 ? 4 : 2).map((l) => l.id);
      mataMata(r, F, T, vao).forEach((f) => passos.push({ tipo: 'mata', ...f }));
    }
  } else {
    const ordem = [...ids].sort((a, b) => F[b].geral - F[a].geral);
    mataMata(r, F, T, ordem).forEach((f) => passos.push({ tipo: 'mata', ...f }));
  }
  if (!campeao) {
    const final = passos[passos.length - 1];
    campeao = final.jogos[0].vence;
  }
  const forcas = {};
  ids.forEach((id) => {
    forcas[id] = { geral: F[id].geral, GOL: Math.round(F[id].GOL), DEF: Math.round(F[id].DEF), MEI: Math.round(F[id].MEI), ATA: Math.round(F[id].ATA) };
  });
  return { passos, visto: 0, campeao, forcas, taticas: T };
}
