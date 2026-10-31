import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Summary } from "../types";

interface Props {
  resumo: Summary;
}

/** Compara medias de poluentes/focos entre safra da cana (mai-out) e entressafra. */
export function SafraComparisonChart({ resumo }: Props) {
  const dados = [
    { periodo: "Entressafra", ...resumo.por_periodo_safra.entressafra },
    { periodo: "Safra da cana", ...resumo.por_periodo_safra.safra },
  ];

  return (
    <div className="chart-card">
      <h3>Safra da cana x entressafra — médias diárias</h3>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={dados}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="periodo" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="pm25" name="PM2.5 (µg/m³)" fill="#c62828" />
          <Bar dataKey="pm10" name="PM10 (µg/m³)" fill="#ef6c00" />
          <Bar dataKey="focos_queimada" name="Focos de queimada" fill="#8d6e63" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
