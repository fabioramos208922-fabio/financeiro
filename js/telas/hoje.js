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

  $("#hero").innerHTML = `
    <div class="first"><span class="lb">Saldo hoje · ${SEM_L[wd(HOJE)]}, ${dLong(HOJE)}</span>
      <span class="big num ${neg(saldo)}">${contar(saldo)}</span>
      <span class="s">Caixa + banco, com tudo o que já foi lançado</span><div style="margin-top:8px">${PILULAS[estado]}</div></div>
    <div><span class="lb">Previsão para ${dLong(fimMes)}</span>
      <span class="mid num ${neg(vFim)}">${contar(vFim)}</span>
      <span class="s">${r.prevSaida ? fmt(r.prevSaida) + " a pagar" : "nada a pagar"} · ${r.prevEntrada ? fmt(r.prevEntrada) + " a receber" : "nada a receber"} no mês</span></div>
    <div><span class="lb">Menor saldo nos próximos 30 dias</span>
      <span class="mid num ${neg(min.v)}">${contar(min.v)}</span>
      <span class="s">em ${SEM_L[wd(min.d)]}, ${dLong(min.d)}</span>
      <button class="btn sm" data-goto="projecao" style="margin-top:8px;width:max-content">Ver projeção</button></div>`;
  $("#alertHoje").innerHTML = p30.estado === "bad" ? alertaHTML(itens, em30) : "";

  const pct = r.entradas ? Math.round(r.margem / r.entradas * 100) : 0;
  $("#tilesHoje").innerHTML =
    tile("Entrou em " + mesNome(mk), contar(r.entradas), delta(r.entradas, ra.entradas) + " " + txt, "pos") +
    tile("Saiu em " + mesNome(mk), contar(r.saidas), delta(r.saidas, ra.saidas, true) + " " + txt, "neg") +
    tile(r.resultado >= 0 ? "Lucro do mês até agora" : "Prejuízo do mês até agora", contar(r.resultado), `margem de contribuição ${pct}%`, classeValor(r.resultado >= 0)) +
    tile("Entrada média por dia", contar(mediaEntradasDia(itens, HOJE)), "melhor dia: " + melhorDia());

  const ini = mk + "-01";
  desenharSaldo("#chartHoje", serie(itens, cfg, HOJE, ini < cfg.saldoData ? cfg.saldoData : ini, fimMes, med()), 290);

  const prox = itens.filter(l => l.status === "previsto" && l.data <= addDays(HOJE, 7)).sort((x, y) => x.data.localeCompare(y.data));
  $("#proximos").innerHTML = prox.map(liPrev).join("")
    || vazio('Nada previsto para os próximos 7 dias. Lance contas a pagar e a receber em "+ Lançar", escolhendo "Vai acontecer".');
}
