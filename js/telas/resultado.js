/* Aba Resultado do mês. */
function renderRes() {
  if (!cfg) return;
  if (!$("#resMes").value) $("#resMes").value = monthKey(HOJE);
  const mk = $("#resMes").value, itens = allItens(), ant = mesAnt(mk);
  const r = resumoMes(itens, mk), { ra, txt } = resumoComp(itens, mk), mesInteiro = resumoMes(itens, ant);
  const pct = r.entradas ? Math.round(r.margem / r.entradas * 100) : 0;
  $("#tilesRes").innerHTML =
    tile("Entradas", contar(r.entradas), `${delta(r.entradas, ra.entradas)} ${txt}${r.prevEntrada ? ` · ${fmt(r.prevEntrada)} a receber` : ""}`, "pos") +
    tile("Saídas", contar(r.saidas), `${delta(r.saidas, ra.saidas, true)} ${txt}${r.prevSaida ? ` · ${fmt(r.prevSaida)} a pagar` : ""}`, "neg") +
    tile(r.resultado >= 0 ? "Lucro" : "Prejuízo", contar(r.resultado), `${mesNome(ant)} inteiro: ${fmt(mesInteiro.resultado)}`, classeValor(r.resultado >= 0)) +
    tile("Margem de contribuição", contar(r.margem), r.entradas ? `${pct}% das entradas` : "");
  $("#barsSaida").innerHTML = bars(r.porCat, CATS);
  $("#barsEntrada").innerHTML = bars(r.porForma, FORMAS);
  $("#chartSem").innerHTML = chartSemanas(itens, mk);
}
$("#resMes").addEventListener("change", () => { renderRes(); animar($("#p-resultado"), true); });
