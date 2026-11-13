import { useEffect, useRef, useState } from 'react';
import { cliente } from './lib/supabase.js';
import { conectarSala } from './net/room.js';
import { MAX_TECNICOS } from './engine/state.js';
import Home from './screens/Home.jsx';
import Lobby from './screens/Lobby.jsx';
import Auction from './screens/Auction.jsx';
import Escalacao from './screens/Escalacao.jsx';
import Campeonato from './screens/Campeonato.jsx';
import Estadio from './components/Estadio.jsx';
import { FotosDaSala } from './lib/fotos.js';

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sem I e O, que confundem

function lerCodigo() {
  const achou = window.location.hash.toUpperCase().match(/^#\/S\/([A-Z]{4})$/);
  return achou ? achou[1] : null;
}

function novoCodigo() {
  let c = '';
  for (let i = 0; i < 4; i += 1) c += LETRAS[Math.floor(Math.random() * LETRAS.length)];
  return c;
}

function meuId() {
  let id = localStorage.getItem('leilao:id');
  if (!id) {
    id = window.crypto?.randomUUID ? window.crypto.randomUUID() : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('leilao:id', id);
  }
  return id;
}

export default function App() {
  return (
    <>
      <Estadio />
      <Conteudo />
    </>
  );
}

function Conteudo() {
  const [codigo, setCodigo] = useState(lerCodigo);
  const [nome, setNome] = useState(() => localStorage.getItem('leilao:nome') || '');
  // Já apertou "entrar"? Quem recarrega a página dentro de uma sala volta direto para ela.
  const [confirmado, setConfirmado] = useState(() => {
    const c = lerCodigo();
    return !!c && !!localStorage.getItem('leilao:nome') && !!localStorage.getItem(`leilao:sala:${c}`);
  });

  useEffect(() => {
    const aoTrocar = () => setCodigo(lerCodigo());
    window.addEventListener('hashchange', aoTrocar);
    return () => window.removeEventListener('hashchange', aoTrocar);
  }, []);

  if (!cliente) {
    return (
      <Aviso titulo="Falta ligar o Supabase">
        O site foi publicado sem os Secrets VITE_SUPABASE_URL e VITE_SUPABASE_KEY. Cadastre os dois no GitHub
        (Settings, Secrets and variables, Actions) e rode o deploy de novo.
      </Aviso>
    );
  }

  function entrar(apelido, codigoDigitado) {
    const limpo = apelido.trim().slice(0, 16);
    localStorage.setItem('leilao:nome', limpo);
    setNome(limpo);
    setConfirmado(true);
    let destino = codigoDigitado || codigo;
    if (!destino) {
      destino = novoCodigo();
      sessionStorage.setItem('leilao:criar', destino);
    }
    window.location.hash = `#/s/${destino}`;
  }

  function voltarAoInicio() {
    setConfirmado(false);
    window.location.hash = '';
  }

  if (!codigo || !nome || !confirmado) {
    return <Home convite={codigo} nomeSalvo={nome} aoEntrar={entrar} aoRecusar={voltarAoInicio} />;
  }

  return <Sala key={codigo} codigo={codigo} eu={{ id: meuId(), nome }} aoSair={voltarAoInicio} />;
}

function Sala({ codigo, eu, aoSair }) {
  const [foto, setFoto] = useState(null);
  const sala = useRef(null);

  useEffect(() => {
    const criar = sessionStorage.getItem('leilao:criar') === codigo;
    sessionStorage.removeItem('leilao:criar');
    const conexao = conectarSala({ cliente, codigo, eu, criar, aoMudar: setFoto });
    sala.current = conexao;
    return () => conexao.fechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, eu.id, eu.nome]);

  // Mantém a tela acesa: se o celular do dono apaga, o relógio da sala para.
  useEffect(() => {
    let trava = null;
    const pedir = async () => {
      try {
        if (document.visibilityState === 'visible' && navigator.wakeLock) {
          trava = await navigator.wakeLock.request('screen');
        }
      } catch {
        /* o navegador negou: segue sem */
      }
    };
    pedir();
    document.addEventListener('visibilitychange', pedir);
    return () => {
      document.removeEventListener('visibilitychange', pedir);
      if (trava) trava.release().catch(() => {});
    };
  }, []);

  async function sair() {
    if (sala.current) await sala.current.sair();
    aoSair();
  }

  if (!foto) return <Aviso titulo="Entrando na sala…" />;

  const { estado, online, conexao, vazia, removido, souHost, desvio } = foto;

  if (removido) {
    return (
      <Aviso titulo="Você saiu desta sala" botao="Voltar ao início" aoClicar={aoSair}>
        O dono da sala removeu você da lista.
      </Aviso>
    );
  }

  if (!estado) {
    if (!vazia) return <Aviso titulo={`Procurando a sala ${codigo}…`} />;
    return (
      <Aviso
        titulo={`A sala ${codigo} está vazia`}
        botao="Abrir esta sala como dono"
        aoClicar={() => sala.current.abrir()}
        segundo="Voltar ao início"
        aoSegundo={aoSair}
      >
        Ninguém respondeu. Confira o código com quem te chamou, ou abra a sala você mesmo.
      </Aviso>
    );
  }

  if (!estado.tecnicos.some((t) => t.id === eu.id)) {
    if (estado.fase !== 'lobby') {
      return (
        <Aviso titulo="O leilão já começou" botao="Voltar ao início" aoClicar={aoSair}>
          Esta sala fechou a lista de técnicos. Peça um link novo para a próxima.
        </Aviso>
      );
    }
    if (estado.tecnicos.length >= MAX_TECNICOS) {
      return (
        <Aviso titulo="Sala cheia" botao="Voltar ao início" aoClicar={aoSair}>
          Já tem {MAX_TECNICOS} técnicos aqui.
        </Aviso>
      );
    }
    return <Aviso titulo="Entrando na sala…" />;
  }

  const enviar = (acao) => sala.current.enviar(acao);

  let tela;
  if (estado.fase === 'leilao') {
    tela = <Auction estado={estado} eu={eu} desvio={desvio} conexao={conexao} enviar={enviar} />;
  } else if (estado.fase === 'escalacao') {
    tela = <Escalacao estado={estado} eu={eu} souHost={souHost} conexao={conexao} enviar={enviar} />;
  } else if (estado.fase === 'campeonato') {
    tela = <Campeonato estado={estado} eu={eu} souHost={souHost} conexao={conexao} enviar={enviar} />;
  }
  if (tela) return <FotosDaSala.Provider value={estado.fotos || {}}>{tela}</FotosDaSala.Provider>;

  return (
    <Lobby
      estado={estado}
      online={online}
      eu={eu}
      souHost={souHost}
      conexao={conexao}
      enviar={enviar}
      aoSair={sair}
    />
  );
}

function Aviso({ titulo, children, botao, aoClicar, segundo, aoSegundo }) {
  return (
    <main className="pagina estreita">
      <div className="aviso">
        <h1>{titulo}</h1>
        {children && <p className="texto">{children}</p>}
        {botao && (
          <button type="button" className="btn ouro grande" onClick={aoClicar}>
            {botao}
          </button>
        )}
        {segundo && (
          <button type="button" className="link" onClick={aoSegundo}>
            {segundo}
          </button>
        )}
      </div>
    </main>
  );
}
