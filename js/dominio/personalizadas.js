/* Formas de recebimento e categorias escritas pela pessoa.
   Ficam em cfg.personalizadas e são somadas a FORMAS e CATS enquanto esses dados estão na tela. */
const PREFIXO_PERS = "p_";

/* Nome curto e sem caracteres que quebrariam o HTML. */
function nomeLimpo(s) { return String(s || "").replace(/[<>&"'`]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40); }

function lerPersonalizadas(lista) {
  const ids = new Set();
  return (Array.isArray(lista) ? lista : [])
    .map(p => ({ id: String((p && p.id) || ""), tipo: p && p.tipo === "saida" ? "saida" : "entrada", nome: nomeLimpo(p && p.nome) }))
    .filter(p => /^p_[a-z0-9]+$/i.test(p.id) && p.nome && !ids.has(p.id) && ids.add(p.id));
}

/* Só as que vêm com o aplicativo. */
function semPersonalizadas(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([k]) => !k.startsWith(PREFIXO_PERS)));
}

function comPersonalizadas(obj, tipo, lista) {
  const r = semPersonalizadas(obj);
  for (const p of lerPersonalizadas(lista)) if (p.tipo === tipo) r[p.id] = p.nome;
  return r;
}

function aplicarPersonalizadas(lista) {
  for (const [obj, tipo] of [[FORMAS, "entrada"], [CATS, "saida"]]) {
    const novo = comPersonalizadas(obj, tipo, lista);
    for (const k of Object.keys(obj)) delete obj[k];
    Object.assign(obj, novo);
  }
}
