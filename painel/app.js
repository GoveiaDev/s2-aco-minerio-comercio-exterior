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

  // ---------- filtros em lista suspensa (o select fica escondido e guarda o valor) ----------
  const dds = [];
  function listaSuspensa(sel) {
    const caixa = sel.closest('.dd'), btn = document.createElement('button'), lista = document.createElement('div');
    btn.type = 'button'; btn.className = 'dd-btn'; btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', caixa.querySelector('label').textContent);
    lista.className = 'dd-lista'; lista.setAttribute('role', 'listbox');
    caixa.appendChild(btn); caixa.appendChild(lista);
    let foco = -1;
    const ops = () => [...lista.children];
    const fechar = () => { caixa.classList.remove('aberto'); btn.setAttribute('aria-expanded', 'false'); };
    const escolher = v => { fechar(); if (sel.value !== v) { sel.value = v; sel.dispatchEvent(new Event('change')); } btn.focus(); };
    const marcar = k => { foco = k; ops().forEach((o, i) => o.classList.toggle('foco', i === k)); if (ops()[k]) ops()[k].scrollIntoView({ block: 'nearest' }); };
    const abrir = () => {
      dds.forEach(d => d !== api && d.fechar());
      lista.innerHTML = [...sel.options].map(o => `<div class="dd-op" role="option" data-v="${o.value}" aria-selected="${o.value === sel.value}">${o.text}</div>`).join('');
      ops().forEach(o => o.onclick = () => escolher(o.dataset.v));
      caixa.classList.add('aberto'); btn.setAttribute('aria-expanded', 'true'); marcar(sel.selectedIndex);
    };
    btn.onclick = () => caixa.classList.contains('aberto') ? fechar() : abrir();
    btn.onkeydown = e => {
      const aberto = caixa.classList.contains('aberto');
      if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); if (!aberto) abrir(); else marcar(Math.max(0, Math.min(ops().length - 1, foco + (e.key === 'ArrowDown' ? 1 : -1)))); }
      else if ((e.key === 'Enter' || e.key === ' ') && aberto) { e.preventDefault(); if (ops()[foco]) escolher(ops()[foco].dataset.v); }
      else if (e.key === 'Escape') fechar();
    };
    const api = { fechar, sync: () => { btn.innerHTML = `<span>${sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : ''}</span><svg viewBox="0 0 12 12"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>`; } };
    dds.push(api); return api;
  }
  listaSuspensa(fP); listaSuspensa(fA);
  document.addEventListener('mousedown', e => { if (!e.target.closest('.dd')) dds.forEach(d => d.fechar()); });

  // ---------- tooltip ----------
  const dica = $('dica');
  const mostra = (e, h) => { dica.innerHTML = h; dica.style.opacity = 1; const w = dica.offsetWidth, hh = dica.offsetHeight; let x = e.clientX + 14, y = e.clientY + 14; if (x + w > innerWidth - 8) x = e.clientX - w - 14; if (y + hh > innerHeight - 8) y = e.clientY - hh - 14; dica.style.left = Math.max(8, x) + 'px'; dica.style.top = Math.max(8, y) + 'px'; };
  const esconde = () => dica.style.opacity = 0;

  // colunas por ano no cartão: ano escolhido em cor cheia, demais claros; o ano parcial mais claro
  function spark(id, vals, cor, destaque, fmt) {
    const el = $(id), n = vals.length, ok = vals.filter(v => v != null && isFinite(v));
    if (ok.length < 2) { el.innerHTML = ''; el.onmousemove = null; return; }
    const mx = Math.max(...ok, 0), mn = Math.min(...ok, 0), Y = v => 28 - (v - mn) / (mx - mn || 1) * 26, w = 120 / n;
    let g = '';
    vals.forEach((v, i) => {
      if (v == null || !isFinite(v)) return;
      const y0 = Y(0), y1 = Y(v), sel = i === destaque, parc = i === n - 1;
      g += `<rect x="${(i * w + w * .14).toFixed(2)}" y="${Math.min(y0, y1).toFixed(2)}" width="${(w * .72).toFixed(2)}" height="${Math.max(.8, Math.abs(y1 - y0)).toFixed(2)}" fill="${cor}" opacity="${sel ? 1 : parc ? .22 : .38}"/>`;
    });
    if (mn < 0) g += `<line x1="0" x2="120" y1="${Y(0)}" y2="${Y(0)}" stroke="${cor}" stroke-width=".5" opacity=".6"/>`;
    el.innerHTML = g;
    el.onmousemove = e => {
      const r = el.getBoundingClientRect(), i = Math.max(0, Math.min(n - 1, Math.floor((e.clientX - r.left) / r.width * n))), y = A0 + i;
      mostra(e, `<b>${y === UA ? rotPer(UA) : y}</b><br>${vals[i] == null ? '—' : fmt(vals[i])}`);
    };
    el.onmouseleave = esconde;
  }
  function delta(id, v, f) {
    const e = $(id);
    if (v == null || !isFinite(v)) { e.textContent = ''; e.className = 'delta'; return; }
    e.className = 'delta ' + (v >= 0 ? 'up' : 'down'); e.textContent = (v >= 0 ? '▲ ' : '▼ ') + f(Math.abs(v));
  }
  const fPct = v => nf(v * 100, v < .1 ? 1 : 0) + '%', fPP = v => nf(v * 100, 0) + ' p.p.';
  const sinalT = t => (t >= 0 ? '+' : '−') + ton(Math.abs(t));

  const nomeFlx = f => f ? 'importação' : 'exportação';
  const parceiro = f => f ? 'origem' : 'destino';

  // ---------- render ----------
  function render() {
    fP.value = st.prod; fA.value = st.ano; dds.forEach(d => d.sync());
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
    const perAnt = a === UA ? `jan–${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][UM - 1]} ${a - 1}` : String(a - 1);
    const serieAno = fn => anos.map(y => fn(janela(y, y === UA ? UM : 12)));
    $('kVolRot').textContent = `Volume ${f ? 'importado' : 'exportado'}`;
    $('kVol').textContent = ton(atual.t); delta('dVol', ant && ant.t > 0 ? atual.t / ant.t - 1 : null, fPct);
    $('kVolTxt').textContent = ant ? `${perAnt}: ${ton(ant.t)}` : '—';
    spark('sVol', serieAno(j => soma(IP, f, p, j, c).t), '#12239e', anoIdx, v => ton(v));
    $('kFob').textContent = usd(atual.v); delta('dFob', ant && ant.v > 0 ? atual.v / ant.v - 1 : null, fPct);
    $('kFobTxt').textContent = ant ? `${perAnt}: ${usd(ant.v)}` : '—';
    spark('sFob', serieAno(j => soma(IP, f, p, j, c).v), '#118dff', anoIdx, v => usd(v));
    const pr = preco(atual.v, atual.t), prA = ant && preco(ant.v, ant.t);
    $('kPre').textContent = pr ? 'US$ ' + nf(pr) + '/t' : '—'; delta('dPre', pr && prA ? pr / prA - 1 : null, fPct);
    $('kPreTxt').textContent = prA ? `${perAnt}: US$ ${nf(prA)}/t` : '—';
    spark('sPre', serieAno(j => { const s = soma(IP, f, p, j, c); return s.t > 0 ? preco(s.v, s.t) : null; }), '#e66c37', anoIdx, v => 'US$ ' + nf(v) + '/t');

    const loc = porLocal(IP, f, p, J), totT = [...loc.values()].reduce((s, x) => s + x.t, 0);
    const ord = [...loc.entries()].filter(([, x]) => x.t > 0).sort((x, y) => y[1].t - x[1].t);
    const part = (k, j) => { const tt = soma(IP, f, p, j).t; return tt ? soma(IP, f, p, j, k).t / tt : null; };
    const totA = ant ? soma(IP, f, p, Jant).t : 0;
    const alvo = c >= 0 ? c : ord.length ? ord[0][0] : -1;
    if (alvo >= 0) {
      const x = loc.get(alvo) || { t: 0 }, sh = totT ? x.t / totT : 0, shA = temAnt && totA ? soma(IP, f, p, Jant, alvo).t / totA : null;
      const pos = ord.findIndex(([k]) => k === alvo) + 1;
      $('kTopRot').textContent = c >= 0 ? `Participação · ${nomeC}` : (f ? 'Maior origem' : 'Maior destino');
      $('kTop').textContent = c >= 0 ? pp(sh) : D.paises[alvo];
      delta('dTop', shA != null ? sh - shA : null, fPP);
      $('kTopTxt').textContent = c >= 0 ? (pos ? `${pos}º ${parceiro(f)} de ${ord.length} países` : `sem ${nomeFlx(f)} no período`) : `${pp(sh)} do volume · ${ton(x.t)}`;
      spark('sTop', serieAno(j => part(alvo, j)), '#744ec2', anoIdx, v => pp(v) + ' do volume');
    } else { $('kTop').textContent = '—'; $('kTopTxt').textContent = 'sem fluxo no período'; $('sTop').innerHTML = ''; delta('dTop', null); }

    const ch = loc.get(CHINA), shC = totT ? (ch ? ch.t : 0) / totT : null, shCA = temAnt && totA ? soma(IP, f, p, Jant, CHINA).t / totA : null;
    $('kChi').textContent = shC != null ? pp(shC) : '—'; delta('dChi', shC != null && shCA != null ? shC - shCA : null, fPP);
    $('kChiTxt').textContent = shCA != null ? `do volume · ${perAnt}: ${pp(shCA)}` : `do volume de ${nomeFlx(f)}`;
    spark('sChi', serieAno(j => part(CHINA, j)), '#197278', anoIdx, v => pp(v) + ' do volume');

    const ex = soma(IP, 0, p, J, c).t, im = soma(IP, 1, p, J, c).t, s0 = ex - im;
    const sA = temAnt ? soma(IP, 0, p, Jant, c).t - soma(IP, 1, p, Jant, c).t : null;
    $('kSal').textContent = sinalT(s0); delta('dSal', sA != null ? s0 - sA : null, v => ton(v));
    $('kSalTxt').textContent = `exportou ${ton(ex)} · importou ${ton(im)}` + (sA != null ? ` · ${perAnt}: ${sinalT(sA)}` : '') + (nomeC ? ` · com ${nomeC}` : '');
    spark('sSal', serieAno(j => soma(IP, 0, p, j, c).t - soma(IP, 1, p, j, c).t), '#f2c80f', anoIdx, v => sinalT(v));

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
  const MES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const rotMes = i => `${MES[i % 12]}/${A0 + Math.floor(i / 12)}`;
  function grafico(id, series, o) {
    const el = $(id), box = el.parentNode.getBoundingClientRect(), i0 = o.i0 || 0;
    const W = Math.max(280, Math.round(box.width)), H = Math.max(150, Math.round(box.height)), m = { l: 50, r: 70, t: 16, b: 20 };
    const vals = series.flatMap(s => s.v.slice(i0)).filter(v => v != null && isFinite(v));
    if (!vals.length) { el.innerHTML = ''; return; }
    let mx = Math.max(...vals), mn = o.zero ? Math.min(...vals, 0) : Math.min(...vals);
    if (!o.zero) { const f = (mx - mn) * .12 || mx * .1; mn = Math.max(0, mn - f); }
    const passo = (() => { const r = (mx - mn) / 4, e = Math.pow(10, Math.floor(Math.log10(r || 1))), n = r / e; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * e; })();
    mx = Math.ceil(mx / passo) * passo; mn = Math.floor(mn / passo) * passo;
    const X = i => m.l + (W - m.l - m.r) * (i - i0) / (NM - 1 - i0), Y = v => m.t + (H - m.t - m.b) * (1 - (v - mn) / (mx - mn || 1));
    let g = '';
    const a0 = Math.max(i0, (st.ano - A0) * 12), a1 = (st.ano - A0) * 12 + meses(st.ano) - 1;
    if (a1 >= i0) g += `<rect x="${X(a0)}" y="${m.t}" width="${Math.max(2, X(a1) - X(a0))}" height="${H - m.t - m.b}" fill="#deecf9" opacity=".7"/>`;
    for (let v = mn; v <= mx + passo / 2; v += passo) g += `<line class="rule" x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axis" x="${m.l - 6}" y="${Y(v) + 3}" text-anchor="end">${o.fmt(v)}</text>`;
    const pulo = W > 560 ? 1 : 2;
    for (let y = A0; y <= UA; y++) { const k = (y - A0) * 12 + 6; if (k >= i0 && (y - A0) % pulo === 0) g += `<text class="axis" x="${X(Math.min(k, NM - 1))}" y="${H - 6}" text-anchor="middle">${y}</text>`; }
    const [E, I] = series;
    if (o.area) for (let k = i0; k < NM - 1; k++) {
      const e0 = E.v[k], e1 = E.v[k + 1], m0 = I.v[k], m1 = I.v[k + 1];
      if ([e0, e1, m0, m1].some(v => v == null)) continue;
      const imp = m0 + m1 > e0 + e1;
      g += `<path d="M${X(k)},${Y(e0)}L${X(k + 1)},${Y(e1)}L${X(k + 1)},${Y(m1)}L${X(k)},${Y(m0)}Z" fill="${imp ? '#e66c37' : '#118dff'}" opacity="${imp ? .16 : .08}"/>`;
    }
    if (o.cruz) {
      let ult = -1;
      for (let k = i0 + 1; k < NM; k++) {
        if ([E.v[k - 1], I.v[k - 1], E.v[k], I.v[k]].some(v => v == null)) continue;
        const d0 = E.v[k - 1] - I.v[k - 1], d1 = E.v[k] - I.v[k];
        if (d0 !== 0 && d1 !== 0 && Math.sign(d0) !== Math.sign(d1)) ult = k;
      }
      if (ult > 0) {
        const imp = I.v[ult] > E.v[ult], x = X(ult), dir = x > W * .55;
        g += `<line x1="${x}" x2="${x}" y1="${m.t - 4}" y2="${H - m.b}" stroke="#252423" stroke-dasharray="3 3" opacity=".5"/>`
          + `<text class="ann" x="${x + (dir ? -6 : 6)}" y="${m.t + 20}" text-anchor="${dir ? 'end' : 'start'}" fill="${imp ? '#b5461c' : '#12239e'}">${rotMes(ult)}: ${W < 640 ? (imp ? 'importação > exportação' : 'exportação > importação') : (imp ? 'importação passa a exportação' : 'exportação volta a superar')}</text>`;
      }
    }
    const fins = [];
    for (const s of series) {
      let d = '', pen = false, ult = -1;
      s.v.forEach((v, i) => { if (i < i0 || v == null || !isFinite(v)) { pen = false; return; } d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1); pen = true; ult = i; });
      g += `<path d="${d}" fill="none" stroke="${s.cor}" stroke-width="${o.fino ? 1.4 : 2.4}" stroke-linejoin="round"/>`;
      if (ult >= 0) fins.push({ x: X(ult), y: Y(s.v[ult]), cor: s.cor, txt: o.fmt(s.v[ult], true) });
    }
    fins.sort((p, q) => p.y - q.y);
    for (let k = 1; k < fins.length; k++) { const prev = fins[k - 1].ty || fins[k - 1].y; if (fins[k].y - prev < 14) fins[k].ty = prev + 14; }
    for (const p of fins) g += `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${p.cor}" stroke="#fff" stroke-width="1.5"/><text class="fim" x="${p.x + 7}" y="${(p.ty || p.y) + 4}" fill="${p.cor}">${p.txt}</text>`;
    g += `<rect id="${id}Hit" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent"/><line id="${id}Cur" y1="${m.t}" y2="${H - m.b}" stroke="#605e5c" stroke-dasharray="2 3" opacity="0"/>`;
    el.setAttribute('viewBox', `0 0 ${W} ${H}`); el.innerHTML = g;
    const hit = $(id + 'Hit'), cur = $(id + 'Cur');
    hit.onmousemove = e => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W;
      const i = Math.max(i0, Math.min(NM - 1, Math.round(i0 + (x - m.l) / (W - m.l - m.r) * (NM - 1 - i0))));
      cur.setAttribute('x1', X(i)); cur.setAttribute('x2', X(i)); cur.setAttribute('opacity', 1);
      let h = `<b>${rotMes(i)}</b> · ${o.titulo}<br>` + series.map(s => `<span style="color:${s.cor}">●</span> ${s.nome}: ${s.v[i] == null ? '—' : o.fmt(s.v[i], true)}`).join('<br>');
      if (o.area && E.v[i] != null && I.v[i] != null) h += `<br><b>saldo: ${sinalT(E.v[i] - I.v[i])}</b>`;
      mostra(e, h);
    };
    hit.onmouseleave = () => { cur.setAttribute('opacity', 0); esconde(); };
  }
  function renderSeries() {
    const { prod: p, pais: c } = st, nomeC = c >= 0 ? ' · ' + D.paises[c] : '', doze = st.modo !== 1;
    const e = mensal(0, p, c), i = mensal(1, p, c);
    document.querySelectorAll('#fModo button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.m === (doze ? 12 : 1)));
    $('tSerie').textContent = `${P[p]}: exportação × importação${nomeC}`;
    $('serieSub').textContent = doze ? `Toneladas, soma dos últimos 12 meses (tira a sazonalidade), dez/${A0} a ${MES[UM - 1]}/${UA}.` : `Toneladas por mês, jan/${A0} a ${MES[UM - 1]}/${UA}.`;
    const fT = (v, longo) => longo ? ton(v) : (v === 0 ? '0' : v >= 1e6 ? nf(v / 1e6, v >= 1e7 ? 0 : 1) + ' Mt' : nf(v / 1e3) + ' mil');
    const ve = doze ? rolar(Array.from(e.t)) : Array.from(e.t), vi = doze ? rolar(Array.from(i.t)) : Array.from(i.t);
    grafico('svgSerie', [{ nome: 'exportação', cor: '#118dff', v: ve }, { nome: 'importação', cor: '#e66c37', v: vi }],
      { fmt: fT, titulo: doze ? 'soma de 12 meses' : 'no mês', i0: doze ? 11 : 0, zero: true, area: true, cruz: doze, fino: !doze });
    // preço: some quando o volume de 12 meses é muito baixo (evita picos de poucas toneladas)
    const pr = s => { const t = rolar(Array.from(s.t)), v = rolar(Array.from(s.v)), lim = Math.max(0, ...t.filter(x => x != null)) * .03; return t.map((x, k) => x != null && x > lim && x > 0 ? v[k] * 1000 / x : null); };
    $('precoSub').textContent = `US$ FOB por tonelada, média de 12 meses${nomeC}. Sem frete, seguro e imposto; meses de volume muito baixo ficam de fora.`;
    grafico('svgPreco', [{ nome: 'exportação', cor: '#118dff', v: pr(e) }, { nome: 'importação', cor: '#e66c37', v: pr(i) }],
      { fmt: (v, longo) => (longo ? 'US$ ' : '') + nf(v) + (longo ? '/t' : ''), titulo: 'preço médio de 12 meses', i0: 11, zero: false });
  }
  document.querySelectorAll('#fModo button').forEach(b => b.onclick = () => { st.modo = +b.dataset.m === 1 ? 1 : 12; renderSeries(); });

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
