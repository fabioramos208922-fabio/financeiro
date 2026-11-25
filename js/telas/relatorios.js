/* Aba Relatórios. A pessoa escolhe um período (ano todo ou um mês) e tudo na tela acompanha. */
let anoRel = null, mesRel = null; // mesRel null = ano todo

const maiuscula = s => s[0].toUpperCase() + s.slice(1);
const pctDe = (v, total) => (total ? Math.round(v / total * 100) : 0);
const temMov = m => m.entradas || m.saidas;
const abrevMes = mk => MESES[Number(mk.slice(5)) - 1];

function anosComDados() {
  return [...new Set([HOJE.slice(0, 4), ...allItens().map(l => l.data.slice(0, 4))])].sort();
}

/* Do primeiro mês com movimento até o atual (ou dezembro, em anos passados). */
function mesesVisiveis(meses, ano) {
  const ini = Math.max(0, meses.findIndex(temMov));
  return meses.slice(ini).filter(m => temMov(m) || ano < HOJE.slice(0, 4) || m.mk <= monthKey(HOJE));
}

/* ---------- escolha do período ---------- */
function botoesPeriodo(visiveis) {
  const b = (mk, txt) => `<button data-mes="${mk}" aria-pressed="${(mesRel || "") === mk}">${txt}</button>`;
  return b("", "Ano todo") + visiveis.map(m => b(m.mk, maiuscula(abrevMes(m.mk)))).join("");
}

function escolherPeriodo(mk) {
  mesRel = mk || null;
  renderRelatorios();
  animar($("#p-relatorios"));
}

/* ---------- entrou − saiu = sobrou ---------- */
function contaHTML(r, ant, nomeAnt) {
  const lucro = r.resultado >= 0;
  const compara = (a, b, inverso) => (ant && temMov(ant) ? `${delta(a, b, inverso)} ${delta(a, b, inverso) ? "em relação a " + nomeAnt : ""}` : "");
  return `<div class="conta-item"><span class="lb">Entrou</span><b class="pos">${contar(r.entradas)}</b><span class="s">${compara(r.entradas, ant && ant.entradas) || "vendas e outros recebimentos"}</span></div>
    <span class="sinal" aria-hidden="true">−</span>
    <div class="conta-item"><span class="lb">Saiu</span><b class="neg">${contar(r.saidas)}</b><span class="s">${compara(r.saidas, ant && ant.saidas, true) || "tudo o que foi pago"}</span></div>
    <span class="sinal" aria-hidden="true">=</span>
    <div class="conta-item final ${lucro ? "" : "falta"}"><span class="lb">${lucro ? "Sobrou" : "Faltou"}</span><b>${contar(Math.abs(r.resultado))}</b><span class="s">${r.entradas ? (lucro ? `de cada R$ 100 que entraram, sobraram ${fmt(r.resultado / r.entradas * 100)}` : `saiu mais dinheiro do que entrou`) : lucro ? "sem movimento" : "não houve entradas"}</span></div>`;
}

