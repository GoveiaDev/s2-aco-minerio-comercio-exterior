"""Baixa do Comex Stat (MDIC) a exportação e a importação mensal de aço, minério e alumínio.

Uso: python baixar_dados.py dados/
Gera dados/pais.csv (posição SH4 × país × mês) e dados/uf.csv (posição SH4 × UF × mês).
"""
import csv, json, sys, time, urllib.request
from pathlib import Path

API = "https://api-comexstat.mdic.gov.br/general?language=pt"
SH4 = ["2601", "7201", "7202", "7207", "7208", "7209", "7210", "7211", "7212", "7219", "7220", "7225", "7226",
       "7213", "7214", "7215", "7216", "7217", "7221", "7222", "7227", "7228", "7304", "7305", "7306",
       "7601", "7604", "7605", "7606", "7607"]


def ultimo_mes():
    """Último mês publicado pelo Comex Stat (a API informa a data da última carga)."""
    d = json.load(urllib.request.urlopen("https://api-comexstat.mdic.gov.br/general/dates/updated", timeout=60))["data"]
    return int(d["year"]), int(d["monthNumber"])


def consulta(fluxo, ano, detalhe, fim):
    corpo = {"flow": fluxo, "monthDetail": True, "period": {"from": f"{ano}-01", "to": fim},
             "filters": [{"filter": "heading", "values": SH4}],
             "details": ["heading", detalhe], "metrics": ["metricFOB", "metricKG"]}
    req = urllib.request.Request(API, data=json.dumps(corpo).encode(), headers={"Content-Type": "application/json"})
    for tentativa in range(5):
        try:
            return json.load(urllib.request.urlopen(req, timeout=180))["data"]["list"]
        except Exception as e:
            print("  erro", fluxo, ano, detalhe, e)
            time.sleep(10 * (tentativa + 1))
    raise RuntimeError(f"falhou: {fluxo} {ano} {detalhe}")


def main(pasta):
    pasta = Path(pasta)
    pasta.mkdir(parents=True, exist_ok=True)
    ano_fim, mes_fim = ultimo_mes()
    print(f"Comex Stat com dados até {ano_fim}-{mes_fim:02d}")
    for detalhe, nome in [("country", "pais"), ("state", "uf")]:
        linhas = []
        for fluxo in ["export", "import"]:
            for ano in range(2015, ano_fim + 1):
                fim = f"{ano}-{mes_fim:02d}" if ano == ano_fim else f"{ano}-12"
                r = consulta(fluxo, ano, detalhe, fim)
                for x in r:
                    linhas.append([fluxo, x["year"], x["monthNumber"], x["headingCode"], x["heading"],
                                   x.get("country") or x.get("state"), x["metricFOB"], x["metricKG"]])
                print(nome, fluxo, ano, len(r))
                time.sleep(1)
        with (pasta / f"{nome}.csv").open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["fluxo", "ano", "mes", "sh4", "produto", nome, "fob_usd", "kg"])
            w.writerows(linhas)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "dados")
