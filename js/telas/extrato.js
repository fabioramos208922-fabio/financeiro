/* Aba Importar extrato. */
let imp = [];

function limparImportacao() { imp = []; $("#impCard").hidden = true; }

const drop = $("#drop");
["dragover", "dragenter"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => { const f = e.dataTransfer.files[0]; if (f) lerArquivo(f); });
$("#fileIn").addEventListener("change", e => { const f = e.target.files[0]; if (f) lerArquivo(f); e.target.value = ""; });

function extrairLinhas(nome, txt) {
  if (/\.pdf$/i.test(nome)) return { rows: [], erro: "PDF ainda não é aceito. Baixe o extrato em OFX ou CSV no app do banco." };
  if (!/<OFX>|<STMTTRN>/i.test(txt)) return parseCSV(txt);
  const rows = parseOFX(txt);
  return { rows, erro: rows.length ? null : "Não achei movimentações nesse OFX." };
}

/* Transforma as linhas do arquivo em linhas para conferência. */
function prepararImportacao(rows, itens, regras) {
  const usados = new Set();
  return [...rows].sort((a, b) => a.data.localeCompare(b.data)).map(r => {
    const dup = jaImportado(r, itens);
    const prev = dup ? null : achaPrevisto(r, itens, usados);
    if (prev) usados.add(prev.id);
    const c = prev
      ? { v: ehEntrada(prev) ? prev.forma : prev.cat, origem: "previsto", revisar: false }
      : classify(r.desc, r.valor, regras);
    return {
      ...r, tipo: r.valor > 0 ? "entrada" : "saida", v: c.v, origemCls: c.origem, revisar: c.revisar,
      incluir: !dup, dup, prev: prev ? prev.id : null, prevDesc: prev ? prev.desc : null,
    };
  });
}

