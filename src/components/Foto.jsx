import { useState } from 'react';
import { CORES } from '../engine/formations.js';
import { iniciais } from '../data/jogadores.js';
import { useFoto } from '../lib/fotos.js';

// Foto real quando existe; senão, as iniciais na cor da posição.
export default function Foto({ jogador, className = '' }) {
  const url = useFoto(jogador);
  const [quebrou, setQuebrou] = useState(null);
  const mostrar = url && quebrou !== url;

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-xl ${className}`}
      style={{ background: CORES[jogador.pos] }}
    >
      <span className="font-placa text-4xl text-white/90">{iniciais(jogador.nome)}</span>
      {mostrar && (
        <img
          src={url}
          alt={`Foto de ${jogador.nome}`}
          onError={() => setQuebrou(url)}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      )}
    </div>
  );
}
