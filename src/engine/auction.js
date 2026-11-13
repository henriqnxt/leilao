// Regras do leilão. Funções puras, rodadas pelo host.
import { idsDoModo, jogador } from '../data/jogadores.js';
import { existe, formacaoPadrao, vagasDa } from './formations.js';
import { rendimento } from './posicoes.js';

export const CAIXA = 100; // todo técnico começa com R$ 100
export const TEMPO_INICIAL = 10000; // relógio começa em 10 s
export const TETO_LANCE = 5000; // cada lance soma 1 s, mas nunca passa de 5 s
export const INTRO = 2800; // apresentação do jogador antes de abrir os lances
export const PAUSA_VENDIDO = 5000; // depois do martelo, 5 s até o próximo
export const PAUSA_SEM_LANCE = 2500;

function embaralhar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const posicoesDo = (s, t) => vagasDa(s.config.emCampo, t.formacao);

// Melhor vaga livre para o jogador (maior rendimento). -1 se não cabe.
function melhorVaga(vagas, posicoes, pos) {
  let melhor = -1;
  let r = 0;
  vagas.forEach((v, k) => {
    if (v !== null) return;
    const f = rendimento(pos, posicoes[k]);
    if (f > r) {
      r = f;
      melhor = k;
    }
  });
  return melhor;
}

export function cabe(s, idTecnico, idJogador) {
  const t = s.times && s.times[idTecnico];
  const j = jogador(idJogador);
  if (!t || !j) return false;
  return melhorVaga(t.vagas, posicoesDo(s, t), j.pos) >= 0;
}

function colocar(vagas, posicoes, id) {
  const j = jogador(id);
  let i = melhorVaga(vagas, posicoes, j.pos);
  if (i < 0) i = vagas.findIndex((v) => v === null);
  if (i < 0) return vagas;
  const novo = [...vagas];
  novo[i] = id;
  return novo;
}

function lote(L, i, agora) {
  return { ...L, i, lance: 0, lider: null, passaram: [], inicio: agora + INTRO, fim: agora + INTRO + TEMPO_INICIAL, batido: null, proximoEm: null };
}

export function iniciarLeilao(s, agora) {
  const { emCampo, modo } = s.config;
  const formacao = formacaoPadrao(emCampo);
  const times = {};
  s.tecnicos.forEach((t) => {
    times[t.id] = { caixa: CAIXA, formacao, vagas: Array(emCampo).fill(null), pagos: {} };
  });
  return { ...s, fase: 'leilao', times, leilao: lote({ fila: embaralhar(idsDoModo(modo)) }, 0, agora) };
}

function encerrar(s) {
  const times = {};
  Object.entries(s.times).forEach(([id, t]) => {
    const posicoes = posicoesDo(s, t);
    times[id] = { ...t, vagas: t.vagas.map((v, k) => v || `base-${posicoes[k]}`) };
  });
  return { ...s, fase: 'escalacao', times, leilao: { ...s.leilao, lance: 0, lider: null, fim: null, batido: null, proximoEm: null } };
}

// Quem ainda pode dar lance neste jogador.
function interessados(s) {
  const L = s.leilao;
  const id = L.fila[L.i];
  return Object.entries(s.times).filter(
    ([tid, t]) => tid !== L.lider && !L.passaram.includes(tid) && t.caixa > L.lance && cabe(s, tid, id),
  );
}

function proximoLote(s, agora) {
  const L = s.leilao;
  let i = L.i + 1;
  // pula jogadores que ninguém consegue encaixar
  while (i < L.fila.length) {
    const id = L.fila[i];
    if (Object.keys(s.times).some((tid) => s.times[tid].caixa >= 1 && cabe(s, tid, id))) break;
    i += 1;
  }
  if (i >= L.fila.length) return encerrar(s);
  return { ...s, leilao: lote(L, i, agora) };
}

