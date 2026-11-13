// Posições específicas, setores e quanto cada jogador rende fora da posição de origem.
export const SETOR = { GOL: 'GOL', ZAG: 'DEF', LE: 'DEF', LD: 'DEF', VOL: 'MEI', MEI: 'MEI', PE: 'ATA', PD: 'ATA', ATA: 'ATA' };

export const NOME_POS = {
  GOL: 'Goleiro', ZAG: 'Zagueiro', LE: 'Lateral-esquerdo', LD: 'Lateral-direito',
  VOL: 'Volante', MEI: 'Meia', PE: 'Ponta-esquerda', PD: 'Ponta-direita', ATA: 'Centroavante',
};

export const NOME_SETOR = { GOL: 'Goleiro', DEF: 'Defensor', MEI: 'Meio-campo', ATA: 'Atacante' };

export const CORES = {
  GOL: '#E0A100', ZAG: '#2F6BD6', LE: '#1F95B0', LD: '#1F95B0',
  VOL: '#7E57D1', MEI: '#2EA663', PE: '#E86A2E', PD: '#E86A2E', ATA: '#E5484D',
};

// Fora da posição de origem, dentro do mesmo setor. Setor diferente = 0 (não pode).
const TROCAS = {
  'LD-LE': 0.85,
  'PD-PE': 0.9,
  'ATA-PE': 0.75,
  'ATA-PD': 0.75,
  'MEI-VOL': 0.8,
  'LE-ZAG': 0.6,
  'LD-ZAG': 0.6,
};

// No 5 em campo não tem perda por posição: goleiro só no gol, e qualquer jogador de linha
// rende 100% em qualquer vaga de linha.
export function rendimento(origem, vaga, emCampo = 11) {
  if (!origem || !vaga) return 0;
  if (emCampo === 5) return (origem === 'GOL') === (vaga === 'GOL') ? 1 : 0;
  if (origem === vaga) return 1;
  if (SETOR[origem] !== SETOR[vaga]) return 0;
  return TROCAS[[origem, vaga].sort().join('-')] || 0.7;
}

// Nota que o jogador entrega naquela vaga.
export const notaNaVaga = (j, vaga, emCampo = 11) => (j ? Math.round(j.nota * rendimento(j.pos, vaga, emCampo)) : 0);