async function lerArquivo(f) {
  if (!cfg) { toast("Carregando…"); return; }
  let buf;
  try { buf = await f.arrayBuffer(); } catch (e) { toast("Não consegui ler esse arquivo."); return; }
  let txt = new TextDecoder("utf-8").decode(buf);
  if (txt.includes("\uFFFD")) txt = new TextDecoder("windows-1252").decode(buf);
  const { rows, erro } = extrairLinhas(f.name, txt);
  if (erro) { toast(erro); return; }
  imp = prepararImportacao(rows, allItens(), cfg.regras);
  renderImp();
  $("#impCard").hidden = false;
  $("#impCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

const semClasse = r => r.incluir && !r.v && !r.prev;

function etiquetaOrigem(r) {
  if (r.dup) return '<span class="chip mut">já importado</span>';
  if (r.origemCls === "previsto") return `<span class="chip in">baixa: ${esc(r.prevDesc || "previsto")}</span>`;
  const [cls, txt] = {
    regra: ["acc", "sua regra"],
    ia: ["warn", "IA, confira"],
    auto: r.revisar ? ["warn", "confira"] : ["acc", "automático"],
    voce: ["acc", "você"],
  }[r.origemCls] || ["out", "escolha"];
  return `<span class="chip ${cls}">${txt}</span>`;
}

function renderImp() {
  const novos = imp.filter(r => r.incluir), pend = imp.filter(semClasse).length;
  const dups = imp.filter(r => r.dup).length, baixas = novos.filter(r => r.prev).length;
  $("#impTitulo").textContent = `${imp.length} movimentações no arquivo`;
  $("#impResumo").textContent = [
    `${novos.length} para importar`,
    baixas ? `${baixas} vão dar baixa em contas previstas` : "",
    dups ? `${dups} já tinham sido importadas (ignoradas)` : "",
    pend ? `${pend} sem categoria: escolha na lista${sample ? " ou use a IA" : ""}` : "tudo classificado",
  ].filter(Boolean).join(" · ");
  $("#btnImportar").textContent = `Importar ${novos.length}`;
  $("#btnImportar").disabled = !novos.length || pend > 0;
  $("#btnIA").disabled = !pend;
  $("#tbImp").innerHTML = imp.map((r, i) => {
    const opcoes = Object.entries(r.tipo === "entrada" ? FORMAS : CATS)
      .map(([k, v]) => `<option value="${k}" ${r.v === k ? "selected" : ""}>${v}</option>`).join("");
    return `<tr class="${r.incluir ? "" : "skip"}">
      <td><input type="checkbox" data-inc="${i}" ${r.incluir ? "checked" : ""} ${r.dup ? "disabled" : ""} aria-label="Incluir"></td>
      <td class="num">${dBRy(r.data)}</td><td class="small">${esc(r.desc)}</td>
      <td class="r num ${classeValor(r.valor > 0)}" style="font-weight:600;white-space:nowrap">${fmtSinal(r.valor)}</td>
      <td><select data-cls="${i}" aria-label="Forma ou categoria" ${r.prev || r.dup ? "disabled" : ""}><option value="">— escolha —</option>${opcoes}</select></td>
      <td>${etiquetaOrigem(r)}</td></tr>`;
  }).join("");
}

$("#tbImp").addEventListener("change", e => {
  const { inc, cls } = e.target.dataset;
  if (inc !== undefined) imp[inc].incluir = e.target.checked;
  if (cls !== undefined) {
    const r = imp[cls];
    r.v = e.target.value || null;
    r.origemCls = r.v ? "voce" : "?";
    r.revisar = false;
  }
  renderImp();
  // a tabela foi redesenhada: devolve o foco ao mesmo controle
  const alvo = $(inc !== undefined ? `[data-inc="${inc}"]` : `[data-cls="${cls}"]`);
  if (alvo) alvo.focus();
});

/* ---------- classificação por IA ---------- */
function promptIA(pend) {
  const lista = o => Object.entries(o).map(([k, v]) => `${k} (${v})`).join(", ");
  return `Você classifica lançamentos de extrato bancário de um pequeno negócio brasileiro.
Para ENTRADAS (valor positivo) escolha a forma de recebimento entre: ${lista(FORMAS)}.
Para SAÍDAS (valor negativo) escolha a categoria entre: ${lista(CATS)}.
Dicas: pagamentos a empresas que vendem mercadoria/insumos = fornecedor; contas mensais iguais (aluguel, luz, água, internet, salários, contador) = fixa; tarifas e juros bancários = financeira; tributos = imposto; consertos = manutencao; gastos que variam com as vendas (frete, embalagem, comissão, combustível) = variavel; Pix ou transferência para pessoa física sem pista = variavel.
Responda SOMENTE com um array JSON no formato [{"i":número,"v":"chave"}], usando as chaves exatas acima.
Lançamentos:
${pend.map((r, i) => `${i}\t${r.valor.toFixed(2)}\t${r.desc}`).join("\n")}`;
}

$("#btnIA").onclick = async () => {
  const pend = imp.filter(semClasse);
  if (!pend.length || !sample) return;
  const b = $("#btnIA");
  b.disabled = true;
  b.textContent = "Classificando…";
  try {
    const res = await sample.json(promptIA(pend), { modelTier: "quick" });
    const respostas = Array.isArray(res) ? res : (res && Array.isArray(res.itens) ? res.itens : []);
    let n = 0;
    for (const o of respostas) {
      const r = o && pend[o.i];
      if (!r || r.v) continue;
      if (Object.hasOwn(r.tipo === "entrada" ? FORMAS : CATS, o.v)) { r.v = o.v; r.origemCls = "ia"; n++; }
    }
    toast(n ? `A IA classificou ${n} lançamentos. Confira os marcados em amarelo.` : "A IA não conseguiu classificar. Escolha manualmente.");
  } catch (e) {
    if (e && e.code === "not_granted") {
      b.hidden = true;
      sample = null;
      toast("IA não disponível aqui. Escolha manualmente.");
    } else {
      toast(e && e.code === "rate_limited" ? "Muitas chamadas seguidas. Aguarde um pouco e tente de novo." : "A IA não respondeu agora. Tente de novo ou escolha manualmente.");
    }
  }
  b.textContent = "Classificar pendentes com IA";
  renderImp();
};

/* ---------- gravar ---------- */
/* Guarda a escolha da pessoa para a próxima importação. Devolve true se a regra é nova. */
function aprenderRegra(r) {
  const k = ruleKey(r.desc);
  if (k.length < 4) return false;
  const existente = cfg.regras.find(x => x.k === k && x.tipo === r.tipo);
  if (existente) { existente.v = r.v; return false; }
  cfg.regras.push({ k, tipo: r.tipo, v: r.v });
  return true;
}

$("#btnImportar").onclick = () => {
  const n = { novos: 0, baixas: 0, regras: 0 };
  let mudouRegras = false;
  cfg.regras = cfg.regras || [];
  for (const r of imp) {
    if (!r.incluir || r.dup || (!r.v && !r.prev)) continue;
    const doExtrato = { data: r.data, origem: "extrato", fitid: r.fitid, extratoDesc: r.desc };
    const previsto = r.prev && findItem(r.prev);
    // Pode já ter recebido baixa manual enquanto a conferência estava aberta.
    if (previsto && previsto.status === "previsto") { darBaixa(previsto, doExtrato); n.baixas++; continue; }
    const l = { id: uid(), tipo: r.tipo, status: "realizado", valor: arred(Math.abs(r.valor)), desc: r.desc, criado: Date.now(), ...doExtrato };
    l[r.tipo === "entrada" ? "forma" : "cat"] = r.v;
    if (previsto) { removeItem(previsto.id); l.id = previsto.id; l.desc = previsto.desc || r.desc; if (previsto.contatoId) l.contatoId = previsto.contatoId; }
    saveItem(l);
    n.novos++;
    if (r.origemCls === "voce" || r.origemCls === "ia") {
      mudouRegras = true;
      if (aprenderRegra(r)) n.regras++;
    }
  }
  if (mudouRegras) persist("cfg");
  limparImportacao();
  render();
  showTab("hoje");
  toast(`${n.novos} lançamentos importados${n.baixas ? `, ${n.baixas} contas previstas baixadas` : ""}${n.regras ? `, ${n.regras} regras novas aprendidas` : ""}${demo ? " (demonstração, não salvo)" : ""}.`);
};
