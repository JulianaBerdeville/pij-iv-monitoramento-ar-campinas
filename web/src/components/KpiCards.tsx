import type { AqiCategoria, RegistroDiario } from "../types";

const CORES_AQI: Record<AqiCategoria, string> = {
  Boa: "#2e7d32",
  Moderada: "#f9a825",
  Ruim: "#ef6c00",
  "Muito Ruim": "#c62828",
};

interface Props {
  ultimoRegistro: RegistroDiario;
}

export function KpiCards({ ultimoRegistro }: Props) {
  const cor = CORES_AQI[ultimoRegistro.aqi_categoria];

  return (
    <div className="kpi-grid">
      <div className="kpi-card" style={{ borderTopColor: cor }}>
        <span className="kpi-label">Qualidade do ar (última leitura)</span>
        <span className="kpi-value" style={{ color: cor }}>
          {ultimoRegistro.aqi_categoria}
        </span>
        <span className="kpi-sub">{ultimoRegistro.data}</span>
      </div>
      <div className="kpi-card">
        <span className="kpi-label">PM2.5</span>
        <span className="kpi-value">{ultimoRegistro.pm25} µg/m³</span>
      </div>
      <div className="kpi-card">
        <span className="kpi-label">PM10</span>
        <span className="kpi-value">{ultimoRegistro.pm10} µg/m³</span>
      </div>
      <div className="kpi-card">
        <span className="kpi-label">Focos de queimada (INPE)</span>
        <span className="kpi-value">{ultimoRegistro.focos_queimada}</span>
      </div>
      <div className="kpi-card">
        <span className="kpi-label">Vento</span>
        <span className="kpi-value">{ultimoRegistro.vento} m/s</span>
      </div>
    </div>
  );
}
