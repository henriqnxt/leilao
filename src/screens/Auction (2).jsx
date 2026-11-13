import { useEffect, useRef, useState } from 'react';
import { INTRO, TEMPO_INICIAL, cabe, formacaoCabe } from '../engine/auction.js';
import { formacoes } from '../engine/formations.js';
import { bandeira, escala, jogador, PAISES } from '../data/jogadores.js';
import { NOME_POS, NOME_SETOR, SETOR } from '../engine/posicoes.js';
import { preCarregar } from '../lib/fotos.js';
import { confete, som } from '../lib/efeitos.js';
import Topo, { AvisoRede } from '../components/Topo.jsx';
import Carta, { Verso } from '../components/Carta.jsx';
import Campo from '../components/Campo.jsx';
import { CORES_TEC } from './Lobby.jsx';

const BRILHO = { br: '#3ddc84', eu: '#9fd6ff', wc: '#f2c14e' };

function useAgora(ms = 100) {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return agora;
}

function Walkout({ j, modo, inicio, mostrarStats, aoPular }) {
  const agora = useAgora(80);
  const passou = agora - inicio;
  const passo = passou < 250 ? 0 : passou < 1050 ? 1 : passou < 1850 ? 2 : 3;
  const ultimo = useRef(-1);
  useEffect(() => {
    if (passo !== ultimo.current && passo > 0) som(passo === 3 && mostrarStats && escala(j) >= 88 ? 'bum' : 'tique');
    ultimo.current = passo;
  }, [passo, mostrarStats, j]);
  return (
    <div className="walkout" data-passo={passo} style={{ '--brilho': BRILHO[modo] }} role="dialog" aria-label="Próximo jogador">
      <div className="feixes" />
      <div className="wo wo1">
        <span className="rot">Nacionalidade</span>
        {j.pais && <img src={bandeira(j.pais)} alt={PAISES[j.pais] || ''} />}
        <b style={{ font: '800 22px var(--f-display)', textTransform: 'uppercase' }}>{PAISES[j.pais] || ''}</b>
      </div>
      <div className="wo wo2">
        <span className="rot">Posição</span>
        <b>{j.pos}</b>
        <span className="rot">{NOME_POS[j.pos]}</span>
      </div>
      <div className="wo wo3">
        <span className="rot">Temporada</span>
        <b>{j.comp}</b>
        <span className="rot">{j.clube}</span>
      </div>
      <button type="button" className="pular" onClick={aoPular}>
        Pular
      </button>
    </div>
  );
}

