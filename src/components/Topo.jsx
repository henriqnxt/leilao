import { useState } from 'react';
import { alternarSom, somLigado } from '../lib/efeitos.js';

export function Marca() {
  return (
    <div className="marca">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <defs>
          <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe9a8" />
            <stop offset="1" stopColor="#c8902a" />
          </linearGradient>
        </defs>
        <path d="M20 2 36 8v12c0 9-7 15-16 18C11 35 4 29 4 20V8z" fill="url(#mg)" />
        <path d="M20 6 32 10.5V20c0 7-5.4 11.8-12 14.2C13.4 31.8 8 27 8 20v-9.5z" fill="#0a1d16" />
        <path d="M12 25.5h16M13.5 22.5 20 11l6.5 11.5" stroke="#f2c14e" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        Leilão<b>das Lendas</b>
      </div>
    </div>
  );
}

export function BotaoSom() {
  const [on, setOn] = useState(somLigado());
  return (
    <button type="button" className="icone" aria-pressed={on} aria-label={on ? 'Desligar som' : 'Ligar som'} onClick={() => setOn(alternarSom())}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M11 5 6 9H3v6h3l5 4z" />
        {on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" /> : <path d="M16 9l5 6M21 9l-5 6" />}
      </svg>
    </button>
  );
}

export default function Topo({ children }) {
  return (
    <header className="topo">
      <Marca />
      <div className="topo-dir">
        {children}
        <BotaoSom />
      </div>
    </header>
  );
}

export function AvisoRede({ conexao }) {
  if (conexao === 'ok') return null;
  return (
    <p role="status" className="aviso-rede">
      Sem conexão com a sala. Tentando de novo…
    </p>
  );
}
