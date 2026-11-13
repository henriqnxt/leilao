// Regras da sala. Funções puras: recebem o estado e uma ação, devolvem o novo estado.
// Só o host roda isto "valendo"; os outros recebem o resultado pronto.
import { iniciarLeilao, reduzirLeilao } from './auction.js';
import { montarCampeonato } from './campeonato.js';

export const MAX_TECNICOS = 16;
export const MIN_TECNICOS = 2; // conta bots: dá para jogar sozinho contra bots

const NOMES_BOT = ['Telê Bot', 'Felipão Bot', 'Zagallo Bot', 'Muricy Bot', 'Tite Bot', 'Luxa Bot', 'Abel Bot', 'Mano Bot', 'Cuca Bot', 'Renato Bot', 'Parreira Bot', 'Dorival Bot', 'Jesus Bot', 'Sampaoli Bot', 'Diniz Bot'];

export const MODOS_IDS = ['br', 'eu', 'wc'];

export const STATS = [
  { id: true, nome: 'Stats visíveis' },
  { id: false, nome: 'Stats ocultas' },
];

export const EM_CAMPO = [
  { id: 5, nome: '5 em campo' },
  { id: 11, nome: '11 em campo' },
];

export const FORMATOS = [
  { id: 'pontos', nome: 'Pontos corridos' },
  { id: 'mata', nome: 'Mata-mata' },
  { id: 'ambos', nome: 'Os dois' },
];

const vale = (lista, id) => lista.some((o) => o.id === id);

function limparNome(nome) {
  return String(nome || '').replace(/\s+/g, ' ').trim().slice(0, 16) || 'Técnico';
}

function nomeLivre(tecnicos, nome, meuId) {
  const usados = tecnicos.filter((t) => t.id !== meuId).map((t) => t.nome.toLowerCase());
  if (!usados.includes(nome.toLowerCase())) return nome;
  let n = 2;
  while (usados.includes(`${nome} ${n}`.toLowerCase())) n += 1;
  return `${nome} ${n}`;
}

export function novaSala(codigo, dono) {
  return {
    codigo,
    epoch: 1, // sobe toda vez que o host muda
    v: 1, // sobe a cada mudança de estado
    hostId: dono.id,
    fase: 'lobby',
    config: { modo: 'br', stats: true, emCampo: 11, formato: 'ambos' },
    tecnicos: [{ id: dono.id, nome: limparNome(dono.nome) }],
  };
}

// Devolve o MESMO objeto quando nada muda (é assim que o host sabe que não precisa reenviar).
export function reduzir(s, a) {
  if (!s || !a || !a.de) return s;
  const souHost = a.de === s.hostId;

  switch (a.tipo) {
    case 'entrar': {
      const nome = limparNome(a.nome);
      const atual = s.tecnicos.find((t) => t.id === a.de);
      if (atual) {
        const novo = nomeLivre(s.tecnicos, nome, a.de);
        if (novo === atual.nome) return s;
        return { ...s, tecnicos: s.tecnicos.map((t) => (t.id === a.de ? { ...t, nome: novo } : t)) };
      }
      if (s.fase !== 'lobby' || s.tecnicos.length >= MAX_TECNICOS) return s;
      return { ...s, tecnicos: [...s.tecnicos, { id: a.de, nome: nomeLivre(s.tecnicos, nome, a.de) }] };
    }

    case 'sair': {
      if (s.fase !== 'lobby' || !s.tecnicos.some((t) => t.id === a.de)) return s;
      const tecnicos = s.tecnicos.filter((t) => t.id !== a.de);
      if (!souHost) return { ...s, tecnicos };
      // o dono saiu: passa a sala para o próximo da lista
      const proximo = tecnicos.find((t) => !t.bot);
      return proximo ? { ...s, tecnicos, hostId: proximo.id, epoch: s.epoch + 1 } : { ...s, tecnicos };
    }

    case 'bot': {
      if (!souHost || s.fase !== 'lobby' || s.tecnicos.length >= MAX_TECNICOS) return s;
      const usados = s.tecnicos.map((t) => t.nome);
      const nome = NOMES_BOT.find((n) => !usados.includes(n)) || `Bot ${s.tecnicos.length + 1}`;
      const id = `bot-${Date.now().toString(36)}-${s.tecnicos.length}`;
      return { ...s, tecnicos: [...s.tecnicos, { id, nome, bot: true }] };
    }

    case 'remover': {
      if (!souHost || s.fase !== 'lobby' || a.alvo === s.hostId) return s;
      if (!s.tecnicos.some((t) => t.id === a.alvo)) return s;
      return { ...s, tecnicos: s.tecnicos.filter((t) => t.id !== a.alvo) };
    }

    case 'config': {
      if (!souHost || s.fase !== 'lobby') return s;
      const c = { ...s.config };
      if (MODOS_IDS.includes(a.modo)) c.modo = a.modo;
      if (typeof a.stats === 'boolean') c.stats = a.stats;
      if (vale(EM_CAMPO, a.emCampo)) c.emCampo = a.emCampo;
      if (vale(FORMATOS, a.formato)) c.formato = a.formato;
      if (['modo', 'stats', 'emCampo', 'formato'].every((k) => c[k] === s.config[k])) return s;
      return { ...s, config: c };
    }

    case 'comecar': {
      if (!souHost || s.fase !== 'lobby' || s.tecnicos.length < MIN_TECNICOS) return s;
      return iniciarLeilao(s, a.agora || Date.now());
    }

    case 'campeonato': {
      if (!souHost || s.fase !== 'escalacao') return s;
      const semente = Math.floor(Math.random() * 2 ** 31);
      return { ...s, fase: 'campeonato', camp: montarCampeonato(s, semente) };
    }

    case 'revelar': {
      if (!souHost || s.fase !== 'campeonato' || !s.camp) return s;
      const visto = Math.min(s.camp.passos.length, a.tudo ? s.camp.passos.length : s.camp.visto + 1);
      if (visto === s.camp.visto) return s;
      return { ...s, camp: { ...s.camp, visto } };
    }

    case 'reiniciar': {
      if (!souHost || s.fase === 'lobby') return s;
      const { times, leilao, camp, ...resto } = s;
      return { ...resto, fase: 'lobby' };
    }

    case 'foto': {
      if (!souHost || typeof a.id !== 'string') return s;
      const url = String(a.url || '').trim();
      if (url && !/^https:\/\//.test(url)) return s;
      return { ...s, fotos: { ...(s.fotos || {}), [a.id]: url } };
    }

    default:
      return reduzirLeilao(s, a);
  }
}
