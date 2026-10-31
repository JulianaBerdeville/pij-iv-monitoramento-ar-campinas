"""Prepara os dados mensais da CETESB e avalia previsões de poluentes."""

import json
import re
import unicodedata
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error

OUT_DIR = Path(__file__).resolve().parents[1] / "web" / "public" / "data"
MIN_OBSERVATIONS = 72
MIN_TRAIN_SAMPLES = 36
MIN_TEST_SAMPLES = 12
TEST_MONTHS = 24

MESES = {
    nome: numero
    for numero, nome in enumerate(
        [
            "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
            "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
        ],
        start=1,
    )
}
NOMES_MESES = {numero: nome.title() for nome, numero in MESES.items()}
NOMES_POLUENTES = {
    "mp2.5": "pm25",
    "mp2,5": "pm25",
    "mp10": "pm10",
    "co": "co",
    "no": "no",
    "no2": "no2",
    "nox": "nox",
    "o3": "o3",
    "so2": "so2",
    "ur": "umidade_relativa",
}


def normalizar_texto(valor: object) -> str:
    texto = unicodedata.normalize("NFKD", str(valor).strip().lower())
    return "".join(caractere for caractere in texto if not unicodedata.combining(caractere))


def carregar_dados_cetesb(
    caminho: Path,
) -> tuple[pd.DataFrame, dict[str, dict[str, str]]]:
    abas = pd.read_excel(caminho, sheet_name=None)
    tabelas = []
    unidades: dict[str, dict[str, str]] = {}

    for estacao, tabela in abas.items():
        coluna_ano = next(
            (coluna for coluna in tabela.columns if normalizar_texto(coluna) == "ano"),
            None,
        )
        coluna_mes = next(
            (coluna for coluna in tabela.columns if normalizar_texto(coluna) == "mes"),
            None,
        )
        if coluna_ano is None:
            raise ValueError(f'A aba "{estacao}" não possui uma coluna "Ano".')
        if coluna_mes is None:
            raise ValueError(f'A aba "{estacao}" não possui uma coluna "Mês".')

        anos_lidos = pd.to_numeric(tabela[coluna_ano], errors="coerce")
        anos_invalidos = tabela[coluna_ano].notna() & anos_lidos.isna()
        if anos_invalidos.any():
            valores = tabela.loc[anos_invalidos, coluna_ano].astype(str).unique().tolist()
            raise ValueError(f'Anos não reconhecidos na aba "{estacao}": {valores}')

        anos = anos_lidos.ffill()
        if anos.isna().any():
            raise ValueError(f'A coluna "Ano" da aba "{estacao}" começa sem um ano válido.')
        if (anos % 1 != 0).any():
            raise ValueError(f'A coluna "Ano" da aba "{estacao}" contém valores não inteiros.')

        meses = tabela[coluna_mes].map(
            lambda valor: (
                int(valor)
                if isinstance(valor, (int, float))
                and not pd.isna(valor)
                and 1 <= valor <= 12
                else MESES.get(normalizar_texto(valor)) if pd.notna(valor) else None
            )
        )
        meses_invalidos = tabela[coluna_mes].notna() & meses.isna()
        if meses_invalidos.any():
            valores = tabela.loc[meses_invalidos, coluna_mes].astype(str).unique().tolist()
            raise ValueError(f'Meses não reconhecidos na aba "{estacao}": {valores}')

        resultado = pd.DataFrame(
            {
                "ano": anos.astype(int),
                "mes_num": meses,
            }
        )
        resultado["mes"] = resultado["mes_num"].map(NOMES_MESES)
        resultado["estacao"] = estacao
        unidades[estacao] = {}

        for coluna in tabela.columns:
            if coluna in {coluna_ano, coluna_mes}:
                continue
            prefixo = re.match(
                r"^[a-z]+(?:\d+(?:[.,]\d+)?|[.,]\d+)?",
                normalizar_texto(coluna),
            )
            codigo = prefixo.group() if prefixo else ""
            poluente = NOMES_POLUENTES.get(codigo)
            if poluente is None:
                continue
            if poluente in resultado.columns:
                raise ValueError(f'Poluente duplicado "{poluente}" na aba "{estacao}".')

            valores = tabela[coluna].astype("string").str.strip()
            valores = valores.mask(valores.eq("-") | valores.eq(""), pd.NA)
            valores = valores.str.replace(",", ".", regex=False)
            resultado[poluente] = pd.to_numeric(valores, errors="coerce")
            unidades[estacao][poluente] = str(coluna).rsplit(")", maxsplit=1)[-1].strip()

        resultado = resultado.dropna(subset=["mes_num"])
        resultado["mes_num"] = resultado["mes_num"].astype(int)
        duplicados = resultado.duplicated(["ano", "mes_num"])
        if duplicados.any():
            chaves = resultado.loc[duplicados, ["ano", "mes_num"]].to_dict("records")
            raise ValueError(f'A aba "{estacao}" possui meses duplicados: {chaves}')
        tabelas.append(resultado)

    if not tabelas:
        raise ValueError("A planilha não contém abas com dados de estações.")

    dados = pd.concat(tabelas, ignore_index=True, sort=False)
    return dados.sort_values(["estacao", "ano", "mes_num"]).reset_index(drop=True), unidades


