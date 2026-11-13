import { useState } from 'react';
import { bandeira, ROTULOS, stats as statsDe } from '../data/jogadores.js';
import { useFoto } from '../lib/fotos.js';

const NOME_MODO = { br: 'Brasileirão', eu: '5 Grandes Ligas', wc: 'Copa do Mundo' };
const CAMISA = { br: ['#178a4c', '#f6cf6a'], eu: ['#2852b8', '#e8f0ff'], wc: ['#a01d2e', '#ffd77a'] };

export function raridade(nota, mostrar) {
  if (!mostrar) return 'misterio';
  return nota >= 88 ? 'elite' : nota >= 78 ? '' : 'comum';
}

export function Emblema({ modo }) {
  if (modo === 'eu') {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--m1)" strokeWidth="5" />
        <g fill="var(--m1)">
          {[[50, 18], [78, 34], [78, 66], [50, 82], [22, 66], [22, 34]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="6" />
          ))}
        </g>
      </svg>
    );
  }
  if (modo === 'wc') {
    return (
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <path d="M30 10h40v20c0 16-9 26-20 28-11-2-20-12-20-28z" fill="var(--m1)" />
        <path d="M42 58h16v20h10v10H32V78h10z" fill="var(--m1)" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 8 92 50 50 92 8 50z" fill="var(--m1)" />
      <circle cx="50" cy="50" r="18" fill="#0b3b8a" />
    </svg>
  );
}

function Silhueta({ modo, numero }) {
  const [a, b] = CAMISA[modo] || CAMISA.br;
  return (
    <svg viewBox="0 0 200 220" aria-hidden="true">
      <path d="M18 220 C24 160 58 136 100 132 C142 136 176 160 182 220Z" fill={a} />
      <path d="M82 134 L100 158 L118 134" fill="none" stroke={b} strokeWidth="6" />
      {numero ? (
        <text x="100" y="205" textAnchor="middle" fontFamily="Saira Condensed, Arial Narrow, sans-serif" fontWeight="900" fontSize="34" fill={b} opacity=".85">
          {numero}
        </text>
      ) : null}
      <rect x="87" y="104" width="26" height="34" rx="9" fill="#c99a76" />
      <ellipse cx="100" cy="76" rx="33" ry="40" fill="#c99a76" />
      <path d="M66 72 C64 38 88 30 102 32 C125 32 138 46 134 72 C128 55 113 49 100 51 C86 51 73 57 66 72Z" fill="#2a1f17" />
    </svg>
  );
}

export function FotoCarta({ j, modo }) {
  const url = useFoto(j);
  const [quebrou, setQuebrou] = useState('');
  const mostrar = url && quebrou !== url;
  return (
    <div className="c-foto">
      {mostrar ? (
        <img src={url} alt={`Foto de ${j.nome}`} loading="lazy" referrerPolicy="no-referrer" onError={() => setQuebrou(url)} />
      ) : (
        <Silhueta modo={modo} numero={j && j.base ? '' : ''} />
      )}
    </div>
  );
}

// Carta completa (leilão, capa). "mostrarStats" falso esconde nota, stats e raridade.
export default function Carta({ j, modo, mostrarStats = true, lote, estilo, refCarta }) {
  const r = raridade(j.nota, mostrarStats);
  const goleiro = j.pos === 'GOL';
  const valores = statsDe(j);
  const rotulos = goleiro ? ROTULOS.gol : ROTULOS.linha;
  return (
    <div className={`carta ${modo} ${r}`} style={estilo} ref={refCarta}>
      <div className="moldura forma" />
      <div className="miolo forma">
        <div className="raios" />
        <div className="pontos" />
        <div className="holo" />
        <div className="reflexo" />
      </div>
      <FotoCarta j={j} modo={modo} />
      <div className="c-info">
        <div className="c-fita">{NOME_MODO[modo]}</div>
        <div className="c-esq">
          <div className="c-nota">{mostrarStats ? j.nota : '??'}</div>
          <div className="c-pos">{j.pos}</div>
          <div className="c-sep" />
          {j.pais && <img className="c-band" src={bandeira(j.pais)} alt="" />}
        </div>
        <div className="c-placa">
          <div className={`c-nome ${j.nome.length > 12 ? 'longo' : ''}`}>{j.nome}</div>
          <div className="c-temp">
            {j.comp}
            {modo !== 'wc' ? ` · ${j.clube}` : ''}
          </div>
        </div>
        {mostrarStats ? (
          <div className="c-stats">
            {valores.map((v, k) => (
              <div className="s" key={rotulos[k]}>
                <span>{rotulos[k]}</span>
                <i>
                  <b style={{ width: `${v}%` }} />
                </i>
                {v}
              </div>
            ))}
          </div>
        ) : (
          <div className="c-oculto">
            <div>
              <b>? ? ?</b>Como foi essa temporada?
            </div>
          </div>
        )}
        {lote ? <div className="c-pe">Lote {String(lote).padStart(2, '0')} · Leilão das Lendas</div> : null}
      </div>
    </div>
  );
}

export function Verso({ modo }) {
  return (
    <div className={`carta ${modo}`}>
      <div className="verso-carta forma">
        <div className="dentro">
          <Emblema modo={modo} />
          <div className="q">? ? ?</div>
        </div>
      </div>
    </div>
  );
}

// Carta pequena do campinho: só moldura, foto, nota e posição.
export function CartaMini({ j, modo, mostrarStats }) {
  return (
    <div className={`carta ${modo} ${raridade(j.nota, mostrarStats)}`}>
      <div className="moldura forma" />
      <div className="miolo forma">
        <div className="raios" />
      </div>
      <FotoCarta j={j} modo={modo} />
    </div>
  );
}
