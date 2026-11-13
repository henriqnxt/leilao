import { useEffect, useRef, useState } from 'react';
import AoVivo, { duracaoDe } from '../components/AoVivo.jsx';
import { classificacao } from '../engine/campeonato.js';
import { confete, som } from '../lib/efeitos.js';
import Topo, { AvisoRede } from '../components/Topo.jsx';
import { CORES_TEC } from './Lobby.jsx';

function Jogo({ g, nome }) {
  if (g.folga) {
    return (
      <div className="jogo">
        <span className="t a ganhou">{nome(g.a)}</span>
        <span className="placar" style={{ fontSize: 13 }}>
          folga
        </span>
        <span className="t" style={{ color: 'var(--mute)' }}>
          passa direto
        </span>
      </div>
    );
  }
  const gols = (t) => g.gols.filter((x) => x.t === t).map((x) => `${x.nome} ${x.min}'`);
  return (
    <div className="jogo">
      <span className={`t a ${g.vence === g.a ? 'ganhou' : ''}`}>{nome(g.a)}</span>
      <span className="placar">
        {g.ga} × {g.gb}
      </span>
      <span className={`t ${g.vence === g.b ? 'ganhou' : ''}`}>{nome(g.b)}</span>
      {(g.gols.length > 0 || g.pen) && (
        <div className="gols">
          {gols(g.a).join(', ')}
          {gols(g.a).length && gols(g.b).length ? '  |  ' : ''}
          {gols(g.b).join(', ')}
          {g.pen ? ` — Pênaltis: ${g.pen[0]} × ${g.pen[1]}` : ''}
        </div>
      )}
    </div>
  );
}

