import { useState } from 'react';
import { formacoes } from '../engine/formations.js';
import Campo from './Campo.jsx';

// Escolha de formação + campo, usados no leilão e na escalação.
export default function MeuTime({ emCampo, time, mostrarNota, enviar }) {
  const [marcada, setMarcada] = useState(null);

  function tocar(i) {
    if (marcada === null) {
      setMarcada(i);
    } else {
      if (marcada !== i) enviar({ tipo: 'mover', origem: marcada, destino: i });
      setMarcada(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="formacao" className="text-base font-semibold text-giz/85">
          Formação
        </label>
        <select
          id="formacao"
          value={time.formacao}
          onChange={(e) => {
            setMarcada(null);
            enviar({ tipo: 'formacao', formacao: e.target.value });
          }}
          className="rounded-lg border-2 border-giz/30 bg-sombra px-3 py-2 text-base font-semibold text-giz"
        >
          {formacoes(emCampo).map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2">
        <Campo
          emCampo={emCampo}
          formacao={time.formacao}
          vagas={time.vagas}
          mostrarNota={mostrarNota}
          marcada={marcada}
          aoTocar={tocar}
        />
      </div>
      <p className="mt-2 text-sm text-giz/60">
        {marcada === null
          ? 'Toque em dois lugares do campo para trocar os jogadores. Borda vermelha é jogador fora de posição.'
          : 'Agora toque no lugar de destino.'}
      </p>
    </div>
  );
}
