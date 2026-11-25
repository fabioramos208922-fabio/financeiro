/* Campo de forma ou categoria: a pessoa escreve um nome ou escolhe da lista. */
const opcoesDe = tipo => (tipo === "entrada" ? FORMAS : CATS);
const listaDe = tipo => (tipo === "entrada" ? "dlFormas" : "dlCats");

function montarListas() {
  for (const tipo of ["entrada", "saida"]) {
    $("#" + listaDe(tipo)).innerHTML = Object.values(opcoesDe(tipo)).map(v => `<option value="${esc(v)}"></option>`).join("");
  }
}

/* Chave da opção com esse nome; se não existir, cria. Devolve null se estiver vazio. */
function chavePorNome(tipo, texto) {
  const nome = nomeLimpo(texto);
  if (!nome) return null;
  const achada = Object.entries(opcoesDe(tipo)).find(([, v]) => norm(v) === norm(nome));
  if (achada) return achada[0];
  const k = PREFIXO_PERS + uid();
  cfg.personalizadas = [...(cfg.personalizadas || []), { id: k, tipo, nome }];
  persist("cfg");
  aplicarPersonalizadas(cfg.personalizadas);
  montarFiltroCat();
  renderPersonalizadas();
  toast(tipo === "entrada" ? `"${nome}" entrou na lista de formas` : `"${nome}" entrou na lista. No relatório, conta como custo fixo`);
  return k;
}

/* Ao entrar, esvazia para a lista mostrar tudo; se sair sem escrever, volta o que estava. */
document.addEventListener("focusin", e => {
  const c = e.target;
  if (!c.matches("[data-combo]")) return;
  c.dataset.antes = c.value;
  if (c.value) c.placeholder = c.value;
  c.value = "";
});
document.addEventListener("focusout", e => {
  const c = e.target;
  if (!c.matches("[data-combo]")) return;
  if (!c.value.trim()) c.value = c.dataset.antes || "";
  c.placeholder = "Escreva ou escolha";
});

function renderPersonalizadas() {
  const lista = lerPersonalizadas(cfg.personalizadas);
  $("#persLista").innerHTML = lista.map(p => `<div class="rule-row"><b>${esc(p.nome)}</b><span class="chip">${p.tipo === "entrada" ? "Entrada" : "Saída"}</span><button class="btn sm ghost danger" data-delpers="${p.id}">Remover</button></div>`).join("")
    || vazio('Nenhuma ainda. Escreva um nome novo no campo de forma ou categoria de um lançamento.');
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
