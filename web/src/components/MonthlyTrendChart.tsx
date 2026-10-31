import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Summary } from "../types";

const NOMES_MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

interface Props {
  resumo: Summary;
}

export function MonthlyTrendChart({ resumo }: Props) {
  const dados = resumo.por_mes.map((m) => ({ ...m, nome: NOMES_MESES[m.mes - 1] }));

  return (
    <div className="chart-card">
      <h3>Média mensal de PM2.5 e focos de queimada</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={dados}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="nome" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="pm25" name="PM2.5 (µg/m³)" stroke="#c62828" strokeWidth={2} />
          <Line yAxisId="right" type="monotone" dataKey="focos_queimada" name="Focos de queimada" stroke="#8d6e63" strokeWidth={2} strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
