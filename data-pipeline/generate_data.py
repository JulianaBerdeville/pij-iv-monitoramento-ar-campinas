"""
Gera uma base diaria simulada (2024-2025) para Campinas/SP combinando:
- CETESB: poluentes atmosfericos (PM2.5, PM10, CO, O3, NO2, SO2)
- INMET: variaveis meteorologicas (temperatura, umidade, vento, precipitacao)
- CPTEC/INPE: focos de queimada (maior incidencia na safra da cana, maio-outubro)

Os padroes (sazonalidade da safra, efeito do vento/chuva na dispersao de poluentes,
ciclo de temperatura/umidade) sao baseados no comportamento historico conhecido da
regiao, usados aqui para simular uma serie plausivel na ausencia de acesso direto
as APIs/portais oficiais no ambiente de desenvolvimento.
"""
import numpy as np
import pandas as pd

RNG = np.random.default_rng(42)

START = "2024-01-01"
END = "2025-12-31"


def gerar_series():
    datas = pd.date_range(START, END, freq="D")
    n = len(datas)
    dia_do_ano = datas.dayofyear.to_numpy()
    mes = datas.month.to_numpy()

    # --- INMET: clima ---
    # temperatura media com ciclo anual (verao ~28C, inverno ~17C) + ruido
    temperatura = 22.5 - 6.5 * np.cos(2 * np.pi * (dia_do_ano - 30) / 365) + RNG.normal(0, 1.5, n)
    # umidade menor no inverno/seca (maio-setembro)
    umidade = 70 + 15 * np.cos(2 * np.pi * (dia_do_ano - 200) / 365) + RNG.normal(0, 5, n)
    umidade = np.clip(umidade, 20, 100)
    # vento (m/s), levemente mais fraco em dias de inversao termica (inverno)
    vento = 2.2 + 0.6 * np.cos(2 * np.pi * (dia_do_ano - 30) / 365) + RNG.gamma(2, 0.3, n)
    vento = np.clip(vento, 0.2, None)
    # precipitacao concentrada no verao (out-mar), quase seca no inverno
    prob_chuva = 0.5 + 0.35 * np.cos(2 * np.pi * (dia_do_ano - 20) / 365)
    chove = RNG.random(n) < np.clip(prob_chuva, 0.03, 0.9)
    precipitacao = np.where(chove, RNG.gamma(2, 8, n), 0.0)

    # --- CPTEC/INPE: focos de queimada (safra da cana: maio-outubro, pico ago/set) ---
    safra_intensidade = np.clip(np.cos(2 * np.pi * (dia_do_ano - 240) / 365), 0, 1) ** 1.5
    focos_base = 25 * safra_intensidade
    # chuva forte reduz queimadas/focos detectados
    focos_queimada = np.maximum(0, focos_base - 0.4 * precipitacao) + RNG.poisson(1.0, n)
    focos_queimada = np.round(focos_queimada).astype(int)

    # --- CETESB: poluentes ---
    # PM2.5/PM10 sobem com focos de queimada e caem com vento/chuva (dispersao)
    pm25_base = 12 + 1.6 * focos_queimada - 1.8 * vento - 0.15 * precipitacao
    pm25 = np.clip(pm25_base + RNG.normal(0, 3, n), 2, None)
    pm10 = np.clip(pm25 * 1.6 + RNG.normal(0, 4, n), 4, None)

    # CO e NO2 mais associados a trafego urbano (padrao semanal: menor fds)
    dia_semana = datas.dayofweek.to_numpy()  # 0=segunda
    fator_trafego = np.where(dia_semana < 5, 1.0, 0.6)
    co = np.clip(0.5 + 0.35 * fator_trafego + 0.01 * focos_queimada + RNG.normal(0, 0.1, n), 0.1, None)
    no2 = np.clip(18 + 12 * fator_trafego - 0.7 * vento + RNG.normal(0, 4, n), 2, None)

    # O3 aumenta com radiacao solar/temperatura (mais forte no verao, dias secos)
    o3 = np.clip(30 + 1.4 * (temperatura - 20) - 0.3 * umidade / 2 + RNG.normal(0, 6, n), 3, None)
    so2 = np.clip(4 + 0.05 * focos_queimada + RNG.normal(0, 1.2, n), 0.5, None)

    df = pd.DataFrame({
        "data": datas.strftime("%Y-%m-%d"),
        "mes": mes,
        "pm25": pm25.round(1),
        "pm10": pm10.round(1),
        "co": co.round(2),
        "no2": no2.round(1),
        "o3": o3.round(1),
        "so2": so2.round(1),
        "temperatura": temperatura.round(1),
        "umidade": umidade.round(1),
        "vento": vento.round(2),
        "precipitacao": precipitacao.round(1),
        "focos_queimada": focos_queimada,
    })

    df["periodo_safra"] = df["mes"].isin([5, 6, 7, 8, 9, 10]).map({True: "safra", False: "entressafra"})
    df["aqi_categoria"] = df["pm25"].apply(classificar_aqi)
    return df


def classificar_aqi(pm25: float) -> str:
    # faixas simplificadas inspiradas no indice CETESB/EPA para PM2.5 (ug/m3, media 24h)
    if pm25 <= 15:
        return "Boa"
    if pm25 <= 40:
        return "Moderada"
    if pm25 <= 65:
        return "Ruim"
    return "Muito Ruim"


if __name__ == "__main__":
    df = gerar_series()
    df.to_csv("dataset_qualidade_ar_campinas.csv", index=False, encoding="utf-8")
    print(f"Gerado dataset_qualidade_ar_campinas.csv com {len(df)} registros.")
