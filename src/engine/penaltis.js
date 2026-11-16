// Disputa de pênaltis interativa: quem bate escolhe o canto, quem defende escolhe para onde o
// goleiro pula. Sem relógio: cada cobrança espera os dois escolherem. Bot escolhe na hora.

// Zonas do gol vistas de quem bate: esquerda / meio / direita, alto / baixo.
export const ZONAS = ['ea', 'ma', 'da', 'eb', 'mb', 'db'];
export const NOME_ZONA = { ea: 'alto à esquerda', ma: 'alto no meio', da: 'alto à direita', eb: 'rasteiro à esquerda', mb: 'rasteiro no meio', db: 'rasteiro à direita' };
export const coluna = (z) => z[0];
export const altura = (z) => z[1];

function rng(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (txt) => {
  let h = 2166136261;
  for (const c of String(txt)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
const sortear = (r, pesos) => {
  const total = Object.values(pesos).reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (const [k, p] of Object.entries(pesos)) {
    x -= p;
    if (x <= 0) return k;
  }
  return Object.keys(pesos)[0];
};

// Bot batendo prefere canto rasteiro; bot goleiro quase sempre pula para um lado.
const PESO_CHUTE = { ea: 1.3, ma: 0.5, da: 1.3, eb: 2, mb: 0.7, db: 2 };
const PESO_PULO = { ea: 1, ma: 0.4, da: 1, eb: 1.8, mb: 0.9, db: 1.8 };

// Monta a disputa a partir das forças dos dois times (lista de batedores e goleiros).
export function novaDisputa(Fa, Fb) {
  const batedores = (F) => F.elenco
    .filter((e) => e.vaga !== 'GOL')
    .sort((x, y) => y.n - x.n)
    .map((e) => ({ nome: e.nome, n: e.n }));
  const goleiro = (F) => {
    const g = F.elenco.find((e) => e.vaga === 'GOL');
    return g ? { nome: g.nome, n: g.n } : { nome: 'Goleiro', n: 65 };
  };
  return { bat: { a: batedores(Fa), b: batedores(Fb) }, gk: { a: goleiro(Fa), b: goleiro(Fb) }, cob: [], chute: null, pulo: null };
}

// De quem é a vez: o time "a" começa batendo.
export function vez(g) {
  const d = g.disputa;
  const k = d.cob.length;
  const lado = k % 2 === 0 ? 'a' : 'b';
  const outro = lado === 'a' ? 'b' : 'a';
  const lista = d.bat[lado];
  const nVez = Math.floor(k / 2);
  return { lado, outro, bate: g[lado], defende: g[outro], batedor: lista[nVez % lista.length], goleiro: d.gk[outro] };
}

export function placar(d) {
  let pa = 0;
  let pb = 0;
  d.cob.forEach((c, k) => {
    if (c.res === 'gol') {
      if (k % 2 === 0) pa += 1;
      else pb += 1;
    }
  });
  return [pa, pb];
}

// Acabou? 5 para cada; depois, alternadas até alguém abrir vantagem.
export function terminou(d) {
  const n = d.cob.length;
  const [pa, pb] = placar(d);
  const ja = { a: Math.ceil(n / 2), b: Math.floor(n / 2) };
  if (n <= 10) {
    const restaA = 5 - ja.a;
    const restaB = 5 - ja.b;
    if (pa + restaA < pb || pb + restaB < pa) return true;
    return n === 10 && pa !== pb;
  }
  return n % 2 === 0 && pa !== pb;
}

// Resultado de uma cobrança
export function cobrar(chute, pulo, batedor, goleiro, r) {
  const qual = (batedor.n - 78) / 40; // batedor bom erra menos
  const pFora = { a: 0.15, b: 0.05 }[altura(chute)] * (coluna(chute) === 'm' ? 0.5 : 1) * Math.max(0.35, 1 - qual);
  if (r() < pFora) return r() < 0.4 ? 'trave' : 'fora';
  const gkBonus = (goleiro.n - 80) / 100;
  let pDefesa = 0.03;
  if (coluna(chute) === coluna(pulo)) {
    pDefesa = chute === pulo ? 0.8 : 0.4;
    if (coluna(chute) === 'm' && altura(chute) === 'a' && altura(pulo) === 'b') pDefesa = 0.25; // cavadinha por cima
  } else if (coluna(chute) === 'm' || coluna(pulo) === 'm') pDefesa = altura(chute) === 'b' ? 0.12 : 0.05;
  pDefesa = Math.min(0.92, Math.max(0, pDefesa + gkBonus - qual * 0.15));
  return r() < pDefesa ? 'defesa' : 'gol';
}

export function escolhaBot(semente, k, papel) {
  return sortear(rng(hash(`${semente}:${k}:${papel}`)), papel === 'chute' ? PESO_CHUTE : PESO_PULO);
}

// Aplica uma escolha. "bots" = ids de bots (escolhem sozinhos). Devolve o jogo atualizado ou o mesmo.
export function escolher(g, quem, zona, bots, semente, agora, forcar = false) {
  if (!g.disputa || !g.penPendente) return g;
  const d = g.disputa;
  const v = vez(g);
  let { chute, pulo } = d;
  const k = d.cob.length;
  if (forcar) {
    chute = chute || escolhaBot(semente, k, 'chute');
    pulo = pulo || escolhaBot(semente, k, 'pulo');
  } else {
    if (!ZONAS.includes(zona)) return g;
    if (quem === v.bate && !chute) chute = zona;
    else if (quem === v.defende && !pulo) pulo = zona;
    else return g;
  }
  if (!chute && bots.includes(v.bate)) chute = escolhaBot(semente, k, 'chute');
  if (!pulo && bots.includes(v.defende)) pulo = escolhaBot(semente, k, 'pulo');
  if (!chute || !pulo) return { ...g, disputa: { ...d, chute, pulo } };

  const res = cobrar(chute, pulo, v.batedor, v.goleiro, rng(hash(`${semente}:${k}:res`)));
  const cob = [...d.cob, { lado: v.lado, batedor: v.batedor.nome, goleiro: v.goleiro.nome, chute, pulo, res, quando: agora }];
  const nd = { ...d, cob, chute: null, pulo: null };
  if (!terminou(nd)) return { ...g, disputa: nd };
  const pen = placar(nd);
  return { ...g, disputa: nd, penPendente: false, pen, vence: pen[0] > pen[1] ? g.a : g.b };
}

// Resolve tudo de uma vez (bot x bot, ou quando o dono pula para o final)
export function resolverTudo(g, semente, agora) {
  let atual = g;
  for (let k = 0; k < 60 && atual.penPendente; k += 1) atual = escolher(atual, null, null, [], semente, agora, true);
  return atual;
}