/* ---------- gráfico ---------- */
function chartAno(meses, box) {
  const W = larguraGrafico(box), H = 300, L = 58, R = 6, B = 34, T = 30;
  const max = Math.max(1, ...meses.flatMap(m => [m.entradas, m.saidas])), step = niceStep(max / 4), topo = Math.ceil(max / step) * step;
  const y = v => T + (H - T - B) * (1 - v / topo), gw = Math.min(170, (W - L - R) / meses.length), bw = Math.min(34, gw * 0.3);
  const x0 = L + (W - L - R - gw * meses.length) / 2, cx = i => x0 + gw * (i + 0.5);
  let g = "";
  for (let v = 0; v <= topo + 1e-6; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="${v ? "grade" : "zero"}"/>` + textoSVG(L - 8, y(v) + 4, compact(v), { anchor: "end" });
  meses.forEach((m, i) => {
    const sel = m.mk === mesRel, nome = maiuscula(mesNome(m.mk));
    const barra = (x, v, cor) => (v ? `<rect class="coluna" x="${x}" y="${y(v)}" width="${bw}" height="${y(0) - y(v)}" rx="${Math.min(6, bw / 3)}" fill="${cor}"/>` : "");
    const rot = !temMov(m) || gw < 46 ? "" : textoSVG(cx(i), y(Math.max(m.entradas, m.saidas)) - 9, (m.resultado >= 0 ? "+" : "−") + compact(Math.round(Math.abs(m.resultado))), { size: 12, peso: 700, fill: m.resultado >= 0 ? "var(--in)" : "var(--out)" });
    g += `<g class="mes-col ${sel ? "sel" : mesRel ? "apagado" : ""}" data-mes="${m.mk}" data-i="${i}" role="button" tabindex="0" aria-pressed="${sel}" aria-label="${nome}: entrou ${fmt(m.entradas)}, saiu ${fmt(m.saidas)}">
      <rect x="${cx(i) - gw / 2 + 2}" y="4" width="${gw - 4}" height="${H - 6}" rx="12" class="faixa"/>
      ${barra(cx(i) - bw - 2, m.entradas, "var(--in-fill)")}${barra(cx(i) + 2, m.saidas, "var(--out-fill)")}${rot}
      ${textoSVG(cx(i), H - 12, gw < 34 ? abrevMes(m.mk)[0].toUpperCase() : maiuscula(abrevMes(m.mk)), { size: 12.5, peso: sel ? 700 : 500, fill: sel ? "var(--accent)" : "var(--muted)" })}</g>`;
  });
  box.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="group" aria-label="Entradas e saídas por mês">${g}</svg><div class="tip"></div>`;
  box.dica = i => {
    const m = meses[i], tip = box.querySelector(".tip"), svg = box.querySelector("svg"), esc1 = svg.clientWidth / W;
    tip.innerHTML = `<b>${maiuscula(mesNome(m.mk))}</b><br>Entrou ${fmt(m.entradas)}<br>Saiu ${fmt(m.saidas)}<br>${m.resultado >= 0 ? "Sobrou" : "Faltou"} ${fmt(Math.abs(m.resultado))}`;
    tip.style.display = "block";
    const meia = tip.offsetWidth / 2;
    tip.style.left = Math.max(meia, Math.min(svg.clientWidth - meia, cx(i) * esc1)) + "px";
    tip.style.top = Math.max(tip.offsetHeight * 0.75, y(Math.max(m.entradas, m.saidas)) * esc1) + "px";
  };
}

/* ---------- para onde foi ---------- */
function gruposDeGasto(r) {
  const variaveis = CUSTO_VAR, fixas = Object.keys(r.porCat).filter(k => !CUSTO_VAR.includes(k) && k !== "retirada");
  const grupo = (nome, nota, cor, ks) => ({ nome, nota, cor, itens: ks.filter(k => r.porCat[k]).map(k => [CATS[k] || "Outra", r.porCat[k]]).sort((a, b) => b[1] - a[1]) });
  return [
    grupo("Para poder vender", "mercadoria, frete, embalagem, impostos", "#ee5d4a", variaveis),
    grupo("Contas do negócio", "aluguel, salários, manutenção, banco", "#f0a03c", fixas),
    grupo("Retirada do dono", "dinheiro que você tirou para você", "#6f87c4", ["retirada"]),
  ].map(g => ({ ...g, total: g.itens.reduce((a, i) => a + i[1], 0) })).filter(g => g.total > 0);
}

function paraOndeFoi(r) {
  const grupos = gruposDeGasto(r);
  if (!grupos.length) return vazio("Nada foi pago nesse período.");
  return `<div class="cem" aria-hidden="true">${grupos.map(g => `<span style="width:${g.total / r.saidas * 100}%;background:${g.cor}"></span>`).join("")}</div>`
    + grupos.map(g => `<div class="gasto"><div class="gasto-h">${quadrado(g.cor)}<span><b>${g.nome}</b><small>${g.nota}</small></span><span class="gv num"><b>${fmt(g.total)}</b><small>${pctDe(g.total, r.saidas)}% do que saiu</small></span></div>
      ${g.itens.length > 1 ? `<ul>${g.itens.map(([n, v]) => `<li><span>${esc(n)}</span><span class="num">${fmt(v)}</span></li>`).join("")}</ul>` : ""}</div>`).join("");
}

function comoEntrou(r) {
  const ent = Object.entries(r.porForma).sort((a, b) => b[1] - a[1]);
  if (!ent.length) return vazio("Nada entrou nesse período.");
  return ent.map(([k, v]) => `<div class="forma"><div><span>${quadrado(COR_FORMA[k] || COR_NEUTRA)}${esc(FORMAS[k] || "Outra")}</span><b class="num">${fmt(v)}</b></div>
    <span class="forma-tr"><span style="width:${v / ent[0][1] * 100}%;background:${COR_FORMA[k] || COR_NEUTRA}"></span></span></div>`).join("");
}

function rankingContatos(itens, tipo) {
  const mapa = {};
  for (const l of itens) {
    const c = l.status === "realizado" && l.tipo === tipo && contatoDe(l);
    if (c) mapa[c.nome] = (mapa[c.nome] || 0) + l.valor;
  }
  const top = Object.entries(mapa).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!top.length) return vazio(`Nenhum ${tipo === "entrada" ? "cliente" : "fornecedor"} com nome nesse período.`);
  return `<ol class="rank">${top.map(([nome, v], i) => `<li><span class="pos-n">${i + 1}</span><b class="rk">${esc(nome)}</b><span class="num">${fmt(v)}</span></li>`).join("")}</ol>`;
}

