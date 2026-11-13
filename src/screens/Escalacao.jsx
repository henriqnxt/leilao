import { CORES } from '../engine/formations.js';
import { jogador } from '../data/jogadores.js';
import MeuTime from '../components/MeuTime.jsx';

const media = (vagas) => Math.round(vagas.reduce((soma, id) => soma + jogador(id).nota, 0) / vagas.length);

// Elencos fechados: aqui as notas aparecem pela primeira vez.
export default function Escalacao({ estado, eu, conexao, enviar }) {
  const { times, tecnicos, config } = estado;
  const meu = times[eu.id];
  const ranking = [...tecnicos].sort((a, b) => media(times[b.id].vagas) - media(times[a.id].vagas));

  return (
    <main className="area-segura mx-auto max-w-md px-4">
      {conexao !== 'ok' && (
        <p role="status" className="mb-3 rounded-lg bg-cartao px-3 py-2 text-center text-sm font-semibold text-white">
          Sem conexão com a sala. Tentando de novo…
        </p>
      )}

      <h1 className="font-placa text-3xl leading-tight text-canario">Elencos fechados</h1>
      <p className="mt-1 text-base text-giz/80">As notas apareceram. Arrume seu time antes do campeonato.</p>

      <section className="mt-5">
        <h2 className="mb-2 flex items-baseline justify-between text-lg font-extrabold">
          Seu time
          <span className="text-base font-semibold text-giz/70">média {media(meu.vagas)}</span>
        </h2>
        <MeuTime emCampo={config.emCampo} time={meu} mostrarNota enviar={enviar} />
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-extrabold">Todos os elencos</h2>
        {ranking.map((t) => {
          const time = times[t.id];
          return (
            <details key={t.id} className="mt-2 rounded-xl bg-sombra/70 px-3 py-2.5" open={t.id === eu.id}>
              <summary className="flex cursor-pointer items-center gap-3 text-base font-semibold">
                <span className="min-w-0 flex-1 truncate">
                  {t.nome}
                  {t.id === eu.id && <span className="font-normal text-giz/55"> (você)</span>}
                </span>
                <span className="text-sm text-giz/60">
                  {time.formacao}, sobrou R$ {time.caixa}
                </span>
                <span className="font-placa text-xl text-canario">{media(time.vagas)}</span>
              </summary>
              <ul className="mt-2 space-y-1.5">
                {time.vagas.map((id, i) => {
                  const j = jogador(id);
                  return (
                    <li key={`${id}-${i}`} className="flex items-center gap-2 text-base">
                      <span
                        className="w-11 shrink-0 rounded px-1 py-0.5 text-center text-xs font-extrabold text-white"
                        style={{ background: CORES[j.pos] }}
                      >
                        {j.pos}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{j.nome}</span>
                      <span className="font-extrabold">{j.nota}</span>
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </section>

      <section className="mt-8">
        <button type="button" disabled className="w-full rounded-xl bg-canario px-5 py-4 text-lg font-extrabold text-sombra opacity-40">
          Começar o campeonato
        </button>
        <p className="mt-2 text-center text-sm text-giz/60">
          O campeonato chega em uma próxima etapa do jogo.
        </p>
      </section>
    </main>
  );
}
