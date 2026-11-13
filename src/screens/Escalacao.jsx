import { useMemo, useState } from 'react';
import { formacoes, vagasDa } from '../engine/formations.js';
import { forca } from '../engine/campeonato.js';
import { formacaoCabe } from '../engine/auction.js';
import { encaixe, ESTILOS, MARCACOES, PERDENDO, TATICA_PADRAO } from '../engine/tatica.js';
import { OPCOES, padrao } from '../engine/instrucoes.js';
import { CORES, notaNaVaga } from '../engine/posicoes.js';
import { jogador } from '../data/jogadores.js';
import Topo, { AvisoRede } from '../components/Topo.jsx';
import Campo from '../components/Campo.jsx';
import { CORES_TEC } from './Lobby.jsx';

export function TabelaRendimento() {
  return (
    <div className="tabela-rend">
      <div>
        <b className="verde-t">100%</b>Posição de origem
      </div>
      <div>
        <b className="ouro-t">85–90%</b>Lado trocado (LE↔LD, PE↔PD)
      </div>
      <div>
        <b className="ouro-t">75–80%</b>Ponta no centro, VOL↔MEI
      </div>
      <div>
        <b className="verm-t">60%</b>Zagueiro na lateral e vice-versa
      </div>
      <p className="dica" style={{ textAlign: 'left' }}>
        Só dentro do mesmo setor: goleiro só no gol, defensor só na defesa, e assim por diante.
      </p>
    </div>
  );
}