/* ---------- tabela ---------- */
function tabelaAno(meses, total) {
  const comMov = meses.filter(temMov), melhor = comMov.length > 1 ? comMov.reduce((a, m) => (m.resultado > a.resultado ? m : a)) : null;
  const linhas = meses.map(m => {
    const marca = m === melhor ? '<span class="chip in">melhor mês</span>' : m.mk === monthKey(HOJE) ? '<span class="chip acc">em andamento</span>' : "";
    return `<tr data-mes="${m.mk}" class="${m.mk === mesRel ? "sel" : ""}"><td><button class="mes-link" data-mes="${m.mk}">${maiuscula(mesNome(m.mk))}</button> ${marca}</td>
      <td class="r num" data-lb="Entrou">${fmt(m.entradas)}</td><td class="r num" data-lb="Saiu">${fmt(m.saidas)}</td>
      <td class="r num"><span class="res ${temMov(m) ? classeValor(m.resultado >= 0) : ""}">${temMov(m) ? fmtSinal(m.resultado) : fmt(0)}</span></td></tr>`;
  }).join("");
  return `<thead><tr><th>Mês</th><th class="r">Entrou</th><th class="r">Saiu</th><th class="r">Sobrou / faltou</th></tr></thead><tbody>${linhas}</tbody>
    <tfoot><tr><td>Total do ano</td><td class="r num" data-lb="Entrou">${fmt(total.entradas)}</td><td class="r num" data-lb="Saiu">${fmt(total.saidas)}</td><td class="r num">${fmtSinal(total.resultado)}</td></tr></tfoot>`;
}

/* ---------- tela ---------- */
function renderRelatorios() {
  const itens = allItens(), anos = anosComDados();
  if (!anos.includes(anoRel)) anoRel = HOJE.slice(0, 4);
  const { meses, total } = resumoAno(itens, anoRel), visiveis = mesesVisiveis(meses, anoRel);
  if (!visiveis.some(m => m.mk === mesRel)) mesRel = null;
  const tem = meses.some(temMov);
  $("#relAno").innerHTML = [...anos].reverse().map(a => `<option value="${a}" ${a === anoRel ? "selected" : ""}>${a}</option>`).join("");
  $("#relVazio").hidden = tem;
  $("#relCorpo").hidden = !tem;
  $("#btnXLSX").hidden = $("#btnImprimir").hidden = !tem;
  if (!tem) return;

  // o que estava com foco volta a ter depois de redesenhar
  const foco = document.activeElement, area = foco && foco.dataset && foco.dataset.mes !== undefined && foco.closest("[id]");
  const doPeriodo = itens.filter(l => l.data.startsWith(mesRel || anoRel)), r = resumoItens(doPeriodo);
  const ant = mesRel && resumoMes(itens, mesAnt(mesRel)), nome = mesRel ? `${maiuscula(mesNome(mesRel))} de ${anoRel}` : `Ano de ${anoRel}`;
  $("#relMeses").innerHTML = botoesPeriodo(visiveis);
  $("#relPeriodo").textContent = nome + (mesRel === monthKey(HOJE) ? " (até hoje)" : "");
  $("#relVerLanc").hidden = !mesRel;
  $("#relConta").innerHTML = contaHTML(r, mesRel === monthKey(HOJE) ? null : ant, mesRel ? mesNome(mesAnt(mesRel)) : "");
  chartAno(visiveis, $("#chartAno"));
  $("#relGastos").innerHTML = paraOndeFoi(r);
  $("#relFormas").innerHTML = comoEntrou(r);
  $("#tbAno").innerHTML = tabelaAno(visiveis, total);
  $("#topClientes").innerHTML = rankingContatos(doPeriodo, "entrada");
  $("#topFornec").innerHTML = rankingContatos(doPeriodo, "saida");
  if (area) {
    const alvo = document.querySelector(`#${area.id} ${foco.tagName === "BUTTON" ? "button" : "g"}[data-mes="${foco.dataset.mes}"]`);
    if (alvo) alvo.focus({ preventScroll: true });
  }
}

