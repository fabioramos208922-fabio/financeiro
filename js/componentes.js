/* Pedaços de interface usados por várias telas. */
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("on"), 3400);
}

/* ---------- modais ---------- */
const focoAnterior = {};
function abrirModal(sel, foco) {
  focoAnterior[sel] = document.activeElement;
  $(sel).classList.add("on");
  if (foco) setTimeout(() => $(foco).focus(), 30);
}

function fecharModal(sel) {
  if (!$(sel).classList.contains("on")) return;
  $(sel).classList.remove("on");
  if (focoAnterior[sel] && focoAnterior[sel].isConnected) focoAnterior[sel].focus();
}

$$(".modal-bg").forEach(m => m.addEventListener("mousedown", e => { if (e.target === m) fecharModal("#" + m.id); }));

document.addEventListener("keydown", e => {
  const aberto = $$(".modal-bg.on").pop();
  if (!aberto) return;
  if (e.key === "Escape") { fecharModal("#" + aberto.id); return; }
  if (e.key !== "Tab") return;
  // Mantém o foco do teclado dentro do modal.
  const focaveis = [...aberto.querySelectorAll("button,input,select")].filter(x => x.offsetWidth && !x.disabled);
  const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
  const atual = document.activeElement, fora = !aberto.contains(atual);
  if (e.shiftKey && (fora || atual === primeiro)) { e.preventDefault(); ultimo.focus(); }
  else if (!e.shiftKey && (fora || atual === ultimo)) { e.preventDefault(); primeiro.focus(); }
});

let aoConfirmar = null, aoExtra = null;
/* extra: segunda opção, {texto, cb}. */
function confirmar(titulo, texto, cb, extra) {
  aoExtra = extra ? extra.cb : null;
  $("#cfExtra").hidden = !extra;
  $("#cfExtra").textContent = extra ? extra.texto : "";
  $("#cfSim").textContent = extra ? "Só este" : "Confirmar";
  $("#cfTitulo").textContent = titulo;
  $("#cfTexto").textContent = texto;
  aoConfirmar = cb;
  abrirModal("#mdConf", "#cfNao");
}
$("#cfNao").onclick = () => fecharModal("#mdConf");
$("#cfSim").onclick = () => { fecharModal("#mdConf"); if (aoConfirmar) aoConfirmar(); };

$("#cfExtra").onclick = () => { fecharModal("#mdConf"); if (aoExtra) aoExtra(); };

