/* Gera um arquivo Excel (.xlsx) formatado, sem bibliotecas.
   Um .xlsx é um ZIP com arquivos XML; aqui o ZIP vai sem compressão. */
const CRC_TABELA = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABELA[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* arquivos: [nome, texto][]. Devolve Uint8Array. */
function montarZip(arquivos) {
  const enc = new TextEncoder(), partes = [], central = [];
  let pos = 0;
  const cabecalho = (campos) => {
    const v = new DataView(new ArrayBuffer(campos.reduce((a, [t]) => a + t, 0)));
    let i = 0;
    for (const [t, n] of campos) { if (t === 2) v.setUint16(i, n, true); else v.setUint32(i, n, true); i += t; }
    return new Uint8Array(v.buffer);
  };
  const DATA = 0x21; // 01/01/1980, a menor data válida em ZIP
  for (const [nome, texto] of arquivos) {
    const n = enc.encode(nome), d = enc.encode(texto), crc = crc32(d);
    const comum = [[2, 20], [2, 0x800], [2, 0], [2, 0], [2, DATA], [4, crc], [4, d.length], [4, d.length], [2, n.length], [2, 0]];
    const local = cabecalho([[4, 0x04034b50], ...comum]);
    central.push(cabecalho([[4, 0x02014b50], [2, 20], ...comum, [2, 0], [2, 0], [2, 0], [4, 0], [4, pos]]), n);
    partes.push(local, n, d);
    pos += local.length + n.length + d.length;
  }
  const tamCentral = central.reduce((a, p) => a + p.length, 0);
  const fim = cabecalho([[4, 0x06054b50], [2, 0], [2, 0], [2, arquivos.length], [2, arquivos.length], [4, tamCentral], [4, pos], [2, 0]]);
  const tudo = [...partes, ...central, fim], saida = new Uint8Array(tudo.reduce((a, p) => a + p.length, 0));
  let i = 0;
  for (const p of tudo) { saida.set(p, i); i += p.length; }
  return saida;
}

const escXML = s => String(s ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* Estilos, na ordem de cellXfs em ESTILOS_XML. */
const XL = { normal: 0, titulo: 1, sub: 2, cab: 3, cabDir: 4, texto: 5, moeda: 6, pct: 7, data: 8, totTexto: 9, totMoeda: 10, totPct: 11, resultado: 12 };
const ESTILOS_XML = (() => {
  const fonte = (sz, cor, b) => `<font>${b ? "<b/>" : ""}<sz val="${sz}"/><color rgb="FF${cor}"/><name val="Calibri"/></font>`;
  const fundo = cor => `<fill><patternFill patternType="solid"><fgColor rgb="FF${cor}"/></patternFill></fill>`;
  const xf = (num, font, fill, borda, al) => `<xf numFmtId="${num}" fontId="${font}" fillId="${fill}" borderId="${borda}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="${al}" vertical="center"/></xf>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00;[Red]\\-&quot;R$&quot;\\ #,##0.00;&quot;–&quot;"/><numFmt numFmtId="165" formatCode="0%;[Red]\\-0%;&quot;–&quot;"/></numFmts>
<fonts count="5">${fonte(11, "06194A")}${fonte(18, "0A39CF", 1)}${fonte(10, "50648F")}${fonte(11, "FFFFFF", 1)}${fonte(11, "06194A", 1)}</fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>${fundo("1257FF")}${fundo("E1EBFF")}</fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="FFD6E2FA"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="13">${xf(0, 0, 0, 0, "left")}${xf(0, 1, 0, 0, "left")}${xf(0, 2, 0, 0, "left")}${xf(0, 3, 2, 0, "left")}${xf(0, 3, 2, 0, "right")}${xf(0, 0, 0, 1, "left")}${xf(164, 0, 0, 1, "right")}${xf(165, 0, 0, 1, "right")}${xf(14, 0, 0, 1, "left")}${xf(0, 4, 3, 1, "left")}${xf(164, 4, 3, 1, "right")}${xf(165, 4, 3, 1, "right")}${xf(164, 4, 0, 1, "right")}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
})();

/* Data ISO para o número de dias que o Excel usa. */
function dataExcel(iso) {
  const [y, m, d] = partes(iso);
  return Date.UTC(y, m - 1, d) / 864e5 + 25569;
}

function colunaExcel(i) {
  return (i >= 26 ? colunaExcel(Math.floor(i / 26) - 1) : "") + String.fromCharCode(65 + i % 26);
}

/* Célula: [valor, estilo] ou [{f: fórmula, v: valor}, estilo]. */
function celulaXML([v, s], l, c) {
  const ref = colunaExcel(c) + (l + 1);
  if (v && typeof v === "object") return `<c r="${ref}" s="${s}"><f>${escXML(v.f)}</f><v>${v.v}</v></c>`;
  if (typeof v === "number") return `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
  if (v === "" || v == null) return `<c r="${ref}" s="${s}"/>`;
  return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${escXML(v)}</t></is></c>`;
}

/* aba: {nome, larguras, linhas, cab (nº de linhas congeladas), filtro (ref), paisagem} */
function abaXML(a, primeira) {
  const linhas = a.linhas.map((l, i) => `<row r="${i + 1}"${i === 0 ? ' ht="28" customHeight="1"' : ""}>${l.map((cel, c) => celulaXML(cel, i, c)).join("")}</row>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>`
    + `<sheetViews><sheetView showGridLines="0"${primeira ? ' tabSelected="1"' : ""} workbookViewId="0"><pane ySplit="${a.cab}" topLeftCell="A${a.cab + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/>`
    + `<cols>${a.larguras.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${linhas}</sheetData>`
    + (a.filtro ? `<autoFilter ref="${a.filtro}"/>` : "")
    + `<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}

function montarXLSX(abas) {
  const NS = "http://schemas.openxmlformats.org/", topo = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const filtros = abas.map((a, i) => (a.filtro ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${escXML(a.nome)}'!${a.filtro.replace(/([A-Z]+)(\d+)/g, "$$$1$$$2")}</definedName>` : "")).join("");
  return montarZip([
    ["[Content_Types].xml", `${topo}<Types xmlns="${NS}package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`],
    ["_rels/.rels", `${topo}<Relationships xmlns="${NS}package/2006/relationships"><Relationship Id="rId1" Type="${NS}officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `${topo}<workbook xmlns="${NS}spreadsheetml/2006/main" xmlns:r="${NS}officeDocument/2006/relationships"><sheets>${abas.map((a, i) => `<sheet name="${escXML(a.nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>${filtros ? `<definedNames>${filtros}</definedNames>` : ""}<calcPr calcId="0" fullCalcOnLoad="1"/></workbook>`],
    ["xl/_rels/workbook.xml.rels", `${topo}<Relationships xmlns="${NS}package/2006/relationships">${abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS}officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${abas.length + 1}" Type="${NS}officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml", ESTILOS_XML],
    ...abas.map((a, i) => [`xl/worksheets/sheet${i + 1}.xml`, abaXML(a, i === 0)]),
  ]);
}

/* ---------- planilha do ano ---------- */
/* lancamentos: [data, descrição, contato, tipo, categoria, situação, valor com sinal][] */
function planilhaAno({ nome, ano, meses, lancamentos, porCategoria }) {
  const cols = ["entradas", "variaveis", "margem", "fixas", "retirada", "resultado"];
  const cabMeses = ["Mês", "Entradas", "Custos variáveis", "Margem", "Custos fixos", "Retiradas", "Resultado", "Resultado %"];
  const L0 = 5, fimMeses = L0 + meses.length - 1; // linhas do Excel onde ficam os meses
  const pct = (a, b) => (b ? a / b : 0);
  const soma = k => arred(meses.reduce((t, m) => t + m[k], 0));
  const resumo = {
    nome: "Resumo", cab: 4, larguras: [16, 17, 18, 17, 17, 17, 17, 14],
    linhas: [
      [[`${nome} · ${ano}`, XL.titulo]],
      [["Resultado mês a mês. Só conta o que já aconteceu.", XL.sub]],
      [],
      cabMeses.map((t, i) => [t, i ? XL.cabDir : XL.cab]),
      ...meses.map((m, i) => {
        const l = L0 + i;
        return [[m.nome, XL.texto], [m.entradas, XL.moeda], [m.variaveis, XL.moeda], [{ f: `B${l}-C${l}`, v: arred(m.margem) }, XL.moeda], [m.fixas, XL.moeda], [m.retirada, XL.moeda],
          [{ f: `D${l}-E${l}-F${l}`, v: arred(m.resultado) }, XL.resultado], [{ f: `IF(B${l}=0,0,G${l}/B${l})`, v: pct(m.resultado, m.entradas) }, XL.pct]];
      }),
      [["Total", XL.totTexto], ...cols.map((k, i) => [{ f: `SUM(${colunaExcel(i + 1)}${L0}:${colunaExcel(i + 1)}${fimMeses})`, v: soma(k) }, XL.totMoeda]),
        [{ f: `IF(B${fimMeses + 1}=0,0,G${fimMeses + 1}/B${fimMeses + 1})`, v: pct(soma("resultado"), soma("entradas")) }, XL.totPct]],
    ],
  };
  const cats = {
    nome: "Categorias", cab: 3, larguras: [14, 34, 18, 14],
    linhas: [[[`Por forma e categoria · ${ano}`, XL.titulo]], [], [["Tipo", XL.cab], ["Forma / categoria", XL.cab], ["Total", XL.cabDir], ["% do tipo", XL.cabDir]],
      ...porCategoria.map(c => [[c.tipo, XL.texto], [c.nome, XL.texto], [c.valor, XL.moeda], [c.pct, XL.pct]])],
  };
  const lanc = {
    nome: "Lançamentos", cab: 3, larguras: [13, 40, 26, 11, 30, 13, 17],
    filtro: `A3:G${Math.max(3, 3 + lancamentos.length)}`,
    linhas: [[[`Lançamentos · ${ano}`, XL.titulo]], [], ["Data", "Descrição", "Cliente / fornecedor", "Tipo", "Forma / categoria", "Situação", "Valor"].map((t, i) => [t, i === 6 ? XL.cabDir : XL.cab]),
      ...lancamentos.map(l => [[dataExcel(l[0]), XL.data], ...l.slice(1, 6).map(t => [t, XL.texto]), [l[6], XL.moeda]])],
  };
  return montarXLSX([resumo, cats, lanc]);
}
