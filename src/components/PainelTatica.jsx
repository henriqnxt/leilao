import { useMemo } from 'react';
import { formacoes, vagasDa } from '../engine/formations.js';
import { forca } from '../engine/campeonato.js';
import { formacaoCabe } from '../engine/auction.js';
import { encaixe, ESTILOS, MARCACOES, PERDENDO, TATICA_PADRAO } from '../engine/tatica.js';
import { OPCOES, padrao } from '../engine/instrucoes.js';
import { CORES } from '../engine/posicoes.js';
import { jogador } from '../data/jogadores.js';

// Formação, tática e instruções. Usado na escalação, entre as partidas e durante o jogo ao vivo.
export default function PainelTatica({ estado, eu, enviar, titulo = 'Tática · vale metade do jogo', comFormacao = true, comInstrucoes = true }) {
  const meu = estado.times[eu.id];
  const { emCampo } = estado.config;
  const F = useMemo(() => forca(estado, eu.id), [estado, eu.id]);
  const tat = meu.tatica || TATICA_PADRAO;
  const melhorEnc = Math.max(...ESTILOS.map((e) => encaixe(F, e.id)));
  const mudar = (mud) => enviar({ tipo: 'tatica', tatica: mud });
  const posicoes = vagasDa(emCampo, meu.formacao);

  return (
    <section className="painel tatica">
      <span className="sobre">{titulo}</span>
      {comFormacao && (
        <div className="tat-grupo">
          <span className="tat-rot">Formação</span>
          <div className="forms">
            {formacoes(emCampo).map((f) => (
              <button key={f} type="button" aria-pressed={meu.formacao === f} disabled={f !== meu.formacao && !formacaoCabe(estado, eu.id, f)} onClick={() => enviar({ tipo: 'formacao', formacao: f })}>
                {f}
              </button>
            ))}
          </div>
          <p className="dica" style={{ textAlign: 'left' }}>
            Mais atacantes (4-2-4, 3-4-3) fazem mais gols e tomam mais. Mais defensores (5-4-1, 5-3-2) seguram o placar.
          </p>
        </div>
      )}
      <div className="tat-grupo">
        <span className="tat-rot">Como atacar</span>
        <div className="tat-op">
          {ESTILOS.map((e) => (
            <button key={e.id} type="button" aria-pressed={tat.estilo === e.id} onClick={() => mudar({ estilo: e.id })}>
              <b>{e.nome}</b>
              <span className={`enc ${Math.round(encaixe(F, e.id)) >= Math.round(melhorEnc) - 1 ? 'top' : ''}`}>encaixe {Math.round(encaixe(F, e.id))}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="tat-grupo">
        <span className="tat-rot">Marcação</span>
        <div className="seg">
          {MARCACOES.map((m) => (
            <button key={m.id} type="button" aria-pressed={tat.marcacao === m.id} onClick={() => mudar({ marcacao: m.id })}>
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
            <button key={m.id} type="button" aria-pressed={tat.perdendo === m.id} onClick={() => mudar({ perdendo: m.id })}>
              {m.nome}
            </button>
          ))}
        </div>
      </div>
      {comInstrucoes && (
        <details className="instrucoes">
          <summary className="sobre">Instruções dos jogadores · toque para abrir</summary>
          {posicoes.map((pos, k) => {
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
        </details>
      )}
    </section>
  );
}
