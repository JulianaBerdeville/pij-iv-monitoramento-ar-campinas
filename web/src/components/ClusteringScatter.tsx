import {
  CartesianGrid,
  Legend,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import type { ClusteringMetrics } from "../types";

const CORES_CLUSTER = ["#1565c0", "#2e7d32", "#ef6c00", "#c62828", "#6a1b9a"];

interface Props {
  clustering: ClusteringMetrics;
}

/** Projecao 2D (PCA) dos dias agrupados por padrao de poluicao/clima (K-Means). */
export function ClusteringScatter({ clustering }: Props) {
  const grupos = Array.from({ length: clustering.n_clusters }, (_, c) =>
    clustering.pontos.filter((p) => p.cluster === c)
  );

  return (
    <div className="chart-card">
      <h3>Padrões de dias (clustering K-Means + PCA)</h3>
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name="Componente 1" />
          <YAxis type="number" dataKey="y" name="Componente 2" />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value) => Number(value ?? 0).toFixed(2)} />
          <Legend />
          {grupos.map((pontos, c) => (
            <Scatter key={c} name={`Grupo ${c + 1}`} data={pontos} fill={CORES_CLUSTER[c % CORES_CLUSTER.length]} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
