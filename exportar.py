"""Gera painel/dados.js a partir de dados/pais.csv e dados/uf.csv (saída de baixar_dados.py).

Uso: python exportar.py
Só regrava o arquivo se os dados mudaram; nesse caso registra a data da atualização.
"""
import json, os, datetime
from pathlib import Path
import pandas as pd

GRUPO = {'2601': 'Minério de ferro', '7201': 'Ferro-gusa', '7202': 'Ferroligas', '7207': 'Semiacabados'}
GRUPO.update({s: 'Aço plano' for s in ['7208', '7209', '7210', '7211', '7212', '7219', '7220', '7225', '7226']})
GRUPO.update({s: 'Aço longo' for s in ['7213', '7214', '7215', '7216', '7217', '7221', '7222', '7227', '7228']})
GRUPO.update({s: 'Tubos de aço' for s in ['7304', '7305', '7306']})
GRUPO.update({'7601': 'Alumínio bruto'})
GRUPO.update({s: 'Alumínio laminado e extrudado' for s in ['7604', '7605', '7606', '7607']})
PRODUTOS = ['Minério de ferro', 'Ferro-gusa', 'Ferroligas', 'Semiacabados', 'Aço plano', 'Aço longo', 'Tubos de aço',
            'Alumínio bruto', 'Alumínio laminado e extrudado']
FLX = {'export': 0, 'import': 1}
SAIDA = 'painel/dados.js'


def montar(pais, uf):
    for d in (pais, uf):
        d['produto'] = d.sh4.map(GRUPO)
    ano0 = int(pais.ano.min())
    gp = pais.groupby(['fluxo', 'produto', 'pais', 'ano', 'mes'])[['kg', 'fob_usd']].sum().reset_index()
    gp = gp[(gp.kg > 0) | (gp.fob_usd > 0)]
    paises = sorted(gp.pais.unique())
    m = [[FLX[x.fluxo], PRODUTOS.index(x.produto), paises.index(x.pais), (x.ano - ano0) * 12 + x.mes - 1,
          x.kg / 1000, x.fob_usd / 1000] for x in gp.itertuples()]
    gu = uf.groupby(['fluxo', 'produto', 'uf', 'ano', 'mes'])[['kg', 'fob_usd']].sum().reset_index()
    gu = gu[gu.kg > 0]
    ufs = sorted(gu.uf.unique())
    u = [[FLX[x.fluxo], PRODUTOS.index(x.produto), ufs.index(x.uf), (x.ano - ano0) * 12 + x.mes - 1,
          x.kg / 1000, x.fob_usd / 1000] for x in gu.itertuples()]
    ua = int(pais.ano.max())
    return {'fonte': 'Comex Stat (MDIC)', 'ano0': ano0, 'ultimo': {'ano': ua, 'mes': int(pais[pais.ano == ua].mes.max())},
            'produtos': PRODUTOS, 'paises': paises, 'ufs': ufs, 'campos': ['fluxo', 'produto', 'local', 'mes', 't', 'mil_usd'],
            'pais': m, 'uf': u}


def exportar(pasta='.'):
    pais = pd.read_csv(os.path.join(pasta, 'dados/pais.csv'), dtype={'sh4': str})
    uf = pd.read_csv(os.path.join(pasta, 'dados/uf.csv'), dtype={'sh4': str})
    novo = montar(pais, uf)
    caminho = os.path.join(pasta, SAIDA)
    if os.path.exists(caminho):
        antigo = json.loads(Path(caminho).read_text(encoding='utf-8').removeprefix('window.DADOS = ').rstrip().rstrip(';'))
        if {k: v for k, v in antigo.items() if k != 'gerado'} == novo:
            print('dados.js sem mudança · até', f"{novo['ultimo']['mes']:02d}/{novo['ultimo']['ano']}")
            return False
    novo['gerado'] = datetime.date.today().isoformat()
    s = 'window.DADOS = ' + json.dumps(novo, ensure_ascii=False, separators=(',', ':')) + ';'
    Path(caminho).write_text(s, encoding='utf-8')
    print(f"dados.js gravado · até {novo['ultimo']['mes']:02d}/{novo['ultimo']['ano']} · {len(novo['pais'])} linhas por país · "
          f"{len(novo['uf'])} por estado · {round(len(s.encode()) / 1024)} KB")
    return True


if __name__ == '__main__':
    exportar()