def construir_features(serie: pd.Series) -> pd.DataFrame:
    periodos = pd.period_range(serie.index.min(), serie.index.max(), freq="M")
    valores = serie.reindex(periodos)
    angulo_mes = 2 * np.pi * periodos.month / 12
    features = pd.DataFrame(
        {
            "ano": periodos.year,
            "mes_seno": np.sin(angulo_mes),
            "mes_cosseno": np.cos(angulo_mes),
            "valor_mes_anterior": valores.shift(1).to_numpy(),
            "valor_mes_ano_anterior": valores.shift(12).to_numpy(),
            "alvo": valores.to_numpy(),
        },
        index=periodos,
    )
    return features


def prever_serie_mensal(grupo: pd.DataFrame, poluente: str, unidade: str) -> dict | None:
    observacoes = grupo.dropna(subset=[poluente]).copy()
    if len(observacoes) < MIN_OBSERVATIONS:
        return None

    observacoes["periodo"] = pd.to_datetime(
        {
            "year": observacoes["ano"],
            "month": observacoes["mes_num"],
            "day": 1,
        }
    ).dt.to_period("M")
    serie = observacoes.set_index("periodo")[poluente].sort_index()
    features = construir_features(serie).dropna()
    if features.empty:
        return None

    ultimo_periodo = serie.index.max()
    inicio_teste = ultimo_periodo - (TEST_MONTHS - 1)
    treino = features.loc[features.index < inicio_teste]
    teste = features.loc[features.index >= inicio_teste]
    if len(treino) < MIN_TRAIN_SAMPLES or len(teste) < MIN_TEST_SAMPLES:
        return None

    colunas_features = [
        "ano",
        "mes_seno",
        "mes_cosseno",
        "valor_mes_anterior",
        "valor_mes_ano_anterior",
    ]
    modelo_teste = RandomForestRegressor(
        n_estimators=300,
        min_samples_leaf=3,
        random_state=42,
    )
    modelo_teste.fit(treino[colunas_features], treino["alvo"])
    previsoes_teste = modelo_teste.predict(teste[colunas_features])
    erro_absoluto_medio = float(mean_absolute_error(teste["alvo"], previsoes_teste))
    erro_quadratico_medio = float(
        np.sqrt(mean_squared_error(teste["alvo"], previsoes_teste))
    )
    erro_baseline = float(
        mean_absolute_error(teste["alvo"], teste["valor_mes_ano_anterior"])
    )

    proximo_periodo = ultimo_periodo + 1
    dados_previsao = construir_features(
        pd.concat(
            [
                serie,
                pd.Series([np.nan], index=pd.PeriodIndex([proximo_periodo], freq="M")),
            ]
        )
    )
    if proximo_periodo not in dados_previsao.index:
        return None
    linha_previsao = dados_previsao.loc[[proximo_periodo], colunas_features].dropna()
    if linha_previsao.empty:
        return None

    modelo_final = RandomForestRegressor(
        n_estimators=300,
        min_samples_leaf=3,
        random_state=42,
    )
    modelo_final.fit(features[colunas_features], features["alvo"])
    valor_previsto = float(modelo_final.predict(linha_previsao[colunas_features])[0])

    return {
        "estacao": str(grupo["estacao"].iloc[0]),
        "poluente": poluente,
        "unidade": unidade,
        "observacoes": int(len(observacoes)),
        "treino": int(len(treino)),
        "teste": int(len(teste)),
        "validacao": {
            "inicio": str(teste.index.min()),
            "fim": str(teste.index.max()),
            "mae": round(erro_absoluto_medio, 2),
            "rmse": round(erro_quadratico_medio, 2),
            "baseline_mae": round(erro_baseline, 2),
            "supera_baseline": erro_absoluto_medio < erro_baseline,
        },
        "previsao": {
            "periodo": str(proximo_periodo),
            "valor": round(max(valor_previsto, 0), 2),
            "ultimo_periodo_observado": str(ultimo_periodo),
            "ultimo_valor_observado": round(float(serie.loc[ultimo_periodo]), 2),
        },
    }