export default function Campeonato({ estado, eu, souHost, conexao, enviar, desvio = 0 }) {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 400);
    return () => clearInterval(t);
  }, []);
  const { camp, tecnicos } = estado;
  const nome = (id) => (tecnicos.find((t) => t.id === id) || {}).nome || '?';
  const ids = tecnicos.map((t) => t.id);
  const ao = camp.aoVivo;
  const passoAo = ao ? camp.passos[ao.passo] : null;
  const inicioAo = ao ? ao.inicio + desvio : 0;
  const aoVivo = !!ao && agora < inicioAo + duracaoDe(passoAo);
  // a rodada ao vivo só entra na tabela e na lista quando o jogo acaba
  const vistos = camp.passos.slice(0, aoVivo ? camp.visto - 1 : camp.visto);
  const cor = (id) => CORES_TEC[Math.max(0, tecnicos.findIndex((t) => t.id === id)) % CORES_TEC.length];
  useEffect(() => {
    if (souHost && ao && !aoVivo) enviar({ tipo: 'fimAoVivo' });
  }, [souHost, ao, aoVivo, enviar]);
  const rodadas = vistos.filter((p) => p.tipo === 'rodada');
  const temTabela = camp.passos.some((p) => p.tipo === 'rodada');
  const tabela = temTabela ? classificacao(ids, rodadas.map((p) => p.jogos)) : [];
  const vagasMata = camp.passos.some((p) => p.tipo === 'mata') && temTabela ? (ids.length >= 4 ? 4 : 2) : 0;
  const acabou = camp.visto >= camp.passos.length && !aoVivo;
  const proximo = camp.passos[camp.visto];

  const avisou = useRef(false);
  useEffect(() => {
    if (acabou && !avisou.current) {
      avisou.current = true;
      som('bum');
      confete(window.innerWidth / 2, window.innerHeight / 3);
    }
  }, [acabou]);
  useEffect(() => {
    if (camp.visto > 0) som('martelo');
  }, [camp.visto]);

  return (
    <main className="pagina">
      <Topo>
        <span className="chip">
          Sala <strong>{estado.codigo}</strong>
        </span>
      </Topo>
      <AvisoRede conexao={conexao} />

      {acabou ? (
        <section className="painel campeao">
          <svg viewBox="0 0 100 120" aria-hidden="true">
            <defs>
              <linearGradient id="taca" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff3c4" />
                <stop offset="1" stopColor="#c8902a" />
              </linearGradient>
            </defs>
            <path d="M28 8h44v22c0 18-10 30-22 32-12-2-22-14-22-32z" fill="url(#taca)" />
            <path d="M28 16H14c0 14 8 22 16 24M72 16h14c0 14-8 22-16 24" stroke="#c8902a" strokeWidth="5" fill="none" />
            <path d="M42 62h16v22h12v14H30V84h12z" fill="url(#taca)" />
            <rect x="24" y="100" width="52" height="12" rx="3" fill="#8f5f10" />
          </svg>
          <span className="sobre">Campeão</span>
          <b>{nome(camp.campeao)}</b>
          <span style={{ color: 'var(--mute)' }}>{camp.campeao === eu.id ? 'É você! Pode zoar o grupo.' : 'Parabéns pro campeão.'}</span>
        </section>
      ) : (
        <div>
          <span className="sobre">Campeonato</span>
          <h1 className="titulo" style={{ fontSize: 'clamp(32px,5vw,52px)', marginTop: 6 }}>
            {aoVivo ? (
              <>
                {passoAo.nome} <em>ao vivo</em>
              </>
            ) : camp.visto === 0 ? (
              <>
                Bola <em>rolando</em>
              </>
            ) : (
              vistos[vistos.length - 1].nome
            )}
          </h1>
          <p className="texto" style={{ marginTop: 8 }}>
            {souHost ? 'Você revela os jogos, rodada por rodada.' : 'O dono da sala revela os jogos, rodada por rodada.'}
          </p>
        </div>
      )}

      <div className="duas">
        <div className="coluna">
          {aoVivo && <AoVivo key={ao.passo} passo={passoAo} inicio={inicioAo} estado={estado} eu={eu} nome={nome} cor={cor} />}
          {[...vistos].reverse().map((p) => (
            <section className="painel" key={p.nome}>
              <span className="sobre">{p.nome}</span>
              {p.jogos.map((g, k) => (
                <Jogo key={k} g={g} nome={nome} />
              ))}
            </section>
          ))}
          {camp.visto === 0 && (
            <section className="painel">
              <span className="sobre">Força dos times</span>
              {[...ids]
                .sort((a, b) => camp.forcas[b].geral - camp.forcas[a].geral)
                .map((id) => (
                  <div className="kv" key={id} style={{ padding: '6px 0' }}>
                    <span>
                      {nome(id)}
                      {id === eu.id ? ' (você)' : ''}
                    </span>
                    <b>
                      {camp.forcas[id].geral} · ATA {camp.forcas[id].ATA} · DEF {camp.forcas[id].DEF}
                    </b>
                  </div>
                ))}
            </section>
          )}
        </div>
        <div className="coluna">
          {temTabela && (
            <section className="painel">
              <span className="sobre">Classificação</span>
              <div className="rolagem">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Técnico</th>
                      <th>P</th>
                      <th>J</th>
                      <th>V</th>
                      <th>SG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabela.map((l, k) => (
                      <tr key={l.id} className={`${l.id === eu.id ? 'eu' : ''} ${k < vagasMata ? 'vai' : ''}`}>
                        <td>{k + 1}</td>
                        <td>
                          <span className="av" style={{ '--c': CORES_TEC[ids.indexOf(l.id) % CORES_TEC.length], width: 20, height: 20, fontSize: 11, display: 'inline-grid', marginRight: 8, verticalAlign: 'middle' }}>
                            {nome(l.id)[0].toUpperCase()}
                          </span>
                          {nome(l.id)}
                        </td>
                        <td>{l.pts}</td>
                        <td>{l.j}</td>
                        <td>{l.v}</td>
                        <td>{l.gp - l.gc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {vagasMata > 0 && <p className="dica" style={{ textAlign: 'left', marginTop: 8 }}>Os {vagasMata} primeiros vão para o mata-mata.</p>}
            </section>
          )}
          {souHost && aoVivo && (
            <button type="button" className="btn escuro" onClick={() => enviar({ tipo: 'fimAoVivo' })}>
              Ver resultado agora
            </button>
          )}
          {souHost && !acabou && !aoVivo && (
            <>
              <button type="button" className="btn ouro grande" onClick={() => enviar({ tipo: 'revelar' })}>
                {proximo ? `Jogar: ${proximo.nome}` : 'Ver resultado'}
              </button>
              <button type="button" className="link" onClick={() => enviar({ tipo: 'revelar', tudo: true })}>
                Pular para o final
              </button>
            </>
          )}
          {souHost && acabou && (
            <button type="button" className="btn ouro grande" onClick={() => enviar({ tipo: 'reiniciar' })}>
              Nova partida com a mesma galera
            </button>
          )}
          {!souHost && acabou && <p className="nota-rodape">O dono da sala pode começar uma nova partida.</p>}
        </div>
      </div>
    </main>
  );
}