function baixarArquivo(nome, conteudo, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------- lançamentos ---------- */
const ehEntrada = l => l.tipo === "entrada";
const corDe = l => (ehEntrada(l) ? COR_FORMA[l.forma] : COR_CAT[l.cat]) || COR_NEUTRA;
const rotulo = l => (ehEntrada(l) ? FORMAS[l.forma] || "Sem forma" : CATS[l.cat] || "Sem categoria");
const classeValor = positivo => (positivo ? "pos" : "neg");
const fmtSinal = v => `${v >= 0 ? "+" : "−"} ${fmt(Math.abs(v))}`;
const quadrado = cor => `<i class="dot" style="background:${cor}"></i>`;
const vazio = txt => `<p class="empty">${txt}</p>`;

function chipCls(l) { return `<span class="chip">${quadrado(corDe(l))}${rotulo(l)}</span>`; }

function botaoBaixa(l) {
  return `<button class="btn sm" data-baixa="${esc(l.id)}">${ehEntrada(l) ? "Recebi" : "Paguei"}</button>`;
}

/* Linha de uma conta prevista. */
function liPrev(l) {
  const atras = l.data < HOJE;
  return `<div class="li">
    <span class="cal ${atras ? "late" : ""}"><b>${l.data.slice(8, 10)}</b><span>${atras ? "atras." : SEM[wd(l.data)]}</span></span>
    <span><span class="t1">${esc(l.desc || rotulo(l))}</span><span class="t2">${quadrado(corDe(l))}${rotulo(l)}${nomeContato(l) ? " · " + esc(nomeContato(l)) : ""}</span></span>
    <span class="num amt ${classeValor(ehEntrada(l))}">${fmtSinal(signed(l))}</span>
    ${botaoBaixa(l)}</div>`;
}

/* ---------- indicadores ---------- */
function tile(titulo, valor, nota, cls) {
  return `<div class="tile"><span class="lb">${titulo}</span><span class="v ${cls || ""}">${valor}</span>${nota ? `<span class="s">${nota}</span>` : ""}</div>`;
}

function delta(atual, ant, inverso) {
  if (!ant) return "";
  const p = Math.round((atual - ant) / Math.abs(ant) * 100);
  if (!isFinite(p)) return "";
  const bom = inverso ? p <= 0 : p >= 0;
  return `<span class="delta ${bom ? "up" : "down"}">${p > 0 ? "+" : ""}${p}%</span>`;
}

/* Resumo do mês anterior. No mês corrente compara só até o mesmo dia. */
function resumoComp(itens, mk) {
  const ant = mesAnt(mk);
  if (mk !== monthKey(HOJE)) return { ra: resumoMes(itens, ant), txt: "vs " + mesNome(ant) };
  const dia = diaDoMes(HOJE);
  return {
    ra: resumoMes(itens.filter(l => diaDoMes(l.data) <= dia), ant),
    txt: "vs 1 a " + dia + " de " + mesNome(ant),
  };
}

/* ---------- situação do caixa ---------- */
const med = () => (cfg.projVendas === false ? null : mediaVendas(allItens(), HOJE));

function situacao(itens, fim) {
  const ser = serie(itens, cfg, HOJE, HOJE, fim, med()), a = analisa(ser);
  const apertado = a.min && a.fim && a.min.v < Math.max(a.fim.v * 0.15, 500) && a.min.d !== HOJE;
  return { ser, a, estado: a.primeiroNeg ? "bad" : apertado ? "warn" : "ok" };
}

function alerta(tipo, icone, titulo, html) {
  return `<div class="alert ${tipo}"><span class="ic">${icone}</span><div><b class="t">${titulo}</b>${html}</div></div>`;
}

function alertaHTML(itens, fim) {
  const { a, estado } = situacao(itens, fim);
  const ate = fim === endOfMonth(HOJE) ? "até o fim do mês" : "até " + dLong(fim);
  const forte = (v, cls = "") => `<b class="num ${cls}">${fmt(v)}</b>`;

  if (estado === "bad") {
    const contas = itens.filter(l => l.status === "previsto" && !ehEntrada(l) && l.data <= a.min.d)
      .sort((x, y) => y.valor - x.valor).slice(0, 3)
      .map(l => `<b>${esc(l.desc || rotulo(l))}</b> ${fmt(l.valor)} (${dBR(l.data)})`).join(" · ");
    const dicas = ["Vender mais / fazer uma promoção", "Cobrar quem deve (fiado)", "Negociar prazo com fornecedor", "Adiar retirada do dono"];
    return alerta("bad", "!", `Não vai dar ${ate}.`,
      `No dia ${dLong(a.primeiroNeg.d)} o caixa fica negativo e chega a ${forte(a.min.v, "neg")} em ${dLong(a.min.d)}. Para cobrir, precisa entrar mais ${forte(-a.min.v)} até lá.
      ${contas ? `<div class="small" style="margin-top:6px">Maiores contas até essa data: ${contas}</div>` : ""}
      <div class="acts">${dicas.map(d => `<span class="chip">${d}</span>`).join("")}</div>`);
  }
  if (estado === "warn") {
    return alerta("info", "~", `Vai dar, mas fica apertado ${ate}.`,
      `O menor saldo previsto é ${forte(a.min.v)} em ${dLong(a.min.d)}. No fim do período o caixa fica com ${forte(a.fim.v)}.`);
  }
  return alerta("ok", "✓", `Vai dar certo ${ate}.`,
    `Pagando tudo o que está previsto${cfg.projVendas === false ? "" : " e vendendo na média"}, o caixa termina com ${forte(a.fim ? a.fim.v : 0, "pos")}. O menor saldo do período é ${fmt(a.min ? a.min.v : 0)}.`);
}
