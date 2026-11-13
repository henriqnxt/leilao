// Regras do leilão. Funções puras, rodadas pelo host.
import { idsDoPacote, jogador } from '../data/jogadores.js';
import { existe, formacaoPadrao, vagasDa } from './formations.js';

export const CAIXA = 100; // todo técnico começa com R$ 100
export const TEMPO_LANCE = 10000; // 10 s; cada lance reinicia
export const PAUSA_VENDIDO = 3000;
export const PAUSA_SEM_LANCE = 1500;

function embaralhar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const temVaga = (time) => time.vagas.some((v) => v === null);

// Põe o jogador na primeira vaga livre da posição dele; se não tiver, em qualquer vaga livre.
function colocar(vagas, posicoes, id) {
  const pos = jogador(id).pos;
  let i = vagas.findIndex((v, k) => v === null && posicoes[k] === pos);
  if (i < 0) i = vagas.findIndex((v) => v === null);
  if (i < 0) return vagas;
  const novo = [...vagas];
  novo[i] = id;
  return novo;
}

export function iniciarLeilao(s, agora) {
  const { emCampo, pacote } = s.config;
  const formacao = formacaoPadrao(emCampo);
  const times = {};
  s.tecnicos.forEach((t) => {
    times[t.id] = { caixa: CAIXA, formacao, vagas: Array(emCampo).fill(null) };
  });
  return {
    ...s,
    fase: 'leilao',
    times,
    leilao: { fila: embaralhar(idsDoPacote(pacote)), i: 0, lance: 0, lider: null, fim: agora + TEMPO_LANCE, batido: null, proximoEm: null },
  };
}

function encerrar(s) {
  const { emCampo } = s.config;
  const times = {};
  Object.entries(s.times).forEach(([id, t]) => {
    const posicoes = vagasDa(emCampo, t.formacao);
    times[id] = { ...t, vagas: t.vagas.map((v, k) => v || `base-${posicoes[k]}`) };
  });
  return { ...s, fase: 'escalacao', times, leilao: { ...s.leilao, lance: 0, lider: null, fim: null, batido: null, proximoEm: null } };
}

function proximoLote(s, agora) {
  const L = s.leilao;
  const i = L.i + 1;
  const alguemCompra = Object.values(s.times).some((t) => temVaga(t) && t.caixa >= 1);
  if (i >= L.fila.length || !alguemCompra) return encerrar(s);
  return { ...s, leilao: { ...L, i, lance: 0, lider: null, fim: agora + TEMPO_LANCE, batido: null, proximoEm: null } };
}

// O host chama várias vezes por segundo. Devolve o mesmo objeto se nada mudou.
export function avancar(s, agora) {
  if (!s || s.fase !== 'leilao') return s;
  const L = s.leilao;

  if (L.batido) return agora >= L.proximoEm ? proximoLote(s, agora) : s;

  const aindaPodem = Object.entries(s.times).some(([id, t]) => id !== L.lider && temVaga(t) && t.caixa > L.lance);
  if (agora < L.fim && aindaPodem) return s;

  const id = L.fila[L.i];
  if (!L.lider) {
    return { ...s, leilao: { ...L, batido: { id, por: null, valor: 0 }, proximoEm: agora + PAUSA_SEM_LANCE } };
  }
  const t = s.times[L.lider];
  const posicoes = vagasDa(s.config.emCampo, t.formacao);
  const times = { ...s.times, [L.lider]: { ...t, caixa: t.caixa - L.lance, vagas: colocar(t.vagas, posicoes, id) } };
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
      if (s.fase !== 'leilao' || L.batido || a.de === L.lider) return s;
      if (!Number.isFinite(valor) || valor <= L.lance || valor > t.caixa || !temVaga(t)) return s;
      return { ...s, leilao: { ...L, lance: valor, lider: a.de, fim: a.agora + TEMPO_LANCE } };
    }

    case 'formacao': {
      if (!existe(emCampo, a.formacao) || a.formacao === t.formacao) return s;
      const posicoes = vagasDa(emCampo, a.formacao);
      let vagas = Array(emCampo).fill(null);
      t.vagas.filter(Boolean).forEach((id) => {
        vagas = colocar(vagas, posicoes, id);
      });
      // depois do leilão não pode sobrar vaga vazia
      if (s.fase === 'escalacao') vagas = vagas.map((v, k) => v || `base-${posicoes[k]}`);
      return { ...s, times: { ...s.times, [a.de]: { ...t, formacao: a.formacao, vagas } } };
    }

    case 'mover': {
      const { origem, destino } = a;
      const ok = (n) => Number.isInteger(n) && n >= 0 && n < t.vagas.length;
      if (!ok(origem) || !ok(destino) || origem === destino) return s;
      const vagas = [...t.vagas];
      [vagas[origem], vagas[destino]] = [vagas[destino], vagas[origem]];
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
  return { ...s, leilao: { ...L, fim: L.fim == null ? null : L.fim + desvio, proximoEm: L.proximoEm == null ? null : L.proximoEm + desvio } };
}
