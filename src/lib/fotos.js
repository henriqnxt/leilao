// Foto real do jogador, buscada na Wikipédia / Wikimedia Commons (só imagens de uso livre).
// Ordem: 1) foto da temporada no Commons  2) foto principal da página na Wikipédia  3) silhueta.
// Cada aparelho busca sozinho e guarda o resultado, para não buscar de novo.
import { createContext, useContext, useEffect, useState } from 'react';

const CHAVE = 'leilao:fotos:v2';
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

// Commons: arquivos de imagem com nome + clube/seleção + ano no título ou descrição.
async function daTemporada(j) {
  const sobrenome = normal(j.nome).split(' ').filter((p) => p.length > 2).pop() || normal(j.nome);
  const contexto = j.modo === 'wc' ? `${j.ano} World Cup` : `${j.clube} ${j.ano}`;
  const termo = `${j.busca || j.nome} ${contexto} filetype:bitmap`;
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=6' +
    `&gsrsearch=${encodeURIComponent(termo)}&prop=imageinfo&iiprop=url&iiurlwidth=360&format=json&origin=*`;
  const dados = await json(url);
  const paginas = Object.values((dados.query && dados.query.pages) || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
  for (const p of paginas) {
    const titulo = normal(p.title);
    const info = p.imageinfo && p.imageinfo[0];
    if (info && info.thumburl && titulo.includes(sobrenome) && titulo.includes(String(j.ano).slice(0, 4))) return info.thumburl;
  }
  return '';
}

async function naWiki(lingua, termo) {
  const url =
    `https://${lingua}.wikipedia.org/w/api.php?action=query&generator=search&gsrlimit=1` +
    `&gsrsearch=${encodeURIComponent(termo)}&prop=pageimages&piprop=thumbnail&pithumbsize=360` +
    '&pilicense=free&format=json&origin=*';
  const dados = await json(url);
  const paginas = dados && dados.query && dados.query.pages;
  if (!paginas) return '';
  const pagina = Object.values(paginas)[0];
  return (pagina && pagina.thumbnail && pagina.thumbnail.source) || '';
}

async function procurar(j) {
  try {
    const t = await daTemporada(j);
    if (t) return t;
  } catch {
    /* segue para a foto principal */
  }
  const base = j.busca || j.nome;
  const tentativas = [
    ['pt', j.busca ? base : `${base} futebolista`],
    ['en', j.busca ? base : `${base} footballer`],
  ];
  for (const [lingua, termo] of tentativas) {
    const achou = await naWiki(lingua, termo);
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
