/* Aba Configurações e modal "Começar com os meus dados". */
function renderCfg() {
  $("#btnVerDemo").hidden = $("#btnApagar").hidden = demo;
  renderRegras();
  // Não sobrescreve um campo enquanto a pessoa digita.
  const foco = document.activeElement;
  if (foco && foco.matches("#p-config input")) return;
  $("#cfNome").value = cfg.nome || "";
  $("#cfSaldo").value = fmtCampo(cfg.saldoInicial);
  $("#cfData").value = cfg.saldoData;
  $("#cfMedia").checked = cfg.projVendas !== false;
}

function renderRegras() {
  $("#regras").innerHTML = (cfg.regras || []).map((r, i) => {
    const l = { tipo: r.tipo, forma: r.v, cat: r.v };
    return `<div class="rule-row"><span class="small">Quando o extrato tiver <b>${esc(r.k)}</b></span>${chipCls(l)}<button class="btn sm ghost danger" data-delrule="${i}">Remover</button></div>`;
  }).join("") || vazio("Nenhuma regra ainda. Quando você importa um extrato e corrige ou confirma uma categoria, o Caixa Certo grava a regra e na próxima vez acerta sozinho.");
}

$("#cfSalvar").onclick = () => {
  if (!cfg) return;
  const saldo = parseBR($("#cfSaldo").value);
  if (isNaN(saldo)) { toast("Saldo inválido"); return; }
  cfg.nome = $("#cfNome").value.trim() || cfg.nome;
  cfg.saldoInicial = arred(saldo);
  cfg.saldoData = $("#cfData").value || cfg.saldoData;
  cfg.projVendas = $("#cfMedia").checked;
  persist("cfg");
  render();
  toast(demo ? "Alterado na demonstração (não é salvo)" : "Configurações salvas");
};

$("#btnVerDemo").onclick = () => { entrarDemo(); showTab("hoje"); window.scrollTo({ top: 0 }); };
$("#btnApagar").onclick = () => confirmar("Apagar todos os seus dados?",
  "Todos os lançamentos, regras e o saldo inicial serão apagados. Não dá para desfazer.", apagarTudo);

$("#btnCopiarCSV").onclick = async () => {
  const campo = s => (/[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
  const linhas = allItens().sort((a, b) => a.data.localeCompare(b.data))
    .map(l => [l.data, l.tipo, l.status, l.desc || "", rotulo(l), l.valor.toFixed(2).replace(".", ",")]);
  const csv = [["data", "tipo", "situacao", "descricao", "forma_ou_categoria", "valor"], ...linhas]
    .map(r => r.map(campo).join(";")).join("\n");
  try {
    await navigator.clipboard.writeText(csv);
    toast("Copiado. Cole numa planilha.");
  } catch (e) {
    toast("O navegador não deixou copiar.");
  }
};

/* ---------- começar ---------- */
$("#btnComecar").onclick = () => {
  if (real.cfg) { sairDemo(); toast("De volta aos seus dados."); return; }
  if (falhaCarga) { toast("Não consegui ler seus dados. Recarregue a página antes de começar."); return; }
  abrirModal("#mdStart", "#obNome");
};
$("#obCancelar").onclick = () => fecharModal("#mdStart");
$("#fmStart").addEventListener("submit", e => {
  e.preventDefault();
  const saldo = parseBR($("#obSaldo").value || "0");
  if (isNaN(saldo)) { toast("Saldo inválido. Exemplo: 2.500,00"); return; }
  fecharModal("#mdStart");
  real.cfg = { nome: $("#obNome").value.trim() || "Meu negócio", saldoInicial: arred(saldo), saldoData: HOJE, regras: [], projVendas: true };
  sairDemo();
  persist("cfg");
  showTab("hoje");
  toast("Pronto! Agora lance entradas, saídas e contas a pagar.");
});
