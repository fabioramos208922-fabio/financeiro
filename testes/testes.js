/* Testes das regras de negócio. Rodar com: node testes/testes.js */
const fs = require("fs"), path = require("path"), vm = require("vm"), test = require("node:test"), assert = require("node:assert");
const pasta = path.join(__dirname, "..", "js", "dominio");
const codigo = ["constantes", "datas", "valores", "calculos", "leitura-extrato", "classificacao", "demo"]
  .map(n => fs.readFileSync(path.join(pasta, n + ".js"), "utf8")).join("\n");
const d = vm.runInThisContext(`(function(){${codigo}
return {parseBR,parseDateAny,addMonths,parseOFX,parseCSV,classify,ruleKey,serie,analisa,resumoMes,saldoRealizado,jaImportado,achaPrevisto,mediaEntradasDia,gerarDemo};})()`);
const eq = assert.deepStrictEqual;

test("valores brasileiros", () => {
  for (const [t, v] of [["1.234,56", 1234.56], ["-R$ 10", -10], ["(50,00)", -50], ["10,00-", -10], ["10,00 D", -10], ["10,00 C", 10], ["-10,00 D", -10], ["1.234", 1234], ["12.50", 12.5], ["1,234.56", 1234.56]]) eq(d.parseBR(t), v, t);
  assert(isNaN(d.parseBR("abc")));
});
test("datas", () => {
  eq(d.parseDateAny("31/01/26"), "2026-01-31");
  eq(d.parseDateAny("20260131120000"), "2026-01-31");
  eq(d.parseDateAny("99/99/2026"), null);
  eq(d.addMonths("2026-01-31", 1), "2026-02-28");
});
test("CSV com 'Data Lançamento' usa a coluna de descrição certa", () => {
  eq(d.parseCSV("Extrato\nData Lançamento;Histórico;Valor;Saldo\n01/02/2026;Pix recebido;10,50;99").rows,
    [{ data: "2026-02-01", desc: "Pix recebido", valor: 10.5, fitid: null }]);
});
test("CSV com vírgula, aspas e débito/crédito", () => {
  eq(d.parseCSV('Data,Valor,Identificador,Descrição\n01/02/2026,-12.50,x,"A, B"').rows[0].desc, "A, B");
  eq(d.parseCSV("Data;Descrição;Crédito;Débito\n01/02/2026;x;;5,00").rows[0].valor, -5);
  eq(d.parseCSV("Data;Descrição;Valor;Tipo\n01/02/2026;x;5,00;D").rows[0].valor, -5);
  eq(d.parseCSV("01/02/2026;loja;-7,00").rows[0].valor, -7);
  assert(d.parseCSV("nada aqui").erro);
});
test("OFX", () => {
  eq(d.parseOFX("<STMTTRN><DTPOSTED>20260201<TRNAMT>-1.234,56<FITID>a<MEMO>A &amp; B</STMTTRN>"),
    [{ data: "2026-02-01", desc: "A & B", valor: -1234.56, fitid: "a" }]);
  eq(d.parseOFX("<STMTTRN><DTPOSTED>20260201<TRNAMT>12.500<MEMO>x</STMTTRN>")[0].valor, 12.5);
});
test("classificação não confunde palavras parecidas", () => {
  eq(d.classify("PIX ENVIADO ANA MORAES", -5).v, null);
  eq(d.classify("IMPOSTO MUNICIPAL", -5).v, "imposto");
  eq(d.classify("AUTO POSTO SOL", -5).v, "variavel");
  eq(d.classify("TARIFA PACOTE", -5).v, "financeira");
  eq(d.classify("STONE DEBITO", 5).v, "debito");
  eq(d.classify("CIELO VENDAS", 5).v, "credito");
});
test("regra aprendida casa com a própria descrição e a mais específica vence", () => {
  const desc = "Pix João e Silva 123";
  const k = d.ruleKey(desc);
  eq(d.classify(desc, -5, [{ k: "PIX", tipo: "saida", v: "fixa" }, { k, tipo: "saida", v: "retirada" }]).v, "retirada");
});
test("saldo e projeção", () => {
  const cfg = { saldoInicial: 100, saldoData: "2026-02-01" };
  const it = [
    { tipo: "entrada", status: "realizado", data: "2026-01-31", valor: 999 },
    { tipo: "entrada", status: "realizado", data: "2026-02-02", valor: 50 },
    { tipo: "saida", status: "previsto", data: "2026-02-01", valor: 30 },
    { tipo: "entrada", status: "realizado", data: "2026-02-04", valor: 7 },
    { tipo: "saida", status: "previsto", data: "2026-02-05", valor: 200 },
  ];
  const s = d.serie(it, cfg, "2026-02-03", "2026-02-01", "2026-02-05", null);
  eq(s.map(p => p.v), [100, 150, 120, 127, -73]);
  eq(d.analisa(s).primeiroNeg.d, "2026-02-05");
  eq(d.mediaEntradasDia(it, "2026-02-03"), 25);
});
test("duplicados e baixa", () => {
  const it = [{ id: 1, origem: "extrato", tipo: "saida", valor: 5, data: "2026-02-01", fitid: "a", desc: "x" }];
  assert(d.jaImportado({ data: "2026-02-01", valor: -5, fitid: "a", desc: "x" }, it));
  assert(!d.jaImportado({ data: "2026-03-01", valor: -9, fitid: "a", desc: "y" }, it));
  const p = [{ id: 2, status: "previsto", tipo: "saida", valor: 5, data: "2026-02-04" }];
  eq(d.achaPrevisto({ data: "2026-02-01", valor: -5 }, p, new Set()).id, 2);
  eq(d.achaPrevisto({ data: "2026-03-01", valor: -5 }, p, new Set()), null);
});
test("demonstração gera dados válidos", () => {
  for (const l of d.gerarDemo("2026-11-24").itens) assert(l.valor > 0 && d.parseDateAny(l.data) === l.data);
});
