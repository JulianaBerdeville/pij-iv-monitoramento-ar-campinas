import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useJson } from "../hooks/useJson";

type Poluente =
  | "co"
  | "no"
  | "no2"
  | "nox"
  | "o3"
  | "pm10"
  | "pm25"
  | "so2"
  | "umidade_relativa";

interface RegistroMensal {
  ano: number;
  mes_num: number;
  mes: string;
  estacao: string;
  co: number | null;
  no: number | null;
  no2: number | null;
  nox: number | null;
  o3: number | null;
  pm10: number | null;
  pm25: number | null;
  so2?: number | null;
  umidade_relativa: number | null;
}

interface EstacaoResumo {
  unidades: Partial<Record<Poluente, string>>;
}

interface ResumoCetesb {
  ano: number;
  anos: number[];
  observacao: string;
  estacoes: Record<string, EstacaoResumo>;
}

interface ResultadoPrevisao {
  estacao: string;
  poluente: Poluente;
  unidade: string;
  observacoes: number;
  treino: number;
  teste: number;
  validacao: {
    inicio: string;
    fim: string;
    mae: number;
    rmse: number;
    baseline_mae: number;
    supera_baseline: boolean;
  };
  previsao: {
    periodo: string;
    valor: number;
    ultimo_periodo_observado: string;
    ultimo_valor_observado: number;
  };
}

interface PrevisoesCetesb {
  modelo: string;
  alvo: string;
  baseline: string;
  metodo_validacao: string;
  resultados: ResultadoPrevisao[];
}

const NOMES_POLUENTES: Record<Poluente, string> = {
  co: "Monóxido de carbono (CO)",
  no: "Monóxido de nitrogênio (NO)",
  no2: "Dióxido de nitrogênio (NO₂)",
  nox: "Óxidos de nitrogênio (NOx)",
  o3: "Ozônio (O₃)",
  pm10: "Partículas inaláveis (MP10)",
  pm25: "Partículas finas (MP2.5)",
  so2: "Dióxido de enxofre (SO₂)",
  umidade_relativa: "Umidade relativa",
};

const MESES_CURTOS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const FORMATADOR = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const NOMES_ESTACOES: Record<string, string> = {
  "CAMPINAS-CENTRO": "Centro",
  "CAMPINAS-TAQUARAL": "Taquaral",
  "CAMPINAS-V.UNIAO": "Vila União",
};

function nomeEstacao(estacao: string) {
  return NOMES_ESTACOES[estacao] ?? estacao;
}

function formatarPeriodo(periodo: string) {
  const [ano, mes] = periodo.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(ano, mes - 1, 1)));
}

