import { useState } from 'react';
import { EM_CAMPO, FORMATOS, MAX_TECNICOS, MIN_TECNICOS } from '../engine/state.js';
import { MODOS } from '../data/jogadores.js';
import Topo, { AvisoRede } from '../components/Topo.jsx';
import { Emblema } from '../components/Carta.jsx';

export const CORES_TEC = ['#9fd6ff', '#f2c14e', '#3ddc84', '#ff8a65', '#c792ea', '#ff6b9a', '#7fe0d0', '#ffd166', '#a3b8ff', '#e9a3ff', '#b5e48c', '#ffb4a2', '#90dbf4', '#f7d6e0', '#ffc6ff', '#caffbf'];

export default function Lobby({ estado, online, eu, souHost, conexao, enviar, aoSair }) {
  const [recado, setRecado] = useState('');
  const { codigo, tecnicos, config, hostId } = estado;
  const dono = tecnicos.find((t) => t.id === hostId);
  const link = `${window.location.origin}${window.location.pathname}#/s/${codigo}`;

  async function convidar() {
    const texto = `Bora pro Leilão das Lendas? Sala ${codigo}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Leilão das Lendas', text: texto, url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      setRecado('Link copiado');
    } catch (erro) {
      if (erro && erro.name === 'AbortError') return;
      setRecado(link);
    }
    setTimeout(() => setRecado(''), 4000);
  }

  const config_ = (mudanca) => enviar({ tipo: 'config', ...mudanca });

  return (
    <main className="pagina">
      <Topo>
        <span className="chip">
          Sala <strong>{codigo}</strong>
        </span>
      </Topo>
      <AvisoRede conexao={conexao} />

      <div className="duas">
        <div className="coluna">
          <section className="painel">
            <span className="sobre">Modo de jogo</span>
            {!souHost && <p className="texto" style={{ fontSize: 13, marginTop: 4 }}>Quem escolhe é {dono ? dono.nome : 'o dono da sala'}.</p>}
            <div className="modos" style={{ marginTop: 10 }}>
              {MODOS.map((m) => (
                <button key={m.id} type="button" className={`modo ${m.id}`} aria-pressed={config.modo === m.id} disabled={!souHost} onClick={() => config_({ modo: m.id })}>
                  <div className={`emb carta ${m.id}`} style={{ position: 'absolute', inset: 'auto', right: -26, top: -26, width: 150, height: 150, opacity: 0.35 }}>
                    <Emblema modo={m.id} />
                  </div>
                  <span className="marca-ok" aria-hidden="true">
                    {config.modo === m.id && (
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#06100c" strokeWidth="3.5">
                        <path d="M5 12l5 5 9-10" />
                      </svg>
                    )}
                  </span>
                  <h3>{m.nome}</h3>
                  <p>{m.texto}</p>
                  <span className="regra">● {m.regra}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="painel opcoes">
            <div>
              <span className="sobre">Stats nas cartas</span>
              <div className="seg" style={{ marginTop: 8 }}>
                <button type="button" aria-pressed={config.stats} disabled={!souHost} onClick={() => config_({ stats: true })}>
                  Visíveis
                </button>
                <button type="button" aria-pressed={!config.stats} disabled={!souHost} onClick={() => config_({ stats: false })}>
                  Ocultas
                </button>
              </div>
            </div>
            <div>
              <span className="sobre">Tamanho do time</span>
              <div className="seg" style={{ marginTop: 8 }}>
                {EM_CAMPO.map((o) => (
                  <button key={o.id} type="button" aria-pressed={config.emCampo === o.id} disabled={!souHost} onClick={() => config_({ emCampo: o.id })}>
                    {o.nome}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="sobre">Campeonato</span>
              <div className="seg" style={{ marginTop: 8 }}>
                {FORMATOS.map((o) => (
                  <button key={o.id} type="button" aria-pressed={config.formato === o.id} disabled={!souHost} onClick={() => config_({ formato: o.id })}>
                    {o.nome}
                  </button>
                ))}
              </div>
            </div>
          </section>
          <p className="nota-rodape" style={{ textAlign: 'left' }}>
            {config.stats
              ? 'Stats visíveis: todo mundo vê o geral e as stats de cada carta durante o leilão.'
              : 'Stats ocultas: ninguém vê o geral no leilão. Vale a memória: como esse cara jogou naquele ano? As notas aparecem quando o leilão acaba.'}
          </p>
        </div>

        <div className="coluna">
          <section className="painel placa">
            <div className="p">
              <span>Sala</span>
              <b>{codigo}</b>
            </div>
            <div className="cabo" aria-hidden="true" />
            <button type="button" className="btn escuro" style={{ marginTop: 14, width: '100%' }} onClick={convidar}>
              Chamar a galera
            </button>
            <p role="status" style={{ minHeight: 18, margin: '8px 0 0', color: 'var(--gold)', fontSize: 13, wordBreak: 'break-all', textAlign: 'center' }}>
              {recado}
            </p>
          </section>

          <section className="painel">
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="sobre">Técnicos</span>
              <span className="sobre">
                {tecnicos.length} de {MAX_TECNICOS}
              </span>
            </div>
            <ol className="lista" style={{ marginTop: 6 }}>
              {tecnicos.map((t, i) => {
                const ligado = t.id === eu.id || online.includes(t.id);
                return (
                  <li key={t.id}>
                    <span className="av" style={{ '--c': CORES_TEC[i % CORES_TEC.length] }}>
                      {t.nome[0].toUpperCase()}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.nome}
                        {t.id === eu.id && <span style={{ color: 'var(--mute)', fontWeight: 400 }}> (você)</span>}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--mute)' }}>
                        {t.id === hostId ? 'Dono da sala' : 'Técnico'}
                        {!ligado && ', caiu a conexão'}
                      </span>
                    </span>
                    <span className={`online ${ligado ? '' : 'off'}`} aria-label={ligado ? 'online' : 'offline'} />
                    {souHost && t.id !== hostId && (
                      <button type="button" className="mini-btn" onClick={() => enviar({ tipo: 'remover', alvo: t.id })}>
                        Tirar
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          {souHost ? (
            <>
              <button type="button" className="btn ouro grande" disabled={tecnicos.length < MIN_TECNICOS} onClick={() => enviar({ tipo: 'comecar' })}>
                Começar o leilão
              </button>
              {tecnicos.length < MIN_TECNICOS && <p className="nota-rodape">Chame pelo menos mais um técnico para começar.</p>}
            </>
          ) : (
            <p className="nota-rodape" style={{ fontSize: 14 }}>
              Esperando {dono ? dono.nome : 'o dono'} começar o leilão.
            </p>
          )}
          <button type="button" className="link" onClick={aoSair}>
            Sair da sala
          </button>
        </div>
      </div>
    </main>
  );
}
