/* Opção "Escrever outra…" nas listas de forma e categoria. */
const ESCREVER = "__escrever";
const opcaoEscrever = `<option value="${ESCREVER}">✎ Escrever outra…</option>`;
let aoEscrever = null, tipoEscrever = "entrada";

/* cb recebe a chave da forma ou categoria escolhida. */
function escreverOutra(tipo, cb) {
  aoEscrever = cb;
  tipoEscrever = tipo;
  $("#ouTitulo").textContent = tipo === "entrada" ? "Outra forma de recebimento" : "Outra categoria de despesa";
  $("#ouNome").placeholder = tipo === "entrada" ? "Ex.: Vale-refeição, iFood" : "Ex.: Marketing, Uniformes";
  $("#ouNota").hidden = tipo === "entrada";
  $("#ouNome").value = "";
  abrirModal("#mdOutra", "#ouNome");
}

$("#ouCancelar").onclick = () => fecharModal("#mdOutra");
$("#fmOutra").addEventListener("submit", e => {
  e.preventDefault();
  const nome = nomeLimpo($("#ouNome").value), opcoes = tipoEscrever === "entrada" ? FORMAS : CATS;
  if (!nome) { toast("Escreva um nome"); return; }
  // se já existe com esse nome, usa a existente
  let [k] = Object.entries(opcoes).find(([, v]) => norm(v) === norm(nome)) || [];
  if (!k) {
    k = PREFIXO_PERS + uid();
    cfg.personalizadas = [...(cfg.personalizadas || []), { id: k, tipo: tipoEscrever, nome }];
    persist("cfg");
    aplicarPersonalizadas(cfg.personalizadas);
  }
  fecharModal("#mdOutra");
  if (aoEscrever) aoEscrever(k);
  renderPersonalizadas();
  montarFiltroCat();
});

function renderPersonalizadas() {
  const lista = lerPersonalizadas(cfg.personalizadas);
  $("#persLista").innerHTML = lista.map(p => `<div class="rule-row"><b>${esc(p.nome)}</b><span class="chip">${p.tipo === "entrada" ? "Entrada" : "Saída"}</span><button class="btn sm ghost danger" data-delpers="${p.id}">Remover</button></div>`).join("")
    || vazio('Nenhuma ainda. Escolha "Escrever outra…" na lista de formas ou categorias.');
}

$("#persLista").addEventListener("click", e => {
  const b = e.target.closest("[data-delpers]");
  if (!b) return;
  const id = b.dataset.delpers;
  const usada = allItens().some(l => l.forma === id || l.cat === id) || (cfg.regras || []).some(r => r.v === id) || imp.some(r => r.v === id);
  if (usada) { toast("Está em uso em lançamentos ou regras. Troque antes de remover."); return; }
  cfg.personalizadas = cfg.personalizadas.filter(p => p.id !== id);
  persist("cfg");
  render();
  toast("Removida");
});
