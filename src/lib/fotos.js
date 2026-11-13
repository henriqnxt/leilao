// Foto real do jogador, buscada na Wikipédia (só imagens de uso livre).
// Cada aparelho busca sozinho e guarda o resultado, para não buscar de novo.
import { useEffect, useState } from 'react';

const CHAVE = 'leilao:fotos:v1';
let guardadas = {};
try {
  guardadas = JSON.parse(localStorage.getItem(CHAVE)) || {};
} catch {
  guardadas = {};
}
const emAndamento = new Map();

async function naWiki(lingua, termo) {
  const url =
    `https://${lingua}.wikipedia.org/w/api.php?action=query&generator=search&gsrlimit=1` +
    `&gsrsearch=${encodeURIComponent(termo)}&prop=pageimages&piprop=thumbnail&pithumbsize=320` +
    '&pilicense=free&format=json&origin=*';
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error('wiki fora do ar');
  const dados = await resposta.json();
  const paginas = dados && dados.query && dados.query.pages;
  if (!paginas) return '';
  const pagina = Object.values(paginas)[0];
  return (pagina && pagina.thumbnail && pagina.thumbnail.source) || '';
}

async function procurar(j) {
  const base = j.busca || j.nome;
  const tentativas = [
    ['pt', j.busca ? `${base} futebol` : `${base} futebolista`],
    ['en', j.busca ? `${base} football` : `${base} footballer`],
  ];
  for (const [lingua, termo] of tentativas) {
    const achou = await naWiki(lingua, termo);
    if (achou) return achou;
  }
  return '';
}

export function buscarFoto(j) {
  if (!j || j.base) return Promise.resolve('');
  if (j.id in guardadas) return Promise.resolve(guardadas[j.id]);
  if (!emAndamento.has(j.id)) {
    emAndamento.set(
      j.id,
      procurar(j)
        .then((url) => {
          guardadas[j.id] = url; // '' = procurou e não achou
          try {
            localStorage.setItem(CHAVE, JSON.stringify(guardadas));
          } catch {
            /* sem espaço: só não guarda */
          }
          return url;
        })
        .catch(() => '') // sem internet: tenta de novo na próxima vez
        .finally(() => emAndamento.delete(j.id)),
    );
  }
  return emAndamento.get(j.id);
}

export function useFoto(j) {
  const id = j ? j.id : null;
  const [url, setUrl] = useState(() => (id && guardadas[id]) || '');
  useEffect(() => {
    let vivo = true;
    setUrl((id && guardadas[id]) || '');
    if (j) buscarFoto(j).then((u) => vivo && setUrl(u));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return url;
}
