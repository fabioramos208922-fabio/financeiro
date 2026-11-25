/* Testes das regras de negócio. Rodar com: node testes/testes.js */
const fs = require("fs"), path = require("path"), vm = require("vm"), test = require("node:test"), assert = require("node:assert");
const pasta = path.join(__dirname, "..", "js", "dominio");
const codigo = ["constantes", "datas", "valores", "calculos", "leitura-extrato", "classificacao", "demo", "personalizadas", "gestao", "planilha"]
  .map(n => fs.readFileSync(path.join(pasta, n + ".js"), "utf8")).join("\n");
const d = vm.runInThisContext(`(function(){${codigo}
return {resumoItens,parseBR,parseDateAny,addMonths,parseOFX,parseCSV,classify,ruleKey,serie,analisa,resumoMes,saldoRealizado,jaImportado,achaPrevisto,mediaEntradasDia,gerarDemo,saldoContatos,telefoneWhats,dividirParcelas,gerarRepeticoes,dividirBaixa,andamentoMetas,pontoEquilibrio,diasDeFolego,resumoAno,montarCSV,lerBackup,enriquecerDemo,planilhaAno,crc32,dataExcel,colunaExcel,FORMAS,CATS,aplicarPersonalizadas};})()`);
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

test("contatos: em aberto, atraso e telefone", () => {
  const s = d.saldoContatos([
    { contatoId: "a", tipo: "entrada", status: "previsto", data: "2026-01-01", valor: 10 },
    { contatoId: "a", tipo: "entrada", status: "previsto", data: "2026-03-01", valor: 5 },
    { contatoId: "a", tipo: "saida", status: "previsto", data: "2026-03-01", valor: 7 },
    { tipo: "entrada", status: "previsto", data: "2026-01-01", valor: 99 }], "2026-02-01");
  eq([s.a.receber, s.a.atrasado, s.a.pagar, Object.keys(s).length], [15, 10, 7, 1]);
  eq(d.telefoneWhats("(75) 99999-0000"), "5575999990000");
  eq(d.telefoneWhats("+55 75 99999-0000"), "5575999990000");
  eq(d.telefoneWhats("123"), "");
});
test("parcelas não perdem centavos e repetições respeitam o calendário", () => {
  eq(d.dividirParcelas(100, 3), [33.34, 33.33, 33.33]);
  eq(d.gerarRepeticoes("m3", "2026-01-31", 5).map(x => x.data), ["2026-01-31", "2026-02-28", "2026-03-31"]);
  eq(d.gerarRepeticoes("s4", "2026-01-31", 5)[1], { data: "2026-02-07", valor: 5, parcela: undefined });
  eq(d.gerarRepeticoes("p3", "2026-01-10", 100)[2].parcela, "3/3");
  eq(d.gerarRepeticoes("1", "2026-01-10", 100).length, 1);
});
test("baixa parcial mantém o total", () => {
  const { feito, resto } = d.dividirBaixa({ id: "x", valor: 100.1, status: "previsto", data: "2026-01-01" }, 30.05, "2026-02-01", "n");
  eq([feito.id, feito.valor, feito.status, resto.id, resto.valor, resto.status], ["n", 30.05, "realizado", "x", 70.05, "previsto"]);
});
test("metas, equilíbrio e fôlego", () => {
  const it = [
    { tipo: "entrada", status: "realizado", data: "2026-02-02", valor: 1000, forma: "pix" },
    { tipo: "saida", status: "realizado", data: "2026-02-03", valor: 500, cat: "fornecedor" },
    { tipo: "saida", status: "realizado", data: "2026-02-03", valor: 200, cat: "fixa" },
    { tipo: "saida", status: "previsto", data: "2026-02-20", valor: 100, cat: "fornecedor" }];
  const a = d.andamentoMetas(it, { faturamento: 2000, orcamento: { fornecedor: 550, fixa: 100 } }, "2026-02-14");
  eq(a.ritmo, 2000);
  eq(a.faltaPorDia, 1000 / 15);
  eq(a.orcamento.map(o => [o.k, o.estado]), [["fixa", "bad"], ["fornecedor", "warn"]]);
  eq(d.pontoEquilibrio(a.r), 400);
  eq(d.diasDeFolego(it, 350, "2026-02-13"), 5);
  eq(d.diasDeFolego([], 350, "2026-02-13"), null);
  const ano = d.resumoAno(it, "2026");
  eq([ano.total.entradas, ano.total.resultado, ano.meses[1].fixas], [1000, 300, 200]);
});
test("backup: ida e volta, e recusa de arquivo ruim", () => {
  const item = { id: "1", tipo: "entrada", status: "realizado", data: "2026-01-05", valor: 10, desc: "x", origem: "manual", criado: 1, forma: "pix" };
  const arq = JSON.stringify({ app: "caixacerto", cfg: { nome: "N", saldoInicial: 5, saldoData: "2026-01-01", contatos: [{ id: "c", nome: "Z" }] }, months: { errado: [item, item, { id: "2", valor: "<b>" }] } });
  const b = d.lerBackup(arq);
  eq(b.months, { "2026-01": [item] });
  eq([b.total, b.ignorados, b.cfg.contatos[0].nome], [1, 2, "Z"]);
  assert.throws(() => d.lerBackup("oi"));
  assert.throws(() => d.lerBackup("{}"));
});
test("CSV escapa texto", () => eq(d.montarCSV([["a;b", 1.5, 'c"d']]), '"a;b";1,50;"c""d"'));

