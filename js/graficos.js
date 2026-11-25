/* Gráficos em SVG: saldo diário, barras por semana e barras horizontais. */
function niceStep(s) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(s, 1)))), f = s / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
}

function compact(v) {
  const a = Math.abs(v);
  return (v < 0 ? "−" : "") + (a >= 1000
    ? (a / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil"
    : a.toLocaleString("pt-BR"));
}

function textoSVG(x, y, txt, { anchor = "middle", size = 11, fill = "var(--muted)", peso = 400 } = {}) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" font-weight="${peso}" fill="${fill}">${txt}</text>`;
}

/* ---------- saldo dia a dia ---------- */
function desenharSaldo(sel, ser, W = 680, H = 250) {
  const box = $(sel);
  const idx = ser.map((p, i) => ({ ...p, i })).filter(p => p.v !== null);
  if (idx.length < 2) {
    box.desenhar = null;
    box.innerHTML = vazio("Ainda não há dias suficientes para desenhar o gráfico.");
    return;
  }
  const L = 62, R = 16, T = 22, B = 28, n = ser.length;
  let lo = Math.min(0, ...idx.map(p => p.v)), hi = Math.max(0, ...idx.map(p => p.v));
  if (hi === lo) hi = lo + 100;
  const step = niceStep((hi - lo) / 4);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const x = i => L + (W - L - R) * i / (n - 1);
  const y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
  const cor = v => (v < 0 ? "var(--out)" : "var(--accent)");
  const id = "grad-" + sel.slice(1);

  let g = "";
  if (lo < 0) g += `<rect x="${L}" y="${y(0)}" width="${W - L - R}" height="${y(lo) - y(0)}" fill="var(--out)" opacity=".07"/>`;
  for (let v = lo; v <= hi + 1e-6; v += step) {
    g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(${v === 0 ? "--muted" : "--line"})"/>`
      + textoSVG(L - 8, y(v) + 4, compact(v), { anchor: "end" });
  }
  const ticks = Math.min(W > 800 ? 11 : 7, n);
  for (let k = 0; k < ticks; k++) {
    const i = Math.round(k * (n - 1) / (ticks - 1));
    g += textoSVG(x(i), H - 8, dBR(ser[i].d));
  }
  const h = ser.findIndex(p => p.d === HOJE);
  if (h >= 0) {
    g += `<line x1="${x(h)}" x2="${x(h)}" y1="${T - 6}" y2="${H - B}" stroke="var(--muted)" stroke-dasharray="2 3"/>`
      + textoSVG(x(h), T - 9, "hoje", { anchor: h < 3 ? "start" : h > n - 4 ? "end" : "middle", peso: 700 });
  }

  const path = a => a.map((p, k) => (k ? "L" : "M") + x(p.i).toFixed(1) + " " + y(p.v).toFixed(1)).join(" ");
  const feito = idx.filter(p => !p.proj);
  // a linha prevista começa no último ponto realizado
  const proj = idx.filter((p, k) => p.proj || (idx[k + 1] && idx[k + 1].proj));
  g += `<g clip-path="url(#${id}-corte)">`;
  if (feito.length > 1) {
    g += `<path d="${path(feito)} L${x(feito[feito.length - 1].i)} ${y(0)} L${x(feito[0].i)} ${y(0)} Z" fill="url(#${id})"/>
      <path d="${path(feito)}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  if (proj.length > 1) g += `<path d="${path(proj)}" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-dasharray="6 5" stroke-linejoin="round" opacity=".8"/>`;
  g += '</g><g class="marcos">';
  const agora = idx.find(p => p.d === HOJE);
  if (agora && agora !== idx[idx.length - 1]) {
    g += `<circle class="pulso" cx="${x(agora.i)}" cy="${y(agora.v)}" r="5" fill="${cor(agora.v)}"/>`
      + `<circle cx="${x(agora.i)}" cy="${y(agora.v)}" r="5" fill="${cor(agora.v)}" stroke="var(--surface)" stroke-width="2"/>`;
  }

  const ponto = (p, c) => `<circle cx="${x(p.i)}" cy="${y(p.v)}" r="5" fill="${c}" stroke="var(--surface)" stroke-width="2"/>`;
  const min = idx.reduce((a, p) => (p.v < a.v ? p : a)), ult = idx[idx.length - 1];
  if (min.v < 0 && min !== ult) {
    const anchor = min.i < n * 0.1 ? "start" : min.i > n * 0.9 ? "end" : "middle";
    const cabeEmbaixo = y(min.v) + 18 < H - B;
    g += ponto(min, "var(--out)")
      + textoSVG(x(min.i), y(min.v) + (cabeEmbaixo ? 18 : -10), fmt(min.v), { anchor, size: 11.5, fill: "var(--out)", peso: 700 });
  }
  g += ponto(ult, cor(ult.v))
    + textoSVG(x(ult.i) - 8, y(ult.v) - 10, fmt(ult.v), { anchor: "end", size: 12, fill: ult.v < 0 ? "var(--out)" : "var(--ink)", peso: 700 }) + "</g>";

  box.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Saldo dia a dia">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".34"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient><clipPath id="${id}-corte"><rect class="corte" x="${L - 4}" y="0" width="${W - L - R + 8}" height="${H}"/></clipPath></defs>
    ${g}
    <g class="guia" style="display:none"><circle r="11" opacity=".18"/><circle r="5" stroke="var(--surface)" stroke-width="2"/></g>
    <line class="hl" y1="${T}" y2="${H - B}" stroke="var(--ink)" stroke-opacity=".25" style="display:none"/>
    <circle class="hd" r="4.5" stroke="var(--surface)" stroke-width="2" style="display:none"/>
    <rect x="${L}" y="0" width="${W - L - R}" height="${H}" fill="transparent"/></svg><div class="tip"></div>`;

  /* a linha percorre o período, do primeiro ao último dia */
  box.assinatura = JSON.stringify(ser);
  box.desenhar = () => {
    const desenho = box.querySelector("svg"), corte = desenho.querySelector(".corte");
    const guia = desenho.querySelector(".guia"), marcos = desenho.querySelector(".marcos");
    const vez = box.vez = (box.vez || 0) + 1;
    const a = idx[0].i, b = idx[idx.length - 1].i;
    marcos.classList.add("oculto");
    quadros(2000, t => {
      const s = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, pos = a + (b - a) * s;
      let k = idx.findIndex(p => p.i >= pos);
      if (k < 0) k = idx.length - 1;
      const q = idx[k], p = idx[Math.max(0, k - 1)];
      const f = q.i === p.i ? 1 : (pos - p.i) / (q.i - p.i), v = p.v + (q.v - p.v) * f;
      corte.setAttribute("width", t === 1 ? W - L - R + 8 : Math.max(0, x(pos) - L + 4));
      guia.setAttribute("transform", `translate(${x(pos)} ${y(v)})`);
      guia.style.display = t === 1 ? "none" : "";
      guia.querySelectorAll("circle").forEach(c => c.setAttribute("fill", cor(v)));
      if (t === 1) marcos.classList.remove("oculto");
    }, () => desenho.isConnected && box.vez === vez);
  };

  /* dica ao passar o mouse ou o dedo */
  const svg = box.querySelector("svg"), tip = box.querySelector(".tip");
  const linha = svg.querySelector(".hl"), marca = svg.querySelector(".hd");
  const mostrar = ev => {
    const r = svg.getBoundingClientRect(), escala = W / r.width;
    const px = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) * escala;
    const i = Math.max(0, Math.min(n - 1, Math.round((px - L) / (W - L - R) * (n - 1))));
    const p = ser[i];
    if (p.v === null) return;
    linha.setAttribute("x1", x(i));
    linha.setAttribute("x2", x(i));
    marca.setAttribute("cx", x(i));
    marca.setAttribute("cy", y(p.v));
    marca.setAttribute("fill", cor(p.v));
    linha.style.display = marca.style.display = "";
    tip.innerHTML = `${SEM_L[wd(p.d)]}, ${dLong(p.d)}${p.proj ? " (previsto)" : p.d === HOJE ? " (hoje)" : ""}<br><b>${fmt(p.v)}</b>`;
    tip.style.display = "block";
    const meia = tip.offsetWidth / 2; // não deixa sair do cartão
    tip.style.left = Math.max(meia, Math.min(r.width - meia, x(i) / escala)) + "px";
    tip.style.top = y(p.v) / escala + "px";
  };
  const esconder = () => { tip.style.display = linha.style.display = marca.style.display = "none"; };
  svg.addEventListener("mousemove", mostrar);
  svg.addEventListener("touchmove", mostrar, { passive: true });
  svg.addEventListener("mouseleave", esconder);
  svg.addEventListener("touchend", esconder);
}

