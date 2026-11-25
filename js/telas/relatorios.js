/* Aba Relatórios: ano mês a mês, para imprimir ou levar ao contador. */
const COLUNAS_ANO = [["entradas", "Entradas"], ["variaveis", "Custos variáveis"], ["margem", "Margem"], ["fixas", "Custos fixos"], ["retirada", "Retiradas"], ["resultado", "Resultado"]];

function chartAno(meses, box) {
  const W = larguraGrafico(box), H = 260, L = 62, B = 28, T = 14;
  const max = Math.max(1, ...meses.flatMap(m => [m.entradas, m.saidas])), step = niceStep(max / 4), topo = Math.ceil(max / step) * step;
  const y = v => T + (H - T - B) * (1 - v / topo), gw = (W - L - 6) / 12, bw = Math.min(22, gw * 0.36);
  let g = "";
  for (let v = 0; v <= topo + 1e-6; v += step) g += `<line x1="${L}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" class="${v ? "grade" : "zero"}"/>` + textoSVG(L - 8, y(v) + 4, compact(v), { anchor: "end" });
  meses.forEach((m, i) => {
    const cx = L + gw * (i + 0.5);
    const barra = (x, v, cor, nome) => `<rect class="coluna" x="${x}" y="${y(v)}" width="${bw}" height="${y(0) - y(v)}" rx="3" fill="${cor}"><title>${nome} em ${mesNome(m.mk)}: ${fmt(v)}</title></rect>`;
    g += barra(cx - bw - 1, m.entradas, "var(--in-fill)", "Entradas") + barra(cx + 1, m.saidas, "var(--out-fill)", "Saídas") + textoSVG(cx, H - 8, W < 420 ? MESES[i][0].toUpperCase() : MESES[i]);
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Entradas e saídas por mês">${g}</svg>`;
}

function renderRelatorios() {
  const itens = allItens(), sel = $("#relAno");
  const anos = [...new Set([HOJE.slice(0, 4), ...itens.map(l => l.data.slice(0, 4))])].sort().reverse();
  const ano = anos.includes(sel.value) ? sel.value : HOJE.slice(0, 4);
  sel.innerHTML = anos.map(a => `<option ${a === ano ? "selected" : ""}>${a}</option>`).join("");
  const { meses, total } = resumoAno(itens, ano);
  const comMov = meses.filter(m => m.entradas || m.saidas);
  $("#relTitulo").textContent = `${cfg.nome || "Meu negócio"} · ${ano}`;
  $("#tilesRel").innerHTML = tile("Entradas no ano", contar(total.entradas), "", "pos") + tile("Saídas no ano", contar(total.saidas), "", "neg")
    + tile("Resultado no ano", contar(total.resultado), total.entradas ? `${Math.round(total.resultado / total.entradas * 100)}% das entradas` : "", classeValor(total.resultado >= 0))
    + tile("Média por mês", contar(comMov.length ? total.resultado / comMov.length : 0), `resultado em ${comMov.length} ${comMov.length === 1 ? "mês" : "meses"} com movimento`);
  $("#chartAno").innerHTML = chartAno(meses, $("#chartAno"));

  const linha = (m, nome, cls) => `<tr class="${cls}"><td>${nome}</td>${COLUNAS_ANO.map(([k]) => `<td class="r num ${k === "resultado" && m[k] ? classeValor(m[k] >= 0) : ""}">${m[k] ? fmt(m[k]) : "—"}</td>`).join("")}</tr>`;
  $("#tbAno").innerHTML = `<thead><tr><th>Mês</th>${COLUNAS_ANO.map(c => `<th class="r">${c[1]}</th>`).join("")}</tr></thead><tbody>`
    + meses.map(m => linha(m, mesNome(m.mk), "")).join("") + linha(total, "Total", "day") + "</tbody>";

  const porContato = tipo => {
    const mapa = {};
    for (const l of itens) {
      const c = l.status === "realizado" && l.tipo === tipo && l.data.startsWith(ano) && contatoDe(l);
      if (c) mapa[c.nome] = (mapa[c.nome] || 0) + l.valor;
    }
    return Object.fromEntries(Object.entries(mapa).sort((a, b) => b[1] - a[1]).slice(0, 8));
  };
  $("#topClientes").innerHTML = bars(porContato("entrada"), {}, {});
  $("#topFornec").innerHTML = bars(porContato("saida"), {}, {});
}

$("#relAno").addEventListener("change", () => { if (cfg) { renderRelatorios(); animar($("#p-relatorios")); } });
$("#btnImprimir").onclick = () => window.print();
$("#btnCSVAno").onclick = () => {
  if (!cfg) return;
  const ano = $("#relAno").value, { meses, total } = resumoAno(allItens(), ano);
  const linhas = [["mes", ...COLUNAS_ANO.map(c => c[1])], ...[...meses, total].map(m => [m.mk, ...COLUNAS_ANO.map(([k]) => m[k])])];
  baixarArquivo(`caixa-certo-${ano}.csv`, "﻿" + montarCSV(linhas), "text/csv");
};
