export type PeriodoSafra = "safra" | "entressafra";

export type AqiCategoria = "Boa" | "Moderada" | "Ruim" | "Muito Ruim";

export interface RegistroDiario {
  data: string;
  pm25: number;
  pm10: number;
  co: number;
  no2: number;
  o3: number;
  so2: number;
  temperatura: number;
  umidade: number;
  vento: number;
  precipitacao: number;
  focos_queimada: number;
  periodo_safra: PeriodoSafra;
  aqi_categoria: AqiCategoria;
}

export interface FeatureImportance {
  feature: string;
  importancia: number;
}

export interface RegressaoMetrics {
  rmse: number;
  mae: number;
  r2: number;
  feature_importance: FeatureImportance[];
}

export interface ClassificacaoMetrics {
  accuracy: number;
  labels: AqiCategoria[];
  confusion_matrix: number[][];
}

export interface ClusterPonto {
  x: number;
  y: number;
  cluster: number;
  data: string;
}

export interface ClusteringMetrics {
  inertia: number;
  n_clusters: number;
  pontos: ClusterPonto[];
}

export interface Metrics {
  regressao: RegressaoMetrics;
  classificacao: ClassificacaoMetrics;
  clustering: ClusteringMetrics;
}

export interface ResumoPeriodo {
  pm25: number;
  pm10: number;
  focos_queimada: number;
}

export interface ResumoMensal extends ResumoPeriodo {
  mes: number;
}

export interface Summary {
  por_periodo_safra: Record<PeriodoSafra, ResumoPeriodo>;
  por_mes: ResumoMensal[];
  ultimo_registro: RegistroDiario;
}
