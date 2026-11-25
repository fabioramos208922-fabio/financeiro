/* Ponto de partida: abas, ações gerais e inicialização. */
function render() {
  $("#bizName").textContent = (cfg && cfg.nome) || "";
  if (!cfg) return;
  renderHoje();
  renderProj();
  renderLanc();
  renderRes();
  renderCfg();
  // na primeira vez conta do zero; depois, só o que mudou
  animar(painelAtivo(), !render.jaAnimou);
  render.jaAnimou = true;
}

/* ---------- abas ---------- */
const TABS = $$(".tab").map(b => b.dataset.tab);

function showTab(t) {
  $$(".tab").forEach(b => {
    const ativa = b.dataset.tab === t;
    b.setAttribute("aria-selected", ativa);
    b.tabIndex = ativa ? 0 : -1;
  });
  $$(".panel").forEach(p => p.classList.toggle("on", p.id === "p-" + t));
  if (location.hash !== "#" + t) history.replaceState(null, "", "#" + t);
  if (render.jaAnimou) animar(painelAtivo(), true);
}

function abrirPeloEndereco() {
  const t = location.hash.slice(1);
  if (TABS.includes(t)) showTab(t);
}

$$(".tab").forEach(b => { b.onclick = () => showTab(b.dataset.tab); });
$(".tabs").addEventListener("keydown", e => {
  const passo = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
  if (!passo || !e.target.dataset.tab) return;
  const t = TABS[(TABS.indexOf(e.target.dataset.tab) + passo + TABS.length) % TABS.length];
  showTab(t);
  $("#t-" + t).focus();
});
window.addEventListener("hashchange", abrirPeloEndereco);

/* ---------- botões dentro das listas ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-baixa],[data-edit],[data-delrule],[data-goto]");
  if (!b) return;
  const { goto, edit: editar, baixa, delrule } = b.dataset;
  if (goto) { showTab(goto); window.scrollTo({ top: 0 }); }
  if (editar) { const l = findItem(editar); if (l) abrirLanc(l); }
  if (baixa) {
    const l = findItem(baixa);
    if (!l) return;
    darBaixa(l, { data: HOJE });
    render();
    toast(ehEntrada(l) ? "Marcado como recebido hoje" : "Marcado como pago hoje");
  }
  if (delrule) { cfg.regras.splice(Number(delrule), 1); persist("cfg"); render(); }
});

/* Virou o dia com a página aberta. */
document.addEventListener("visibilitychange", () => {
  const agora = isoDate(new Date());
  if (document.hidden || agora === HOJE) return;
  HOJE = agora;
  render();
});

abrirPeloEndereco();
init();
