/* Aba Hoje. */
const PILULAS = {
  ok: '<span class="pill ok"><i></i>Caixa saudável</span>',
  warn: '<span class="pill warn"><i></i>Atenção</span>',
  bad: '<span class="pill bad"><i></i>Vai faltar dinheiro</span>',
};

function melhorDia() {
  const m = mediaVendas(allItens(), HOJE), maior = Math.max(...m);
  return maior ? SEM_L[m.indexOf(maior)] : "—";
}

function renderHoje() {
  const itens = allItens(), mk = monthKey(HOJE), fimMes = endOfMonth(HOJE), em30 = addDays(HOJE, 30);
  const r = resumoMes(itens, mk), { ra, txt } = resumoComp(itens, mk);
  const saldo = saldoRealizado(itens, cfg, HOJE);
  const mes = situacao(itens, fimMes), p30 = situacao(itens, em30);
  const estados = [p30.estado, mes.estado];
  const estado = estados.includes("bad") ? "bad" : estados.includes("warn") ? "warn" : "ok";
  const { min } = p30.a, vFim = mes.a.fim.v;
  const neg = v => (v < 0 ? "neg" : "");

  const dif = arred(vFim - saldo);
  $("#hero").innerHTML = `
    <div class="saldo"><span class="lb">Saldo hoje</span>
      <span class="big num ${neg(saldo)} ${fmt(saldo).length > 13 ? "longo" : ""}">${contar(saldo)}</span>
      <span class="s">${SEM_L[wd(HOJE)]}, ${dLong(HOJE)} · caixa + banco</span>${PILULAS[estado]}</div>
    <div class="linhas">
      <div class="linha-info"><span><span class="lb">Previsão para ${dLong(fimMes)}</span><span class="s">${dif ? (dif > 0 ? "▲ " : "▼ ") + fmt(Math.abs(dif)) + (dif > 0 ? " a mais" : " a menos") : "igual a hoje"}</span></span><span class="mid num ${neg(vFim)}">${contar(vFim)}</span></div>
      <div class="linha-info"><span><span class="lb">Menor saldo em 30 dias</span><span class="s">${min.d === HOJE ? "hoje" : SEM_L[wd(min.d)] + ", " + dLong(min.d)}</span></span><span class="mid num ${neg(min.v)}">${contar(min.v)}</span></div>
      <div class="linha-info"><span><span class="lb">Contas até o fim do mês</span><span class="s">a pagar · a receber</span></span><span class="num par">${fmt(r.prevSaida)}<br>${fmt(r.prevEntrada)}</span></div>
    </div>
    <button class="btn" data-goto="projecao">Ver projeção completa</button>`;
  $("#alertHoje").innerHTML = p30.estado === "bad" ? alertaHTML(itens, em30) : "";

  const pct = r.entradas ? Math.round(r.margem / r.entradas * 100) : 0;
  $("#tilesHoje").innerHTML =
    tile("Entrou em " + mesNome(mk), contar(r.entradas), delta(r.entradas, ra.entradas) + " " + txt, "pos") +
    tile("Saiu em " + mesNome(mk), contar(r.saidas), delta(r.saidas, ra.saidas, true) + " " + txt, "neg") +
    tile(r.resultado >= 0 ? "Lucro do mês até agora" : "Prejuízo do mês até agora", contar(r.resultado), `margem de contribuição ${pct}%`, classeValor(r.resultado >= 0)) +
    tile("Entrada média por dia", contar(mediaEntradasDia(itens, HOJE)), "melhor dia: " + melhorDia());

  const ini = mk + "-01" < cfg.saldoData ? cfg.saldoData : mk + "-01";
  // com poucos dias no mês, mostra também as próximas duas semanas
  const curto = addDays(ini, 13) > fimMes, fimGraf = curto ? addDays(HOJE, 14) : fimMes;
  $("#tituloGrafico").textContent = curto ? "Saldo nos próximos dias" : "Saldo dia a dia neste mês";
  $("#notaGrafico").textContent = `${dLong(ini)} a ${dLong(fimGraf)}`;
  desenharSaldo("#chartHoje", serie(itens, cfg, HOJE, ini, fimGraf, med()), 340);

  const prox = itens.filter(l => l.status === "previsto" && l.data <= addDays(HOJE, 7)).sort((x, y) => x.data.localeCompare(y.data));
  $("#proximos").innerHTML = prox.map(liPrev).join("")
    || vazio('Nada previsto para os próximos 7 dias. Lance contas a pagar e a receber em "+ Lançar", escolhendo "Vai acontecer".');
}