def gerar_previsoes(
    dados: pd.DataFrame,
    unidades: dict[str, dict[str, str]],
) -> dict:
    resultados = []
    for estacao, grupo in dados.groupby("estacao", sort=True):
        for poluente, unidade in unidades[estacao].items():
            resultado = prever_serie_mensal(grupo, poluente, unidade)
            if resultado is not None:
                resultados.append(resultado)

    return {
        "modelo": "Random Forest",
        "alvo": "média mensal do poluente no mês seguinte",
        "baseline": "último ano: valor observado no mesmo mês do ano anterior",
        "metodo_validacao": (
            f"Validação temporal: últimos {TEST_MONTHS} meses disponíveis, "
            "treino apenas em meses anteriores e previsão de um mês à frente."
        ),
        "criterios": {
            "observacoes_minimas": MIN_OBSERVATIONS,
            "amostras_treino_minimas": MIN_TRAIN_SAMPLES,
            "amostras_teste_minimas": MIN_TEST_SAMPLES,
        },
        "resultados": resultados,
    }


def resumir_estacoes(
    dados: pd.DataFrame,
    unidades: dict[str, dict[str, str]],
) -> dict:
    anos = sorted(dados["ano"].unique().tolist())
    return {
        "ano": int(anos[-1]),
        "anos": [int(ano) for ano in anos],
        "observacao": (
            "Valores ausentes não são tratados como zero. A média exibida é a média "
            "aritmética das médias mensais disponíveis, sem ponderação pela quantidade "
            "de dias."
        ),
        "estacoes": {
            estacao: {"unidades": unidades[estacao]}
            for estacao in sorted(unidades)
        },
    }


def main() -> None:
    caminho = Path(__file__).with_name("cetesb_2026.xlsx")
    dados, unidades = carregar_dados_cetesb(caminho)
    resumo = resumir_estacoes(dados, unidades)
    previsoes = gerar_previsoes(dados, unidades)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "cetesb_mensal.json").write_text(
        dados.to_json(orient="records", force_ascii=False, indent=2),
        encoding="utf-8",
    )
    (OUT_DIR / "cetesb_resumo.json").write_text(
        json.dumps(resumo, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (OUT_DIR / "cetesb_previsoes.json").write_text(
        json.dumps(previsoes, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Estações analisadas: {dados['estacao'].nunique()}")
    print(f"Registros mensais: {len(dados)}")
    print(f"Período: {dados['ano'].min()}–{dados['ano'].max()}")
    print(f"Modelos avaliados: {len(previsoes['resultados'])}")
    print(f"Arquivos gerados em: {OUT_DIR}")


if __name__ == "__main__":
    main()