export function CetesbDashboard() {
  const serie = useJson<RegistroMensal[]>("/data/cetesb_mensal.json");
  const resumo = useJson<ResumoCetesb>("/data/cetesb_resumo.json");
  const previsoes = useJson<PrevisoesCetesb>("/data/cetesb_previsoes.json");
  const [estacaoSelecionada, setEstacaoSelecionada] = useState("");
  const [poluenteSelecionado, setPoluenteSelecionado] = useState<Poluente | "">("");
  const [anoSelecionado, setAnoSelecionado] = useState<number | null>(null);

  if (serie.loading || resumo.loading || previsoes.loading) {
    return <main className="app-shell"><p className="status">Carregando dados da CETESB...</p></main>;
  }

  const erro = serie.error || resumo.error || previsoes.error;
  if (erro || !serie.data || !resumo.data || !previsoes.data) {
    return (
      <main className="app-shell">
        <p className="status status-erro">
          Não foi possível carregar os dados CETESB ({erro ?? "resposta vazia"}). Execute
          <code>npm run analyze</code> na pasta <code>web</code> para gerar os arquivos em
          <code>web/public/data</code>.
        </p>
      </main>
    );
  }

  const dadosResumo = resumo.data;
  const estacoes = Object.keys(dadosResumo.estacoes);
  const estacao = estacoes.includes(estacaoSelecionada) ? estacaoSelecionada : estacoes[0];
  if (!estacao) {
    return <main className="app-shell"><p className="status">Nenhuma estação encontrada no resumo CETESB.</p></main>;
  }

  const anos = dadosResumo.anos;
  const ano = anoSelecionado !== null && anos.includes(anoSelecionado)
    ? anoSelecionado
    : dadosResumo.ano;
  const dadosEstacao = dadosResumo.estacoes[estacao];
  const poluentes = Object.keys(dadosEstacao.unidades) as Poluente[];
  const poluente =
    poluenteSelecionado !== "" && poluentes.includes(poluenteSelecionado)
      ? poluenteSelecionado
      : poluentes[0];
  if (!poluente) {
    return <main className="app-shell"><p className="status">Nenhum poluente encontrado para esta estação.</p></main>;
  }

  const unidade = dadosEstacao.unidades[poluente]?.trim() || "unidade não informada";
  const dadosGrafico = serie.data
    .filter((registro) => registro.estacao === estacao && registro.ano === ano)
    .sort((a, b) => a.mes_num - b.mes_num)
    .map((registro) => ({
      ...registro,
      mes_curto: MESES_CURTOS[registro.mes_num - 1],
      valor: registro[poluente] ?? null,
    }));
  const valoresValidos = dadosGrafico.filter(
    (registro): registro is typeof registro & { valor: number } => registro.valor !== null,
  );
  const media = valoresValidos.length
    ? valoresValidos.reduce((soma, registro) => soma + registro.valor, 0) / valoresValidos.length
    : null;
  const maior = valoresValidos.reduce<(typeof valoresValidos)[number] | null>(
    (atual, registro) => atual === null || registro.valor > atual.valor ? registro : atual,
    null,
  );
  const menor = valoresValidos.reduce<(typeof valoresValidos)[number] | null>(
    (atual, registro) => atual === null || registro.valor < atual.valor ? registro : atual,
    null,
  );
  const resultadoModelo = previsoes.data.resultados.find(
    (resultado) => resultado.estacao === estacao && resultado.poluente === poluente,
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-line"><span className="brand-mark" /> MONITORAMENTO AMBIENTAL · CETESB</div>
        <div className="header-main">
          <div>
            <h1>Qualidade do ar</h1>
            <p>Campinas, São Paulo <span className="header-divider">/</span> Médias mensais de {ano}</p>
          </div>
          <span className="year-stamp">{ano}</span>
        </div>
      </header>

      <main>
        <section className="filter-row" aria-label="Filtros dos dados">
          <label className="filter-field">
            <span>Estação</span>
            <select
              value={estacao}
              onChange={(evento) => {
                setEstacaoSelecionada(evento.target.value);
                setPoluenteSelecionado("");
              }}
            >
              {estacoes.map((item) => <option key={item} value={item}>{nomeEstacao(item)}</option>)}
            </select>
          </label>
          <label className="filter-field">
            <span>Variável</span>
            <select
              value={poluente}
              onChange={(evento) => setPoluenteSelecionado(evento.target.value as Poluente)}
            >
              {poluentes.map((item) => <option key={item} value={item}>{NOMES_POLUENTES[item]}</option>)}
            </select>
          </label>
          <label className="filter-field">
            <span>Ano</span>
            <select
              value={ano}
              onChange={(evento) => setAnoSelecionado(Number(evento.target.value))}
            >
              {[...anos].reverse().map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <div className="filter-context">
            <span className="live-dot" />
            <span>{nomeEstacao(estacao)}<br /><strong>{unidade}</strong></span>
          </div>
        </section>

        <section className="stats-row" aria-label="Resumo da variável selecionada">
          <article className="stat-block stat-highlight">
            <span className="stat-label">Média das médias mensais</span>
            <strong>{media === null ? "—" : FORMATADOR.format(media)}</strong>
            <span className="stat-unit">{unidade}</span>
          </article>
          <article className="stat-block">
            <span className="stat-label">Meses com dados</span>
            <strong>{valoresValidos.length}<small> / 12</small></strong>
            <span className="stat-unit">meses válidos</span>
          </article>
          <article className="stat-block">
            <span className="stat-label">Maior média mensal</span>
            <strong>{maior ? FORMATADOR.format(maior.valor) : "—"}</strong>
            <span className="stat-unit">{maior?.mes ?? "Sem dado"}</span>
          </article>
          <article className="stat-block">
            <span className="stat-label">Menor média mensal</span>
            <strong>{menor ? FORMATADOR.format(menor.valor) : "—"}</strong>
            <span className="stat-unit">{menor?.mes ?? "Sem dado"}</span>
          </article>
        </section>

        <section className="model-section" aria-label="Previsão mensal com aprendizagem de máquina">
          <div className="section-heading">
            <div>
              <span className="section-kicker">APRENDIZAGEM DE MÁQUINA</span>
              <h2>Estimativa para o próximo mês</h2>
            </div>
            <span className="unit-tag">{previsoes.data.modelo}</span>
          </div>
          {resultadoModelo ? (
            <div className="model-content">
              <div className="forecast-value">
                <span>Previsão para {formatarPeriodo(resultadoModelo.previsao.periodo)}</span>
                <strong>
                  {FORMATADOR.format(resultadoModelo.previsao.valor)}
                  <small>{resultadoModelo.unidade}</small>
                </strong>
                <span className="model-last-value">
                  Última medição: {formatarPeriodo(resultadoModelo.previsao.ultimo_periodo_observado)} ·{" "}
                  {FORMATADOR.format(resultadoModelo.previsao.ultimo_valor_observado)} {resultadoModelo.unidade}
                </span>
              </div>
              <div className="model-metrics">
                <article>
                  <span>Erro absoluto médio (MAE)</span>
                  <strong>{FORMATADOR.format(resultadoModelo.validacao.mae)} {resultadoModelo.unidade}</strong>
                </article>
                <article>
                  <span>Baseline sazonal (MAE)</span>
                  <strong>{FORMATADOR.format(resultadoModelo.validacao.baseline_mae)} {resultadoModelo.unidade}</strong>
                </article>
                <article>
                  <span>Meses avaliados</span>
                  <strong>{resultadoModelo.teste}</strong>
                </article>
              </div>
              <p className="model-note">
                {resultadoModelo.validacao.supera_baseline
                  ? "Na validação, o modelo teve erro menor que o baseline sazonal."
                  : "Na validação, o modelo não superou o baseline sazonal; interprete a estimativa com cautela."}{" "}
                Comparação em dados anteriores não usados no treino ({formatarPeriodo(resultadoModelo.validacao.inicio)} a{" "}
                {formatarPeriodo(resultadoModelo.validacao.fim)}). O MAE indica o erro médio; não é uma garantia para o mês previsto.
              </p>
            </div>
          ) : (
            <p className="model-unavailable">
              Histórico mensal insuficiente ou sem medições consecutivas para treinar e avaliar uma previsão confiável para esta combinação.
            </p>
          )}
        </section>

        <section className="chart-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">SÉRIE ANUAL</span>
              <h2>{NOMES_POLUENTES[poluente]}</h2>
            </div>
            <span className="unit-tag">{unidade}</span>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosGrafico} margin={{ top: 18, right: 18, bottom: 4, left: 4 }}>
                <CartesianGrid vertical={false} stroke="#e4e9e3" strokeDasharray="3 5" />
                <XAxis dataKey="mes_curto" axisLine={false} tickLine={false} tick={{ fill: "#68756f", fontSize: 12 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#68756f", fontSize: 12 }}
                  tickFormatter={(valor: number) => FORMATADOR.format(valor)}
                  width={58}
                />
                <Tooltip
                  formatter={(valor) => [valor == null ? "Sem dado" : `${FORMATADOR.format(Number(valor))} ${unidade}`, NOMES_POLUENTES[poluente]]}
                  labelFormatter={(mes) => `${mes} ${ano}`}
                  contentStyle={{ border: "1px solid #dce4dc", borderRadius: 6, fontSize: 13 }}
                />
                <Line
                  type="monotone"
                  dataKey="valor"
                  name={NOMES_POLUENTES[poluente]}
                  stroke="#16765b"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#16765b", strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#e1774e", stroke: "#fff", strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="chart-note">Lacunas representam meses sem medição disponível; a linha não interpola esses valores.</p>
        </section>

        <section className="table-section">
          <div className="section-heading table-heading">
            <div>
              <span className="section-kicker">DETALHAMENTO</span>
              <h2>Valores mensais</h2>
            </div>
            <span className="table-count">{valoresValidos.length} meses reportados em {ano}</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Mês</th><th>Estação</th><th className="value-cell">{NOMES_POLUENTES[poluente]}</th><th>Unidade</th></tr></thead>
              <tbody>
                {dadosGrafico.map((registro) => (
                  <tr key={`${registro.estacao}-${registro.ano}-${registro.mes_num}`}>
                    <td>{registro.mes}</td>
                    <td>{nomeEstacao(registro.estacao)}</td>
                    <td className="value-cell">{registro.valor == null ? <span className="missing-value">Sem dado</span> : FORMATADOR.format(registro.valor)}</td>
                    <td>{unidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="data-note">
          <span className="note-mark">i</span>
          <p>{dadosResumo.observacao} A previsão é uma estimativa experimental baseada apenas no histórico mensal da variável e não substitui medições nem alertas oficiais.</p>
        </footer>
      </main>
    </div>
  );
}
