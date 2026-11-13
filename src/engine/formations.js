// Formações. Cada uma é uma lista de linhas, do goleiro para o ataque.
const F11 = {
  '4-4-2': 'GOL/LAT ZAG ZAG LAT/MEI VOL VOL MEI/ATA ATA',
  '4-3-3': 'GOL/LAT ZAG ZAG LAT/MEI VOL MEI/ATA ATA ATA',
  '4-2-3-1': 'GOL/LAT ZAG ZAG LAT/VOL VOL/MEI MEI MEI/ATA',
  '4-1-4-1': 'GOL/LAT ZAG ZAG LAT/VOL/MEI MEI MEI MEI/ATA',
  '4-3-1-2': 'GOL/LAT ZAG ZAG LAT/VOL VOL VOL/MEI/ATA ATA',
  '4-1-2-1-2': 'GOL/LAT ZAG ZAG LAT/VOL/MEI MEI/MEI/ATA ATA',
  '4-2-2-2': 'GOL/LAT ZAG ZAG LAT/VOL VOL/MEI MEI/ATA ATA',
  '4-5-1': 'GOL/LAT ZAG ZAG LAT/MEI VOL VOL VOL MEI/ATA',
  '4-2-4': 'GOL/LAT ZAG ZAG LAT/VOL MEI/ATA ATA ATA ATA',
  '3-5-2': 'GOL/ZAG ZAG ZAG/LAT VOL MEI VOL LAT/ATA ATA',
  '3-4-3': 'GOL/ZAG ZAG ZAG/LAT VOL VOL LAT/ATA ATA ATA',
  '3-4-1-2': 'GOL/ZAG ZAG ZAG/LAT VOL VOL LAT/MEI/ATA ATA',
  '3-4-2-1': 'GOL/ZAG ZAG ZAG/LAT VOL VOL LAT/MEI MEI/ATA',
  '5-3-2': 'GOL/LAT ZAG ZAG ZAG LAT/VOL MEI VOL/ATA ATA',
  '5-4-1': 'GOL/LAT ZAG ZAG ZAG LAT/MEI VOL VOL MEI/ATA',
  '5-2-3': 'GOL/LAT ZAG ZAG ZAG LAT/VOL MEI/ATA ATA ATA',
};

const F5 = {
  '2-1-1': 'GOL/ZAG ZAG/MEI/ATA',
  '1-2-1': 'GOL/ZAG/MEI MEI/ATA',
  '2-2': 'GOL/ZAG ZAG/ATA ATA',
  '1-1-2': 'GOL/ZAG/MEI/ATA ATA',
  '3-1': 'GOL/ZAG ZAG ZAG/ATA',
  '1-3': 'GOL/ZAG/MEI ATA MEI',
  '2-1-1 com alas': 'GOL/LAT LAT/VOL/ATA',
  '1-2-1 marcador': 'GOL/ZAG/VOL MEI/ATA',
};

const TABELA = { 11: F11, 5: F5 };

export const CORES = {
  GOL: '#D99A00',
  ZAG: '#2B5FC2',
  LAT: '#1F8FA8',
  VOL: '#7A52C7',
  MEI: '#2E9E5B',
  ATA: '#E5484D',
};

export function formacoes(emCampo) {
  return Object.keys(TABELA[emCampo] || F11);
}

export function formacaoPadrao(emCampo) {
  return emCampo === 5 ? '2-1-1' : '4-4-2';
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
