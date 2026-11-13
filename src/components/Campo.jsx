import { coordenadas } from '../engine/formations.js';
import { notaNaVaga, rendimento } from '../engine/posicoes.js';
import { jogador } from '../data/jogadores.js';
import { CartaMini } from './Carta.jsx';

// O time no campo, com mini-cartas. Mostra quanto cada um rende na vaga em que está.
// destaque: posição do jogador em leilão (as vagas onde ele cabe piscam com o rendimento).
export default function Campo({ emCampo, formacao, vagas, modo, mostrarStats, destaque, marcada, aoTocar, alto }) {
  const pts = coordenadas(emCampo, formacao);
  return (
    <div className={`gramado ${alto ? 'alto' : ''}`}>
      <svg viewBox="0 0 68 100" preserveAspectRatio="none" aria-hidden="true">
        <g fill="none" stroke="rgba(255,255,255,.5)" strokeWidth=".35">
          <line x1="0" y1="50" x2="68" y2="50" />
          <circle cx="34" cy="50" r="9.15" />
          <rect x="13.85" y="0" width="40.3" height="16.5" />
          <rect x="24.85" y="0" width="18.3" height="5.5" />
          <rect x="13.85" y="83.5" width="40.3" height="16.5" />
          <rect x="24.85" y="94.5" width="18.3" height="5.5" />
        </g>
      </svg>
      {pts.map(({ pos, x, y }, i) => {
        const j = vagas[i] ? jogador(vagas[i]) : null;
        const estilo = { left: `${x}%`, top: `${y}%`, animationDelay: `${i * 40}ms` };
        const tocar = aoTocar ? () => aoTocar(i) : undefined;
        const marc = marcada === i ? ' marcada' : '';
        const Tag = aoTocar ? 'button' : 'div';
        if (!j) {
          const f = destaque ? rendimento(destaque, pos) : 0;
          return (
            <Tag key={i} type={aoTocar ? 'button' : undefined} className={`mini vazia${f ? ' cabe' : ''}${marc}${aoTocar ? ' tocavel' : ''}`} style={estilo} onClick={tocar} aria-label={`Vaga de ${pos} livre`}>
              <div className="mc">
                <span className="vz">
                  {pos}
                  {f ? <small>{Math.round(f * 100)}%</small> : null}
                </span>
              </div>
              <span className="mn-nome" style={{ opacity: 0.75 }}>vaga</span>
            </Tag>
          );
        }
        const f = rendimento(j.pos, pos);
        const n = notaNaVaga(j, pos);
        return (
          <Tag key={i} type={aoTocar ? 'button' : undefined} className={`mini${marc}${aoTocar ? ' tocavel' : ''}`} style={estilo} onClick={tocar} aria-label={`${j.nome}, ${j.pos} jogando de ${pos}`}>
            <div className="mc">
              <CartaMini j={j} modo={j.base ? modo : j.modo || modo} mostrarStats={mostrarStats} />
              <div className={`mn-nota ${f < 1 ? 'cai' : ''}`}>{mostrarStats ? n : '??'}</div>
              <div className="mn-pos">{pos}</div>
              {f < 1 ? <span className={`selo ${f < 0.75 ? 'ruim' : ''}`}>{`${j.pos} · ${Math.round(f * 100)}%`}</span> : null}
            </div>
            <span className="mn-nome">{j.nome}</span>
          </Tag>
        );
      })}
    </div>
  );
}
