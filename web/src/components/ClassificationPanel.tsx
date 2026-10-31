import type { ClassificacaoMetrics } from "../types";

interface Props {
  classificacao: ClassificacaoMetrics;
}

/** Matriz de confusao do classificador de categoria de qualidade do ar. */
export function ClassificationPanel({ classificacao }: Props) {
  const { labels, confusion_matrix, accuracy } = classificacao;

  return (
    <div className="chart-card">
      <h3>Classificação — categoria de qualidade do ar</h3>
      <p className="metric-row">
        <strong>Acurácia</strong>: {(accuracy * 100).toFixed(1)}%
      </p>
      <table className="confusion-matrix">
        <thead>
          <tr>
            <th>Real \ Previsto</th>
            {labels.map((l) => (
              <th key={l}>{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {confusion_matrix.map((linha, i) => (
            <tr key={labels[i]}>
              <th>{labels[i]}</th>
              {linha.map((valor, j) => (
                <td key={j} className={i === j ? "acerto" : valor > 0 ? "erro" : ""}>
                  {valor}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