// O host chama várias vezes por segundo. Devolve o mesmo objeto se nada mudou.
export function avancar(s, agora) {
  if (!s || s.fase !== 'leilao') return s;
  const L = s.leilao;

  if (L.batido) return agora >= L.proximoEm ? proximoLote(s, agora) : s;
  if (agora < L.inicio) return s;
  if (agora < L.fim && interessados(s).length > 0) return s;

  const id = L.fila[L.i];
  if (!L.lider) {
    return { ...s, leilao: { ...L, batido: { id, por: null, valor: 0 }, proximoEm: agora + PAUSA_SEM_LANCE } };
  }
  const t = s.times[L.lider];
  const vagas = colocar(t.vagas, posicoesDo(s, t), id);
  const times = { ...s.times, [L.lider]: { ...t, caixa: t.caixa - L.lance, vagas, pagos: { ...t.pagos, [id]: L.lance } } };
  return { ...s, times, leilao: { ...L, batido: { id, por: L.lider, valor: L.lance }, proximoEm: agora + PAUSA_VENDIDO } };
}

export function reduzirLeilao(s, a) {
  if (s.fase !== 'leilao' && s.fase !== 'escalacao') return s;
  const t = s.times && s.times[a.de];
  if (!t) return s;
  const { emCampo } = s.config;

  switch (a.tipo) {
    case 'lance': {
      const L = s.leilao;
      const valor = Math.floor(Number(a.valor));
      if (s.fase !== 'leilao' || L.batido || a.de === L.lider || a.agora < L.inicio) return s;
      if (L.passaram.includes(a.de)) return s;
      if (!Number.isFinite(valor) || valor <= L.lance || valor > t.caixa) return s;
      if (!cabe(s, a.de, L.fila[L.i])) return s;
      // +1 s por lance, sem passar de 5 s (e sem tirar tempo de ninguém)
      const resta = Math.max(0, L.fim - a.agora);
      const novoResta = Math.max(resta, Math.min(resta + 1000, TETO_LANCE));
      return { ...s, leilao: { ...L, lance: valor, lider: a.de, fim: a.agora + novoResta } };
    }

    case 'passar': {
      const L = s.leilao;
      if (s.fase !== 'leilao' || L.batido || a.de === L.lider || L.passaram.includes(a.de)) return s;
      return { ...s, leilao: { ...L, passaram: [...L.passaram, a.de] } };
    }

    case 'formacao': {
      if (!existe(emCampo, a.formacao) || a.formacao === t.formacao) return s;
      const posicoes = vagasDa(emCampo, a.formacao);
      let vagas = Array(emCampo).fill(null);
      // os melhores escolhem vaga primeiro
      t.vagas
        .filter((id) => id && !String(id).startsWith('base-'))
        .sort((x, y) => jogador(y).nota - jogador(x).nota)
        .forEach((id) => {
          vagas = colocar(vagas, posicoes, id);
        });
      if (s.fase === 'escalacao') vagas = vagas.map((v, k) => v || `base-${posicoes[k]}`);
      return { ...s, times: { ...s.times, [a.de]: { ...t, formacao: a.formacao, vagas } } };
    }

    case 'mover': {
      const { origem, destino } = a;
      const ok = (n) => Number.isInteger(n) && n >= 0 && n < t.vagas.length;
      if (!ok(origem) || !ok(destino) || origem === destino) return s;
      const posicoes = vagasDa(emCampo, t.formacao);
      const vagas = [...t.vagas];
      [vagas[origem], vagas[destino]] = [vagas[destino], vagas[origem]];
      // ninguém sai do próprio setor
      const valido = [origem, destino].every((k) => !vagas[k] || rendimento(jogador(vagas[k]).pos, posicoes[k]) > 0);
      if (!valido) return s;
      return { ...s, times: { ...s.times, [a.de]: { ...t, vagas } } };
    }

    default:
      return s;
  }
}

// Quando o host muda, os horários passam para o relógio do novo host.
export function ajustarRelogio(s, desvio) {
  if (!s || !s.leilao || !desvio) return s;
  const L = s.leilao;
  const mover = (v) => (v == null ? null : v + desvio);
  return { ...s, leilao: { ...L, inicio: mover(L.inicio), fim: mover(L.fim), proximoEm: mover(L.proximoEm) } };
}
