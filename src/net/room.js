// Conexão da sala: um canal do Supabase Realtime por sala.
//  - Broadcast "acao":   quem não é host manda o que quer fazer (entrar, lance, tática...).
//  - Broadcast "estado": o host manda o estado completo da sala.
//  - Presence:           quem está online agora.
// O host também roda o relógio do leilão (4 vezes por segundo).
// O host também reenvia o estado a cada 2 s. Se ele ficar mudo, o próximo da lista assume.

import { novaSala, reduzir } from '../engine/state.js';
import { ajustarRelogio, avancar } from '../engine/auction.js';

const BATIDA = 2000; // host reenvia o estado
const SILENCIO_HOST = 6000; // tempo mudo até alguém assumir
const DEGRAU = 3000; // cada posição na fila espera um pouco mais
const ESPERA_SALA = 8000; // sem resposta: sala vazia
const VALIDADE = 6 * 60 * 60 * 1000; // estado salvo no aparelho vale 6 h

function maisNovo(a, b) {
  if (a.epoch !== b.epoch) return a.epoch > b.epoch;
  if (a.v !== b.v) return a.v > b.v;
  return a.hostId < b.hostId; // desempate fixo se dois assumirem juntos
}

function carregar(chave) {
  try {
    const salvo = JSON.parse(localStorage.getItem(chave));
    if (salvo && Date.now() - salvo.t < VALIDADE) return salvo.estado;
  } catch {
    /* sem estado salvo */
  }
  return null;
}

function salvar(chave, estado) {
  try {
    if (estado) localStorage.setItem(chave, JSON.stringify({ t: Date.now(), estado }));
    else localStorage.removeItem(chave);
  } catch {
    /* armazenamento cheio ou bloqueado: segue sem salvar */
  }
}

