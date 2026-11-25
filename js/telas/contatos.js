/* Aba Contatos: clientes, fornecedores, fiado e cobrança. */
let filtroContato = "", contatoEdit = null;

const contatos = () => cfg.contatos || [];
const contatoDe = l => contatos().find(c => c.id === l.contatoId);
const nomeContato = l => (contatoDe(l) || { nome: "" }).nome;

/* Acha pelo nome (sem acento ou maiúscula) ou cria. */
function contatoPorNome(nome, tipo) {
  const limpo = nome.trim();
  if (!limpo) return null;
  const achado = contatos().find(c => norm(c.nome) === norm(limpo));
  if (achado) return achado;
  const novo = { id: uid(), nome: limpo, tipo, tel: "", obs: "" };
  cfg.contatos = [...contatos(), novo];
  persist("cfg");
  return novo;
}

function textoCobranca(c, abertos) {
  const total = fmt(soma(abertos));
  const linhas = abertos.map(l => `• ${l.desc || rotulo(l)}: ${fmt(l.valor)} (${l.data < HOJE ? "venceu" : "vence"} em ${dBR(l.data)})`);
  return `Olá, ${c.nome}! Passando para lembrar do valor em aberto com ${cfg.nome}:\n${linhas.join("\n")}\nTotal: ${total}. Qualquer dúvida, é só me chamar. Obrigado!`;
}

const abertosDe = c => allItens().filter(l => l.contatoId === c.id && l.status === "previsto" && ehEntrada(l)).sort((a, b) => a.data.localeCompare(b.data));

function botoesCobranca(c) {
  const abertos = abertosDe(c);
  if (!abertos.length) return "";
  const tel = telefoneWhats(c.tel);
  const copiar = `<button class="btn sm" data-copiarcob="${esc(c.id)}">Copiar cobrança</button> `;
  if (!tel) return copiar;
  return `<a class="btn sm" href="https://wa.me/${tel}?text=${encodeURIComponent(textoCobranca(c, abertos))}" target="_blank" rel="noopener noreferrer">WhatsApp</a> ` + copiar;
}

function renderContatos() {
  $("#listaContatos").innerHTML = contatos().map(c => `<option value="${esc(c.nome)}"></option>`).join("");
  const saldos = saldoContatos(allItens(), HOJE), zero = { receber: 0, pagar: 0, atrasado: 0, ultimo: "" };
  const de = c => saldos[c.id] || zero;
  const total = k => contatos().reduce((a, c) => a + de(c)[k], 0);
  $("#tilesCont").innerHTML = tile("Clientes devem", contar(total("receber")), "em aberto com nome", "pos")
    + tile("Em atraso", contar(total("atrasado")), "já passou da data", total("atrasado") ? "neg" : "")
    + tile("Devo a fornecedores", contar(total("pagar")), "em aberto com nome", "neg");

  const q = norm($("#ctBusca").value);
  $$("#segCont button").forEach(b => b.setAttribute("aria-pressed", b.dataset.c === filtroContato));
  const lista = contatos().filter(c => (!filtroContato || c.tipo === filtroContato) && (!q || norm(c.nome).includes(q)))
    .sort((a, b) => de(b).atrasado - de(a).atrasado || de(b).receber - de(a).receber || a.nome.localeCompare(b.nome, "pt-BR"));
  $("#tbCont").innerHTML = lista.map(c => {
    const s = de(c);
    return `<tr><td><b>${esc(c.nome)}</b>${c.tel ? `<br><span class="small muted">${esc(c.tel)}</span>` : ""}</td>
      <td><span class="chip">${c.tipo === "fornecedor" ? "Fornecedor" : "Cliente"}</span></td>
      <td class="r num pos">${s.receber ? fmt(s.receber) : "—"}${s.atrasado ? `<br><span class="small neg">${fmt(s.atrasado)} em atraso</span>` : ""}</td>
      <td class="r num neg">${s.pagar ? fmt(s.pagar) : "—"}</td>
      <td class="small muted">${s.ultimo ? dBRy(s.ultimo) : "—"}</td>
      <td class="r" style="white-space:nowrap">${botoesCobranca(c)}<button class="btn sm ghost" data-contato="${esc(c.id)}">Abrir</button></td></tr>`;
  }).join("") || `<tr><td colspan="6" class="empty">Nenhum contato aqui. Crie um no botão acima ou escreva o nome ao fazer um lançamento.</td></tr>`;
}

