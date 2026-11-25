/* Saldo, projeção e resultado do mês. Funções puras: não acessam a tela nem o armazenamento. */
function signed(l) { return l.tipo === "entrada" ? l.valor : -l.valor; }

function soma(itens) { return itens.reduce((total, l) => total + l.valor, 0); }

/* Saldo realizado no fim do dia `ate`. */
function saldoRealizado(itens, cfg, ate) {
  let s = Number(cfg.saldoInicial) || 0;
  for (const l of itens) {
    if (l.status === "realizado" && l.data >= cfg.saldoData && l.data <= ate) s += signed(l);
  }
  return arred(s);
}

/* Média de vendas à vista por dia da semana nas últimas 4 semanas. */
function mediaVendas(itens, hoje) {
  const total = [0, 0, 0, 0, 0, 0, 0], ini = addDays(hoje, -28);
  for (const l of itens) {
    if (l.status === "realizado" && l.tipo === "entrada" && FORMAS_A_VISTA.includes(l.forma)
        && l.data >= ini && l.data < hoje) total[wd(l.data)] += l.valor;
  }
  return total.map(v => arred(v / 4));
}

/* Entradas por dia completo do mês (hoje só conta quando é dia 1º). */
function mediaEntradasDia(itens, hoje) {
  const dia = diaDoMes(hoje);
  const doMes = itens.filter(l => l.status === "realizado" && l.tipo === "entrada"
    && monthKey(l.data) === monthKey(hoje) && (dia === 1 ? l.data <= hoje : l.data < hoje));
  return soma(doMes) / Math.max(1, dia - 1);
}

/* Série diária de inicio a fim. Antes de hoje: realizado. De hoje em diante: projetado,
   com previstos vencidos contando hoje e as vendas médias a partir de amanhã. */
function serie(itens, cfg, hoje, inicio, fim, med) {
  const out = [];
  const base = saldoRealizado(itens, cfg, hoje);
  const futuros = itens
    .filter(l => l.status === "previsto" || (l.data > hoje && l.data >= cfg.saldoData))
    .map(l => ({ d: l.data < hoje ? hoje : l.data, v: signed(l) }));
  let vendas = 0;
  for (let d = inicio; d <= fim; d = addDays(d, 1)) {
    if (d < hoje) {
      out.push({ d, v: d < cfg.saldoData ? null : saldoRealizado(itens, cfg, d), proj: false });
      continue;
    }
    if (d > hoje && med) vendas += med[wd(d)] || 0;
    let v = base + vendas;
    for (const p of futuros) if (p.d <= d) v += p.v;
    out.push({ d, v: arred(v), proj: d > hoje });
  }
  return out;
}

function analisa(ser) {
  let min = null, primeiroNeg = null;
  for (const p of ser) {
    if (p.v === null) continue;
    if (min === null || p.v < min.v) min = p;
    if (p.v < 0 && !primeiroNeg) primeiroNeg = p;
  }
  return { min, primeiroNeg, fim: ser[ser.length - 1] };
}

function resumoMes(itens, mk) { return resumoItens(itens.filter(l => monthKey(l.data) === mk)); }

function resumoItens(itens) {
  const r = { entradas: 0, saidas: 0, porForma: {}, porCat: {}, prevEntrada: 0, prevSaida: 0 };
  for (const l of itens) {
    const entrada = l.tipo === "entrada";
    if (l.status === "previsto") {
      r[entrada ? "prevEntrada" : "prevSaida"] += l.valor;
      continue;
    }
    r[entrada ? "entradas" : "saidas"] += l.valor;
    const grupo = entrada ? r.porForma : r.porCat;
    const k = entrada ? l.forma || "outra" : l.cat || "variavel";
    grupo[k] = (grupo[k] || 0) + l.valor;
  }
  r.resultado = r.entradas - r.saidas;
  r.custoVar = CUSTO_VAR.reduce((a, k) => a + (r.porCat[k] || 0), 0);
  r.margem = r.entradas - r.custoVar;
  return r;
}
