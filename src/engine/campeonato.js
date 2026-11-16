// Campeonato: cada rodada é simulada na hora em que o dono manda jogar, com a escalação e a
// tática que cada técnico deixou. Durante o jogo ao vivo, se alguém muda tática/formação,
// o resto da partida é simulado de novo a partir daquele minuto.
import { jogador } from '../data/jogadores.js';
import { vagasDa } from './formations.js';
import { notaNaVaga, SETOR } from './posicoes.js';
import { encaixe, melhorEstilo, TATICA_PADRAO, valida } from './tatica.js';
import { efeitos } from './instrucoes.js';
import { escolher, novaDisputa, resolverTudo } from './penaltis.js';

export const DURACAO = 60000; // 90 minutos em 60 s na tela
const BLOCO = 5; // a partida é simulada de 5 em 5 minutos

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
const hash = (txt) => {
  let h = 2166136261;
  for (const c of String(txt)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};

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
  // formação: quanto mais gente na frente, mais ataca e menos defende (4-2-4 x 5-4-1)
  const nAta = posicoes.filter((p) => p === 'ATA').length + 0.6 * posicoes.filter((p) => p === 'PE' || p === 'PD').length;
  const nDef = posicoes.filter((p) => SETOR[p] === 'DEF').length;
  const base = posicoes.length === 5 ? { a: 1.2, d: 2 } : { a: 2.2, d: 4 };
  const formAtaque = (nAta - base.a) * 3.5 - (nDef - base.d) * 1.5;
  const formDefesa = (nDef - base.d) * 3 - (nAta - base.a) * 2.5;
  return {
    ataque: 0.55 * ATA + 0.35 * MEI + 0.1 * DEF + mods.ataque + formAtaque,
    defesa: 0.45 * DEF + 0.3 * GOL + 0.25 * MEI + mods.defesa + formDefesa,
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


const PESO_CARTAO = { ZAG: 3, VOL: 3, LE: 2, LD: 2, MEI: 1.5, PE: 1, PD: 1, ATA: 1, GOL: 0.3 };
function sorteia(r, lista, peso) {
  const total = lista.reduce((a, e) => a + peso(e), 0);
  let x = r() * total;
  for (const e of lista) {
    x -= peso(e);
    if (x <= 0) return e;
  }
  return lista[lista.length - 1];
}

const COMO = {
  alas: ['jogada pela ponta', 'cruzamento da linha de fundo', 'lateral que chegou na frente'],
  meio: ['tabela pelo meio', 'enfiada de bola', 'chute de fora da área'],
  contra: ['contra-ataque', 'contra-ataque em velocidade'],
  posse: ['troca de passes', 'jogada trabalhada'],
};

export function taticaDe(s, id, F) {
  const tec = s.tecnicos.find((t) => t.id === id);
  const tt = s.times[id].tatica;
  if (tec && tec.bot && !valida(tt)) return { estilo: melhorEstilo(F), marcacao: 'normal', perdendo: 'pressionar' };
  return valida(tt) ? tt : TATICA_PADRAO;
}

// Simula uma partida. Com "anteriores" e "desde", continua um jogo já em andamento.
export function jogar(s, a, b, mata, semente, desde = 0, anteriores = [], interativo = false) {
  const r = rng(semente);
  const F = { [a]: forca(s, a), [b]: forca(s, b) };
  const T = { [a]: taticaDe(s, a, F[a]), [b]: taticaDe(s, b, F[b]) };
  const ta = T[a];
  const tb = T[b];
  const ataque = (x, t) => 0.5 * F[x].ataque + 0.5 * (0.6 * encaixe(F[x], t.estilo) + 0.4 * F[x].ataque);
  const base = (x, tx, y, k) => k * Math.exp((ataque(x, tx) - F[y].defesa) / 13);
  const confronto = (t, outro, fy, fx) => {
    let f = 1;
    if (t.estilo === 'contra') f *= (outro.marcacao === 'alta' ? 1.25 : outro.marcacao === 'recuada' ? 0.85 : 1) * (fy.mods && fy.mods.libero ? 0.88 : 1);
    if (t.estilo === 'meio') f *= outro.marcacao === 'recuada' ? 0.9 : outro.marcacao === 'alta' ? 1.05 : 1;
    if (t.estilo === 'posse' && outro.marcacao === 'alta') f *= 0.9;
    if (t.estilo === 'alas') {
      const lat = fy.elenco.filter((e) => e.vaga === 'LE' || e.vaga === 'LD').map((e) => e.n);
      const defLado = lat.length ? media(lat) : fy.DEF - 4;
      f *= Math.exp((encaixe(fx, 'alas') - defLado) / 25);
    }
    if (t.marcacao === 'alta') f *= 1.12;
    if (t.marcacao === 'recuada') f *= 0.85;
    if (outro.marcacao === 'alta') f *= 1.1;
    if (outro.marcacao === 'recuada') f *= 0.8;
    if (outro.estilo === 'posse') f *= 0.92;
    return f;
  };
  const la = Math.min(3.4, Math.max(0.3, base(a, ta, b, 1.65) * confronto(ta, tb, F[b], F[a])));
  const lb = Math.min(3.4, Math.max(0.3, base(b, tb, a, 1.5) * confronto(tb, ta, F[a], F[b])));

  const goleiro = (t) => (F[t].elenco.find((e) => e.vaga === 'GOL') || { nome: 'o goleiro' }).nome;
  const como = (t) => {
    const tt = T[t];
    if ((tt.marcacao === 'alta' && r() < 0.22) || (F[t].mods.pressao && r() < 0.12)) return 'roubada na pressão';
    const l = COMO[tt.estilo];
    return l[Math.floor(r() * l.length)];
  };

  // estado vindo dos minutos já jogados
  const lances = anteriores.filter((l) => l.min <= desde);
  const gols = (t) => lances.filter((l) => l.tipo === 'gol' && l.t === t).length;
  const expulsos = (t) => lances.filter((l) => l.tipo === 'vermelho' && l.t === t).map((l) => l.nome);
  const amarelados = (t) => lances.filter((l) => l.tipo === 'amarelo' && l.t === t).map((l) => l.nome);

  for (let ini = Math.floor(desde / BLOCO) * BLOCO; ini < 90; ini += BLOCO) {
    const de = Math.max(ini, desde) + 1;
    const ate = ini + BLOCO;
    const frac = (ate - de + 1) / 90;
    if (frac <= 0) continue;
    const [ga, gb] = [gols(a), gols(b)];
    let fa = 1;
    let fb = 1;
    if (ini >= 60) {
      if (ta.perdendo === 'pressionar' && ga < gb) { fa *= 1.4; fb *= 1.25; }
      if (tb.perdendo === 'pressionar' && gb < ga) { fb *= 1.4; fa *= 1.25; }
    }
    if (ini >= 75) {
      if (ta.marcacao === 'alta') fa *= 0.88;
      if (tb.marcacao === 'alta') fb *= 0.88;
    }
    // expulsão: time com um a menos ataca menos e sofre mais
    const ea = expulsos(a).length;
    const eb = expulsos(b).length;
    fa *= 0.78 ** ea * 1.25 ** eb;
    fb *= 0.78 ** eb * 1.25 ** ea;

    const minuto = () => de + Math.floor(r() * (ate - de + 1));
    const novos = [];
    [[a, b, la * fa], [b, a, lb * fb]].forEach(([t, outro, l]) => {
      const fora = expulsos(t);
      const elenco = F[t].elenco.filter((e) => !fora.includes(e.nome));
      for (let k = poisson(r, l * frac); k > 0; k -= 1) novos.push({ t, nome: artilheiro(r, elenco), min: minuto(), tipo: 'gol', como: como(t) });
      for (let k = poisson(r, l * frac * 1.8); k > 0; k -= 1) {
        const x = r();
        novos.push({ t, nome: artilheiro(r, elenco), min: minuto(), tipo: x < 0.45 ? 'defesa' : x < 0.6 ? 'trave' : 'fora', gk: goleiro(outro), como: como(t) });
      }
      // cartões: quem marca alto faz mais falta
      const tt = T[t];
      const faltas = 2.0 * frac * (tt.marcacao === 'alta' ? 1.4 : tt.marcacao === 'recuada' ? 0.85 : 1) * (F[t].mods.pressao ? 1.15 : 1);
      for (let k = poisson(r, faltas); k > 0; k -= 1) {
        const e = sorteia(r, elenco, (x) => PESO_CARTAO[x.vaga] || 1);
        if (!e) continue;
        const ja = amarelados(t).includes(e.nome) || novos.some((n) => n.tipo === 'amarelo' && n.t === t && n.nome === e.nome);
        if (expulsos(t).includes(e.nome) || novos.some((n) => n.tipo === 'vermelho' && n.t === t && n.nome === e.nome)) continue;
        if (ja) {
          if (r() < 0.3) novos.push({ t, nome: e.nome, min: minuto(), tipo: 'vermelho', motivo: 'segundo amarelo' });
        } else if (r() < 0.025) novos.push({ t, nome: e.nome, min: minuto(), tipo: 'vermelho', motivo: 'entrada violenta' });
        else novos.push({ t, nome: e.nome, min: minuto(), tipo: 'amarelo' });
      }
    });
    novos.sort((x, y) => x.min - y.min);
    // quem foi expulso no bloco não faz gol depois disso
    const valido = novos.filter((l) => {
      if (l.tipo === 'vermelho' || l.tipo === 'amarelo') return true;
      const red = novos.find((n) => n.tipo === 'vermelho' && n.t === l.t && n.nome === l.nome);
      return !red || l.min < red.min;
    });
    lances.push(...valido);
  }
  lances.sort((x, y) => x.min - y.min);
  const ga = gols(a);
  const gb = gols(b);
  const golsLista = lances.filter((l) => l.tipo === 'gol').map(({ t, nome, min }) => ({ t, nome, min }));
  const bonusPosse = (t) => (t.estilo === 'posse' ? 8 : t.estilo === 'contra' ? -6 : 0) + (t.marcacao === 'alta' ? 3 : t.marcacao === 'recuada' ? -4 : 0);
  const posse = Math.round(Math.min(72, Math.max(28, 50 + (F[a].MEI - F[b].MEI) * 1.2 + bonusPosse(ta) + F[a].mods.posse * 1.5 - bonusPosse(tb) - F[b].mods.posse * 1.5 + (expulsos(b).length - expulsos(a).length) * 5)));
  const jogo = { a, b, ga, gb, gols: golsLista, lances, posse, taticas: { [a]: ta, [b]: tb }, formacoes: { [a]: s.times[a].formacao, [b]: s.times[b].formacao } };
  if (mata && ga === gb && interativo) {
    // tem gente de verdade no jogo: pênaltis batidos um a um, com escolha de canto
    jogo.penPendente = true;
    jogo.disputa = novaDisputa(F[a], F[b]);
    jogo.vence = null;
    return jogo;
  }
  if (mata && ga === gb) {
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

// Chave do mata-mata a partir de uma ordem (melhores primeiro). Os melhores ganham folga se sobrar vaga.
function primeiraFase(ordem) {
  let tam = 1;
  while (tam < ordem.length) tam *= 2;
  const pares = [];
  for (let k = 0; k < tam / 2; k += 1) pares.push([ordem[k] || null, ordem[tam - 1 - k] || null]);
  return { tipo: 'mata', nome: NOMES_FASE[pares.length] || 'Mata-mata', jogos: pares.map(([a, b]) => (a && b ? { a, b } : { a: a || b, b: null, folga: true, vence: a || b })) };
}

// Quantos passam da fase de pontos: 8 ou mais técnicos -> 4 (semifinal); menos -> 2 (final direto)
export const classificados = (n) => (n >= 8 ? 4 : 2);

export function montarCampeonato(s, semente) {
  const ids = s.tecnicos.map((t) => t.id).filter((id) => s.times[id]);
  const formato = s.config.formato;
  const passos = [];
  if (formato === 'pontos' || formato === 'ambos') {
    pontosCorridos(ids).forEach((jogos, k) => passos.push({ tipo: 'rodada', nome: `Rodada ${k + 1}`, jogos: jogos.map(([a, b]) => ({ a, b })) }));
  } else {
    const ordem = [...ids].sort((x, y) => forca(s, y).geral - forca(s, x).geral);
    passos.push(primeiraFase(ordem));
  }
  return { formato, semente, passos, visto: 0, campeao: null };
}

// Monta a próxima fase do mata-mata quando a anterior terminou
function proximaFase(s, camp) {
  const ultimo = camp.passos[camp.passos.length - 1];
  if (ultimo.tipo === 'rodada') {
    if (camp.formato === 'pontos') return null;
    const ids = s.tecnicos.map((t) => t.id).filter((id) => s.times[id]);
    const tabela = classificacao(ids, camp.passos.filter((p) => p.tipo === 'rodada').map((p) => p.jogos));
    return primeiraFase(tabela.slice(0, classificados(ids.length)).map((l) => l.id));
  }
  if (ultimo.jogos.length === 1) return null; // a final já foi
  const venc = ultimo.jogos.map((g) => g.vence);
  const pares = [];
  for (let k = 0; k < venc.length; k += 2) pares.push({ a: venc[k], b: venc[k + 1] });
  return { tipo: 'mata', nome: NOMES_FASE[pares.length] || 'Mata-mata', jogos: pares };
}

export function nomeDoProximo(s, camp) {
  if (camp.visto < camp.passos.length) return camp.passos[camp.visto].nome;
  const f = camp.visto > 0 ? proximaFase(s, camp) : null;
  return f ? f.nome : null;
}

function campeaoDe(s, camp) {
  const ultimo = camp.passos[camp.passos.length - 1];
  if (ultimo.tipo === 'mata' && ultimo.jogos.length === 1) return ultimo.jogos[0].vence;
  if (camp.formato === 'pontos' && camp.visto >= camp.passos.length) {
    const ids = s.tecnicos.map((t) => t.id).filter((id) => s.times[id]);
    return classificacao(ids, camp.passos.map((p) => p.jogos))[0].id;
  }
  return null;
}

const ehBot = (s, id) => !!(s.tecnicos.find((t) => t.id === id) || {}).bot;
const temHumano = (s, a, b) => !ehBot(s, a) || !ehBot(s, b);
export const idsBots = (s) => s.tecnicos.filter((t) => t.bot).map((t) => t.id);

// Pênaltis ainda em andamento (o campeonato só segue quando todos acabam)
export function pendentes(camp) {
  const lista = [];
  camp.passos.forEach((p, i) => p.jogos.forEach((g, k) => {
    if (g.penPendente) lista.push({ passo: i, jogo: k, g });
  }));
  return lista;
}

// Uma escolha de canto (quem bate) ou de pulo (quem defende). forcar = dono sorteia pelos dois.
export function penalti(s, de, passo, jogo, zona, agora, forcar = false) {
  const camp = s.camp;
  const p = camp && camp.passos[passo];
  const g = p && p.jogos[jogo];
  if (!g || !g.penPendente) return s;
  const novo = escolher(g, de, zona, idsBots(s), hash(`${camp.semente}:pen:${passo}:${jogo}`), agora, forcar);
  if (novo === g) return s;
  const passos = camp.passos.map((x, i) => (i === passo ? { ...x, jogos: x.jogos.map((y, j) => (j === jogo ? novo : y)) } : x));
  let c = { ...camp, passos };
  c = { ...c, campeao: campeaoDe(s, c) };
  return { ...s, camp: c };
}

function resolverPendentes(s, agora) {
  const camp = s.camp;
  if (!pendentes(camp).length) return s;
  const passos = camp.passos.map((p, i) => ({ ...p, jogos: p.jogos.map((g, k) => (g.penPendente ? resolverTudo(g, hash(`${camp.semente}:pen:${i}:${k}`), agora) : g)) }));
  let c = { ...camp, passos };
  c = { ...c, campeao: campeaoDe(s, c) };
  return { ...s, camp: c };
}

// Joga a próxima rodada/fase com as escalações e táticas atuais
export function jogarProximo(s, agora, auto = false) {
  let camp = s.camp;
  if (pendentes(camp).length) return s;
  if (camp.visto >= camp.passos.length) {
    const f = proximaFase(s, camp);
    if (!f) return s;
    camp = { ...camp, passos: [...camp.passos, f] };
  }
  const passo = camp.passos[camp.visto];
  const jogos = passo.jogos.map((g) => (g.folga ? g : jogar(s, g.a, g.b, passo.tipo === 'mata', hash(`${camp.semente}:${camp.visto}:${g.a}:${g.b}`), 0, [], !auto && temHumano(s, g.a, g.b))));
  const passos = camp.passos.map((p, i) => (i === camp.visto ? { ...p, jogos, simulado: true } : p));
  let novo = { ...camp, passos, visto: camp.visto + 1, aoVivo: { passo: camp.visto, inicio: agora } };
  novo = { ...novo, campeao: campeaoDe(s, novo) };
  return { ...s, camp: novo };
}

// Pula tudo até o fim (sem ao vivo)
export function jogarTudo(s, agora) {
  let atual = resolverPendentes(s, agora);
  for (let k = 0; k < 40; k += 1) {
    if (atual.camp.campeao) break;
    const prox = jogarProximo(atual, agora, true);
    if (prox === atual) break;
    atual = prox;
  }
  return { ...atual, camp: { ...atual.camp, aoVivo: null } };
}

// Alguém mudou o time durante o jogo ao vivo: simula de novo o resto da partida dele
export function reSimular(s, tid, agora) {
  const camp = s.camp;
  if (!camp || !camp.aoVivo) return s;
  const minuto = Math.floor(((agora - camp.aoVivo.inicio) / DURACAO) * 90);
  if (minuto < 0 || minuto >= 88) return s;
  const passo = camp.passos[camp.aoVivo.passo];
  const k = passo.jogos.findIndex((g) => !g.folga && (g.a === tid || g.b === tid));
  if (k < 0) return s;
  const g = passo.jogos[k];
  const novo = jogar(s, g.a, g.b, passo.tipo === 'mata', hash(`${camp.semente}:${camp.aoVivo.passo}:${g.a}:${g.b}:${minuto}:${agora}`), minuto, g.lances, temHumano(s, g.a, g.b));
  const jogos = passo.jogos.map((x, i) => (i === k ? { ...novo, mudou: (g.mudou || 0) + 1 } : x));
  const passos = camp.passos.map((p, i) => (i === camp.aoVivo.passo ? { ...p, jogos } : p));
  let c = { ...camp, passos };
  c = { ...c, campeao: campeaoDe(s, c) };
  return { ...s, camp: c };
}
