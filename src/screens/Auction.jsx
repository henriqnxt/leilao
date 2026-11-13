import { useEffect, useState } from 'react';
import { CORES } from '../engine/formations.js';
import { TEMPO_LANCE } from '../engine/auction.js';
import { epoca, jogador } from '../data/jogadores.js';
import Foto from '../components/Foto.jsx';
import MeuTime from '../components/MeuTime.jsx';

function useAgora() {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  return agora;
}

export default function Auction({ estado, eu, desvio, conexao, enviar }) {
  const agora = useAgora();
  const { leilao: L, times, tecnicos, config } = estado;
  const j = jogador(L.fila[L.i]);
  const meu = times[eu.id];
  const nome = (id) => (tecnicos.find((t) => t.id === id) || {}).nome || 'Alguém';

  // "fim" vem no relógio do host; o desvio traz para o relógio deste aparelho
  const restaMs = L.batido || L.fim == null ? 0 : Math.max(0, L.fim + desvio - agora);
  const segundos = Math.ceil(restaMs / 1000);
  const comprados = meu.vagas.filter(Boolean).length;
  const cheio = comprados >= config.emCampo;
  const naFrente = L.lider === eu.id;

  let aviso = '';
  if (cheio) aviso = 'Seu elenco está completo. Agora é só assistir.';
  else if (naFrente) aviso = 'O maior lance é seu.';
  else if (meu.caixa <= L.lance) aviso = 'Seu caixa não cobre este lance.';

  const pode = (valor) => !L.batido && !cheio && !naFrente && valor <= meu.caixa && conexao === 'ok';
  const lance = (valor) => enviar({ tipo: 'lance', valor });
  const minimo = L.lance + 1;

  return (
    <main className="area-segura mx-auto max-w-md px-4">
      {conexao !== 'ok' && (
        <p role="status" className="mb-3 rounded-lg bg-cartao px-3 py-2 text-center text-sm font-semibold text-white">
          Sem conexão com a sala. Tentando de novo…
        </p>
      )}

      <div className="flex justify-between text-sm font-semibold text-giz/70">
        <span>
          Jogador {L.i + 1} de {L.fila.length}
        </span>
        <span>Sala {estado.codigo}</span>
      </div>

      {/* A carta do jogador em leilão. A nota fica escondida até o fim. */}
      <section className="mt-3 flex gap-3 rounded-2xl bg-giz p-3 text-sombra shadow-[0_6px_0_#08231A]">
        <Foto key={j.id} jogador={j} className="h-36 w-28 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span
            className="self-start rounded-md px-2 py-0.5 text-sm font-extrabold text-white"
            style={{ background: CORES[j.pos] }}
          >
            {j.pos}
          </span>
          <h1 className="mt-2 font-placa text-[1.7rem] leading-none">{j.nome}</h1>
          <p className="mt-1 text-sm font-semibold text-sombra/70">{epoca(j)}</p>
          <p className="mt-auto flex items-baseline gap-2">
            <span className="font-placa text-3xl leading-none">??</span>
            <span className="text-sm font-semibold text-sombra/70">nota escondida</span>
          </p>
        </div>
      </section>

      {L.batido ? (
        <section role="status" className="mt-4 rounded-xl bg-sombra px-4 py-5 text-center">
          {L.batido.por ? (
            <>
              <p className="font-placa text-2xl text-canario">Vendido</p>
              <p className="mt-1 text-lg font-semibold">
                {nome(L.batido.por)} levou por R$ {L.batido.valor}
              </p>
            </>
          ) : (
            <>
              <p className="font-placa text-2xl text-giz/80">Sem lance</p>
              <p className="mt-1 text-lg font-semibold">Ninguém quis. Próximo jogador.</p>
            </>
          )}
        </section>
      ) : (
        <section className="mt-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold text-giz/70">{L.lider ? 'Maior lance' : 'Lance inicial'}</p>
              <p className="font-placa text-4xl leading-none text-canario">R$ {L.lider ? L.lance : 1}</p>
              <p className="text-base font-semibold">{L.lider ? `de ${nome(L.lider)}` : 'ninguém deu lance ainda'}</p>
            </div>
            <div className="text-right" aria-live="off">
              <p className={`font-placa text-4xl leading-none ${segundos <= 3 ? 'text-cartao' : ''}`}>{segundos}</p>
              <p className="text-sm font-semibold text-giz/70">segundos</p>
            </div>
          </div>
          <div className="mt-2 h-2 rounded bg-sombra">
            <div
              className={`h-2 rounded ${segundos <= 3 ? 'bg-cartao' : 'bg-canario'}`}
              style={{ width: `${Math.min(100, (restaMs / TEMPO_LANCE) * 100)}%` }}
            />
          </div>

          <button
            type="button"
            disabled={!pode(minimo)}
            onClick={() => lance(minimo)}
            className="mt-4 w-full rounded-xl bg-canario px-5 py-4 text-lg font-extrabold text-sombra active:translate-y-px disabled:opacity-40"
          >
            Dar lance de R$ {minimo}
          </button>
          <div className="mt-2 flex gap-2">
            {[5, 10, 20].map((mais) => (
              <button
                key={mais}
                type="button"
                disabled={!pode(L.lance + mais)}
                onClick={() => lance(L.lance + mais)}
                className="flex-1 rounded-xl border-2 border-giz py-3 text-base font-extrabold text-giz active:translate-y-px disabled:opacity-35"
              >
                R$ {L.lance + mais}
              </button>
            ))}
          </div>
          <p role="status" className="mt-2 min-h-[1.25rem] text-center text-sm font-semibold text-canario">
            {aviso}
          </p>
        </section>
      )}

      <div className="mt-2 flex justify-between text-base font-semibold">
        <span>
          Seu caixa: <span className="text-canario">R$ {meu.caixa}</span>
        </span>
        <span>
          Elenco: {comprados} de {config.emCampo}
        </span>
      </div>

      <section className="mt-5">
        <h2 className="mb-2 text-lg font-extrabold">Seu time</h2>
        <MeuTime emCampo={config.emCampo} time={meu} mostrarNota={false} enviar={enviar} />
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-extrabold">Caixa dos técnicos</h2>
        <ul className="mt-2 divide-y divide-giz/10 rounded-xl bg-sombra/70">
          {tecnicos.map((t) => {
            const time = times[t.id];
            return (
              <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate text-base font-semibold">
                  {t.nome}
                  {t.id === eu.id && <span className="font-normal text-giz/55"> (você)</span>}
                  {t.id === L.lider && !L.batido && <span className="text-sm text-canario"> na frente</span>}
                </span>
                <span className="text-sm text-giz/60">
                  {time.vagas.filter(Boolean).length} de {config.emCampo}
                </span>
                <span className="w-16 text-right text-base font-extrabold text-canario">R$ {time.caixa}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