function abrirContato(c) {
  contatoEdit = c || null;
  $("#ctTitulo").textContent = c ? c.nome : "Novo contato";
  $("#ctNome").value = c ? c.nome : "";
  $("#ctTipo").value = c ? c.tipo : filtroContato || "cliente";
  $("#ctTel").value = c ? c.tel : "";
  $("#ctObs").value = c ? c.obs : "";
  $("#ctExcluir").hidden = !c;
  const hist = c ? allItens().filter(l => l.contatoId === c.id).sort((a, b) => b.data.localeCompare(a.data)) : [];
  $("#ctHist").innerHTML = hist.length ? `<h3>Histórico</h3><div class="tbl-wrap"><table><tbody>${hist.slice(0, 12).map(l =>
    `<tr><td class="num">${dBR(l.data)}</td><td>${esc(l.desc || rotulo(l))}${l.status === "previsto" ? ' <span class="chip warn">em aberto</span>' : ""}</td><td class="r num ${classeValor(ehEntrada(l))}" style="white-space:nowrap">${fmtSinal(signed(l))}</td></tr>`).join("")}</tbody></table></div>${hist.length > 12 ? `<p class="small muted">Mostrando 12 de ${hist.length}.</p>` : ""}` : "";
  abrirModal("#mdContato", "#ctNome");
}

$("#fmContato").addEventListener("submit", e => {
  e.preventDefault();
  const nome = $("#ctNome").value.trim(), tel = $("#ctTel").value.trim();
  if (!nome) { toast("Digite o nome"); return; }
  if (tel && !telefoneWhats(tel)) { toast("Telefone com DDD, por exemplo (75) 99999-0000"); return; }
  if (contatos().some(c => c !== contatoEdit && norm(c.nome) === norm(nome))) { toast("Já existe um contato com esse nome"); return; }
  const dados = { nome, tel, tipo: $("#ctTipo").value, obs: $("#ctObs").value.trim() };
  cfg.contatos = contatoEdit
    ? contatos().map(c => (c.id === contatoEdit.id ? { ...c, ...dados } : c))
    : [...contatos(), { id: uid(), ...dados }];
  persist("cfg");
  fecharModal("#mdContato");
  render();
  toast("Contato salvo");
});

$("#ctExcluir").onclick = () => {
  const c = contatoEdit;
  if (!c) return;
  confirmar("Excluir contato?", `${c.nome} sai da lista. Os lançamentos continuam, mas sem o nome.`, () => {
    allItens().filter(l => l.contatoId === c.id).forEach(l => { const { contatoId, ...resto } = l; saveItem(resto); });
    cfg.contatos = contatos().filter(x => x.id !== c.id);
    persist("cfg");
    fecharModal("#mdContato");
    render();
    toast("Contato excluído");
  });
};
$("#ctCancelar").onclick = () => fecharModal("#mdContato");
$("#btnNovoContato").onclick = () => { if (cfg) abrirContato(null); };
$("#ctBusca").addEventListener("input", () => { if (cfg) renderContatos(); });
$("#segCont").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b || !cfg) return;
  filtroContato = b.dataset.c;
  renderContatos();
});
$("#tbCont").addEventListener("click", async e => {
  const b = e.target.closest("[data-contato],[data-copiarcob]");
  if (!b) return;
  const c = contatos().find(x => x.id === (b.dataset.contato || b.dataset.copiarcob));
  if (!c) return;
  if (b.dataset.contato) { abrirContato(c); return; }
  try { await navigator.clipboard.writeText(textoCobranca(c, abertosDe(c))); toast("Mensagem de cobrança copiada"); }
  catch (err) { toast("O navegador não deixou copiar."); }
});
