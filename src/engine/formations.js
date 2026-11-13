// Formações. Cada uma é uma lista de linhas, do goleiro para o ataque, da esquerda para a direita.
const F11 = {
  '4-3-3': 'GOL/LE ZAG ZAG LD/MEI VOL MEI/PE ATA PD',
  '4-4-2': 'GOL/LE ZAG ZAG LD/MEI VOL VOL MEI/ATA ATA',
  '4-2-3-1': 'GOL/LE ZAG ZAG LD/VOL VOL/PE MEI PD/ATA',
  '4-1-4-1': 'GOL/LE ZAG ZAG LD/VOL/PE MEI MEI PD/ATA',
  '4-3-1-2': 'GOL/LE ZAG ZAG LD/VOL VOL VOL/MEI/ATA ATA',
  '4-2-2-2': 'GOL/LE ZAG ZAG LD/VOL VOL/MEI MEI/ATA ATA',
  '4-2-4': 'GOL/LE ZAG ZAG LD/VOL MEI/PE ATA ATA PD',
  '3-5-2': 'GOL/ZAG ZAG ZAG/LE VOL MEI VOL LD/ATA ATA',
  '3-4-3': 'GOL/ZAG ZAG ZAG/LE VOL VOL LD/PE ATA PD',
  '5-3-2': 'GOL/LE ZAG ZAG ZAG LD/VOL MEI VOL/ATA ATA',
  '5-4-1': 'GOL/LE ZAG ZAG ZAG LD/PE VOL VOL PD/ATA',
};

const F5 = {
  '2-1-1': 'GOL/ZAG ZAG/MEI/ATA',
  '1-2-1': 'GOL/ZAG/PE PD/ATA',
  '2-2': 'GOL/LE LD/PE PD',
  '1-1-2': 'GOL/ZAG/MEI/PE PD',
  '3-1': 'GOL/LE ZAG LD/ATA',
};

const TABELA = { 11: F11, 5: F5 };

export function formacoes(emCampo) {
  return Object.keys(TABELA[emCampo] || F11);
}

export function formacaoPadrao(emCampo) {
  return emCampo === 5 ? '2-1-1' : '4-3-3';
}

export function linhasDa(emCampo, formacao) {
  const tabela = TABELA[emCampo] || F11;
  const texto = tabela[formacao] || tabela[formacaoPadrao(emCampo)];
  return texto.split('/').map((linha) => linha.split(' '));
}

export function vagasDa(emCampo, formacao) {
  return linhasDa(emCampo, formacao).flat();
}

export function existe(emCampo, formacao) {
  return !!(TABELA[emCampo] || F11)[formacao];
}

// Posição de cada vaga no desenho do campo (em %), goleiro embaixo.
export function coordenadas(emCampo, formacao) {
  const linhas = linhasDa(emCampo, formacao);
  const n = linhas.length;
  const pts = [];
  linhas.forEach((linha, li) => {
    const y = 90 - (li * 78) / Math.max(1, n - 1);
    const largura = linha.length >= 5 ? 84 : linha.length === 4 ? 76 : linha.length === 3 ? 64 : 40;
    linha.forEach((pos, k) => {
      const x = linha.length === 1 ? 50 : 50 - largura / 2 + (k * largura) / (linha.length - 1);
      pts.push({ pos, x, y });
    });
  });
  return pts;
}
