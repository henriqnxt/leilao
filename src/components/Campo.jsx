import { CORES, linhasDa } from '../engine/formations.js';
import { iniciais, jogador } from '../data/jogadores.js';

// O time no campo. Toque em duas vagas para trocar os jogadores de lugar.
export default function Campo({ emCampo, formacao, vagas, mostrarNota, marcada, aoTocar }) {
  let n = 0;
  const linhas = linhasDa(emCampo, formacao).map((linha) => linha.map((pos) => ({ pos, i: n++ })));

  return (
    <div className="space-y-2 rounded-xl border-2 border-giz/20 bg-grama px-1.5 py-3">
      {[...linhas].reverse().map((linha) => (
        <div key={linha[0].i} className="flex justify-center gap-1">
          {linha.map(({ pos, i }) => {
            const j = vagas[i] ? jogador(vagas[i]) : null;
            const fora = j && j.pos !== pos;
            return (
              <button
                key={i}
                type="button"
                disabled={!aoTocar}
                onClick={() => aoTocar(i)}
                aria-label={j ? `${j.nome}, jogando de ${pos}` : `Vaga de ${pos} livre`}
                className={`flex w-[19%] min-w-0 flex-col items-center rounded-lg px-0.5 py-1 ${
                  marcada === i ? 'bg-canario/25 outline outline-2 outline-canario' : ''
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full font-placa text-sm ${
                    j ? 'text-white' : 'border-2 border-dashed border-giz/45 text-giz/60'
                  } ${fora ? 'ring-2 ring-cartao' : ''}`}
                  style={j ? { background: CORES[j.pos] } : undefined}
                >
                  {j ? (mostrarNota ? j.nota : iniciais(j.nome)) : pos}
                </span>
                <span className="mt-0.5 w-full truncate text-center text-xs font-semibold leading-tight text-giz">
                  {j ? j.nome : 'livre'}
                </span>
                <span className={`text-[0.7rem] font-semibold leading-tight ${fora ? 'text-[#FF9A9D]' : 'text-giz/55'}`}>
                  {fora ? `${j.pos} de ${pos}` : pos}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
