/* Estado do aplicativo e gravação (na nuvem, quando disponível, ou no navegador). */
const PREFIXO = "caixacerto:";
let cfg = null, months = {};              // o que está na tela (real ou demonstração)
let real = { cfg: null, months: {} };     // dados verdadeiros do usuário
let demo = false, carregado = false, falhaCarga = false;
let col = null, modoLocal = false, sample = null;

const dirty = new Set();                  // documentos ainda não gravados
const versoes = {}, timers = {}, chains = {};

const allItens = () => Object.values(months).flat();
const copia = o => JSON.parse(JSON.stringify(o));
function setSync(s) { $("#syncStatus").textContent = s; }

/* ---------- gravação ---------- */
function persist(id) {
  if (demo) return;
  dirty.add(id);
  versoes[id] = (versoes[id] || 0) + 1;
  clearTimeout(timers[id]);
  timers[id] = setTimeout(() => gravar(id), 350);
}

/* Lê sempre de `real`, para a demonstração nunca ser gravada por cima dos dados. */
function gravar(id) {
  clearTimeout(timers[id]);
  delete timers[id];
  const body = id === "cfg" ? real.cfg : { itens: real.months[id.slice(2)] || [] };
  if (!body) return;
  if (modoLocal) {
    try {
      localStorage.setItem(PREFIXO + id, JSON.stringify(body));
      dirty.delete(id);
      if (!dirty.size) setSync("Modo local: dados só neste navegador");
    } catch (e) {
      setSync("Erro ao salvar");
      toast("O navegador não deixou salvar. Copie seus lançamentos em Configurações antes de fechar.");
    }
    return;
  }
  const versao = versoes[id], dados = copia(body);
  setSync("Salvando…");
  chains[id] = (chains[id] || Promise.resolve())
    .then(() => col.doc(id).set(dados))
    .then(() => {
      // Se houve nova edição enquanto gravava, ela continua pendente.
      if (versoes[id] === versao) dirty.delete(id);
      if (!dirty.size) setSync("Tudo salvo");
    })
    .catch(e => {
      setSync("Erro ao salvar");
      toast(e && e.code === "quota_exceeded"
        ? "Limite de armazenamento atingido. Apague dados antigos em Configurações."
        : "Não consegui salvar agora. Tente de novo em instantes.");
    });
}

function gravarPendentes() { Object.keys(timers).forEach(gravar); }
window.addEventListener("pagehide", gravarPendentes);
window.addEventListener("online", () => [...dirty].forEach(gravar));

/* ---------- lançamentos ---------- */
function saveItem(l) {
  const mk = monthKey(l.data), lista = (months[mk] = months[mk] || []);
  const i = lista.findIndex(x => x.id === l.id);
  if (i >= 0) lista[i] = l; else lista.push(l);
  persist("m-" + mk);
}

function removeItem(id) {
  for (const mk in months) {
    const i = months[mk].findIndex(x => x.id === id);
    if (i < 0) continue;
    const [antigo] = months[mk].splice(i, 1);
    persist("m-" + mk);
    return antigo;
  }
}

function findItem(id) { return allItens().find(x => x.id === id); }

function darBaixa(l, extra) {
  removeItem(l.id);
  saveItem({ ...l, status: "realizado", ...extra });
}

/* ---------- demonstração ---------- */
function usarDadosReais() {
  demo = false;
  cfg = real.cfg;
  months = real.months;
  $("#demoBar").hidden = true;
}

function entrarDemo() {
  demo = true;
  const d = gerarDemo(HOJE);
  cfg = d.cfg;
  months = {};
  for (const l of d.itens) (months[monthKey(l.data)] = months[monthKey(l.data)] || []).push(l);
  $("#demoBar").hidden = false;
  limparImportacao();
  render();
}

function sairDemo() { usarDadosReais(); limparImportacao(); render(); }

/* ---------- carga ---------- */
function lerLocal(chave) {
  const bruto = localStorage.getItem(chave);
  if (!bruto) return null;
  try {
    return JSON.parse(bruto);
  } catch (e) {
    // Guarda uma cópia do que não deu para ler, em vez de perder na próxima gravação.
    try { localStorage.setItem("corrompido-" + chave, bruto); } catch (e2) { /* sem espaço */ }
    toast("Parte dos dados salvos está corrompida e foi ignorada.");
    return null;
  }
}

function carregarLocal() {
  modoLocal = true;
  try {
    real.cfg = lerLocal(PREFIXO + "cfg");
    const prefixoMes = PREFIXO + "m-";
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith(prefixoMes)) continue;
      const dados = lerLocal(k);
      if (dados) real.months[k.slice(prefixoMes.length)] = dados.itens || [];
    }
  } catch (e) { /* armazenamento bloqueado pelo navegador */ }
  setSync("Modo local: dados só neste navegador");
}

function aplicarSnapshot(snap) {
  for (const d of snap.docs) {
    if (dirty.has(d.id)) continue;
    const data = d.data();
    if (!data) continue;
    if (d.id === "cfg") real.cfg = copia(data);
    else if (d.id.startsWith("m-")) real.months[d.id.slice(2)] = copia(data.itens || []);
  }
  if (!demo) usarDadosReais();
}

async function init() {
  let db = null, id = null;
  const aviso = setTimeout(() => {
    if (!carregado) setSync("Não consegui carregar seus dados ainda. Verifique a conexão.");
  }, 10000);
  try {
    if (window.claude && window.claude.use) {
      let user;
      [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
      if (user) id = await user.id();
      sample = await window.claude.use("sample");
    }
  } catch (e) { /* recurso indisponível: segue em modo local */ }
  if (sample) $("#btnIA").hidden = false;

  const pronto = () => {
    carregado = true;
    clearTimeout(aviso);
    if (!real.cfg && !demo) { entrarDemo(); return; }
    if (!demo) usarDadosReais();
    render();
  };
  if (!db || !id) { carregarLocal(); pronto(); return; }

  col = db.collection("data/users/" + id);
  col.onSnapshot(snap => {
    aplicarSnapshot(snap);
    if (snap.metadata.fromCache) { if (!demo && real.cfg) render(); return; }
    falhaCarga = false;
    if (!dirty.size) setSync("Tudo salvo");
    if (!carregado) pronto(); else render();
  }, err => {
    // Sem ter lido os dados, não deixa "Começar" gravar por cima deles.
    if (!carregado) falhaCarga = true;
    setSync(err.code === "revoked" ? "Acesso encerrado" : "Sem conexão com os dados");
    pronto();
  });
}

/* ---------- apagar tudo ---------- */
async function apagarTudo() {
  const ids = Object.keys(real.months).map(m => "m-" + m).concat("cfg");
  Object.keys(timers).forEach(i => { clearTimeout(timers[i]); delete timers[i]; });
  try {
    if (modoLocal) {
      ids.forEach(i => localStorage.removeItem(PREFIXO + i));
    } else {
      ids.forEach(i => dirty.add(i));
      for (const i of ids) { await chains[i]; await col.doc(i).delete(); }
    }
  } catch (e) {
    ids.forEach(i => dirty.delete(i));
    toast("Não consegui apagar tudo. Tente de novo.");
    return;
  }
  dirty.clear();
  real = { cfg: null, months: {} };
  entrarDemo();
  toast("Dados apagados");
}
