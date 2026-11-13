import { useState } from 'react';

export default function Home({ convite, nomeSalvo, aoEntrar, aoRecusar }) {
  const [nome, setNome] = useState(nomeSalvo);
  const [codigo, setCodigo] = useState('');
  const [comCodigo, setComCodigo] = useState(false);

  const nomeOk = nome.trim().length >= 2;
  const codigoOk = /^[A-Za-z]{4}$/.test(codigo);

  return (
    <main className="gramado area-segura mx-auto flex min-h-full max-w-md flex-col px-5">
      <header className="pt-24">
        <h1 className="font-placa text-[2.9rem] leading-[0.95] text-canario">
          Leilão
          <br />
          das Lendas
        </h1>
        <p className="mt-4 max-w-[30ch] text-lg leading-snug text-giz/85">
          R$ 100 pra cada técnico. Craques históricos do Brasil e da Europa, um por um, no martelo.
        </p>
      </header>

      <section className="mt-10">
        {convite && (
          <p className="mb-4 rounded-xl border-2 border-dashed border-canario/70 px-4 py-3 text-base">
            Te chamaram para a sala <strong className="font-placa tracking-wider text-canario">{convite}</strong>
          </p>
        )}

        <label htmlFor="apelido" className="block text-base font-semibold">
          Seu apelido de técnico
        </label>
        <input
          id="apelido"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={16}
          autoComplete="nickname"
          placeholder="Ex.: Telê"
          className="mt-2 w-full rounded-xl border-2 border-giz/30 bg-sombra px-4 py-4 text-xl font-semibold text-giz placeholder:text-giz/35 focus:border-canario focus:outline-none"
        />

        {convite ? (
          <>
            <button
              type="button"
              disabled={!nomeOk}
              onClick={() => aoEntrar(nome)}
              className="mt-4 w-full rounded-xl bg-canario px-5 py-4 text-lg font-extrabold text-sombra active:translate-y-px disabled:opacity-40"
            >
              Entrar na sala {convite}
            </button>
            <button type="button" onClick={aoRecusar} className="mt-2 w-full py-3 text-base font-semibold text-giz/80 underline">
              Prefiro criar outra sala
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={!nomeOk}
              onClick={() => aoEntrar(nome)}
              className="mt-4 w-full rounded-xl bg-canario px-5 py-4 text-lg font-extrabold text-sombra active:translate-y-px disabled:opacity-40"
            >
              Criar sala
            </button>

            {comCodigo ? (
              <div className="mt-4 flex gap-2">
                <input
                  aria-label="Código da sala"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 4))}
                  placeholder="ABCD"
                  autoCapitalize="characters"
                  autoComplete="off"
                  className="w-0 flex-1 rounded-xl border-2 border-giz/30 bg-sombra px-4 py-4 text-center font-placa text-2xl tracking-[0.3em] text-canario placeholder:text-giz/25 focus:border-canario focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!nomeOk || !codigoOk}
                  onClick={() => aoEntrar(nome, codigo.toUpperCase())}
                  className="rounded-xl border-2 border-giz px-5 text-lg font-extrabold text-giz active:translate-y-px disabled:opacity-40"
                >
                  Entrar
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setComCodigo(true)} className="mt-2 w-full py-3 text-base font-semibold text-giz/80 underline">
                Tenho um código de sala
              </button>
            )}
          </>
        )}
      </section>

      <p className="mt-auto pt-10 text-sm leading-relaxed text-giz/55">
        Sem cadastro. Crie a sala, mande o link no grupo e pronto: de 2 a 16 técnicos.
      </p>
    </main>
  );
}