/* ---------- entradas e saídas por semana ---------- */
function chartSemanas(itens, mk) {
  const ini = mk + "-01", fim = endOfMonth(ini), sem = [];
  for (let d = ini; d <= fim; d = addDays(d, 7)) {
    const f = addDays(d, 6);
    sem.push({ d, f: f > fim ? fim : f, e: 0, s: 0 });
  }
  for (const l of itens) {
    if (l.status !== "realizado" || monthKey(l.data) !== mk) continue;
    sem.find(x => l.data <= x.f)[ehEntrada(l) ? "e" : "s"] += l.valor;
  }
  const W = 1060, H = 240, L = 58, B = 30, T = 12;
  const max = Math.max(1, ...sem.flatMap(w => [w.e, w.s])), step = niceStep(max / 4), topo = Math.ceil(max / step) * step;
  const y = v => T + (H - T - B) * (1 - v / topo), gw = (W - L - 10) / sem.length, bw = Math.min(34, gw * 0.32);
  let g = "";
  for (let v = 0; v <= topo + 1e-6; v += step) {
    g += `<line x1="${L}" x2="${W - 10}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/>` + textoSVG(L - 8, y(v) + 4, compact(v), { anchor: "end" });
  }
  sem.forEach((w, i) => {
    const cx = L + gw * i + gw / 2, periodo = `${dBR(w.d)}–${dBR(w.f)}`;
    const barra = (x, v, cor, nome) => `<rect class="coluna" style="animation-delay:${i * 90}ms" x="${x}" y="${y(v)}" width="${bw}" height="${y(0) - y(v)}" rx="6" fill="${cor}"><title>${nome} ${periodo}: ${fmt(v)}</title></rect>`;
    g += barra(cx - bw - 2, w.e, "var(--in)", "Entradas") + barra(cx + 2, w.s, "var(--out)", "Saídas") + textoSVG(cx, H - 10, periodo);
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Entradas e saídas por semana">${g}</svg>`;
}

/* ---------- barras horizontais ---------- */
function bars(obj, labels, cores) {
  const ent = Object.entries(obj).sort((a, b) => b[1] - a[1]);
  if (!ent.length) return vazio("Nada lançado ainda.");
  const max = Math.max(1, ent[0][1]), total = ent.reduce((a, e) => a + e[1], 0) || 1;
  return ent.map(([k, v], i) => {
    const cor = cores[k] || COR_NEUTRA;
    return `<div class="bar"><span class="nm"><i style="background:${cor}"></i>${esc(labels[k] || k)}</span>
      <span class="tr"><span class="fl" style="animation-delay:${i * 70}ms;width:${(v / max * 100).toFixed(1)}%;background:${cor}"></span></span>
      <span class="vl">${fmt(v)}<small>${Math.round(v / total * 100)}%</small></span></div>`;
  }).join("");
}
