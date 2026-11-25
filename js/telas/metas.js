/* Aba Metas: faturamento, lucro, orçamento por categoria e saúde do caixa. */
const COR_ESTADO = { ok: "var(--in-fill)", warn: "#d99a1c", bad: "var(--out-fill)" };

function barraMeta(nome, valor, limite, nota, estado) {
  const pct = limite ? Math.round(valor / limite * 100) : 0;
  return `<div class="meta"><div class="meta-h"><b>${nome}</b><span class="num">${fmt(valor)} <span class="muted">de ${fmt(limite)}</span></span></div>
    <div class="meta-tr" role="progressbar" aria-label="${nome}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.max(0, Math.min(100, pct))}"><span style="width:${Math.max(0, Math.min(100, pct))}%;background:${COR_ESTADO[estado]}"></span></div>
    <span class="small muted">${pct}% · ${nota}</span></div>`;
}

function renderMetas() {
  const itens = allItens(), metas = cfg.metas || {}, a = andamentoMetas(itens, metas, HOJE);
  const saldo = saldoRealizado(itens, cfg, HOJE), folego = diasDeFolego(itens, saldo, HOJE), pe = pontoEquilibrio(a.r);
  $("#tilesMetas").innerHTML =
    tile("Neste ritmo, o mês fecha em", contar(a.ritmo), "entradas até agora projetadas para o mês") +
    tile("Ponto de equilíbrio", pe === null ? "—" : contar(pe), pe === null ? "precisa de vendas com margem positiva" : a.r.entradas >= pe ? "já passou: cobriu os custos fixos pagos" : `faltam ${fmt(pe - a.r.entradas)} para cobrir os custos fixos pagos`) +
    tile("Fôlego do caixa", folego === null ? "—" : `${folego} ${folego === 1 ? "dia" : "dias"}`, "se parasse de entrar dinheiro hoje", folego !== null && folego < 15 ? "neg" : "");

  let html = "";
  if (metas.faturamento > 0) {
    const ok = a.r.entradas >= metas.faturamento;
    html += barraMeta("Entradas do mês", a.r.entradas, metas.faturamento, ok ? "meta batida!" : `precisa de ${fmt(a.faltaPorDia)} por dia até o fim do mês`, ok || a.ritmo >= metas.faturamento ? "ok" : "warn");
  }
  if (metas.lucro > 0) html += barraMeta("Lucro do mês", a.r.resultado, metas.lucro, a.r.resultado >= metas.lucro ? "meta batida!" : `faltam ${fmt(metas.lucro - a.r.resultado)}`, a.r.resultado >= metas.lucro ? "ok" : a.r.resultado < 0 ? "bad" : "warn");
  $("#metasMes").innerHTML = html || vazio("Nenhuma meta definida ainda. Clique em Definir metas.");
  $("#metasOrc").innerHTML = a.orcamento.map(o => barraMeta(CATS[o.k], o.gasto, o.limite,
    o.estado === "bad" ? `passou ${fmt(o.gasto - o.limite)} do limite`
      : o.estado === "warn" ? `com ${fmt(o.previsto)} a pagar, vai passar do limite`
        : `sobram ${fmt(o.limite - o.gasto - o.previsto)}${o.previsto ? ` depois de pagar ${fmt(o.previsto)}` : ""}`, o.estado)).join("")
    || vazio("Defina um limite de gasto por categoria para ser avisado antes de estourar.");
}

function abrirMetas() {
  const m = cfg.metas || {}, orc = m.orcamento || {};
  const campo = (id, nome, v) => `<div class="f"><label for="${id}">${nome}</label><input type="text" inputmode="decimal" id="${id}" value="${v ? fmtCampo(v) : ""}" placeholder="sem meta"></div>`;
  $("#mtCampos").innerHTML = campo("mtFat", "Entradas no mês (R$)", m.faturamento) + campo("mtLucro", "Lucro no mês (R$)", m.lucro)
    + `<h3 class="full">Limite de gasto por mês</h3>` + Object.entries(CATS).map(([k, v]) => campo("mtOrc-" + k, v, orc[k])).join("");
  abrirModal("#mdMetas", "#mtFat");
}

$("#btnMetas").onclick = () => { if (cfg) abrirMetas(); };
$("#mtCancelar").onclick = () => fecharModal("#mdMetas");
$("#fmMetas").addEventListener("submit", e => {
  e.preventDefault();
  let invalido = false;
  const ler = id => {
    const txt = $("#" + id).value.trim();
    if (!txt) return 0;
    const v = parseBR(txt);
    if (!(v >= 0)) invalido = true;
    return arred(v);
  };
  const orcamento = {};
  for (const k of Object.keys(CATS)) { const v = ler("mtOrc-" + k); if (v) orcamento[k] = v; }
  const metas = { faturamento: ler("mtFat"), lucro: ler("mtLucro"), orcamento };
  if (invalido) { toast("Confira os valores. Exemplo: 1.500,00"); return; }
  cfg.metas = metas;
  persist("cfg");
  fecharModal("#mdMetas");
  render();
  toast("Metas salvas");
});

/* ---------- avisos da aba Hoje ---------- */
function renderAvisos() {
  const itens = allItens(), prev = itens.filter(l => l.status === "previsto"), avisos = [];
  const conta = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const add = (cls, txt, aba, rotuloBotao) => avisos.push(`<div class="aviso ${cls}"><span>${txt}</span><button class="btn sm" data-goto="${aba}">${rotuloBotao}</button></div>`);
  const pagarAtraso = prev.filter(l => !ehEntrada(l) && l.data < HOJE), receberAtraso = prev.filter(l => ehEntrada(l) && l.data < HOJE);
  const hoje = prev.filter(l => !ehEntrada(l) && l.data === HOJE);
  if (pagarAtraso.length) add("bad", `<b>${conta(pagarAtraso.length, "conta atrasada", "contas atrasadas")}</b>: ${fmt(soma(pagarAtraso))}`, "projecao", "Ver contas");
  if (hoje.length) add("warn", `<b>${conta(hoje.length, "conta vence", "contas vencem")} hoje</b>: ${fmt(soma(hoje))}`, "projecao", "Ver contas");
  if (receberAtraso.length) add("warn", `<b>${conta(receberAtraso.length, "recebimento atrasado", "recebimentos atrasados")}</b>: ${fmt(soma(receberAtraso))}`, "contatos", "Cobrar");
  for (const o of andamentoMetas(itens, cfg.metas, HOJE).orcamento) {
    if (o.estado !== "ok") add(o.estado, `<b>${CATS[o.k]}</b> ${o.estado === "bad" ? "passou do limite do mês" : "vai passar do limite do mês"}`, "metas", "Ver limite");
  }
  if (!demo && modoLocal && itens.length >= 10 && (!cfg.backupEm || cfg.backupEm < addDays(HOJE, -30))) {
    add("warn", "<b>Faça um backup</b>: seus dados estão só neste navegador", "config", "Fazer backup");
  }
  $("#avisosCard").hidden = !avisos.length;
  $("#avisos").innerHTML = avisos.join("");
}
