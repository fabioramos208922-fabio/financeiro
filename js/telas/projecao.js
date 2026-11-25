/* Aba Projeção. */
let horiz = "30";

function renderProj() {
  const itens = allItens(), vendas = med();
  const fim = horiz === "mes" ? endOfMonth(HOJE) : addDays(HOJE, Number(horiz));
  $$("#segHoriz button").forEach(b => b.setAttribute("aria-pressed", b.dataset.h === horiz));
  $("#alertProj").innerHTML = alertaHTML(itens, fim);
  $("#projNota").textContent = vendas
    ? `Inclui vendas médias de ${fmt(vendas.reduce((a, b) => a + b, 0) / 7)} por dia (dinheiro, Pix e débito), calculadas das últimas 4 semanas.`
    : "Só contas lançadas; vendas médias desligadas em Configurações.";
  desenharSaldo("#chartProj", serie(itens, cfg, HOJE, HOJE, fim, vendas), 320);

  const prev = itens.filter(l => l.status === "previsto" && l.data <= fim).sort((x, y) => x.data.localeCompare(y.data));
  const pagar = prev.filter(l => !ehEntrada(l)), receber = prev.filter(ehEntrada);
  $("#listPagar").innerHTML = pagar.map(liPrev).join("") || vazio("Nenhuma conta a pagar lançada nesse período.");
  $("#listReceber").innerHTML = receber.map(liPrev).join("") || vazio("Nada a receber lançado nesse período.");
  $("#totPagar").innerHTML = contar(soma(pagar));
  $("#totReceber").innerHTML = contar(soma(receber));
}

$("#segHoriz").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b || !cfg) return;
  horiz = b.dataset.h;
  renderProj();
  animar($("#p-projecao"));
});
