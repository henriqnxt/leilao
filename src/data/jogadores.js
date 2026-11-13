import brasileirao from './brasileirao.js';
import ligas from './ligas.js';
import copas from './copas.js';
import { SETOR } from '../engine/posicoes.js';

export const MODOS = [
  { id: 'br', nome: 'Brasileirão', regra: 'Geral só pela temporada no Brasileirão', texto: 'Temporadas de 2000 até hoje.' },
  { id: 'eu', nome: '5 Grandes Ligas', regra: 'Geral só pela temporada na liga', texto: 'Premier League, La Liga, Serie A, Bundesliga e Ligue 1.' },
  { id: 'wc', nome: 'Copa do Mundo', regra: 'Geral só pelo que jogou em Copas', texto: 'Todas as Copas, com mais cartas de 2002 para cá.' },
];

export const LIGAS = { PL: 'Premier League', LL: 'La Liga', SA: 'Serie A', BL: 'Bundesliga', L1: 'Ligue 1' };

export const PAISES = {
  br: 'Brasil', ar: 'Argentina', uy: 'Uruguai', py: 'Paraguai', cl: 'Chile', co: 'Colômbia', pe: 'Peru', ec: 'Equador',
  rs: 'Sérvia', pt: 'Portugal', es: 'Espanha', fr: 'França', de: 'Alemanha', it: 'Itália', nl: 'Holanda', be: 'Bélgica',
  hr: 'Croácia', se: 'Suécia', pl: 'Polônia', cz: 'Tchéquia', si: 'Eslovênia', ch: 'Suíça', at: 'Áustria', ua: 'Ucrânia',
  no: 'Noruega', ro: 'Romênia', bg: 'Bulgária', ru: 'Rússia', 'gb-eng': 'Inglaterra', 'gb-sct': 'Escócia', 'gb-wls': 'País de Gales',
  ng: 'Nigéria', ci: 'Costa do Marfim', sn: 'Senegal', eg: 'Egito', gh: 'Gana', cm: 'Camarões', us: 'Estados Unidos', mx: 'México',
};

const mapa = new Map();
const porModo = { br: [], eu: [], wc: [] };

function add(modo, j) {
  const id = `${modo}${porModo[modo].length}`;
  const completo = { ...j, id, modo, setor: SETOR[j.pos] };
  mapa.set(id, completo);
  porModo[modo].push(id);
}

brasileirao.forEach(([nome, pos, ano, clube, nota, pais = 'br', busca]) =>
  add('br', { nome, pos, nota, pais, clube, comp: `Brasileirão ${ano}`, ano: String(ano), busca: busca || null }),
);
ligas.forEach(([nome, pos, temp, liga, clube, nota, pais, busca]) =>
  add('eu', { nome, pos, nota, pais, clube, comp: `${LIGAS[liga]} ${temp}`, ano: temp.slice(0, 4), busca: busca || null }),
);
copas.forEach(([nome, pos, ano, pais, nota, busca]) =>
  add('wc', { nome, pos, nota, pais, clube: PAISES[pais] || pais, comp: `Copa ${ano}`, ano: String(ano), busca: busca || null }),
);

// Quem não fecha o elenco completa com garotos da base (de graça e fracos).
Object.keys(SETOR).forEach((pos) =>
  mapa.set(`base-${pos}`, { id: `base-${pos}`, nome: 'Garoto da base', pos, setor: SETOR[pos], nota: 60, pais: null, clube: 'Base', comp: 'Categoria de base', base: true }),
);

export function jogador(id) {
  return mapa.get(id) || null;
}

export function idsDoModo(modo) {
  return [...(porModo[modo] || porModo.br)];
}

// Stats de exibição: saem da nota e da posição (as mesmas para todo mundo).
const PERFIL = {
  GOL: [2, 0, -2, 3, -4, 1],
  ZAG: [-6, -30, -10, -14, 4, 4],
  LE: [4, -18, 0, -2, -4, -4],
  LD: [4, -18, 0, -2, -4, -4],
  VOL: [-8, -14, 2, -6, 3, 2],
  MEI: [-2, -2, 5, 4, -10, -30],
  PE: [5, -2, -4, 5, -12, -40],
  PD: [5, -2, -4, 5, -12, -40],
  ATA: [1, 5, -10, -2, 2, -45],
};
export const ROTULOS = { linha: ['RIT', 'FIN', 'PAS', 'DRI', 'FÍS', 'DEF'], gol: ['ELA', 'MAN', 'CHU', 'REF', 'VEL', 'POS'] };

function ruido(texto, k) {
  let h = 2166136261;
  for (const c of `${texto}:${k}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 9) - 4;
}

export function stats(j) {
  if (!j) return [];
  const p = PERFIL[j.pos] || PERFIL.MEI;
  return p.map((d, k) => Math.max(20, Math.min(99, j.nota + d + ruido(j.id, k))));
}

export function iniciais(nome) {
  const partes = nome.split(' ').filter((p) => p.length > 2);
  if (partes.length > 1) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  return nome.slice(0, 2).toUpperCase();
}

// As notas seguem a escala do FIFA de cada competição (Brasileirão vai até ~83, Copa até ~96).
// "escala" põe todo mundo numa régua comum (60 a 97) para raridade da carta e decisão dos bots.
const FAIXA = { br: [63, 94], eu: [66, 94], wc: [70, 96] };
export function escala(j) {
  if (!j || j.base) return 55;
  const [lo, hi] = FAIXA[j.modo] || [60, 95];
  return Math.round(60 + ((j.nota - lo) / (hi - lo)) * 37);
}

export const bandeira = (pais) => (pais ? `https://flagcdn.com/w80/${pais}.png` : '');