export default function Auction({ estado, eu, desvio, conexao, enviar }) {
  const agora = useAgora();
  const { leilao: L, times, tecnicos, config } = estado;
  const modo = config.modo;
  const mostrar = config.stats;
  const j = jogador(L.fila[L.i]);
  const meu = times[eu.id];
  const cor = (id) => CORES_TEC[Math.max(0, tecnicos.findIndex((t) => t.id === id)) % CORES_TEC.length];
  const nome = (id) => (tecnicos.find((t) => t.id === id) || {}).nome || 'Alguém';

  const inicio = L.inicio + desvio;
  const naIntro = !L.batido && agora < inicio;
  const [pulou, setPulou] = useState(-1);
  const restaMs = L.batido || L.fim == null ? 0 : Math.max(0, L.fim + desvio - agora);
  const seg = Math.ceil(restaMs / 1000);
  const cabeAqui = cabe(estado, eu.id, j.id);
  const naFrente = L.lider === eu.id;
  const passei = L.passaram.includes(eu.id);
  const comprados = meu.vagas.filter(Boolean).length;
  const vagasLivres = config.emCampo - comprados;
  const aberto = !L.batido && !naIntro && conexao === 'ok';
  const posso = (v) => aberto && !naFrente && !passei && cabeAqui && v > L.lance && v <= meu.caixa;

  // histórico local dos lances deste lote + plaquinhas
  const [historico, setHistorico] = useState([]);
  const [plaquinhas, setPlaquinhas] = useState([]);
  const loteAnt = useRef(L.i);
  useEffect(() => {
    if (loteAnt.current !== L.i) {
      loteAnt.current = L.i;
      setHistorico([]);
      return;
    }
    if (L.lider && L.lance > 0) {
      setHistorico((h) => (h[0] && h[0].valor === L.lance ? h : [{ id: L.lider, valor: L.lance }, ...h].slice(0, 8)));
      const chave = `${L.i}-${L.lance}`;
      setPlaquinhas((p) => [...p, { chave, id: L.lider, valor: L.lance }]);
      setTimeout(() => setPlaquinhas((p) => p.filter((x) => x.chave !== chave)), 1350);
      som('lance');
    }
  }, [L.i, L.lance, L.lider]);

  // martelo
  const batidoAnt = useRef(null);
  const palco = useRef(null);
  useEffect(() => {
    const k = L.batido ? `${L.i}` : null;
    if (k && batidoAnt.current !== k) {
      batidoAnt.current = k;
      if (L.batido.por) {
        som('martelo');
        const r = palco.current && palco.current.getBoundingClientRect();
        if (r) confete(r.left + r.width / 2, r.top + r.height / 2);
        if (palco.current) {
          palco.current.classList.remove('treme');
          void palco.current.offsetWidth;
          palco.current.classList.add('treme');
        }
      }
    }
  }, [L.batido, L.i]);

  // tique nos últimos segundos; vira a carta no fim da apresentação
  const segAnt = useRef(seg);
  useEffect(() => {
    if (aberto && seg !== segAnt.current && seg <= 3 && seg > 0) som('tique');
    segAnt.current = seg;
  }, [seg, aberto]);
  const introAnt = useRef(naIntro);
  useEffect(() => {
    if (introAnt.current && !naIntro) som('vira');
    introAnt.current = naIntro;
  }, [naIntro]);

  useEffect(() => {
    preCarregar(L.fila.slice(L.i + 1, L.i + 4).map(jogador));
  }, [L.i, L.fila]);

  // inclinação da carta
  const cartaRef = useRef(null);
  function mover(e) {
    const c = cartaRef.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    c.style.transform = `rotateY(${(x - 0.5) * 20}deg) rotateX(${-(y - 0.5) * 18}deg)`;
    c.style.setProperty('--mx', `${x * 100}%`);
    c.style.setProperty('--my', `${y * 100}%`);
  }
  function soltar() {
    if (cartaRef.current) cartaRef.current.style.transform = '';
  }

  const [valor, setValor] = useState('');
  const [erroValor, setErroValor] = useState('');
  const lance = (v) => {
    if (posso(v)) enviar({ tipo: 'lance', valor: v });
  };
  function darLance() {
    const v = parseInt(valor, 10);
    if (!v) return;
    if (v <= L.lance) setErroValor(`Precisa passar de R$ ${L.lance}`);
    else if (v > meu.caixa) setErroValor(`Você só tem R$ ${meu.caixa}`);
    else {
      lance(v);
      setValor('');
      setErroValor('');
    }
  }

  let martelo = 'Dou-lhe uma…';
  if (naIntro) martelo = 'Apresentando…';
  else if (L.batido) {
    const falta = Math.max(0, Math.ceil((L.proximoEm + desvio - agora) / 1000));
    martelo = falta > 0 ? `Próximo lote em ${falta}s` : 'Abrindo lote…';
  } else if (seg <= 2) martelo = 'Dou-lhe três…';
  else if (seg <= 4) martelo = 'Dou-lhe duas…';

  let dica = '';
  if (comprados >= config.emCampo) dica = 'Seu elenco está completo. Agora é só assistir.';
  else if (!cabeAqui) dica = `Você não tem vaga aberta para ${NOME_SETOR[SETOR[j.pos]].toLowerCase()}.`;
  else if (naFrente && !L.batido) dica = 'O maior lance é seu.';
  else if (passei && !L.batido) dica = 'Você passou este jogador.';
  else if (meu.caixa <= L.lance && !L.batido) dica = 'Seu caixa não cobre este lance.';

  const corRel = seg <= 3 ? 'var(--live)' : seg <= 6 ? 'var(--gold)' : 'var(--ok)';
  const fracao = naIntro ? 1 : restaMs / TEMPO_INICIAL;
  const marcha = historico
    .slice(0, 3)
    .map((h) => `${nome(h.id)} R$ ${h.valor}`)
    .join('  ·  ');

  return (
    <main className="pagina">
      {naIntro && pulou !== L.i && (
        <Walkout key={L.i} j={j} modo={modo} inicio={inicio - INTRO} mostrarStats={mostrar} aoPular={() => setPulou(L.i)} />
      )}
      <Topo>
        <span className="chip">
          Sala <strong>{estado.codigo}</strong>
        </span>
        <span className="chip">{mostrar ? 'Stats visíveis' : 'Stats ocultas'}</span>
      </Topo>
      <AvisoRede conexao={conexao} />

      <div className="led" aria-label="Placar">
        <div>
          <small>Lote</small>
          {String(L.i + 1).padStart(2, '0')}/{L.fila.length}
        </div>
        <div className="corre">
          <small>Ao vivo</small>
          <span>{`${marcha || 'Sem lances ainda'}  ·  ${j.nome.toUpperCase()} NO MARTELO`}</span>
        </div>
        <div>
          <small>Lance</small>R$ {L.lance}
        </div>
        <div className={`some ${aberto && seg <= 3 ? 'vermelho' : ''}`}>
          <small>Martelo</small>00:{String(naIntro ? 10 : seg).padStart(2, '0')}
        </div>
      </div>

      <div className="tecnicos" aria-label="Técnicos">
        {tecnicos.map((t) => {
          const tm = times[t.id];
          const lid = t.id === L.lider && !L.batido;
          const pas = L.passaram.includes(t.id) && !L.batido;
          return (
            <div key={t.id} className={`tec ${lid ? 'lider' : ''} ${pas ? 'passou' : ''}`} style={{ '--c': cor(t.id) }}>
              <span className="av">{t.nome[0].toUpperCase()}</span>
              <div className="meta">
                <div className="nm">
                  {t.nome}
                  {t.id === eu.id && <span style={{ color: 'var(--mute)', fontWeight: 400 }}> (você)</span>}
                  {t.bot && <span style={{ color: 'var(--mute)', fontWeight: 400 }}> · bot</span>}
                </div>
                <div className="sub">
                  <span className="din">R$ {tm.caixa}</span>
                  {lid ? <span className="tag lider">Na frente</span> : pas ? <span className="tag passou">Passou</span> : null}
                </div>
                <div className="slots">
                  {tm.vagas.map((v, k) => (
                    <i key={k} className={v ? 'f' : ''} />
                  ))}
                </div>
              </div>
              {plaquinhas
                .filter((p) => p.id === t.id)
                .map((p) => (
                  <div key={p.chave} className="plaquinha">
                    <b>{p.valor}</b>
                    <i />
                  </div>
                ))}
            </div>
          );
        })}
      </div>

      <div className="leilao">
        <section className="painel">
          <div className="lote-topo">
            <div className="palco" ref={palco} style={{ '--brilho': BRILHO[modo] }} onPointerMove={mover} onPointerLeave={soltar}>
              <div className="facho" />
              <div className="chao" />
              <div className={`vira ${naIntro ? 'costas' : ''}`}>
                <div className="face">
                  <Carta key={j.id} j={j} modo={modo} mostrarStats={mostrar} lote={L.i + 1} refCarta={cartaRef} />
                </div>
                <div className="face verso">
                  <Verso modo={modo} />
                </div>
              </div>
              {L.batido && (
                <div className="vendido">
                  {L.batido.por ? (
                    <span>
                      Vendido!
                      <small>
                        {L.batido.por === eu.id ? 'para você' : `para ${nome(L.batido.por)}`} · R$ {L.batido.valor}
                      </small>
                    </span>
                  ) : (
                    <span className="ninguem">
                      Sem lance
                      <small>ninguém quis</small>
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="lote-info">
              <div>
                <div className="j-nome">{j.nome}</div>
                <div className="j-meta">
                  {NOME_POS[j.pos]} · {j.clube} · {j.comp}
                </div>
                <div className="j-tags">
                  {j.pais && (
                    <span>
                      <img src={bandeira(j.pais)} alt="" />
                      {PAISES[j.pais]}
                    </span>
                  )}
                  <span>{NOME_SETOR[SETOR[j.pos]]}</span>
                  <span>{j.pos}</span>
                </div>
              </div>
              <div className="restam">
                Faltam <b>{L.fila.length - L.i - 1}</b> no leilão
                <span>
                  lote {L.i + 1}/{L.fila.length}
                </span>
              </div>
              <div className="relogio">
                <svg className="anel" viewBox="0 0 64 64" aria-label="Tempo restante">
                  <circle className="fundo" cx="32" cy="32" r="27" />
                  <circle className="frente" cx="32" cy="32" r="27" strokeDasharray="169.6" strokeDashoffset={169.6 * (1 - Math.min(1, fracao))} style={{ stroke: corRel, filter: `drop-shadow(0 0 6px ${corRel})` }} />
                  <text x="32" y="33">
                    {naIntro ? 10 : L.batido ? Math.max(0, Math.ceil((L.proximoEm + desvio - agora) / 1000)) : seg}
                  </text>
                </svg>
                <div className="martelo">
                  <strong>{martelo}</strong>
                  <span className="regra-tempo">Lance dá +1s, até no máximo 5s</span>
                </div>
              </div>
              <div>
                <div className="lider-txt">
                  <span className="ponto" />
                  {L.lider ? (L.lider === eu.id ? 'Você lidera' : `${nome(L.lider)} lidera`) : 'Ninguém deu lance'}
                </div>
                <div key={L.lance} className={`lance-grande ${L.lance ? 'pula' : ''}`}>
                  R$ {L.lance}
                </div>
              </div>
              <div className="historico">
                {historico.map((h, k) => (
                  <div key={`${h.valor}-${k}`}>
                    <span>
                      <i style={{ background: cor(h.id) }} />
                      {nome(h.id)}
                    </span>
                    <span>R$ {h.valor}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="painel meu">
          <div className="meu-topo">
            <span className="av" style={{ '--c': cor(eu.id) }}>
              {eu.nome[0].toUpperCase()}
            </span>
            <div className="meu-nome">
              {eu.nome}
              <span>VOCÊ</span>
            </div>
            <div className="meu-din">R$ {meu.caixa}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span className="sobre">Formação</span>
            <select className="sel" aria-label="Formação" value={meu.formacao} onChange={(e) => enviar({ tipo: 'formacao', formacao: e.target.value })}>
              {formacoes(config.emCampo).map((f) => (
                <option key={f} value={f} disabled={f !== meu.formacao && !formacaoCabe(estado, eu.id, f)}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="orcamento">
            <i style={{ width: `${meu.caixa}%` }} />
          </div>
          <div className="orcamento-txt">
            <span>
              <b>R$ {meu.caixa}</b> para <b>{vagasLivres}</b> {vagasLivres === 1 ? 'vaga' : 'vagas'}
            </span>
            <span>{vagasLivres ? `média de R$ ${Math.floor(meu.caixa / vagasLivres)} por vaga` : 'elenco completo'}</span>
          </div>
          <Campo
            emCampo={config.emCampo}
            formacao={meu.formacao}
            vagas={meu.vagas}
            modo={modo}
            mostrarStats={mostrar}
            destaque={!L.batido && cabeAqui ? j.pos : null}
          />
          <p className={`dica ${dica ? 'alerta' : ''}`}>{dica || 'As vagas onde ele pode jogar piscam em dourado, com quanto ele rende em cada uma.'}</p>
        </section>
      </div>

      <div className="doca-espaco" />
      <div className="doca">
        <div className="doca-linha">
          {[1, 5, 10].map((m) => (
            <button key={m} type="button" className="btn ouro" disabled={!posso(L.lance + m)} onClick={() => lance(L.lance + m)}>
              +{m}
              <small>R$ {L.lance + m}</small>
            </button>
          ))}
          <button type="button" className="btn vermelho tudo" disabled={!posso(meu.caixa)} onClick={() => lance(meu.caixa)}>
            Tudo <small>R$ {meu.caixa}</small>
          </button>
        </div>
        <div className="doca-linha dois">
          <label className="valor" htmlFor="valor">
            <span>R$</span>
            <input
              id="valor"
              type="number"
              inputMode="numeric"
              min={L.lance + 1}
              value={valor}
              placeholder={erroValor || `Mín. R$ ${L.lance + 1}`}
              onChange={(e) => {
                setValor(e.target.value);
                setErroValor('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && darLance()}
              disabled={!aberto || naFrente || passei || !cabeAqui}
            />
          </label>
          <button type="button" className="btn verde" disabled={!aberto || naFrente || passei || !cabeAqui || !valor} onClick={darLance}>
            Dar lance
          </button>
          <button type="button" className="btn escuro" disabled={!aberto || naFrente || passei} onClick={() => enviar({ tipo: 'passar' })}>
            Passar
          </button>
        </div>
      </div>
    </main>
  );
}
