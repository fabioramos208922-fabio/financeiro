/* Aba Configurações e modal "Começar com os meus dados". */
function renderCfg() {
  $("#btnVerDemo").hidden = $("#btnApagar").hidden = demo;
  renderRegras();
  $("#bkNota").textContent = cfg.backupEm ? `Último backup em ${dBRy(cfg.backupEm)}. Guarde o arquivo fora deste computador.` : "Nenhum backup feito ainda. O arquivo guarda tudo: lançamentos, contatos, metas e regras.";
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

function csvLancamentos() {
  const linhas = allItens().sort((a, b) => a.data.localeCompare(b.data))
    .map(l => [l.data, l.tipo, l.status, l.desc || "", rotulo(l), nomeContato(l), l.valor]);
  return montarCSV([["data", "tipo", "situacao", "descricao", "forma_ou_categoria", "contato", "valor"], ...linhas]);
}

$("#btnBaixarCSV").onclick = () => { if (cfg) baixarArquivo(`caixa-certo-lancamentos-${HOJE}.csv`, "\uFEFF" + csvLancamentos(), "text/csv"); };

/* ---------- backup ---------- */
$("#btnBackup").onclick = () => {
  if (demo || !real.cfg) { toast("Saia da demonstração para fazer o backup dos seus dados."); return; }
  baixarArquivo(`caixa-certo-backup-${HOJE}.json`, JSON.stringify({ app: "caixacerto", versao: 1, criado: HOJE, cfg: real.cfg, months: real.months }, null, 1), "application/json");
  cfg.backupEm = HOJE;
  persist("cfg");
  render();
  toast("Backup baixado. Guarde o arquivo em lugar seguro.");
};
$("#btnRestaurar").onclick = () => {
  if (falhaCarga) { toast("Não consegui ler seus dados. Recarregue a página antes de restaurar."); return; }
  $("#bkFile").click();
};
$("#bkFile").addEventListener("change", async e => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  let b;
  try { b = lerBackup(await f.text()); } catch (err) { toast(err.message); return; }
  confirmar("Restaurar este backup?", `Os dados atuais serão trocados por "${b.cfg.nome}", com ${b.total} lançamentos${b.ignorados ? ` (${b.ignorados} inválidos ficam de fora)` : ""}. Não dá para desfazer: se tiver dúvida, faça um backup antes.`, () => {
    restaurar(b);
    showTab("hoje");
    toast("Backup restaurado");
  });
});

$("#btnCopiarCSV").onclick = async () => {
  const csv = csvLancamentos();
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
