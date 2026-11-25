/* Conversão e arredondamento de valores e normalização de texto. */
function arred(v) { return Math.round(v * 100) / 100; }

/* Lê valores como "1.234,56", "-R$ 10", "(50,00)", "10,00-" e "10,00 D". */
function parseBR(texto) {
  if (typeof texto === "number") return texto;
  let s = String(texto || "").trim().replace(/−/g, "-").replace(/[R$\s]/g, "");
  if (!s) return NaN;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  const sufixo = s.match(/^(.*\d)([CD])$/i);
  if (sufixo) {
    s = sufixo[1];
    if (sufixo[2].toUpperCase() === "D" && !s.startsWith("-")) neg = true;
  }
  if (s.endsWith("-")) { neg = true; s = s.slice(0, -1); }
  if (s.startsWith("-")) { neg = !neg; s = s.slice(1); }
  else if (s.startsWith("+")) s = s.slice(1);

  const virgula = s.lastIndexOf(","), ponto = s.lastIndexOf(".");
  if (virgula > ponto) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (ponto > virgula && virgula >= 0) {
    s = s.replace(/,/g, "");
  } else if (ponto >= 0) {
    // só pontos: "1.234" é milhar, "12.50" é decimal
    const grupos = s.split(".");
    if (grupos.length > 2 || grupos[1].length === 3) s = s.replace(/\./g, "");
  }
  const v = parseFloat(s);
  return isNaN(v) ? NaN : neg ? -v : v;
}

/* Maiúsculas e sem acentos. */
function norm(s) {
  return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

/* Só as palavras com mais de uma letra: "Pix João e Silva 12" -> PIX, JOAO, SILVA. */
function palavras(s) {
  return norm(s).replace(/[^A-Z ]/g, " ").split(/\s+/).filter(w => w.length > 1);
}

function ruleKey(desc) { return palavras(desc).slice(0, 4).join(" "); }
