import brasil from './brasil.js';
import europa from './europa.js';

const mapa = new Map();

function carregar(lista, prefixo, origem) {
  return lista.map(([nome, pos, decada, nota, busca], i) => {
    const j = { id: `${prefixo}${i}`, nome, pos, decada, nota, origem, busca: busca || null };
    mapa.set(j.id, j);
    return j.id;
  });
}

const idsBrasil = carregar(brasil, 'b', 'Brasil');
const idsEuropa = carregar(europa, 'e', 'Europa');

const POSICOES = ['GOL', 'ZAG', 'LAT', 'VOL', 'MEI', 'ATA'];
// Quem não fecha o elenco no leilão completa com garotos da base (de graça e fracos).
POSICOES.forEach((pos) =>
  mapa.set(`base-${pos}`, { id: `base-${pos}`, nome: 'Garoto da base', pos, decada: null, nota: 62, origem: 'Base', base: true }),
);

export function jogador(id) {
  return mapa.get(id) || null;
}

export function idsDoPacote(pacote) {
  if (pacote === 'brasil') return [...idsBrasil];
  if (pacote === 'europa') return [...idsEuropa];
  return [...idsBrasil, ...idsEuropa];
}

export function epoca(j) {
  if (!j || j.decada == null) return 'Categoria de base';
  return `${j.origem}, anos ${j.decada}`;
}

export function iniciais(nome) {
  const partes = nome.split(' ').filter((p) => p.length > 2);
  if (partes.length > 1) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  return nome.slice(0, 2).toUpperCase();
}
