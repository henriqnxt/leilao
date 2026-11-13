// Táticas: valem metade da força do time na partida. A outra metade é a qualidade dos jogadores.
// A tática rende de acordo com o elenco: atacar pelas alas só funciona com bons pontas e laterais.
export const ESTILOS = [
  { id: 'alas', nome: 'Pelas alas', dica: 'Pontas e laterais decidem' },
  { id: 'meio', nome: 'Pelo meio', dica: 'Meias e centroavante decidem' },
  { id: 'contra', nome: 'Contra-ataque', dica: 'Mata quem marca alto' },
  { id: 'posse', nome: 'Posse de bola', dica: 'Segura a bola e cansa o rival' },
];
export const MARCACOES = [
  { id: 'alta', nome: 'Pressão alta', dica: 'Rouba mais bolas, mas deixa espaço atrás e cansa no fim' },
  { id: 'normal', nome: 'Normal', dica: 'Equilibrado' },
  { id: 'recuada', nome: 'Recuada', dica: 'Toma menos gol, faz menos gol' },
];
export const PERDENDO = [
  { id: 'pressionar', nome: 'Pressionar', dica: 'Do 60\' em diante, se estiver perdendo, vai pra cima' },
  { id: 'manter', nome: 'Manter o plano', dica: 'Não muda nada' },
];
export const TATICA_PADRAO = { estilo: 'meio', marcacao: 'normal', perdendo: 'pressionar' };

export const valida = (t) =>
  !!t && ESTILOS.some((e) => e.id === t.estilo) && MARCACOES.some((m) => m.id === t.marcacao) && PERDENDO.some((p) => p.id === t.perdendo);

// Quanto o elenco "encaixa" em cada estilo (média dos jogadores que fazem aquele estilo funcionar)
export function encaixe(F, estilo) {
  const m = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);
  const de = (...vagas) => F.elenco.filter((e) => vagas.includes(e.vaga)).map((e) => e.n);
  const linha = m(F.elenco.filter((e) => e.vaga !== 'GOL').map((e) => e.n)) || 60;
  const pega = (l, falta) => (l.length >= 2 ? m(l) : l.length ? (m(l) + linha - falta) / 2 : linha - falta);
  const bonus = (F.mods && F.mods[estilo]) || 0; // instruções dos jogadores somam aqui
  if (estilo === 'alas') return pega(de('PE', 'PD', 'LE', 'LD'), 10) + bonus;
  if (estilo === 'meio') return pega(de('MEI', 'VOL', 'ATA'), 6) + bonus;
  if (estilo === 'contra') return pega(de('ATA', 'PE', 'PD'), 6) + bonus;
  return pega(de('VOL', 'MEI'), 8) + bonus; // posse
}

export function melhorEstilo(F) {
  return ESTILOS.map((e) => e.id).sort((x, y) => encaixe(F, y) - encaixe(F, x))[0];
}
