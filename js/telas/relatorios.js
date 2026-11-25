/* Aba Relatórios: o ano mês a mês, para imprimir ou levar ao contador. */
let anoRel = null;

const maiuscula = s => s[0].toUpperCase() + s.slice(1);
const pctDe = (v, total) => (total ? Math.round(v / total * 100) : 0);

function anosComDados() {
  return [...new Set([HOJE.slice(0, 4), ...allItens().map(l => l.data.slice(0, 4))])].sort();
}

/* Do primeiro mês com movimento até o atual (ou dezembro, em anos passados). */
function mesesVisiveis(meses, ano) {
  const tem = m => m.entradas || m.saidas;
  const ini = Math.max(0, meses.findIndex(tem));
  return meses.slice(ini).filter(m => tem(m) || ano < HOJE.slice(0, 4) || m.mk <= monthKey(HOJE));
}

/* Entradas e saídas em barras, resultado em linha. */
function chartAno(meses, box) {
  const W = larguraGrafico(box), H = 290, L = 62, R = 10, B = 30, T = 18;
  const hiR = Math.max(1, ...meses.flatMap(m => [m.entradas, m.saidas])), loR = Math.min(0, ...meses.map(m => m.resultado));
  const step = niceStep((hiR - loR) / 5), hi = Math.ceil(hiR / step) * step, lo = Math.floor(loR / step) * step;
  const y = v => T + (H - T - B) * (1 - (v - lo) / (hi - lo)), gw = (W - L - R) / meses.length, bw = Math.min(26, gw * 0.3);
  const cx = i => L + gw * (i + 0.5);
  let g = "";
  for (let v = lo; v <= hi + 1e-6; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="${Math.abs(v) < 1e-6 ? "zero" : "grade"}"/>` + textoSVG(L - 8, y(v) + 4, compact(v), { anchor: "end" });
  meses.forEach((m, i) => {
    const barra = (x, v, cor) => (v ? `<rect class="coluna" x="${x}" y="${y(v)}" width="${bw}" height="${y(0) - y(v)}" rx="${Math.min(5, bw / 3)}" fill="${cor}"/>` : "");
    const nome = maiuscula(mesNome(m.mk));
    g += `<g class="mes-col"><rect x="${cx(i) - gw / 2}" y="${T}" width="${gw}" height="${H - T - B}" rx="8" class="faixa"/><title>${nome}\nEntradas: ${fmt(m.entradas)}\nSaídas: ${fmt(m.saidas)}\nResultado: ${fmt(m.resultado)}</title>`
      + barra(cx(i) - bw - 2, m.entradas, "var(--in-fill)") + barra(cx(i) + 2, m.saidas, "var(--out-fill)") + "</g>"
      + textoSVG(cx(i), H - 9, W < 420 && meses.length > 8 ? MESES[Number(m.mk.slice(5)) - 1][0].toUpperCase() : MESES[Number(m.mk.slice(5)) - 1], { size: 12 });
  });
  const pts = meses.map((m, i) => ({ x: cx(i), y: y(m.resultado), v: m.entradas || m.saidas })).filter(p => p.v);
  if (pts.length > 1) g += `<polyline class="linha-res" points="${pts.map(p => p.x.toFixed(1) + "," + p.y.toFixed(1)).join(" ")}"/>`;
  g += pts.map(p => `<circle class="ponto-res" cx="${p.x}" cy="${p.y}" r="4.5"/>`).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Entradas, saídas e resultado por mês">${g}</svg>`;
}

function faixaResumo(total, ano, anos) {
  const i = anos.indexOf(ano), lucro = total.resultado >= 0;
  const seta = (alvo, txt, nome) => `<button class="seta" data-ano="${alvo || ""}" aria-label="${nome}" ${alvo ? "" : "disabled"}>${txt}</button>`;
  return `<div class="rel-topo"><div><span class="lb">${esc(cfg.nome || "Meu negócio")}</span><div class="rel-ano">${seta(anos[i - 1], "‹", "Ano anterior")}<h2>${ano}</h2>${seta(anos[i + 1], "›", "Próximo ano")}</div></div>
      <div class="row nao-imprime"><button class="btn claro" id="btnXLSX">Baixar Excel</button><button class="btn branco" id="btnImprimir">Imprimir ou PDF</button></div></div>
    <div class="rel-num">
      <div><span class="lb">${lucro ? "Sobrou no ano" : "Faltou no ano"}</span><b class="big ${lucro ? "" : "neg"}">${contar(total.resultado)}</b><span class="s">${total.entradas ? pctDe(total.resultado, total.entradas) + "% do que entrou" : "sem entradas ainda"}</span></div>
      <div><span class="lb">Entrou</span><b class="mid">${contar(total.entradas)}</b></div>
      <div><span class="lb">Saiu</span><b class="mid">${contar(total.saidas)}</b></div>
    </div>`;
}

/* De cada R$ 100 que entraram, para onde foram. */
function cada100(t) {
  if (!t.entradas) return vazio("Aparece quando houver entradas no ano.");
  const p = [["Custos variáveis", t.variaveis, "#ee5d4a"], ["Custos fixos", t.fixas, "#f0a03c"], ["Retiradas do dono", t.retirada, "#7d94c9"], ["Sobrou", Math.max(0, t.resultado), "#12a594"]].filter(x => x[1] > 0);
  const base = Math.max(t.entradas, t.saidas), por100 = v => fmt(v / t.entradas * 100);
  return `<div class="cem" aria-hidden="true">${p.map(([, v, c]) => `<span style="width:${v / base * 100}%;background:${c}"></span>`).join("")}</div>
    <div class="cem-leg">${p.map(([n, v, c]) => `<div>${quadrado(c)}<span>${n}</span><b class="num">${por100(v)}</b></div>`).join("")}</div>
    ${t.resultado < 0 ? `<p class="small neg" style="margin:12px 0 0">Saiu ${por100(-t.resultado)} a mais do que entrou, a cada R$ 100.</p>` : ""}`;
}

function tabelaAno(meses, total) {
  const maxE = Math.max(1, ...meses.map(m => m.entradas));
  const comMov = meses.filter(m => m.entradas || m.saidas);
  const melhor = comMov.length > 1 ? comMov.reduce((a, m) => (m.resultado > a.resultado ? m : a)) : null;
  const v = n => (n ? fmt(n) : '<span class="nada">–</span>');
  const linhas = meses.map(m => {
    const tem = m.entradas || m.saidas;
    return `<tr class="${tem ? "" : "sem"}"><td class="mes"><b>${maiuscula(mesNome(m.mk))}</b>${m === melhor ? ' <span class="chip in">melhor mês</span>' : ""}${m.mk === monthKey(HOJE) ? ' <span class="chip acc">em andamento</span>' : ""}</td>
      <td class="r num"><span class="comb"><span style="width:${m.entradas / maxE * 100}%"></span></span>${v(m.entradas)}</td>
      <td class="r num">${v(m.variaveis)}</td><td class="r num">${v(m.fixas)}</td><td class="r num">${v(m.retirada)}</td>
      <td class="r num">${tem ? `<span class="res ${classeValor(m.resultado >= 0)}">${fmtSinal(m.resultado)}</span>` : v(0)}</td>
      <td class="r num muted">${m.entradas ? pctDe(m.resultado, m.entradas) + "%" : v(0)}</td></tr>`;
  }).join("");
  return `<thead><tr><th>Mês</th><th class="r">Entradas</th><th class="r">Custos variáveis</th><th class="r">Custos fixos</th><th class="r">Retiradas</th><th class="r">Resultado</th><th class="r">% que sobrou</th></tr></thead><tbody>${linhas}</tbody>
    <tfoot><tr><td>Total</td><td class="r num">${fmt(total.entradas)}</td><td class="r num">${fmt(total.variaveis)}</td><td class="r num">${fmt(total.fixas)}</td><td class="r num">${fmt(total.retirada)}</td><td class="r num">${fmtSinal(total.resultado)}</td><td class="r num">${total.entradas ? pctDe(total.resultado, total.entradas) + "%" : "–"}</td></tr></tfoot>`;
}

function rankingContatos(itens, ano, tipo) {
  const mapa = {};
  for (const l of itens) {
    const c = l.status === "realizado" && l.tipo === tipo && l.data.startsWith(ano) && contatoDe(l);
    if (c) mapa[c.nome] = (mapa[c.nome] || 0) + l.valor;
  }
  const top = Object.entries(mapa).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!top.length) return vazio(`Escolha o ${tipo === "entrada" ? "cliente" : "fornecedor"} ao lançar para ver o ranking aqui.`);
  return `<ol class="rank">${top.map(([nome, v], i) => `<li><span class="pos-n">${i + 1}</span><span class="rk"><b>${esc(nome)}</b><span class="rk-tr"><span style="width:${v / top[0][1] * 100}%"></span></span></span><span class="num">${fmt(v)}</span></li>`).join("")}</ol>`;
}

