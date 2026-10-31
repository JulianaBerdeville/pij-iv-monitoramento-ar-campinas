import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RegressaoMetrics } from "../types";

const CORES = ["#1565c0", "#2e7d32", "#ef6c00", "#c62828", "#6a1b9a", "#00838f"];

interface Props {
  regressao: RegressaoMetrics;
}

/** Exibe as metricas do modelo de regressao (previsao de PM2.5) e importancia das variaveis. */
export function RegressionPanel({ regressao }: Props) {
  return (
    <div className="chart-card">
      <h3>Regressão — previsão de PM2.5</h3>
      <div className="metric-row">
        <span><strong>R²</strong>: {regressao.r2}</span>
        <span><strong>RMSE</strong>: {regressao.rmse} µg/m³</span>
        <span><strong>MAE</strong>: {regressao.mae} µg/m³</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={regressao.feature_importance} layout="vertical" margin={{ left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis type="category" dataKey="feature" width={100} />
          <Tooltip />
          <Bar dataKey="importancia" name="Importância">
            {regressao.feature_importance.map((_, i) => (
              <Cell key={i} fill={CORES[i % CORES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
