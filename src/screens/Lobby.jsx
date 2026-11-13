import { useState } from 'react';
import { EM_CAMPO, FORMATOS, MAX_TECNICOS, MIN_TECNICOS, PACOTES } from '../engine/state.js';

export default function Lobby({ estado, online, eu, souHost, conexao, enviar, aoSair }) {
  const [recado, setRecado] = useState('');
  const { codigo, tecnicos, config, hostId } = estado;
  const dono = tecnicos.find((t) => t.id === hostId);
  const link = `${window.location.origin}${window.location.pathname}#/s/${codigo}`;

  async function convidar() {
    const texto = `Bora pro Leilão das Lendas? Sala ${codigo}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Leilão das Lendas', text: texto, url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      setRecado('Link copiado');
    } catch (erro) {
      if (erro && erro.name === 'AbortError') return; // fechou o menu de compartilhar
      setRecado(link); // sem permissão para copiar: mostra o link para copiar na mão
    }
    setTimeout(() => setRecado(''), 4000);
  }

  return (
    <main className="gramado area-segura mx-auto flex min-h-full max-w-md flex-col px-5">
      {conexao !== 'ok' && (
        <p role="status" className="mb-3 rounded-lg bg-cartao px-3 py-2 text-center text-sm font-semibold text-white">
          Sem conexão com a sala. Tentando de novo…
        </p>
      )}

      {/* A placa de leilão com o código da sala */}
      <section className="flex flex-col items-center pt-6">
        <div className="rounded-[1.4rem] bg-canario px-8 pb-3 pt-4 text-center text-sombra shadow-[0_6px_0_#08231A]">
          <p className="text-sm font-semibold">Sala</p>
          <p className="font-placa text-6xl leading-none tracking-[0.12em]">{codigo}</p>
        </div>
        <div aria-hidden="true" className="h-9 w-5 rounded-b-md bg-[#B98A2E] shadow-[0_6px_0_#08231A]" />
        <button
          type="button"
          onClick={convidar}
          className="mt-5 w-full rounded-xl border-2 border-giz px-5 py-3.5 text-lg font-extrabold text-giz active:translate-y-px"
        >
          Chamar a galera
        </button>
        <p role="status" className="mt-2 min-h-[1.25rem] break-all text-center text-sm text-canario">
          {recado}
        </p>
      </section>

      <section className="mt-4">
        <h2 className="flex items-baseline justify-between text-lg font-extrabold">
          Técnicos
          <span className="text-base font-semibold text-giz/60">
            {tecnicos.length} de {MAX_TECNICOS}
          </span>
        </h2>
        <ol className="mt-2 divide-y divide-giz/10 rounded-xl bg-sombra/70">
          {tecnicos.map((t, i) => {
            const ligado = t.id === eu.id || online.includes(t.id);
            return (
              <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-giz font-placa text-base text-sombra">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-semibold">
                    {t.nome}
                    {t.id === eu.id && <span className="font-normal text-giz/55"> (você)</span>}
                  </span>
                  <span className="block text-sm text-giz/60">
                    {t.id === hostId ? 'Dono da sala' : 'Técnico'}
                    {!ligado && ', caiu a conexão'}
                  </span>
                </span>
                <span
                  aria-label={ligado ? 'online' : 'offline'}
                  className={`h-3 w-3 shrink-0 rounded-full ${ligado ? 'bg-[#5EE08A]' : 'bg-giz/25'}`}
                />
                {souHost && t.id !== hostId && (
                  <button
                    type="button"
                    onClick={() => enviar({ tipo: 'remover', alvo: t.id })}
                    className="shrink-0 rounded-lg border border-giz/30 px-2.5 py-1.5 text-sm font-semibold text-giz/80"
                  >
                    Tirar
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-6">
        <h2 className="text-lg font-extrabold">Regras desta sala</h2>
        {!souHost && (
          <p className="mt-1 text-sm text-giz/60">Quem escolhe é {dono ? dono.nome : 'o dono da sala'}.</p>
        )}
        <Escolha
          titulo="Jogadores no leilão"
          opcoes={PACOTES}
          valor={config.pacote}
          travado={!souHost}
          aoEscolher={(pacote) => enviar({ tipo: 'config', pacote })}
        />
        <Escolha
          titulo="Tamanho do time"
          opcoes={EM_CAMPO}
          valor={config.emCampo}
          travado={!souHost}
          aoEscolher={(emCampo) => enviar({ tipo: 'config', emCampo })}
        />
        <Escolha
          titulo="Campeonato"
          opcoes={FORMATOS}
          valor={config.formato}
          travado={!souHost}
          aoEscolher={(formato) => enviar({ tipo: 'config', formato })}
        />
      </section>

      <section className="mt-auto pt-8">
        {souHost ? (
          <>
            <button
              type="button"
              disabled={tecnicos.length < MIN_TECNICOS}
              onClick={() => enviar({ tipo: 'comecar' })}
              className="w-full rounded-xl bg-canario px-5 py-4 text-lg font-extrabold text-sombra active:translate-y-px disabled:opacity-40"
            >
              Começar o leilão
            </button>
            {tecnicos.length < MIN_TECNICOS && (
              <p className="mt-2 text-center text-sm text-giz/60">Chame pelo menos mais um técnico para começar.</p>
            )}
          </>
        ) : (
          <p className="text-center text-base text-giz/75">Esperando {dono ? dono.nome : 'o dono'} começar o leilão.</p>
        )}
        <button type="button" onClick={aoSair} className="mt-2 w-full py-3 text-base font-semibold text-giz/80 underline">
          Sair da sala
        </button>
      </section>
    </main>
  );
}

function Escolha({ titulo, opcoes, valor, travado, aoEscolher }) {
  return (
    <fieldset className="mt-4" disabled={travado}>
      <legend className="text-base font-semibold text-giz/85">{titulo}</legend>
      <div className="mt-2 flex gap-2">
        {opcoes.map((o) => {
          const marcado = o.id === valor;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={marcado}
              onClick={() => aoEscolher(o.id)}
              className={`flex-1 rounded-xl border-2 px-2 py-3 text-[0.95rem] font-semibold leading-tight ${
                marcado ? 'border-canario bg-canario text-sombra' : 'border-giz/25 text-giz/80'
              } ${travado && !marcado ? 'opacity-45' : ''}`}
            >
              {o.nome}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
