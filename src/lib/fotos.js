// Foto real do jogador, buscada na Wikipédia (só imagens de uso livre).
// Só usa a foto quando tem certeza de que a página é do próprio jogador; senão, fica a silhueta.
// Cada aparelho busca sozinho e guarda o resultado, para não buscar de novo.
import { createContext, useContext, useEffect, useState } from 'react';

const CHAVE = 'leilao:fotos:v4'; // v4: só aceita foto confirmada do próprio jogador
let guardadas = {};
try {
  guardadas = JSON.parse(localStorage.getItem(CHAVE)) || {};
} catch {
  guardadas = {};
}
const emAndamento = new Map();

// Fotos trocadas na mão pelo dono da sala (vêm junto com o estado da sala).
export const FotosDaSala = createContext({});

const chaveDe = (j) => `${j.nome}|${j.clube}|${j.ano}`;

const normal = (t) =>
  String(t || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('wiki fora do ar');
  return r.json();
}

// Busca na Wikipédia e só aceita a página se a descrição for de jogador de futebol
// (evita pegar a foto de outra pessoa com o mesmo nome).
const E_FUTEBOL = /futebol|football|soccer|goleiro|goalkeeper|calcio|fútbol/i;

// A página só vale se: (1) é de jogador de futebol, (2) o título tem o nome do jogador e
// (3) o resumo da página cita o clube/seleção daquela carta. Sem isso, fica sem foto.
async function naWiki(lingua, termo, j) {
  const url =
    `https://${lingua}.wikipedia.org/w/api.php?action=query&generator=search&gsrlimit=6` +
    `&gsrsearch=${encodeURIComponent(termo)}&prop=pageimages|description|extracts&piprop=thumbnail&pithumbsize=360` +
    '&pilicense=free&exintro=1&explaintext=1&exlimit=max&exchars=1200&format=json&origin=*';
  const dados = await json(url);
  const paginas = Object.values((dados.query && dados.query.pages) || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  const nomes = normal(j.nome).split(/[^a-z]+/).filter((p) => p.length >= 3);
  const completo = normal(j.busca || '');
  const clube = normal(j.clube).split(/[^a-z]+/).filter((p) => p.length >= 4);
  const pais = normal(PAIS_EN[j.pais] || '');
  for (const p of paginas) {
    if (!p.thumbnail || !p.thumbnail.source || !E_FUTEBOL.test(p.description || '')) continue;
    const titulo = normal(p.title);
    if (!(nomes.length && nomes.every((n) => titulo.includes(n))) && !(completo && titulo.includes(completo))) continue;
    const texto = normal(`${p.extract || ''} ${p.description || ''}`);
    const citaClube = j.modo === 'wc' ? texto.includes(normal(j.clube)) || (pais && texto.includes(pais)) || /selec|national team/.test(texto) : clube.some((c) => texto.includes(c));
    if (citaClube) return p.thumbnail.source;
  }
  return '';
}

const PAIS_EN = { br: 'brazil', ar: 'argentina', it: 'italy', fr: 'france', de: 'germany', es: 'spain', 'gb-eng': 'england', pt: 'portugal', nl: 'netherlands', uy: 'uruguay', hr: 'croatia' };

async function procurar(j) {
  const base = j.busca || j.nome;
  const tentativas = [
    ['pt', `${base} futebolista`],
    ['en', `${base} footballer`],
  ];
  for (const [lingua, termo] of tentativas) {
    const achou = await naWiki(lingua, termo, j);
    if (achou) return achou;
  }
  return '';
}

export function buscarFoto(j) {
  if (!j || j.base) return Promise.resolve('');
  const k = chaveDe(j);
  if (k in guardadas) return Promise.resolve(guardadas[k]);
  if (!emAndamento.has(k)) {
    emAndamento.set(
      k,
      procurar(j)
        .then((url) => {
          guardadas[k] = url; // '' = procurou e não achou
          try {
            localStorage.setItem(CHAVE, JSON.stringify(guardadas));
          } catch {
            /* sem espaço: só não guarda */
          }
          return url;
        })
        .catch(() => '') // sem internet: tenta de novo na próxima vez
        .finally(() => emAndamento.delete(k)),
    );
  }
  return emAndamento.get(k);
}

// Já começa a buscar as próximas fotos da fila, para aparecerem na hora.
export function preCarregar(lista) {
  lista.filter(Boolean).forEach((j) => buscarFoto(j));
}

export function useFoto(j) {
  const trocadas = useContext(FotosDaSala) || {};
  const k = j && !j.base ? chaveDe(j) : null;
  const [url, setUrl] = useState(() => (k && guardadas[k]) || '');
  useEffect(() => {
    let vivo = true;
    setUrl((k && guardadas[k]) || '');
    if (j && !trocadas[j.id]) buscarFoto(j).then((u) => vivo && setUrl(u));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);
  if (j && trocadas[j.id]) return trocadas[j.id];
  return url;
}
