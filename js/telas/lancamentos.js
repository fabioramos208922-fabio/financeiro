/* Aba Lançamentos e formulário de lançamento. */
function linhaLanc(l) {
  const previsto = l.status === "previsto", entrada = ehEntrada(l);
  return `<tr class="${previsto ? "prev" : ""}">
    <td>${esc(l.desc || "—")}${l.parcela ? ` <span class="chip mut">${esc(l.parcela)}</span>` : ""}${nomeContato(l) ? `<br><span class="small muted">${esc(nomeContato(l))}</span>` : ""}${l.origem === "extrato" ? ' <span class="chip mut">extrato</span>' : ""}</td>
    <td>${chipCls(l)}</td>
    <td>${previsto ? `<span class="chip warn">${entrada ? "a receber" : "a pagar"}</span>` : '<span class="small muted">feito</span>'}</td>
    <td class="r num ${classeValor(entrada)}" style="font-weight:600;white-space:nowrap">${fmtSinal(signed(l))}</td>
    <td class="r" style="white-space:nowrap">${previsto ? botaoBaixa(l) + " " : ""}<button class="btn sm ghost" data-edit="${esc(l.id)}">Editar</button></td></tr>`;
}

function renderLanc() {
  if (!cfg) return;
  if (!$("#flMes").value) $("#flMes").value = monthKey(HOJE);
  const mk = $("#flMes").value, tipo = $("#flTipo").value, status = $("#flStatus").value, busca = norm($("#flBusca").value), cat = $("#flCat").value;
  const list = allItens()
    .filter(l => monthKey(l.data) === mk && (!tipo || l.tipo === tipo) && (!status || l.status === status) && (!cat || (ehEntrada(l) ? "e-" + l.forma : "s-" + l.cat) === cat) && (!busca || norm(l.desc + " " + nomeContato(l)).includes(busca)))
    .sort((a, b) => b.data.localeCompare(a.data) || a.tipo.localeCompare(b.tipo));
  const porDia = {};
  for (const l of list) porDia[l.data] = (porDia[l.data] || 0) + signed(l);

  let html = "", dia = null;
  for (const l of list) {
    if (l.data !== dia) {
      dia = l.data;
      const v = porDia[dia];
      html += `<tr class="day"><td colspan="3">${SEM_L[wd(dia)]}, ${dLong(dia)}${dia === HOJE ? " · hoje" : ""}</td><td class="r ${classeValor(v >= 0)}">${fmtSinal(v)}</td><td></td></tr>`;
    }
    html += linhaLanc(l);
  }
  $("#tbLanc").innerHTML = html || `<tr><td colspan="5" class="empty">Nenhum lançamento neste mês com esses filtros.</td></tr>`;

  const e = soma(list.filter(ehEntrada)), s = soma(list.filter(l => !ehEntrada(l)));
  $("#lancTot").innerHTML = tile("Lançamentos", list.length, "no filtro atual") + tile("Entradas", contar(e), "", "pos")
    + tile("Saídas", contar(s), "", "neg") + tile("Diferença", contar(e - s), "", classeValor(e - s >= 0));
}

const opcoesFiltro = (pre, o) => Object.entries(o).map(([k, v]) => `<option value="${pre}-${k}">${v}</option>`).join("");
$("#flCat").innerHTML = `<option value="">Todas</option><optgroup label="Entradas">${opcoesFiltro("e", FORMAS)}</optgroup><optgroup label="Saídas">${opcoesFiltro("s", CATS)}</optgroup>`;
["#flMes", "#flTipo", "#flStatus", "#flCat"].forEach(s => $(s).addEventListener("change", renderLanc));
$("#flBusca").addEventListener("input", renderLanc);

/* ---------- formulário ---------- */
let edit = null, mTipo = "entrada", mStatus = "realizado";

function atualizarForm() {
  const sel = $("#lnClass"), opcoes = mTipo === "entrada" ? FORMAS : CATS, atual = sel.value;
  sel.innerHTML = Object.entries(opcoes).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
  if (opcoes[atual]) sel.value = atual;
  $("#lnClassLb").textContent = mTipo === "entrada" ? "Forma de recebimento" : "Categoria da despesa";
  $$("#segTipo button").forEach(b => b.setAttribute("aria-pressed", b.dataset.t === mTipo));
  $$("#segStatus button").forEach(b => b.setAttribute("aria-pressed", b.dataset.s === mStatus));
  $("#lnRepWrap").style.display = mStatus === "previsto" && !edit ? "" : "none";
  atualizarDica();
}

function atualizarDica() {
  const v = $("#lnClass").value;
  let t = "";
  if (mTipo === "entrada" && v === "credito") t = 'Venda no crédito: o dinheiro costuma cair dias depois. Para a projeção ficar certa, lance como "Vai acontecer" na data em que a maquininha repassa.';
  else if (mTipo === "entrada" && v === "fiado" && mStatus === "realizado") t = "Use quando alguém paga uma venda feita antes (fiado). Entra no caixa na data informada.";
  else if (mStatus === "previsto") t = mTipo === "entrada"
    ? 'Fica como "a receber". Quando o dinheiro entrar, clique em Recebi ou importe o extrato, que dá baixa sozinho.'
    : 'Fica como "a pagar". Quando pagar, clique em Paguei ou importe o extrato, que dá baixa sozinho.';
  if (demo) t = (t + " Na demonstração, o lançamento aparece mas não é salvo.").trim();
  $("#lnDica").textContent = t;
}

/* Outros previstos da mesma repetição, a partir desta data. */
function proximosDaSerie(l) {
  if (!l.grupo) return [];
  return allItens().filter(x => x.grupo === l.grupo && x.id !== l.id && x.status === "previsto" && x.data >= l.data);
}

