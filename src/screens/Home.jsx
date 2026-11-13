import { useState } from 'react';
import Topo from '../components/Topo.jsx';
import Carta from '../components/Carta.jsx';
import { idsDoModo, jogador } from '../data/jogadores.js';

const melhor = (modo) =>
  idsDoModo(modo)
    .map(jogador)
    .sort((a, b) => b.nota - a.nota)[0];
const CAPA = [
  ['wc', melhor('wc')],
  ['br', melhor('br')],
  ['eu', melhor('eu')],
];

export default function Home({ convite, nomeSalvo, aoEntrar, aoRecusar }) {
  const [nome, setNome] = useState(nomeSalvo);
  const [codigo, setCodigo] = useState('');
  const [comCodigo, setComCodigo] = useState(false);

  const nomeOk = nome.trim().length >= 2;
  const codigoOk = /^[A-Za-z]{4}$/.test(codigo);

  return (
    <main className="pagina">
      <Topo />
      <section className="capa">
        <div>
          <span className="sobre">Leilão de futebol entre amigos</span>
          <h1 className="titulo" style={{ marginTop: 8 }}>
            Cada carta é <em>uma temporada</em>
          </h1>
          <p className="texto" style={{ marginTop: 12 }}>
            O geral vale pelo que o jogador fez naquela competição, naquele ano. O craque de um ano pode virar mico no outro. Lembre bem antes de
            levantar a plaquinha.
          </p>
          <div className="fatos">
            <div>
              R$ 100<span>por técnico</span>
            </div>
            <div>
              11<span>vagas</span>
            </div>
            <div>
              2–16<span>técnicos</span>
            </div>
          </div>
        </div>
        <div className="leque" aria-hidden="true">
          {CAPA.map(([modo, j]) => (
            <div className="lc" key={modo}>
              <div className="carta-box">
                <Carta j={j} modo={modo} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="painel entrada" style={{ maxWidth: 560 }}>
        {convite && (
          <p className="convite" style={{ margin: 0 }}>
            Te chamaram para a sala <strong>{convite}</strong>
          </p>
        )}
        <div>
          <label htmlFor="apelido" className="rotulo">
            Seu apelido de técnico
          </label>
          <input
            id="apelido"
            className="campo-texto"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            maxLength={16}
            autoComplete="nickname"
            placeholder="Ex.: Telê"
          />
        </div>

        {convite ? (
          <>
            <button type="button" className="btn ouro grande" disabled={!nomeOk} onClick={() => aoEntrar(nome)}>
              Entrar na sala {convite}
            </button>
            <button type="button" className="link" onClick={aoRecusar}>
              Prefiro criar outra sala
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn ouro grande" disabled={!nomeOk} onClick={() => aoEntrar(nome)}>
              Criar sala
            </button>
            {comCodigo ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  aria-label="Código da sala"
                  className="campo-texto codigo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4))}
                  placeholder="ABCD"
                  autoCapitalize="characters"
                  autoComplete="off"
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button type="button" className="btn escuro" disabled={!nomeOk || !codigoOk} onClick={() => aoEntrar(nome, codigo.toUpperCase())}>
                  Entrar
                </button>
              </div>
            ) : (
              <button type="button" className="link" onClick={() => setComCodigo(true)}>
                Tenho um código de sala
              </button>
            )}
          </>
        )}
      </section>

      <p className="nota-rodape">Sem cadastro. Crie a sala, mande o link no grupo e pronto. Fotos: Wikipédia e Wikimedia Commons.</p>
    </main>
  );
}
