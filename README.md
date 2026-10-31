# Qualidade do ar em Campinas

Dashboard para explorar medições mensais de poluentes atmosféricos nas estações da CETESB em Campinas, São Paulo. A interface permite comparar variáveis por estação e ano, consultar resumos anuais e visualizar uma previsão experimental para o próximo mês.

## Funcionalidades

- Seleção de estação e de poluente ou variável.
- Seleção de ano, com histórico mensal de 2016 a 2026.
- Gráfico de linha com a série mensal; meses sem medição aparecem como lacunas, sem interpolação.
- Indicadores de média das médias mensais, quantidade de meses com dados, maior e menor média mensal.
- Tabela com os valores mensais, estação e unidade de medida.
- Previsão mensal experimental por estação e poluente, com métricas de validação temporal e comparação com um baseline sazonal.
- Tratamento de dados ausentes: valores não informados não são considerados zero.

As variáveis disponíveis dependem dos dados de cada estação e podem incluir PM2.5, PM10, CO, NO, NO₂, NOx, O₃ e umidade relativa.

## Dados

A fonte usada pelo pipeline é a planilha `data-pipeline/cetesb_2026.xlsx`, incluída no projeto. Ela contém uma linha por mês nas abas das estações e dados de 2016 a 2026. A coluna `Ano` pode estar preenchida apenas na primeira linha de cada ano; o pipeline propaga esse valor para os meses seguintes. O script `data-pipeline/analysis.py` organiza os registros cronologicamente e gera:

- `web/public/data/cetesb_mensal.json`: valores mensais por estação.
- `web/public/data/cetesb_resumo.json`: anos disponíveis, estações e unidades das variáveis.
- `web/public/data/cetesb_previsoes.json`: previsões e resultados de validação dos modelos elegíveis.

Os dados são preparados localmente; o dashboard não busca medições em tempo real. A média exibida é a média aritmética das médias mensais disponíveis no ano selecionado, sem ponderação pela quantidade de dias.

## Aprendizagem de máquina

O pipeline treina um modelo `RandomForestRegressor` separado para cada combinação de estação e variável que tenha pelo menos 72 medições válidas. A tarefa é estimar a média mensal do poluente no mês seguinte. As entradas são o ano, a sazonalidade do mês e as medições disponíveis do mês anterior e do mesmo mês no ano anterior. Combinações sem dados consecutivos suficientes não recebem previsão.

O desempenho é avaliado cronologicamente: os últimos 24 meses disponíveis ficam fora do treino, e apenas meses anteriores são usados para treinar. O MAE e o RMSE do modelo são comparados ao baseline sazonal, que repete o valor observado no mesmo mês do ano anterior. O dashboard informa se o modelo superou esse baseline; a previsão é experimental e não substitui medições nem alertas oficiais.

## Requisitos

- Node.js 20.19 ou superior (ou 22.12 ou superior) e npm.
- Python 3.10 ou superior.

## Executar no Windows

No PowerShell, na pasta raiz do projeto:

```powershell
npm --prefix web ci
py -3 -m venv data-pipeline\.venv
.\data-pipeline\.venv\Scripts\python.exe -m pip install -r data-pipeline\requirements.txt
npm --prefix web run dev
```

O comando `dev` executa a análise dos dados automaticamente antes de iniciar o servidor. Abra no navegador o endereço exibido pelo Vite, normalmente `http://localhost:5173`. Para encerrar, pressione **Ctrl+C** no terminal.

Se o comando `py -3` não estiver disponível, crie o ambiente com `python -m venv data-pipeline\.venv`, desde que o Python esteja no `PATH`.

## Executar no macOS ou Linux

Na pasta raiz do projeto:

```bash
npm --prefix web ci
python3 -m venv data-pipeline/.venv
data-pipeline/.venv/bin/python -m pip install -r data-pipeline/requirements.txt
npm --prefix web run dev
```

Abra o endereço mostrado pelo Vite no navegador. O comando de desenvolvimento também prepara os arquivos JSON antes de iniciar a interface.

## Comandos úteis

Execute os comandos npm dentro de `web` ou use `npm --prefix web` a partir da raiz:

| Comando | Descrição |
| --- | --- |
| `npm run analyze` | Gera novamente os arquivos JSON a partir da planilha. |
| `npm run dev` | Prepara os dados e inicia o servidor de desenvolvimento. |
| `npm run build` | Verifica os tipos TypeScript e cria a versão de produção em `web/dist`. |
| `npm run preview` | Pré-visualiza localmente a versão de produção já compilada. |
| `npm run lint` | Executa o Oxlint no projeto web. |

Para executar a análise novamente sem iniciar o servidor, entre em `web` e rode `npm run analyze`. Para pré-visualizar a versão de produção, rode `npm run build` e depois `npm run preview`.
