"""Gera capa.png (1080x1350) a partir de dados/pais.csv. Uso: python capa.py"""
import pandas as pd, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm

d = pd.read_csv('dados/pais.csv', dtype={'sh4': str})
PL = ['7208', '7209', '7210', '7211', '7212', '7219', '7220', '7225', '7226']
p = d[d.sh4.isin(PL)]
m = p.groupby(['fluxo', 'ano', 'mes']).kg.sum().unstack('fluxo').fillna(0) / 1e9  # milhões de t
r = m.rolling(12).sum().dropna()
x = [a + (b - 1) / 12 for a, b in r.index]
anual = p.groupby(['fluxo', 'ano']).kg.sum().unstack('fluxo') / 1e9
s19, s25 = anual.loc[2019, 'export'] - anual.loc[2019, 'import'], anual.loc[2025, 'export'] - anual.loc[2025, 'import']
print(f'saldo 2019 {s19:+.2f} · 2025 {s25:+.2f} · import 2025 {anual.loc[2025, "import"]:.2f}')

for f in ['C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/segoeuib.ttf']:
    try: fm.fontManager.addfont(f)
    except Exception: pass
plt.rcParams['font.family'] = ['Segoe UI', 'DejaVu Sans']
NAV, AMA, AZUL, LAR, BG = '#1b2a47', '#f2c80f', '#118dff', '#e66c37', '#f3f2f1'
br = lambda v, k=1: f'{v:.{k}f}'.replace('.', ',')
fig = plt.figure(figsize=(10.8, 13.5), dpi=100, facecolor=BG)
top = fig.add_axes([0, .73, 1, .27]); top.axis('off'); top.set_xlim(0, 1); top.set_ylim(0, 1)
top.add_patch(plt.Rectangle((0, 0), 1, 1, color=NAV))
top.text(.06, .84, 'AÇO PLANO  ·  COMÉRCIO EXTERIOR DO BRASIL  ·  COMEX STAT', color='#c9d3e6', fontsize=13, weight='bold')
top.text(.06, .52, f'−{br(abs(s25))} Mt', color=AMA, fontsize=80, weight='bold')
top.text(.06, .30, f'de saldo em 2025: o Brasil importou {br(anual.loc[2025, "import"])} Mt', color='white', fontsize=22)
top.text(.06, .15, f'e exportou {br(anual.loc[2025, "export"])} Mt. Em 2019, o saldo era de +{br(s19)} Mt.', color='#c9d3e6', fontsize=18)
ax = fig.add_axes([.11, .10, .83, .55]); ax.set_facecolor('white')
ax.plot(x, r['export'], color=AZUL, lw=3.2); ax.plot(x, r['import'], color=LAR, lw=3.2)
ax.fill_between(x, r['export'], r['import'], where=r['import'] > r['export'], color=LAR, alpha=.12, interpolate=True)
ax.text(2016.6, 4.05, 'exportação', color=AZUL, fontsize=17, weight='bold')
ax.text(2022.6, 3.6, 'importação', color=LAR, fontsize=17, weight='bold')
ax.set_ylim(0, max(r.max()) * 1.15); ax.set_xlim(x[0], x[-1] + .1)
ax.set_yticks(range(1, 6)); ax.set_yticklabels([f'{i} Mt' for i in range(1, 6)], fontsize=13, color='#605e5c')
ax.set_xticks(range(2016, 2027, 2)); ax.tick_params(axis='x', labelsize=13, colors='#605e5c'); ax.tick_params(length=0)
for s in ax.spines.values(): s.set_visible(False)
ax.grid(axis='y', color='#edebe9'); ax.set_axisbelow(True)
fig.text(.06, .685, 'Toneladas de aço plano, soma dos últimos 12 meses, dez/2015 a out/2026', fontsize=14, color='#605e5c')
fig.text(.06, .03, 'Fonte: Comex Stat (MDIC). Aço plano = SH4 7208–7212, 7219, 7220, 7225, 7226. Ramon Goveia · projeto S2', fontsize=11.5, color='#8a8886')
fig.savefig('capa.png', facecolor=BG)