function baixarExcel() {
  const itens = allItens().filter(l => l.data.startsWith(anoRel)).sort((a, b) => a.data.localeCompare(b.data));
  const { meses } = resumoAno(itens, anoRel), porCategoria = [];
  for (const [tipo, nome, rotulos, campo] of [["entrada", "Entrada", FORMAS, "forma"], ["saida", "Saída", CATS, "cat"]]) {
    const feitos = itens.filter(l => l.status === "realizado" && l.tipo === tipo), tot = soma(feitos);
    const mapa = {};
    for (const l of feitos) mapa[l[campo]] = (mapa[l[campo]] || 0) + l.valor;
    for (const [k, v] of Object.entries(mapa).sort((a, b) => b[1] - a[1])) porCategoria.push({ tipo: nome, nome: rotulos[k] || "Outra", valor: arred(v), pct: v / tot });
  }
  const bytes = planilhaAno({
    nome: cfg.nome || "Meu negócio", ano: anoRel, porCategoria,
    meses: meses.map(m => ({ ...m, nome: maiuscula(mesNome(m.mk)), entradas: arred(m.entradas), variaveis: arred(m.variaveis), fixas: arred(m.fixas), retirada: arred(m.retirada) })),
    lancamentos: itens.map(l => [l.data, l.desc || "", nomeContato(l), ehEntrada(l) ? "Entrada" : "Saída", rotulo(l), l.status === "previsto" ? "Previsto" : "Feito", signed(l)]),
  });
  baixarArquivo(`caixa-certo-${anoRel}.xlsx`, bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  toast("Planilha baixada");
}

$("#relMeses").addEventListener("click", e => { const b = e.target.closest("button"); if (b) escolherPeriodo(b.dataset.mes); });
/* clicar de novo no mês escolhido volta para o ano todo */
const alternarMes = mk => escolherPeriodo(mk === mesRel ? null : mk);
$("#tbAno").addEventListener("click", e => { const l = e.target.closest("tr[data-mes]"); if (l) alternarMes(l.dataset.mes); });
$("#chartAno").addEventListener("click", e => { const g = e.target.closest("g[data-mes]"); if (g) alternarMes(g.dataset.mes); });
$("#chartAno").addEventListener("keydown", e => {
  const g = e.target.closest("g[data-mes]");
  if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); alternarMes(g.dataset.mes); }
});
$("#chartAno").addEventListener("pointermove", e => {
  const g = e.target.closest("g[data-mes]");
  if (g && e.pointerType === "mouse") $("#chartAno").dica(Number(g.dataset.i));
});
$("#chartAno").addEventListener("pointerleave", () => { const t = $("#chartAno .tip"); if (t) t.style.display = "none"; });
$("#relAno").addEventListener("change", () => { anoRel = $("#relAno").value; escolherPeriodo(null); });
$("#relVerLanc").onclick = () => {
  if (!mesRel) return;
  ["#flTipo", "#flStatus", "#flCat", "#flBusca"].forEach(s => { $(s).value = ""; });
  $("#flMes").value = mesRel;
  renderLanc();
  showTab("lancamentos");
  window.scrollTo({ top: 0 });
};
$("#btnXLSX").onclick = () => { if (cfg) baixarExcel(); };
$("#btnImprimir").onclick = () => window.print();
$("#relDemo").onclick = () => { entrarDemo(); showTab("relatorios"); };
$("#relLancar").onclick = () => { if (cfg) abrirLanc(null); };
window.addEventListener("resize", () => { const t = $("#chartAno .tip"); if (t) t.style.display = "none"; });
