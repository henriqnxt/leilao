// Instruções individuais (como no FIFA): cada vaga do time recebe uma ordem.
// Elas mudam de verdade a partida: quem chuta mais, quanto o time ataca/defende e quanto rende cada estilo.
export const OPCOES = {
  GOL: [
    { id: 'debaixo', nome: 'Debaixo das traves', dica: 'Mais seguro nas finalizações' },
    { id: 'libero', nome: 'Goleiro-líbero', dica: 'Sai do gol e corta contra-ataques' },
  ],
  ZAG: [
    { id: 'seguro', nome: 'Seguro', dica: 'Só defende' },
    { id: 'sai', nome: 'Sai jogando', dica: 'Ajuda na posse, arrisca um pouco' },
  ],
  LE: [
    { id: 'fica', nome: 'Fica atrás', dica: 'Fecha o lado' },
    { id: 'apoia', nome: 'Apoia o ataque', dica: 'Cruza e chega na frente, deixa espaço atrás' },
  ],
  LD: [
    { id: 'fica', nome: 'Fica atrás', dica: 'Fecha o lado' },
    { id: 'apoia', nome: 'Apoia o ataque', dica: 'Cruza e chega na frente, deixa espaço atrás' },
  ],
  VOL: [
    { id: 'marca', nome: 'Marca firme', dica: 'Protege a defesa' },
    { id: 'sobe', nome: 'Sai jogando', dica: 'Mais posse e ataque, menos proteção' },
  ],
  MEI: [
    { id: 'arma', nome: 'Fica e arma', dica: 'Dita o ritmo, mais posse' },
    { id: 'chega', nome: 'Chega na área', dica: 'Finaliza muito, ajuda menos atrás' },
  ],
  PE: [
    { id: 'fundo', nome: 'Vai à linha de fundo', dica: 'Fortalece o jogo pelas alas' },
    { id: 'dentro', nome: 'Corta pra dentro', dica: 'Chuta mais a gol' },
  ],
  PD: [
    { id: 'fundo', nome: 'Vai à linha de fundo', dica: 'Fortalece o jogo pelas alas' },
    { id: 'dentro', nome: 'Corta pra dentro', dica: 'Chuta mais a gol' },
  ],
  ATA: [
    { id: 'area', nome: 'Fixo na área', dica: 'Artilheiro: finaliza tudo' },
    { id: 'sai', nome: 'Sai da área', dica: 'Abre espaço, ajuda o meio e o contra-ataque' },
    { id: 'pressiona', nome: 'Pressiona a saída', dica: 'Rouba bola lá na frente' },
  ],
};

export const padrao = (pos) => (OPCOES[pos] ? OPCOES[pos][0].id : null);
export const valida = (pos, id) => !!OPCOES[pos] && OPCOES[pos].some((o) => o.id === id);

// efeito de cada instrução: soma em pontos de nota (ataque, defesa, estilos) e multiplica a chance de gol
const EFEITO = {
  'GOL:debaixo': { defesa: 0.5 },
  'GOL:libero': { posse: 1, libero: 1 },
  'ZAG:seguro': { defesa: 1 },
  'ZAG:sai': { posse: 1.5, defesa: -0.5 },
  'LE:fica': { defesa: 1.2, alas: -1 },
  'LE:apoia': { alas: 2.5, defesa: -1.5, gol: 1.3 },
  'LD:fica': { defesa: 1.2, alas: -1 },
  'LD:apoia': { alas: 2.5, defesa: -1.5, gol: 1.3 },
  'VOL:marca': { defesa: 2, ataque: -0.5 },
  'VOL:sobe': { posse: 2, ataque: 1, defesa: -1.5 },
  'MEI:arma': { posse: 1.5, meio: 1 },
  'MEI:chega': { ataque: 1.5, defesa: -1, gol: 1.6 },
  'PE:fundo': { alas: 2.5, gol: 0.85 },
  'PE:dentro': { meio: 1.5, alas: -1, gol: 1.4 },
  'PD:fundo': { alas: 2.5, gol: 0.85 },
  'PD:dentro': { meio: 1.5, alas: -1, gol: 1.4 },
  'ATA:area': { meio: 1, gol: 1.35 },
  'ATA:sai': { meio: 2, contra: 1, gol: 0.9 },
  'ATA:pressiona': { ataque: 1, defesa: 0.5, pressao: 1 },
};

// soma dos efeitos do time; jogadores melhores executam melhor a ordem
export function efeitos(elenco, instrucoes = {}) {
  const tot = { ataque: 0, defesa: 0, alas: 0, meio: 0, contra: 0, posse: 0, libero: 0, pressao: 0 };
  const multGol = elenco.map(() => 1);
  elenco.forEach((e, k) => {
    const id = valida(e.vaga, instrucoes[k]) ? instrucoes[k] : padrao(e.vaga);
    const ef = EFEITO[`${e.vaga}:${id}`];
    if (!ef) return;
    const q = Math.max(0.5, Math.min(1.2, e.n / 85));
    Object.keys(tot).forEach((c) => {
      if (ef[c]) tot[c] += ef[c] * (c === 'libero' || c === 'pressao' ? 1 : q);
    });
    if (ef.gol) multGol[k] = ef.gol;
  });
  return { ...tot, multGol };
}