export default function Escalacao({ estado, eu, souHost, conexao, enviar }) {
  const { times, tecnicos, config } = estado;
  const meu = times[eu.id];
  const [marcada, setMarcada] = useState(null);
  const [aviso, setAviso] = useState('');
  const forcas = useMemo(() => Object.fromEntries(tecnicos.map((t) => [t.id, forca(estado, t.id)])), [estado, tecnicos]);
  const ranking = [...tecnicos].sort((a, b) => forcas[b.id].geral - forcas[a.id].geral);
  const F = forcas[eu.id];
  const tat = meu.tatica || TATICA_PADRAO;
  const melhorEnc = Math.max(...ESTILOS.map((e) => encaixe(F, e.id)));
  const mudarTatica = (mud) => enviar({ tipo: 'tatica', tatica: mud });
  const pagos = Object.values(meu.pagos || {});
  const caro = Object.entries(meu.pagos || {}).sort((a, b) => b[1] - a[1])[0];

  function tocar(i) {
    if (marcada === null) {
      setMarcada(i);
      setAviso('Agora toque no lugar de destino.');
      return;
    }
    if (marcada !== i) {
      const pos = vagasDa(config.emCampo, meu.formacao);
      const a = jogador(meu.vagas[marcada]);
      const b = jogador(meu.vagas[i]);
      const ok = (!a || notaNaVaga(a, pos[i], pos.length) > 0) && (!b || notaNaVaga(b, pos[marcada], pos.length) > 0);
      if (!ok) setAviso('Não dá: cada jogador só pode ir para uma vaga do próprio setor.');
      else {
        enviar({ tipo: 'mover', origem: marcada, destino: i });
        setAviso('');
      }
    } else setAviso('');
    setMarcada(null);
  }

  // dono da sala pode trocar foto de um jogador
  const [fotoId, setFotoId] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const comprados = Object.values(times)
    .flatMap((t) => t.vagas)
    .filter((id) => id && !String(id).startsWith('base-'))
    .map(jogador)
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <main className="pagina">
      <Topo>
        <span className="chip">
          Sala <strong>{estado.codigo}</strong>
        </span>
      </Topo>
      <AvisoRede conexao={conexao} />
      <div>
        <span className="sobre">Leilão encerrado</span>
        <h1 className="titulo" style={{ fontSize: 'clamp(32px,5vw,52px)', marginTop: 6 }}>
          Arrume seu <em>time</em>
        </h1>
        <p className="texto" style={{ marginTop: 8 }}>
          {config.stats ? 'Ajuste a formação e as posições antes do campeonato.' : 'As notas apareceram! Ajuste a formação e as posições antes do campeonato.'}
        </p>
      </div>

      <div className="duas">
        <section className="painel coluna">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span className="sobre">Seu time</span>
            <select
              className="sel"
              aria-label="Formação"
              value={meu.formacao}
              onChange={(e) => {
                setMarcada(null);
                enviar({ tipo: 'formacao', formacao: e.target.value });
              }}
            >
              {formacoes(config.emCampo).map((f) => (
                <option key={f} value={f} disabled={f !== meu.formacao && !formacaoCabe(estado, eu.id, f)}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <Campo emCampo={config.emCampo} formacao={meu.formacao} vagas={meu.vagas} modo={config.modo} mostrarStats marcada={marcada} aoTocar={tocar} alto />
          <p className={`dica ${aviso ? 'alerta' : ''}`}>{aviso || (config.emCampo === 5 ? 'Toque em dois jogadores para trocar de lugar. No 5 em campo, todo jogador de linha rende 100% em qualquer vaga.' : 'Toque em dois jogadores para trocar de lugar. Fora da posição de origem, ele rende menos.')}</p>
          <div className="instrucoes">
            <span className="sobre">Instruções dos jogadores · mudam a partida</span>
            {vagasDa(config.emCampo, meu.formacao).map((pos, k) => {
              const j = jogador(meu.vagas[k]);
              const ops = OPCOES[pos] || [];
              const atual = (meu.instrucoes && meu.instrucoes[k]) || padrao(pos);
              const op = ops.find((o) => o.id === atual) || ops[0];
              return (
                <div className="instr" key={k}>
                  <span className="pos-tag" style={{ background: CORES[pos] }}>
                    {pos}
                  </span>
                  <div className="instr-nome">
                    <b>{j ? j.nome : 'vaga'}</b>
                    <span>{op ? op.dica : ''}</span>
                  </div>
                  <select className="sel" aria-label={`Instrução para ${j ? j.nome : pos}`} value={atual || ''} onChange={(e) => enviar({ tipo: 'instrucao', vaga: k, valor: e.target.value })}>
                    {ops.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.nome}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </section>

        <div className="coluna">
          <section className="painel">
            <span className="sobre">Força do time</span>
            <div className="forca-grande">
              <b>{F.geral}</b>
              <span style={{ color: 'var(--mute)', fontSize: 13 }}>média com o rendimento por posição</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 8 }}>
              {[
                ['GOL', F.GOL],
                ['DEF', F.DEF],
                ['MEI', F.MEI],
                ['ATA', F.ATA],
              ].map(([k, v]) => (
                <div className="setor" key={k}>
                  <span>{k}</span>
                  <div className="barra">
                    <i style={{ width: `${Math.round(v)}%` }} />
                  </div>
                  {Math.round(v)}
                </div>
              ))}
            </div>
          </section>
          <section className="painel tatica">
            <span className="sobre">Tática · vale metade do jogo</span>
            <div className="tat-grupo">
              <span className="tat-rot">Como atacar</span>
              <div className="tat-op">
                {ESTILOS.map((e) => (
                  <button key={e.id} type="button" aria-pressed={tat.estilo === e.id} onClick={() => mudarTatica({ estilo: e.id })}>
                    <b>{e.nome}</b>
                    <span className={`enc ${Math.round(encaixe(F, e.id)) >= melhorEnc - 1 ? 'top' : ''}`}>encaixe {Math.round(encaixe(F, e.id))}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="tat-grupo">
              <span className="tat-rot">Marcação</span>
              <div className="seg">
                {MARCACOES.map((m) => (
                  <button key={m.id} type="button" aria-pressed={tat.marcacao === m.id} onClick={() => mudarTatica({ marcacao: m.id })}>
                    {m.nome}
                  </button>
                ))}
              </div>
              <p className="dica" style={{ textAlign: 'left' }}>{MARCACOES.find((m) => m.id === tat.marcacao).dica}</p>
            </div>
            <div className="tat-grupo">
              <span className="tat-rot">Se estiver perdendo</span>
              <div className="seg">
                {PERDENDO.map((m) => (
                  <button key={m.id} type="button" aria-pressed={tat.perdendo === m.id} onClick={() => mudarTatica({ perdendo: m.id })}>
                    {m.nome}
                  </button>
                ))}
              </div>
              <p className="dica" style={{ textAlign: 'left' }}>{PERDENDO.find((m) => m.id === tat.perdendo).dica}</p>
            </div>
            <p className="dica" style={{ textAlign: 'left' }}>
              O "encaixe" mostra quanto seu elenco rende em cada estilo: pelas alas usa pontas e laterais, pelo meio usa meias e centroavante, contra-ataque usa
              os atacantes (e mata quem marca alto) e posse usa volantes e meias.
            </p>
          </section>
          <section className="painel" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="kv">
              <span>Sobrou no caixa</span>
              <b style={{ color: 'var(--gold)' }}>R$ {meu.caixa}</b>
            </div>
            <div className="kv">
              <span>Gastou</span>
              <b>R$ {pagos.reduce((a, b) => a + b, 0)}</b>
            </div>
            {caro && (
              <div className="kv">
                <span>Mais caro</span>
                <b>
                  {jogador(caro[0]).nome} · R$ {caro[1]}
                </b>
              </div>
            )}
          </section>
          {config.emCampo === 11 && (
          <section className="painel">
            <span className="sobre">Rendimento por posição</span>
            <div style={{ marginTop: 8 }}>
              <TabelaRendimento />
            </div>
          </section>
          )}
          {souHost ? (
            <button type="button" className="btn ouro grande" onClick={() => enviar({ tipo: 'campeonato' })}>
              Começar o campeonato
            </button>
          ) : (
            <p className="nota-rodape" style={{ fontSize: 14 }}>
              Quando todos arrumarem o time, o dono da sala começa o campeonato.
            </p>
          )}
        </div>
      </div>

      <section className="painel">
        <span className="sobre">Todos os elencos</span>
        {ranking.map((t) => {
          const tm = times[t.id];
          const pos = vagasDa(config.emCampo, tm.formacao);
          return (
            <details key={t.id} className="elenco" open={t.id === eu.id}>
              <summary>
                <span className="av" style={{ '--c': CORES_TEC[tecnicos.indexOf(t) % CORES_TEC.length] }}>
                  {t.nome[0].toUpperCase()}
                </span>
                <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>
                  {t.nome}
                  {t.id === eu.id && <span style={{ color: 'var(--mute)', fontWeight: 400 }}> (você)</span>}
                </span>
                <span style={{ fontSize: 12, color: 'var(--mute)' }}>
                  {tm.formacao} · sobrou R$ {tm.caixa}
                </span>
                <b style={{ font: '900 24px var(--f-display)', color: 'var(--gold)' }}>{forcas[t.id].geral}</b>
              </summary>
              <ul>
                {tm.vagas.map((id, i) => {
                  const j = jogador(id);
                  const n = notaNaVaga(j, pos[i], pos.length);
                  return (
                    <li key={`${id}-${i}`}>
                      <span className="pos-tag" style={{ background: CORES[pos[i]] }}>
                        {pos[i]}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {j.nome} <span style={{ color: 'var(--mute)', fontSize: 12 }}>{j.base ? '' : `· ${j.comp}`}</span>
                        {tm.completados && tm.completados[id] ? <span style={{ color: 'var(--gold)', fontSize: 11 }}> · veio no fim</span> : null}
                      </span>
                      {n !== j.nota && <span style={{ fontSize: 11, color: 'var(--live)' }}>{j.pos}</span>}
                      <b style={{ fontFamily: 'var(--f-num)' }}>{n}</b>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </section>

      {souHost && comprados.length > 0 && (
        <section className="painel" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="sobre">Trocar foto de um jogador (opcional)</span>
          <p className="dica" style={{ textAlign: 'left' }}>
            Se alguma foto veio errada, cole aqui o endereço de outra imagem (começando com https://). Vale para todos da sala.
          </p>
          <select className="sel" value={fotoId} onChange={(e) => setFotoId(e.target.value)} aria-label="Jogador">
            <option value="">Escolha o jogador</option>
            {comprados.map((j) => (
              <option key={j.id} value={j.id}>
                {j.nome} · {j.comp}
              </option>
            ))}
          </select>
          <input className="campo-texto" style={{ fontSize: 14 }} placeholder="https://…" value={fotoUrl} onChange={(e) => setFotoUrl(e.target.value)} aria-label="Endereço da foto" />
          <button
            type="button"
            className="btn escuro"
            disabled={!fotoId || (fotoUrl && !fotoUrl.startsWith('https://'))}
            onClick={() => {
              enviar({ tipo: 'foto', id: fotoId, url: fotoUrl });
              setFotoUrl('');
            }}
          >
            {fotoUrl ? 'Salvar foto' : 'Voltar para a foto automática'}
          </button>
        </section>
      )}
    </main>
  );
}