function renderRelatorios() {
  const itens = allItens(), anos = anosComDados(), ano = anos.includes(anoRel) ? anoRel : HOJE.slice(0, 4);
  anoRel = ano;
  const { meses, total } = resumoAno(itens, ano), visiveis = mesesVisiveis(meses, ano);
  const tem = meses.some(m => m.entradas || m.saidas);
  $("#relFaixa").innerHTML = faixaResumo(total, ano, anos);
  $("#relVazio").hidden = tem;
  $("#relCorpo").hidden = !tem;
  if (!tem) return;
  $("#chartAno").innerHTML = chartAno(visiveis, $("#chartAno"));
  $("#rel100").innerHTML = cada100(total);
  $("#tbAno").innerHTML = tabelaAno(visiveis, total);
  $("#topClientes").innerHTML = rankingContatos(itens, ano, "entrada");
  $("#topFornec").innerHTML = rankingContatos(itens, ano, "saida");
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

$("#relFaixa").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b || !cfg) return;
  if (b.id === "btnXLSX") baixarExcel();
  else if (b.id === "btnImprimir") window.print();
  else if (b.dataset.ano) { anoRel = b.dataset.ano; renderRelatorios(); animar($("#p-relatorios")); }
});
$("#relDemo").onclick = () => { entrarDemo(); showTab("relatorios"); };
$("#relLancar").onclick = () => { if (cfg) abrirLanc(null); };