export function conectarSala({ cliente, codigo, eu, criar, aoMudar }) {
  const chave = `leilao:sala:${codigo}`;

  let estado = criar ? novaSala(codigo, eu) : carregar(chave);
  let online = [];
  let conexao = 'conectando'; // conectando | ok | reconectando
  let vazia = false;
  let removido = false;
  let fechado = false;
  let jaEstive = !!estado && estado.tecnicos.some((t) => t.id === eu.id);

  let inicio = Date.now();
  let ultimoHost = Date.now();
  let ultimoTick = Date.now();
  let ultimaBatida = 0;
  let desvio = 0; // meu relógio menos o relógio do host (para mostrar a contagem certa)

  const canal = cliente.channel(`sala:${codigo}`, {
    config: { broadcast: { self: false }, presence: { key: eu.id } },
  });

  const souHost = () => !!estado && estado.hostId === eu.id;
  const estouDentro = () => !!estado && estado.tecnicos.some((t) => t.id === eu.id);

  function avisar() {
    if (fechado) return;
    salvar(chave, estado);
    aoMudar({ estado, online, conexao, vazia, removido, desvio: souHost() ? 0 : desvio, souHost: souHost() });
  }

  function publicar() {
    if (conexao !== 'ok' || !estado) return;
    ultimaBatida = Date.now();
    canal.send({ type: 'broadcast', event: 'estado', payload: { ...estado, _t: Date.now() } });
  }

  function pedirEntrada() {
    if (conexao !== 'ok') return;
    canal.send({ type: 'broadcast', event: 'acao', payload: { tipo: 'entrar', de: eu.id, nome: eu.nome } });
  }

  // Só o host chama: aplica a mudança, numera e espalha.
  function gravar(proximo) {
    if (proximo === estado) return false;
    estado = { ...proximo, v: estado.v + 1 };
    ultimoHost = Date.now();
    publicar();
    avisar();
    return true;
  }

  function conferirVaga() {
    if (estouDentro()) {
      jaEstive = true;
      removido = false;
    } else if (jaEstive) {
      removido = true;
    }
  }

  function assumir() {
    estado = { ...ajustarRelogio(estado, desvio), hostId: eu.id, epoch: estado.epoch + 1, v: estado.v + 1 };
    desvio = 0;
    ultimoHost = Date.now();
    publicar();
    avisar();
  }

  canal.on('broadcast', { event: 'estado' }, ({ payload }) => {
    if (fechado || !payload || payload.codigo !== codigo) return;
    const { _t, ...novo } = payload;
    if (!estado || maisNovo(novo, estado)) {
      estado = novo;
      if (_t) desvio = Date.now() - _t;
      vazia = false;
      ultimoHost = Date.now();
      conferirVaga();
      avisar();
    } else if (souHost() && novo.hostId !== eu.id) {
      publicar(); // alguém está com estado velho achando que é host: corrige
    } else if (novo.hostId === estado.hostId) {
      ultimoHost = Date.now();
    }
  });

  canal.on('broadcast', { event: 'acao' }, ({ payload: acao }) => {
    if (fechado || !souHost() || !acao) return;
    const mudou = gravar(reduzir(estado, { ...acao, agora: Date.now() }));
    if (!mudou && acao.tipo === 'entrar') publicar(); // quem voltou precisa receber o estado
  });

  canal.on('presence', { event: 'sync' }, () => {
    if (fechado) return;
    online = Object.keys(canal.presenceState());
    avisar();
  });

  canal.on('presence', { event: 'join' }, () => {
    if (!fechado && souHost()) publicar();
  });

  canal.subscribe((status) => {
    if (fechado) return;
    if (status === 'SUBSCRIBED') {
      conexao = 'ok';
      inicio = Date.now();
      ultimoHost = Date.now();
      canal.track({ nome: eu.nome });
      if (souHost()) publicar();
      else pedirEntrada();
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      conexao = 'reconectando';
    }
    avisar();
  });

  const relogio = setInterval(() => {
    const agora = Date.now();
    // Se o aparelho ficou congelado (tela apagada), não saia assumindo a sala ao acordar.
    if (agora - ultimoTick > 3000) ultimoHost = agora;
    ultimoTick = agora;
    if (fechado || conexao !== 'ok' || removido) return;

    if (!estado) {
      pedirEntrada();
      if (!vazia && agora - inicio > ESPERA_SALA) {
        vazia = true;
        avisar();
      }
      return;
    }

    if (souHost()) {
      if (agora - ultimaBatida >= BATIDA) publicar();
      return;
    }

    if (!estouDentro()) pedirEntrada();

    // Migração de host: fila na ordem de entrada, só entre quem está online.
    const fila = estado.tecnicos.filter(
      (t) => !t.bot && t.id !== estado.hostId && (t.id === eu.id || online.includes(t.id)),
    );
    const posicao = fila.findIndex((t) => t.id === eu.id);
    if (posicao >= 0 && agora - ultimoHost > SILENCIO_HOST + posicao * DEGRAU) assumir();
  }, 1000);

  // Relógio do leilão: só o host anda com ele.
  const cronometro = setInterval(() => {
    if (fechado || conexao !== 'ok' || !souHost()) return;
    gravar(avancar(estado, Date.now()));
  }, 250);

  function enviar(acao) {
    const completa = { ...acao, de: eu.id };
    if (souHost()) gravar(reduzir(estado, { ...completa, agora: Date.now() }));
    else if (conexao === 'ok') canal.send({ type: 'broadcast', event: 'acao', payload: completa });
  }

  // Sala sem ninguém: quem chegou pode abrir de novo como dono.
  function abrir() {
    if (estado) return;
    estado = novaSala(codigo, eu);
    vazia = false;
    jaEstive = true;
    publicar();
    avisar();
  }

  function fechar() {
    if (fechado) return;
    fechado = true;
    clearInterval(relogio);
    clearInterval(cronometro);
    cliente.removeChannel(canal);
  }

  // Sair de verdade: avisa a sala, apaga o estado salvo e desconecta.
  async function sair() {
    enviar({ tipo: 'sair' });
    salvar(chave, null);
    fechado = true;
    clearInterval(relogio);
    clearInterval(cronometro);
    await new Promise((ok) => setTimeout(ok, 300)); // dá tempo da mensagem sair
    cliente.removeChannel(canal);
  }

  avisar();
  return { enviar, abrir, fechar, sair };
}