test("formas e categorias escritas", () => {
  const p = [{ id: "p_a1", tipo: "entrada", nome: "Vale <b>" }, { id: "p_b2", tipo: "saida", nome: "Marketing" }, { id: "dinheiro", tipo: "entrada", nome: "Troca" }];
  d.aplicarPersonalizadas(p);
  eq([d.FORMAS.p_a1, d.CATS.p_b2, d.FORMAS.dinheiro], ["Vale b", "Marketing", "Dinheiro"]);
  d.aplicarPersonalizadas([]);
  eq([d.FORMAS.p_a1, d.CATS.p_b2], [undefined, undefined]);
  const it = [{ id: "1", tipo: "saida", status: "realizado", data: "2026-01-05", valor: 10, cat: "p_b2" }];
  eq(d.resumoAno(it, "2026").total.fixas, 10);
  const b = d.lerBackup(JSON.stringify({ app: "caixacerto", cfg: { saldoData: "2026-01-01", personalizadas: p }, months: { a: it } }));
  eq([b.months["2026-01"][0].cat, b.cfg.personalizadas.length], ["p_b2", 2]);
});

test("planilha Excel: ZIP íntegro, textos escapados e fórmulas", () => {
  eq(d.crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  eq([d.dataExcel("2026-01-01"), d.colunaExcel(0), d.colunaExcel(27)], [46023, "A", "AB"]);
  const mes = { nome: "Janeiro", entradas: 10, variaveis: 2, margem: 8, fixas: 3, retirada: 1, resultado: 4 };
  const z = Buffer.from(d.planilhaAno({ nome: "A & <B>", ano: "2026", meses: [mes], porCategoria: [], lancamentos: [["2026-01-05", "=1+1", "", "Entrada", "Pix", "Feito", 10]] }));
  const t = z.toString("utf8");
  eq(z.readUInt32LE(0), 0x04034b50);
  eq(z.readUInt16LE(z.length - 12), 8);
  assert(t.includes("A &amp; &lt;B&gt; · 2026") && t.includes("<f>D5-E5-F5</f><v>4</v>"));
  assert(t.includes('t="inlineStr"><is><t xml:space="preserve">=1+1'), "texto nunca vira fórmula");
});
test("index.html está com as versões dos arquivos em dia", () => {
  const { versionar, pagina } = require("./versionar.js"), html = fs.readFileSync(pagina, "utf8");
  eq(versionar(html), html, "rode: node testes/versionar.js");
});

test("resumo do período soma igual ao resumo do ano", () => {
  const it = d.gerarDemo("2026-11-24").itens, ano = d.resumoAno(it, "2026").total, r = d.resumoItens(it.filter(l => l.data.startsWith("2026")));
  eq([arred2(r.entradas), arred2(r.saidas), arred2(r.resultado)], [ano.entradas, ano.saidas, ano.resultado]);
  function arred2(v) { return Math.round(v * 100) / 100; }
});