function abrirLanc(l) {
  edit = l || null;
  mTipo = l ? l.tipo : "entrada";
  mStatus = l ? l.status : "realizado";
  $("#mdTitulo").textContent = l ? "Editar lançamento" : "Novo lançamento";
  $("#lnValor").value = l ? fmtCampo(l.valor) : "";
  $("#lnData").value = l ? l.data : HOJE;
  $("#lnDesc").value = (l && l.desc) || "";
  $("#lnRep").value = "1";
  $("#lnContato").value = l ? nomeContato(l) : "";
  $("#lnTodos").checked = false;
  $("#lnTodosWrap").hidden = !l || !proximosDaSerie(l).length;
  $("#lnParte").hidden = !l || l.status !== "previsto";
  $("#lnParte").textContent = l && ehEntrada(l) ? "Recebi uma parte" : "Paguei uma parte";
  atualizarForm();
  if (l) $("#lnClass").value = (ehEntrada(l) ? l.forma : l.cat) || $("#lnClass").value;
  atualizarDica();
  $("#lnExcluir").hidden = !l;
  abrirModal("#mdLanc", "#lnValor");
}

function salvarLanc(e) {
  e.preventDefault();
  const valor = arred(Math.abs(parseBR($("#lnValor").value))), data = $("#lnData").value;
  if (!valor) { toast("Digite um valor válido, por exemplo 150,00"); return; }
  if (!data) { toast("Escolha a data"); return; }
  if (mStatus === "realizado" && data > HOJE) { toast('Essa data ainda não chegou. Escolha "Vai acontecer" ou mude a data.'); return; }

  const { forma, cat, contatoId, ...resto } = edit || { origem: "manual", criado: Date.now() };
  const base = { ...resto, tipo: mTipo, status: mStatus, valor, desc: $("#lnDesc").value.trim() };
  base[mTipo === "entrada" ? "forma" : "cat"] = $("#lnClass").value;
  const contato = contatoPorNome($("#lnContato").value, mTipo === "entrada" ? "cliente" : "fornecedor");
  if (contato) base.contatoId = contato.id;
  if (edit) {
    const proximos = $("#lnTodos").checked ? proximosDaSerie(edit) : [];
    removeItem(edit.id);
    saveItem({ ...base, data });
    for (const p of proximos) {
      saveItem({ ...base, id: p.id, data: p.data, status: p.status, criado: p.criado, parcela: p.parcela });
    }
    toast(proximos.length ? `${proximos.length + 1} lançamentos atualizados` : "Lançamento atualizado");
  } else {
    const lista = gerarRepeticoes(mStatus === "previsto" ? $("#lnRep").value : "1", data, valor);
    const grupo = lista.length > 1 ? uid() : undefined;
    for (const x of lista) saveItem({ ...base, ...x, id: uid(), grupo });
    toast(lista.length > 1 ? `${lista.length} lançamentos criados, de ${dBRy(data)} a ${dBRy(lista[lista.length - 1].data)}` : "Lançamento salvo");
  }
  fecharModal("#mdLanc");
  render();
}

$("#segTipo").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (b) { mTipo = b.dataset.t; atualizarForm(); }
});
$("#segStatus").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (b) { mStatus = b.dataset.s; atualizarForm(); }
});
$("#lnClass").addEventListener("change", atualizarDica);
$("#lnCancelar").onclick = () => fecharModal("#mdLanc");
$("#fmLanc").addEventListener("submit", salvarLanc);
$("#btnNovo").onclick = () => { if (cfg) abrirLanc(null); else toast("Carregando…"); };
$("#lnExcluir").onclick = () => {
  if (!edit) return;
  const l = edit, proximos = proximosDaSerie(l);
  const extra = proximos.length && { texto: `Este e os próximos ${proximos.length}`, cb: () => {
    [l, ...proximos].forEach(x => removeItem(x.id));
    fecharModal("#mdLanc");
    render();
    toast(`${proximos.length + 1} lançamentos excluídos`);
  } };
  confirmar("Excluir lançamento?", `"${l.desc || rotulo(l)}" de ${fmt(l.valor)} será apagado.`, () => {
    removeItem(l.id);
    fecharModal("#mdLanc");
    render();
    toast("Lançamento excluído");
  }, extra);
};

/* ---------- baixa parcial ---------- */
let parteDe = null;
$("#lnParte").onclick = () => {
  parteDe = edit;
  if (!parteDe) return;
  fecharModal("#mdLanc");
  $("#ptTitulo").textContent = ehEntrada(parteDe) ? "Recebi uma parte" : "Paguei uma parte";
  $("#ptTexto").textContent = `${parteDe.desc || rotulo(parteDe)}: ${fmt(parteDe.valor)} em aberto. O que faltar continua previsto.`;
  $("#ptValor").value = "";
  abrirModal("#mdParte", "#ptValor");
};
$("#ptCancelar").onclick = () => fecharModal("#mdParte");
$("#fmParte").addEventListener("submit", e => {
  e.preventDefault();
  const l = parteDe && findItem(parteDe.id), v = arred(parseBR($("#ptValor").value));
  if (!l || l.status !== "previsto") { fecharModal("#mdParte"); return; }
  if (!(v > 0) || v >= l.valor) { toast(`Digite um valor maior que zero e menor que ${fmt(l.valor)}`); return; }
  const { feito, resto } = dividirBaixa(l, v, HOJE, uid());
  saveItem(resto);
  saveItem(feito);
  fecharModal("#mdParte");
  render();
  toast(`Registrado. Ainda faltam ${fmt(resto.valor)}`);
});
