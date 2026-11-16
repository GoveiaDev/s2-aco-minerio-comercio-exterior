(() => {
  const D = window.DADOS, $ = id => document.getElementById(id);
  const A0 = D.ano0, UA = D.ultimo.ano, UM = D.ultimo.mes, NM = (UA - A0) * 12 + UM; // meses com dado
  const P = D.produtos, nP = P.length, CHINA = D.paises.indexOf('China');
  const st = { prod: P.indexOf('Aço plano'), flx: 1, ano: UA - 1, pais: -1 };

  // índices: por fluxo/produto → linhas
  const idx = (rows) => { const o = {}; for (const r of rows) (o[r[0] + '|' + r[1]] ||= []).push(r); return o; };
  const IP = idx(D.pais), IU = idx(D.uf);
  const linhas = (I, f, p) => I[f + '|' + p] || [];

  // ---------- formato ----------
  const nf = (v, d = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const ton = t => { const a = Math.abs(t); return a >= 1e6 ? nf(t / 1e6, a >= 1e8 ? 0 : 1) + ' Mt' : a >= 1e3 ? nf(t / 1e3, a >= 1e5 ? 0 : 1) + ' mil t' : nf(t) + ' t'; };
  const usd = m => { const a = Math.abs(m); return a >= 1e6 ? 'US$ ' + nf(m / 1e6, 1) + ' bi' : a >= 1e3 ? 'US$ ' + nf(m / 1e3, a >= 1e5 ? 0 : 1) + ' mi' : 'US$ ' + nf(m) + ' mil'; }; // m em mil US$
  const mt = t => (t >= 0 ? '+' : '−') + nf(Math.abs(t) / 1e6, 1) + ' Mt';
  const pct = v => (v >= 0 ? '+' : '−') + nf(Math.abs(v) * 100, 0) + '%';
  const pp = v => nf(v * 100, 0) + '%';
  const preco = (mil, t) => t > 0 ? mil * 1000 / t : null;

  // período do ano escolhido: ano cheio, ou jan..UM se for o último ano
  const meses = a => a === UA ? UM : 12;
  const janela = (a, m = meses(st.ano)) => [(a - A0) * 12, (a - A0) * 12 + m - 1];
  const rotPer = a => a === UA ? `jan–${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][UM - 1]} ${a}` : String(a);

  function soma(I, f, p, [m0, m1], local = -1) {
    let t = 0, v = 0;
    for (const r of linhas(I, f, p)) if (r[3] >= m0 && r[3] <= m1 && (local < 0 || r[2] === local)) { t += r[4]; v += r[5]; }
    return { t, v };
  }
  function porLocal(I, f, p, [m0, m1]) {
    const o = new Map();
    for (const r of linhas(I, f, p)) if (r[3] >= m0 && r[3] <= m1) { const x = o.get(r[2]) || { t: 0, v: 0 }; x.t += r[4]; x.v += r[5]; o.set(r[2], x); }
    return o;
  }
  function mensal(f, p, local = -1) {
    const t = new Float64Array(NM), v = new Float64Array(NM);
    for (const r of linhas(IP, f, p)) if (r[3] < NM && (local < 0 || r[2] === local)) { t[r[3]] += r[4]; v[r[3]] += r[5]; }
    return { t, v };
  }

  // ---------- filtros ----------
  const fP = $('fProd'), fA = $('fAno');
  P.forEach((p, i) => fP.add(new Option(p, i)));
  for (let a = UA; a >= A0; a--) fA.add(new Option(a === UA ? `${a} (jan–${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][UM - 1]})` : a, a));
  fP.onchange = () => { st.prod = +fP.value; st.pais = -1; render(); };
  fA.onchange = () => { st.ano = +fA.value; render(); };
  document.querySelectorAll('#fFlx button').forEach(b => b.onclick = () => { st.flx = +b.dataset.f; st.pais = -1; render(); });

  // ---------- tooltip ----------
  const dica = $('dica');
  const mostra = (e, h) => { dica.innerHTML = h; dica.style.opacity = 1; const w = dica.offsetWidth, hh = dica.offsetHeight; let x = e.clientX + 14, y = e.clientY + 14; if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + hh > innerHeight - 8) y = e.clientY - hh - 14; dica.style.left = Math.max(8, x) + 'px'; dica.style.top = Math.max(8, y) + 'px'; };
  const esconde = () => dica.style.opacity = 0;

  function spark(id, vals, cor, destaque) {
    const ok = vals.map((v, i) => [i, v]).filter(x => x[1] != null && isFinite(x[1]));
    if (ok.length < 2) { $(id).innerHTML = ''; return; }
    const mn = Math.min(...ok.map(x => x[1])), mx = Math.max(...ok.map(x => x[1])), X = i => i / (vals.length - 1) * 116 + 2, Y = v => 23 - (v - mn) / (mx - mn || 1) * 20;
    $(id).innerHTML = `<path d="M${ok.map(([i, v]) => X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join('L')}" fill="none" stroke="${cor}" stroke-width="1.6"/>`
      + (destaque != null && vals[destaque] != null ? `<circle cx="${X(destaque)}" cy="${Y(vals[destaque])}" r="2.6" fill="${cor}"/>` : '');
  }

  const nomeFlx = f => f ? 'importação' : 'exportação';
  const parceiro = f => f ? 'origem' : 'destino';

  // ---------- render ----------
  function render() {
    fP.value = st.prod; fA.value = st.ano;
    document.querySelectorAll('#fFlx button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.f === st.flx));
    const { prod: p, flx: f, ano: a, pais: c } = st, prod = P[p], nm = meses(a);
    const J = janela(a), Jant = janela(a - 1, nm), temAnt = a > A0;
    const atual = soma(IP, f, p, J, c), ant = temAnt ? soma(IP, f, p, Jant, c) : null;
    const anos = []; for (let y = A0; y <= UA; y++) anos.push(y);
    const anoIdx = a - A0;
    const nomeC = c >= 0 ? D.paises[c] : null;

    // faixa
    const pl = P.indexOf('Aço plano');
    const sal = y => { const j = janela(y, 12); return soma(IP, 0, pl, j).t - soma(IP, 1, pl, j).t; };
    $('faixaMeta').innerHTML = `Aço plano: saldo de <b>${mt(sal(2019))}</b> em 2019 para <b>${mt(sal(UA - 1))}</b> em ${UA - 1} · exportado menos importado · fonte: Comex Stat (MDIC)`;
    $('escopo').innerHTML = `<b>${prod}</b> · ${nomeFlx(f)} · ${rotPer(a)}${nomeC ? ' · ' + nomeC : ''}${a === UA ? ' · comparado com jan–' + ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][UM - 1] + ' ' + (a - 1) : ''}`;

    // KPIs
    const varTxt = (x, y) => y > 0 ? `${pct(x / y - 1)} vs ${a === UA ? 'mesmo período de ' : ''}${a - 1}` : 'sem ano anterior';
    const serieAno = fn => anos.map(y => y === UA ? null : fn(janela(y, 12)));
    $('kVolRot').textContent = `Volume ${nomeFlx(f) === 'exportação' ? 'exportado' : 'importado'}`;
    $('kVol').textContent = ton(atual.t); $('kVolTxt').textContent = ant ? varTxt(atual.t, ant.t) : '—';
    spark('sVol', serieAno(j => soma(IP, f, p, j, c).t), '#12239e', anoIdx);
    $('kFob').textContent = usd(atual.v); $('kFobTxt').textContent = ant ? varTxt(atual.v, ant.v) : '—';
    spark('sFob', serieAno(j => soma(IP, f, p, j, c).v), '#118dff', anoIdx);
    const pr = preco(atual.v, atual.t), prA = ant && preco(ant.v, ant.t);
    $('kPre').textContent = pr ? 'US$ ' + nf(pr) + '/t' : '—';
    $('kPreTxt').textContent = pr && prA ? `${pct(pr / prA - 1)} vs ${a - 1} · US$ ${nf(prA)}/t` : '—';
    spark('sPre', serieAno(j => { const s = soma(IP, f, p, j, c); return preco(s.v, s.t); }), '#e66c37', anoIdx);

    const loc = porLocal(IP, f, p, J), totT = [...loc.values()].reduce((s, x) => s + x.t, 0);
    const ord = [...loc.entries()].filter(([, x]) => x.t > 0).sort((x, y) => y[1].t - x[1].t);
    if (c >= 0) {
      const x = loc.get(c) || { t: 0 }, pos = ord.findIndex(([k]) => k === c) + 1;
      $('kTopRot').textContent = `Participação · ${nomeC}`;
      $('kTop').textContent = totT ? pp(x.t / totT) : '—';
      $('kTopTxt').textContent = pos ? `${pos}º ${parceiro(f)} em volume · de ${ord.length} países` : `sem ${nomeFlx(f)} no período`;
      spark('sTop', serieAno(j => { const tt = soma(IP, f, p, j).t; return tt ? soma(IP, f, p, j, c).t / tt : null; }), '#744ec2', anoIdx);
    } else if (ord.length) {
      const [k, x] = ord[0];
      $('kTopRot').textContent = f ? 'Maior origem' : 'Maior destino';
      $('kTop').textContent = D.paises[k];
      $('kTopTxt').textContent = `${pp(x.t / totT)} do volume · ${ton(x.t)}`;
      spark('sTop', serieAno(j => { const tt = soma(IP, f, p, j).t; return tt ? soma(IP, f, p, j, k).t / tt : null; }), '#744ec2', anoIdx);
    } else { $('kTop').textContent = '—'; $('kTopTxt').textContent = 'sem fluxo no período'; $('sTop').innerHTML = ''; }

    const ch = loc.get(CHINA), chA = temAnt ? soma(IP, f, p, Jant, CHINA).t : 0, totA = ant ? soma(IP, f, p, Jant).t : 0;
    $('kChi').textContent = totT ? pp((ch ? ch.t : 0) / totT) : '—';
    $('kChiTxt').textContent = totT && totA ? `do volume de ${nomeFlx(f)} · era ${pp(chA / totA)} em ${a - 1}` : `do volume de ${nomeFlx(f)}`;
    spark('sChi', serieAno(j => { const tt = soma(IP, f, p, j).t; return tt ? soma(IP, f, p, j, CHINA).t / tt : null; }), '#197278', anoIdx);

    const ex = soma(IP, 0, p, J, c).t, im = soma(IP, 1, p, J, c).t, s0 = ex - im;
    const exA = temAnt ? soma(IP, 0, p, Jant, c).t : null, imA = temAnt ? soma(IP, 1, p, Jant, c).t : null;
    $('kSal').textContent = (s0 >= 0 ? '+' : '') + ton(s0).replace('-', '−');
    $('kSalTxt').textContent = `${prod.toLowerCase()} · exportou ${ton(ex)}, importou ${ton(im)}` + (exA != null ? ` · ${a - 1}: ${(exA - imA >= 0 ? '+' : '')}${ton(exA - imA).replace('-', '−')}` : '') + (nomeC ? ` · com ${nomeC}` : '');
    spark('sSal', serieAno(j => soma(IP, 0, p, j, c).t - soma(IP, 1, p, j, c).t), '#f2c80f', anoIdx);

    // leitura
    let txt = `Em ${rotPer(a)}, o Brasil ${f ? 'importou' : 'exportou'} <b>${ton(atual.t)}</b> de ${prod.toLowerCase()}${nomeC ? (f ? ' (origem: ' : ' (destino: ') + nomeC + ')' : ''}`;
    if (ant && ant.t > 0) txt += `, <b>${pct(atual.t / ant.t - 1)}</b> contra ${a === UA ? 'o mesmo período de ' : ''}${a - 1}`;
    if (pr) txt += `, a <b>US$ ${nf(pr)} por tonelada</b> FOB`;
    txt += '.';
    if (!nomeC && ord.length) txt += ` ${f ? 'A maior origem' : 'O maior destino'} foi ${D.paises[ord[0][0]]}, com ${pp(ord[0][1].t / totT)} do volume.`;
    txt += ` Saldo do produto no período: <b>${(s0 >= 0 ? '+' : '')}${ton(s0).replace('-', '−')}</b>.`;
    $('leitura').innerHTML = txt;

    renderSeries(); renderPauta(J, Jant, temAnt); renderPaises(loc, totT, Jant, temAnt); renderUfs(J);
  }

  // ---------- séries ----------
  function rolar(arr, k = 12) { const o = new Array(arr.length).fill(null); let s = 0; for (let i = 0; i < arr.length; i++) { s += arr[i]; if (i >= k) s -= arr[i - k]; if (i >= k - 1) o[i] = s; } return o; }
  function grafico(id, series, { fmt, titulo }) {
    const el = $(id), box = el.parentNode.getBoundingClientRect();
    const W = Math.max(280, Math.round(box.width)), H = Math.max(150, Math.round(box.height)), m = { l: 54, r: 10, t: 8, b: 20 };
    const vals = series.flatMap(s => s.v).filter(v => v != null && isFinite(v));
    let mx = Math.max(...vals, 0), mn = Math.min(...vals, 0);
    const passo = (() => { const r = (mx - mn) / 4, e = Math.pow(10, Math.floor(Math.log10(r || 1))), n = r / e; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * e; })();
    mx = Math.ceil(mx / passo) * passo; mn = Math.floor(mn / passo) * passo;
    const X = i => m.l + (W - m.l - m.r) * i / (NM - 1), Y = v => m.t + (H - m.t - m.b) * (1 - (v - mn) / (mx - mn || 1));
    let g = '';
    const a0 = (st.ano - A0) * 12, a1 = a0 + meses(st.ano) - 1;
    g += `<rect x="${X(a0)}" y="${m.t}" width="${Math.max(2, X(a1) - X(a0))}" height="${H - m.t - m.b}" fill="#deecf9"/>`;
    for (let v = mn; v <= mx + passo / 2; v += passo) g += `<line class="rule" x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axis" x="${m.l - 6}" y="${Y(v) + 3}" text-anchor="end">${fmt(v)}</text>`;
    const pulo = W > 560 ? 1 : 2; for (let y = A0; y <= UA; y++) if ((y - A0) % pulo === (pulo - 1)) g += `<text class="axis" x="${X((y - A0) * 12 + 6)}" y="${H - 6}" text-anchor="middle">${y}</text>`;
    for (const s of series) {
      let d = '', pen = false;
      s.v.forEach((v, i) => { if (v == null || !isFinite(v)) { pen = false; return; } d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1); pen = true; });
      g += `<path d="${d}" fill="none" stroke="${s.cor}" stroke-width="2.2"/>`;
    }
    g += `<rect id="${id}Hit" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent"/><line id="${id}Cur" y1="${m.t}" y2="${H - m.b}" stroke="#605e5c" stroke-dasharray="2 3" opacity="0"/>`;
    el.setAttribute('viewBox', `0 0 ${W} ${H}`); el.innerHTML = g;
    const hit = $(id + 'Hit'), cur = $(id + 'Cur');
    hit.onmousemove = e => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, i = Math.max(0, Math.min(NM - 1, Math.round((x - m.l) / (W - m.l - m.r) * (NM - 1))));
      cur.setAttribute('x1', X(i)); cur.setAttribute('x2', X(i)); cur.setAttribute('opacity', 1);
      const ano = A0 + Math.floor(i / 12), mes = i % 12 + 1;
      mostra(e, `<b>${String(mes).padStart(2, '0')}/${ano}</b> · ${titulo}<br>` + series.map(s => `<span style="color:${s.cor}">●</span> ${s.nome}: ${s.v[i] == null ? '—' : fmt(s.v[i], true)}`).join('<br>'));
    };
    hit.onmouseleave = () => { cur.setAttribute('opacity', 0); esconde(); };
  }
  function renderSeries() {
    const { prod: p, pais: c } = st, nomeC = c >= 0 ? ' · ' + D.paises[c] : '';
    const e = mensal(0, p, c), i = mensal(1, p, c);
    $('tSerie').textContent = `${P[p]}: exportação × importação${nomeC}`;
    $('serieSub').textContent = `Toneladas, soma dos últimos 12 meses, de ${A0} a ${String(UM).padStart(2, '0')}/${UA}. Tira a sazonalidade e mostra a tendência.`;
    grafico('svgSerie', [{ nome: 'exportação', cor: '#118dff', v: rolar(Array.from(e.t)) }, { nome: 'importação', cor: '#e66c37', v: rolar(Array.from(i.t)) }],
      { fmt: (v, longo) => longo ? ton(v) : (v === 0 ? '0' : v >= 1e6 ? nf(v / 1e6, v >= 1e7 ? 0 : 1) + ' Mt' : nf(v / 1e3) + ' mil'), titulo: '12 meses' });
    const pr = s => { const t = rolar(Array.from(s.t)), v = rolar(Array.from(s.v)); return t.map((x, k) => x > 0 ? v[k] * 1000 / x : null); };
    $('precoSub').textContent = `US$ FOB por tonelada, média dos últimos 12 meses${nomeC}. O importado não inclui frete, seguro e imposto.`;
    grafico('svgPreco', [{ nome: 'exportação', cor: '#118dff', v: pr(e) }, { nome: 'importação', cor: '#e66c37', v: pr(i) }],
      { fmt: (v, longo) => (longo ? 'US$ ' : '') + nf(v) + (longo ? '/t' : ''), titulo: 'preço médio 12 meses' });
  }

  // ---------- pauta, países, estados ----------
  function renderPauta(J, Jant, temAnt) {
    const f = st.flx;
    $('tPauta').textContent = `A pauta de ${nomeFlx(f)} em US$`;
    $('pautaSub').textContent = `${rotPer(st.ano)} · valor FOB e variação contra ${st.ano - 1}`;
    const l = P.map((nome, k) => { const s = soma(IP, f, k, J), sa = temAnt ? soma(IP, f, k, Jant) : null; return { k, nome, v: s.v, va: sa && sa.v }; }).sort((x, y) => y.v - x.v);
    const mx = l[0].v || 1;
    $('pauta').innerHTML = l.map(x => `<button type="button" class="linha${x.k === st.prod ? ' sel' : ''}" data-k="${x.k}"><span class="n">${x.nome}</span><span class="trilho"><i style="width:${(x.v / mx * 62).toFixed(1)}%;background:${x.k === st.prod ? '#12239e' : '#118dff'}"></i><b>${usd(x.v)}</b>${x.va > 0 ? `<em class="${x.v >= x.va ? 'sobe' : 'desce'}">${pct(x.v / x.va - 1)}</em>` : ''}</span></button>`).join('');
    $('pauta').querySelectorAll('.linha').forEach(b => b.onclick = () => { st.prod = +b.dataset.k; st.pais = -1; render(); });
  }
  function renderPaises(loc, totT, Jant, temAnt) {
    const f = st.flx, p = st.prod;
    $('tPaises').textContent = f ? 'De onde vem' : 'Para onde vai';
    $('paisesSub').textContent = `${P[p]} · ${rotPer(st.ano)} · ${[...loc.values()].filter(x => x.t > 0).length} países`;
    $('chipPais').innerHTML = st.pais >= 0 ? `<span class="chip">${D.paises[st.pais]}<button type="button" aria-label="Limpar país" id="limpaPais">×</button></span>` : '';
    if (st.pais >= 0) $('limpaPais').onclick = () => { st.pais = -1; render(); };
    const antL = temAnt ? porLocal(IP, f, p, Jant) : new Map();
    const ord = [...loc.entries()].filter(([, x]) => x.t > 0).sort((x, y) => y[1].t - x[1].t), top = ord.slice(0, 20), mx = top.length ? top[0][1].t : 1;
    $('tPaisCorpo').innerHTML = top.map(([k, x]) => {
      const a = antL.get(k), v = a && a.t > 0 ? x.t / a.t - 1 : null;
      return `<tr data-k="${k}" class="${k === st.pais ? 'sel' : ''}"><td>${D.paises[k]}</td><td class="barra-cel"><i style="width:${(x.t / mx * 80).toFixed(1)}px"></i><span>${ton(x.t)}</span></td><td class="${v == null ? '' : v >= 0 ? 'sobe' : 'desce'}">${v == null ? 'novo' : pct(v)}</td><td>${pp(x.t / totT)}</td><td>${nf(preco(x.v, x.t))}</td></tr>`;
    }).join('') || `<tr><td colspan="5">Sem ${nomeFlx(f)} no período.</td></tr>`;
    const totV = [...loc.values()].reduce((s, x) => s + x.v, 0);
    $('tPaisTotal').innerHTML = totT ? `<tr><td>Total · ${ord.length} países</td><td>${ton(totT)}</td><td></td><td>100%</td><td>${nf(preco(totV, totT))}</td></tr>` : '';
    $('tPaisCorpo').querySelectorAll('tr[data-k]').forEach(tr => tr.onclick = () => { const k = +tr.dataset.k; st.pais = st.pais === k ? -1 : k; render(); });
  }
  function aparar(el) { // tela única: mostra só as linhas que cabem
    while (el.children.length > 3 && el.scrollHeight > el.clientHeight + 1) el.lastElementChild.remove();
  }
  function renderUfs(J) {
    const f = st.flx, loc = porLocal(IU, f, st.prod, J);
    $('ufSub').textContent = `${f ? 'UF do importador' : 'UF produtora'} · maiores em volume, ${rotPer(st.ano)}`;
    const tot = [...loc.values()].reduce((s, x) => s + x.t, 0);
    const ord = [...loc.entries()].filter(([, x]) => x.t > 0).sort((x, y) => y[1].t - x[1].t).slice(0, 10), mx = ord.length ? ord[0][1].t : 1;
    const sig = n => ({ 'Minas Gerais': 'MG', 'São Paulo': 'SP', 'Rio de Janeiro': 'RJ', 'Espírito Santo': 'ES', 'Paraná': 'PR', 'Santa Catarina': 'SC', 'Rio Grande do Sul': 'RS', 'Bahia': 'BA', 'Pará': 'PA', 'Maranhão': 'MA', 'Ceará': 'CE', 'Pernambuco': 'PE', 'Goiás': 'GO', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS', 'Amazonas': 'AM', 'Distrito Federal': 'DF', 'Paraíba': 'PB', 'Rio Grande do Norte': 'RN', 'Alagoas': 'AL', 'Sergipe': 'SE', 'Piauí': 'PI', 'Tocantins': 'TO', 'Rondônia': 'RO', 'Acre': 'AC', 'Amapá': 'AP', 'Roraima': 'RR' }[n] || n.slice(0, 6));
    $('ufs').innerHTML = ord.length ? ord.map(([k, x]) => `<div class="linha" title="${D.ufs[k]}"><span class="n">${sig(D.ufs[k])}</span><span class="trilho"><i style="width:${(x.t / mx * 55).toFixed(1)}%;background:#744ec2"></i><b>${pp(x.t / tot)}</b><em>${ton(x.t)}</em></span></div>`).join('') : '<div class="panel-foot">Sem dado no período.</div>';
    aparar($('ufs'));
  }

  $('btnSobre').onclick = () => $('sobre').showModal();
  let tRes; addEventListener('resize', () => { clearTimeout(tRes); tRes = setTimeout(render, 120); });
  render();
  window.PAINEL = { st, render };
})();
