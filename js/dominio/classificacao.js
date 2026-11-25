/* Classificação automática das linhas do extrato. A primeira regra que casar vence. */
const MAQUININHA = /\b(CIELO|STONE|REDE ?CARD|REDE\b|GETNET|PAGSEGURO|PAGBANK|SUMUP|SAFRAPAY|MERCADO ?PAGO|TON\b|INFINITEPAY|VERO\b)/;
const BUILTIN = [
  { re: /\b(ESTORNO|DEVOLUC)/, tipo: "entrada", v: "outra" },
  { re: /PIX.*(RECEB|CRED|ENTRADA)|RECEB.*PIX|CRED.*PIX/, tipo: "entrada", v: "pix" },
  { re: /\b(TED\b|DOC\b|TRANSF|TEV\b).*(RECEB|CRED)|(RECEB|CRED).*\b(TED\b|DOC\b|TRANSF)/, tipo: "entrada", v: "transferencia" },
  { re: /\bDEP.*DINHEIRO|\bDEPOSITO|\bDEP\.? ?ESPECIE/, tipo: "entrada", v: "dinheiro" },
  { re: new RegExp(MAQUININHA.source + ".*DEB"), tipo: "entrada", v: "debito" },
  { re: MAQUININHA, tipo: "entrada", v: "credito", revisar: true },
  { re: /\b(TARIFA|TAR\b|IOF\b|JUROS|ENCARGO|MORA\b|CESTA\b|ANUIDADE|MENSALIDADE PACOTE|TX\b|TAXA)/, tipo: "saida", v: "financeira" },
  { re: /\b(DAS\b|SIMPLES NAC|DARF|ICMS|ISS\b|IPTU|IPVA|IMPOSTO|RECEITA FED|SEFAZ|GPS\b|INSS|FGTS)/, tipo: "saida", v: "imposto" },
  { re: /\b(ALUGUEL|ENERGIA|COELBA|NEOENERGIA|CEMIG|ENEL\b|COPEL|LIGHT\b|EMBASA|SABESP|AGUA\b|INTERNET|TELEF|VIVO\b|CLARO\b|TIM\b|OI\b|CONTADOR|CONTABIL|SALARIO|FOLHA|PRO LABORE|PROLABORE|SEGUROS?\b|SISTEMA|SOFTWARE|ASSINATURA)/, tipo: "saida", v: "fixa" },
  { re: /\b(MANUTEN|CONSERTO|REPARO|OFICINA|MECANIC|ELETRIC|ENCANAD|PINTUR)/, tipo: "saida", v: "manutencao" },
  { re: /ATACAD|DISTRIBUID|FORNEC|\bASSAI|\bMAKRO\b|ATAKAREJO|\bMATERIA|EMBALAG|MERCADORIA/, tipo: "saida", v: "fornecedor" },
  { re: /\b(COMBUST|(AUTO)?POSTO\b|GASOLIN|UBER\b|99 ?APP|FRETE|CORREIOS|MOTOBOY|COMISS)/, tipo: "saida", v: "variavel" },
];

function classify(desc, valor, regras) {
  const n = norm(desc), tipo = valor > 0 ? "entrada" : "saida";
  // Regras do usuário: compara palavras inteiras e prefere a mais específica.
  const texto = " " + palavras(desc).join(" ") + " ";
  const regra = (regras || [])
    .filter(r => r.tipo === tipo && r.k && texto.includes(" " + r.k + " "))
    .sort((a, b) => b.k.length - a.k.length)[0];
  if (regra) return { v: regra.v, origem: "regra", revisar: false };

  const padrao = BUILTIN.find(b => b.tipo === tipo && b.re.test(n));
  if (padrao) return { v: padrao.v, origem: "auto", revisar: !!padrao.revisar };
  if (tipo === "entrada" && /PIX/.test(n)) return { v: "pix", origem: "auto", revisar: false };
  return { v: null, origem: "?", revisar: true };
}

/* Casa a linha com um previsto de mesmo tipo e valor, com até 7 dias de diferença. */
function achaPrevisto(row, itens, usados) {
  const tipo = row.valor > 0 ? "entrada" : "saida", v = Math.abs(row.valor);
  let melhor = null, menorDif = Infinity;
  for (const l of itens) {
    if (l.status !== "previsto" || l.tipo !== tipo || usados.has(l.id)) continue;
    if (Math.abs(l.valor - v) > 0.009) continue;
    const dias = Math.abs((new Date(l.data) - new Date(row.data)) / 864e5);
    if (dias <= 7 && dias < menorDif) { melhor = l; menorDif = dias; }
  }
  return melhor;
}

function jaImportado(row, itens) {
  return itens.some(l => {
    if (l.origem !== "extrato") return false;
    const mesmaData = l.data === row.data;
    const mesmoValor = Math.abs(signed(l) - row.valor) < 0.009;
    // Alguns bancos reutilizam o FITID: exige também a data ou o valor.
    if (row.fitid) return l.fitid === row.fitid && (mesmaData || mesmoValor);
    return mesmaData && mesmoValor && norm(l.extratoDesc || l.desc) === norm(row.desc);
  });
}
