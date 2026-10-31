import {
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
  Bar,
} from "recharts";
import type { RegistroDiario } from "../types";

interface Props {
  registros: RegistroDiario[];
}

/** Serie temporal de PM2.5/PM10 sobreposta aos focos de queimada (INPE). */
export function TimeSeriesChart({ registros }: Props) {
  // amostragem a cada 3 dias para manter o grafico legivel com 2 anos de dados
  const amostra = registros.filter((_, i) => i % 3 === 0);

  return (
    <div className="chart-card">
      <h3>Evolução da poluição x focos de queimada — Campinas (2024-2025)</h3>
      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={amostra}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="data" tick={{ fontSize: 10 }} minTickGap={40} />
          <YAxis yAxisId="poluentes" label={{ value: "µg/m³", angle: -90, position: "insideLeft" }} />
          <YAxis yAxisId="focos" orientation="right" label={{ value: "focos", angle: 90, position: "insideRight" }} />
          <Tooltip />
          <Legend />
          <Bar yAxisId="focos" dataKey="focos_queimada" name="Focos de queimada (INPE)" fill="#ffcc80" barSize={3} />
          <Line yAxisId="poluentes" type="monotone" dataKey="pm25" name="PM2.5" stroke="#c62828" dot={false} strokeWidth={2} />
          <Line yAxisId="poluentes" type="monotone" dataKey="pm10" name="PM10" stroke="#6d4c41" dot={false} strokeWidth={1.5} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
